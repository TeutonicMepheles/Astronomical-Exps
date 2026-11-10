/* Measurement-mode overlay for a host viewport.
 *
 * Phases: idle -> scanning -> pickStart -> pickEnd -> pending -> committing -> done
 *
 * The component owns only its own overlay DOM, the picked points and the line.
 * It does not decide what the distance means: the host passes label, unit and
 * pxPerUnit and receives the pixel length through the public getter.
 *
 * Visual styling lives entirely in measure-mode.css and the skin files under
 * skins/: this file only owns the interaction script.
 */
(function (root) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  var PROMPT = {
    pickStart: '点击测量起始点',
    pickEnd: '选择测量结束点',
    pending: '点击别处可重新选择结束点',
    committing: '',
    done: ''
  };

  var T = {
    scan: 900,      // viewport scan before the first prompt
    prompt: 220,    // prompt fade
    // Line completion: a length-proportional stroke, clamped so a short
    // measurement still reads as a deliberate stroke and a long one does not
    // drag. Golajah asked for a slower finish than the first pass (680ms).
    drawMin: 1100,
    drawMax: 1800,
    drawPerPx: 2.4,
    count: 460,     // readout number count-up
    settle: 140
  };

  var ICON_RULER =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 14.6 14.6 3.5l5.9 5.9L9.4 20.5z"/>' +
    '<path d="M7.2 11l2.1 2.1M9.9 8.3l2.1 2.1M12.6 5.6l2.1 2.1M5.9 12.3l1.4 1.4M8.6 9.6l1.4 1.4"/></svg>';
  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_CHECK =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.6l4.2 4.2 8.8-9.4"/></svg>';

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function createMeasure(host, opts) {
    opts = opts || {};
    var cfg = {
      label: opts.label || '长度',
      unit: opts.unit || 'cm',
      pxPerUnit: opts.pxPerUnit == null ? 0.5 : opts.pxPerUnit,
      decimal: opts.decimal == null ? 1 : opts.decimal,
      scan: opts.scan || T.scan,
      // 'straight' draws the chord; 'arc' bows the line along the surface being
      // measured (globe limb, crater rim). Both use the same two picked points.
      shape: opts.shape || 'straight',
      arcSag: opts.arcSag == null ? 0.18 : opts.arcSag,
      // Which side of the chord the arc bows to: +1 or -1. Lets a scene say
      // "follow the crater rim" instead of always bulging the same way.
      arcSide: opts.arcSide === -1 ? -1 : 1,
      // The host owns the science. By default the number is a linear scale of
      // the pixel length; pass `format(px)` when the mapping is anything else.
      format: typeof opts.format === 'function' ? opts.format : null,
      prompts: Object.assign({}, PROMPT, opts.prompts || {}),
      resolvePoint: typeof opts.resolvePoint === 'function' ? opts.resolvePoint : null,
      trace: typeof opts.trace === 'function' ? opts.trace : null,
      autoCommit: !!opts.autoCommit,
      onPhase: typeof opts.onPhase === 'function' ? opts.onPhase : null
    };

    host.classList.add('mw-host');
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    // Reduced motion: keep the phases, drop the travel time.
    var reduceMotion = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* ---------------------------------------------------------------- DOM */
    var root = el('div', 'mw');
    root.dataset.phase = 'idle';

    var dim = el('div', 'mw-dim');
    var scan = el('div', 'mw-scan');
    var svg = svgEl('svg', { class: 'mw-layer' });
    // Hand-drawn styles wobble the stroke with this filter; other styles
    // simply never reference it.
    var defs = svgEl('defs', {});
    defs.innerHTML =
      '<filter id="mw-wobble" x="-12%" y="-12%" width="124%" height="124%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="7" result="noise"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="noise" scale="3.4" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>';
    var line = svgEl('path', { class: 'mw-line', d: '' });
    svg.append(defs, line);

    var startDot = el('div', 'mw-mark mw-start');
    var endDot = el('div', 'mw-mark mw-end');

    var prompt = el('div', 'mw-prompt');
    prompt.setAttribute('aria-live', 'polite');

    var readout = el('div', 'mw-readout');
    var readoutLabel = el('span', 'mw-readout-label');
    var readoutValue = el('b', 'mw-readout-value');
    var readoutUnit = el('span', 'mw-readout-unit');
    readoutLabel.textContent = cfg.label;
    readoutUnit.textContent = ' ' + cfg.unit;
    readout.append(readoutLabel, readoutValue, readoutUnit);

    var confirm = el('button', 'mw-btn mw-confirm');
    confirm.type = 'button';
    confirm.setAttribute('aria-label', '确认测量');
    confirm.innerHTML = ICON_CHECK;

    var toggle = el('button', 'mw-btn mw-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', '进入测量模式');
    // Both glyphs live in the button; CSS shows one per phase.
    toggle.innerHTML = '<span class="mw-ico mw-ico-enter">' + ICON_RULER +
      '</span><span class="mw-ico mw-ico-exit">' + ICON_CLOSE + '</span>';

    root.append(dim, scan, svg, startDot, endDot, prompt, readout, confirm, toggle);
    host.appendChild(root);

    /* -------------------------------------------------------------- state */
    var st = { phase: 'idle', start: null, end: null, t: null, raf: null };

    function phase(p) {
      st.phase = p;
      root.dataset.phase = p;
      prompt.textContent = cfg.prompts[p] || '';
      prompt.classList.toggle('visible', !!cfg.prompts[p]);
      prompt.setAttribute('aria-hidden', cfg.prompts[p] ? 'false' : 'true');
      if (cfg.onPhase) cfg.onPhase(p);
      root.classList.toggle('is-measuring', p !== 'idle');
      host.classList.toggle('is-measuring', p !== 'idle');
      if (p === 'idle') toggle.setAttribute('aria-label', '进入测量模式');
      else toggle.setAttribute('aria-label', '关闭测量模式');
    }

    function cancelCount() {
      // A running count-up would otherwise write its old value back over
      // whatever the shape switch just computed.
      if (st.raf) { cancelAnimationFrame(st.raf); st.raf = null; }
    }

    function clearTimer() {
      if (st.t) { clearTimeout(st.t); st.t = null; }
      cancelCount();
    }

    // Clicks arrive in screen pixels, but the marks are placed in the host's
    // own layout units. When the 1600×900 stage is scaled to fit the window,
    // those differ — divide out the scale or every point lands short.
    function pt(ev) {
      var r = host.getBoundingClientRect();
      var w = host.offsetWidth || r.width || 1;
      var h = host.offsetHeight || r.height || 1;
      var sx = r.width / w || 1;
      var sy = r.height / h || 1;
      return { x: (ev.clientX - r.left) / sx, y: (ev.clientY - r.top) / sy };
    }

    function setMark(node, p) {
      node.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
      node.classList.add('on');
    }

    // Unit normal to the chord, oriented to the configured bowing side.
    function arcNormal() {
      var a = st.start, b = st.end;
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.hypot(dx, dy) || 1;
      return { x: (dy / len) * cfg.arcSide, y: (-dx / len) * cfg.arcSide };
    }

    // Chord vs surface arc. The arc is a cubic bowed along the chord normal,
    // so a measurement can follow a globe limb or a crater rim instead of
    // cutting straight through the scene.
    function traced() {
      if (!cfg.trace || !st.start || !st.end) return null;
      return cfg.trace(st.start, st.end);
    }

    function pathData() {
      var custom = traced();
      if (custom && custom.d) return custom.d;
      var a = st.start, b = st.end;
      if (!a || !b) return '';
      if (cfg.shape !== 'arc') return 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.hypot(dx, dy) || 1;
      var n = arcNormal();
      var sag = len * cfg.arcSag;
      var c1 = { x: a.x + dx / 3 + n.x * sag, y: a.y + dy / 3 + n.y * sag };
      var c2 = { x: a.x + dx * 2 / 3 + n.x * sag, y: a.y + dy * 2 / 3 + n.y * sag };
      return 'M' + a.x + ' ' + a.y +
        'C' + c1.x + ' ' + c1.y + ' ' + c2.x + ' ' + c2.y + ' ' + b.x + ' ' + b.y;
    }

    function arcMid() {
      var a = st.start, b = st.end;
      if (cfg.shape !== 'arc') return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.hypot(dx, dy) || 1;
      var n = arcNormal();
      var sag = len * cfg.arcSag * 0.75;   // point on the cubic at t=0.5
      return { x: (a.x + b.x) / 2 + n.x * sag, y: (a.y + b.y) / 2 + n.y * sag };
    }

    function syncLine(kind) {
      if (!st.start || !st.end) { line.setAttribute('d', ''); return; }
      line.setAttribute('d', pathData());
      line.dataset.kind = kind || '';
    }

    function lengthPx() {
      var custom = traced();
      if (custom && custom.length) return custom.length;
      if (!st.start || !st.end) return 0;
      var a = st.start, b = st.end;
      var dx = b.x - a.x, dy = b.y - a.y;
      var chord = Math.hypot(dx, dy);
      if (cfg.shape !== 'arc') return chord;
      // Arc length of the cubic, sampled — the number must match the line the
      // user sees, not the straight chord under it.
      var len = chord || 1;
      var n = arcNormal();
      var nx = n.x, ny = n.y;
      var sag = len * cfg.arcSag;
      var p = [
        { x: a.x, y: a.y },
        { x: a.x + dx / 3 + nx * sag, y: a.y + dy / 3 + ny * sag },
        { x: a.x + dx * 2 / 3 + nx * sag, y: a.y + dy * 2 / 3 + ny * sag },
        { x: b.x, y: b.y }
      ];
      var total = 0, prev = p[0];
      for (var i = 1; i <= 32; i++) {
        var t = i / 32, u = 1 - t;
        var pt2 = {
          x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
          y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y
        };
        total += Math.hypot(pt2.x - prev.x, pt2.y - prev.y);
        prev = pt2;
      }
      return total;
    }

    // Keep the confirm control inside the clipped scene. Prefer a position
    // perpendicular to the measured line, then fall back to the other sides.
    function placeConfirm() {
      if (!st.end || !st.start) return;
      var dx = st.end.x - st.start.x, dy = st.end.y - st.start.y;
      var len = Math.hypot(dx, dy) || 1;
      var nx = dy / len, ny = -dx / len;          // perpendicular
      var off = 42;
      var width = host.offsetWidth, height = host.offsetHeight;
      // EXP-04: keep the complete button inside the clipped scene viewport.
      // Use local CSS dimensions, so the whiteboard stage scale is irrelevant.
      var buttonWidth = confirm.offsetWidth || 48;
      var buttonHeight = confirm.offsetHeight || buttonWidth;
      var margin = 12;
      var edgeX = buttonWidth / 2 + margin;
      var edgeY = buttonHeight / 2 + margin;
      var horizontal = Math.abs(dx) >= Math.abs(dy);
      var candidates = horizontal
        ? [
            { x: st.end.x, y: st.end.y - off, side: 'above' },
            { x: st.end.x, y: st.end.y + off, side: 'below' },
            { x: st.end.x - off, y: st.end.y, side: 'left' },
            { x: st.end.x + off, y: st.end.y, side: 'right' }
          ]
        : [
            { x: st.end.x - off, y: st.end.y, side: 'left' },
            { x: st.end.x + off, y: st.end.y, side: 'right' },
            { x: st.end.x, y: st.end.y - off, side: 'above' },
            { x: st.end.x, y: st.end.y + off, side: 'below' }
          ];
      var placed = candidates.find(function (point) {
        return point.x >= edgeX && point.x <= width - edgeX
          && point.y >= edgeY && point.y <= height - edgeY;
      });
      if (!placed) {
        // Preserve the outward side as a last resort, then clamp the complete
        // button to the available viewport instead of letting overflow clip it.
        placed = { x: st.end.x + nx * off, y: st.end.y + ny * off, side: nx >= 0 ? 'right' : 'left' };
      }
      var x = Math.max(edgeX, Math.min(width - edgeX, placed.x));
      var y = Math.max(edgeY, Math.min(height - edgeY, placed.y));
      confirm.style.marginLeft = (-buttonWidth / 2) + 'px';
      confirm.style.marginTop = (-buttonHeight / 2) + 'px';
      confirm.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
      confirm.classList.add('on');
      confirm.dataset.side = placed.side;

    }

    /* ------------------------------------------------------------- actions */
    function enter() {
      clearTimer();
      st.start = st.end = null;
      line.setAttribute('d', '');
      line.removeAttribute('style');
      line.removeAttribute('pathLength');
      startDot.classList.remove('on');
      endDot.classList.remove('on');
      readout.classList.remove('on');
      confirm.classList.remove('on');
      phase('scanning');
      scan.classList.remove('run');
      void scan.offsetWidth;           // restart the CSS animation
      scan.classList.add('run');
      st.t = setTimeout(function () {
        st.t = null;
        scan.classList.remove('run');
        phase('pickStart');
      }, reduceMotion ? 180 : cfg.scan);
    }

    function exit() {
      clearTimer();
      scan.classList.remove('run');
      startDot.classList.remove('on');
      endDot.classList.remove('on');
      confirm.classList.remove('on');
      readout.classList.remove('on');
      line.setAttribute('d', '');
      line.removeAttribute('pathLength');
      phase('idle');
      st.start = st.end = null;
    }

    function placeStart(p) {
      st.start = p;
      setMark(startDot, p);
      phase('pickEnd');
    }

    function placeEnd(p) {
      st.end = p;
      setMark(endDot, p);
      syncLine('pending');
      phase('pending');
      if (cfg.autoCommit) { commit(); return; }
      placeConfirm();
    }

    function commit() {
      if (st.phase !== 'pending') return;
      confirm.classList.remove('on');
      phase('committing');
      endDot.classList.add('locked');
      startDot.classList.add('locked');
      syncLine('drawing');
      if (traced()) line.setAttribute('pathLength', '1');
      // Longer measurements take longer to draw, within a readable range.
      var drawMs = reduceMotion ? 140 :
        Math.max(T.drawMin, Math.min(T.drawMax, lengthPx() * T.drawPerPx));
      // Draw on: pathLength=1 lets one dash cover the whole line.
      line.style.transition = 'none';
      line.style.strokeDasharray = '1 1';
      line.style.strokeDashoffset = '1';
      line.getBoundingClientRect();
      line.style.transition = 'stroke-dashoffset ' + drawMs + 'ms cubic-bezier(.4,.05,.25,1)';
      line.style.strokeDashoffset = '0';

      st.t = setTimeout(function () {
        st.t = null;
        showReadout();
        phase('done');
      }, drawMs + T.settle);
    }

    // Host-owned science: pixel length -> displayed number + unit.
    function measured(px) {
      if (cfg.format) {
        var r = cfg.format(px) || {};
        return {
          value: Number(r.value) || 0,
          unit: r.unit == null ? cfg.unit : r.unit,
          decimal: r.decimal == null ? cfg.decimal : r.decimal
        };
      }
      return { value: px * cfg.pxPerUnit, unit: cfg.unit, decimal: cfg.decimal };
    }

    function showReadout() {
      var px = lengthPx();
      var shown = measured(px);
      var val = shown.value;
      readoutUnit.textContent = ' ' + shown.unit;
      var mid = arcMid();
      var dx = st.end.x - st.start.x, dy = st.end.y - st.start.y;
      var len = Math.hypot(dx, dy) || 1;
      var nx = dy / len, ny = -dx / len;
      var x = mid.x + nx * 52, y = mid.y + ny * 52;

      readout.style.left = Math.round(x) + 'px';
      readout.style.top = Math.round(y) + 'px';
      readout.style.transform = 'translate(-50%,-50%)';
      readout.classList.add('on');

      var from = 0, t0 = performance.now(), dur = reduceMotion ? 100 : T.count;
      function tick(now) {
        var k = Math.min(1, (now - t0) / dur);
        var eased = 1 - Math.pow(1 - k, 3);
        readoutValue.textContent = (from + (val - from) * eased).toFixed(shown.decimal);
        if (k < 1) st.raf = requestAnimationFrame(tick);
        else { st.raf = null; readoutValue.textContent = val.toFixed(shown.decimal); }
      }
      st.raf = requestAnimationFrame(tick);
    }

    /* ------------------------------------------------------------- events */
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (st.phase === 'idle') enter(); else exit();
    });

    confirm.addEventListener('click', function (e) {
      e.stopPropagation();
      commit();
    });

    host.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('.mw-btn')) return;
      var local = pt(e);
      if (cfg.resolvePoint) {
        var resolved = cfg.resolvePoint(st.phase, e, local);
        if (!resolved) return;
        local = resolved;
      }
      if (st.phase === 'pickStart') placeStart(local);
      else if (st.phase === 'pickEnd' || st.phase === 'pending') placeEnd(local);
    });

    // Re-entering the measurement after a result keeps the drawn state until
    // the user closes it, so a finished measurement stays readable.
    function onResize() {
      if (st.phase === 'pending') placeConfirm();
    }
    window.addEventListener('resize', onResize);

    phase('idle');
    return {
      enter: enter,
      exit: exit,
      destroy: function () {
        clearTimer();
        window.removeEventListener('resize', onResize);
        if (root.parentNode) root.parentNode.removeChild(root);
        host.classList.remove('mw-host', 'is-measuring');
      },
      root: root,
      state: st,
      // Pixel length of the drawn line (arc length when shape === 'arc').
      getLength: function () { return lengthPx(); },
      getPoints: function () {
        return {
          start: st.start ? { x: st.start.x, y: st.start.y } : null,
          end: st.end ? { x: st.end.x, y: st.end.y } : null
        };
      },
      // Lets a host switch line character without re-picking points.
      setShape: function (shape) {
        cfg.shape = shape === 'arc' ? 'arc' : 'straight';
        if (st.start && st.end) {
          var done = st.phase === 'done';
          syncLine(done ? 'drawing' : 'pending');
          line.style.transition = 'none';
          line.style.strokeDashoffset = '0';   // keep it fully drawn
          if (done) {
            // The arc is longer than its chord, so the number must follow it.
            cancelCount();
            var shown = measured(lengthPx());
            readoutValue.textContent = shown.value.toFixed(shown.decimal);
            var m = arcMid();
            var dx = st.end.x - st.start.x, dy = st.end.y - st.start.y;
            var len = Math.hypot(dx, dy) || 1;
            readout.style.left = Math.round(m.x + (dy / len) * 52) + 'px';
            readout.style.top = Math.round(m.y + (-dx / len) * 52) + 'px';
          }
        }
        return cfg.shape;
      },
      getShape: function () { return cfg.shape; }
    };
  }

  root.SharedComponents = root.SharedComponents || {};
  root.SharedComponents.MeasureMode = createMeasure;
})(window);

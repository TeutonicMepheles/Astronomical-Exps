/* Shared runtime services. No editor or feature DOM dependencies. */
window.LightPollution = window.LightPollution || {};
(() => {
  const LP = window.LightPollution;
  LP.createScheduler = function () {
    const jobs = new Set(), draws = new Map();
    let frame = 0, dead = false, batching = false;
    function request() { if (!dead && !document.hidden && !frame) frame = requestAnimationFrame(tick); }
    function tick(time) {
      frame = 0; batching = true;
      for (const job of jobs) if (time - job.last >= job.interval) {
        const dt = job.last ? Math.min(time - job.last, 100) : 0;
        job.last = time; job.run(time, dt);
      }
      batching = false;
      const pending = [...draws.values()]; draws.clear();
      for (const draw of pending) draw();
      if (jobs.size || draws.size) request();
    }
    function visibility() { cancelAnimationFrame(frame); frame = 0; for (const job of jobs) job.last = 0; request(); }
    document.addEventListener('visibilitychange', visibility);
    return {
      get batching() { return batching; },
      add(run, interval = 0) { const job = { run, interval, last: 0 }; jobs.add(job); request(); return () => jobs.delete(job); },
      invalidate(key, draw) { draws.set(key, draw); request(); },
      destroy() { dead = true; cancelAnimationFrame(frame); jobs.clear(); draws.clear(); document.removeEventListener('visibilitychange', visibility); }
    };
  };
  LP.createPanels = function () {
    const panels = new Map(); let active = null, previousFocus = null;
    function close(restore = true) {
      if (!active) return;
      const p = panels.get(active); active = null; p.hide();
      if (restore && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }
    function onKey(e) { if (e.key === 'Escape' && active) { close(); e.stopPropagation(); } }
    document.addEventListener('keydown', onKey);
    return {
      register(id, show, hide) { panels.set(id, { show, hide }); },
      open(id, data) { if (!panels.has(id)) return; if (active !== id) { close(false); previousFocus = document.activeElement; } active = id; panels.get(id).show(data); },
      close(id) { if (!id || active === id) close(); },
      get active() { return active; },
      destroy() { close(false); panels.clear(); document.removeEventListener('keydown', onKey); }
    };
  };
  LP.viewport = (v, W, H) => ({ z: v.z, x: Math.max(0, Math.min(W - W / v.z, v.x - W / v.z / 2)), y: Math.max(0, Math.min(H - H / v.z, v.y - H / v.z / 2)) });
  LP.point = (e, canvas, v, W, H) => { const r = canvas.getBoundingClientRect(), p = LP.viewport(v, W, H); return [p.x + (e.clientX - r.left) * W / r.width / p.z, p.y + (e.clientY - r.top) * H / r.height / p.z]; };
  LP.createTapRouter = function (viewer, enabled) {
    const targets = []; let tap = null;
    const down = e => { if (enabled() && e.button === 0 && e.isPrimary) tap = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
    const move = e => { if (tap?.id === e.pointerId && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 6) tap.moved = true; };
    const cancel = () => { tap = null; };
    const up = e => { const valid = tap?.id === e.pointerId && !tap.moved; tap = null; if (!valid || !enabled()) return; for (const target of targets) { const hit = target.hit(e); if (hit) { target.open(hit); return; } } LP.panels.close(); };
    for (const [event, fn] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancel], ['lostpointercapture', cancel]]) viewer.addEventListener(event, fn);
    return { add(priority, hit, open) { targets.push({ priority, hit, open }); targets.sort((a,b) => b.priority-a.priority); }, destroy() { for (const [event, fn] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancel], ['lostpointercapture', cancel]]) viewer.removeEventListener(event, fn); targets.length = 0; } };
  };
  LP.scheduler = LP.createScheduler(); LP.panels = LP.createPanels();
  LP.disposers = [];
  LP.on = function(target,type,handler,options){target.addEventListener(type,handler,options);const dispose=()=>target.removeEventListener(type,handler,options);LP.disposers.push(dispose);return dispose;};
  LP.trackGL = function(gl){if(gl)LP.disposers.push(()=>gl.getExtension('WEBGL_lose_context')?.loseContext());return gl;};
  addEventListener('pagehide', e => { if (!e.persisted) { LP.disposers.splice(0).reverse().forEach(fn => fn()); LP.scheduler.destroy(); LP.panels.destroy(); } });
})();

/* Explicit anchors only; never listens to business events or changes targets. */
(() => {
  let trailSerial = 0;
  class GestureHint {
    constructor() { this.node = null; this.frame = 0; }
    show({ target, destination = null, mode = 'tap', iconId = 'grab' }) {
      this.hide();
      const node = document.createElement('div');
      node.className = 'exp-gesture'; node.dataset.mode = mode; node.setAttribute('aria-hidden', 'true');
      node.innerHTML = '<span class="press-ring"></span><svg viewBox="0 0 64 80"><path d="M19 38V13c0-8 11-8 11 0v20-9c0-7 10-7 10 0v10-5c0-7 10-7 10 0v9-4c0-6 10-6 10 0v20c0 12-7 20-18 20h-5c-8 0-12-4-16-10L8 47c-5-7 2-13 8-7l8 8" fill="currentColor" stroke="#5b655e" stroke-width="2.4" stroke-linejoin="round"/><path d="M30 24v18m10-13v14m10-7v9" fill="none" stroke="#5b655e" stroke-width="2" stroke-linecap="round"/></svg><span class="exp-gesture-label"></span>';
      const icon = window.ExperimentHints.handIcons?.find(item => item.id === iconId);
      if (icon?.src) {
        const image = document.createElement('img'); image.className = 'exp-hand-image'; image.src = icon.src; image.alt = ''; image.draggable = false;
        if (icon.clip) image.style.clipPath = icon.clip;
        node.querySelector('svg').replaceWith(image); node.classList.add('has-generated-hand');
        node.style.setProperty('--hand-anchor-x', icon.anchor?.[0] ?? .45);
        node.style.setProperty('--hand-anchor-y', icon.anchor?.[1] ?? .15);
      } else if (icon) { const template = document.createElement('template'); template.innerHTML = icon.svg; node.querySelector('svg').replaceWith(template.content.firstElementChild); }
      node.dataset.icon = iconId;
      node.querySelector('.exp-gesture-label').textContent = mode === 'drag' ? '按住，移到目标位置' : '轻点一下';
      this.node = node; document.body.append(node);
      if (mode === 'drag' && destination) {
        this.trail = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.trail.setAttribute('class', 'exp-drag-trail'); this.trail.setAttribute('aria-hidden', 'true');
        const gradientId = `exp-trail-tone-${++trailSerial}`;
        this.trail.innerHTML = `<defs><linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--hint-trail-color,#c4e3f1)" stop-opacity="0"/><stop offset=".6" stop-color="var(--hint-trail-color,#c4e3f1)" stop-opacity=".55"/><stop offset="1" stop-color="var(--hint-trail-color,#c4e3f1)" stop-opacity=".8"/></linearGradient></defs><path class="trail-base"/><path class="trail-soft trail-reveal" pathLength="1" style="stroke:url(#${gradientId})"/><path class="trail-progress trail-reveal" pathLength="1" style="stroke:url(#${gradientId})"/><circle class="trail-start" r="2"/><circle class="trail-end" r="10"/>`;
        document.body.append(this.trail);
      }
      let lastGeometry = '';
      const position = () => {
        if (!target.isConnected || (destination && !destination.isConnected)) { this.hide(); return; }
        const a = target.getBoundingClientRect();
        const x = a.left + a.width * .5, y = a.top + a.height * .55;
        const b = destination?.getBoundingClientRect();
        const endX = b ? b.left + b.width / 2 : x, endY = b ? b.top + b.height * .55 : y;
        const geometry = [x,y,endX,endY,innerWidth,innerHeight].join(',');
        if (geometry !== lastGeometry) {
          lastGeometry = geometry;
          node.style.left = x + 'px'; node.style.top = y + 'px';
          node.style.setProperty('--hint-dx', endX - x + 'px'); node.style.setProperty('--hint-dy', endY - y + 'px');
          if (this.trail) {
            this.trail.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
            const d = `M${x},${y} L${endX},${endY}`;
            this.trail.querySelectorAll('.trail-base,.trail-progress,.trail-soft').forEach(path => path.setAttribute('d', d));
            const gradient = this.trail.querySelector('linearGradient');
            for (const [key,value] of Object.entries({x1:x,y1:y,x2:endX,y2:endY})) gradient.setAttribute(key,value);
            for (const [selector,cx,cy] of [['.trail-start',x,y],['.trail-end',endX,endY]]) {
              const circle=this.trail.querySelector(selector);circle.setAttribute('cx',cx);circle.setAttribute('cy',cy);
            }
          }
        }
        this.frame = requestAnimationFrame(position);
      };
      position();
    }
    hide() { cancelAnimationFrame(this.frame); this.node?.remove(); this.trail?.remove(); this.node = null; this.trail = null; }
    destroy() { this.hide(); }
  }
  window.ExperimentHints = window.ExperimentHints || {}; window.ExperimentHints.GestureHint = GestureHint;
})();

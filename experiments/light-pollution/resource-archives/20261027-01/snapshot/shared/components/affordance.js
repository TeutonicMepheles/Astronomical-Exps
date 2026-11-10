/* Host supplies optional vector geometry; no pixel processing at runtime. */
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  class AffordanceHint {
    constructor(target, { contour = null, overlayRoot = target.parentElement } = {}) {
      this.target = target;
      if (contour) {
        const svg = document.createElementNS(ns, 'svg'); this.layer = svg;
        svg.setAttribute('class', 'exp-affordance-layer'); svg.setAttribute('viewBox', contour.viewBox);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); svg.setAttribute('aria-hidden', 'true');
        for (const [width, opacity] of [[16,.025],[10,.06],[6,.13],[2,1]]) {
          const path = document.createElementNS(ns, 'path');
          path.setAttribute('d', contour.path); path.setAttribute('fill', 'none');
          path.setAttribute('stroke', 'var(--hint-outline, #c4e3f1)');
          path.setAttribute('stroke-width', width === 2 ? 'var(--hint-outline-width,2px)' : `calc(var(--hint-glow-width,16px) * ${width/16})`); path.setAttribute('stroke-opacity', width === 2 ? 1 : `calc(var(--hint-glow-strength,1) * ${opacity})`);
          path.setAttribute('stroke-linejoin', 'round'); path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('vector-effect', 'non-scaling-stroke'); svg.append(path);
        }
        overlayRoot.append(svg); svg.style.display = 'none';
      }
    }
    setEnabled(enabled) {
      this.target.classList.toggle('exp-affordance', Boolean(enabled));
      if (this.layer) this.layer.style.display = enabled ? '' : 'none';
      else this.target.classList.toggle('exp-affordance-fallback', Boolean(enabled));
    }
    destroy() { this.setEnabled(false); this.layer?.remove(); }
  }
  window.ExperimentHints = window.ExperimentHints || {}; window.ExperimentHints.AffordanceHint = AffordanceHint;
})();

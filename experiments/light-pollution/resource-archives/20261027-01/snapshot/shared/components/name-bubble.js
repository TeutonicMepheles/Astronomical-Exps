/* The host decides when to show. Names are rendered as text, never HTML. */
(() => {
  let serial = 0;
  class NameBubble {
    show({ target, text }) {
      this.hide(); this.target = target;
      const node = document.createElement('div'); this.node = node;
      node.className = 'exp-bubble'; node.id = 'exp-name-' + (++serial); node.setAttribute('role', 'tooltip'); node.textContent = text;
      const ids = (target.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      target.setAttribute('aria-describedby', [...ids, node.id].join(' '));
      document.body.append(node);
      const position = () => {
        if (!target.isConnected) { this.hide(); return; }
        const r = target.getBoundingClientRect(), b = node.getBoundingClientRect();
        const x = Math.max(12, Math.min(innerWidth - b.width - 12, r.left + r.width / 2 - b.width / 2));
        const above = r.top - b.height - 5;
        node.dataset.below = String(above < 12);
        node.style.left = x + 'px'; node.style.top = Math.max(12, Math.min(innerHeight - b.height - 12, above < 12 ? r.bottom + 8 : above)) + 'px';
        node.style.setProperty('--bubble-tail', Math.max(20, Math.min(b.width - 20, r.left + r.width / 2 - x)) + 'px');
        this.frame = requestAnimationFrame(position);
      }; position();
    }
    hide() {
      cancelAnimationFrame(this.frame);
      if (this.node && this.target) {
        const ids = (this.target.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== this.node.id);
        if (ids.length) this.target.setAttribute('aria-describedby', ids.join(' ')); else this.target.removeAttribute('aria-describedby');
      }
      this.node?.remove(); this.node = null; this.target = null;
    }
    destroy() { this.hide(); }
  }
  window.ExperimentHints = window.ExperimentHints || {}; window.ExperimentHints.NameBubble = NameBubble;
})();

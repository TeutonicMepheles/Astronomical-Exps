/* Shared application state. Classic scripts keep file:// usage independent of a server. */
window.Newton = window.Newton || {};
(function (N) {
  'use strict';
  const defaults = Object.freeze({ mode: 'parallel', focal: 800, angle: 45, eyepiece: 25, live: true, running: false, aperture:130, target:'saturn' });
  let state = { ...defaults };
  const subscribers = new Set();
  N.store = {
    get: () => ({ ...state }),
    set(patch) { state = { ...state, ...patch }; subscribers.forEach(fn => fn({ ...state })); },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    reset() { this.set({ ...defaults }); }
  };
})(window.Newton);

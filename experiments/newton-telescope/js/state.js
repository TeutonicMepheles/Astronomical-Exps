/* Shared application state. Classic scripts keep file:// usage independent of a server. */
window.Newton = window.Newton || {};
(function (N) {
  'use strict';
  const defaults = Object.freeze({ mode: 'parallel', focal: 800, angle: 45, eyepiece: 25, live: true, running: false, aperture:130, target:'saturn' });
  let state = { ...defaults };
  const subscribers = new Set();
  N.store = {
    get: () => ({ ...state }),
    // The readout/eyepiece image uses 400–1600; preserve the original model
    // response at the same slider position: 400 -> 540 and 1600 -> 800.
    telescopeState(value = state) {
      const displayed = Number.isFinite(value.focal) ? value.focal : state.focal;
      const fraction = Math.max(0, Math.min(1, (displayed - 400) / 1200));
      return { ...value, focal: 540 + fraction * 260 };
    },
    // Derived readings share the existing 60-degree field and 7 mm eye-pupil assumptions.
    metrics(value = state) {
      const magnification = value.focal / value.eyepiece, aperture = value.aperture || 130;
      return { magnification, field: 60 / magnification, focalRatio: value.focal / aperture,
        exitPupil: aperture / magnification, lightGathering: (aperture / 7) ** 2 };
    },
    set(patch) {
      const focal = Number.isFinite(patch.focal) ? Math.max(400, Math.min(1600, patch.focal)) : state.focal;
      state = { ...state, ...patch, focal }; subscribers.forEach(fn => fn({ ...state }));
    },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    reset() { this.set({ ...defaults }); }
  };
})(window.Newton);

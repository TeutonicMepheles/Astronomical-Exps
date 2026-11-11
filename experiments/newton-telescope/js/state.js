/* Shared application state. Classic scripts keep file:// usage independent of a server. */
window.Newton = window.Newton || {};
(function (N) {
  'use strict';
  const defaults = Object.freeze({ mode: 'parallel', focal: 800, angle: 45, eyepiece: 25, live: true, running: false, aperture:130, target:'saturn' });
  let state = { ...defaults };
  const subscribers = new Set();
  const observationProfiles={
        pleiades:{task:'星团全景',min:20,max:30,displayReference:25},
        moon:{task:'月面全景',min:40,max:75,displayReference:60},
        jupiter:{task:'木星云带',min:100,max:150,displayReference:120},
        saturn:{task:'土星环',min:160,max:200,displayReference:180}
  };

  N.store = {
    get: () => ({ ...state }),
    // Defocus from the existing fixed reference assembly: primary image plane
    // must meet the eyepiece front focal plane. Pixel gain/tolerance are visual.
    focusBlur(value=state){
      const reference=N.sectionOptics?.model||{referenceFocal:800,referenceEyepiece:25};
      const primary=this.telescopeState(value).focal;
      const mismatch=reference.referenceFocal+reference.referenceEyepiece-primary-value.eyepiece;
      return Math.min(16,Math.max(0,Math.abs(mismatch)-2)*.12);
    },
    // Teaching acceptance band, not physical focal-plane accuracy.
    // Hysteresis keeps the discovery tip stable during small knob movements.
    focusAcceptable(value=state,wasFocused=false){
      return this.focusBlur(value)<=(wasFocused?3:2.25);
    },
    // Distinct lesson tasks informed by observing practice, NOT exclusive
    // real-world requirements. Sources and rationale: docs/OBSERVING_SETUP.md.
    observationSetup(value=state){
      const profile=observationProfiles[value.target];
      if(!profile)return {suitable:false,hint:''};
      const metrics=this.metrics(value),within=metrics.magnification>=profile.min-1e-9&&metrics.magnification<=profile.max+1e-9;
      const apertureOK=metrics.magnification<=2*(value.aperture||130);
      return {...profile,suitable:within&&apertureOK,
        hint:!within?`倍率调至 ${profile.min}–${profile.max}×`:!apertureOK?'增大主镜口径，保留细节':''};
    },
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

/* Shared application state. Classic scripts keep file:// usage independent of a server. */
window.Newton = window.Newton || {};
(function (N) {
  'use strict';
  const defaults = Object.freeze({ mode: 'parallel', focal: 800, angle: 45, eyepiece: 25, live: true, running: false, aperture:130, target:'saturn' });
  let state = { ...defaults };
  const subscribers = new Set();
  const observationProfiles={
        nebula:{task:'星云亮度与细节',apertureOnly:true,displayReference:32},
        moon:{task:'月面全景',min:40,max:75,displayReference:60},
        jupiter:{task:'木星云带',min:100,max:150,displayReference:120},
        saturn:{task:'土星环',min:160,max:200,displayReference:180}
  };

  N.store = {
    get: () => ({ ...state }),
    // Relative illustration brightness only, not measured surface photometry.
    observationBrightness(value=state){
      if(value.target!=='nebula')return 1;
      const response=(value.aperture||130)/130;
      return 2*response/(1+response);
    },
    brightnessAcceptable(value=state){return this.observationBrightness(value)>=.85;},
    // Distinct lesson tasks informed by observing practice, NOT exclusive
    // real-world requirements. Sources and rationale: docs/OBSERVING_SETUP.md.
    observationSetup(value=state){
      const profile=observationProfiles[value.target];
      if(!profile)return {suitable:false,hint:''};
      const metrics=this.metrics(value),within=metrics.magnification>=profile.min-1e-9&&metrics.magnification<=profile.max+1e-9;
      const brightness=this.observationBrightness(value),brightnessOK=this.brightnessAcceptable(value);
      const sizeOK=profile.apertureOnly||within;
      return {...profile,sizeOK,apertureOK:true,brightness,brightnessOK,suitable:sizeOK&&brightnessOK,
        hint:!brightnessOK?'增大主镜口径，观察星云亮度与细节':!sizeOK?`倍率调至 ${profile.min}–${profile.max}×`:''};
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

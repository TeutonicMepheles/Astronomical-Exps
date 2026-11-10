// Experiment-owned controls; icon-only presentation follows the Foucault HUD
// convention. No dependency on another experiment's private components.
export function mountOrbitControls(scene, current, onReset) {
  const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  const playIcon=icon('<path d="m8 5 11 7-11 7z"/>');
  const pauseIcon=icon('<path d="M8 5v14M16 5v14"/>');
  const resetIcon=icon('<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>');
  const toolbar=document.createElement('div');
  toolbar.className='orbit-transport';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','公转播放控制');
  toolbar.innerHTML=`<button type="button" data-orbit-play aria-label="播放公转">${playIcon}</button><button type="button" data-orbit-pause aria-label="暂停公转">${pauseIcon}</button><button type="button" data-orbit-reset aria-label="复位到打开页面时的日期和自转角度">${resetIcon}</button>`;
  scene.stage.append(toolbar);
  const initialDate=scene.observationDate,initialSpin=scene.spin;
  let playing=!matchMedia('(prefers-reduced-motion:reduce)').matches;
  function setPlaying(value){playing=value;toolbar.querySelector('[data-orbit-play]').setAttribute('aria-pressed',String(value));toolbar.querySelector('[data-orbit-pause]').setAttribute('aria-pressed',String(!value));scene.stage.dataset.orbitPlaying=String(value);}
  toolbar.querySelector('[data-orbit-play]').addEventListener('click',()=>setPlaying(true));
  toolbar.querySelector('[data-orbit-pause]').addEventListener('click',()=>setPlaying(false));
  toolbar.querySelector('[data-orbit-reset]').addEventListener('click',()=>{setPlaying(false);onReset();scene.observationDate=initialDate;scene.spin=initialSpin;});
  // Manual axis input owns the scene until the user explicitly resumes orbit playback.
  window.addEventListener('manual-time-control',()=>setPlaying(false));
  setPlaying(playing);
  return {get playing(){return playing;},setPlaying};
}

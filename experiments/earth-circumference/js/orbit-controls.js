// Experiment-owned controls; icon-only presentation follows the Foucault HUD
// convention. No dependency on another experiment's private components.
export function mountOrbitControls(scene, current) {
  const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  const playIcon=icon('<path d="m9 5 7 7-7 7"/>');
  const fastIcon=icon('<path d="m4 5 7 7-7 7m8-14 7 7-7 7"/>');
  const pauseIcon=icon('<path d="M8 5v14M16 5v14"/>');
  const toolbar=document.createElement('div');
  toolbar.className='orbit-transport';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','时间轴前进与暂停控制');
  toolbar.innerHTML=`<button type="button" data-orbit-play aria-label="前进一小步">${playIcon}</button><button type="button" data-orbit-fast aria-label="前进一大步">${fastIcon}</button><button type="button" data-orbit-pause aria-label="暂停公转">${pauseIcon}</button>`;
  scene.stage.append(toolbar);
  let playing=!matchMedia('(prefers-reduced-motion:reduce)').matches;
  let speed=1;
  const buttons={play:toolbar.querySelector('[data-orbit-play]'),fast:toolbar.querySelector('[data-orbit-fast]'),pause:toolbar.querySelector('[data-orbit-pause]')};
  function syncState(){
    buttons.play.removeAttribute('aria-pressed');
    buttons.fast.removeAttribute('aria-pressed');
    buttons.pause.setAttribute('aria-pressed',String(!playing));
    scene.stage.dataset.orbitPlaying=String(playing);
    scene.stage.dataset.orbitSpeed=String(speed);
  }
  function setPlaying(value,nextSpeed=speed){playing=value;speed=nextSpeed;syncState();}
  buttons.play.addEventListener('click',()=>{setPlaying(false);scene.stage.dispatchEvent(new CustomEvent('timeline-forward-step',{detail:{coarse:false}}));});
  buttons.fast.addEventListener('click',()=>{setPlaying(false);scene.stage.dispatchEvent(new CustomEvent('timeline-forward-step',{detail:{coarse:true}}));});
  buttons.pause.addEventListener('click',()=>setPlaying(false));
  // Manual axis input owns the scene until the user explicitly resumes orbit playback.
  window.addEventListener('manual-time-control',()=>setPlaying(false));
  syncState();
  return {get playing(){return playing;},get speed(){return speed;},setPlaying};
}

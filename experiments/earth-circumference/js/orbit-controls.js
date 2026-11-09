// Experiment-owned controls; icon-only presentation follows the Foucault HUD
// convention. No dependency on another experiment's private components.
export function mountOrbitControls(scene, current, onReset) {
  const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  const playIcon=icon('<path d="m8 5 11 7-11 7z"/>');
  const pauseIcon=icon('<path d="M8 5v14M16 5v14"/>');
  const resetIcon=icon('<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>');
  const spinIcon=icon('<circle cx="12" cy="12" r="6"/><path d="M12 4v16M3 9c2-4 16-4 18 0s-4 7-9 7M18 5l3 4-4 1"/>');
  const toolbar=document.createElement('div');
  toolbar.className='orbit-transport';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','公转播放控制');
  toolbar.innerHTML=`<button type="button" data-orbit-play aria-label="播放公转">${playIcon}</button><button type="button" data-orbit-pause aria-label="暂停公转">${pauseIcon}</button><button type="button" data-orbit-reset aria-label="复位到打开页面时的日期和自转角度">${resetIcon}</button>`;
  scene.stage.append(toolbar);
  const control=document.createElement('div');control.className='orbit-spin-control';
  control.innerHTML=`<button class="orbit-spin-button" type="button" aria-label="自转进度" aria-expanded="false" aria-controls="orbit-spin-popover">${spinIcon}</button><div class="orbit-spin-popover" id="orbit-spin-popover" hidden><label for="orbit-spin-range">自转进度</label><output for="orbit-spin-range">0°</output><input id="orbit-spin-range" aria-label="自转进度" type="range" min="0" max="360" step="1" value="0"/></div>`;
  current.append(control);
  const button=control.querySelector('button'),popover=control.querySelector('.orbit-spin-popover'),range=control.querySelector('input'),output=control.querySelector('output');
  const initialDate=scene.observationDate,initialSpin=scene.spin;
  let offset=0,baseSpin=scene.spin,playing=!matchMedia('(prefers-reduced-motion:reduce)').matches;
  function close(){popover.hidden=true;button.setAttribute('aria-expanded','false');}
  function setPlaying(value){playing=value;toolbar.querySelector('[data-orbit-play]').setAttribute('aria-pressed',String(value));toolbar.querySelector('[data-orbit-pause]').setAttribute('aria-pressed',String(!value));scene.stage.dataset.orbitPlaying=String(value);if(value)close();}
  function setReading(value){range.value=String(value);output.value=`${value}°`;range.setAttribute('aria-valuetext',`${value} 度`);}
  button.addEventListener('click',()=>{if(!popover.hidden){close();return;}setPlaying(false);baseSpin=scene.spin-offset;popover.hidden=false;button.setAttribute('aria-expanded','true');range.focus({preventScroll:true});});
  range.addEventListener('input',()=>{offset=Number(range.value);scene.spin=baseSpin+offset;setReading(offset);});
  control.addEventListener('keydown',event=>{if(event.key==='Escape'){close();button.focus();event.preventDefault();}});
  scene.stage.addEventListener('pointerdown',event=>{if(!control.contains(event.target))close();});
  toolbar.querySelector('[data-orbit-play]').addEventListener('click',()=>setPlaying(true));
  toolbar.querySelector('[data-orbit-pause]').addEventListener('click',()=>setPlaying(false));
  toolbar.querySelector('[data-orbit-reset]').addEventListener('click',()=>{setPlaying(false);offset=0;onReset();scene.observationDate=initialDate;scene.spin=initialSpin;baseSpin=initialSpin;setReading(0);close();});
  window.addEventListener('view-mode-change',close);
  window.addEventListener('globe-mode-change',close);
  setReading(0);setPlaying(playing);
  return {get playing(){return playing;},get offset(){return offset;},setPlaying};
}

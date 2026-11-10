// Fixed-endpoint calculation interaction; no free measurement viewport or tool button.
export function mountCalculationDistance(scene, host, { onStart, onDone }) {
  host.innerHTML='<svg viewBox="0 0 1600 900" aria-hidden="true"><path class="calculation-distance-path" pathLength="1"/></svg>';
  const path=host.querySelector('path');
  const tip=new window.ExperimentUI.OperationTip(scene.stage,{top:'116px',className:'calculation-distance-tip'});
  const selected=scene.stage.querySelector('.geo-selected');
  const reference=scene.stage.querySelector('.geo-subsolar');
  let animation=null;
  function phase(value){
    host.dataset.phase=value;
    selected.classList.toggle('distance-target',value==='pickStart');
    reference.classList.toggle('distance-target',value==='pickEnd');
    if(value==='pickStart')tip.show('点击观测点，确定测距起点');
    else if(value==='pickEnd')tip.show('点击太阳直射点，确定测距终点');
    else tip.hide();
  }
  function exit(){animation?.cancel();animation=null;path.setAttribute('d','');phase('idle');}
  function enter(){exit();onStart();phase('pickStart');}
  function connect(){
    phase('committing');
    const arc=scene.measureArc(),cam=scene.camera();
    let d='',connected=false;
    for(let i=0;i<=72;i++){
      const p=scene.projectLatLon(arc.selLat+(arc.subLat-arc.selLat)*i/72,arc.selLon);
      if(!p.visible){connected=false;continue;}
      d+=`${connected?'L':'M'}${cam.centre.x+p.normal[0]*cam.radius} ${cam.centre.y-p.normal[1]*cam.radius} `;
      connected=true;
    }
    path.setAttribute('d',d);
    const finish=()=>{phase('done');onDone();};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
    animation=path.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:950,easing:'ease-in-out'});
    animation.onfinish=finish;
  }
  function activate(event){
    if(!scene.calculating||!['pickStart','pickEnd','committing'].includes(host.dataset.phase))return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    // Capture only during the fixed-pair interaction; ignore all background clicks.
    if(event.target.closest('.calculation-panel,.calculation-center-button,.stage-back'))return;
    event.preventDefault();event.stopPropagation();
    if(host.dataset.phase==='pickStart'&&selected.contains(event.target))phase('pickEnd');
    else if(host.dataset.phase==='pickEnd'&&reference.contains(event.target))connect();
  }
  scene.stage.addEventListener('click',activate,true);
  scene.stage.addEventListener('keydown',activate,true);
  phase('idle');
  return {enter,exit,destroy(){exit();tip.destroy();scene.stage.removeEventListener('click',activate,true);scene.stage.removeEventListener('keydown',activate,true);}};
}

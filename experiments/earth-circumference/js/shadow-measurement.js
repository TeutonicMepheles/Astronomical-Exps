export function mountShadowMeasurement(panel) {
  const svg=panel.querySelector('.site-scene'), ns='http://www.w3.org/2000/svg';
  const overlay=document.createElementNS(ns,'g');overlay.classList.add('shadow-measure-overlay');
  overlay.innerHTML='<path class="shadow-measure-halo" fill="none"/><path class="shadow-measure-path" fill="none"/><circle class="measure-dot" r="6"/><text class="shadow-cm" text-anchor="middle"/>';
  svg.append(overlay);
  const controls=document.createElement('div');controls.className='shadow-measure-controls';
  controls.innerHTML='<p class="measurement-instruction" aria-live="polite">点选影端</p><div class="measurement-records"><span data-record="selected"></span><span data-record="subsolar"></span></div>';
  svg.after(controls);
  const empty=()=>({value:null,saved:false});let records={selected:empty(),subsolar:empty()};
  let context={},key='',frame=0,progress=1;
  function stop(){cancelAnimationFrame(frame);frame=0;}
  function paint(){
    const r=records[context.site]||empty();overlay.style.display=r.value===null?'none':'';
    if(r.value!==null){const end=330+r.value*context.pxPerCm*r.direction*progress;
      overlay.querySelectorAll('path').forEach(p=>p.setAttribute('d',`M330 355V372H${end}V355`));
      const dot=overlay.querySelector('circle');dot.setAttribute('cx',end);dot.setAttribute('cy','355');
      const label=overlay.querySelector('text');label.setAttribute('x',(330+end)/2);label.setAttribute('y','395');label.textContent=progress<1?'':`${r.value.toFixed(1)} cm`;
    }
    controls.querySelector('.measurement-instruction').textContent=context.canMeasure?'点选影端 · 再次点击可重测':context.reason;
    for(const site of ['selected','subsolar']){const r=records[site];controls.querySelector(`[data-record="${site}"]`).textContent=`${site==='selected'?'观测点':'直射点'}：${r.saved?r.value.toFixed(1)+' cm':'待测'}`;}
  }
  svg.addEventListener('pointerdown',e=>{
    if(!context.canMeasure||panel.hidden)return;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    if(p.y<260)return;
    stop();const x=Math.max(20,Math.min(640,p.x));const delta=Math.abs(x-330)<7?0:x-330;
    records[context.site]={value:Math.abs(delta)/context.pxPerCm,direction:Math.sign(delta)||context.direction,saved:false};
    window.dispatchEvent(new Event('measurement-change'));
    const started=performance.now(),site=context.site;progress=0;
    function step(now){if(site!==context.site||panel.hidden){stop();return;}const t=Math.min(1,(now-started)/750);progress=t*t*(3-2*t);paint();if(t<1)frame=requestAnimationFrame(step);else{records[site].saved=true;paint();window.dispatchEvent(new Event('measurement-change'));}}
    frame=requestAnimationFrame(step);e.preventDefault();
  });
  return {snapshot:()=>structuredClone(records),setContext(next){
    if(next.key!==key){records={selected:empty(),subsolar:empty()};key=next.key;stop();}
    if(next.site!==context.site){stop();progress=1;}
    context=next;paint();
  },suspend:stop};
}

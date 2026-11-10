// Public MeasureMode integration; the host owns calibration and saved evidence.
export function mountShadowMeasurement(panel) {
 const viewport=panel.querySelector('.observation-viewport');
 const measureHost=document.createElement('div');measureHost.className='shadow-measure-host earth-measure-soft';viewport.append(measureHost);
 const controls=document.createElement('div');controls.className='shadow-measure-controls';
 controls.innerHTML='<p class="measurement-instruction" aria-live="polite"></p><div class="measurement-records"><span data-record="selected"></span><span data-record="subsolar"></span></div>';
 viewport.after(controls);
 const retry=document.createElement('button');retry.type='button';retry.className='shadow-remeasure';retry.setAttribute('aria-label','重新测量');retry.title='重新测量';retry.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/></svg>';retry.hidden=true;viewport.append(retry);
 const empty=()=>({value:null,saved:false});
 let records={selected:empty(),subsolar:{value:0,saved:false,read:false,reference:true}},context={},key='',active=false;
 function paint(){
  retry.hidden=context.site!=='selected'||!records.selected.saved;
  controls.querySelector('.measurement-instruction').textContent=context.canMeasure?'':context.reason||'';
  for(const site of ['selected','subsolar']){
   const r=records[site];
   controls.querySelector(`[data-record="${site}"]`).textContent=site==='subsolar'?`直射点说明：${r.read?'已阅读':'可选查看'}`:`观测点：${r.saved?r.value.toFixed(1)+' cm':'待测'}`;
  }
 }
 function clearSelected(){
  measure.exit();
  records.selected=empty();
  measureHost.hidden=false;
  paint();
  window.dispatchEvent(new Event('measurement-change'));
 }
 retry.addEventListener('click',()=>{clearSelected();measure.enter();});
 const measure=window.SharedComponents.MeasureMode(measureHost,{
  label:'影长',unit:'cm',decimal:1,shape:'straight',
  format(px){
   const unitsPerPixel=660/(viewport.clientWidth*context.pxPerCm);
   const value=px*unitsPerPixel;
   const points=measure.getPoints();
   if(active&&context.site==='selected'&&context.canMeasure&&points.start&&points.end){
    records[context.site]={value,saved:true,direction:Math.sign(points.end.x-points.start.x)||context.direction};
    paint();queueMicrotask(()=>{measure.exit();measureHost.hidden=true;window.dispatchEvent(new Event('measurement-change'));});
   }
   return {value,unit:'cm',decimal:1};
  }
 });
 window.addEventListener('pagehide',event=>{if(!event.persisted)measure.destroy();});
 return {
  snapshot:()=>structuredClone(records),
  clearSelected,
  setContext(next){
   if(next.key!==key){records={selected:empty(),subsolar:{value:0,saved:false,read:false,reference:true}};key=next.key;measure.exit();}
   if(next.site!==context.site)measure.exit();
   context=next;active=true;measureHost.hidden=next.site==='subsolar'||records.selected.saved;measureHost.inert=!next.canMeasure;
   if(next.site==='subsolar'&&!records.subsolar.read){records.subsolar.read=true;queueMicrotask(()=>window.dispatchEvent(new Event('measurement-change')));}
   paint();
  },
  suspend(){if(active){measure.exit();active=false;}}
 };
}

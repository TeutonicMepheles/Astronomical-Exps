// EXP-04 interactive thumbnail; solar reference has no observation entry.
export function mountObservationTips(scene){
 const button=document.createElement('button');button.type='button';
 button.className='observation-tip observation-tip-selected';button.hidden=true;
 button.setAttribute('aria-label','观测所选位置的杆影');
 button.innerHTML=`<svg viewBox="130 0 400 400" aria-hidden="true"><image href="./assets/scene-open.png" width="660" height="400"/></svg><span class="observation-tip-action">观测 <span aria-hidden="true">↗</span></span>`;
 button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('open-observation',{detail:{site:'selected',origin:button.getBoundingClientRect().toJSON()}})));
 scene.stage.append(button);
 const reference=scene.stage.querySelector('.geo-subsolar');
 function update(){
  if(!scene.observationPreviewReady){button.hidden=true;return;}
  const geometry=scene.measureArc(),point=geometry.sel;
  button.hidden=point.visible===false;if(button.hidden)return;
  // Put the thumbnail opposite the reference label when both anchors are close.
  // Use projected geometry only: no per-frame DOM measurement / forced layout.
  const nearby=Math.abs(point.y-geometry.sub.y)<104&&Math.abs(point.x-geometry.sub.x)<210;
  reference.dataset.labelSide=nearby?'left':'right';
  button.style.left=`${point.x+38}px`;button.style.top=`${Math.max(110,Math.min(680,point.y-48))}px`;
 }
 for(const event of ['globe-frame','globe-mode-change','view-mode-change'])window.addEventListener(event,update);
 update();
}

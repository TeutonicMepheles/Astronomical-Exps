// EXP-04 interactive thumbnail; solar reference has no observation entry.
export function mountObservationTips(scene){
 const button=document.createElement('button');button.type='button';
 button.className='observation-tip observation-tip-selected';button.hidden=true;
 button.setAttribute('aria-label','观测所选位置的杆影');
 button.innerHTML=`<svg viewBox="130 0 400 400" aria-hidden="true"><image href="./assets/scene-open.png" width="660" height="400"/><path class="thumbnail-shadow" stroke="#282b36" stroke-width="9"/><image class="thumbnail-pole" href="./assets/scene-pole.png" preserveAspectRatio="none"/></svg>`;
 button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('open-observation',{detail:{site:'selected',origin:button.getBoundingClientRect().toJSON()}})));
 scene.stage.append(button);
 function update(){
  const ready=scene.stage.dataset.viewMode==='earth'&&!scene.measuring&&scene.stage.classList.contains('has-selection')&&!scene.stage.classList.contains('aligning-point')&&!scene.stage.classList.contains('showing-reference');
  const geometry=scene.measureArc(),point=geometry.sel;
  button.hidden=!ready||point.visible===false;if(button.hidden)return;
  button.style.left=`${point.x+30}px`;button.style.top=`${Math.max(110,Math.min(680,point.y-48))}px`;
  const delta=geometry.selLat-geometry.subLat,ratio=Math.tan(Math.abs(delta)*Math.PI/180);
  const h=100*Math.min(1.75,270/Math.max(100*ratio,1)),w=h*71/794;
  const pole=button.querySelector('.thumbnail-pole');
  for(const [name,value] of Object.entries({x:330-w/2,y:355-h,width:w,height:h}))pole.setAttribute(name,value);
  const shadow=button.querySelector('.thumbnail-shadow');shadow.setAttribute('d',`M330 355H${330+Math.sign(delta)*h*ratio}`);shadow.style.visibility=Math.abs(delta)<90?'visible':'hidden';
 }
 for(const event of ['globe-frame','globe-mode-change','view-mode-change'])window.addEventListener(event,update);
 update();
}

import { GLOBE_CENTER } from './globe-core.js';

// Direct input and touch buttons share the same longitude preview.
export function mountMeridianSelection(scene){
 const control=document.createElement('section');control.className='meridian-selection';
 const hint=new window.ExperimentUI.OperationTip(scene.stage,{top:'690px',className:'earth-pick-hint'});
 // Adapt the 11458 svg-grain-demo dual-step specimen to the experiment's existing scene state.
 control.innerHTML=`
  <svg class="meridian-grain-defs" aria-hidden="true" focusable="false">
   <defs><filter id="meridian-grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="1" seed="8"/>
    <feColorMatrix type="saturate" values="0"/>
   </filter></defs>
  </svg>
  <div class="meridian-stepper" role="group" aria-label="经度步进">
   <button type="button" data-longitude-step="-10" aria-label="减少 10 度">−10°</button>
   <button type="button" data-longitude-step="-1" aria-label="减少 1 度">−1°</button>
   <label class="meridian-stepper-field">
    <input data-longitude type="text" value="0" aria-label="经度，东正西负" aria-describedby="longitude-error" autocomplete="off" spellcheck="false">
    <span aria-hidden="true">°</span>
   </label>
   <button type="button" data-longitude-step="1" aria-label="增加 1 度">+1°</button>
   <button type="button" data-longitude-step="10" aria-label="增加 10 度">+10°</button>
   <button type="button" data-apply-meridian aria-label="确认经线">
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
     <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
   </button>
  </div>
  <p id="longitude-error" role="status" hidden></p>`;
 const viewTabs=scene.stage.querySelector('.view-mode-tabs');
 const surfaces=[control,...control.querySelectorAll('button,.meridian-stepper-field')];
 if(viewTabs)surfaces.push(viewTabs,...viewTabs.querySelectorAll('.view-mode-tab'));
 for(const surface of surfaces){
  surface.insertAdjacentHTML('afterbegin','<svg class="meridian-grain" aria-hidden="true" focusable="false"><rect width="100%" height="100%" filter="url(#meridian-grain)"/></svg>');
 }
 control.style.left=GLOBE_CENTER.x+"px";
 scene.stage.append(control.querySelector('.meridian-grain-defs'),control);
 const input=control.querySelector('[data-longitude]');
 const error=control.querySelector('#longitude-error');
 const confirm=control.querySelector('[data-apply-meridian]');
 let editing=false;
 let confirmedLongitude=null;
 input.addEventListener('focus',()=>input.select());
 input.addEventListener('pointerdown',event=>{
  if(document.activeElement===input)return;
  event.preventDefault();
  input.focus();
 });
 function clearError(){
  input.removeAttribute('aria-invalid');
  error.hidden=true;
 }
 input.addEventListener('input',()=>{
  const value=input.value.trim().replace(/^−/,'-');
  const longitude=Number(value);
  if(!/^[+-]?\d+$/.test(value)||Math.abs(longitude)>180){
   input.setAttribute('aria-invalid','true');
   error.textContent='请输入 −180 到 180 的整数（东正西负）';
   error.hidden=false;
   confirm.disabled=true;
   return;
  }
  clearError();
  if(!scene.pickingMeridian&&longitude===confirmedLongitude)return;
  editing=true;
  scene.previewMeridian(longitude);
  editing=false;
 });
 input.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!confirm.disabled)confirm.click();
 });
 for(const button of control.querySelectorAll('[data-longitude-step]'))button.addEventListener('click',()=>scene.previewMeridian(scene.selectedMeridian+Number(button.dataset.longitudeStep)));
 confirm.addEventListener('click',()=>scene.setMeridian(scene.selectedMeridian));
 function update(event){
  control.hidden=scene.measuring;
  const longitude=scene.selectedMeridian;
  input.disabled=scene.meridianAligning;
  if(!editing){
   input.value=String(longitude);
   clearError();
  }
  for(const button of control.querySelectorAll('[data-longitude-step]'))button.disabled=scene.meridianAligning||(longitude<=-180&&Number(button.dataset.longitudeStep)<0)||(longitude>=180&&Number(button.dataset.longitudeStep)>0);
  if(scene.pickingMeridian&&longitude===confirmedLongitude)scene.restoreConfirmedMeridian();
  if(scene.stage.dataset.meridianState==='confirmed')confirmedLongitude=longitude;
  confirm.disabled=scene.meridianAligning||longitude===confirmedLongitude;
  if(event?.detail?.fromGlobe){
   input.focus({preventScroll:true});
   input.select();
  }
  hint.show(scene.meridianAligning?'经线转向正午':scene.pickingMeridian?'选择经度，确认经线':'点按所选经线，选择观测点');
  scene.canvas.setAttribute('aria-label',scene.pickingMeridian?'点按地球预选经线，随后确认':'点按所选经线选择观测点');
 }
 for(const event of ['globe-mode-change','meridian-selection-change'])window.addEventListener(event,update);
 scene.stage.querySelector('[data-view-mode-button="earth"]').click();
 scene.beginMeridianSelection();update();
}

// Direct input and touch buttons share the same longitude preview.
export function mountMeridianSelection(scene){
 const control=document.createElement('section');control.className='meridian-selection';
 control.innerHTML=`<button type="button" data-longitude-step="-10">−10°</button><button type="button" data-longitude-step="-1">−1°</button><input data-longitude type="text" value="0" aria-label="经度，东正西负" aria-describedby="longitude-error" autocomplete="off" spellcheck="false"><button type="button" data-longitude-step="1">＋1°</button><button type="button" data-longitude-step="10">＋10°</button><button type="button" data-apply-meridian>确认经线</button><button type="button" data-pick-meridian hidden>重选经线</button><p id="longitude-error" role="status" hidden></p>`;
 scene.stage.append(control);
 const input=control.querySelector('[data-longitude]');
 const error=control.querySelector('#longitude-error');
 const confirm=control.querySelector('[data-apply-meridian]');
 let editing=false;
 function clearError(){
  input.removeAttribute('aria-invalid');
  error.hidden=true;
  confirm.disabled=false;
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
  editing=true;
  scene.previewMeridian(longitude);
  editing=false;
 });
 input.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!confirm.hidden&&!confirm.disabled)confirm.click();
 });
 for(const button of control.querySelectorAll('[data-longitude-step]'))button.addEventListener('click',()=>scene.previewMeridian(scene.selectedMeridian+Number(button.dataset.longitudeStep)));
 confirm.addEventListener('click',()=>scene.setMeridian(scene.selectedMeridian));
 control.querySelector('[data-pick-meridian]').addEventListener('click',()=>scene.beginMeridianSelection());
 function update(){
  control.hidden=scene.measuring;
  const longitude=scene.selectedMeridian;
  input.disabled=scene.meridianAligning;
  if(!editing){
   input.value=String(longitude);
   clearError();
  }
  for(const button of control.querySelectorAll('[data-longitude-step]'))button.disabled=scene.meridianAligning||(longitude<=-180&&Number(button.dataset.longitudeStep)<0)||(longitude>=180&&Number(button.dataset.longitudeStep)>0);
  confirm.hidden=!scene.pickingMeridian;
  control.querySelector('[data-pick-meridian]').hidden=scene.pickingMeridian||scene.meridianAligning;
  const hint=scene.stage.querySelector('.earth-pick-hint');
  hint.textContent=scene.meridianAligning?'经线转向正午':scene.pickingMeridian?'选择经度，确认经线':'点按所选经线，选择观测点';
  scene.canvas.setAttribute('aria-label',scene.pickingMeridian?'点按地球预选经线，随后确认':'点按所选经线选择观测点');
 }
 for(const event of ['globe-mode-change','meridian-selection-change'])window.addEventListener(event,update);
 scene.stage.querySelector('[data-view-mode-button="earth"]').click();
 scene.beginMeridianSelection();update();
}

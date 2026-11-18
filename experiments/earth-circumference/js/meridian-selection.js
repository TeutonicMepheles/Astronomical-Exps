// Preview longitude with touch buttons; confirm before the noon rotation.
export function mountMeridianSelection(scene){
 const control=document.createElement('section');control.className='meridian-selection';
 control.innerHTML=`<button type="button" data-longitude-step="-10">−10°</button><button type="button" data-longitude-step="-1">−1°</button><output data-longitude aria-live="polite">0°</output><button type="button" data-longitude-step="1">＋1°</button><button type="button" data-longitude-step="10">＋10°</button><button type="button" data-apply-meridian>确认经线</button><button type="button" data-pick-meridian hidden>重选经线</button>`;
 scene.stage.append(control);
 for(const button of control.querySelectorAll('[data-longitude-step]'))button.addEventListener('click',()=>scene.previewMeridian(scene.selectedMeridian+Number(button.dataset.longitudeStep)));
 control.querySelector('[data-apply-meridian]').addEventListener('click',()=>scene.setMeridian(scene.selectedMeridian));
 control.querySelector('[data-pick-meridian]').addEventListener('click',()=>scene.beginMeridianSelection());
 function update(){
  control.hidden=scene.measuring;
  const longitude=scene.selectedMeridian;
  control.querySelector('[data-longitude]').textContent=longitude===0?'0°':`${Math.abs(longitude)}°${longitude<0?'W':'E'}`;
  for(const button of control.querySelectorAll('[data-longitude-step]'))button.disabled=scene.meridianAligning||(longitude<=-180&&Number(button.dataset.longitudeStep)<0)||(longitude>=180&&Number(button.dataset.longitudeStep)>0);
  control.querySelector('[data-apply-meridian]').hidden=!scene.pickingMeridian;
  control.querySelector('[data-pick-meridian]').hidden=scene.pickingMeridian||scene.meridianAligning;
  const hint=scene.stage.querySelector('.earth-pick-hint');
  hint.textContent=scene.meridianAligning?'经线转向正午':scene.pickingMeridian?'选择经度，确认经线':'点按所选经线，选择观测点';
  scene.canvas.setAttribute('aria-label',scene.pickingMeridian?'点按地球预选经线，随后确认':'点按所选经线选择观测点');
 }
 for(const event of ['globe-mode-change','meridian-selection-change'])window.addEventListener(event,update);
 scene.stage.querySelector('[data-view-mode-button="earth"]').click();
 scene.beginMeridianSelection();update();
}

import { mountCalculationDistance } from './calculation-distance.js';
export function mountCalculation(scene){
 const panel=document.createElement('section');panel.className='calculation-panel simple-calculation';panel.hidden=true;
 panel.innerHTML=`<h2>计算地球周长</h2>
 <div class="calculation-inputs"><span>杆长 L <b data-rod-value>—</b></span><span>影长 s <b data-shadow-value>—</b></span></div>
 <ol class="calculation-steps">
 <li data-step="angle"><button type="button" data-angle><span class="calculation-step-title"><i>1</i> 杆影角与球心角</span><span class="angle-equation"><span>θ = 90° − <span data-altitude-value>α</span> =</span><strong>—</strong></span><span class="central-equation">球心角 = 杆影角 θ <b data-central-value>—</b></span></button></li>
 <li data-step="distance"><button type="button" id="meridian-distance"><span class="calculation-step-title"><i>2</i> 沿经线测量距离</span><span class="distance-equation">同经线距离 d <strong>点击测距</strong></span></button></li>
 <li data-step="formula"><button type="button" data-calculate><span class="calculation-step-title"><i>3</i> 计算地球周长</span><span class="circumference-formula"><var>C</var> ≈ <span class="math-fraction"><span>360°</span><span><var>θ</var></span></span> · <var>d</var></span></button><div class="calculation-substitution" aria-live="polite"></div><output class="calculation-result" aria-live="polite"></output></li>
 </ol><p class="formula-tip" role="status"></p>
 `;
 scene.stage.append(panel);
 const host=document.createElement('div');
 host.className='meridian-measure-host earth-measure-soft';
 scene.stage.append(host);
 function mark(step,done){const row=q(`[data-step="${step}"]`);row.dataset.complete=String(done);row.querySelector('.calculation-step-check').textContent=done?'✓':'';row.querySelector('.calculation-step-check').setAttribute('aria-label',done?'已完成':'未完成');}
 function refreshValue(element){if(!matchMedia('(prefers-reduced-motion:reduce)').matches)element.animate([{opacity:.2,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:380});}
 let formulaTimers=[];
 function cancelFormula(){formulaTimers.forEach(clearTimeout);formulaTimers=[];panel.dataset.formulaPhase='';}
 function cancelAngle(){window.dispatchEvent(new Event('cancel-angle'));panel.dataset.anglePhase='';}
 function focusStep(name){panel.dataset.activeStep=name;panel.querySelectorAll('.calculation-steps button').forEach(button=>button.classList.toggle('is-active',button.closest('li').dataset.step===name));}
 let distance=null,placeKey='',measureKey='',complete=false;
 const q=s=>panel.querySelector(s);
 panel.querySelectorAll('.calculation-step-title').forEach(title=>title.insertAdjacentHTML('beforeend','<span class="calculation-step-check" aria-label="未完成"></span>'));
 const thetaOf=record=>record.saved?Math.atan(record.value/scene.calibration.rod)*180/Math.PI:null;
 function meridianKm(){
  const arc=scene.measureArc();
  return Math.abs(arc.selLat-arc.subLat)*Math.PI/180*arc.radiusKm;
 }
 function clearResult(){panel.dataset.nextStep='';mark('formula',false);cancelFormula();complete=false;scene.stage.dataset.calculationComplete='false';q('.calculation-result').textContent='';q('.calculation-substitution').textContent='';}
 function clearDistance(){mark('distance',false);distance=null;measure.exit();clearResult();}
 function update(){
  panel.hidden=!scene.calculating;
  if(!scene.calculating){cancelFormula();cancelAngle();measure.exit();}
  const arc=scene.measureArc(),record=scene.measurements.snapshot();
  const nextPlace=JSON.stringify([scene.observationDate,arc.selLat,arc.selLon,arc.subLat]);
  const nextMeasure=JSON.stringify([record.selected,scene.calibration.rod]);
  if(nextPlace!==placeKey){placeKey=nextPlace;clearDistance();cancelAngle();mark('angle',false);q('[data-central-value]').textContent='—';q('[data-altitude-value]').textContent='α';}
  if(nextMeasure!==measureKey){measureKey=nextMeasure;clearResult();cancelAngle();mark('angle',false);q('[data-central-value]').textContent='—';q('[data-altitude-value]').textContent='α';}
  const theta=thetaOf(record.selected);
  q('[data-angle] strong').textContent=theta===null?'—':`${theta.toFixed(2)}°`;
  q('[data-angle]').disabled=theta===null||!scene.stage.classList.contains('rods-ready');
  q('[data-rod-value]').textContent=`${scene.calibration.rod} cm`;
  q('[data-shadow-value]').textContent=record.selected.saved?`${record.selected.value.toFixed(1)} cm`:'—';
  q('#meridian-distance strong').textContent=distance===null?'—':`${distance.toFixed(0)} km`;
  q('#meridian-distance').disabled=q('[data-step="angle"]').dataset.complete!=='true';
  q('[data-calculate]').disabled=distance===null||!(theta>0);
  if(scene.calculating&&theta!==null&&theta<=1e-6)q('.formula-tip').textContent='杆影角为 0，无法计算周长。';
 }
 const measure=mountCalculationDistance(scene,host,{
  onStart(){distance=null;mark('distance',false);clearResult();q('.formula-tip').textContent='';update();},
  onDone(){distance=meridianKm();mark('distance',true);panel.dataset.distanceComplete='true';update();focusStep('formula');panel.dataset.nextStep='formula';refreshValue(q('#meridian-distance strong'));}
 });
 window.addEventListener('pagehide',event=>{if(!event.persisted){cancelFormula();measure.destroy();}});
 function playAngle(){
  if(!scene.calculating||q('[data-angle]').disabled)return;
  cancelFormula();
  panel.dataset.nextStep='';
  if(host.dataset.phase!=='done')measure.exit();
  mark('angle',false);focusStep('angle');q('.formula-tip').textContent='';q('[data-central-value]').textContent='—';q('[data-altitude-value]').textContent='α';
  window.dispatchEvent(new Event('show-angle'));
 }
 q('[data-angle]').addEventListener('click',playAngle);
 window.addEventListener('request-angle',playAngle);
 window.addEventListener('angle-progress',event=>{
  panel.dataset.anglePhase=event.detail.phase;
  if(event.detail.phase==='done'){
   mark('angle',true);update();
   if(distance===null)startDistance();
   else if(!complete){focusStep('formula');panel.dataset.nextStep='formula';}
  }
  if(event.detail.phase==='rod')refreshValue(q('.angle-equation'));
  if(event.detail.phase==='center')refreshValue(q('.central-equation'));
  const theta=thetaOf(scene.measurements.snapshot().selected);
  if(['rod','center','done'].includes(event.detail.phase)&&theta!==null)q('[data-altitude-value]').textContent=`${(90-theta).toFixed(2)}°`;
  if(['center','done'].includes(event.detail.phase)){
   const angle=thetaOf(scene.measurements.snapshot().selected);
   q('[data-central-value]').textContent=angle===null?'—':`${angle.toFixed(2)}°`;
  }
 });
 function startDistance(){
  cancelFormula();focusStep('distance');panel.dataset.nextStep='';panel.dataset.distanceComplete='false';
  measure.enter();
 }
 q('#meridian-distance').addEventListener('click',startDistance);
 q('[data-calculate]').addEventListener('click',()=>{
  const angle=thetaOf(scene.measurements.snapshot().selected);if(distance===null||!(angle>0))return;
  clearResult();focusStep('formula');panel.dataset.nextStep='';
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  q('.calculation-substitution').innerHTML='<span class="math-fraction"><span>360°</span><span data-slot="angle">θ</span></span> · <span data-slot="distance">d</span>';
  function later(delay,action){if(reduced)action();else formulaTimers.push(setTimeout(action,delay));}
  later(250,()=>{panel.dataset.formulaPhase='angle';q('[data-slot="angle"]').textContent=`${angle.toFixed(2)}°`;refreshValue(q('[data-slot="angle"]'));});
  later(950,()=>{panel.dataset.formulaPhase='distance';q('[data-slot="distance"]').textContent=`${distance.toFixed(0)} km`;refreshValue(q('[data-slot="distance"]'));});
  later(1650,()=>{
   panel.dataset.formulaPhase='result';
   q('.calculation-result').textContent=`≈ ${(360/angle*distance).toFixed(0)} km`;
   mark('formula',true);complete=true;scene.stage.dataset.calculationComplete='true';window.dispatchEvent(new Event('calculation-progress'));
  });
 });
 for(const event of ['globe-frame','globe-mode-change','measurement-change'])window.addEventListener(event,update);
 update();
}

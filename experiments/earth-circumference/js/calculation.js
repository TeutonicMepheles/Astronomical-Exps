export function mountCalculation(scene){
 const panel=document.createElement('section');panel.className='calculation-panel simple-calculation';panel.hidden=true;
 panel.innerHTML=`<h2>计算地球周长</h2>
 <div class="calculation-evidence"><button type="button" data-angle><span>杆影角 θ</span><strong>—</strong></button><button type="button" id="meridian-distance"><span>同经线距离 d</span><strong>沿经线测距</strong></button></div>
 <button type="button" data-confirm-distance hidden>确认距离</button>
 <div class="circumference-formula">地球周长 ≈ 360° ÷ 杆影角 × 同经线距离</div>
 <div class="calculation-substitution"></div><button type="button" data-calculate>计算地球周长</button>
 <output class="calculation-result" aria-live="polite"></output><p class="formula-tip" role="status"></p>
 <small>角度由当前地点与日期计算；距离使用模拟地球模型。</small>`;
 scene.stage.append(panel);
 const host=document.createElement('div');
 host.className='meridian-measure-host earth-measure-soft';
 scene.stage.append(host);
 const prompt='测量观测点到直射点在经度方向上的距离';
 let distance=null,placeKey='',measureKey='',complete=false,applyingPhase=false;
 const q=s=>panel.querySelector(s);
 const thetaOf=record=>record.saved?Math.atan(record.value/scene.calibration.rod)*180/Math.PI:null;
 function markerPoint(marker){
  const hostBox=host.getBoundingClientRect(),box=marker.getBoundingClientRect();
  const sx=hostBox.width/(host.offsetWidth||hostBox.width||1);
  const sy=hostBox.height/(host.offsetHeight||hostBox.height||1);
  return {x:(box.left+box.width/2-hostBox.left)/sx,y:(box.top+box.height/2-hostBox.top)/sy};
 }
 function hits(event,marker){
  if(!marker||marker.hidden)return false;
  const box=marker.getBoundingClientRect();
  return event.clientX>=box.left-12&&event.clientX<=box.right+12&&event.clientY>=box.top-12&&event.clientY<=box.bottom+12;
 }
 function meridianKm(){
  const arc=scene.measureArc();
  return Math.abs(arc.selLat-arc.subLat)*Math.PI/180*arc.radiusKm;
 }
 function clearResult(){complete=false;scene.stage.dataset.calculationComplete='false';q('.calculation-result').textContent='';q('.calculation-substitution').textContent='';}
 function clearDistance(){distance=null;if(host.classList.contains('is-measuring'))measure.exit();clearResult();}
 function update(){
  panel.hidden=!scene.calculating;
  if(!scene.calculating&&host.classList.contains('is-measuring'))measure.exit();
  const arc=scene.measureArc(),record=scene.measurements.snapshot();
  const nextPlace=JSON.stringify([scene.observationDate,arc.selLat,arc.selLon,arc.subLat]);
  const nextMeasure=JSON.stringify([record.selected,scene.calibration.rod]);
  if(nextPlace!==placeKey){placeKey=nextPlace;clearDistance();}
  if(nextMeasure!==measureKey){measureKey=nextMeasure;clearResult();}
  const theta=thetaOf(record.selected);
  q('[data-angle] strong').textContent=theta===null?'—':`${theta.toFixed(2)}°`;
  q('#meridian-distance strong').textContent=distance===null?'沿经线测距':`${distance.toFixed(0)} km`;
  q('[data-calculate]').disabled=distance===null||!(theta>0);
  if(scene.calculating&&theta!==null&&theta<=1e-6)q('.formula-tip').textContent='杆影角为 0，无法计算周长。';
 }
 const measure=window.SharedComponents.MeasureMode(host,{
  label:'同经线距离',unit:'km',decimal:0,shape:'straight',autoCommit:true,scan:360,
  prompts:{pickStart:prompt,pickEnd:prompt,pending:'',committing:'',done:''},
  resolvePoint(phase,event){
   const selected=scene.stage.querySelector('.geo-selected');
   const subsolar=scene.stage.querySelector('.geo-subsolar');
   if(phase==='pickStart'&&hits(event,selected))return markerPoint(selected);
   if((phase==='pickEnd'||phase==='pending')&&hits(event,subsolar))return markerPoint(subsolar);
   return null;
  },
  trace(){
   const arc=scene.measureArc(),cam=scene.camera();
   let d='',length=0,prev=null;
   for(let i=0;i<=36;i++){
    const lat=arc.selLat+(arc.subLat-arc.selLat)*i/36;
    const p=scene.projectLatLon(lat,arc.selLon);
    if(!p.visible){prev=null;continue;}
    const point={x:cam.centre.x+p.normal[0]*cam.radius,y:cam.centre.y-p.normal[1]*cam.radius};
    d+=`${prev?'L':'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)} `;
    if(prev)length+=Math.hypot(point.x-prev.x,point.y-prev.y);
    prev=point;
   }
   return {d,length};
  },
  format(){return {value:meridianKm(),unit:'km',decimal:0};},
  onPhase(next){
   if(applyingPhase)return;
   applyingPhase=true;
   if(next==='scanning'){distance=null;clearResult();q('.formula-tip').textContent=prompt;}
   if(next==='done'){distance=meridianKm();q('.formula-tip').textContent='已沿经线连接观测点和太阳直射点。';}
   update();
   applyingPhase=false;
  }
 });
 window.addEventListener('pagehide',event=>{if(!event.persisted)measure.destroy();});
 q('[data-angle]').addEventListener('click',()=>{scene.stage.dataset.formulaFocus='theta';q('[data-angle]').classList.add('is-active');q('#meridian-distance').classList.remove('is-active');window.dispatchEvent(new Event('show-angle'));});
 q('#meridian-distance').addEventListener('click',()=>{
  scene.stage.dataset.formulaFocus='d';
  q('#meridian-distance').classList.add('is-active');
  q('[data-angle]').classList.remove('is-active');
  measure.enter();
 });
 q('[data-calculate]').addEventListener('click',()=>{
  const angle=thetaOf(scene.measurements.snapshot().selected);if(distance===null||!(angle>0))return;
  q('.calculation-substitution').textContent=`360° ÷ ${angle.toFixed(2)}° × ${distance.toFixed(0)} km`;
  q('.calculation-result').textContent=`≈ ${(360/angle*distance).toFixed(0)} km`;
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches)q('.calculation-result').animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:350,easing:'ease-out'});
  complete=true;scene.stage.dataset.calculationComplete=String(complete);window.dispatchEvent(new Event('calculation-progress'));
 });
 for(const event of ['globe-frame','globe-mode-change','measurement-change'])window.addEventListener(event,update);
 update();
}

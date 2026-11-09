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
 let distance=null,draft=null,placeKey='',measureKey='',picking=false,complete=false;
 const q=s=>panel.querySelector(s);
 const track=document.createElementNS('http://www.w3.org/2000/svg','svg');
 track.setAttribute('viewBox','0 0 1600 900');track.classList.add('meridian-distance-track');
 track.innerHTML='<path class="distance-arc"/><circle class="distance-end" r="8"/>';
 scene.stage.append(track);
 const thetaOf=record=>record.saved?Math.atan(record.value/scene.calibration.rod)*180/Math.PI:null;
 function clearResult(){complete=false;scene.stage.dataset.calculationComplete='false';q('.calculation-result').textContent='';q('.calculation-substitution').textContent='';}
 function clearDistance(){distance=null;draft=null;picking=false;scene.stage.classList.remove('picking-distance');q('[data-confirm-distance]').hidden=true;clearResult();}
 function paintTrack(){
  const arc=scene.measureArc();
  const path=track.querySelector('.distance-arc'),end=track.querySelector('.distance-end');
  const show=scene.calculating&&picking&&draft!==null&&arc;
  track.hidden=!show;
  if(!show)return;
  const cam=scene.camera();
  const samples=Array.from({length:25},(_,i)=>{
   const lat=arc.selLat+(draft-arc.selLat)*i/24;
   const p=scene.projectLatLon(lat,arc.selLon);
   return {x:cam.centre.x+p.normal[0]*cam.radius,y:cam.centre.y-p.normal[1]*cam.radius,visible:p.visible};
  }).filter(p=>p.visible);
  path.setAttribute('d',samples.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' '));
  const tip=samples.at(-1);
  if(!tip){end.setAttribute('cx',-20);return;}
  end.setAttribute('cx',tip.x);end.setAttribute('cy',tip.y);
 }
 function update(){
  panel.hidden=!scene.calculating;
  const arc=scene.measureArc(),record=scene.measurements.snapshot();
  const nextPlace=JSON.stringify([scene.observationDate,arc.selLat,arc.selLon,arc.subLat]);
  const nextMeasure=JSON.stringify([record.selected,scene.calibration.rod]);
  if(nextPlace!==placeKey){placeKey=nextPlace;clearDistance();}
  if(nextMeasure!==measureKey){measureKey=nextMeasure;clearResult();}
  const theta=thetaOf(record.selected);
  q('[data-angle] strong').textContent=theta===null?'—':`${theta.toFixed(2)}°`;
  q('#meridian-distance strong').textContent=distance===null?(draft===null?'沿经线测距':`${(Math.abs(draft-arc.selLat)*Math.PI/180*arc.radiusKm).toFixed(0)} km`):`${distance.toFixed(0)} km`;
  q('[data-calculate]').disabled=distance===null||!(theta>0);
  q('[data-confirm-distance]').hidden=!(picking&&draft!==null);
  if(scene.calculating&&theta!==null&&theta<=1e-6)q('.formula-tip').textContent='杆影角为 0，无法计算周长。';
  if(!scene.calculating){picking=false;scene.stage.classList.remove('picking-distance');}
  paintTrack();
 }
 q('[data-angle]').addEventListener('click',()=>{scene.stage.dataset.formulaFocus='theta';q('[data-angle]').classList.add('is-active');q('#meridian-distance').classList.remove('is-active');window.dispatchEvent(new Event('show-angle'));});
 q('#meridian-distance').addEventListener('click',()=>{
  picking=true;draft=scene.measureArc().selLat;scene.stage.classList.add('picking-distance');scene.stage.dataset.formulaFocus='d';
  q('#meridian-distance').classList.add('is-active');q('[data-angle]').classList.remove('is-active');
  q('.formula-tip').textContent='按住地球，沿经线拖到太阳直射纬度，松开后确认距离。';
  update();
 });
 let dragging=false;
 function placeDraft(event){
  const hit=scene.pointerLatLon(event.clientX,event.clientY);
  if(!hit)return;
  const arc=scene.measureArc();
  const lo=Math.min(arc.selLat,arc.subLat),hi=Math.max(arc.selLat,arc.subLat);
  let lat=Math.min(hi,Math.max(lo,hit.lat));
  if(Math.abs(lat-arc.subLat)<2)lat=arc.subLat;
  draft=lat;update();
 }
 scene.canvas.addEventListener('pointerdown',event=>{
  if(!scene.calculating||!picking)return;
  dragging=true;scene.canvas.setPointerCapture(event.pointerId);placeDraft(event);
 });
 scene.canvas.addEventListener('pointermove',event=>{if(dragging)placeDraft(event);});
 scene.canvas.addEventListener('pointerup',()=>{dragging=false;});
 scene.canvas.addEventListener('pointercancel',()=>{dragging=false;});
 q('[data-confirm-distance]').addEventListener('click',()=>{
  const arc=scene.measureArc();if(draft===null)return;
  distance=Math.abs(draft-arc.selLat)*Math.PI/180*arc.radiusKm;
  picking=false;complete=false;scene.stage.dataset.calculationComplete='false';scene.stage.classList.remove('picking-distance');
  q('.formula-tip').textContent=Math.abs(draft-arc.subLat)<0.05?'已量到同经参考点。':'端点还没到同经参考点，这是当前拖动位置的距离。';
  q('.calculation-result').textContent='';q('.calculation-substitution').textContent='';update();
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

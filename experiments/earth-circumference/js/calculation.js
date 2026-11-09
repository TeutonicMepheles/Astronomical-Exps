export function mountCalculation(scene){
 const panel=document.createElement('section');panel.className='calculation-panel simple-calculation';panel.hidden=true;
 panel.innerHTML=`<h2>计算地球周长</h2>
 <div class="calculation-evidence"><button type="button" data-angle><span>杆影角 θ</span><strong>—</strong></button><button type="button" id="meridian-distance"><span>同经线距离 d</span><strong>点选距离</strong></button></div>
 <div class="circumference-formula">地球周长 ≈ 360° ÷ 杆影角 × 同经线距离</div>
 <div class="calculation-substitution"></div><button type="button" data-calculate>计算地球周长</button>
 <output class="calculation-result" aria-live="polite"></output><p class="formula-tip" role="status"></p>
 <small>角度由当前地点与日期计算；距离使用模拟地球模型。</small>`;
 scene.stage.append(panel);
 let distance=null,key='',picking=false,complete=false;
 const q=s=>panel.querySelector(s);
 function invalidate(){distance=null;complete=false;picking=false;scene.stage.classList.remove('picking-distance');scene.stage.dataset.calculationComplete='false';q('.calculation-result').textContent='';q('.calculation-substitution').textContent='';q('.formula-tip').textContent='';}
 function update(){
  panel.hidden=!scene.calculating;
  const arc=scene.measureArc(),record=scene.measurements.snapshot();
  const next=JSON.stringify([scene.observationDate,arc.selLat,arc.selLon,arc.subLat,record.selected]);
  if(next!==key){key=next;invalidate();}
  q('[data-angle] strong').textContent=`${arc.deltaDeg.toFixed(2)}°`;
  q('#meridian-distance strong').textContent=distance===null?'点选距离':`${distance.toFixed(2)} km`;
  q('[data-calculate]').disabled=distance===null||arc.deltaDeg<=1e-6||!record.selected.saved;
  if(scene.calculating&&arc.deltaDeg<=1e-6)q('.formula-tip').textContent='杆影角为0，无法计算周长，请返回重新选点。';
  if(!scene.calculating){picking=false;scene.stage.classList.remove('picking-distance');}
 }
 q('[data-angle]').addEventListener('click',()=>{scene.stage.dataset.formulaFocus='theta';q('[data-angle]').classList.add('is-active');q('#meridian-distance').classList.remove('is-active');window.dispatchEvent(new Event('show-angle'));});
 q('#meridian-distance').addEventListener('click',()=>{
  picking=true;scene.stage.classList.add('picking-distance');scene.stage.dataset.formulaFocus='d';
  q('#meridian-distance').classList.add('is-active');q('[data-angle]').classList.remove('is-active');
  q('.formula-tip').textContent='点击地球上的太阳直射点，读取同经线模拟距离。';
 });
 document.querySelector('.geo-subsolar').addEventListener('click',()=>{
  if(!scene.calculating||!picking)return;
  distance=scene.measureArc().km;picking=false;complete=false;scene.stage.dataset.calculationComplete='false';scene.stage.classList.remove('picking-distance');
  q('.formula-tip').textContent='';q('.calculation-result').textContent='';q('.calculation-substitution').textContent='';update();
 });
 q('[data-calculate]').addEventListener('click',()=>{
  const angle=scene.measureArc().deltaDeg;if(distance===null||angle<=1e-6)return;
  q('.calculation-substitution').textContent=`360° ÷ ${angle.toFixed(2)}° × ${distance.toFixed(2)} km`;
  q('.calculation-result').textContent=`≈ ${(360/angle*distance).toFixed(2)} km`;
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches)q('.calculation-result').animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:350,easing:'ease-out'});
  complete=true;scene.stage.dataset.calculationComplete=String(complete);window.dispatchEvent(new Event('calculation-progress'));
 });
 for(const event of ['globe-frame','globe-mode-change','measurement-change'])window.addEventListener(event,update);
 update();
}

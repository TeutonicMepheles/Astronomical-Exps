import { mountShadowMeasurement } from './shadow-measurement.js';
export function mountObservation(scene){
 const panel=document.createElement('section');panel.className='observation-panel';panel.hidden=true;
 panel.innerHTML=`<div class="observation-tabs"><button data-site="selected" aria-selected="true">◎ 观测点</button><button data-site="subsolar" aria-selected="false">☀ 太阳直射点</button></div>
 <div class="observation-viewport style-soft"><svg class="site-scene" viewBox="0 0 660 400" role="group" aria-label="实景影长测量">
 <image id="site-background" href="./assets/scene-dry.png" width="660" height="400" preserveAspectRatio="xMidYMax slice"/>
 <path id="site-shadow" stroke="#282b36" stroke-width="12" stroke-linecap="butt" opacity=".85"/>
 <image id="site-pole" href="./assets/scene-pole.png" preserveAspectRatio="none"/>
 <g class="measurement-explanation"><path id="site-ray" stroke="#fff4c8" stroke-width="3" stroke-dasharray="8 4" fill="none"/>
 <circle id="site-sun" r="19" fill="#fff1b7"/>
 <path id="altitude-arc" stroke="#fff4ca" stroke-width="3" fill="none"/>
 <text id="altitude-label" class="local-label"/><text id="shadow-result" class="local-label"/></g><text id="rod-label" class="local-label">100 cm</text>
 <circle cx="330" cy="355" r="4" fill="#fff4cb"/></svg><div class="subsolar-zero-note" hidden>太阳直射点：正午影长为0</div>
 <div class="site-measurement-results" role="status" aria-live="polite" hidden>
  <div><span>影长 s</span><strong data-result-shadow>—</strong></div>
  <div><span>太阳高度角 α</span><strong data-result-altitude>—</strong></div>
 </div></div>
 <div class="observation-footer"><div class="rod-length-control"><span>杆长 L</span><button type="button" data-rod-decrease aria-label="缩短杆长">−</button><input type="range" min="10" max="100" step="10" value="100" data-rod-range aria-label="杆长，10 到 100 厘米"><output data-rod-value>100 cm</output><button type="button" data-rod-increase aria-label="增长杆长">＋</button></div></div>`;
 const pin=document.createElementNS('http://www.w3.org/2000/svg','svg');
 pin.setAttribute('viewBox','0 0 1600 900');pin.setAttribute('aria-hidden','true');pin.classList.add('observation-pin');
 pin.innerHTML='<path/>';
 const localEvidence=document.createElement('aside');localEvidence.className='calculation-local-evidence';localEvidence.hidden=true;localEvidence.setAttribute('aria-label','观测点地面测量结果');
 localEvidence.innerHTML='<span>地面测量结果</span><div><small>杆长 L</small><strong data-evidence-rod>—</strong></div><div><small>影长 s</small><strong data-evidence-shadow>—</strong></div><div><small>太阳高度角 α</small><strong data-evidence-altitude>—</strong></div>';
 scene.stage.append(pin,panel,localEvidence);const q=s=>panel.querySelector(s);
 function updatePin(){
  const target=selected==='selected'?scene.measureArc().sel:scene.camera().subsolar;
  const stageRect=scene.stage.getBoundingClientRect(),rect=panel.getBoundingClientRect(),scale=stageRect.width/1600;
  const left=(rect.left-stageRect.left)/scale,top=(rect.top-stageRect.top)/scale,bottom=(rect.bottom-stageRect.top)/scale;
  const anchor=Math.max(top+80,Math.min(bottom-55,target.y));
  pin.firstElementChild.setAttribute('d',`M${left+1} ${anchor-28} L${target.x} ${target.y} L${left+1} ${anchor+28} Z`);
 }
 const measurement=mountShadowMeasurement(panel);scene.measurements=measurement;scene.calibration={rod:100,ground:100};
 function setRodLength(value){
  const next=Math.max(10,Math.min(100,Math.round(Number(value)/10)*10));
  if(next===scene.calibration.rod)return;
  scene.calibration.rod=next;
  q('[data-rod-range]').value=String(next);
  q('[data-rod-value]').textContent=`${next} cm`;
  q('[data-rod-decrease]').disabled=next<=10;
  q('[data-rod-increase]').disabled=next>=100;
  measurement.clearSelected();
  update();
 }
 let selected='selected',openingAnimation=null;
 function paintEvidence(){
  const saved=measurement.snapshot().selected;
  const evidence=saved.saved?{rod:scene.calibration.rod,shadow:saved.value,altitude:Math.atan2(scene.calibration.rod,saved.value)*180/Math.PI}:null;
  const sceneResults=q('.site-measurement-results');
  sceneResults.hidden=true;
  if(evidence){
   q('[data-result-shadow]').textContent=`${evidence.shadow.toFixed(1)} cm`;
   q('[data-result-altitude]').textContent=`${evidence.altitude.toFixed(1)}°`;
   localEvidence.querySelector('[data-evidence-rod]').textContent=`${evidence.rod.toFixed(0)} cm`;
   localEvidence.querySelector('[data-evidence-shadow]').textContent=`${evidence.shadow.toFixed(1)} cm`;
   localEvidence.querySelector('[data-evidence-altitude]').textContent=`${evidence.altitude.toFixed(1)}°`;
  }
  localEvidence.hidden=true;
 }
 function update(){
 const visible=scene.measuring&&!scene.calculating;
 panel.hidden=false;panel.inert=!visible;panel.setAttribute('aria-hidden',String(!visible));
 paintEvidence();
 if(!visible){measurement.suspend();return;}
 updatePin();
 q('.subsolar-zero-note').hidden=selected!=='subsolar';
 q('.rod-length-control').hidden=selected!=='selected';
 const a=scene.measureArc(),lat=selected==='selected'?a.selLat:a.subLat;
 const delta=Math.abs(lat-a.subLat),alt=90-delta,day=alt>0;
 const ratio=day?Math.tan(delta*Math.PI/180):0;
 const direction=lat>=a.subLat?1:-1;
 const rod=scene.calibration.rod;
 const pxPerCm=150/rod;
 const h=rod*pxPerCm,s=h*ratio,tip=330+direction*s,top=355-h;
 const saved=measurement.snapshot().selected;
 const measured=selected==='selected'&&saved.saved&&day;
 const measuredShadow=measured?saved.value*pxPerCm:s;
 const measuredTip=330+direction*(measured?saved.value*pxPerCm:s);
 const shownAltitude=measured?Math.atan2(rod,saved.value)*180/Math.PI:alt;
 panel.classList.toggle('has-shadow-result',measured);
 const art=q('.site-scene');
 art.classList.toggle('is-revealed',measured);
 const rayLength=Math.hypot(measuredShadow,h)||1;
 const sx=330-direction*measuredShadow/rayLength*110,sy=top-h/rayLength*110;
 q('#site-background').setAttribute('href',selected==='selected'?'./assets/scene-open.png':'./assets/scene-dry.png');
 const pole=q('#site-pole'),w=h*71/794;pole.setAttribute('x',330-w/2);pole.setAttribute('y',top);pole.setAttribute('width',w);pole.setAttribute('height',h);
 q('#rod-label').textContent=`${rod.toFixed(0)} cm`;
 q('#site-shadow').setAttribute('stroke-width',Math.max(2,w*.72));
 q('#rod-label').setAttribute('x','348');q('#rod-label').setAttribute('y',(355+top)/2);
 q('#site-shadow').style.visibility=day?'visible':'hidden';
 q('#site-shadow').setAttribute('d',day?`M330 355H${tip}`:'');
 q('#site-ray').setAttribute('pathLength','1');
 q('#site-ray').setAttribute('d',measured?`M${sx} ${sy}L${measuredTip} 355`:'');
 q('#site-sun').setAttribute('cx',sx);q('#site-sun').setAttribute('cy',sy);
 const start=direction>0?-Math.PI:0,end=Math.atan2(-h,-direction*measuredShadow);
 let span=end-start;if(span>Math.PI)span-=2*Math.PI;if(span< -Math.PI)span+=2*Math.PI;
 const r=Math.max(22,Math.min(48,h*.45));
 const path=measured?Array.from({length:25},(_,i)=>{const t=start+span*i/24;return `${i?'L':'M'}${measuredTip+Math.cos(t)*r} ${355+Math.sin(t)*r}`;}).join(' '):'';
 q('#altitude-arc').setAttribute('pathLength','1');
 q('#altitude-arc').setAttribute('d',path);
 const altitudeX=measuredTip+Math.cos(start+span*.5)*(r+26);
 const altitudeY=355+Math.sin(start+span*.5)*(r+26);
 q('#altitude-label').setAttribute('x',altitudeX);q('#altitude-label').setAttribute('y',altitudeY);q('#altitude-label').textContent=measured?`${shownAltitude.toFixed(1)}°`:'';
 const shadowLabelX=(330+measuredTip)/2,shadowLabelY=372;
 q('#shadow-result').setAttribute('x',shadowLabelX);q('#shadow-result').setAttribute('y',shadowLabelY);q('#shadow-result').textContent=measured?`${saved.value.toFixed(1)} cm`:'';
 if(measured){
  const xs=[330-w/2,330+w/2,tip,measuredTip,altitudeX,shadowLabelX,348];
  const ys=[top,355,altitudeY,shadowLabelY,sy];
  const minX=Math.min(...xs)-40,maxX=Math.max(...xs)+40,minY=Math.min(...ys)-28,maxY=Math.max(...ys)+22;
  const zoom=Math.min(2.15,660/Math.max(1,maxX-minX),400/Math.max(1,maxY-minY));
  let tx=330-((minX+maxX)/2)*zoom,ty=200-((minY+maxY)/2)*zoom;
  const left=minX*zoom+tx,right=maxX*zoom+tx,topEdge=minY*zoom+ty,bottom=maxY*zoom+ty;
  if(left<12)tx+=12-left;
  if(right>648)tx-=right-648;
  if(topEdge<12)ty+=12-topEdge;
  if(bottom>388)ty-=bottom-388;
  art.style.transform=`translate(${tx/660*100}%,${ty/400*100}%) scale(${zoom})`;
 }else art.style.transform='none';
 q('.site-scene').dataset.altitude=alt;q('.site-scene').dataset.shadowTip=tip;q('.site-scene').dataset.pxPerCm=pxPerCm;
 paintEvidence();
 measurement.setContext({site:selected,key:[a.selLat,a.selLon,a.subLat,scene.phase,scene.observationDate,rod].join(','),pxPerCm,direction,canMeasure:day,reason:'太阳在地平线以下，暂无日照杆影'});
 }
 panel.querySelectorAll('[data-site]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.site;panel.querySelectorAll('[data-site]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));update();}));
 q('[data-rod-range]').addEventListener('input',event=>setRodLength(event.target.value));
 q('[data-rod-decrease]').addEventListener('click',()=>setRodLength(scene.calibration.rod-10));
 q('[data-rod-increase]').addEventListener('click',()=>setRodLength(scene.calibration.rod+10));
 q('[data-rod-decrease]').disabled=scene.calibration.rod<=10;
 q('[data-rod-increase]').disabled=scene.calibration.rod>=100;
 window.addEventListener('open-observation',event=>{
  selected=event.detail?.site==='subsolar'?'subsolar':'selected';
  panel.querySelectorAll('[data-site]').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.site===selected)));
  openingAnimation?.cancel();
  scene.enterMeasure();update();
  const origin=event.detail?.origin;
  if(origin&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
   const rect=scene.stage.getBoundingClientRect(),scale=rect.width/1600;
   const x=(origin.left-rect.left)/scale-panel.offsetLeft,y=(origin.top-rect.top)/scale-panel.offsetTop;
   openingAnimation=panel.animate([
    {transformOrigin:'0 0',transform:`translate(${x}px,${y}px) scale(${origin.width/scale/panel.offsetWidth},${origin.height/scale/panel.offsetHeight})`,opacity:1},
    {transformOrigin:'0 0',transform:'translate(0,0) scale(1,1)',opacity:1}
   ],{duration:900,easing:'cubic-bezier(.22,.68,.2,1)'});
  }
 });
 window.addEventListener('measurement-change',update);window.addEventListener('globe-frame',update);window.addEventListener('globe-mode-change',update);update();
}

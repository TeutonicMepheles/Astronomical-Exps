import { mountShadowMeasurement } from './shadow-measurement.js';
export function mountObservation(scene){
 const panel=document.createElement('section');panel.className='observation-panel';panel.hidden=true;
 panel.innerHTML=`<h2 class="observation-heading">观测杆与阳光夹角</h2>
 <div class="observation-viewport style-soft"><svg class="site-scene" viewBox="0 0 660 400" role="group" aria-label="正午杆与阳光夹角">
 <defs><clipPath id="site-light-clip"><rect x="0" y="0" width="660" height="400"/></clipPath></defs>
 <image id="site-background" href="./assets/scene-dry.png" width="660" height="400" preserveAspectRatio="xMidYMax slice"/>
 <g id="site-solar-rays" clip-path="url(#site-light-clip)" aria-hidden="true">${Array.from({length:19},()=>'<path class="site-solar-ray"/>').join('')}</g>
 <g id="site-geometry"><path id="site-shadow" stroke="#282b36" stroke-width="12" stroke-linecap="butt" opacity=".85"/>
 <image id="site-pole" href="./assets/scene-pole.png" preserveAspectRatio="none"/>
 <g class="measurement-explanation"><path id="site-ray" stroke="#fff4c8" stroke-width="3" stroke-dasharray="8 4" fill="none"/>
 <circle id="site-sun" r="19" fill="#fff1b7"/>
 <path id="altitude-arc" stroke="#fff4ca" stroke-width="3" fill="none"/>
 <text id="altitude-label" class="local-label"/><text id="shadow-result" class="local-label"/></g><text id="rod-label" class="local-label">100 cm</text>
 <circle cx="330" cy="355" r="4" fill="#fff4cb"/></g></svg><div class="subsolar-zero-note" hidden>太阳直射点：正午影长为0</div>
 <div class="measure-entry-hint" role="note"><span>点击右上角尺子</span><b>开始测量影长</b></div></div>
 <div class="observation-footer"><div class="rod-length-control"><span>杆长 L</span><button type="button" data-rod-decrease aria-label="缩短杆长">−</button><input type="range" min="10" max="100" step="10" value="100" data-rod-range aria-label="杆长，10 到 100 厘米"><output data-rod-value>100 cm</output><button type="button" data-rod-increase aria-label="增长杆长">＋</button></div></div>`;
 const pin=document.createElementNS('http://www.w3.org/2000/svg','svg');
 pin.setAttribute('viewBox','0 0 1600 900');pin.setAttribute('aria-hidden','true');pin.classList.add('observation-pin');
 pin.innerHTML='<path/>';
 const globeRod=document.createElementNS('http://www.w3.org/2000/svg','svg');
 globeRod.classList.add('observation-globe-rod');
 globeRod.setAttribute('viewBox','0 0 1600 900');
 globeRod.setAttribute('aria-hidden','true');
 globeRod.innerHTML='<path class="observation-rod-shadow"/><path class="observation-rod-ray"/><path class="observation-rod-stem"/><path class="observation-rod-angle"/>';
 const [globeShadow,globeRay,globeStem,globeAngle]=globeRod.children;
 scene.stage.append(pin,globeRod,panel);
 const q=s=>panel.querySelector(s);
 function paintGlobeRod(visible,arc,latitude,theta){
  globeRod.style.display=visible?'':'none';
  if(!visible)return 1;
  const cam=scene.camera();
  const point=scene.projectLatLon(latitude,arc.selLon);
  const [nx,ny]=point.normal;
  const sun=scene.sun;
  const cosine=point.normal.reduce((sum,component,i)=>sum+component*sun[i],0);
  // Project the tangent component pointing away from the sun.
  const dx=nx*cosine-sun[0],dy=ny*cosine-sun[1];
  const direction=Math.sign(dx)||1;
  const baseX=cam.centre.x+nx*cam.radius,baseY=cam.centre.y-ny*cam.radius;
  const height=scene.calibration.rod*.58;
  const shadowScale=cosine>0?Math.min(height/cosine,120):0;
  globeRod.style.visibility=point.visible?'visible':'hidden';
  const tipX=baseX+nx*height,tipY=baseY-ny*height;
  globeStem.setAttribute('d','M'+baseX+' '+baseY+'L'+tipX+' '+tipY);
  globeShadow.setAttribute('d',shadowScale?
   'M'+baseX+' '+baseY+'l'+(dx*shadowScale)+' '+(-dy*shadowScale):'');
  const sunLength=Math.hypot(sun[0],sun[1]);
  const hasRay=theta<90&&cosine>0&&sunLength>1e-6;
  const rayX=-sun[0]/sunLength,rayY=sun[1]/sunLength;
  const rayLength=Math.max(34,height*1.15);
  globeRay.setAttribute('d',hasRay?
   'M'+(tipX-rayX*rayLength)+' '+(tipY-rayY*rayLength)+'L'+(tipX+rayX*rayLength*.76)+' '+(tipY+rayY*rayLength*.76):'');
  const rodLength=Math.hypot(nx,ny);
  const sweep=Math.atan2(-nx*rayY-ny*rayX,-nx*rayX+ny*rayY);
  const radius=Math.min(22,height*rodLength*.65);
  const hasAngle=hasRay&&theta>=.05&&Math.abs(sweep)>=.035&&radius>=4;
  globeAngle.setAttribute('d',hasAngle?
   'M'+(tipX-nx/rodLength*radius)+' '+(tipY+ny/rodLength*radius)+
   'A'+radius+' '+radius+' 0 0 '+Number(sweep>0)+' '+(tipX+rayX*radius)+' '+(tipY+rayY*radius):'');
  return direction;
 }
 const solarRayPaths=[...panel.querySelectorAll('.site-solar-ray')];
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
 let selected='selected',openingAnimation=null,revealKey='',revealAnimations=[],framingKey='';
 function paintSolarRays(altitude,direction,day){
  const group=q('#site-solar-rays');
  group.style.display=day?'':'none';
  const art=q('.site-scene');
  art.dataset.solarRayAltitude=day?altitude.toFixed(2):'';
  if(!day)return;
  const angle=altitude*Math.PI/180;
  const ux=direction*Math.cos(angle),uy=Math.sin(angle);
  const px=-uy,py=ux;
  const centre={x:330,y:195};
  const spacing=42,span=760;
  solarRayPaths.forEach((path,index)=>{
   const offset=(index-(solarRayPaths.length-1)/2)*spacing;
   const sx=centre.x-ux*span/2+px*offset,sy=centre.y-uy*span/2+py*offset;
   const ex=centre.x+ux*span/2+px*offset,ey=centre.y+uy*span/2+py*offset;
   path.setAttribute('d',`M${sx.toFixed(2)} ${sy.toFixed(2)}L${ex.toFixed(2)} ${ey.toFixed(2)}`);
  });
 }
 function update(){
 const visible=scene.measuring&&!scene.calculating;
 panel.hidden=false;panel.inert=!visible;panel.setAttribute('aria-hidden',String(!visible));
 if(!visible){
  if(scene.observationPreviewReady){
   const arc=scene.measureArc();
   paintGlobeRod(true,arc,arc.selLat,Math.abs(arc.selLat-arc.subLat));
  }else paintGlobeRod(false);
  measurement.suspend();return;
 }
 updatePin();
 panel.dataset.site=selected;
 q('.subsolar-zero-note').hidden=selected!=='subsolar';
 q('.rod-length-control').hidden=selected!=='selected';
 const a=scene.measureArc(),lat=selected==='selected'?a.selLat:a.subLat;
 const delta=Math.abs(lat-a.subLat),alt=90-delta,day=alt>0;
 const ratio=day?Math.tan(delta*Math.PI/180):0;
 const direction=selected==='selected'?paintGlobeRod(true,a,lat,delta):1;
 const rod=scene.calibration.rod;
 const pxPerCm=1.5;
 const h=rod*pxPerCm,s=h*ratio,tip=330+direction*s,top=355-h;
 const saved=measurement.snapshot().selected;
 const measured=selected==='selected'&&saved.saved&&day;
 const measuredShadow=measured?saved.value*pxPerCm:s;
 const measuredTip=330+direction*(measured?saved.value*pxPerCm:s);
 const shownAltitude=measured?Math.atan2(rod,saved.value)*180/Math.PI:alt;
 paintSolarRays(alt,direction,day);
 panel.classList.toggle('has-shadow-result',measured);
 const art=q('.site-scene');
 art.classList.toggle('is-revealed',measured);
 const rayLength=Math.hypot(measuredShadow,h)||1;
 const sx=330-direction*measuredShadow/rayLength*110,sy=top-h/rayLength*110;
 q('#site-background').setAttribute('href',selected==='selected'?'./assets/scene-open.png':'./assets/scene-dry.png');
 const pole=q('#site-pole'),w=h*71/794;pole.setAttribute('x',330-w/2);pole.setAttribute('y',top);pole.setAttribute('width',w);pole.setAttribute('height',h);
 q('#rod-label').textContent=`${rod.toFixed(0)} cm`;
 q('#site-shadow').setAttribute('stroke-width',Math.max(2,w*.72));
 q('#rod-label').setAttribute('x','265');q('#rod-label').setAttribute('y',(355+top)/2);
 q('#site-shadow').style.visibility=day?'visible':'hidden';
 q('#site-shadow').setAttribute('d',day?`M330 355H${tip}`:'');
 q('#site-ray').setAttribute('pathLength','1');
 q('#site-ray').setAttribute('d',measured?`M${sx} ${sy}L${measuredTip} 355`:'');
 q('#site-sun').setAttribute('cx',sx);q('#site-sun').setAttribute('cy',sy);
 const start=Math.PI/2,end=Math.atan2(h,direction*measuredShadow);
 const r=Math.max(22,Math.min(48,h*.45));
 const path=measured?Array.from({length:25},(_,i)=>{const t=start+(end-start)*i/24;return `${i?'L':'M'}${330+Math.cos(t)*r} ${top+Math.sin(t)*r}`;}).join(' '):'';
 q('#altitude-arc').setAttribute('pathLength','1');
 q('#altitude-arc').setAttribute('d',path);
 const altitudeX=330+Math.cos((start+end)/2)*(r+55)+20;
 const altitudeY=top+Math.sin((start+end)/2)*(r+35);
 q('#altitude-label').setAttribute('x',altitudeX);q('#altitude-label').setAttribute('y',altitudeY);q('#altitude-label').textContent=measured?`θ ${delta.toFixed(1)}°`:'';
 const nextReveal=[lat,a.subLat,rod,selected].join(',');
 if(measured&&nextReveal!==revealKey){
  revealKey=nextReveal;revealAnimations.forEach(animation=>animation.cancel());revealAnimations=[];
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
   revealAnimations.push(q('#altitude-arc').animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:600}));
   revealAnimations.push(q('#altitude-label').animate([{opacity:.2},{opacity:1}],{duration:600}));
  }
 }

 const shadowLabelX=(330+measuredTip)/2,shadowLabelY=372;
 q('#shadow-result').setAttribute('x',shadowLabelX);q('#shadow-result').setAttribute('y',shadowLabelY);q('#shadow-result').textContent=measured?`${saved.value.toFixed(1)} cm`:'';
 const geometry=q('#site-geometry');
 art.style.transform='none';
 const nextFraming=[lat,a.subLat,rod,selected,measured].join(',');
 if(nextFraming!==framingKey){
  framingKey=nextFraming;
  geometry.removeAttribute('transform');
  if(measured){
   // Frame the actual artwork and text, while the backdrop and parallel rays
   // remain fixed to the viewport. Never scale a finite background image.
   const bounds=geometry.getBBox();
   const margin=24;
   const zoom=Math.min(2.15,(660-2*margin)/Math.max(1,bounds.width),(400-2*margin)/Math.max(1,bounds.height));
   const tx=330-(bounds.x+bounds.width/2)*zoom;
   const ty=200-(bounds.y+bounds.height/2)*zoom;
   geometry.setAttribute('transform',`translate(${tx} ${ty}) scale(${zoom})`);
  }
 }
 q('.measure-entry-hint').hidden=day;
 q('.measure-entry-hint').textContent=day?'':'太阳在地平线以下，请返回选择有正午日照的位置';
 q('.site-scene').dataset.altitude=alt;q('.site-scene').dataset.shadowTip=tip;q('.site-scene').dataset.pxPerCm=pxPerCm;
 if(!visible||selected!=='selected')paintGlobeRod(false);
 measurement.setContext({site:selected,key:[a.selLat,a.selLon,a.subLat,scene.phase,scene.observationDate,rod].join(','),pxPerCm,direction,shadow:rod*Math.tan(Math.abs(a.selLat-a.subLat)*Math.PI/180),canMeasure:Math.abs(a.selLat-a.subLat)<90,reason:'太阳在地平线以下，暂无日照杆影'});
 }
 q('[data-rod-range]').addEventListener('input',event=>setRodLength(event.target.value));
 q('[data-rod-decrease]').addEventListener('click',()=>setRodLength(scene.calibration.rod-10));
 q('[data-rod-increase]').addEventListener('click',()=>setRodLength(scene.calibration.rod+10));
 q('[data-rod-decrease]').disabled=scene.calibration.rod<=10;
 q('[data-rod-increase]').disabled=scene.calibration.rod>=100;
 window.addEventListener('open-observation',event=>{
  selected=event.detail?.site==='subsolar'?'subsolar':'selected';
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
 document.querySelector('.geo-subsolar')?.addEventListener('click',event=>{
  if(!scene.stage.classList.contains('has-selection')||scene.stage.classList.contains('aligning-point')||scene.calculating)return;
  if(!scene.measuring&&!scene.stage.classList.contains('at-local-noon'))return;
  event.stopPropagation();
  window.dispatchEvent(new CustomEvent('open-observation',{detail:{site:'subsolar',origin:event.currentTarget.getBoundingClientRect().toJSON()}}));
 });
 document.querySelector('.geo-selected')?.addEventListener('click',event=>{
  if(!scene.measuring||scene.calculating)return;
  event.stopPropagation();
  window.dispatchEvent(new CustomEvent('open-observation',{detail:{site:'selected',origin:event.currentTarget.getBoundingClientRect().toJSON()}}));
 });
 document.fonts.ready.then(()=>{framingKey='';update();});
 window.addEventListener('measurement-change',update);window.addEventListener('globe-frame',update);window.addEventListener('globe-mode-change',update);window.addEventListener('view-mode-change',update);update();
}

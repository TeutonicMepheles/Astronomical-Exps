import { mountShadowMeasurement } from './shadow-measurement.js';
export function mountObservation(scene){
 const panel=document.createElement('section');panel.className='observation-panel';panel.hidden=true;
 panel.innerHTML=`<div class="observation-tabs"><button data-site="selected" aria-selected="true">◎ 观测点</button><button data-site="subsolar" aria-selected="false">☀ 太阳直射点</button></div>
 <svg class="site-scene" viewBox="0 0 660 400" role="group" aria-label="点选影端测量厘米影长">
 <image id="site-background" href="./assets/scene-dry.png" width="660" height="400" preserveAspectRatio="xMidYMax slice"/>
 <path id="site-shadow" stroke="#282b36" stroke-width="12" stroke-linecap="butt" opacity=".85"/>
 <image id="site-pole" href="./assets/scene-pole.png" preserveAspectRatio="none"/>
 <path id="site-ray" stroke="#fff4c8" stroke-width="3" stroke-dasharray="8 4" fill="none"/>
 <circle id="site-sun" r="19" fill="#fff1b7"/>
 <path id="altitude-arc" stroke="#fff4ca" stroke-width="3" fill="none"/>
 <text id="altitude-label" class="local-label"/><text id="rod-label" class="local-label">100 cm</text>
 <circle cx="330" cy="355" r="4" fill="#fff4cb"/></svg>
 <div class="observation-footer"></div>`;
 scene.stage.append(panel);const q=s=>panel.querySelector(s);
 const measurement=mountShadowMeasurement(panel);scene.measurements=measurement;scene.calibration={rod:100,ground:100};
 let selected='selected';
 function update(){
 panel.hidden=!scene.measuring||scene.calculating;
 if(panel.hidden){measurement.suspend();return;}
 const a=scene.measureArc(),lat=selected==='selected'?a.selLat:a.subLat;
 const delta=Math.abs(lat-a.subLat),alt=90-delta,day=alt>0;
 const ratio=day?Math.tan(delta*Math.PI/180):0;
 const direction=lat>=a.subLat?1:-1;
 const pxPerCm=Math.min(1.75,270/Math.max(100*ratio,1));
 const h=100*pxPerCm,s=h*ratio,tip=330+direction*s,top=355-h;
 const rayLength=Math.hypot(s,h)||1;
 const sx=330-direction*s/rayLength*110,sy=top-h/rayLength*110;
 q('#site-background').setAttribute('href',selected==='selected'?'./assets/scene-open.png':'./assets/scene-dry.png');
 const pole=q('#site-pole'),w=h*71/794;pole.setAttribute('x',330-w/2);pole.setAttribute('y',top);pole.setAttribute('width',w);pole.setAttribute('height',h);
 q('#site-shadow').setAttribute('stroke-width',Math.max(2,w*.72));
 q('#rod-label').setAttribute('x','345');q('#rod-label').setAttribute('y',(355+top)/2);
 q('#site-shadow').setAttribute('d',`M330 355H${tip}`);
 q('#site-ray').setAttribute('d',`M${sx} ${sy}L${tip} 355`);
 q('#site-sun').setAttribute('cx',sx);q('#site-sun').setAttribute('cy',sy);
 const start=direction>0?-Math.PI:0,end=Math.atan2(-h,-direction*s);
 let span=end-start;if(span>Math.PI)span-=2*Math.PI;if(span< -Math.PI)span+=2*Math.PI;
 const r=Math.max(18,Math.min(42,h*.5));
 const path=Array.from({length:25},(_,i)=>{const t=start+span*i/24;return `${i?'L':'M'}${tip+Math.cos(t)*r} ${355+Math.sin(t)*r}`;}).join(' ');
 q('#altitude-arc').setAttribute('d',path);
 q('#altitude-label').setAttribute('x',tip+Math.cos(start+span*.5)*(r+23));q('#altitude-label').setAttribute('y',355+Math.sin(start+span*.5)*(r+23));q('#altitude-label').textContent=`${alt.toFixed(1)}°`;
 for(const id of ['#site-shadow','#site-ray','#site-sun','#altitude-arc','#altitude-label'])q(id).style.visibility=day?'visible':'hidden';
 q('.site-scene').dataset.altitude=alt;q('.site-scene').dataset.shadowTip=tip;q('.site-scene').dataset.pxPerCm=pxPerCm;
 measurement.setContext({site:selected,key:[a.selLat,a.selLon,a.subLat,scene.phase,scene.observationDate].join(','),pxPerCm,direction,canMeasure:day,reason:'太阳在地平线以下，暂无日照杆影'});
 }
 panel.querySelectorAll('[data-site]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.site;panel.querySelectorAll('[data-site]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));update();}));
 window.addEventListener('globe-frame',update);window.addEventListener('globe-mode-change',update);
}

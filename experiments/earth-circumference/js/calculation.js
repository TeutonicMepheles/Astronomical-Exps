import { AstroNameBubble } from '../components/astro-name-bubble.js';
export function mountCalculation(scene) {
 const panel=document.createElement('section');panel.className='calculation-panel formula-flow';panel.hidden=true;
 const variable=(id,label,name)=>`<button class="formula-var" data-var="${id}" data-name="${name}" aria-label="${name}">${label}</button>`;
 const L=()=>variable('L','L','杆长'),s=()=>variable('s','s','点选影长'),theta=()=>variable('theta','θ<sub>obs</sub>','杆影测量角'),delta=()=>variable('delta','Δφ','模型纬度差'),d=()=>variable('d','d','模拟经线距离');
 const blank=id=>`<button class="reveal" data-result="${id}" aria-label="揭示计算结果">□</button>`;
 panel.innerHTML=`<div class="formula-row">${theta()} = arctan <span class="fraction"><span>${s()}</span><span>${L()}</span></span> = ${blank('theta')}</div>
 <div class="flow-arrow">↓</div><div class="formula-row">${delta()} = | ${variable('phi','φ','观测点纬度')} − ${variable('sun','δ','直射点纬度')} | = ${blank('delta')}</div>
 <div class="formula-row relation">${theta()} ≈ ${delta()}</div><div class="flow-arrow">↓</div>
 <div class="formula-row warm">${variable('Cobs','C<sub>obs</sub>','测量角计算周长')} ≈ <span class="fraction"><span>360°</span><span>${theta()}</span></span> × ${d()} = ${blank('Cobs')}</div>
 <div class="formula-row cool">${variable('Cmodel','C<sub>model</sub>','模型角计算周长')} ≈ <span class="fraction"><span>360°</span><span>${delta()}</span></span> × ${d()} = ${blank('Cmodel')}</div>
 <div class="formula-tip" role="status"></div><button id="meridian-distance">点选经线距离 d</button><output class="distance-value"></output>
 <small>模拟数据 · 模型支路非独立验证</small>`;
 scene.stage.append(panel);
 const outline=document.createElementNS('http://www.w3.org/2000/svg','svg');outline.setAttribute('viewBox','0 0 1600 900');outline.classList.add('calculation-outline');outline.innerHTML='<circle class="outline-backing"/><circle class="outline-ink"/>';scene.stage.append(outline);

 const layer=document.createElementNS('http://www.w3.org/2000/svg','svg');layer.setAttribute('viewBox','0 0 1600 900');layer.classList.add('local-triangles');scene.stage.append(layer);
 const q=x=>panel.querySelector(x);let distance=null,measuringDistance=false,geometryKey=null,recordKey='',triangleKey='',active='',revealed=new Set();
 const bubble=new AstroNameBubble(), animations=new Map();
 const fmt=v=>Number.isFinite(v)?v.toFixed(2):'—';
 function data(){const r=scene.measurements.snapshot(),c=scene.calibration,a=scene.measureArc(),s=r.selected.saved?r.selected.value:null,s0=r.subsolar.saved?r.subsolar.value:null;return {r,c,a,s,s0,theta:s===null?null:Math.atan(s/c.rod)*180/Math.PI,d:distance};}
  function triangles(v) {
    const cam=scene.camera(), sun=scene.sun;
    const project=(n)=>({x:cam.centre.x+n[0]*cam.radius,y:cam.centre.y-n[1]*cam.radius});
    const line=(a,b,cls)=>`<path class="${cls}" d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;
    const text=(p,t)=>`<text class="${t.startsWith('s ')?'label-shadow':'label-rod'}" x="${p.x+12}" y="${p.y-12}">${t}</text>`;
    let content='';
    for(const [lat,label,s] of [[v.a.subLat,'直射点',v.s0],[v.a.selLat,'观测点',v.s]]) {
      const n=scene.projectLatLon(lat,v.a.selLon).normal;
      const dot=n.reduce((sum,x,i)=>sum+x*sun[i],0);
      const tangent=n.map((x,i)=>x-sun[i]/Math.max(dot,.001));
      const length=Math.hypot(...tangent);
      const nearby=scene.projectLatLon(Math.min(89.999,lat+.01),v.a.selLon).normal;
      const fallback=nearby.map((x,i)=>x-n[i]);
      const fallbackLength=Math.hypot(...fallback)||1;
      const dir=length>1e-5?tangent.map(x=>x/length):fallback.map(x=>x/fallbackLength);
      const ratio=s!==null && v.c.rod>0 ? s/v.c.rod : length;
      const rod=.17/Math.max(1,ratio/2.5);
      const shadow=rod*ratio;
      const base=project(n),top=project(n.map(x=>x*(1+rod)));
      const end=project(n.map((x,i)=>x+dir[i]*shadow));
      const groundA=project(n.map((x,i)=>x-dir[i]*.08));
      const groundB=project(n.map((x,i)=>x+dir[i]*(shadow+.08)));
      content+=line(groundA,groundB,'local-ground')+line(base,top,'local-rod')+line(base,end,'local-shadow')+line(top,end,'local-ray');
      const close=v.a.deltaDeg<10,offset=close?(label==='观测点'?130:-190):0;
      content+=text({x:top.x+offset,y:top.y},`${label} L ${v.c.rod>0?fmt(v.c.rod)+' cm':'待填'}`);
      content+=text({x:(base.x+end.x)/2+offset,y:(base.y+end.y)/2+42},`s ${s!==null?fmt(s)+' cm':'待测'}`);
      if(label==='观测点'&&(active==='theta'||revealed.has('theta'))){
        const down=n.map(x=>-x),ray=n.map((x,i)=>dir[i]*ratio-x),len=Math.hypot(...ray),unit=ray.map(x=>x/len);
        const angle=Math.acos(Math.max(-1,Math.min(1,down.reduce((a,x,i)=>a+x*unit[i],0))));
        const curve=Array.from({length:25},(_,i)=>{const t=i/24,sn=Math.sin(angle),u=angle<1e-7?down:down.map((x,k)=>(Math.sin((1-t)*angle)*x+Math.sin(t*angle)*unit[k])/sn);return project(n.map((x,k)=>x*(1+rod)+u[k]*rod*.7));});
        content+=`<g data-annotation="theta"><path class="variable-arc" d="${curve.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')}"/><text class="formula-annotation" x="${top.x+20}" y="${top.y+36}">θ<tspan baseline-shift="sub" font-size="13">obs</tspan> ${fmt(v.theta)}°</text></g>`;
      }
      if(length<1e-5) content+=`<circle cx="${base.x}" cy="${base.y}" r="5" class="zero-shadow"/>`;
    }
    const a=scene.measureArc();
    const mark=(id,p,label)=>`<g data-annotation="${id}"><text class="formula-annotation" x="${p.x}" y="${p.y}">${label}</text></g>`;
    content+=mark('phi',{x:a.sel.x+24,y:a.sel.y+25},`φ ${fmt(a.selLat)}°`);
    content+=mark('sun',{x:a.sub.x-125,y:a.sub.y+24},`δ ${fmt(a.subLat)}°`);
    const mid=a.pts[Math.floor(a.pts.length/2)];
    if(mid)content+=mark('d',{x:mid.x-135,y:mid.y+48},`d ${distance===null?'···':fmt(distance)+' km'}`);
    content+=`<g data-annotation="Cobs"><text class="formula-annotation" x="145" y="780">C<tspan baseline-shift="sub" font-size="13">obs</tspan></text></g><g data-annotation="Cmodel"><text class="formula-annotation" x="145" y="815">C<tspan baseline-shift="sub" font-size="13">model</tspan></text></g>`;
    if(active==='Cobs'||active==='Cmodel'){
      const pts=Array.from({length:81},(_,i)=>{const t=-Math.PI*.95+i/80*Math.PI*1.8;return `${i?'L':'M'}${cam.centre.x+Math.cos(t)*cam.radius*.98} ${cam.centre.y+Math.sin(t)*cam.radius*.98}`;}).join(' ');
      content+=`<g data-annotation="${active}"><path class="variable-arc" d="${pts}"/></g>`;
    }
    layer.innerHTML=content;
  }
 function highlight(){scene.stage.dataset.formulaFocus=active;layer.querySelectorAll('[data-annotation]').forEach(g=>g.classList.toggle('active',g.dataset.annotation===active));panel.querySelectorAll('[data-var]').forEach(b=>b.classList.toggle('active',b.dataset.var===active));}
 function update(){
  const view=scene.camera();outline.style.opacity=String(view.gridOnly||0);
  outline.querySelectorAll('circle').forEach(c=>{c.setAttribute('cx',view.centre.x);c.setAttribute('cy',view.centre.y);c.setAttribute('r',view.radius);});

  panel.hidden=!scene.calculating;layer.style.display=scene.calculating?'block':'none';
  const v=data(),g=[v.a.selLat,v.a.selLon,v.a.subLat,scene.phase,scene.observationDate].join(',');
  if(geometryKey!==null&&geometryKey!==g){distance=null;clearReveals();measuringDistance=false;scene.stage.classList.remove('picking-distance');}geometryKey=g;
  const key=JSON.stringify([v.r,v.c,distance,g]);if(recordKey!==key){clearReveals();recordKey=key;}
  if(!scene.calculating){active='';bubble.hide();clearReveals();highlight();return;}
  const values={theta:v.theta,delta:v.a.deltaDeg,Cobs:v.theta>0&&distance>0?360/v.theta*distance:null,Cmodel:v.a.deltaDeg>1e-6&&distance>0?360/v.a.deltaDeg*distance:null};
  panel.querySelectorAll('[data-result]').forEach(b=>{const id=b.dataset.result;if(!animations.has(id)&&!revealed.has(id))b.textContent='\u25a1';});
  q('.distance-value').textContent=distance===null?'':` d = ${fmt(distance)} km`;
  const cam=scene.camera(),tk=JSON.stringify([key,cam.centre,cam.radius,cam.roll,active,[...revealed]]);if(tk!==triangleKey){triangles(v);triangleKey=tk;}
  highlight();
 }
 function clearReveals(){scene.stage.dataset.calculationComplete='false';for(const anim of animations.values())anim.cancel();animations.clear();revealed.clear();}
 function selectVariable(b){active=b.dataset.var;const v=data(),val={L:'100 cm',s:fmt(v.s)+' cm',theta:fmt(v.theta)+'°',delta:fmt(v.a.deltaDeg)+'°',phi:fmt(v.a.selLat)+'°',sun:fmt(v.a.subLat)+'°',d:fmt(distance)+' km'};
  bubble.show({target:b,text:b.dataset.name+(val[active]?'\n'+val[active]:'')});
  if(active==='delta')window.dispatchEvent(new Event('show-angle'));
  update();
 }
 function reveal(id,b,v){
  if(revealed.has(id)||animations.has(id))return;
  const value={theta:v.theta,delta:v.a.deltaDeg,Cobs:360/v.theta*distance,Cmodel:360/v.a.deltaDeg*distance}[id];
  const span=document.createElement('span');span.className='reveal-value';span.textContent=fmt(value)+(id.startsWith('C')?' km':'°');b.replaceChildren(span);
  const anim=span.animate([{opacity:0,clipPath:'inset(0 100% 0 0)',transform:'translateY(6px)'},{opacity:1,clipPath:'inset(0 0 0 0)',transform:'translateY(0)'}],{duration:matchMedia('(prefers-reduced-motion:reduce)').matches?1:900,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'});
  animations.set(id,anim);revealed.add(id);
  if(id==='delta')window.dispatchEvent(new Event('show-angle'));
  anim.onfinish=()=>{animations.delete(id);anim.cancel();scene.stage.dataset.calculationComplete=String(revealed.has('Cobs')&&revealed.has('Cmodel')&&!animations.has('Cobs')&&!animations.has('Cmodel'));window.dispatchEvent(new Event('calculation-progress'));};
 }
 panel.addEventListener('pointerover',e=>{const b=e.target.closest('[data-var]');if(b&&!b.contains(e.relatedTarget))selectVariable(b);});
 panel.addEventListener('pointerout',e=>{const b=e.target.closest('[data-var]');if(b&&!b.contains(e.relatedTarget))bubble.hide();});
 panel.addEventListener('focusin',e=>{const b=e.target.closest('[data-var]');if(b)selectVariable(b);});
 panel.addEventListener('focusout',()=>bubble.hide());
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){bubble.hide();active='';update();}});
 panel.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const v=data();
  if(b.dataset.var)selectVariable(b);
  if(b.dataset.result){const id=b.dataset.result;
   if((id==='theta'||id==='Cobs')&&v.s===null){q('.formula-tip').textContent='请返回观测，点选影端记录影长';return;}
   if(id.startsWith('C')&&!(distance>0)){q('.formula-tip').textContent='请点选经线距离 d，再点击地球直射点';return;}
   if((id==='Cobs'&&!(v.theta>0))||(id==='Cmodel'&&!(v.a.deltaDeg>1e-6))){q('.formula-tip').textContent='零角度无法计算周长，请返回重新选点';return;}
   reveal(id,b,v);update();
  }
 });
 q('#meridian-distance').addEventListener('click',()=>{measuringDistance=true;scene.stage.classList.add('picking-distance');active='d';q('.formula-tip').textContent='点击球面太阳直射点，记录同经线距离';highlight();});
 document.querySelector('.geo-subsolar').addEventListener('click',()=>{if(!scene.calculating||!measuringDistance)return;distance=scene.measureArc().km;measuringDistance=false;scene.stage.classList.remove('picking-distance');q('.formula-tip').textContent='';update();});
 window.addEventListener('globe-frame',update);window.addEventListener('globe-mode-change',update);window.addEventListener('measurement-change',update);
}


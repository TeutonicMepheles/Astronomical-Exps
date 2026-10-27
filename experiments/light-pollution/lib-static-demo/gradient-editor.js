/* Spatial gradient editing uses the starfield's public API and shared scene history. */
window.createGradientEditor=function({canvas,W,H,getView,getEditor,compose}){
 const $=id=>document.getElementById(id),sky=window.compositorSky,copy=x=>JSON.parse(JSON.stringify(x));
 const panel=$('gradient-panel'),overlay=$('gradient-overlay');let tab=false,selected='s0',gesture=null,pending=null;
 const defaults=()=>({version:1,start:[.5,0],end:[.5,1],curve:[1/3,1/3,2/3,2/3],stops:[{id:'s0',position:0,color:sky.getSettings().topColor},{id:'s1',position:1,color:sky.getSettings().bottomColor}]});
 const data=()=>sky.getSettings().gradient,working=()=>data()||defaults();
 const active=()=>tab&&!!getEditor()?.active;
 function setData(value){sky.update({gradient:PollutionStarfield.validateGradient(value)});refresh();}
 function update(g){try{setData(g);compose();return true;}catch(e){$('gradient-note').textContent=e.message;return false;}}
 function change(fn){getEditor().changeExternal(()=>{const g=working();fn(g);setData(g);});}
 function view(){const v=getView();return {z:v.z,x:Math.max(0,Math.min(W-W/v.z,v.x-W/v.z/2)),y:Math.max(0,Math.min(H-H/v.z,v.y-H/v.z/2))};}
 function toScreen(p){const v=view();return [(p[0]*W-v.x)*v.z,(p[1]*H-v.y)*v.z];}
 function fromEvent(e){const r=canvas.getBoundingClientRect(),v=view();return [(v.x+(e.clientX-r.left)*W/r.width/v.z)/W,(v.y+(e.clientY-r.top)*H/r.height/v.z)/H].map(n=>Math.max(0,Math.min(1,n)));}
 const svgNS='http://www.w3.org/2000/svg';
 function svg(tag,attributes,parent){const n=document.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attributes))n.setAttribute(k,v);parent.append(n);return n;}
 function draw(){
  overlay.hidden=!active();overlay.style.display=active()?'block':'none';if(!active())return;
  overlay.replaceChildren();const g=working(),a=toScreen(g.start),b=toScreen(g.end),scale=W/canvas.getBoundingClientRect().width;
  svg('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#050b19','stroke-width':5*scale},overlay);
  svg('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#f4cf91','stroke-width':2*scale},overlay);
  for(const s of g.stops){const x=a[0]+(b[0]-a[0])*s.position,y=a[1]+(b[1]-a[1])*s.position;svg('circle',{cx:x,cy:y,r:7*scale,fill:s.color,stroke:selected===s.id?'#fff':'#c6d1e0','stroke-width':2*scale,'data-stop':s.id,'pointer-events':'all'},overlay);}
  for(const [key,p,label]of [['start',a,'起点'],['end',b,'终点']]){svg('circle',{cx:p[0],cy:p[1],r:13*scale,fill:'#111c2c80',stroke:'#f4cf91','stroke-width':2*scale,'data-anchor':key,'pointer-events':'all'},overlay);const text=svg('text',{x:p[0]+18*scale,y:p[1]+(key==='start'?18:-10)*scale,fill:'#fff','font-size':13*scale,stroke:'#0b1324','stroke-width':3*scale,'paint-order':'stroke'},overlay);text.textContent=label;}
 }
 function refresh(){
  if(!$('gradient-stops'))return;const g=working();if(!g.stops.some(s=>s.id===selected))selected=g.stops[0].id;const stop=g.stops.find(s=>s.id===selected);
  $('gradient-enabled').checked=!!data();$('gradient-note').textContent=data()?'拖动画面起终点调方向；色标调位置；曲线调相邻颜色的空间过渡。':'当前使用天空档位底色；修改任意属性即启用自定义渐变。';
  for(const key of ['start','end'])for(let i=0;i<2;i++)$('gradient-'+key+'-'+i).value=Number((g[key][i]*100).toFixed(2));
  const select=$('gradient-stop-select');select.replaceChildren();g.stops.forEach((s,i)=>{const o=document.createElement('option');o.value=s.id;o.textContent='色标 '+(i+1)+' · '+Math.round(s.position*100)+'%';select.append(o);});select.value=selected;
  $('gradient-stop-color').value=stop.color;$('gradient-stop-position').value=Number((stop.position*100).toFixed(2));$('gradient-remove').disabled=g.stops.length<=2;$('gradient-add').disabled=g.stops.length>=8;
  const bar=$('gradient-stops');bar.replaceChildren();const colors=Array.from({length:65},(_,i)=>`rgb(${PollutionStarfield.sampleGradient(g,i/64).join(',')}) ${i/64*100}%`);bar.style.background=`linear-gradient(90deg,${colors.join(',')})`;
  for(const s of g.stops){const b=document.createElement('button');b.className='gradient-stop';b.dataset.stop=s.id;b.style.left=s.position*100+'%';b.style.background=s.color;b.setAttribute('aria-label','选择色标 '+(g.stops.indexOf(s)+1));b.setAttribute('aria-pressed',String(s.id===selected));bar.append(b);}
  const c=g.curve,graph=$('gradient-curve');graph.replaceChildren();svg('path',{d:'M20 10V130H200',fill:'none',stroke:'#61738b','stroke-width':1},graph);svg('path',{d:'M20 130L200 10',stroke:'#61738b','stroke-dasharray':'3 4'},graph);
  svg('path',{d:`M20 130L${20+c[0]*180} ${130-c[1]*120} M200 10L${20+c[2]*180} ${130-c[3]*120}`,stroke:'#889bab',fill:'none'},graph);
  svg('path',{d:`M20 130C${20+c[0]*180} ${130-c[1]*120},${20+c[2]*180} ${130-c[3]*120},200 10`,fill:'none',stroke:'#f4cf91','stroke-width':2.5},graph);
  for(let i=0;i<2;i++)svg('circle',{cx:20+c[i*2]*180,cy:130-c[i*2+1]*120,r:7,fill:i?'#9ed7cb':'#f4cf91','data-control':i},graph);
  c.forEach((v,i)=>$('gradient-curve-'+i).value=Number(v.toFixed(3)));draw();
 }
 function finish(cancel=false){if(!gesture)return;const old=gesture;gesture=null;if(cancel)getEditor().cancelExternal(old.before);else getEditor().commitExternal(old.before);if(old.host.hasPointerCapture(old.id))old.host.releasePointerCapture(old.id);refresh();}
 function start(e,kind,key,host){if(e.button!==0||gesture)return;gesture={id:e.pointerId,kind,key,host,before:getEditor().beginExternal()};host.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();}
 function drag(e){if(!gesture||gesture.id!==e.pointerId)return;const g=working(),{kind,key}=gesture;
  if(kind==='anchor')g[key]=fromEvent(e);
  if(kind==='stop'){
   let t;if(gesture.host===overlay){const p=fromEvent(e),dx=(g.end[0]-g.start[0])*W,dy=(g.end[1]-g.start[1])*H;t=((p[0]-g.start[0])*W*dx+(p[1]-g.start[1])*H*dy)/(dx*dx+dy*dy);}else{const r=gesture.host.getBoundingClientRect();t=(e.clientX-r.left)/r.width;}
   moveStop(g,key,t);
  }
  if(kind==='curve'){const point=gesture.host.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const local=point.matrixTransform(gesture.host.getScreenCTM().inverse()),x=Math.max(0,Math.min(1,(local.x-20)/180)),y=Math.max(0,Math.min(1,(130-local.y)/120));g.curve[key*2]=key?Math.max(g.curve[0],x):Math.min(g.curve[2],x);g.curve[key*2+1]=key?Math.max(g.curve[1],y):Math.min(g.curve[3],y);}
  update(g);e.preventDefault();
 }
 function moveStop(g,id,t){const i=g.stops.findIndex(s=>s.id===id),lo=i?g.stops[i-1].position+.005:0,hi=i<g.stops.length-1?g.stops[i+1].position-.005:1;g.stops[i].position=Math.max(lo,Math.min(hi,t));}
 function bind(){
  panel.innerHTML=`<div class="gradient-columns"><div><label class="gradient-enable"><input id="gradient-enabled" type="checkbox">自定义天空渐变</label><div class="gradient-presets"><button data-direction="vertical">竖直</button><button data-direction="horizontal">水平</button><button id="gradient-reverse">反向</button></div><div class="gradient-coordinates">${['start','end'].map((key,i)=>`<span>${i?'终点':'起点'}</span>${[0,1].map((axis)=>`<label>${axis?'Y':'X'} %<input id="gradient-${key}-${axis}" type="number" min="0" max="100" step="1"></label>`).join('')}`).join('')}</div><p class="editor-hint">坐标相对全景，分辨率变化时保持比例。可直接拖动画面上的起终点。</p></div><div><strong>颜色与色标位置</strong><div id="gradient-stops" aria-label="渐变色标"></div><label>色标<select id="gradient-stop-select"></select></label><div class="gradient-stop-properties"><label>颜色<input id="gradient-stop-color" type="color"></label><label>位置 %<input id="gradient-stop-position" type="number" min="0" max="100" step="1"></label></div><div class="gradient-presets"><button id="gradient-add">添加色标</button><button id="gradient-remove">删除色标</button></div><p class="editor-hint">拖动色标调整位置；最多 8 个，至少 2 个。</p></div><div><strong>空间过渡曲线</strong><div class="gradient-curve-row"><svg id="gradient-curve" viewBox="0 0 220 150" aria-label="贝塞尔过渡曲线"></svg><div class="gradient-curve-values">${['X₁','Y₁','X₂','Y₂'].map((label,i)=>`<label>${label}<input id="gradient-curve-${i}" type="number" min="0" max="1" step="0.01"></label>`).join('')}</div></div><div class="gradient-presets"><button data-ease="linear">线性</button><button data-ease="in">先慢后快</button><button data-ease="out">先快后慢</button><button data-ease="smooth">平滑</button></div><p class="editor-hint">横轴：色标间距离；纵轴：颜色混合比例。曲线作用于每对相邻色标。</p></div></div><p id="gradient-note" role="status"></p>`;
  document.addEventListener('compositor-tab',()=>{finish();tab=false;panel.hidden=true;$('tab-gradient').setAttribute('aria-pressed','false');draw();});
  $('tab-gradient').onclick=()=>{$('tab-layers').click();tab=true;document.querySelector('.editor-body').hidden=true;$('object-panel').hidden=true;panel.hidden=false;$('tab-layers').setAttribute('aria-pressed','false');$('tab-gradient').setAttribute('aria-pressed','true');$('replace-layer').hidden=true;$('clear-layer-image').hidden=true;document.querySelector('[data-view="all"]').click();if(!$('sky-settings').hidden)$('sky-close').click();refresh();compose();};
  $('gradient-enabled').onchange=e=>getEditor().changeExternal(()=>setData(e.target.checked?defaults():null));
  for(const key of ['start','end'])for(let i=0;i<2;i++)$('gradient-'+key+'-'+i).onchange=e=>{if(!e.target.validity.valid){refresh();return;}const n=e.target.valueAsNumber;if(!Number.isFinite(n)){refresh();return;}const g=working();g[key][i]=n/100;try{PollutionStarfield.validateGradient(g);getEditor().changeExternal(()=>setData(g));}catch{refresh();}};
  document.querySelectorAll('[data-direction]').forEach(b=>b.onclick=()=>change(g=>{g.start=b.dataset.direction==='vertical'?[.5,0]:[0,.5];g.end=b.dataset.direction==='vertical'?[.5,1]:[1,.5];}));
  $('gradient-reverse').onclick=()=>change(g=>{[g.start,g.end]=[g.end,g.start];});
  $('gradient-stop-select').onchange=e=>{selected=e.target.value;refresh();};
  $('gradient-stop-position').onchange=e=>{if(!e.target.validity.valid||!Number.isFinite(e.target.valueAsNumber)){refresh();return;}change(g=>moveStop(g,selected,e.target.valueAsNumber/100));};
  $('gradient-stop-color').oninput=e=>{if(!pending)pending=getEditor().beginExternal();const g=working();g.stops.find(s=>s.id===selected).color=e.target.value;update(g);};
  const commitColor=()=>{if(pending){const before=pending;pending=null;getEditor().commitExternal(before);}};$('gradient-stop-color').onchange=commitColor;$('gradient-stop-color').onblur=commitColor;
  $('gradient-add').onclick=()=>change(g=>{if(g.stops.length>=8)return;let best=0;for(let i=1;i<g.stops.length-1;i++)if(g.stops[i+1].position-g.stops[i].position>g.stops[best+1].position-g.stops[best].position)best=i;const position=(g.stops[best].position+g.stops[best+1].position)/2;if(g.stops[best+1].position-g.stops[best].position<.01)return;let n=0;while(g.stops.some(s=>s.id==='s'+n))n++;const id='s'+n,color='#'+PollutionStarfield.sampleGradient(g,position).map(n=>n.toString(16).padStart(2,'0')).join('');g.stops.splice(best+1,0,{id,position,color});selected=id;});
  $('gradient-remove').onclick=()=>change(g=>{if(g.stops.length>2)g.stops=g.stops.filter(s=>s.id!==selected);});
  document.querySelectorAll('[data-ease]').forEach(b=>b.onclick=()=>change(g=>{g.curve=({linear:[1/3,1/3,2/3,2/3],in:[.42,0,1,1],out:[0,0,.58,1],smooth:[.42,0,.58,1]})[b.dataset.ease];}));
  for(let i=0;i<4;i++)$('gradient-curve-'+i).onchange=e=>{if(!e.target.validity.valid||!Number.isFinite(e.target.valueAsNumber)){refresh();return;}change(g=>{const other=i<2?i+2:i-2;g.curve[i]=i<2?Math.min(e.target.valueAsNumber,g.curve[other]):Math.max(e.target.valueAsNumber,g.curve[other]);});};
  overlay.addEventListener('pointerdown',e=>{if(!active())return;if(e.target.dataset.anchor)start(e,'anchor',e.target.dataset.anchor,overlay);else if(e.target.dataset.stop){selected=e.target.dataset.stop;start(e,'stop',selected,overlay);refresh();}});
  $('gradient-stops').addEventListener('click',e=>{if(e.target.dataset.stop){selected=e.target.dataset.stop;refresh();}});
  $('gradient-stops').addEventListener('pointerdown',e=>{if(!e.target.dataset.stop)return;selected=e.target.dataset.stop;start(e,'stop',selected,$('gradient-stops'));refresh();});
  $('gradient-curve').addEventListener('pointerdown',e=>{if(e.target.dataset.control!==undefined)start(e,'curve',Number(e.target.dataset.control),$('gradient-curve'));});
  for(const host of [overlay,$('gradient-stops'),$('gradient-curve')]){host.addEventListener('pointermove',drag);host.addEventListener('pointerup',e=>{if(gesture?.id===e.pointerId)finish();});host.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId)finish(true);});host.addEventListener('lostpointercapture',e=>{if(gesture?.id===e.pointerId)finish(true);});}
  document.addEventListener('keydown',e=>{if(gesture&&e.key==='Escape'){e.stopImmediatePropagation();finish(true);}},true);
  addEventListener('blur',()=>finish(true));new ResizeObserver(draw).observe(canvas);refresh();
 }
 return {get active(){return active();},get busy(){return !!gesture||!!pending;},getData:data,validate:PollutionStarfield.validateGradient,setData,reset(){setData(null);},bind,draw};
};

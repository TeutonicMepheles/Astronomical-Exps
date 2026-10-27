/* Uniform foreground group; sprite silhouettes adapted from this experiment's lamps.js. */
window.createCompositorLamps=function({canvas,W,H,getEditor,compose}){
  const base='L316 774H329V786H339V805H334V934H350V945H360V972H241V945H253V934H267V805H261V786H274V774H285V245';
  const open='M285 245L269 239L266 226C232 212 211 181 211 141C211 92 251 54 300 54C350 54 391 92 391 141C391 181 366 212 339 226L331 239L316 245'+base+'Z';
  // Native SVG clipping also suppresses the unwanted halo in the generated sprite sheet.
  const half='M752 245L738 239L733 224C706 213 697 187 697 165L664 156C668 106 701 71 746 63V54H790V63C835 71 869 105 873 156L840 165C835 191 829 215 803 224L798 239L784 245L784 774H797V786H808V805H803V934H819V945H828V972H709V945H721V934H735V805H728V786H741V774H752Z';
  const full='M1172 774V151H1171V87Q1188 80 1205 87V105H1290V100Q1372 82 1454 101V147Q1372 179 1290 149V128H1205V151H1202V774H1215V786H1228V805H1221V934H1237V945H1249V972H1129V945H1141V934H1155V805H1148V786H1161V774Z';
  const types={
    open:{origin:180,pole:300,path:open,light:[300,140],spill:1,ground:.44,diffuser:'M207 141a94 92 0 1 0 188 0a94 92 0 1 0 -188 0'},
    half:{origin:648,pole:768,path:half,light:[768,182],spill:.46,ground:.69,diffuser:'M696 153Q768 145 840 153Q835 224 768 225Q701 222 696 153Z'},
    full:{origin:1068,pole:1188,path:full,light:[1372,148],spill:.08,ground:.87,diffuser:'M1290 146C1290 128 1455 128 1455 146C1455 168 1290 168 1290 146Z'}
  };

 const $=id=>document.getElementById(id),defaults=()=>({version:1,shade:'half',temperature:3000,brightness:100});
 const entries=Array.from({length:9},(_,i)=>({x:126+i*240,y:610,height:145}));
 let state=defaults(),shown=false,pending=null,tap=null,loaded=false;
 const layer=Object.assign(document.createElement('canvas'),{width:W,height:H}),ctx=layer.getContext('2d'),sprite=new Image();
 const paths=Object.fromEntries(Object.entries(types).map(([id,t])=>[id,{body:new Path2D(t.path),diffuser:new Path2D(t.diffuser)}]));
 const ready=new Promise((resolve,reject)=>{sprite.onload=()=>{loaded=true;rebuild();resolve();};sprite.onerror=()=>reject(Error('路灯素材加载失败'));sprite.src=window.LIB_STATIC_ASSETS?.['../assets/lamp-sprites.png']||'../assets/lamp-sprites.png';});
 function validate(value){if(value===undefined)return defaults();if(!value||value.version!==1||!Object.hasOwn(types,value.shade)||!Number.isFinite(value.temperature)||value.temperature<2200||value.temperature>6500||!Number.isFinite(value.brightness)||value.brightness<0||value.brightness>100)throw Error('路灯参数无效');return {version:1,shade:value.shade,temperature:value.temperature,brightness:value.brightness};}
 function glow(x,y,rx,ry,rgb,alpha){ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${rgb},${alpha})`);g.addColorStop(.4,`rgba(${rgb},${alpha*.4})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
 function rebuild(){
  ctx.clearRect(0,0,W,H);if(!loaded)return;const t=types[state.shade],u=145/1000,gain=state.brightness/100,k=(state.temperature-2200)/4300,color=[Math.round(255-70*k),Math.round(179+35*k),Math.round(100+155*k)],rgb=color.join(',');
  for(const e of entries){const lx=e.x+(t.light[0]-t.pole)*u,ly=e.y+(t.light[1]-972)*u;
   ctx.save();ctx.beginPath();ctx.rect(0,598,W,34);ctx.clip();glow(lx,e.y+4,75,15,rgb,t.ground*.55*gain);ctx.restore();
   ctx.save();if(state.shade!=='open'){ctx.beginPath();ctx.rect(lx-100,ly,W,200);ctx.clip();}glow(lx,ly,state.shade==='open'?42:state.shade==='half'?28:12,state.shade==='open'?42:state.shade==='half'?28:12,rgb,.5*gain);ctx.restore();
   if(state.shade!=='open'){const beam=ctx.createLinearGradient(lx,ly,lx,e.y);beam.addColorStop(0,`rgba(${rgb},${.17*gain})`);beam.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(lx-3,ly);ctx.lineTo(lx-48,e.y);ctx.lineTo(lx+48,e.y);ctx.closePath();ctx.fill();}
   ctx.save();ctx.translate(e.x-t.pole*u,e.y-972*u);ctx.scale(u,u);ctx.save();ctx.clip(paths[state.shade].body);ctx.drawImage(sprite,0,0,1536,1024);ctx.fillStyle=`rgb(${color.map((v,i)=>Math.round([42,52,70][i]*(1-gain)+v*gain)).join(',')})`;ctx.fill(paths[state.shade].diffuser);ctx.restore();if(shown){ctx.strokeStyle='#f4cb83';ctx.lineWidth=9;ctx.stroke(paths[state.shade].body);}ctx.restore();
  }
 }
 function sync(){if(!$('group-lamp-brightness'))return;for(const key of ['brightness','temperature']){$('group-lamp-'+key).value=state[key];$('group-lamp-'+key+'-value').value=state[key]+(key==='temperature'?' K':'%');}document.querySelectorAll('[data-group-shade]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.groupShade===state.shade)));}
 function setData(value){state=validate(value);rebuild();sync();}
 function commit(){if(!pending)return;const before=pending;pending=null;getEditor().commitExternal(before);}
 function openPanel(value){commit();shown=value;$('lamp-controls').hidden=!value;$('lamp-toggle').setAttribute('aria-expanded',String(value));rebuild();compose();}
 function hit(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height,t=types[state.shade],u=145/1000;return entries.some(l=>x>=l.x-24&&x<=l.x+(state.shade==='full'?48:24)&&y>=l.y-145&&y<=l.y+6);}
 function bind(){
  $('lamp-toggle').disabled=false;$('lamp-toggle').onclick=()=>openPanel(!shown);$('lamp-close').onclick=()=>openPanel(false);
  for(const key of ['brightness','temperature']){const input=$('group-lamp-'+key);input.oninput=e=>{if(!pending)pending=getEditor().beginExternal();setData({...state,[key]:Number(e.target.value)});compose();};input.onchange=commit;input.onblur=commit;}
  document.querySelectorAll('[data-group-shade]').forEach(b=>b.onclick=()=>{commit();getEditor().changeExternal(()=>setData({...state,shade:b.dataset.groupShade}));});
  const viewer=document.querySelector('.viewer');viewer.addEventListener('pointerdown',e=>{if(!getEditor().active&&e.isPrimary&&e.button===0)tap={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
  viewer.addEventListener('pointermove',e=>{if(tap?.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>6)tap.moved=true;});
  viewer.addEventListener('pointerup',e=>{if(tap?.id===e.pointerId){if(!tap.moved)openPanel(hit(e));tap=null;}});
  for(const type of ['pointercancel','lostpointercapture'])viewer.addEventListener(type,()=>{tap=null;});
  document.addEventListener('keydown',e=>{if(shown&&e.key==='Escape'){e.stopImmediatePropagation();openPanel(false);$('lamp-toggle').focus();}},true);
  $('edit-toggle').addEventListener('click',()=>openPanel(false));sync();
 }
 return {ready,bind,get busy(){return !!pending;},getData:()=>({...state}),validate,setData,reset(){setData(defaults());},render(c){c.drawImage(layer,0,0);}};
};

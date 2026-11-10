/* Uniform foreground group; sprite silhouettes adapted from this experiment's lamps.js. */
window.createCompositorLamps=function({canvas,W,H,getSession,compose,getView=()=>({z:1,x:W/2,y:H/2})}){
 const types=LightPollution.lampVariants,body=types.half,bodyUnit=145/(body.base-body.top),jointY=610-(body.base-body.neck)*bodyUnit;
 let carousel=null;
 const $=id=>document.getElementById(id),defaults=()=>({version:1,shade:'half',temperature:3000,brightness:100});
 const entries=Array.from({length:9},(_,i)=>({x:126+i*240,y:610,height:145}));
 let state=defaults(),shown=false,pending=null,loaded=false;
 const layer=Object.assign(document.createElement('canvas'),{width:W,height:H}),ctx=layer.getContext('2d');
 const sprites={};
 const paths=Object.fromEntries(Object.entries(types).map(([id,t])=>[id,{body:new Path2D(t.path),diffuser:new Path2D(t.diffuser)}]));
 const ready=Promise.all(Object.entries(types).map(([id,t])=>new Promise((resolve,reject)=>{const sprite=sprites[id]=new Image();sprite.onload=resolve;sprite.onerror=()=>reject(Error('路灯素材加载失败：'+id));const url='../assets/lamp-variants/'+t.file;sprite.src=window.LIB_STATIC_ASSETS?.[url]||url;}))).then(()=>{loaded=true;rebuild();});
 function validate(value){if(value===undefined)return defaults();if(!value||value.version!==1||!Object.hasOwn(types,value.shade)||!Number.isFinite(value.temperature)||value.temperature<2200||value.temperature>6500||!Number.isFinite(value.brightness)||value.brightness<0||value.brightness>100)throw Error('路灯参数无效');return {version:1,shade:value.shade,temperature:value.temperature,brightness:value.brightness};}
 function glow(x,y,rx,ry,rgb,alpha){ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${rgb},${alpha})`);g.addColorStop(.4,`rgba(${rgb},${alpha*.4})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
 function rebuild(){
  ctx.clearRect(0,0,W,H);if(!loaded)return;const t=types[state.shade],u=bodyUnit,gain=state.shade==='sensor'?0:state.brightness/100,k=(state.temperature-2200)/4300,color=[Math.round(255-70*k),Math.round(179+35*k),Math.round(100+155*k)],rgb=color.join(',');
  for(const [index,e] of entries.entries()){const lx=e.x+(t.light[0]-t.pole)*u,ly=jointY+(t.light[1]-t.neck)*u;
   ctx.save();ctx.beginPath();ctx.rect(0,598,W,34);ctx.clip();glow(lx,e.y+4,75,15,rgb,t.ground*.55*gain);ctx.restore();
   ctx.save();if(!['open','cap'].includes(state.shade)){ctx.beginPath();ctx.rect(lx-100,ly,W,200);ctx.clip();}glow(lx,ly,['open','cap'].includes(state.shade)?42:state.shade==='half'?28:12,['open','cap'].includes(state.shade)?42:state.shade==='half'?28:12,rgb,.5*gain);ctx.restore();
   if(!['open','cap'].includes(state.shade)){const beam=ctx.createLinearGradient(lx,ly,lx,e.y);beam.addColorStop(0,`rgba(${rgb},${.17*gain})`);beam.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(lx-3,ly);ctx.lineTo(lx-48,e.y);ctx.lineTo(lx+48,e.y);ctx.closePath();ctx.fill();}
   // A single fixed pole remains in the scene while only the shade changes.
   ctx.save();ctx.translate(e.x-body.pole*u,e.y-body.base*u);ctx.scale(u,u);ctx.beginPath();ctx.rect(0,body.neck,1024,1536-body.neck);ctx.clip();ctx.clip(paths.half.body);ctx.drawImage(sprites.half,0,0,1024,1536);ctx.restore();
   if(carousel?.activeIndex!==index){ctx.save();ctx.translate(e.x-t.pole*u,jointY-t.neck*u);ctx.scale(u,u);ctx.beginPath();ctx.rect(0,0,1024,t.neck);ctx.clip();ctx.clip(paths[state.shade].body);ctx.drawImage(sprites[state.shade],0,0,1024,1536);ctx.fillStyle=`rgb(${color.map((v,i)=>Math.round([42,52,70][i]*(1-gain)+v*gain)).join(',')})`;ctx.fill(paths[state.shade].diffuser);ctx.restore();}

  }
 }
 function sync(){if(!$('group-lamp-brightness'))return;for(const key of ['brightness','temperature']){$('group-lamp-'+key).value=state[key];$('group-lamp-'+key+'-value').value=state[key]+(key==='temperature'?' K':'%');}$('lamp-mode-note').textContent=state.shade==='sensor'?'按需熄灯演示：当前关闭照明；不模拟计时或人体检测。':'九盏联动 · 亮度与色温为视觉演示参数';$('group-lamp-brightness').disabled=state.shade==='sensor';$('group-lamp-temperature').disabled=state.shade==='sensor';document.querySelectorAll('[data-group-shade]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.groupShade===state.shade)));carousel?.sync();}
 function setData(value){state=validate(value);rebuild();sync();}
 function cancel(){if(!pending)return;const before=pending;pending=null;getSession().cancelExternal(before);sync();}
 function commit(){if(!pending)return;const before=pending;pending=null;getSession().commitExternal(before);}
 function showPanel(value){commit();shown=value;carousel?.show(value);$('lamp-controls').hidden=!value;$('lamp-toggle').setAttribute('aria-expanded',String(value));rebuild();compose();}
 function openPanel(value){if(value)LightPollution.panels.open('lamps');else LightPollution.panels.close('lamps');}
 function getAnchor(index){const r=canvas.getBoundingClientRect(),stage=document.querySelector('.stage').getBoundingClientRect(),v=getSession()?.active?LightPollution.viewport(getView(),W,H):{z:1,x:0,y:0};return {x:r.left-stage.left+(entries[index].x-v.x)*r.width/W*v.z,y:r.top-stage.top+(jointY-v.y)*r.height/H*v.z,unit:bodyUnit*r.width/W*v.z};}
 function hit(e){const stage=document.querySelector('.stage').getBoundingClientRect(),index=entries.findIndex((l,i)=>{const p=getAnchor(i),scale=p.unit/bodyUnit;return Math.abs(e.clientX-stage.left-p.x)<=24*scale&&e.clientY-stage.top>=p.y-40*scale&&e.clientY-stage.top<=p.y+(610-jointY+6)*scale;});return index>=0?{index}:false;}
 function bind(){carousel=LightPollution.createLampCarousel({stage:document.querySelector('.stage'),canvas,types,sprites,entries,getAnchor,getState:()=>state,setData,getSession,compose,openPanel});LightPollution.panels.register('lamps',()=>showPanel(true),()=>showPanel(false));
  $('lamp-toggle').disabled=false;$('lamp-toggle').onclick=()=>openPanel(!shown);$('lamp-close').onclick=()=>openPanel(false);$('lamp-adjust').onclick=()=>{const panel=$('lamp-settings');panel.hidden=!panel.hidden;$('lamp-adjust').setAttribute('aria-expanded',String(!panel.hidden));};
  for(const key of ['brightness','temperature']){const input=$('group-lamp-'+key);input.oninput=e=>{if(!pending)pending=getSession().beginExternal();setData({...state,[key]:Number(e.target.value)});compose();};input.onchange=commit;input.onblur=commit;input.onpointercancel=cancel;}
  LightPollution.tapRouter.add(30,hit,target=>{carousel.anchor(target.index);openPanel(true);});
  LightPollution.on(document,'keydown',e=>{if(shown&&e.key==='Escape'){e.stopImmediatePropagation();carousel.cancel();openPanel(false);$('lamp-toggle').focus();}},true);
  LightPollution.on($('edit-toggle'),'click',()=>openPanel(false));sync();
 }
 return {syncView:()=>carousel?.sync(),hitTarget:hit,getHintGeometry(){const t=types[state.shade],u=bodyUnit,dy=body.neck-t.neck;
 const head=t.headPath.replace(/([MLHVQCZ])([^MLHVQCZ]*)/g,(_,command,values)=>{let i=0;return command+values.replace(/-?\d+(?:\.\d+)?/g,n=>String(Number(n)+(command==='V'||command!=='H'&&i++%2===1?dy:0)));});
 const pole='M484 334H539V1187H561V1205H578V1234H570V1437H589V1453H609V1498H416V1453H436V1437H454V1234H447V1205H464V1187H484Z';
 return entries.map(e=>({x:e.x-body.pole*u,y:e.y-body.base*u,scale:u,path:head+pole,width:1024,height:1536}));},ready,bind,get busy(){return !!pending||!!carousel?.busy;},getData:()=>({...state}),validate,setData,reset(){setData(defaults());},render(c){c.drawImage(layer,0,0);}};
};

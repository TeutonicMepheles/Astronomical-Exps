import * as T from './vendor/three/three.module.js';

const BASE=new URL('./assets/blueprint-flat/',import.meta.url);
const inside=(r,x,y)=>x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3];

/** Offline GLB-derived drafting sheets on a real XZ plane. UVs own all hit regions. */
export class RocketBlueprint {
 constructor(adapter){
  this.adapter=adapter;this.visible=false;this.drawCount=0;this.shadowDrawCount=0;this.images={};this.buttons=new Map();this.notes=new Map();this.hover=null;this.pressed=null;this.abort=new AbortController();
  this.canvas=document.createElement('canvas');this.canvas.className='rocket-blueprint';this.canvas.setAttribute('aria-hidden','true');adapter.host.closest('#app').prepend(this.canvas);this.background=this.canvas.getContext('2d');
  this.targets=document.createElement('div');this.targets.className='rocket-blueprint-targets';adapter.host.append(this.targets);
  this.headings=['','内部结构'].map(text=>{const label=document.createElement('span');label.className='blueprint-heading';label.textContent=text;this.targets.append(label);return label;});
  const options={signal:this.abort.signal},canvas=adapter.renderer.domElement;
  canvas.addEventListener('pointermove',e=>this.setState('hover',this.pick(e)),options);
  canvas.addEventListener('pointerleave',()=>this.setState('hover',null),options);
  canvas.addEventListener('pointerdown',e=>this.setState('pressed',this.pick(e)),options);
  for(const event of ['pointerup','pointercancel'])window.addEventListener(event,()=>this.setState('pressed',null),options);
  document.fonts.ready.then(()=>{if(!this.disposed){this.key=null;this.draw();adapter.invalidateFrame();}});
  this.ink=document.createElement('canvas');this.ink.width=1920;this.ink.height=1080;this.ctx=this.ink.getContext('2d');
  this.texture=new T.CanvasTexture(this.ink);this.texture.colorSpace=T.SRGBColorSpace;this.texture.anisotropy=Math.min(8,adapter.renderer.capabilities.getMaxAnisotropy());
  this.plane=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:this.texture,side:T.DoubleSide,depthWrite:false,transparent:true}));this.plane.name='RocketBlueprintPaper';this.plane.rotation.x=-Math.PI/2;this.plane.visible=false;this.plane.renderOrder=-10;adapter.scene.add(this.plane);
  this.ready=this.load().catch(error=>{if(!this.disposed){this.error=error;adapter.fail(error);}});
 }
 async load(){
  const resource=file=>{const url=new URL(file,BASE);if(this.adapter.manifest.blueprintRevision)url.searchParams.set('v',this.adapter.manifest.blueprintRevision);return url;};
  const [response,contours]=await Promise.all(['hotspots.json','fill-contours.json'].map(file=>fetch(resource(file),{signal:this.abort.signal})));if(!response.ok||!contours.ok)throw Error('蓝图交互资源加载失败');this.data=await response.json();const source=await contours.json();this.fills={};for(const [phase,placements]of Object.entries(source.phases)){this.fills[phase]={};for(const entry of placements){const path=this.fills[phase][entry.node]??=new Path2D();path.addPath(new Path2D(source.paths[entry.source]),new DOMMatrix(entry.matrix));}}
  await Promise.all([['recognition','01-recognition-ink.png'],['assembly','02-assembly-ink.png'],['material','../blueprint-material/clean-background.png']].map(async([phase,file])=>{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('蓝图纹理加载失败'));image.src=resource(file).href;});if(!this.disposed)this.images[phase]=image;}));
  if(!this.disposed){this.key=null;this.draw();if(this.visible&&this.adapter.selected){this.adapter.info.key=null;this.adapter.info.update();}this.adapter.invalidateFrame();}
 }
 setVisible(visible){this.visible=visible;this.plane.visible=visible;this.targets.hidden=this.canvas.hidden=!visible;if(visible)this.draw();}
 draw(){
  const a=this.adapter,w=a.host.clientWidth,h=a.host.clientHeight;if(!this.visible||!this.data||!this.images.recognition||!this.images.assembly||!w||!h)return;
  a.scene.updateMatrixWorld(true);a.camera.updateMatrixWorld(true);
  const phase=a.mode==='assembly'?'assembly':'recognition',hover=a.selected?null:this.hover,pressed=a.selected?(this.pressed===a.selected?a.selected:null):this.pressed;
  const key=[phase,a.selected,hover,pressed,w,h,a.paperY,...a.camera.projectionMatrix.elements,...a.camera.matrixWorld.elements].join(':');if(this.key===key)return;this.key=key;this.drawCount++;
  this.phase=phase;this.drawingMode=phase==='assembly'?'parts':'complete';this.hitAreas=this.data[phase];
  // Preserve the paper's physical aspect ratio. Its foreshortening comes from the camera.
  const width=(a.camera.right-a.camera.left)*.98,depth=width*1080/1920*1.07;
  this.plane.scale.set(width,depth,1);this.plane.position.set(0,a.paperY-.08,-2.3);this.plane.updateMatrixWorld(true);
  const c=this.ctx;c.clearRect(0,0,1920,1080);c.drawImage(this.images[phase],0,0);
  // Drafting leaders share the sheet UVs and selection state with each labelled part.
  for(const region of this.hitAreas){
   if(!region.labelRect)continue;
   const [x,y,w,h]=region.rect,[lx,ly,lw,lh]=region.labelRect,cx=lx+lw/2,cy=ly+lh/2,above=cy<y+h/2,ax=x+w*.42,ay=above?y:y+h,ey=above?ly+lh+5:ly-5,elbow=(ay+ey)/2,active=region.node===a.selected||region.node===hover,down=region.node===pressed;
   c.save();c.strokeStyle=active||down?'#f2cb74':'#b9dcebc9';c.fillStyle=c.strokeStyle;c.lineWidth=active||down?2.8:1.6;c.setLineDash([]);c.beginPath();c.moveTo(ax,ay);c.lineTo(ax,elbow);c.lineTo(cx,elbow);c.lineTo(cx,ey);c.stroke();c.beginPath();c.arc(ax,ay,active||down?3.8:2.6,0,Math.PI*2);c.fill();c.restore();
  }
  for(const region of this.hitAreas){
   const active=region.node===a.selected||region.node===hover,down=region.node===pressed,r=this.touchRect(region.rect),[x,y,w,h]=r;
   if(active||down)continue;
   c.strokeStyle=down?'#ffe0a3':active?'#f0cd8d':'#a6d5e06b';c.fillStyle=down?'#e8bf7e55':active?'#e8bf7e22':'#8fc6de09';c.lineWidth=down?5:active?3:1.3;c.setLineDash(active?[]:[9,7]);c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h);c.setLineDash([]);
  }
  for(const name of new Set([a.selected,hover,pressed].filter(Boolean))){const shape=this.fills[phase][name];if(!shape)continue;const down=pressed===name;c.save();c.clip(shape);c.fillStyle=down?'#efbd4e55':'#edbf5426';c.fillRect(0,0,1920,1080);c.beginPath();c.strokeStyle=down?'#ffe5a3':'#efc258df';c.lineWidth=down?3:2;for(let x=-1080;x<1920;x+=18){c.moveTo(x,1080);c.lineTo(x+1080,0);}c.stroke();c.restore();c.save();c.clip(shape);c.strokeStyle=down?'#ffe5a3':'#f0cd8d';c.lineWidth=down?8:5;c.lineJoin='round';c.lineCap='round';c.stroke(shape);c.restore();}
  this.texture.needsUpdate=true;this.drawGrid();this.syncTargets();
 }
 drawGrid(){
  const a=this.adapter,app=a.host.closest('#app'),w=app.clientWidth,h=app.clientHeight,ar=app.getBoundingClientRect(),r=a.host.getBoundingClientRect(),scale=ar.width/w,ox=(r.left-ar.left)/scale,oy=(r.top-ar.top)/scale,sw=a.host.clientWidth,sh=a.host.clientHeight,d=Math.min(devicePixelRatio,1.5),c=this.background;
  const key=[w,h,sw,sh,ox,oy,a.paperY,...a.camera.projectionMatrix.elements,...a.camera.matrixWorld.elements].join(':');if(this.gridKey===key)return;this.gridKey=key;
  this.canvas.width=Math.round(w*d);this.canvas.height=Math.round(h*d);c.setTransform(d,0,0,d,0,0);c.fillStyle='#10334e';c.fillRect(0,0,w,h);
  if(this.images.material){const p=this.project(0,0),u=this.project(1920,0),v=this.project(0,1080);c.save();c.globalAlpha=.65;c.transform((u.x-p.x)/1920,(u.y-p.y)/1920,(v.x-p.x)/1080,(v.y-p.y)/1080,ox+p.x,oy+p.y);c.drawImage(this.images.material,-360,-210,2640,1500);c.restore();}
  const floor=new T.Plane(new T.Vector3(0,1,0),-a.paperY),ray=new T.Raycaster(),corners=[];
  for(const [x,y]of [[0,0],[w,0],[0,h],[w,h]]){ray.setFromCamera(new T.Vector2((x-ox)/sw*2-1,1-(y-oy)/sh*2),a.camera);const p=ray.ray.intersectPlane(floor,new T.Vector3());if(p)corners.push(p);}
  const minX=Math.floor(Math.min(...corners.map(p=>p.x)))-1,maxX=Math.ceil(Math.max(...corners.map(p=>p.x)))+1,minZ=Math.floor(Math.min(...corners.map(p=>p.z)))-1,maxZ=Math.ceil(Math.max(...corners.map(p=>p.z)))+1;
  const point=(x,z)=>{const p=new T.Vector3(x,a.paperY,z).project(a.camera);return{x:ox+(p.x+1)*sw/2,y:oy+(1-p.y)*sh/2};};
  for(const major of [false,true]){c.strokeStyle=major?'#a9d0e52e':'#9fc7df19';c.lineWidth=major?1:.65;c.beginPath();const line=(x,z,xx,zz)=>{const p=point(x,z),q=point(xx,zz);c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);};for(let x=minX;x<=maxX;x++)if((x%5===0)===major)line(x,minZ,x,maxZ);for(let z=minZ;z<=maxZ;z++)if((z%5===0)===major)line(minX,z,maxX,z);c.stroke();}
 }
 project(x,y){const a=this.adapter,p=new T.Vector3(x/1920-.5,.5-y/1080,0).applyMatrix4(this.plane.matrixWorld).project(a.camera);return{x:(p.x+1)*a.host.clientWidth/2,y:(1-p.y)*a.host.clientHeight/2};}
 setState(field,value){if(this[field]===value)return;this[field]=value;this.key=null;this.draw();if(this.visible&&this.adapter.selected){this.adapter.info.key=null;this.adapter.info.update();}this.adapter.invalidateFrame();}
 touchRect(rect){const [x,y,w,h]=rect,p=this.project(x,y),u=this.project(x+w,y),v=this.project(x,y+h),minW=44*w/Math.max(1,Math.hypot(u.x-p.x,u.y-p.y)),minH=44*h/Math.max(1,Math.hypot(v.x-p.x,v.y-p.y));return[x-(Math.max(w,minW)-w)/2-4,y-(Math.max(h,minH)-h)/2-4,Math.max(w,minW)+8,Math.max(h,minH)+8];}
 syncTargets(){
  const active=new Set();
  for(const region of this.hitAreas){if(!region.labelRect)continue;const name=region.node;active.add(name);let button=this.buttons.get(name);
   if(!button){button=document.createElement('button');button.className='blueprint-graphic-target';button.dataset.blueprint=name;button.setAttribute('aria-label','蓝图：'+this.data.labels[name]);button.onclick=event=>{if(!this.adapter.assemblyMotion)this.adapter.onPick(name,event);};const opts={signal:this.abort.signal};for(const event of ['pointerenter','focus'])button.addEventListener(event,()=>this.setState('hover',name),opts);for(const event of ['pointerleave','blur'])button.addEventListener(event,()=>this.setState('hover',null),opts);button.addEventListener('pointerdown',()=>this.setState('pressed',name),opts);this.buttons.set(name,button);this.targets.append(button);const note=document.createElement('span');note.className='blueprint-note';note.textContent=this.data.labels[name]+(name==='Stage1Engine01'?' ×2':name==='Stage2Engine01'?' ×4':'');this.notes.set(name,note);this.targets.append(note);}
   const [x,y,w,h]=region.labelRect,p=this.project(x+w/2,y+h/2),note=this.notes.get(name);const u=this.project(x+w/2+100,y+h/2),v=this.project(x+w/2,y+h/2+100),unit=Math.hypot(u.x-p.x,u.y-p.y);Object.assign(note.style,{left:p.x+'px',top:p.y+'px',transform:`matrix(${(u.x-p.x)/unit},${(u.y-p.y)/unit},${(v.x-p.x)/unit},${(v.y-p.y)/unit},0,0) translate(-50%,-50%)`});note.hidden=false;note.dataset.active=String(name===this.adapter.selected||!this.adapter.selected&&name===this.hover);note.dataset.selected=String(name===this.adapter.selected);
   const first=this.hitAreas.find(r=>r.node===name),[gx,gy,gw,gh]=this.touchRect(first.rect),points=[[gx,gy],[gx+gw,gy],[gx+gw,gy+gh],[gx,gy+gh]].map(([x,y])=>this.project(x,y)),left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),width=Math.max(...points.map(p=>p.x))-left,height=Math.max(...points.map(p=>p.y))-top;
   Object.assign(button.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px',clipPath:'polygon('+points.map(p=>`${(p.x-left)/width*100}% ${(p.y-top)/height*100}%`).join(',')+')'});button.hidden=false;button.dataset.down=String(this.pressed===name);button.setAttribute('aria-pressed',String(this.adapter.selected===name));
  }
  for(const [name,button]of this.buttons){button.hidden=!active.has(name);this.notes.get(name).hidden=!active.has(name);}
  this.headings[0].textContent=this.phase==='assembly'?'分体蓝图':'整箭蓝图';this.headings[1].textContent=this.phase==='assembly'?'内部部件':'内部结构';for(const [i,y]of [this.phase==='assembly'?60:100,810].entries()){const p=this.project(64,y),u=this.project(164,y),v=this.project(64,y+100),unit=Math.hypot(u.x-p.x,u.y-p.y);Object.assign(this.headings[i].style,{left:p.x+'px',top:p.y+'px',transform:`matrix(${(u.x-p.x)/unit},${(u.y-p.y)/unit},${(v.x-p.x)/unit},${(v.y-p.y)/unit},0,0) translateY(-50%)`});}
 }

 pick(event){
  if(!this.visible||!this.hitAreas||this.adapter.assemblyMotion)return null;const a=this.adapter,r=a.renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2),a.camera);
  const hit=ray.intersectObject(this.plane)[0];if(!hit)return null;const x=hit.uv.x*1920,y=(1-hit.uv.y)*1080;
  return this.hitAreas.find(region=>inside(region.rect,x,y))?.node||this.hitAreas.filter(region=>inside(this.touchRect(region.rect),x,y)).sort((a,b)=>Math.hypot(x-a.rect[0]-a.rect[2]/2,y-a.rect[1]-a.rect[3]/2)-Math.hypot(x-b.rect[0]-b.rect[2]/2,y-b.rect[1]-b.rect[3]/2))[0]?.node||null;
 }
 // The page's shared render clock calls this compatibility hook; no extra loop or uploads.
 drawShadows(){}
 destroy(){this.disposed=true;this.abort.abort();this.targets.remove();this.canvas.remove();this.buttons.clear();this.notes.clear();this.fills=null;this.adapter.scene.remove(this.plane);this.plane.geometry.dispose();this.plane.material.dispose();this.texture.dispose();for(const im of Object.values(this.images)){im.onload=im.onerror=null;im.src='';}this.images={};this.hitAreas=[];}
}

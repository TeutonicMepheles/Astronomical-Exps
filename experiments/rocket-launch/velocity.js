import {createCannonTransition,groundPlaybackEnd,TRANSITION_TIMING,usesGroundView} from './cannon-transition.js?v=cannon-projectile';
import {drawLiftoffExhaust,HEIGHT as ROCKET_HEIGHT} from './cz7.js?v=liftoff-exhaust-20261123';
import {CANNON_ART} from './assets/cannon-scene/geometry.js';
import {MODEL,GEARS,model,pathOf,solarPath,positionAt,groundPath,projectGroundDistance} from './orbital-model.js';
export {MODEL,model,pathOf,solarPath,positionAt} from './orbital-model.js';
const ink='#e8e0cc',dim='#a9b0bf',warm='#d8b074',cool='#a8c4c6',tau=Math.PI*2;
const GEO={cx:940,cy:345,s:180};
const DIRECT_EARTH_SPEED=7.9;
const INSET_PULLBACK_TIME=.85;
const CANNON_INSET={x:130,y:105,size:222};
const SPEED_AXIS={x:360,y:230,w:960,stroke:18};
const EARTH_SHOT={x:208.5,y:495,r:145};
const TRAJECTORY_VIEW={left:26,right:1390,top:104,bottom:637};
const CLOSED_ORBIT_VIEW={left:20,right:1160,top:116,bottom:636};
const CLOSED_ORBIT_CENTER_X=(CLOSED_ORBIT_VIEW.left+CLOSED_ORBIT_VIEW.right)/2;
const OBSERVATION_TIME=.85;
const RING_SAMPLES=Array.from({length:121},(_,i)=>[Math.cos(tau*i/120),Math.sin(tau*i/120)]);
const mix=(a,b,t)=>a+(b-a)*t;
const orbitRing=(project,x=0,y=0,r=1)=>RING_SAMPLES.map(([u,v])=>project({x:x+r*u,y:y+r*v}));
const EARTH_COMPARISONS=[4.5,7.89,7.9,11.2];
const PULLBACK_EARTH_X=750;
const LUNAR_WIDE_SHOT=4,LUNAR_ORBIT_TIME=4;
const MOON={x:970,y:430,r:56,orbitRadius:135};
const TRANSFER_EARTH={x:270,y:362,r:100};
const earthProject=p=>[EARTH_SHOT.x+p.x*EARTH_SHOT.r,EARTH_SHOT.y-p.y*EARTH_SHOT.r];
function fitTrajectories(paths,project,center,radius,view,fill=false){
 let left=center[0]-radius,right=center[0]+radius,top=center[1]-radius,bottom=center[1]+radius;
 for(const points of paths)for(const point of points){
  const [x,y]=project(point);
  left=Math.min(left,x);right=Math.max(right,x);
  top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 const padding=12;
 left-=padding;right+=padding;top-=padding;bottom+=padding;
 const scale=Math.min(fill?2:1,(view.right-view.left)/(right-left),(view.bottom-view.top)/(bottom-top));
 const shift=(min,max,lo,hi)=>{
  const from=lo-min*scale,to=hi-max*scale;
  return fill||scale<1?(from+to)/2:Math.max(from,Math.min(0,to));
 };
 return {scale,x:shift(left,right,view.left,view.right),y:shift(top,bottom,view.top,view.bottom)};
}
function label(c,s,x,y,size=22,color=ink){c.fillStyle=color;c.font=`${size}px "Alibaba PuHuiTi 3",sans-serif`;c.fillText(s,x,y);}
function line(c,pts,color=warm,width=2,dash=[]){if(!pts.length)return;c.save();c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.restore();}
function dot(c,x,y,r=4,color=ink){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,tau);c.fill();}
function arrow(c,a,b,color=warm){line(c,[a,b],color,2);const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);line(c,[[b[0]-10*Math.cos(ang-.4),b[1]-10*Math.sin(ang-.4)],b,[b[0]-10*Math.cos(ang+.4),b[1]-10*Math.sin(ang+.4)]],color,2);}
function orbitVectors(c,point,tangent,center,scale=1){
 for(const [direction,length,color] of [[tangent,34,warm],[center,31,cool]]){
  const dx=direction[0]-point[0],dy=direction[1]-point[1],m=Math.hypot(dx,dy);
  if(m>0)arrow(c,point,[point[0]+dx/m*length*scale,point[1]+dy/m*length*scale],color);
 }
}
function forwardPoint(path,head){
 const a=path.pts[head.index-1],b=path.pts[head.index];
 return {x:head.x+b.x-a.x,y:head.y+b.y-a.y,r:head.r+b.r-a.r};
}
function orbitLegend(c,x,y){
 label(c,'虚线  预测轨迹',x,y,18,dim);
 label(c,'暖色 速度方向',x+145,y,18,warm);
 label(c,'冷色 引力方向',x+290,y,18,cool);
}
const projected=(path,project)=>path.pts.map(project);
function continuation(c,path,project,color=warm){const p=path.pts,tail=project(p[p.length-8]),end=project(p.at(-1)),a=Math.atan2(end[1]-tail[1],end[0]-tail[0]);arrow(c,[end[0]-18*Math.cos(a),end[1]-18*Math.sin(a)],end,color);}
export function createVelocityScene(hooks={}){
 if(!tianzhouFrames.complete&&hooks.onFrame)tianzhouFrames.addEventListener('load',hooks.onFrame,{once:true});
 const st={mode:'horizontal',height:100000,v:4.5,age:0,paused:true,started:false,compare:false,solar:0,replay:0,dragging:false,cam:{...GEO}},cache=new Map(),solarCache=new Map();let cannon=null,grain=null,globe=null,backdrop=null,lastState='',insetTime=0,moonMix=0,sunMix=0,earthFrame=null,solarFrame=null,observation=0,flightLead=0;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const directionRocket=new Image();
 directionRocket.onload=()=>hooks.onFrame?.();
 directionRocket.src='assets/cz7-kiu-20261116/cz7-assembled-render.png';
 const directionEarth=new Image();
 directionEarth.onload=()=>hooks.onFrame?.();
 directionEarth.src='assets/earth-blue-marble-globe-4096.webp';
 const direction={condition:'straight',completed:new Set(),flight:directionState(0,'straight')};
 st.direction=direction;
 function resetDirection(){
  st.age=0;st.replay=0;st.paused=true;st.started=false;
  direction.flight=directionState(0,direction.condition);
 }
 const transition=createCannonTransition(()=>hooks.onFrame?.());
 const directEarth=()=>st.mode==='horizontal'&&st.v>=DIRECT_EARTH_SPEED;
 const insetTarget=()=>directEarth()?INSET_PULLBACK_TIME:0;
 const insetMoving=()=>insetTime!==insetTarget();
 const previewMoving=()=>st.mode==='horizontal'&&(moonMix!==Number(escapeView()==='lunar')||sunMix!==Number(escapeView()==='solar'));
 const observationTarget=()=>directEarth()&&st.started?1:0;
 const observationMoving=()=>observation!==observationTarget();
 const videoMode=()=>st.mode==='horizontal'&&!directEarth()&&usesGroundView(st.v,st.height);
 const getGroundPath=v=>{
  const key='ground:'+v;
  if(!cache.has(key))cache.set(key,groundPath(getPath(v).m,st.height));
  return cache.get(key);
 };
 const escapeView=()=>st.v>=16.7?'solar':getPath(st.v).m.kind==='open'?'lunar':null;
 const getPath=(v,far=3)=>{const key=v+':'+far;if(!cache.has(key))cache.set(key,pathOf(v,far,st.height));return cache.get(key);};
 const getSolar=v=>{if(!solarCache.has(v))solarCache.set(v,solarPath(v,v===16.7?8:3,st.height));return solarCache.get(v);};
 const mk=()=>GEARS.find(g=>g.v===st.v)||{name:st.v<7.9?'水平发射':'轨道探索',result:model(st.v,st.height).kind==='impact'?'落回地面':model(st.v,st.height).kind==='closed'?'环绕地球':'逃离地球',note:'理想条件下的水平发射演示。'},duration=()=>st.mode==='vertical'?directionDuration(direction.condition):escapeView()==='lunar'?LUNAR_WIDE_SHOT+.9+LUNAR_ORBIT_TIME:escapeView()?7:(videoMode()?groundPlaybackEnd(reducedMotion.matches):8.85);
 function setValue(v){
  const wasReady=st.age===0&&st.paused;
  transition.reset();
  st.presentation=null;
  st.transition=null;
  st.v=Math.round(Math.max(.5,Math.min(16.7,v))*100)/100;
  if(!wasReady||reducedMotion.matches)insetTime=insetTarget();
  st.shot=insetTime>0||directEarth()?'earth':'close';
  cache.clear();earthFrame=null;solarFrame=null;
  st.age=0;
  st.replay=0;
  flightLead=0;
  st.paused=true;
  st.started=false;
 }
 function getEarthFrame(path){
  if(earthFrame?.path===path&&earthFrame.compare===st.compare)return earthFrame;
  const comparisons=st.compare?EARTH_COMPARISONS.filter(v=>v!==st.v).map(v=>getPath(v)):[];
  const closed=path.m.kind==='closed';
  const view=closed?CLOSED_ORBIT_VIEW:TRAJECTORY_VIEW;
  const fit=fitTrajectories([path.pts,...comparisons.map(p=>p.pts)],earthProject,[EARTH_SHOT.x,EARTH_SHOT.y],EARTH_SHOT.r,view,closed);
  earthFrame={path,compare:st.compare,comparisons,...fit,moves:fit.scale!==1||fit.x!==0||fit.y!==0};
  return earthFrame;
 }
 function earth(c,x,y,r){if(globe)globe(c,x,y,r);else{dot(c,x,y,r,'#596d77');if(grain){c.save();c.beginPath();c.arc(x,y,r,0,tau);c.clip();c.globalAlpha=.2;c.fillStyle=grain;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}}}
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function drawCannon(c,x,y,scale){
  if(!cannon?.naturalWidth)return;
  c.save();
  c.translate(x,y);
  c.rotate(CANNON_ART.rotation);
  c.scale(scale,scale);
  c.drawImage(cannon,-CANNON_ART.muzzle[0],-CANNON_ART.muzzle[1]);
  c.restore();
 }
 function drawTerrain(c,z,groundY,foregroundDepth=0){
  const {x:mx,y:my}=SPEED_AXIS;
  c.save();c.translate(mx*(1-z),my*(1-z));c.scale(z,z);
  for(let layer=0;layer<3;layer++){
   c.fillStyle=['#56647522','#68758033','#7d868144'][layer];c.beginPath();c.moveTo(-600,1100);
   for(let x=-600;x<=2100;x+=60)c.lineTo(x,430+layer*45-45*Math.sin(x/170+layer)-28*Math.cos(x/87));
   c.lineTo(2100,1100);c.lineTo(-600,1100);c.fill();
  }
  c.restore();
  const horizon=groundY-foregroundDepth;
  const ground=c.createLinearGradient(0,horizon,0,groundY+148);
  ground.addColorStop(0,'#879bab');
  ground.addColorStop(.24,'#64788c');
  ground.addColorStop(1,'#263749');
  c.fillStyle=ground;
  c.fillRect(-600,horizon,3000,1200);
  if(foregroundDepth>0){
   c.fillStyle='#192739b0';
   c.beginPath();
   c.ellipse(mx-226,groundY+18,420,29,0,0,tau);
   c.fill();
  }
 }
 const groundDeltaY=(CANNON_ART.ground[0]-CANNON_ART.muzzle[0])*Math.sin(CANNON_ART.rotation)
  +(CANNON_ART.ground[1]-CANNON_ART.muzzle[1])*Math.cos(CANNON_ART.rotation);
 // Continue the visible rock faces beneath the cutout into the foreground.
 function drawMountainFoot(c,muzzleX,muzzleY,scale){
  const top=[[-645,494],[-522,509],[-450,532],[-325,527],[-220,549],[-90,562],[5,560],[149,560]];
  const base=[[-668,578],[-550,588],[-465,590],[-332,586],[-212,595],[-84,594],[21,593],[175,579]];
  const colors=['#77766c','#56595a','#5e6267','#666b70','#73777c','#666a6e','#a89e94'];
  c.save();
  c.translate(muzzleX,muzzleY);
  c.scale(scale,scale);
  colors.forEach((color,i)=>{
   c.fillStyle=color;
   c.beginPath();
   c.moveTo(...top[i]);
   c.lineTo(...top[i+1]);
   c.lineTo(base[i+1][0]+1,base[i+1][1]);
   c.lineTo(...base[i]);
   c.closePath();
   c.fill();
  });
  c.restore();
 }
 let cloudTexture,cloudTime=0;
 const cloudMoving=()=>st.mode==='horizontal'&&!st.started&&!directEarth()&&!reducedMotion.matches;
 function createCloudTexture(){
  const canvas=document.createElement('canvas');
  const width=640,height=144;
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');
  const pixels=context.createImageData(width,height);
  const density=new Float32Array(width*height);
  const hash=(x,y)=>{
   let n=Math.imul(x,374761393)+Math.imul(y,668265263);
   n=Math.imul(n^(n>>>13),1274126177);
   return ((n^(n>>>16))>>>0)/4294967295;
  };
  const noise=(x,y)=>{
   const ix=Math.floor(x),iy=Math.floor(y);
   const u=ease(x-ix),v=ease(y-iy);
   return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
  };
  for(let x=0;x<width;x++){
   const crest=51-34*noise(x/87,5)-17*noise(x/29,13);
   for(let y=0;y<height;y++){
    const billows=19*(noise(x/22,y/13)-.5)+6*(noise(x/7,y/5)-.5);
    density[y*width+x]=ease((y-crest+billows)/17);
   }
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const index=y*width+x,offset=index*4;
   const up=density[Math.max(0,y-9)*width+Math.min(width-1,x+4)];
   const rim=Math.max(0,density[index]-up);
   const body=noise(x/37,y/14);
   const light=ease((.69-y/height*.45+rim*.29+(body-.5)*.48)*1.25);
   pixels.data[offset]=mix(51,143,light);
   pixels.data[offset+1]=mix(65,155,light);
   pixels.data[offset+2]=mix(86,172,light);
   pixels.data[offset+3]=255*density[index];
  }
  context.putImageData(pixels,0,0);
  return canvas;
 }
 function drawLowClouds(c,groundY,alpha=1,clearing=0){
  if(alpha<=0||clearing>=1)return;
  cloudTexture??=createCloudTexture();
  const drift=Math.sin(cloudTime*.29)*108;
  c.save();
  const opacity=c.globalAlpha*alpha*(1-clearing);
  c.globalAlpha=opacity*.65;
  c.drawImage(cloudTexture,-710-drift*.38-650*clearing,groundY-325+190*clearing,2760,360);
  c.globalAlpha=opacity;
  c.drawImage(cloudTexture,-920+drift+820*clearing,groundY-299+250*clearing,3220,390);
  c.restore();
 }
 function drawCannonInset(c,muzzleY,alpha,pullback){
  if(alpha<=0)return;
  const {x,y,size}=CANNON_INSET;
  const mix=(a,b)=>a+(b-a)*pullback;
  const matrix=c.getTransform();
  const left=mix(-matrix.e/matrix.a-4,x),top=mix(-matrix.f/matrix.d-4,y);
  const right=mix((c.canvas.width-matrix.e)/matrix.a+4,x+size);
  const bottom=mix((c.canvas.height-matrix.f)/matrix.d+4,y+size);
  const width=right-left,height=bottom-top;
  const muzzleX=mix(SPEED_AXIS.x,SPEED_AXIS.x-SPEED_AXIS.stroke/2);
  const center=EARTH_SHOT.x,radius=14*pullback;
  c.save();
  c.globalAlpha*=alpha;
  c.beginPath();
  c.roundRect(left,top,width,height,radius);
  c.save();
  c.clip();
  if(pullback>0){
   const sky=c.createLinearGradient(left,top,left,bottom);
   sky.addColorStop(0,'#0f1a31');
   sky.addColorStop(1,'#203c59');
   c.save();c.globalAlpha*=pullback;c.fillStyle=sky;c.fillRect(left,top,width,height);c.restore();
  }
  if(pullback<1){
   c.save();c.globalAlpha*=1-pullback;drawTerrain(c,1.8,SPEED_AXIS.y+574,130);
   drawMountainFoot(c,muzzleX,SPEED_AXIS.y,mix(1,.22/(540/groundDeltaY)));
   c.restore();
  }
  drawCannon(c,muzzleX,SPEED_AXIS.y,mix(540/groundDeltaY,.22));
  drawLowClouds(c,SPEED_AXIS.y+574,1-pullback);
  c.restore();
  c.globalAlpha*=pullback;
  c.strokeStyle='#b0c4d9';
  c.lineWidth=2;
  c.beginPath();
  c.roundRect(left,top,width,height,radius);
  c.stroke();
  if(pullback===1){
   c.beginPath();
   c.moveTo(center-10,bottom-1);
   c.lineTo(center,Math.max(bottom+7,muzzleY));
   c.lineTo(center+10,bottom-1);
   c.fillStyle='#b0c4d9';
   c.fill();
  }
  c.restore();
 }
 function storyboard(c,v,progress,alpha=1,moonZoom=0,sunZoom=0,camera=0){
  if(alpha<=.001)return;
  if(videoMode()&&backdrop&&st.age>0){
   transition.draw(backdrop,st,getGroundPath(v),reducedMotion.matches,hooks.drawSpaceBackdrop);
   if(!reducedMotion.matches){
    const clearing=ease((st.age/TRANSITION_TIMING.launchDelay-.09)/.84);
    drawLowClouds(backdrop,SPEED_AXIS.y+574,1,clearing);
   }
   return;
  }
  if(videoMode()&&backdrop)transition.prepare();
  c.save();c.globalAlpha=alpha;
  const framed=directEarth()||insetTime>0,flat=!framed&&videoMode(),path=flat?getGroundPath(v):getPath(v),wide=ease((st.age-.25)/1.8);
  const space=framed?1:!flat&&v>=7?ease((st.age-1.15)/1.6):0;
  st.shot=space>.99?'earth':wide>.99?'terrain':'close';
  // A single projection carries the muzzle, projectile and planet through the zoom.
  // Local scale is independent of speed: faster shots travel further on screen.
  const r0=1+st.height/6371000;const mx=360,my=230,ground=videoMode()?530:450,impact=getPath(4.5).pts.at(-1);
  const z=1.8-.8*wide,blend=space;
  const angle=p=>Math.atan2(p.x,p.y),radius=p=>p.r??Math.hypot(p.x,p.y);
  const localX=Math.min(1900,850/angle(impact)*z);
  const localY=(ground-my)/(r0-1)*z;
  const radiusPx=EARTH_SHOT.r;
  const muzzleX=mx+((framed?EARTH_SHOT.x:PULLBACK_EARTH_X)-mx)*blend,muzzleY=my+(EARTH_SHOT.y-radiusPx*r0-my)*blend;
  // Local view unwraps the spherical surface to a flat ground line. During
  // pullback, both the ground and trajectory blend into the same globe projection.
  const localWeight=(1-blend)**3;
  const frame=directEarth()&&(st.age>0||moonZoom>0||camera>0)?getEarthFrame(path):null;
  const framing=frame?ease((camera-.45)/.55):0;
  const lunarTransfer=moonZoom*framing;
  const globePoint=([x,y])=>[
   mix(x,TRANSFER_EARTH.x,lunarTransfer),mix(y,TRANSFER_EARTH.y,lunarTransfer)
  ];
  const cameraScale=frame?1+(frame.scale-1)*framing:1;
  const zoom=1-.27*moonZoom-.48*sunZoom;
  const framePoint=([x,y])=>[
   muzzleX+(x*cameraScale+(frame?.x??0)*framing-muzzleX)*zoom,
   muzzleY+(y*cameraScale+(frame?.y??0)*framing-muzzleY)*zoom
  ];
  const project=flat?p=>[muzzleX+projectGroundDistance(p.x),muzzleY+(r0-p.r)*localY]
   :framed?p=>framePoint(earthProject(p)):p=>[
   muzzleX+localWeight*localX*(v>=7?p.x/radius(p):angle(p))+(1-localWeight)*p.x*radiusPx,
   muzzleY+localWeight*(r0-radius(p))*localY+(1-localWeight)*(r0-p.y)*radiusPx
  ];
  // Animation uses the page-wide canvas; the stage canvas is only for labels/controls.
  // Keep the same projection so changing layers never shifts the muzzle or projectile.
  const visual=backdrop||c;visual.save();visual.globalAlpha=alpha;
  if(!backdrop){visual.beginPath();visual.rect(0,framed?0:155,1500,framed?650:425);visual.clip();}
  const insetProgress=ease(insetTime/INSET_PULLBACK_TIME);
  const terrainOpacity=1-ease(space/.48);
  const globeOpacity=ease((space-.42)/.58);
  const globeCenter=globePoint(framePoint([muzzleX,muzzleY+r0*radiusPx]));
  if(globeOpacity>0&&sunZoom===0){
   visual.save();
   visual.globalAlpha=alpha*globeOpacity*(framed?ease((insetProgress-.24)/.76):1);
   earth(visual,...globeCenter,mix(radiusPx*cameraScale*zoom,TRANSFER_EARTH.r,lunarTransfer));
   visual.restore();
  }
  const groundY=project({x:0,y:1,r:1})[1];
  if(terrainOpacity>0){
   visual.save();visual.globalAlpha=alpha*terrainOpacity;
   if(flat&&backdrop){
    drawTerrain(visual,z,groundY+34,130);
    drawMountainFoot(visual,muzzleX,muzzleY,1);
   }else drawTerrain(visual,z,groundY);
   visual.restore();
  }
  if(st.compare&&!insetMoving()&&(!framed||frame)){
   const comparisons=frame?frame.comparisons:EARTH_COMPARISONS.filter(value=>value!==v).map(value=>getPath(value));
   visual.save();if(frame?.moves)visual.globalAlpha*=framing;
   for(const other of comparisons){
    if(flat&&other.m.kind!=='impact')continue;
    const points=flat?getGroundPath(other.m.vKm).pts:other.pts;
    line(visual,points.map(project),'#a8c4c655',1.3,[4,7]);
   }
   visual.restore();
  }
  if(terrainOpacity>0){
   visual.save();visual.globalAlpha=alpha*terrainOpacity;
   drawCannon(visual,muzzleX,muzzleY,((ground-my)*z*(1-blend)+(r0-1)*radiusPx*blend)/groundDeltaY);
   if(flat&&backdrop&&!st.started)drawLowClouds(visual,groundY+34);
   visual.restore();
  }
  if(framed){
   if(st.age===0&&insetProgress===1&&sunZoom===0)dot(visual,...framePoint([muzzleX,muzzleY]),6,warm);
  }
  if(st.age>0&&moonZoom<1&&(!framed||camera===1)){
   if(frame){
    visual.save();
    if(frame.moves)visual.globalAlpha*=framing;
    line(visual,path.pts.map(project),'#a9b0bf80',1.5,[4,7]);
    visual.restore();
    orbitLegend(c,path.m.kind==='closed'?CLOSED_ORBIT_CENTER_X-206:65,91);
   }
   const head=positionAt(path,progress),pts=path.pts.slice(0,head.index).map(project);
   const point=project(head),center=project({x:0,y:0,r:0});
   pts.push(point);
   line(visual,pts,ink,2.6);
   if(framed&&path.m.kind==='open'&&progress>=1)continuation(visual,path,project,ink);
   const landed=path.m.kind==='impact'&&progress>=1;
   const gravity=flat?1:1/head.r**2,centrifugal=flat?0:path.m.h**2/head.r**3;
   if(!landed){
    if(flat){
     const end=[point[0],point[1]+68];
     arrow(visual,point,end,cool);
     label(visual,'重力',end[0]+12,end[1],16,cool);
    }else if(frame)orbitVectors(visual,point,project(forwardPoint(path,head)),center,Math.max(1,cameraScale));
    else{
     const inward=project({x:head.x*.999,y:head.y*.999,r:head.r*.999});
     const dx=inward[0]-point[0],dy=inward[1]-point[1],length=Math.hypot(dx,dy)||1;
     for(const [amount,color,name] of [[68*gravity,cool,'引力'],[-Math.min(180,68*centrifugal),'#edb27b','离心惯性力']]){
      const end=[point[0]+dx/length*amount,point[1]+dy/length*amount];
      arrow(visual,point,end,color);
      label(visual,name,end[0]+12,end[1],16,color);
     }
    }
   }
   dot(visual,...point,6,warm);
   st.presentation={projectile:point,groundY,landed,kind:path.m.kind,progress};
   st.forces={gravity,centrifugal,head,center,frame:flat?'flat':frame?'inertial':'rotating',circularSpeed:7.9/Math.sqrt(r0)};
  }
  visual.restore();
  if(flat&&progress>=1){
   const end=project(path.pts.at(-1)),startX=muzzleX,y=groundY+28,rangeKm=path.pts.at(-1).x;
   line(c,[[startX,y],[end[0],y]],cool,1.5);
   for(const x of [startX,end[0]])line(c,[[x,y-8],[x,y+8]],cool,1.5);
   c.save();c.textAlign='center';label(c,'射程 '+rangeKm.toFixed(1)+' km（示意）',(startX+end[0])/2,y+35,23,ink);c.restore();
   st.presentation.rangeKm=rangeKm;st.presentation.rangeStart=[startX,y];st.presentation.rangeEnd=[end[0],y];
  }
  st.adjustment={shot:st.shot,muzzle:[muzzleX,muzzleY],axisOrigin:[360,230]};
  c.restore();
  return globeCenter;
 }
 function drawSpeedAxis(c,v){
   const {x,y,w,stroke}=SPEED_AXIS,f=(v-.5)/16.2;
   line(c,[[x,y],[x+w,y]],'#8ea7b544',stroke);
   line(c,[[x,y],[x+w*f,y]],'#a8c4c6',stroke);
   for(const tick of [1,7.9,11.2,16.7]){const tx=x+w*(tick-.5)/16.2;line(c,[[tx,y-10],[tx,y+10]],ink,2);label(c,String(tick),tx-15,y+48,22,dim);}
   const tx=x+w*f;line(c,[[tx,y-20],[tx,y+20]],warm,7);
   c.save();
   c.textAlign='center';
   label(c,String(v)+' km/s',tx,y-42,30,ink);
   c.restore();
 }

 function lunar(c,progress,alpha,flight,camera,earthCenter,overviewRadius,arrival,bodyRadius){
  const visual=backdrop||c,{orbitRadius}=MOON;
  const dx=MOON.x-TRANSFER_EARTH.x,dy=MOON.y-TRANSFER_EARTH.y;
  const distance=Math.hypot(dx,dy);
  const entryAngle=Math.atan2(dy,dx);
  const a=(distance+orbitRadius+TRANSFER_EARTH.r)/2;
  const b=Math.sqrt(a**2-(a-TRANSFER_EARTH.r)**2);
  const transfer=angle=>{
   const along=a*(1+Math.cos(angle))-TRANSFER_EARTH.r;
   const across=-b*Math.sin(angle);
   return [TRANSFER_EARTH.x+(along*dx-across*dy)/distance,
    TRANSFER_EARTH.y+(along*dy+across*dx)/distance];
  };
  // Orthographic projection of the orbital plane with a tilted camera.
  const tilt=mix(1.05,0,camera),roll=mix(.29,0,camera);
  const radius=mix(overviewRadius,distance,arrival);
  const orbit=({x,y})=>[
   earthCenter[0]+radius*(x*Math.cos(roll)-y*Math.cos(tilt)*Math.sin(roll)),
   earthCenter[1]+radius*(x*Math.sin(roll)+y*Math.cos(tilt)*Math.cos(roll))
  ];
  const phase=mix(Math.acos(.94),entryAngle,arrival);
  const [x,y]=orbit({x:Math.cos(phase),y:Math.sin(phase)});
  const r=mix(bodyRadius,MOON.r,arrival);
  const center=[x,y],angle=entryAngle+tau*progress;
  visual.save();
  visual.globalAlpha*=alpha;
  const drawOrbit=(end,color,width,dash)=>{
   visual.strokeStyle=color;
   visual.lineWidth=width;
   visual.setLineDash(dash);
   visual.beginPath();
   visual.arc(x,y,orbitRadius,entryAngle,end);
   visual.stroke();
  };
  line(visual,orbitRing(orbit),'#a8c4c6a0',1.5);
  const shade=visual.createRadialGradient(x-r*.36,y-r*.32,0,x,y,r*1.15);
  shade.addColorStop(0,'#e5dfce');
  shade.addColorStop(.56,'#bfbab0');
  shade.addColorStop(1,'#535c6b');
  dot(visual,x,y,r,shade);
  label(visual,'月球',x-22,y+r+27,22,ink);
  if(!flight){visual.restore();return;}
  const {progress:transferProgress,captured}=flight;
  const approach=amount=>Array.from({length:121},(_,i)=>transfer(Math.PI*(1-amount*i/120)));
  line(visual,approach(1),'#a9b0bf80',1.5,[4,7]);
  line(visual,approach(transferProgress),ink,2.6);
  drawOrbit(entryAngle+tau,'#a9b0bf80',1.5,[4,7]);
  const point=captured?[x+orbitRadius*Math.cos(angle),y+orbitRadius*Math.sin(angle)]
   :transfer(Math.PI*(1-transferProgress));
  if(captured){
   drawOrbit(angle,ink,2.6,[]);
   orbitVectors(visual,point,[point[0]-Math.sin(angle),point[1]+Math.cos(angle)],center);
  }
  dot(visual,...point,6,warm);
  label(c,'地月转移与绕月 · 任务示意',65,95,23,ink);
  visual.restore();
  st.presentation={projectile:point,kind:captured?'lunar-orbit':'lunar-transfer',
   progress:captured?progress:transferProgress,landed:false};
 }

 function solarProjection(){
  const path=getSolar(16.7);
  const bound=st.compare?getSolar(11.2):null;
  // Anchor the projection to Earth's upper edge, directly under the callout.
  const anchor=[EARTH_SHOT.x,earthProject({x:0,y:getPath(st.v).m.r0})[1]];
  const cos=Math.cos(.56),sin=Math.sin(.56);
  const raw=p=>[sin*p.x+cos*(1-p.y),.16-cos*p.x+sin*(1-p.y)];
  if(!solarFrame||solarFrame.compare!==st.compare){
   const [cx,cy]=raw({x:0,y:0});
   const points=[...path.pts,...(bound?.pts??[])].map(raw);
   points.push([cx-1,cy-1],[cx+1,cy+1]);
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
   const scale=Math.min(122,(anchor[0]-42)/-Math.min(...xs),(1365-anchor[0])/Math.max(...xs),
    (anchor[1]-128)/-Math.min(...ys),(628-anchor[1])/Math.max(...ys));
   solarFrame={compare:st.compare,scale};
  }
  const project=p=>{const [x,y]=raw(p);return [anchor[0]+x*solarFrame.scale,anchor[1]+y*solarFrame.scale];};
  return {project,path,bound,radius:solarFrame.scale};
 }
 function solar(c,progress,alpha,camera,earthRadius){
  c.save();
  c.globalAlpha=alpha;
  const {project:flat,path,bound,radius:s}=solarProjection();
  const [ex,ey]=flat({x:0,y:1});
  const angle=mix(.06,.56,camera);
  const inclination=mix(1.13,0,camera);
  const scale=mix(495,s,camera);
  const project=({x,y})=>{
   const across=1-y,depth=-x*Math.cos(inclination);
   return [
    ex+scale*(across*Math.cos(angle)-depth*Math.sin(angle)),
    ey+earthRadius+scale*(across*Math.sin(angle)+depth*Math.cos(angle))
   ];
  };
  const [cx,cy]=project({x:0,y:0});
  const sunRadius=mix(145,Math.max(10,s*.27),camera);
  const head=positionAt(path,progress);
  if(st.started){label(c,'以太阳为参照',65,145,26);label(c,'顺地球公转方向出发 · 轨迹示意',65,185,21,cool);}
  const visual=backdrop||c;
  visual.save();
  visual.globalAlpha=alpha;
  line(visual,orbitRing(project),'#a8c4c6a0',1.5);
  const glow=visual.createRadialGradient(cx,cy,sunRadius*.2,cx,cy,sunRadius*1.65);
  glow.addColorStop(0,'#e0bb7755');
  glow.addColorStop(1,'#e0bb7700');
  visual.fillStyle=glow;
  visual.fillRect(cx-sunRadius*1.65,cy-sunRadius*1.65,sunRadius*3.3,sunRadius*3.3);
  const surface=visual.createRadialGradient(cx-sunRadius*.28,cy-sunRadius*.3,0,cx,cy,sunRadius*1.15);
  surface.addColorStop(0,'#fff2be');
  surface.addColorStop(.65,'#eac27d');
  surface.addColorStop(1,'#b77642');
  dot(visual,cx,cy,sunRadius,surface);
  label(visual,'太阳',cx-22,cy+sunRadius+27,21);
  if(camera===1&&st.age>flightLead){
   if(bound){
    line(visual,projected(bound,project),'#a8c4c699',1.4,[5,6]);
    label(visual,'11.2：仍绕太阳',100,605,19,cool);
   }
   line(visual,projected(path,project),'#d8b07475',1.5,[3,7]);
   const point=project(head),heading=project(forwardPoint(path,head));
   line(visual,path.pts.slice(0,head.index).map(project).concat([point]),ink,2.4);
   orbitVectors(visual,point,heading,[cx,cy]);
   dot(visual,...point,4,ink);
   orbitLegend(c,65,220);
   if(progress>=1)continuation(visual,path,project);
   st.presentation={projectile:point,kind:'solar-escape',progress,landed:false};
  }
  visual.restore();
  c.restore();
 }
 return{get value(){return st.v;},state:st,setHeight(h){if(![1000,10000,100000].includes(h))return;st.height=h;cache.clear();solarCache.clear();setValue(st.v);},setMode(mode){transition.stop();st.mode=mode;observation=0;insetTime=insetTarget();resetDirection();},setDirection(condition){if(st.started&&st.age<duration()||!DIRECTION_CONDITIONS.includes(condition))return;direction.condition=condition;resetDirection();},adjustDirection:resetDirection,gears:GEARS.map(g=>g.v),setValue,name:()=>mk().name,note:()=>mk().note,cam:()=>({...GEO}),toPixel:(x,y)=>[GEO.cx+GEO.s*x,GEO.cy-GEO.s*y],
  nudge(dir){const values=GEARS.map(g=>g.v);const next=dir<0?[...values].reverse().find(v=>v<st.v):values.find(v=>v>st.v);setValue(next??st.v);hooks.onChange?.();},down:()=>false,move(){},up(){},setBackdrop:context=>backdrop=context,setGrain:v=>grain=v,setGlobe:fn=>globe=fn,setCannon:im=>cannon=im,
  get duration(){return duration();},suspend(){st.paused=true;insetTime=insetTarget();transition.stop();},
  replay(){if(st.mode==='vertical')resetDirection();else transition.reset();st.presentation=null;st.age=0;st.replay=0;flightLead=directEarth()&&!reducedMotion.matches?OBSERVATION_TIME*(1-observation):0;st.paused=false;st.started=true;},togglePause(){st.paused=!st.paused;},toggleCompare(){st.compare=!st.compare;},needsFrame:()=>st.mode==='vertical'?st.started&&!st.paused:cloudMoving()||insetMoving()||previewMoving()||observationMoving()&&(!st.started||!st.paused)||!st.paused&&st.age<duration(),
  draw(c,W,H,dt){
   const frameTime=Math.min(dt||.016,.05);
   if(st.mode==='vertical'){
    if(st.started&&!st.paused){
     st.age+=frameTime;
     if(direction.condition==='straight')st.age=Math.min(duration(),st.age);
     const previous=direction.flight.phase;
     direction.flight=directionState(st.age,direction.condition);
     if(previous!==direction.flight.phase){
      const phase=direction.flight.phase;
      if(phase==='landed')st.paused=true;
      if(phase==='landed'||phase==='orbited')direction.completed.add(direction.condition);
      hooks.onChange?.();
     }
    }
    const visual=backdrop||c;
    const transform=visual.getTransform();
    const horizon={
     x:(visual.canvas.width*.492-transform.e)/transform.a,
     y:(visual.canvas.height*.719-transform.f)/transform.d,
     radius:visual.canvas.width*.9/transform.a
    };
    const closeup=reducedMotion.matches&&st.started?0:1-ease(st.age/LIFTOFF);
    drawDirectionScene(visual,{time:st.age,direction,earth,earthImage:directionEarth,rocket:directionRocket,horizon,closeup});
    return;
   }
   if(cloudMoving())cloudTime=(cloudTime+frameTime)%(tau/.29);
   const view=st.mode==='horizontal'?escapeView():null;
   const move=(value,target)=>{
    const step=frameTime/.65;
    return reducedMotion.matches||Math.abs(target-value)<=step?target:value+Math.sign(target-value)*step;
   };
   moonMix=move(moonMix,Number(view==='lunar'));
   sunMix=move(sunMix,Number(view==='solar'));
   const previewSettled=!insetMoving()&&!previewMoving();
   if(!st.started||!st.paused&&previewSettled){
    const target=observationTarget(),step=frameTime/OBSERVATION_TIME;
    observation=reducedMotion.matches||Math.abs(target-observation)<=step
     ?target:observation+Math.sign(target-observation)*step;
   }
   const camera=ease(observation);
   st.observation=camera;
   if(insetMoving()){
    const target=insetTarget(),remaining=target-insetTime;
    insetTime=reducedMotion.matches||Math.abs(remaining)<=frameTime
     ? target
     : insetTime+Math.sign(remaining)*frameTime;
   }else if(!previewMoving()&&!st.paused&&(!videoMode()||transition.ready())){st.age=Math.min(duration(),st.age+frameTime);if(st.age>=duration()){st.paused=true;hooks.onChange?.();}}st.replay=st.age/duration();const state=String(st.v)+' km/s';if(state!==lastState){lastState=state;hooks.onState?.(state);}const g=mk(),ready=st.age===0&&st.paused&&!st.started;
   if(!ready){
    const centered=directEarth()&&getPath(st.v).m.kind==='closed';
    c.save();
    if(centered)c.textAlign='center';
    label(c,String(st.v)+' km/s · '+g.result,centered?CLOSED_ORBIT_CENTER_X:65,55,32);
    c.restore();
   }
   const lunarCapture=LUNAR_WIDE_SHOT+.9;
   const flightProgress=end=>Math.max(0,Math.min(1,(st.age-flightLead)/(end-flightLead)));
   const moon=ease(moonMix),sun=ease(sunMix);
   st.solar=sun;
   st.escapeView=sun>0&&view==='solar'?'solar':moon>0&&view==='lunar'?'lunar':null;
   st.escapeProgress=view==='solar'?flightProgress(duration()):view==='lunar'?Math.max(0,(st.age-lunarCapture)/(duration()-lunarCapture)):0;
   let progress=flightProgress(4);
   if(!view&&!videoMode()&&getPath(st.v).m.kind==='closed'){
    progress=directEarth()?flightProgress(duration()):st.age*.032+(1-duration()*.032)*ease((st.age-2.15)/(duration()-2.15));
   }
   const anchorY=earthProject({x:0,y:getPath(st.v).m.r0})[1];
   const nearRadius=EARTH_SHOT.r*(1-.27*moon);
   const solarRadius=sun>0?mix(64,solarProjection().radius*.16,camera):64;
   const earthRadius=mix(nearRadius,solarRadius,sun);
   const globeCenter=storyboard(c,st.v,progress,1-sun,moon,sun,camera);
   if(sun>0){
    const visual=backdrop||c;
    solar(c,st.escapeProgress,sun,camera,earthRadius);
    earth(visual,EARTH_SHOT.x,anchorY+earthRadius,earthRadius);
    if(!st.started)dot(visual,EARTH_SHOT.x,anchorY+earthRadius*sun,4,warm);
   }
   const moonVisibility=ease(insetTime/INSET_PULLBACK_TIME)*Math.max(moon,sun);
   const lunarFlight=view==='lunar'&&st.started&&camera===1
    ?{progress:flightProgress(lunarCapture),captured:st.age>=lunarCapture}:null;
   if(moonVisibility>0)lunar(c,st.escapeProgress,moonVisibility,lunarFlight,camera,
    sun>0||!globeCenter?[EARTH_SHOT.x,anchorY+earthRadius]:globeCenter,
    mix(mix(286,235,moon),mix(110,45,camera),sun),
    camera*moon,mix(35,mix(16,9,camera),sun));
   if(directEarth()||insetTime>0){
    const launchY=earthProject({x:0,y:getPath(st.v).m.r0})[1];
    drawCannonInset(backdrop||c,launchY,1-ease(camera/.45),ease(insetTime/INSET_PULLBACK_TIME));
   }
   if(st.age===0&&!st.started)drawSpeedAxis(c,st.v);

  }
 };
}
// Normalized teaching geometry and display time, not a launch vehicle simulation.
const LIFTOFF=1.3, TURN_TIME=2.7, INSERTION=LIFTOFF+TURN_TIME;
const CLIMB=.08, CLIMB_SPEED=2*CLIMB/LIFTOFF, COAST_GRAVITY=.057;
const STRAIGHT_CUTOFF_SPEED=.036;
const POWERED_DECELERATION=(CLIMB_SPEED-STRAIGHT_CUTOFF_SPEED)/TURN_TIME;
const STRAIGHT_CUTOFF_RADIUS=1+CLIMB+(CLIMB_SPEED+STRAIGHT_CUTOFF_SPEED)*TURN_TIME/2;
const ORBIT_RADIUS=1.32, TURN_ANGLE=.97, ORBIT_RATE=3*TURN_ANGLE/TURN_TIME;
const ORBIT_END=INSERTION+tau/ORBIT_RATE;
const SAMPLE_STEP=1/120;
export const DIRECTION_CONDITIONS=['straight','turn'];

const coast=(()=>{
 const samples=[{r:STRAIGHT_CUTOFF_RADIUS,vr:STRAIGHT_CUTOFF_SPEED}];
 let {r,vr}=samples[0];
 while(r>1){
  const half=vr-SAMPLE_STEP*COAST_GRAVITY/(2*r*r);
  r=Math.max(1,r+half*SAMPLE_STEP);
  vr=half-SAMPLE_STEP*COAST_GRAVITY/(2*r*r);
  samples.push({r,vr});
 }
 return samples;
})();
const LANDING=INSERTION+(coast.length-1)*SAMPLE_STEP;

export const directionDuration=condition=>condition==='turn'?ORBIT_END:LANDING;

export function directionState(time,condition){
 let r=1,vr=0,angle=0,rate=0,phase='ready',powered=false;
 if(time>0&&time<LIFTOFF){
  const u=time/LIFTOFF;
  r+=CLIMB*u*u;vr=CLIMB_SPEED*u;phase='ascent';powered=true;
 }else if(time>=LIFTOFF&&time<INSERTION&&condition==='straight'){
  const elapsed=time-LIFTOFF;
  vr=CLIMB_SPEED-POWERED_DECELERATION*elapsed;
  r=1+CLIMB+(CLIMB_SPEED+vr)*elapsed/2;
  phase='straight';powered=true;
 }else if(time>=INSERTION&&condition==='straight'){
  const index=Math.min(coast.length-1,(time-INSERTION)/SAMPLE_STEP);
  const low=Math.floor(index),a=coast[low],b=coast[Math.ceil(index)];
  r=mix(a.r,b.r,index-low);vr=mix(a.vr,b.vr,index-low);
  phase=time>=LANDING?'landed':vr>0?'coast':'fall';
  if(phase==='landed'){r=1;vr=0;}
 }else if(time>=LIFTOFF&&time<INSERTION){
  const u=(time-LIFTOFF)/TURN_TIME,u2=u*u,u3=u2*u;
  const rise=ORBIT_RADIUS-1-CLIMB,slope=CLIMB_SPEED*TURN_TIME;
  r=1+CLIMB+rise*(3*u2-2*u3)+slope*(u3-2*u2+u);
  vr=(rise*(6*u-6*u2)+slope*(3*u2-4*u+1))/TURN_TIME;
  angle=TURN_ANGLE*u3;rate=ORBIT_RATE*u2;phase='turn';powered=true;
 }else if(time>=INSERTION){
  r=ORBIT_RADIUS;angle=TURN_ANGLE+((time-INSERTION)*ORBIT_RATE)%tau;
  rate=ORBIT_RATE;phase=time>=ORBIT_END?'orbited':'orbit';
 }
 const sin=Math.sin(angle),cos=Math.cos(angle);
 return {x:r*sin,y:-r*cos,vx:vr*sin+r*rate*cos,vy:-vr*cos+r*rate*sin,phase,powered};
}

// Leave clearance for the solar panels at the top and bottom of the orbit.
const DIRECTION_VIEW={x:755,y:327,r:220};
const directionPoint=({x,y})=>[DIRECTION_VIEW.x+DIRECTION_VIEW.r*x,DIRECTION_VIEW.y+DIRECTION_VIEW.r*y];
const launchPoint=directionPoint({x:0,y:-1});
const apexY=DIRECTION_VIEW.y-DIRECTION_VIEW.r*Math.max(...coast.map(sample=>sample.r));
const directionTrails={
 straight:[launchPoint,[launchPoint[0],apexY]],
 turn:Array.from({length:Math.ceil(ORBIT_END/SAMPLE_STEP)+1},(_,i)=>
  directionPoint(directionState(Math.min(ORBIT_END,i*SAMPLE_STEP),'turn')))
};

function drawDirectionScene(c,{time,direction,earth,earthImage,rocket,horizon,closeup}){
 const {condition,completed,flight}=direction,{x,y,r}=DIRECTION_VIEW;
 const other=condition==='turn'?'straight':'turn';
 const showComparison=time>0&&completed.has(other);
 const zoom=1+(horizon.radius/r-1)*closeup;
 const cameraX=x+(horizon.x-x)*closeup;
 const cameraHorizon=y-r+(horizon.y-(y-r))*closeup;
 c.save();
 c.translate(cameraX,cameraHorizon);
 c.scale(zoom,zoom);
 c.translate(-x,r-y);
 const nearOpacity=earthImage.naturalWidth?closeup:0;
 if(nearOpacity<1)earth(c,x,y,r);
 if(nearOpacity>0){
  c.save();
  c.globalAlpha*=nearOpacity;
  c.drawImage(earthImage,x-r,y-r,2*r,2*r);
  c.restore();
 }
 if(showComparison){
  line(c,directionTrails[other],'#a8c4c6b0',2.5,[5,7]);
 }
 const [px,py]=directionPoint(flight);
 const releaseElapsed=condition==='turn'?time-LIFTOFF:-1;
 if(time>0){
  const points=condition==='straight'
   ?[launchPoint,[px,flight.phase==='fall'||flight.phase==='landed'?apexY:py]]
   :flight.phase==='orbited'?directionTrails.turn
    :[...directionTrails.turn.slice(0,1+Math.floor(time/SAMPLE_STEP)),[px,py]];
  line(c,points,warm,3);
  if(releaseElapsed>=0){
   const turn=directionPoint(directionState(LIFTOFF,condition));
   dot(c,...turn,4,cool);
   if(releaseElapsed<1){
    label(c,'释放卫星',turn[0]-120,turn[1]-12,22,cool);
    c.save();
    c.translate(...turn);
    c.scale(1.55,1.55);
    drawPayloadSeparation(c,rocket,releaseElapsed);
    c.restore();
   }
  }
 }
 if(releaseElapsed>=0)drawDirectionAcceleration(c,px,py,flight);
 const attitude=flight.phase==='turn'?directionState(Math.min(INSERTION,time+.28),condition):flight;
 const tilt=releaseElapsed>=0?Math.atan2(attitude.vx,-attitude.vy):0;
 c.save();c.translate(px,py);
 const rocketScale=mix(1.55,1.85,closeup)/zoom;
 c.scale(rocketScale,rocketScale);
 c.translate(0,-17*(flight.phase==='landed'?1:closeup));
 c.globalAlpha*=1-closeup;
 if(flight.phase==='orbit'||flight.phase==='orbited')drawTianzhou(c,tilt,1);
 else if(releaseElapsed>=0)drawTurningPayload(c,tilt);
 else drawDirectionRocket(c,rocket,tilt,flight.powered,time);
 c.restore();
 c.restore();
 if(closeup>0)drawDirectionInset(c,rocket,tilt,flight.powered,closeup,time);
 if(showComparison)label(c,other==='straight'?'虚线 · 保持竖直':'虚线 · 升空中转向',1060,140,22,cool);
}

function drawDirectionAcceleration(c,x,y,flight){
 const radius=Math.hypot(flight.x,flight.y);
 const rx=flight.x/radius,ry=flight.y/radius;
 const draw=(dx,dy,length,name,color)=>{
  const start=[x+dx*34,y+dy*34],end=[start[0]+dx*length,start[1]+dy*length];
  c.shadowColor='#122037';
  c.shadowBlur=5;
  arrow(c,start,end,color);
  c.textBaseline='middle';
  c.textAlign=dx<-.3?'right':'left';
  const offset=dx<-.3?-10:10;
  label(c,name,end[0]+offset,end[1],20,color);
 };
 c.save();
 // The two arrows are qualitative, with separate directions for horizontal
 // propulsion and gravity. Coasting in orbit only retains the gravity arrow.
 draw(-rx,-ry,49,'引力','#8dddf1');
 if(flight.phase==='turn')draw(-ry,rx,47,'推进加速度','#ffdb93');
 c.restore();
}

const tianzhouFrames=new Image();
tianzhouFrames.src=new URL('./assets/tianzhou-solar/deployment.webp',import.meta.url).href;

export function drawTianzhou(c,tilt,progress){
 c.save();
 c.rotate(tilt);
 if(tianzhouFrames.naturalWidth){
  const frame=Math.round(15*Math.max(0,Math.min(1,progress)));
  const tile=tianzhouFrames.naturalWidth/4;
  c.drawImage(tianzhouFrames,frame%4*tile,Math.floor(frame/4)*tile,tile,tile,-30,-30,60,60);
 }
 c.restore();
}

function drawTurningPayload(c,tilt){
 c.save();
 c.rotate(tilt);
 c.fillStyle='#e5c57b';
 c.strokeStyle='#fff0c6';
 c.beginPath();c.roundRect(-6,-10,12,20,4);c.fill();c.stroke();
 c.restore();
}

// The fairing and spent stage are presentation elements, timed by the flight clock.
function drawPayloadSeparation(c,rocket,elapsed){
 const progress=1-(1-elapsed)**2;
 const opacity=1-Math.max(0,(elapsed-.5)*2);
 const width=rocket.naturalWidth?34*rocket.naturalWidth/rocket.naturalHeight:12;
 const half=width/2;
 const shellBottom=-5;
 const drawPiece=(left,top,right,bottom,x,y,rotation)=>{
  c.save();
  c.translate(x,y);
  c.rotate(rotation);
  c.globalAlpha*=opacity;
  c.beginPath();
  c.rect(left,top,right-left,bottom-top);
  c.clip();
  drawDirectionRocket(c,rocket,0,false);
  c.restore();
 };
 // The body slips back while the two fairing halves peel away from the payload.
 drawPiece(-half,shellBottom,half,17,0,mix(0,35,progress),0);
 for(const side of [-1,1]){
  drawPiece(side<0?-half:0,-17,side<0?0:half,shellBottom,
   side*mix(2,31,progress),mix(11,24,progress),side*.8*progress);
 }
}

function drawDirectionRocket(c,rocket,tilt,powered,time){
 const height=34;
 c.rotate(tilt);
 if(powered){
  c.save();
  c.translate(0,-height/2);
  c.scale(height/ROCKET_HEIGHT,height/ROCKET_HEIGHT);
  drawLiftoffExhaust(c,time);
  c.restore();
 }
 if(rocket.naturalWidth){
  const width=height*rocket.naturalWidth/rocket.naturalHeight;
  c.drawImage(rocket,-width/2,-height/2,width,height);
 }else{
  c.fillStyle=ink;c.beginPath();c.moveTo(0,-16);c.lineTo(6,15);c.lineTo(-6,15);c.closePath();c.fill();
 }
}

function drawDirectionInset(c,rocket,tilt,powered,opacity,time){
 const {width,height}=c.canvas;
 const x=width*.54,y=height*.288,w=width*.306,h=height*.48;
 const pointerY=y+h*.87;
 c.save();
 c.resetTransform();
 c.globalAlpha*=opacity;
 c.lineWidth=width*.003;
 c.strokeStyle='#b9cdd8';
 c.fillStyle='#15344d';
 c.beginPath();
 c.roundRect(x,y,w,h,width*.008);
 c.fill();c.stroke();
 c.fillStyle=c.strokeStyle;
 c.beginPath();
 c.moveTo(x,pointerY-height*.012);
 c.lineTo(x-width*.011,pointerY);
 c.lineTo(x,pointerY+height*.012);
 c.fill();
 c.translate(x+w/2,y+h/2);
 const scale=h*.72/34;
 c.scale(scale,scale);
 drawDirectionRocket(c,rocket,tilt,powered,time);
 c.restore();
}

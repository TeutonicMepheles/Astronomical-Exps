import {createMuzzleSequence} from './muzzle-sequence.js';
// Camera and trajectory presentation; physical conics remain in orbital-model.js.
import {positionAt,model,pathOf,groundPath,projectGroundDistance} from './orbital-model.js';
import {CAMERA_TRACKS} from './cannon-camera-tracks.js';
const ROOT='assets/cannon-transition/';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const FOCUS=[790,444.55],MUZZLE=[820.565,66.017];
const launchRadius=Math.hypot(MUZZLE[0]-FOCUS[0],MUZZLE[1]-FOCUS[1]);
const angle=Math.atan2(MUZZLE[0]-FOCUS[0],FOCUS[1]-MUZZLE[1]);
export const usesGroundView=(v,height)=>model(v,height).kind==='impact';
// One similarity transform, never a radial deformation: circles and ellipses
// remain circles and ellipses, with the Earth center as their focus.
export function globeProjection(path){
 const scale=launchRadius/path.m.r0,ca=Math.cos(angle),sa=Math.sin(angle);
 return p=>[FOCUS[0]+scale*(p.x*ca+p.y*sa),FOCUS[1]+scale*(p.x*sa-p.y*ca)];
}
export function fitTrajectory(points){
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const minX=Math.min(500,...xs)-22,maxX=Math.max(1080,...xs)+22,minY=Math.min(50,...ys)-22,maxY=Math.max(735,...ys)+22;
 const scale=Math.min(1,1160/(maxX-minX),515/(maxY-minY));
 return{scale,x:980-scale*(minX+maxX)/2,y:402.5-scale*(minY+maxY)/2};
}
// The mountain foot and landing point share this plane in ground.png.
const GROUND_Y=616;
const GROUND_MUZZLE=[479,417.5];
const RANGE_DELAY=.18;
const RANGE_DRAW_TIME=.82;
export const TRANSITION_TIMING={rate:8,launchDelay:1.5,groundEnd:1.5,earthEnd:2.75,fitStart:2.3,fitEnd:2.75,groundFlight:5,earthFlight:7.35};
const groundLandingTime=TRANSITION_TIMING.launchDelay+TRANSITION_TIMING.groundFlight;
const rangeStartTime=groundLandingTime+RANGE_DELAY;
const rangeEndTime=rangeStartTime+RANGE_DRAW_TIME;
export const groundPlaybackEnd=reducedMotion=>reducedMotion?groundLandingTime:rangeEndTime;
export function flightProgress(age,low){
 const flightAge=Math.max(0,age-TRANSITION_TIMING.launchDelay);
 return Math.min(1,flightAge/(low?TRANSITION_TIMING.groundFlight:TRANSITION_TIMING.earthFlight));
}
export function videoAnchor(index,time){
 const rows=CAMERA_TRACKS[index];let hi=rows.findIndex(r=>r[0]>=time);if(hi<0)return rows.at(-1).slice(1);if(hi===0)return rows[0].slice(1);
 const a=rows[hi-1],b=rows[hi],u=(time-a[0])/(b[0]-a[0]);return a.slice(1).map((v,i)=>v+(b[i+1]-v)*u);
}
export function createCannonTransition(onReady=()=>{},arrows){
 const muzzleSequence=createMuzzleSequence(onReady);
 const images=['close.webp','ground.webp','curve.png','earth.png','earth-layer.png'].map(file=>{
  const image=new Image();image.src=ROOT+file;
  image.decode().then(onReady,()=>{});
  return image;
 });
 const clips=['fast-ground','prepared-earth'].map(name=>{
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.dataset.src=ROOT+name+'.mp4';
  video.addEventListener('loadeddata',onReady);video.addEventListener('seeked',onReady);video.addEventListener('error',onReady);return video;
 });
 const held=document.createElement('canvas');held.width=1600;held.height=900;const heldContext=held.getContext('2d');
 let heldReady=false,heldAnchor=videoAnchor(0,0);
 let current=-1,error=false,cachedPath=null,layout=null;
 const stop=()=>{if(current>=0)clips[current].pause();current=-1;};
 // Feather only the outer sky while the video is scaled into its final framing.
 const edgeMask=document.createElement('canvas');edgeMask.width=1600;edgeMask.height=900;const mc=edgeMask.getContext('2d');
 mc.fillStyle='white';mc.fillRect(0,0,1600,900);mc.globalCompositeOperation='destination-in';
 for(const horizontal of [true,false]){const g=mc.createLinearGradient(0,0,horizontal?1600:0,horizontal?0:900);g.addColorStop(0,'transparent');g.addColorStop(.07,'white');g.addColorStop(.93,'white');g.addColorStop(1,'transparent');mc.fillStyle=g;mc.fillRect(0,0,1600,900);}
 const framed=document.createElement('canvas');framed.width=1600;framed.height=900;const fc=framed.getContext('2d');
 function prepare(){for(const video of clips)if(!video.getAttribute('src'))video.src=video.dataset.src;}
 function draw(c,st,path,reducedMotion=false,drawSpaceBackdrop){
  prepare();
  const low=path.m.kind==='impact',cameraEnd=low?TRANSITION_TIMING.groundEnd:TRANSITION_TIMING.earthEnd,videoIndex=low?0:1;
  const video=clips[videoIndex],age=st.age;
  // Media supplies the backdrop only. A pending seek or a stalled decoder
  // must not rewind or stop the scene clock.
  if(age>0&&age<cameraEnd){
   if(current!==videoIndex){stop();current=videoIndex;}
   if(st.paused)video.pause();
   else if(!error&&!video.error&&!video.seeking&&!video.ended&&video.paused)video.play().catch(reason=>{if(reason.name!=='AbortError'){error=true;onReady();}});
  }
  const positioning=age>0&&age<TRANSITION_TIMING.launchDelay,flightAge=Math.max(0,age-TRANSITION_TIMING.launchDelay);
  const nativeTime=age<TRANSITION_TIMING.launchDelay?age*4:6+flightAge*8,index=nativeTime<6?0:nativeTime<12?1:2;
  const moving=age>0&&age<cameraEnd,frame=age===0?0:age>=cameraEnd?(low?1:3):index;
  let source=images[frame],anchor=videoAnchor(0,0);
  if(moving){
   if(!video.seeking&&video.readyState>=2){
    const measuredTime=video.currentTime<1.5?video.currentTime*4:6+(video.currentTime-1.5)*8,measuredIndex=measuredTime<6?0:measuredTime<12?1:2;
    heldAnchor=videoAnchor(measuredIndex,measuredTime-[0,6,12][measuredIndex]);
    if(!low){heldContext.drawImage(video,0,0,1600,900);heldReady=true;}
    source=low?video:held;anchor=heldAnchor;
   }else if(heldReady){source=held;anchor=heldAnchor;}
   else{source=images[index];anchor=videoAnchor(index,0);}
  }else stop();
  c.save();c.setTransform(1,0,0,1,0,0);
  if(source===held||source?.naturalWidth||source?.readyState>=2)c.drawImage(source,0,0,1600,900);
  const fitting=!low&&age>=TRANSITION_TIMING.fitStart&&age<cameraEnd;
  st.transition={phase:age===0?'ready':positioning?'positioning':moving||fitting?'camera+flight':'trajectory',clip:moving?videoIndex:null,mediaTime:moving?video.currentTime:null,seeking:moving?video.seeking:false,ready:images.every(im=>im.complete&&im.naturalWidth>0),error,launchAt:TRANSITION_TIMING.launchDelay,cameraEnd:low?cameraEnd:TRANSITION_TIMING.fitEnd};
  st.shot=nativeTime<6?'close':low||nativeTime<12?'terrain':'earth';
  const last=path.pts.at(-1),r0=path.m.r0,theta=p=>Math.atan2(p.x,p.y);
  const baseMuzzle=low?GROUND_MUZZLE:MUZZLE;
  const baseProject=low?p=>[479+projectGroundDistance(p.x),GROUND_MUZZLE[1]+(r0-(p.r??Math.hypot(p.x,p.y)))/(r0-1)*(GROUND_Y-GROUND_MUZZLE[1])]:globeProjection(path);
  let scale=1,tx=0,ty=0;
  if(moving||age===0){
   scale=anchor[2]/(low?CAMERA_TRACKS[0].at(-1)[3]:1);tx=anchor[0]-baseMuzzle[0]*scale;ty=anchor[1]-baseMuzzle[1]*scale;
  }
  if(!low&&age>=TRANSITION_TIMING.fitStart){
   if(cachedPath!==path){cachedPath=path;layout=fitTrajectory(path.pts.map(baseProject));}
   const blend=smooth((age-TRANSITION_TIMING.fitStart)/(cameraEnd-TRANSITION_TIMING.fitStart)),fitScale=1+(layout.scale-1)*blend,fitX=layout.x*blend,fitY=layout.y*blend;
   drawSpaceBackdrop?.(c);c.save();c.translate(fitX,fitY);c.scale(fitScale,fitScale);
   if(moving){c.save();c.translate(tx,ty);c.scale(scale,scale);c.drawImage(images[4],0,0,1600,900);c.restore();fc.clearRect(0,0,1600,900);fc.globalCompositeOperation='source-over';fc.drawImage(held,0,0);fc.globalCompositeOperation='destination-in';fc.drawImage(edgeMask,0,0);fc.globalCompositeOperation='source-over';c.drawImage(framed,0,0);}
   else c.drawImage(images[4],0,0,1600,900);
   c.restore();scale*=fitScale;tx=fitX+tx*fitScale;ty=fitY+ty*fitScale;
  }
  // The near shot sees a locally unwrapped surface, not an entire globe.
  // Blend that camera projection only while the video reveals curvature;
  // the established globe remains the exact similarity-projected conic.
  const curvature=low||!moving?1:smooth((nativeTime-6)/10);
  const project=p=>{let[x,y]=baseProject(p);if(!low&&curvature<1){const nearX=MUZZLE[0]+theta(p)*launchRadius,nearY=MUZZLE[1]+(r0-(p.r??Math.hypot(p.x,p.y)))*launchRadius/r0;x=nearX+(x-nearX)*curvature;y=nearY+(y-nearY)*curvature;}return[tx+scale*x,ty+scale*y];};
  st.transition.camera={scale,x:tx,y:ty};st.transition.muzzle=[tx+scale*baseMuzzle[0],ty+scale*baseMuzzle[1]];
  if(age<=TRANSITION_TIMING.launchDelay){st.presentation={launched:false,progress:0,landed:false,kind:path.m.kind};st.forces=null;}
  if(age>TRANSITION_TIMING.launchDelay){
   const progress=flightProgress(age,low),head=positionAt(path,progress);
   const drawPath=(other,color,dashed=false)=>{c.strokeStyle=color;c.lineWidth=3;c.setLineDash(dashed?[5,8]:[]);c.lineJoin='round';c.beginPath();const points=other===path?other.pts.slice(0,head.index):other.pts;points.forEach((p,i)=>{const xy=project(p);i?c.lineTo(...xy):c.moveTo(...xy);});if(other===path)c.lineTo(...project(head));c.stroke();c.setLineDash([]);};
   if(st.compare&&!moving)for(const v of [4.5,7.9,11.2]){if(v===st.v)continue;const other=pathOf(v,3,st.height);if((other.m.kind==='impact')===low)drawPath(low?groundPath(other.m,st.height):other,'#a8c4c677',true);}
   drawPath(path,'#eee4ca');
   const xy=project(head);
   // Flat flight has only vertical gravity. The globe retains its rotating-frame overlay.
   const center=low?[xy[0],xy[1]+68]:project({x:head.x*.999,y:head.y*.999,r:head.r*.999});
   const dx=center[0]-xy[0],dy=center[1]-xy[1],length=Math.hypot(dx,dy)||1;
   const radial=[dx/length,dy/length],gravity=low?1:1/head.r**2,centrifugal=low?0:path.m.h**2/head.r**3;
   st.forces={gravity,centrifugal,head,center,frame:low?'flat':'rotating',circularSpeed:7.9/Math.sqrt(r0)};
   if(!(low&&progress===1)){
    const forceArrow=(id,magnitude,sign,color,text)=>{
     const end=[xy[0]+sign*radial[0]*Math.min(180,68*magnitude),xy[1]+sign*radial[1]*Math.min(180,68*magnitude)];
     arrows?.drawBetween(c,{id,from:xy,to:end,color});
     c.fillStyle=color;c.font='16px "Alibaba PuHuiTi 3",sans-serif';c.textAlign='left';c.fillText(text,end[0]+12,end[1]);
    };
    forceArrow('gravity',gravity,1,'#a8c4c6',low?'重力':'引力');
    if(!low){
     forceArrow('centrifugal',centrifugal,-1,'#edb27b','离心惯性力');
     c.fillStyle='#a9b0bf';c.font='16px "Alibaba PuHuiTi 3",sans-serif';c.fillText('旋转参考系',28,865);
    }
   }
   c.fillStyle='#e8bd77';c.beginPath();c.arc(...xy,6,0,Math.PI*2);c.fill();
   st.presentation={launched:true,projectile:xy,groundY:ty+scale*GROUND_Y,landed:low&&progress===1,kind:path.m.kind,progress};
   st.presentation.effect=muzzleSequence.draw(c,flightAge,st.transition.muzzle,(low?78:52)*Math.abs(scale));
   if(low&&st.presentation.landed){
    const rangeProgress=age>=groundPlaybackEnd(reducedMotion)?1:smooth((age-rangeStartTime)/RANGE_DRAW_TIME);
    const [startX]=st.transition.muzzle,[endX]=xy,y=st.presentation.groundY+29;
    Object.assign(st.presentation,{rangeKm:last.x,rangeStart:[startX,y],rangeEnd:[endX,y],rangeProgress});
    if(rangeProgress>0){
     const drawingX=startX+(endX-startX)*rangeProgress;
     c.strokeStyle='#a8c4c6';c.lineWidth=2;c.beginPath();
     c.moveTo(startX,y-8);c.lineTo(startX,y+8);
     c.moveTo(startX,y);c.lineTo(drawingX,y);
     c.moveTo(drawingX,y-8);c.lineTo(drawingX,y+8);
     c.stroke();
     if(rangeProgress>=1){
      c.fillStyle='#eee4ca';c.font='24px "Alibaba PuHuiTi 3",sans-serif';c.textAlign='center';
      c.fillText('射程 '+last.x.toFixed(1)+' km（示意）',(startX+endX)/2,y+34);
     }
    }
   }
  }
  c.restore();
 }

 return{draw,prepare,stop,reset(){stop();heldReady=false;error=false;for(const video of clips)if(video.readyState&&video.currentTime>.001)video.currentTime=0;},dispose(){stop();clips.forEach(v=>{v.removeAttribute('src');v.load();});}};
}

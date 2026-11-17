/* Registered 2D teaching paths; reuse the first-stage OpticalBeam public API. */
(function(N){
 'use strict';
 const T=window.THREE,host=document.querySelector('.assembly-preview');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const durationMs=3200,paths=[],beams=[],sparks=[],endpoint=new T.Vector3();
 // Art-space anchors, not measured focal lengths. The incoming rays are parallel;
 // the primary converges them onto the diagonal secondary, then the eyepiece.
 for(const offset of [-28,-14,0,14,28]){
  const p=[1078.67-.27*offset,430.9+.96*offset,0];
  const s=[566.375+.10*offset,286.445+.12*offset,0];
  const e=[602+.045*offset,150+.012*offset,0];
  paths.push([[p[0]-865,p[1]-244,0],p,s,e,[612+.045*offset,112+.012*offset,0]]);
 }
 let renderer,scene,camera,frame=0,resolvePlay=null,elapsed=0,last=0,progress=0,tickPlay=null;
 function init(){
  if(renderer)return;
  renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(1600,900,false);renderer.setClearColor(0,0);
  renderer.domElement.className='assembly-optical-path';renderer.domElement.setAttribute('aria-hidden','true');host.insertBefore(renderer.domElement,host.querySelector('.assembly-front'));
  scene=new T.Scene();camera=new T.OrthographicCamera(0,16,0,9,-10,10);camera.position.z=1;
  for(let leg=0;leg<4;leg++){
   const beam=new SharedComponents.OpticalBeam({THREE:T,parent:scene,width:.13,zOffset:0});beams.push(beam);
   for(const path of paths)beam.addSegment(path[leg].map(v=>v/100),path[leg+1].map(v=>v/100),{color:0xffd395});
  }
  const geometry=new T.CircleGeometry(.024,12),material=new T.MeshBasicMaterial({color:0xffefb9,transparent:true,opacity:.85,depthTest:false});
  for(const path of paths){const spark=new T.Mesh(geometry,material);spark.renderOrder=2;scene.add(spark);sparks.push(spark);}
 }
 function paint(time){
  progress=Math.min(1,time/durationMs);
  beams.forEach((beam,leg)=>beam.setOpacity(Math.max(0,Math.min(1,(time-leg*550)/550))));
  // Same segment-wise travelling photon cue as first-stage LabScene.tick.
  sparks.forEach((spark,index)=>{
   const phase=Math.min(.99999,time/2400),position=phase*4,leg=Math.floor(position),fraction=position-leg;
   spark.visible=!reduced.matches&&time<2400;
   spark.position.fromArray(paths[index][leg]).lerp(endpoint.fromArray(paths[index][leg+1]),fraction).multiplyScalar(.01);spark.position.z=.1;
  });
  renderer.render(scene,camera);host.dataset.opticalProgress=progress.toFixed(3);
 }
 function cancel(){cancelAnimationFrame(frame);frame=0;tickPlay=null;if(resolvePlay){resolvePlay(false);resolvePlay=null;}}
 function clear(){
  cancel();progress=0;delete host.dataset.opticalProgress;
  if(!renderer)return;
  beams.splice(0).forEach(beam=>beam.dispose());
  if(sparks.length){sparks[0].geometry.dispose();sparks[0].material.dispose();sparks.length=0;}
  renderer.dispose();renderer.domElement.remove();renderer=null;scene=camera=null;
 }
 function play(){
  cancel();init();elapsed=0;last=performance.now();paint(reduced.matches?durationMs:0);
  if(reduced.matches)return Promise.resolve(true);
  return new Promise(resolve=>{
   resolvePlay=resolve;
   tickPlay=function tick(now){
    frame=0;
    if(!document.hidden){elapsed+=Math.max(0,Math.min(80,now-last));paint(elapsed);}
    last=now;
    if(elapsed<durationMs){frame=requestAnimationFrame(tick);return;}
    tickPlay=null;resolvePlay=null;resolve(true);
   };
   if(!document.hidden)frame=requestAnimationFrame(tickPlay);
  });
 }
 N.assemblyOptics={play,cancel,getState:()=>({progress,running:Boolean(frame),paths,rendered:Boolean(renderer)})};
 N.course.subscribe(s=>{if(s.stage!=='assembly'||!s.assemblyDone)clear();});
 document.addEventListener('visibilitychange',()=>{
  cancelAnimationFrame(frame);frame=0;last=performance.now();
  if(!document.hidden&&tickPlay)frame=requestAnimationFrame(tickPlay);
 });
 window.addEventListener('pagehide',clear);
})(window.Newton);

// Host adapter: public OpticalBeam API, no private ray artwork or animation clock.
let renderer,scene,camera,beam,maskedBeams,key='',shapeKey='',maskKey='';

function incomingGradient(ctx,width,height,[dx,dy],distance){
 const norm=Math.hypot(dx,dy);
 const x=dx/norm,y=dy/norm;
 const halfSpan=(Math.abs(x)*width+Math.abs(y)*height)/2;
 const startX=width/2-x*halfSpan,startY=height/2-y*halfSpan;
 return ctx.createLinearGradient(startX,startY,startX+x*distance,startY+y*distance);
}

export function drawSunEdgeGlow(ctx,width,height,direction,opacity){
 if(Math.hypot(direction[0],direction[1])<1e-8)return;
 const gradient=incomingGradient(ctx,width,height,direction,height*.32);
 gradient.addColorStop(0,'#ffd27e68');
 gradient.addColorStop(.35,'#e9ad4630');
 gradient.addColorStop(1,'#e9ad4600');
 ctx.save();
 ctx.globalAlpha*=opacity;
 ctx.fillStyle=gradient;
 ctx.fillRect(0,0,width,height);
 ctx.restore();
}

function attenuateBeams(layer,width,height,direction,strength){
 const gradient=incomingGradient(layer,width,height,direction,Math.hypot(width,height)*.73);
 gradient.addColorStop(0,'#fff');
 gradient.addColorStop(.35,`rgba(255,255,255,${1-.17*strength})`);
 gradient.addColorStop(1,`rgba(255,255,255,${1-.95*strength})`);
 layer.globalCompositeOperation='destination-in';
 layer.fillStyle=gradient;
 layer.fillRect(0,0,width,height);

 // Feather the light around the center of the main presentation area.
 layer.save();
 layer.translate(width*.52,height*.49);
 layer.scale(width*.36,height*.37);
 const core=layer.createRadialGradient(0,0,0,0,0,1);
 core.addColorStop(0,`rgba(0,0,0,${.92*strength})`);
 core.addColorStop(.48,`rgba(0,0,0,${.81*strength})`);
 core.addColorStop(1,'transparent');
 layer.globalCompositeOperation='destination-out';
 layer.fillStyle=core;
 layer.fillRect(-1,-1,2,2);
 layer.restore();
 layer.globalCompositeOperation='source-over';
}

export function drawSunRays(ctx,width,height,direction,{spacing=68,phaseY=0,edgeFade=0}={}){
 const T=window.THREE,n=Math.hypot(direction[0],direction[1]);if(n<1e-8)return;
 if(!renderer){renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(1600,900,false);renderer.setClearColor(0,0);scene=new T.Scene();camera=new T.OrthographicCamera(0,width,0,height,.1,20);camera.position.z=5;beam=new window.SharedComponents.OpticalBeam({THREE:T,parent:scene,width:3,zOffset:0});}
 const opacity=.10+.36*edgeFade;
 const shape=JSON.stringify([width,height,spacing,phaseY]),next=JSON.stringify([shape,...direction,opacity]);
 if(shape!==shapeKey){shapeKey=shape;beam.clear();camera.right=width;camera.bottom=height;camera.updateProjectionMatrix();const extent=Math.hypot(width,height);for(let offset=-extent;offset<=extent;offset+=spacing)beam.addSegment([-extent,offset+phaseY,0],[extent,offset+phaseY,0],{color:0xffd395});beam.group.position.set(width/2,height/2,0);}
 if(next!==key){key=next;beam.setOpacity(opacity);beam.group.rotation.z=Math.atan2(direction[1],direction[0]);renderer.render(scene,camera);}
 let source=renderer.domElement;
 if(edgeFade>0){
  maskedBeams??=document.createElement('canvas');
  const mask=[key,edgeFade].join('|');
  if(mask!==maskKey){
   maskKey=mask;
   const w=source.width,h=source.height;
   if(maskedBeams.width!==w||maskedBeams.height!==h){maskedBeams.width=w;maskedBeams.height=h;}
   const layer=maskedBeams.getContext('2d');
   layer.setTransform(w/width,0,0,h/height,0,0);
   layer.clearRect(0,0,width,height);
   layer.save();
   layer.filter=`blur(${8*w/width}px)`;
   layer.globalAlpha=edgeFade*.9;
   layer.drawImage(source,0,0,width,height);
   layer.restore();
   layer.drawImage(source,0,0,width,height);
   attenuateBeams(layer,width,height,direction,edgeFade);
  }
  source=maskedBeams;
 }
 ctx.drawImage(source,0,0,width,height);
 return opacity;
}
export function disposeSunRays(){beam?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer=scene=camera=beam=null;maskedBeams=null;key=shapeKey=maskKey='';}

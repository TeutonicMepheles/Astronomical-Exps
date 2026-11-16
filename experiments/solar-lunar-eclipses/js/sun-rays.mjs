// Host adapter: public OpticalBeam API, no private ray artwork or animation clock.
let renderer,scene,camera,beam,key='',shapeKey='';
export function drawSunRays(ctx,width,height,direction,{spacing=68,phaseY=0}={}){
 const T=window.THREE,n=Math.hypot(direction[0],direction[1]);if(n<1e-8)return;
 if(!renderer){renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(1600,900,false);renderer.setClearColor(0,0);scene=new T.Scene();camera=new T.OrthographicCamera(0,width,0,height,.1,20);camera.position.z=5;beam=new window.SharedComponents.OpticalBeam({THREE:T,parent:scene,width:3,zOffset:0});beam.setOpacity(.10);}
 const shape=JSON.stringify([width,height,spacing,phaseY]),next=JSON.stringify([shape,...direction]);
 if(shape!==shapeKey){shapeKey=shape;beam.clear();camera.right=width;camera.bottom=height;camera.updateProjectionMatrix();const extent=Math.hypot(width,height);for(let offset=-extent;offset<=extent;offset+=spacing)beam.addSegment([-extent,offset+phaseY,0],[extent,offset+phaseY,0],{color:0xffd395});beam.group.position.set(width/2,height/2,0);}
 if(next!==key){key=next;beam.group.rotation.z=Math.atan2(direction[1],direction[0]);renderer.render(scene,camera);}
 ctx.drawImage(renderer.domElement,0,0,width,height);
}
export function disposeSunRays(){beam?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer=scene=camera=beam=null;key=shapeKey='';}

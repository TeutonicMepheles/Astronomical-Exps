import * as T from './vendor/three/three.module.js';

export function createSteamTexture(){
 const steamCanvas=document.createElement('canvas');
 steamCanvas.width=steamCanvas.height=128;
 const steamContext=steamCanvas.getContext('2d');
 // Overlapping soft lobes give the expanding sheet a painted, turbulent edge.
 for(let i=0;i<13;i++){
  const angle=i*2.39996;
  const radius=9+Math.sqrt(i)*8;
  const x=64+Math.cos(angle)*radius,y=64+Math.sin(angle)*radius;
  const lobe=steamContext.createRadialGradient(x,y,0,x,y,27+(i%4)*3);
  lobe.addColorStop(0,i<4?'#eee6d8bb':'#bac7df84');
  lobe.addColorStop(.58,'#acb9cc47');
  lobe.addColorStop(1,'#acb9cc00');
  steamContext.fillStyle=lobe;
  steamContext.fillRect(0,0,128,128);
 }
 const steam=new T.CanvasTexture(steamCanvas);
 steam.colorSpace=T.SRGBColorSpace;
 return steam;
}

export function createSeparationVapor(layout,nodes){
 const texture=createSteamTexture();
 const group=new T.Group();
 group.name='SeparationVapor';
 group.visible=false;
 layout.add(group);

 // Capture the seams from the assembled model before the flight clips move the parts.
 const bounds=new T.Box3();
 const stageJoint=bounds.setFromObject(nodes.Interstage).max.y;
 const fairingJoint=bounds.setFromObject(nodes.FairingLeft).min.y;
 const payloadJoint=bounds.setFromObject(nodes.Payload).min.y;
 const seams=[
  ['Booster01','Booster02','Booster03','Booster04'].flatMap(name=>{
   const booster=bounds.setFromObject(nodes[name]);
   const top=booster.max.y, bottom=booster.min.y;
   const angle=Math.atan2(booster.min.z+booster.max.z,booster.min.x+booster.max.x);
   return [[.23,-.14],[.71,0],[.76,.14]].map(([height,offset])=>({
    angle:angle+offset,y:T.MathUtils.lerp(bottom,top,height),radius:2.55,
   }));
  }),
  ...[[stageJoint,2.45],[fairingJoint,2.75],[payloadJoint,1.65]].map(([y,radius])=>
   Array.from({length:12},(_,index)=>({angle:index*Math.PI/6,y,radius}))),
 ];
 const puffs=Array.from({length:12},(_,index)=>{
  const sprite=new T.Sprite(new T.SpriteMaterial({
   map:texture,color:index%3===0?0xc0d0e1:0xf1f5fa,transparent:true,depthWrite:false,
  }));
  group.add(sprite);
  return sprite;
 });
 let emitters=null;
 let started=0;
 let radialSpread=0;
 return {
  start(index,time){
   emitters=seams[index];
   started=time;
   radialSpread=index===0?5.4:3.2;
   group.visible=false;
  },
  update(time,reduced){
   const elapsed=time-started;
   group.visible=!!emitters&&elapsed<1.35;
   if(!group.visible)return;
   puffs.forEach((sprite,index)=>{
    const age=elapsed-.025*(index%4);
    sprite.visible=age>0&&(!reduced||index%2===0);
    if(!sprite.visible)return;
    const {angle,y,radius}=emitters[index];
    const travel=1-Math.exp(-2.8*age);
    const distance=radius+travel*(radialSpread+.42*(index%4));
    const curl=reduced?0:.38*travel*Math.sin(index*2.4+age*9);
    sprite.position.set(Math.cos(angle)*distance,y-2.3*travel+curl,Math.sin(angle)*distance);
    const size=1.8+travel*(4.2+.28*(index%3));
    sprite.scale.set(size,size*.75,1);
    sprite.material.rotation=angle+travel*.28;
    sprite.material.opacity=.92*T.MathUtils.smoothstep(age,0,.14)*(1-T.MathUtils.smoothstep(age,.40,1.23));
   });
  },
  clear(){
   emitters=null;
   group.visible=false;
  },
  dispose(){
   group.removeFromParent();
   for(const sprite of puffs)sprite.material.dispose();
   texture.dispose();
  },
 };
}

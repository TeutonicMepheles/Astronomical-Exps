import * as T from './vendor/three/three.module.js';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';
import {applyRocketPaint} from './rocket-paint-material.js';

const modelURL=new URL('./assets/separation-pad/slc4e.glb',import.meta.url);
const albedoURLs={
 concrete:new URL('./assets/separation-pad/pad_concrete_albedo.jpg',import.meta.url),
 grating:new URL('./assets/separation-pad/pad_grating_albedo.jpg',import.meta.url),
 grime:new URL('./assets/separation-pad/pad_grime_albedo.jpg',import.meta.url),
};
// Four lightning masts surround the pad in the source model's local X/Z plane.
const mastPositions=[[-28,40],[42,23],[23,-41],[-26,-17]];
const surroundings=new Set(['Pad_Apron','Pad_Asphalt','Pad_Ground','Pad_Hangar','Pad_HangarDoor','Pad_Tank','Pad_Flood']);

function keepPadForeground(pad){
 const discarded=[];
 pad.traverse(mesh=>{
  if(!mesh.isMesh)return;
  if(surroundings.has(mesh.material.name)){discarded.push(mesh);return;}
  const geometry=mesh.geometry;
  const vertices=geometry.getAttribute('position');
  const index=geometry.getIndex();
  const count=index?.count??vertices.count;
  const inside=(vertex)=>{
   const x=vertices.getX(vertex),z=vertices.getZ(vertex);
   return (Math.abs(x)<12&&z>-27&&z<10)||
    mastPositions.some(([mx,mz])=>(x-mx)**2+(z-mz)**2<20);
  };
  const keep=[];
  for(let i=0;i<count;i+=3){
   const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
   if(inside(a)&&inside(b)&&inside(c))keep.push(a,b,c);
  }
  if(keep.length)geometry.setIndex(keep);
  else discarded.push(mesh);
 });
 const materials=new Set(),kept=new Set();
 pad.traverse(mesh=>{if(mesh.isMesh&&!discarded.includes(mesh))kept.add(mesh.material);});
 for(const mesh of discarded){
  mesh.removeFromParent();
  mesh.geometry.dispose();
  if(!kept.has(mesh.material))materials.add(mesh.material);
 }
 for(const material of materials)material.dispose();
}
const surfaces={
 Pad_Concrete:['concrete',0xa5afbd],
 Pad_ConcreteDark:['concrete',0x6f7888],
 Pad_Pit:[null,0x303a48],
 Pad_Steel:['grime',0x96a1ae],
 Pad_SteelDark:['grime',0x586779],
 Pad_SteelSoot:['grime',0x424c59],
 Pad_Grating:['grating',0x9da8b3],
 Pad_Yellow:['grime',0xccac5f],
 Pad_Pipe:['grime',0x8ba0ad],
 Pad_Cable:[null,0x404e60],
 Pad_White:['grime',0xb6c5cb],
 Pad_TE:['grime',0x92a6b9],
 Pad_Tower:['grime',0x9daebf],
 Pad_TowerRed:['grime',0xb3614f],
 Pad_LightRed:[null,0xb76152],
};

export async function loadSeparationPad(rocketBase,lighting){
 const loader=new T.TextureLoader();
 const entries=Object.entries(albedoURLs);
 const [model,...images]=await Promise.allSettled([
  new GLTFLoader().loadAsync(modelURL.href),
  ...entries.map(([,url])=>loader.loadAsync(url.href)),
 ]);
 if(model.status==='rejected'){
  images.forEach(image=>{if(image.status==='fulfilled')image.value.dispose();});
  throw model.reason;
 }
 const pad=model.value.scene;
 pad.name='SeparationLaunchPad';
 keepPadForeground(pad);
 const textures=Object.fromEntries(entries.flatMap(([key],i)=>{
  const image=images[i];
  if(image.status==='rejected')return [];
  const texture=image.value;
  texture.colorSpace=T.SRGBColorSpace;
  texture.flipY=false;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  return [[key,texture]];
 }));
 const painted=new Set();
 const usedMaps=new Set();
 pad.traverse(node=>{
  if(!node.isMesh)return;
  for(const material of [node.material].flat()){
   if(painted.has(material))continue;
   painted.add(material);
   const [map,color]=surfaces[material.name]||[null,0x8594a4];
   material.color.setHex(color);
   material.map=textures[map]||null;
   if(material.map)usedMaps.add(material.map);
   if(material.name==='Pad_LightRed'){
    material.emissive.copy(material.color);
    material.emissiveIntensity=.78;
   }
   applyRocketPaint(material,lighting);
  }
 });
 for(const texture of Object.values(textures))if(!usedMaps.has(texture))texture.dispose();
 // Match the preview model's nozzle height to the top of the launch mount.
 const scale=.86;
 pad.scale.setScalar(scale);
 pad.rotation.y=.88;
 pad.position.y=rocketBase-5.25*scale;
 pad.updateMatrixWorld(true);
 lighting.padLightA.value.copy(pad.localToWorld(new T.Vector3(73,38,38)));
 lighting.padLightB.value.copy(pad.localToWorld(new T.Vector3(-66,38,54)));
 lighting.padAim.value.set(0,rocketBase+23,0);
 addPadEffects(pad);
 return pad;
}

function addPadEffects(pad){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d');
 const gradient=ctx.createRadialGradient(32,32,0,32,32,32);
 gradient.addColorStop(0,'#fff');
 gradient.addColorStop(.32,'#ffffff8e');
 gradient.addColorStop(.67,'#ffffff28');
 gradient.addColorStop(1,'#ffffff00');
 ctx.fillStyle=gradient;
 ctx.fillRect(0,0,64,64);
 const feather=new T.CanvasTexture(canvas);

 // Keep the beacon glow separate from the painted sky.
 const beacon=new T.SpriteMaterial({map:feather,color:0xff4939,opacity:.47,blending:T.AdditiveBlending,depthWrite:false});
 for(const [x,z] of mastPositions){
  const glow=new T.Sprite(beacon);
  glow.position.set(x,88.36,z);
  glow.scale.set(6,6,1);
  pad.add(glow);
 }

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
 // A ground-parallel warm flash joins the vertical jet to the radial steam.
 const air=new T.Group();
 air.name='LiftoffAir';
 air.visible=false;
 const impact=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({
  color:0xff9b45,map:feather,transparent:true,depthWrite:false,
  blending:T.AdditiveBlending,opacity:0,
 }));
 impact.name='PadImpact';
 impact.rotation.x=-Math.PI/2;
 impact.position.y=.22;
 air.add(impact);
 for(let i=0;i<40;i++){
  const color=i%3===0?0xb4bed1:0xf5efe6;
  const particle=new T.Sprite(new T.SpriteMaterial({map:steam,color,transparent:true,depthWrite:false,opacity:0}));
  air.add(particle);
 }
 pad.add(air);
}

export function updatePadAir(air,seconds,reduced,lift=0){
 if(!air)return;
 air.visible=seconds>0;
 if(!air.visible)return;
 const impact=air.children[0];
 const forcing=T.MathUtils.smoothstep(seconds,.035,.19)*(1-T.MathUtils.smoothstep(lift,18,38));
 const footprint=11+20*(1-Math.exp(-3*seconds));
 impact.visible=forcing>.004;
 impact.scale.set(footprint,footprint*.78,1);
 impact.material.opacity=forcing*.65;

 for(let i=0;i<air.children.length-1;i++){
  const particle=air.children[i+1];
  const ring=Math.floor(i/10);
  const ray=i%10;
  const foreground=ring===3;
  const age=seconds-(foreground?.36+ray*.055:.055+ring*.19+(ray%4)*.018);
  particle.visible=age>0&&(!reduced||(!foreground&&ray%2===0));
  if(!particle.visible)continue;
  // The last wave is biased toward the fixed pad camera and fills the near field.
  const angle=foreground?.58+(ray-4.5)*.21:ray*Math.PI/5+ring*.31;
  const spread=1-Math.exp(-(foreground?1.03:1.55)*age);
  const distance=2+spread*(foreground?93+ray%3*6:33+ring*8+(ray%3)*4);
  const size=10+spread*(foreground?44+ray%3*6:23+ring*4+ray%3*3);
  const height=size*(foreground?.66:.49+ring*.06);
  const curl=reduced?0:Math.sin(age*3+ray)*spread*2.2;
  particle.position.set(Math.cos(angle)*distance+curl,height*.52+.18,Math.sin(angle)*distance);
  particle.scale.set(size*1.35,height,1);
  particle.material.rotation=reduced?0:(ray%2===0?1:-1)*spread*.24;
  const grow=T.MathUtils.smoothstep(age,0,.24);
  const dissipate=1-.79*T.MathUtils.smoothstep(age,1.26,4.85);
  const persistence=foreground?1-.56*T.MathUtils.smoothstep(age,2.35,4.6):dissipate;
  particle.material.opacity=grow*persistence*(ring===0?.98:.92);
 }
}

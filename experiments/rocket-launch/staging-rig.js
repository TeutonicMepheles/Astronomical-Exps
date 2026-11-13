import * as T from './vendor/three/three.module.js';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';
const asset=new URL('./assets/dv-comparison-dot-20261112/',import.meta.url);
const apply=(o,t)=>{o.position.fromArray(t.translation);o.quaternion.fromArray(t.rotation);o.scale.fromArray(t.scale);};
// Runtime material kernels adapted from Dot's delivered viewer/viewer.js (2026-11-12).
// Viewer UI/renderer/clock are not imported. Uniforms are independent for every stage.
function fuelMaterial(base,u){const m=base.clone();m.name=base.name+'_RuntimeFill';m.onBeforeCompile=s=>{Object.assign(s.uniforms,{uFill:u.fill,uMin:u.min,uMax:u.max});s.vertexShader='varying vec3 vFuelLocal;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFuelLocal=position;');s.fragmentShader='varying vec3 vFuelLocal;uniform float uFill,uMin,uMax;\n'+s.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(uFill<=0.00001 || vFuelLocal.y>mix(uMin,uMax,uFill))discard;');};m.customProgramCacheKey=()=> 'dv-fill-v1';return m}
function shellMaterial(base,u){const m=base.clone();m.name=base.name+'_RuntimeScan';m.transparent=true;m.depthWrite=false;m.side=T.FrontSide;m.onBeforeCompile=s=>{Object.assign(s.uniforms,{uScan:u.scan,uHighlight:u.highlight,uFade:u.fade,uPulse:u.pulse});s.vertexShader='varying vec3 vShellLocal; varying vec3 vShellNormal; varying vec3 vShellView;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvShellLocal=position;vShellNormal=normalize(normalMatrix*normal);vShellView=-(modelViewMatrix*vec4(position,1.)).xyz;');s.fragmentShader='varying vec3 vShellLocal;varying vec3 vShellNormal;varying vec3 vShellView;uniform float uScan,uHighlight,uFade,uPulse;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float ang=atan(vShellLocal.z,vShellLocal.x)/6.2831853;
vec2 cell=vec2(ang*16.,vShellLocal.y*2.);
vec2 d=abs(fract(cell-.5)-.5)/max(fwidth(cell),vec2(.0001));
float grid=1.-smoothstep(.4,1.2,min(d.x,d.y));
float edge=pow(1.-abs(dot(normalize(vShellNormal),normalize(vShellView))),3.);
float scanAmount=max(uScan,uFade);
float a=mix(1.,.035+.65*grid+.75*edge,scanAmount);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.48,.68,.72),scanAmount*.65);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.95,.64,.27),uHighlight*uPulse*(.15+.85*max(grid,edge)));
diffuseColor.a=clamp(a*(1.-uFade*.65),.025,1.);`);};m.customProgramCacheKey=()=> 'dv-scan-v1';return m}

export class StagingRig {
 static async load(){
  const response=await fetch(new URL('dv-manifest.json',asset));if(!response.ok)throw Error('Δv manifest HTTP '+response.status);
  const manifest=await response.json();const gltf=await new GLTFLoader().loadAsync(new URL(manifest.model,asset).href);
  try{return new StagingRig(gltf,manifest);}catch(error){const gs=new Set(),ms=new Set();gltf.scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());throw error;}
 }
 constructor(gltf,manifest){
  this.root=gltf.scene;this.root.name='StagingComparison';this.root.visible=false;this.assetSource='dot-glb';this.manifest=manifest;this.actors=[];this.nodes={};this.templates=new Set();
  this.root.traverse(o=>{if(o.name)this.nodes[o.name]=o;if(o.material)this.templates.add(o.material);});
  for(const name of Object.keys(manifest.defaultTransformsGLTF))if(!this.nodes[name])throw Error('Δv 缺少节点 '+name);
  this.mixer=new T.AnimationMixer(this.root);this.actions={};
  for(const name of Object.keys(manifest.animations)){const clip=gltf.animations.find(c=>c.name===name);if(!clip)throw Error('Δv 缺少动画 '+name);const action=this.mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;this.actions[name]=action;}
  const flameGeo=new T.ConeGeometry(.28,1.6,20);
  for(const [index,id] of ['Small','Large','Triple'].entries()){
   const layout=new T.Group();layout.name='ComparisonLayout_'+id;layout.position.set(340,110,0);layout.scale.setScalar(400/manifest.schemes[id].displayHeight);this.root.add(layout);layout.add(this.nodes[manifest.schemes[id].root]);const stages=[];
   for(const spec of manifest.stages.filter(s=>s.scheme===id)){
    const group=this.nodes[spec.group],fuel=this.nodes[spec.propellant],surface=this.nodes[spec.fuelSurface],hot=this.nodes[spec.hotCore],shell=this.nodes[spec.shell];
    group.userData.stagingPart={plan:index,stage:spec.order};
    const u={fill:{value:1},min:{value:spec.minLocalY},max:{value:spec.maxLocalY},scan:{value:1},highlight:{value:0},fade:{value:0},pulse:{value:1}};
    fuel.material=fuelMaterial(fuel.material,u);fuel.material.uniforms={fill:u.fill};surface.material=surface.material.clone();hot.material=hot.material.clone();
    const shells=[];shell.traverse(o=>{if(o.isMesh){o.material=shellMaterial(o.material,u);shells.push(o);}});const dry=[];
    group.traverse(o=>{if(o.isMesh&&!shells.includes(o)&&o!==fuel&&o!==surface&&o!==hot){o.material=o.material.clone();dry.push(o);}});
    const flame=new T.Mesh(flameGeo,new T.MeshBasicMaterial({color:0xffbb69,transparent:true,opacity:.65,depthWrite:false}));flame.rotation.z=Math.PI;flame.position.y=-.8;flame.visible=false;this.nodes[spec.exhaustAnchor].add(flame);
    stages.push({spec,group,fuel,surface,hot,shell,shells,dry,u,fuelMat:fuel.material,hotMat:hot.material,flame});
   }
   this.actors.push({root:layout,stages});
  }
  this.reset();
 }
 reset(){
  this.mixer.stopAllAction();
  for(const [name,t] of Object.entries(this.manifest.defaultTransformsGLTF)){apply(this.nodes[name],t);this.nodes[name].visible=this.manifest.defaultVisibility[name]??true;}
  this.poseKey=null;
 }
 setState(lesson){
  const triple=lesson.lessons?.[2]||lesson;
  if(triple.progress===0&&this.lastProgress!==0)this.reset();this.lastProgress=triple.progress;
  const samples=lesson.samples(),detached=samples[2].detached;
  // Absolute local clip times permit pause, backwards scrubbing and cumulative endpoints.
  const times=[0,1].map(i=>triple.phase==='eject'&&triple.ejectStage===i+1?triple.ejectProgress: i<detached?1:0),key=times.join(',');
  if(key!==this.poseKey){
   this.mixer.stopAllAction();
   for(const spec of this.manifest.stages)apply(this.nodes[spec.group],this.manifest.defaultTransformsGLTF[spec.group]);
   times.forEach((fraction,i)=>{if(fraction<=0)return;const a=this.actions['SeparateTripleStage'+(i+1)];a.reset().play();a.time=fraction*a.getClip().duration;a.paused=true;});
   this.mixer.update(0);this.poseKey=key;
  }
  this.root.updateMatrixWorld(true);
  this.actors.forEach((actor,index)=>{actor.root.visible=lesson.activeIndex===undefined||lesson.activeIndex===index;const state=lesson.lessons?.[index]||lesson;actor.stages.forEach((s,i)=>{
   const sample=samples[index],fraction=sample.remaining[i]/(index===0?100:index===1?300:100),fade=index===2?times[i]||0:0;
   s.u.fill.value=fraction;s.fuel.visible=fraction>1e-6;s.surface.visible=fraction>1e-6;
   const p=new T.Vector3(0,T.MathUtils.lerp(s.spec.minLocalY,s.spec.maxLocalY,fraction),0);s.fuel.localToWorld(p);s.surface.parent.worldToLocal(p);s.surface.position.copy(p);
   s.u.scan.value=1;s.u.fade.value=fade;s.u.highlight.value=index===2&&i===state.waitingStage-1?1:0;
   const burning=!(index===2&&['gate','eject','after'].includes(state.phase))&&sample.progress>0&&sample.progress<1&&fraction>1e-7&&sample.remaining.slice(0,i).every(v=>v<1e-7);
   s.flame.visible=burning;s.hotMat.emissive.setHex(0xff8a37);s.hotMat.emissiveIntensity=burning?3:0;s.flame.scale.y=1+.06*Math.sin(state.effectTime*17);
   for(const o of s.dry){const transparent=fade>0;if(o.material.transparent!==transparent){o.material.transparent=transparent;o.material.needsUpdate=true;}o.material.opacity=1-.68*fade;o.material.depthWrite=!transparent;}
  });});
 }
 pick(e,renderer,camera){
  const r=renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);this.root.updateMatrixWorld(true);
  for(const hit of ray.intersectObject(this.root,true)){let visible=true;for(let o=hit.object;o;o=o.parent)if(!o.visible)visible=false;if(!visible)continue;for(let o=hit.object;o&&o!==this.root;o=o.parent)if(o.userData.stagingPart)return o.userData.stagingPart;}return null;
 }
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.root);const gs=new Set(),ms=new Set(this.templates);this.root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());this.root.removeFromParent();}
}

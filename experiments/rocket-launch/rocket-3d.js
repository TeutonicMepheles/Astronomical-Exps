import * as T from './vendor/three/three.module.js';
import {StagingRig} from './staging-rig.js';
import {LaunchSupport} from './launch-support.js';
import {createScanMaterial} from './scan-material.js';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';

const asset=new URL('./assets/cz7-blender-20261112/',import.meta.url);
export const MODULES=['Stage1','Stage2','Boosters','Payload','Fairing'];
export const STRUCTURE_NODES=['Stage1','Stage2','Boosters','Payload','Fairing','Stage1LOXTank','Stage1FuelTank','Stage1Engine01','Stage2LOXTank','Stage2FuelTank','Stage2Engine01'];
const apply=(o,t)=>{o.position.fromArray(t.translation);o.quaternion.fromArray(t.rotation);o.scale.fromArray(t.scale);};
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};

/** One renderer lifetime, managed asset mixers, no private clock or RAF. The page owns lesson state. */
export class Rocket3D {
 constructor(host,{invalidate,onPick,onStatus,onStagingPart}){
  Object.assign(this,{host,invalidate,onPick,onStatus,onStagingPart,nodes:{},mode:null,ready:false,dirty:true,selected:null,highlights:[],xraySaved:new Map(),scanMeshes:new Map(),effects:[]});
  this.layer=document.createElement('div');this.layer.className='rocket-3d';this.layer.hidden=true;host.append(this.layer);
  this.status=document.createElement('div');this.status.className='rocket-3d-status';this.status.setAttribute('role','status');this.layer.append(this.status);
  this.label=document.createElement('div');this.label.className='rocket-3d-label';this.layer.append(this.label);
  this.abort=new AbortController();const opts={signal:this.abort.signal};
  this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(host);
  this.layer.addEventListener('webglcontextlost',e=>{e.preventDefault();this.fail(new Error('WebGL 上下文丢失'));},opts);
 }
 async load({retry=false}={}){
  if(this.disposed)return this;
  if(this.failed&&!retry)return this;
  if(this.ready)return this;if(this.loading)return this.loading;
  this.status.replaceChildren(document.createTextNode('正在加载长征七号模型…'));this.status.hidden=false;
  this.loading=(async()=>{
   try{
    if(!this.renderer){
     this.renderer=new T.WebGLRenderer({alpha:true,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor(0,0);
     this.renderer.domElement.addEventListener('webglcontextlost',e=>{if(this.disposed)return;e.preventDefault();this.fail(new Error('WebGL 上下文丢失'));},{signal:this.abort.signal});
     this.renderer.domElement.className='rocket-webgl';this.renderer.domElement.setAttribute('aria-label','长征七号交互三维模型');this.layer.prepend(this.renderer.domElement);
     this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-40,40,30,-30,.1,400);
     this.scene.add(new T.HemisphereLight(0xeaf3ff,0x3b4159,2.1));const light=new T.DirectionalLight(0xfff4de,3);light.position.set(-15,30,65);this.scene.add(light);
     this.layout=new T.Group();this.pivot=new T.Group();this.layout.add(this.pivot);this.scene.add(this.layout);
     this.renderer.domElement.addEventListener('click',e=>{if(this.mode==='structure'){const hit=this.pick(e);if(hit)this.onPick(hit);}else if(this.mode==='comparison'){const hit=this.stagingRig?.pick(e,this.renderer,this.camera);if(hit)this.onStagingPart?.(hit);}}, {signal:this.abort.signal});
    }
    const response=await fetch(new URL('rocket-manifest.json',asset));if(!response.ok)throw Error('manifest HTTP '+response.status);
    const manifest=await response.json();const gltf=await new GLTFLoader().loadAsync(new URL(manifest.model,asset).href);
    if(this.disposed){this.disposeObject(gltf.scene);return this;}
    this.manifest=manifest;this.model=gltf.scene;this.pivot.add(this.model);this.model.traverse(o=>{if(o.name)this.nodes[o.name]=o;});
    for(const n of Object.keys(manifest.defaultTransformsGLTF))if(!this.nodes[n])throw Error('缺少节点 '+n);
    this.clips=Object.fromEntries(gltf.animations.map(c=>[c.name,c]));this.mixer=new T.AnimationMixer(this.model);
    this.centers={};this.targetCenters={};
    this.reset();this.scene.updateMatrixWorld(true);this.assetSize=new T.Box3().setFromObject(this.model).getSize(new T.Vector3()).toArray();
    for(const n of MODULES){const root=this.nodes.RocketRoot,center=root.worldToLocal(new T.Box3().setFromObject(this.nodes[n]).getCenter(new T.Vector3())),origin=root.worldToLocal(this.nodes[n].getWorldPosition(new T.Vector3())),anchor=root.worldToLocal(this.nodes[manifest.modules[n].assemblyAnchor].getWorldPosition(new T.Vector3()));this.targetCenters[n]=anchor.add(center.sub(origin));}
    // A shared-geometry reference stays at the assembly anchors; it is never raycast.
    this.scanMaterial=createScanMaterial({opacity:.5});this.referenceMaterial=createScanMaterial({opacity:.3,color:0x9eafb9});
    this.reference=this.model.clone(true);this.reference.name='AssemblyScanReference';
    this.reference.traverse(o=>{if(o.isMesh){o.userData.scan=true;o.material=this.referenceMaterial;o.visible=/Shell$|Nose$|Engine[0-9]*$|^Fairing(Left|Right)$|^PayloadCargo$|^Interstage$/.test(o.name);o.renderOrder=1;}});
    this.reference.visible=false;this.pivot.add(this.reference);
    const scanNames=new Set(manifest.shellNodes);
    for(const n of manifest.xrayOccluderGroups)this.nodes[n].traverse(o=>{if(o.isMesh)scanNames.add(o.name);});
    this.xrayMeshNames=[...scanNames];
    for(const n of this.xrayMeshNames){const original=this.nodes[n];if(!original.isMesh||!(/Shell$|Nose$|Engine[0-9]*$/.test(n)||manifest.shellNodes.includes(n)))continue;
     const scan=new T.Mesh(original.geometry,this.scanMaterial);scan.name='Scan_'+n;scan.userData.scan=true;scan.position.copy(original.position);scan.quaternion.copy(original.quaternion);scan.scale.copy(original.scale);scan.visible=false;scan.renderOrder=2;original.parent.add(scan);this.scanMeshes.set(n,scan);
    }
    const flameGeo=new T.ConeGeometry(.65,5,10),flameMat=new T.MeshBasicMaterial({color:0xffb85c,transparent:true,opacity:.85,depthWrite:false});
    const smokeGeo=new T.SphereGeometry(1,8,6),smokeMat=new T.MeshBasicMaterial({color:0xa4a9bd,transparent:true,opacity:.14,depthWrite:false});
    for(const n of manifest.anchors.filter(n=>n.endsWith('Flame'))){const flame=new T.Mesh(flameGeo,flameMat);flame.position.y=-2.5;const smoke=new T.Mesh(smokeGeo,smokeMat);smoke.position.y=-7;smoke.scale.set(1.5,2,1.5);const group=new T.Group();group.add(flame,smoke);this.nodes[n].add(group);group.visible=false;this.effects.push({name:n,group,flame,smoke});}
    this.launchSupport=new LaunchSupport();this.scene.add(this.launchSupport.root);
    this.ready=true;this.failed=false;this.status.hidden=true;this.setScene(this.mode);this.onStatus?.(true);return this;
   }catch(e){this.fail(e);return this;}finally{this.loading=null;}
  })();return this.loading;
 }
 fail(e){this.ready=false;this.failed=true;this.status.hidden=false;this.status.replaceChildren(document.createTextNode('模型加载失败 / WebGL 不可用：'+e.message));const b=document.createElement('button');b.textContent='重试';b.onclick=()=>{if(this.renderer?.getContext().isContextLost())location.reload();else this.load({retry:true});};this.status.append(b);this.onStatus?.(false);}
 invalidateFrame(){this.dirty=true;this.invalidate();}
 reset(){
  if(!this.model)return;this.mixer.stopAllAction();this.mixer.timeScale=1;this.active=null;this.playbackFamily=null;this.clearSelection();this.setXray(false);
  for(const [n,t] of Object.entries(this.manifest.defaultTransformsGLTF)){apply(this.nodes[n],t);this.nodes[n].visible=true;}
  this.effects.forEach(e=>{e.group.visible=false;e.flame.scale.setScalar(1);e.smoke.scale.set(1.5,2,1.5);});this.layout.position.set(0,0,0);this.layout.rotation.set(0,0,0);this.layout.scale.setScalar(1);this.pivot.position.set(0,-26.55,0);this.launchTime=null;if(this.reference){this.reference.visible=false;for(const n of MODULES)this.reference.getObjectByName(n).visible=true;}
  this.launchSupport?.reset();this.model.visible=true;if(this.stagingRig)this.stagingRig.root.visible=false;this.camera.position.set(0,0,100);this.camera.zoom=1;this.camera.far=400;this.camera.lookAt(0,0,0);this.resize();this.invalidateFrame();
 }
 setScene(mode){this.mode=mode;this.layer.hidden=!mode;if(!this.ready)return;this.status.hidden=true;this.renderer.domElement.setAttribute('aria-label',mode==='comparison'?'三方案火箭交互三维模型':'长征七号交互三维模型');this.reset();this.layout.rotation.z=['separation','launch'].includes(mode)?0:Math.PI/2;if(this.reference)this.reference.visible=mode==='assembly';if(mode==='launch')this.launchSupport.update(0);if(mode==='comparison'){this.model.visible=false;if(this.stagingRig)this.stagingRig.root.visible=true;else if(this.stagingError)this.showComparisonError();else this.loadComparison();}this.resize();}
 resize(){if(!this.renderer)return;const w=this.layer.clientWidth,h=this.layer.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);const aspect=w/h;if(this.mode==='comparison'){this.camera.far=2000;const half=Math.max(325,750/aspect);this.camera.position.set(750,325,1000);this.camera.lookAt(750,325,0);this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.invalidateFrame();return;}const half=['separation','launch'].includes(this.mode)?35:this.mode==='assembly'?22:32/aspect;this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.invalidateFrame();}
 setXray(enabled){if(!this.manifest)return;
  if(enabled&&!this.xraySaved.size){for(const n of this.xrayMeshNames||[]){this.xraySaved.set(n,this.nodes[n].visible);this.nodes[n].visible=false;const scan=this.scanMeshes.get(n);if(scan)scan.visible=true;}}
  else if(!enabled){for(const [n,v] of this.xraySaved)this.nodes[n].visible=v;this.xraySaved.clear();for(const scan of this.scanMeshes.values())scan.visible=false;}
  this.invalidateFrame();
 }
 clearSelection(){for(const [mesh,original,clones] of this.highlights){mesh.material=original;clones.forEach(m=>m.dispose());}this.highlights=[];this.selected=null;this.label.hidden=true;}
 select(n,label){this.clearSelection();const o=this.nodes[n];if(!o)return;this.selected=n;o.traverse(mesh=>{if(!mesh.isMesh)return;const original=mesh.material,clones=(Array.isArray(original)?original:[original]).map(m=>{const c=m.clone();c.emissive?.set(0x8b5720);if(mesh.userData.scan){c.uniforms.tint.value.set(0xe8bf7e);c.uniforms.strength.value=.65;}return c;});mesh.material=Array.isArray(original)?clones:clones[0];this.highlights.push([mesh,original,clones]);});this.label.textContent=label;this.label.hidden=false;this.invalidateFrame();}
 partFor(mesh){let o=mesh;while(o){if(STRUCTURE_NODES.includes(o.name))return o.name;if(o.name.startsWith('Stage1Engine'))return 'Stage1Engine01';if(o.name.startsWith('Stage2Engine'))return 'Stage2Engine01';o=o.parent;}return null;}
 pick(e){this.scene.updateMatrixWorld(true);const r=this.renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);
  const hits=ray.intersectObject(this.model,true).filter(h=>h.object.isMesh&&visible(h.object)&&!this.effects.some(e=>e.group===h.object.parent));
  // Read internal solid parts through the grid; the outline is a selectable fallback.
  return hits.filter(h=>!h.object.userData.scan).map(h=>this.partFor(h.object)).find(Boolean)||hits.filter(h=>h.object.userData.scan).map(h=>this.partFor(h.object)).find(Boolean);
 }
 projectLocal(point){this.scene.updateMatrixWorld(true);const p=this.nodes.RocketRoot.localToWorld(point.clone()).project(this.camera);return{x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2};}
 target(n){return this.projectLocal(this.targetCenters[n]);}
 moduleCenter(n){this.scene.updateMatrixWorld(true);const p=new T.Box3().setFromObject(this.nodes[n]).getCenter(new T.Vector3()).project(this.camera);return{x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2};}
 screenBounds(n){this.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(this.nodes[n]),points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(this.camera);points.push({x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2});}return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}
 setModule(n,installed){if(this.reference)this.reference.getObjectByName(n).visible=!installed;apply(this.nodes[n],this.manifest.modules[n][installed?'assembledGLTF':'scatteredGLTF']);this.invalidateFrame();}
 moveModule(n,dx,dy,start){const v=new T.Vector3(dx/this.host.clientWidth*(this.camera.right-this.camera.left),-dy/this.host.clientHeight*(this.camera.top-this.camera.bottom),0);const q=this.nodes[n].parent.getWorldQuaternion(new T.Quaternion()).invert();v.applyQuaternion(q);this.nodes[n].position.copy(start).add(v);this.invalidateFrame();}
 play(name){if(!this.ready)return;const clip=this.clips[name];if(!clip)throw Error('未知动画 '+name);const family=['AssemblyPreview','LaunchPreview','SeparationPreview'].includes(name)?'preview':'steps';if(family==='preview'||this.playbackFamily==='preview')this.reset();this.playbackFamily=family;this.active=this.mixer.clipAction(clip);this.active.reset().setLoop(T.LoopOnce,1);this.active.clampWhenFinished=true;this.active.play();this.mixer.update(0);this.invalidateFrame();}
 pause(paused){this.mixer.timeScale=paused?0:1;}
 seek(seconds){if(!this.active)return;this.active.time=Math.max(0,Math.min(seconds,this.active.getClip().duration));this.mixer.update(0);this.invalidateFrame();}
 followSeparation(index,local,phase){
  const u=index===1&&phase==='animation'?T.MathUtils.smoothstep(local,0,2):index>=2?1:0;
  const v=index===3&&phase==='animation'?T.MathUtils.smoothstep(local,0,2):index>=4?1:0;
  this.scene.updateMatrixWorld(true);const payloadY=new T.Box3().setFromObject(this.nodes.Payload).getCenter(new T.Vector3()).y;
  const half=35-15*u-15*v,focus=13*u+(payloadY-13)*v,aspect=this.layer.clientWidth/this.layer.clientHeight;
  this.camera.position.set(0,focus,100);this.camera.lookAt(0,focus,0);this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.invalidateFrame();
 }
 async loadComparison(){
  if(this.stagingRig||this.disposed)return;
  this.status.hidden=false;this.status.textContent='正在加载分级对照模型…';if(this.stagingLoading)return;
  this.stagingLoading=StagingRig.load();
  try{const rig=await this.stagingLoading;if(this.disposed){rig.dispose();return;}this.stagingRig=rig;this.scene.add(rig.root);rig.root.visible=this.mode==='comparison';if(this.comparisonLesson)rig.setState(this.comparisonLesson);if(this.mode==='comparison')this.status.hidden=true;this.invalidateFrame();}
  catch(e){if(this.disposed)return;this.stagingError=e;if(this.mode==='comparison')this.showComparisonError();}
  finally{this.stagingLoading=null;}
 }
 showComparisonError(){this.status.hidden=false;this.status.textContent='分级对照模型加载失败：'+this.stagingError.message;const b=document.createElement('button');b.textContent='重试';b.onclick=()=>{this.stagingError=null;this.loadComparison();};this.status.append(b);}
 setComparison(lesson){this.comparisonLesson=lesson;if(this.ready&&this.mode==='comparison'){this.stagingRig?.setState(lesson);this.invalidateFrame();}}
 setAscent(progress){if(!this.ready)return;this.layout.position.y=Math.min(10,progress*20);if(this.mode==='launch')this.launchSupport.update(progress);this.invalidateFrame();}
 beginLaunch(){if(this.reference)this.reference.visible=false;this.launchTime=0;}
 update(dt,{animate=false,effectTime=0,flames=false,upper=false}={}){
  if(!this.ready||!this.mode||document.hidden)return;
  if(this.mode==='comparison'){if(this.dirty){this.renderer.render(this.scene,this.camera);this.dirty=false;}return;}
  if(animate){this.mixer.update(dt);if(this.launchTime!==null){this.launchTime+=dt;const u=T.MathUtils.smoothstep(this.launchTime,0,1.6);this.layout.rotation.z=Math.PI/2*(1-u);this.layout.scale.setScalar(1);const aspect=this.host.clientWidth/this.host.clientHeight,half=22*(1-u)+36*u+3*Math.sin(Math.PI*u);this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.layout.position.y=Math.min(8,Math.max(0,this.launchTime-1.6)*3);
    this.scene.updateMatrixWorld(true);this.launchBox??=new T.Box3();this.launchBox.setFromObject(this.model);const box=this.launchBox;
    const fit=Math.max(half,Math.abs(box.min.y)*1.06,Math.abs(box.max.y)*1.06,Math.abs(box.min.x)/aspect*1.06,Math.abs(box.max.x)/aspect*1.06);
    this.camera.left=-fit*aspect;this.camera.right=fit*aspect;this.camera.top=fit;this.camera.bottom=-fit;this.camera.updateProjectionMatrix(); }this.dirty=true;}
  this.effects.forEach(e=>{const show=flames&&(upper?e.name.startsWith('Stage2'):!e.name.startsWith('Stage2'));if(show!==e.group.visible)this.dirty=true;e.group.visible=show;if(show){e.flame.scale.y=.9+.12*Math.sin(effectTime*28);e.smoke.scale.setScalar(1.8+.15*Math.sin(effectTime*7));}});
  if(this.dirty){this.renderer.render(this.scene,this.camera);if(this.selected){const p=this.moduleCenter(this.selected);this.label.style.left=Math.max(100,Math.min(this.host.clientWidth-100,p.x))+'px';this.label.style.top=Math.max(16,Math.min(this.host.clientHeight-55,p.y-75))+'px';}this.dirty=false;}
 }
 disposeObject(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 destroy(){this.disposed=true;this.ready=false;this.mode=null;this.abort.abort();this.ro.disconnect();this.mixer?.stopAllAction();this.clearSelection();this.stagingRig?.dispose();this.launchSupport?.dispose();this.launchSupport=null;if(this.model)this.disposeObject(this.model);this.referenceMaterial?.dispose();this.renderer?.dispose();this.renderer?.forceContextLoss();this.pivot?.clear();if(this.stagingRig)this.scene.remove(this.stagingRig.root);this.stagingRig=null;this.model=null;this.nodes={};this.scanMeshes.clear();this.reference=null;this.effects=[];this.clips={};this.active=null;this.mixer=null;this.layer.remove();}
}

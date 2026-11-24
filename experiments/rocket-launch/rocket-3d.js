import {createSeparationVapor} from './separation-vapor.js';
import {COMPARISON_WIDTH,COMPARISON_HEIGHT} from './comparison-flight.js?v=taller-comparison';
import {addRocketHardware} from './rocket-hardware.js?v=tianzhou-solar';
import {createRocketExhaust} from './rocket-exhaust.js?v=flight-refinement-20261117';
import {RocketAssemblyParts} from './rocket-assembly-parts.js?v=assembly-original-position';
import * as T from './vendor/three/three.module.js';
import {StagingRig} from './staging-rig.js?v=taller-comparison';
import {RocketAssemblyGuide} from './rocket-assembly-guide.js?v=tianzhou-solar';
import {RocketSelectionOutline} from './rocket-selection-outline.js?v=tianzhou-solar';
import {RocketBlueprint} from './rocket-blueprint.js?v=course-refinements-20261118';
import {RocketPartInfo} from './rocket-part-info.js?v=tip-pointer';
import {createScanMaterial} from './scan-material.js?v=assembly-uniform-20261117';
import {applyRocketPaint,applyTianzhouPaint,loadTianzhouPaper} from './rocket-paint-material.js?v=assembly-uniform-20261117';
import {applyRocketSelectionHatch} from './rocket-selection-hatch.js';
import {SEPARATION_ASCENT_DURATION,SEPARATION_CHASE_DURATION} from './separation-state.js';
import {loadSeparationPad, updatePadAir} from './separation-pad.js';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';

const tianzhouURL=new URL('./assets/tianzhou-solar/tianzhou-solar.glb',import.meta.url);
const asset=new URL('./assets/cz7-kiu-20261116/',import.meta.url);
export const MODULES=['Stage1','Stage2','Boosters','Payload','Fairing'];
export const STRUCTURE_NODES=['Stage1','Stage2','Boosters','Payload','Fairing','Stage1LOXTank','Stage1FuelTank','Stage1Engine01','Stage2LOXTank','Stage2FuelTank','Stage2Engine01'];
const apply=(o,t)=>{o.position.fromArray(t.translation.map(v=>v===0?0:v));o.quaternion.fromArray(t.rotation);o.scale.fromArray(t.scale);};
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};

/** One renderer lifetime, managed asset mixers, no private clock or RAF. The page owns lesson state. */
export class Rocket3D {
 constructor(host,{invalidate,onPick,onStatus,onStagingPart,onPadReady}){
  Object.assign(this,{host,invalidate,onPick,onStatus,onStagingPart,onPadReady,nodes:{},mode:null,ready:false,dirty:true,selected:null,highlights:[],xraySaved:new Map(),scanMeshes:new Map(),effects:[]});
  this.padLighting={padLightMix:{value:0},padLightA:{value:new T.Vector3()},
   padLightB:{value:new T.Vector3()},padAim:{value:new T.Vector3()}};
  this.layer=document.createElement('div');this.layer.className='rocket-3d';this.layer.hidden=true;host.append(this.layer);
  this.status=document.createElement('div');this.status.className='rocket-3d-status';this.status.setAttribute('role','status');this.layer.append(this.status);
  this.separationViews=document.createElement('div');this.separationViews.className='separation-views';this.separationViews.hidden=true;
  for(const label of ['一级跟拍','二级跟拍']){const view=document.createElement('span');view.textContent=label;this.separationViews.append(view);}
  this.layer.append(this.separationViews);
  this.label=document.createElement('div');this.label.className='rocket-3d-label';this.layer.append(this.label);this.label.hidden=true;this.selectionOutline=new RocketSelectionOutline(this);this.info=new RocketPartInfo(this);this.occlusionHighlights=[];this.pulseTime=0;this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  this.abort=new AbortController();const opts={signal:this.abort.signal};
  this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(host);this.ro.observe(this.layer);
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
     this.renderer=new T.WebGLRenderer({alpha:true,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor(0,0);this.renderer.shadowMap.type=T.PCFSoftShadowMap;
     this.renderer.domElement.addEventListener('webglcontextlost',e=>{if(this.disposed)return;e.preventDefault();this.fail(new Error('WebGL 上下文丢失'));},{signal:this.abort.signal});
     this.renderer.domElement.className='rocket-webgl';this.renderer.domElement.setAttribute('aria-label','长征七号交互三维模型');this.layer.prepend(this.renderer.domElement);
     this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-40,40,30,-30,.1,400);
     this.separationCamera=new T.PerspectiveCamera(34,1,.5,900);
     this.firstStageCamera=new T.PerspectiveCamera(34,1,.5,600);
     this.firstStageCenter=new T.Vector3();
     this.payloadBounds=new T.Box3();
     this.separationBounds=new T.Box3();
     this.padRocketBounds=new T.Box3();
     this.padProjectionPoint=new T.Vector3();
     this.payloadCenter=new T.Vector3();
     this.fillLight=new T.HemisphereLight(0xeaf3ff,0x3b4159,2.1);this.scene.add(this.fillLight);const light=new T.DirectionalLight(0xfff4de,3);light.position.set(-15,30,65);this.scene.add(light);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:.1,far:350});light.shadow.bias=-.00015;light.shadow.normalBias=.02;this.paperLight=light;
     this.paperShadow=new T.Mesh(new T.PlaneGeometry(250,250),new T.ShadowMaterial({color:0x020c18,opacity:.32,depthWrite:false}));this.paperShadow.rotation.x=-Math.PI/2;this.paperShadow.receiveShadow=true;this.paperShadow.renderOrder=-9;this.paperShadow.visible=false;this.scene.add(this.paperShadow);
     this.layout=new T.Group();this.pivot=new T.Group();this.layout.add(this.pivot);this.scene.add(this.layout);
     this.renderer.domElement.addEventListener('click',e=>{if(this.assemblyMotion)return;if(this.mode==='structure'){const hit=this.blueprint?.pick(e)||this.pick(e);if(hit)this.onPick(hit,e);}else if(this.mode==='assembly'){if(this.assemblyMotion||performance.now()<(this.assemblyClickBlockUntil||0))return;const hit=this.blueprint?.pick(e)||this.pick(e);if(hit)this.onPick(hit,e);}else if(this.mode==='comparison'){const hit=this.stagingRig?.pick(e,this.renderer,this.camera);if(hit)this.onStagingPart?.(hit);}}, {signal:this.abort.signal});
    }
    const response=await fetch(new URL('rocket-manifest.json',asset),{cache:'no-cache'});if(!response.ok)throw Error('manifest HTTP '+response.status);
    const manifest=await response.json(),modelURL=new URL(manifest.model,asset);if(manifest.modelRevision)modelURL.searchParams.set('v',manifest.modelRevision);
    const loader=new GLTFLoader();
    const [gltf,tianzhou]=await Promise.all([loader.loadAsync(modelURL.href),loader.loadAsync(tianzhouURL.href)]);
    if(this.disposed){this.disposeObject(gltf.scene);this.disposeObject(tianzhou.scene);return this;}
    this.manifest=manifest;this.model=gltf.scene;this.model.traverse(o=>{if(o.isMesh)o.castShadow=true;if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(!m.userData.rocketPaint)applyRocketPaint(m,this.padLighting);});this.pivot.add(this.model);this.model.traverse(o=>{if(o.name)this.nodes[o.name]=o;});
    for(const n of Object.keys(manifest.defaultTransformsGLTF))if(!this.nodes[n])throw Error('缺少节点 '+n);
    this.hardware=addRocketHardware(this.nodes,this.model);
    this.installTianzhou(tianzhou.scene,tianzhou.animations[0]);
    this.clips=Object.fromEntries(gltf.animations.map(c=>[c.name,c]));this.mixer=new T.AnimationMixer(this.model);
    this.centers={};this.targetCenters={};
    this.reset();this.scene.updateMatrixWorld(true);const assetBounds=new T.Box3().setFromObject(this.model);this.assetSize=assetBounds.getSize(new T.Vector3()).toArray();this.rocketBase=assetBounds.min.y;
    for(const n of MODULES){const root=this.nodes.RocketRoot,center=root.worldToLocal(new T.Box3().setFromObject(this.nodes[n]).getCenter(new T.Vector3())),origin=root.worldToLocal(this.nodes[n].getWorldPosition(new T.Vector3())),anchor=root.worldToLocal(this.nodes[manifest.modules[n].assemblyAnchor].getWorldPosition(new T.Vector3()));this.targetCenters[n]=anchor.add(center.sub(origin));}
    // A shared-geometry reference stays at the assembly anchors; it is never raycast.
    this.scanMaterial=createScanMaterial({opacity:.28,cutaway:true});this.referenceMaterial=createScanMaterial({opacity:.3,color:0x9eafb9});
    this.reference=this.model.clone(true);this.reference.name='AssemblyScanReference';
    this.reference.traverse(o=>{if(o.isMesh){o.userData.scan=true;o.material=this.referenceMaterial;o.visible=/Shell$|Nose$|Engine[0-9]*$|^Fairing(Left|Right)$|^TianzhouMesh[0-9]+$|^Interstage$/.test(o.name);o.renderOrder=1;}});
    this.reference.visible=false;this.pivot.add(this.reference);this.blueprint=new RocketBlueprint(this);this.assemblyGuide=new RocketAssemblyGuide(this);this.assemblyParts=new RocketAssemblyParts(this);
    const scanNames=new Set(manifest.shellNodes);
    for(const n of manifest.xrayOccluderGroups)this.nodes[n].traverse(o=>{if(o.isMesh)scanNames.add(o.name);});
    this.xrayMeshNames=[...scanNames];
    for(const n of this.xrayMeshNames){const original=this.nodes[n];if(!original.isMesh||!(/Shell$|Nose$|Engine[0-9]*$/.test(n)||manifest.shellNodes.includes(n)))continue;
     const scan=new T.Mesh(original.geometry,this.scanMaterial);scan.name='Scan_'+n;scan.userData.scan=true;scan.position.copy(original.position);scan.quaternion.copy(original.quaternion);scan.scale.copy(original.scale);scan.visible=false;scan.renderOrder=2;original.parent.add(scan);this.scanMeshes.set(n,scan);
    }
    for(const n of manifest.anchors.filter(n=>n.endsWith('Flame'))){const exhaust=createRocketExhaust();this.nodes[n].add(exhaust.group);this.effects.push({name:n,...exhaust});}
    this.ready=true;this.failed=false;this.status.hidden=true;this.setScene(this.mode);this.onStatus?.(true);return this;
   }catch(e){this.fail(e);return this;}finally{this.loading=null;}
  })();return this.loading;
 }
 installTianzhou(model,solarClip){
  const payload=this.nodes.Payload;
  const oldParts=payload.children.filter(node=>node.name.startsWith('Payload'));
  payload.updateWorldMatrix(true,true);
  const toPayload=payload.matrixWorld.clone().invert();
  const original=new T.Box3();
  const point=new T.Vector3();
  let radius=0;
  for(const part of oldParts)part.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const matrix=toPayload.clone().multiply(mesh.matrixWorld);
   const vertices=mesh.geometry.getAttribute('position');
   for(let i=0;i<vertices.count;i++){
    point.fromBufferAttribute(vertices,i).applyMatrix4(matrix);
    original.expandByPoint(point);
    radius=Math.max(radius,Math.hypot(point.x,point.z));
   }
  });
  const mounted=new T.Group();
  mounted.name='TianzhouPayload';
  mounted.add(model);
  model.rotation.x=-Math.PI/2;
  const bounds=new T.Box3().setFromObject(mounted,true);
  const center=bounds.getCenter(new T.Vector3());
  let foldedRadius=0;
  model.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const vertices=mesh.geometry.getAttribute('position');
   for(let i=0;i<vertices.count;i++){
    point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld).sub(center);
    foldedRadius=Math.max(foldedRadius,Math.hypot(point.x,point.z));
   }
  });
  // Match the old cargo envelope along the rocket axis and fit the folded wings inside it.
  const radialScale=radius/foldedRadius;
  mounted.scale.set(radialScale,(original.max.y-original.min.y)/(bounds.max.y-bounds.min.y),radialScale);
  mounted.position.copy(original.getCenter(new T.Vector3())).sub(center.multiply(mounted.scale));
  this.tianzhouPaper=loadTianzhouPaper(()=>this.invalidateFrame());
  const animatedNodes=new Set(solarClip.tracks.map(track=>track.name.split(".")[0]));
  let meshIndex=0;
  model.traverse(node=>{
   if(!node.isMesh)return;
   if(!animatedNodes.has(node.name))node.name='TianzhouMesh'+(++meshIndex);
   for(const material of [].concat(node.material))applyTianzhouPaint(material,this.tianzhouPaper);
   node.castShadow=true;
  });
  // Keep the authored transform targets addressable for the existing manifest.
  for(const part of oldParts)part.removeFromParent();
  payload.add(mounted);
  this.solarMixer=new T.AnimationMixer(model);
  this.solarAction=this.solarMixer.clipAction(solarClip).setLoop(T.LoopOnce,1);
  this.solarAction.clampWhenFinished=true;
  this.solarDuration=solarClip.duration;
  this.retiredPayloadMeshes=oldParts;
 }
 fail(e){this.ready=false;this.failed=true;this.status.hidden=false;this.status.replaceChildren(document.createTextNode('模型加载失败 / WebGL 不可用：'+e.message));const b=document.createElement('button');b.textContent='重试';b.onclick=()=>{if(this.renderer?.getContext().isContextLost())location.reload();else this.load({retry:true});};this.status.append(b);this.onStatus?.(false);}
 invalidateFrame(){this.dirty=true;this.invalidate();}
 reset(){
  if(!this.model)return;this.clearDissolve();this.assemblyMotion=null;this.mixer.stopAllAction();this.mixer.timeScale=1;this.active=null;this.playbackFamily=null;this.clearSelection();this.setXray(false);
  for(const [n,t] of Object.entries(this.manifest.defaultTransformsGLTF)){apply(this.nodes[n],t);this.nodes[n].visible=true;}
  for(const name of STRUCTURE_NODES.slice(MODULES.length))for(const part of this.assemblyParts?.members(name)||[])this.nodes[part].visible=true;
  this.restoreBoosters();
  this.restoreSeparationDebris();
  this.setSolarDeployment(0);
  this.separationVapor?.clear();
  this.effects.forEach(e=>{e.reset();e.group.scale.setScalar(1);});this.layout.position.set(0,0,0);this.layout.rotation.set(0,0,0);this.layout.scale.setScalar(1);this.pivot.position.set(0,-26.55,0);this.launchTime=null;if(this.reference){this.reference.visible=false;for(const n of MODULES)this.reference.getObjectByName(n).visible=true;}
  this.ascentProgress=null;this.model.visible=true;if(this.stagingRig)this.stagingRig.root.visible=false;this.camera.position.set(0,0,100);this.camera.zoom=1;this.camera.far=400;this.camera.lookAt(0,0,0);this.resize();this.invalidateFrame();
 }
 setScene(mode,{resetPose=true}={}){this.mode=mode;this.layer.hidden=!mode;if(mode!=='separation'){delete this.layer.dataset.separationShot;this.layer.removeAttribute('data-separation-pad');this.layer.style.removeProperty('transform');this.separationViews.hidden=true;this.syncSeparationPad();}if(!this.ready||!resetPose)return;this.renderer.toneMapping=T.NoToneMapping;this.status.hidden=true;this.blueprint?.setVisible(false);this.renderer.shadowMap.enabled=['structure','assembly'].includes(mode);if(this.paperShadow)this.paperShadow.visible=false;if(this.scanMaterial){
  // Show the inside of the far wall after the shader clips away the near wall.
  this.scanMaterial.side=mode==='assembly'?T.DoubleSide:T.FrontSide;
  this.scanMaterial.uniforms.strength.value=mode==='assembly'?.62:.28;
 }this.renderer.domElement.setAttribute('aria-label',mode==='comparison'?'三方案火箭交互三维模型':'长征七号交互三维模型');this.paperLight.position.set(-15,30,65);this.fillLight.intensity=['launch','separation'].includes(mode)?.85:2.1;this.paperLight.intensity=['launch','separation'].includes(mode)?1.65:3;this.reset();if(mode==='separation'){this.followSeparation(0,0,'ready');this.prepareSeparationPad();}this.layout.rotation.z=['separation','launch'].includes(mode)?0:Math.PI/2;if(this.reference)this.reference.visible=false;
  if(['structure','assembly'].includes(mode)){
   if(mode==='assembly'){
    // Leave room between the upper callouts and the lower drafting row.
    this.layout.scale.setScalar(.80);
    this.layout.position.z=2.3;
    this.assemblyGuide.installed.clear();
   }
   this.scene.updateMatrixWorld(true);this.paperY=new T.Box3().setFromObject(this.reference).min.y;
   this.paperLight.position.set(-15,180,20);this.paperShadow.position.y=this.paperY-.04;this.paperShadow.visible=true;this.paperLight.target.position.set(0,this.paperY,0);this.paperLight.target.updateMatrixWorld();this.paperRestDelta=Object.fromEntries(MODULES.map(n=>[n,this.paperY-new T.Box3().setFromObject(this.reference.getObjectByName(n)).min.y]));
   if(mode==='structure')for(const n of MODULES)this.setModule(n,true);
   const focus=this.paperY*.4;this.camera.position.set(0,focus+145,110);this.camera.lookAt(0,focus,0);
  }
  if(['launch','separation'].includes(mode))this.layout.rotation.y=-.55;if(mode==='comparison'){this.model.visible=false;if(this.stagingRig)this.stagingRig.root.visible=true;else if(this.stagingError)this.showComparisonError();else this.loadComparison();}this.resize();this.blueprint?.setVisible(mode==='structure'||mode==='assembly');this.assemblyParts?.setVisible(mode==='assembly');this.assemblyGuide?.update();}
 resize(){if(!this.renderer)return;const w=this.layer.clientWidth,h=this.layer.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);const aspect=w/h;if(this.mode==='separation'){this.frameSeparation(w,h);return;}if(this.mode==='comparison'){this.camera.far=2000;const centerX=COMPARISON_WIDTH/2,centerY=COMPARISON_HEIGHT/2,half=Math.max(centerY,centerX/aspect);this.camera.position.set(centerX,centerY,1000);this.camera.lookAt(centerX,centerY,0);this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.invalidateFrame();return;}const half=this.mode==='launch'?35:['structure','assembly'].includes(this.mode)?this.layer.clientHeight/464*11.5:32/aspect;this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.blueprint?.draw();if(this.mode==='assembly'&&!this.assemblyMotion)for(const n of MODULES)if(!this.assemblyGuide?.installed.has(n))this.setModule(n,false);this.assemblyParts?.layout();this.invalidateFrame();}
 setXray(enabled){if(!this.manifest)return;
  if(enabled&&!this.xraySaved.size){for(const n of this.xrayMeshNames||[]){this.xraySaved.set(n,this.nodes[n].visible);this.nodes[n].visible=false;const scan=this.scanMeshes.get(n);if(scan)scan.visible=true;}}
  else if(!enabled){for(const [n,v] of this.xraySaved)this.nodes[n].visible=v;this.xraySaved.clear();for(const scan of this.scanMeshes.values())scan.visible=false;}
  this.invalidateFrame();
 }
 clearSelection(preserveAnchor=false){if(!preserveAnchor&&this.blueprint){this.blueprint.hover=null;this.blueprint.pressed=null;this.blueprint.key=null;}this.info?.clear(preserveAnchor);this.selectionOutline?.hide();for(const [mesh,original,clones]of this.occlusionHighlights||[]){mesh.material=original;clones.forEach(m=>m.dispose());}this.occlusionHighlights=[];this.selectionRoots=[];this.pulseTime=0;for(const [mesh,original,clones] of this.highlights){mesh.material=original;clones.forEach(m=>m.dispose());}this.highlights=[];this.selected=null;this.label.hidden=true;this.blueprint?.draw();}
 select(n,label){if(this.blueprint){this.blueprint.hover=null;this.blueprint.pressed=null;}this.clearSelection(true);const o=this.nodes[n];if(!o)return;this.selected=n;const roots=/^Stage[12]Engine01$/.test(n)?Object.values(this.nodes).filter(node=>new RegExp('^'+n.slice(0,-2)+'0[1-4]$').test(node.name)):[o];this.selectionRoots=roots.map(root=>root.name);for(const source of roots){const root=this.displayNode(source.name);root.traverse(mesh=>{if(!mesh.isMesh)return;const original=mesh.material,clones=(Array.isArray(original)?original:[original]).map(m=>{const c=m.clone();if(m.userData.rocketPaint){delete c.userData.rocketPaint;applyRocketPaint(c);applyRocketSelectionHatch(c,this.renderer.getPixelRatio());}c.emissive?.set(0x8b5720);if(mesh.userData.scan){c.uniforms.tint.value.set(0xe8bf7e);c.uniforms.strength.value=this.mode==='assembly'?.8:.65;}return c;});mesh.material=Array.isArray(original)?clones:clones[0];this.highlights.push([mesh,original,clones]);});}if(n==='Stage1'&&this.mode==='structure')this.fadeBoosters();this.label.textContent=label;this.label.hidden=true;this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);this.selectionOutline.show(n,roots.map(root=>root.name));this.blueprint?.draw();this.info.update();this.invalidateFrame();}
 displayNode(name){const loose=this.assemblyParts?.nodes.get(name);return this.assemblyParts?.root.visible&&loose?.visible?loose:this.nodes[name];}
 partFor(mesh){let o=mesh;while(o){if(o.userData.assemblyPart)return o.userData.assemblyPart;if(STRUCTURE_NODES.includes(o.name))return o.name;if(o.name.startsWith('Stage1Engine'))return 'Stage1Engine01';if(o.name.startsWith('Stage2Engine'))return 'Stage2Engine01';o=o.parent;}return null;}
 pick(e){this.scene.updateMatrixWorld(true);const r=this.renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);
  const hits=[...ray.intersectObject(this.model,true),...(this.assemblyParts?.root.visible?ray.intersectObject(this.assemblyParts.root,true):[])].sort((a,b)=>a.distance-b.distance).filter(h=>h.object.isMesh&&visible(h.object)&&!this.effects.some(e=>e.group===h.object.parent));
  // Read internal solid parts through the grid; the outline is a selectable fallback.
  return hits.filter(h=>!h.object.userData.scan).map(h=>this.partFor(h.object)).find(Boolean)||hits.filter(h=>h.object.userData.scan).map(h=>this.partFor(h.object)).find(Boolean);
 }
 projectLocal(point){this.scene.updateMatrixWorld(true);const p=this.nodes.RocketRoot.localToWorld(point.clone()).project(this.camera);return{x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2};}
 target(n){return this.targetCenters[n]?this.projectLocal(this.targetCenters[n]):this.assemblyCenter(n,true);}
 assemblyCenter(name,installed=false){
  const members=this.assemblyParts.members(name);
  if(!members.length)return this.moduleCenter(name);
  this.scene.updateMatrixWorld(true);
  const box=new T.Box3();
  for(const part of members)box.expandByObject(installed?this.nodes[part]:this.displayNode(part));
  const p=box.getCenter(new T.Vector3()).project(this.camera);
  return{x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2};
 }
 moduleCenter(n){this.scene.updateMatrixWorld(true);const box=new T.Box3();this.nodes[n].traverse(o=>{if(!o.isMesh||o.userData.scan||this.reference.getObjectByName(o.name)?.geometry!==o.geometry)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});const p=box.getCenter(new T.Vector3()).project(this.camera);return{x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2};}
 screenBounds(n,names=[n]){this.scene.updateMatrixWorld(true);const box=new T.Box3();for(const name of names)this.nodes[name].traverse(o=>{if(!o.isMesh||o.userData.scan||this.reference.getObjectByName(o.name)?.geometry!==o.geometry)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(this.camera);points.push({x:(p.x+1)*this.host.clientWidth/2,y:(1-p.y)*this.host.clientHeight/2});}return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}
 get needsSelectionFrame(){return this.ready&&!this.disposed&&!!this.selected&&!this.reducedMotion.matches&&['structure','assembly'].includes(this.mode);}
 fadeBoosters(){this.nodes.Boosters.traverse(mesh=>{if(!mesh.isMesh||mesh.userData.scan)return;const original=mesh.material,clones=(Array.isArray(original)?original:[original]).map(m=>{const c=m.clone();if(m.userData.rocketPaint){delete c.userData.rocketPaint;applyRocketPaint(c);}c.transparent=true;c.opacity=.18;c.depthWrite=false;return c;});mesh.material=Array.isArray(original)?clones:clones[0];this.occlusionHighlights.push([mesh,original,clones]);});}
 updateSelection(dt){if(!this.selected)return;if(this.needsSelectionFrame){this.pulseTime+=dt;this.dirty=true;}const pulse=this.reducedMotion.matches?.65:.5-.5*Math.cos(this.pulseTime*Math.PI*2/2.4);this.pulseValue=pulse;for(const [, , materials]of this.highlights)for(const m of materials){if(m.emissive)m.emissiveIntensity=.18+1.05*pulse;if(m.uniforms?.strength)m.uniforms.strength.value=.42+.25*pulse;}}

 // Temporary shader variants share textures and are released at every exit/reset.
 clearDissolve(){for(const [mesh,material,variants,shadow]of this.dissolveMeshes||[]){mesh.material=material;mesh.castShadow=shadow;variants.forEach(m=>m.dispose());}this.dissolveMeshes=[];}
 dissolve(direction,onComplete){
  this.clearDissolve();this.clearSelection();this.setXray(false);
  this.scene.updateMatrixWorld(true);
  const tick={value:0},amount={value:direction==='out'?0:1};this.dissolveMeshes=[];
  for(const root of [this.model,...(direction==='in'?[this.assemblyParts.root]:[])])root.traverse(mesh=>{
   if(!mesh.isMesh||mesh.userData.scan||!visible(mesh))return;
   const bounds=new T.Box3().setFromObject(mesh),base=bounds.min.y,height=Math.max(.001,bounds.max.y-base);
   const original=mesh.material,variants=(Array.isArray(original)?original:[original]).map(source=>{
    const material=source.clone(),compile=source.onBeforeCompile,key=source.customProgramCacheKey();
    material.onBeforeCompile=shader=>{compile.call(source,shader);shader.uniforms.rocketDissolve=amount;shader.uniforms.glitchTick=tick;shader.uniforms.glitchBlock={value:14*this.renderer.getPixelRatio()};shader.uniforms.dissolveBase={value:base};shader.uniforms.dissolveHeight={value:height};
     shader.vertexShader='varying vec3 vDissolvePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDissolvePosition=(modelMatrix*vec4(transformed,1.)).xyz;');
     shader.fragmentShader='varying vec3 vDissolvePosition; uniform float rocketDissolve; uniform float dissolveBase; uniform float dissolveHeight; uniform float glitchTick; uniform float glitchBlock;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`{
      // Original model-space implementation; see docs/GLITCH_TRANSITION_20261117.md.
      // Quantized packets and scan rows, no organic noise, texture samples or loops.
      float elevation=clamp((vDissolvePosition.y-dissolveBase)/dissolveHeight,0.,1.);
      vec2 packet=floor(gl_FragCoord.xy/glitchBlock);
      float code=fract(dot(packet,vec2(.754877666,.569840296)));
      float row=packet.y;
      // Sample height at the screen-cell centre so a packet disappears as one square.
      vec2 cellOffset=(packet+.5)*glitchBlock-gl_FragCoord.xy;
      float cellElevation=clamp(elevation+dot(vec2(dFdx(elevation),dFdy(elevation)),cellOffset),0.,1.);
      float field=clamp(.04+.88*(1.-cellElevation)+(code-.5)*.22,.001,.999);
      if(field<rocketDissolve)discard;
      float glitchEnabled=step(.001,rocketDissolve)*(1.-step(.999,rocketDissolve));
      float front=step(field-rocketDissolve,.18)*glitchEnabled;
      float packetDrop=step(.72,fract(code+floor(glitchTick)*.381966));
      if(front*packetDrop>.5)discard;
      float scan=step(.55,code);
      float channel=step(.5,fract(row*.618034+floor(glitchTick)*.236068));
      vec3 signal=mix(vec3(.08,.35,1.25),vec3(1.25,.85,.08),channel);
      outgoingLight=mix(outgoingLight,signal,front*(.38+.62*scan));
     }\n#include <opaque_fragment>`);};
    material.customProgramCacheKey=()=>key+'-assembly-glitch-blue-yellow-v5';return material;
   });this.dissolveMeshes.push([mesh,original,variants,mesh.castShadow]);mesh.castShadow=false;mesh.material=Array.isArray(original)?variants:variants[0];
  });
  this.assemblyMotion={direction,amount,tick,elapsed:direction==='in'&&!this.reducedMotion.matches?-.06:0,duration:this.reducedMotion.matches?.1:direction==='out'?.28:.38,onComplete};this.invalidateFrame();
 }
 disassemble(onComplete){this.dissolve('in',onComplete);}
 setModule(n,installed){
  if(this.reference)this.reference.getObjectByName(n).visible=!installed;
  const o=this.nodes[n],spec=this.manifest.modules[n];apply(o,spec.assembledGLTF);
  if(!installed&&this.mode==='assembly'&&this.blueprint?.data){
   // Loose pieces rest over their own drafting positions. Installed geometry is untouched.
   this.blueprint.draw();const regions=this.blueprint.data.assembly.filter(r=>r.node===n);
   const points=regions.flatMap(r=>{const[x,y,w,h]=r.rect;return [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(p=>this.blueprint.project(...p));});
   const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
   const fit=this.assemblyDisplayScale();
   o.scale.multiplyScalar(fit);this.scene.updateMatrixWorld(true);
   const center=this.moduleCenter(n),start=o.position.clone();this.moveModule(n,(left+right)/2-center.x,(top+bottom)/2-center.y-8,start);
   // Raise/lower along the view ray so the silhouette stays on the drawing while resting on paper.
   this.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(o),direction=this.camera.getWorldDirection(new T.Vector3());
   const rest=direction.clone().multiplyScalar((this.paperY-box.min.y)/direction.y).applyMatrix3(new T.Matrix3().setFromMatrix4(o.parent.matrixWorld).invert());o.position.add(rest);
  }
  this.assemblyGuide?.setInstalled(n,installed);
  this.invalidateFrame();
 }
 setAssemblyShells(seeThrough){
  for(const [name,scan] of this.scanMeshes){
   if(!/^(Stage[12]Shell|Interstage|FairingLeft|FairingRight|Booster.*)$/.test(name))continue;
   this.nodes[name].visible=!seeThrough;
   scan.visible=seeThrough;
  }
  this.invalidateFrame();
 }
 assemblyDisplayScale(){const data=this.blueprint?.data?.assemblyLayout;return data?data.pixelsPerModelUnit*this.blueprint.plane.scale.x/1920/this.layout.scale.x:.5;}
 moveModule(n,dx,dy,start){
  const node=this.displayNode(n);
  const v=new T.Vector3(dx/this.host.clientWidth*(this.camera.right-this.camera.left),-dy/this.host.clientHeight*(this.camera.top-this.camera.bottom),0).applyQuaternion(this.camera.quaternion);
  // Keep the grabbed module on the paper plane; compensate camera elevation, not pointer scale.
  const direction=this.camera.getWorldDirection(new T.Vector3());if(Math.abs(direction.y)>.001)v.addScaledVector(direction,-v.y/direction.y);
  v.applyMatrix3(new T.Matrix3().setFromMatrix4(node.parent.matrixWorld).invert());node.position.copy(start).add(v);this.invalidateFrame();
 }
 play(name){if(!this.ready)return;const clip=this.clips[name];if(!clip)throw Error('未知动画 '+name);const family=['AssemblyPreview','LaunchPreview','SeparationPreview'].includes(name)?'preview':'steps';if(family==='preview'||this.playbackFamily==='preview')this.reset();this.playbackFamily=family;this.active=this.mixer.clipAction(clip);this.active.reset().setLoop(T.LoopOnce,1);this.active.clampWhenFinished=true;this.active.play();this.mixer.update(0);this.invalidateFrame();}
 pause(paused){this.mixer.timeScale=paused?0:1;}
 seek(seconds){if(!this.active)return;this.active.time=Math.max(0,Math.min(seconds,this.active.getClip().duration));this.mixer.update(0);this.invalidateFrame();}
 async prepareSeparationPad(){
  if(this.separationPad||this.separationPadLoading)return;
  this.separationPadLoading=true;
  try {
   const pad=await loadSeparationPad(this.rocketBase,this.padLighting);
   if(this.disposed){this.disposeObject(pad);return;}
   this.separationPad=pad;
   this.liftoffAir=pad.getObjectByName('LiftoffAir');
   this.scene.add(pad);
   this.syncSeparationPad();
   this.onPadReady?.();
   this.invalidateFrame();
  } catch(error){
   if(!this.disposed&&this.mode==='separation'){
    this.status.hidden=false;
    this.status.textContent='发射台模型加载失败，可重新进入本页重试。';
    console.warn(error);
   }
  } finally {
   this.separationPadLoading=false;
  }
 }
 syncSeparationPad(){
  const visible=this.mode==='separation'&&this.layer.hasAttribute('data-separation-pad');
  if(this.separationPad)this.separationPad.visible=visible;
  if(this.liftoffAir&&!visible)this.liftoffAir.visible=false;
  this.padLighting.padLightMix.value=visible&&this.separationPad?1:0;
 }
 followSeparation(index,local,phase){
  const reduced=this.reducedMotion.matches;
  if(phase==='ascent'){
   const travel=Math.max(0,(local-.52)/(SEPARATION_ASCENT_DURATION-.52));
   this.layout.position.y=125*Math.pow(travel,3.35);
   this.layout.rotation.z=0;
   this.separationFraming=this.padFraming;
   this.setSeparationShot('ignition');
   this.padIgnitionTime=local;
   this.frameSeparation(this.layer.clientWidth,this.layer.clientHeight);
   return this.hasClearedPadFrame();
  }
  updatePadAir(this.liftoffAir,0,reduced);
  const ready=phase==='ready';
  const chasing=phase==='chase';
  const dropping=phase==='booster-drop';
  const exiting=phase==='debris-exit';
  const boosterSplit=index===0&&phase==='animation'||dropping;
  const stageSplit=index===1&&phase==='animation';
  const split=(stageSplit&&local>=.75)||(index===1&&exiting);
  this.layout.position.y=ready?0:44;
  const flightProgress=(index+(dropping||exiting?1:phase==='animation'?Math.min(1,local/2):0))/4;
  let pitch=chasing
   ?.18*T.MathUtils.smoothstep(local,.45,SEPARATION_CHASE_DURATION)
   :T.MathUtils.lerp(.18,1.34,T.MathUtils.smoothstep(flightProgress,0,1));
  if(index===3&&exiting)pitch=T.MathUtils.lerp(pitch,Math.PI/2,
   T.MathUtils.smoothstep(local,0,1));
  this.layout.rotation.z=ready?0:-pitch;
  this.scene.updateMatrixWorld(true);

  let target=this.separationBounds.setFromObject(this.nodes.Stage2);
  if(!split&&index<2)target.expandByObject(this.nodes.Stage1);
  if(index===0&&!dropping&&!boosterSplit)target.expandByObject(this.nodes.Boosters);
  if(index<2)target.expandByObject(this.nodes.Fairing);
  if(index===2&&phase==='waiting')target.expandByObject(this.nodes.Fairing);
  const release=index===3&&(phase==='animation'||exiting);
  if(index>=2)target.expandByObject(this.nodes.Payload);
  const focus=target.getCenter(this.payloadCenter);
  let half=Math.max(11,(target.max.y-target.min.y)*.63);
  let angle=.55;
  let elevation=-.14;
  let fov=34;
  let shot=chasing?'chase':index===2?'fairing':index>=3?'payload':'staging';
  let minY=-Infinity;
  if(ready){
   shot='pad';angle=1.46;elevation=-.21;half*=1.18;focus.y-=5;minY=this.rocketBase+4;
  }else if(stageSplit&&!split){
   half*=1.12;
   fov=25;
  }else if(release){
   target=this.payloadBounds.setFromObject(this.nodes.Payload);
   const reveal=reduced||exiting?1:T.MathUtils.smoothstep(local,.15,1.6);
   focus.lerp(target.getCenter(this.firstStageCenter),reveal);
   half=T.MathUtils.lerp(half,11,reveal);
   angle=T.MathUtils.lerp(.55,.16,reveal);
   elevation*=1-reveal;
   focus.y-=3.8*reveal;
  }
  const powered=!ready&&!release;
  this.separationFraming={x:focus.x,y:focus.y-(powered?half*.21:0),z:focus.z,
   half:powered?half*1.28:half,angle,elevation,fov,split,minY};
  this.boosterViewportAmount=boosterSplit
   ?(dropping?1:(reduced?Number(local>=.45):T.MathUtils.smoothstep(local,.30,.85)))
   :0;
  if(dropping)this.dropBoosters(local,reduced);
  if(ready){
   this.padFraming=this.separationFraming;
   this.padRocketBounds.setFromObject(this.model);
   this.separationVapor??=createSeparationVapor(this.layout,this.nodes);
  }
  if(split&&!exiting){
   const stage=this.payloadBounds.setFromObject(this.nodes.Stage1);
   const center=stage.getCenter(this.firstStageCenter);
   this.firstStageFraming={x:center.x,y:center.y,z:center.z,half:Math.max(14,(stage.max.y-stage.min.y)*.72),angle:-.7,elevation:.16,fov:27};
  }
  this.setSeparationShot(split?'split':shot);
  this.frameSeparation(this.layer.clientWidth,this.layer.clientHeight);
  if(dropping)return this.finishBoosterDrop(local,reduced);
  const cleared=exiting&&this.moveSeparationDebris(index,local,split?this.firstStageCamera:this.separationCamera);
  return cleared&&(index!==3||local>=1);
 }
 setSolarDeployment(progress){
  if(!this.solarAction||this.solarProgress===progress)return;
  this.solarProgress=progress;
  this.solarAction.reset().play();
  this.solarMixer.setTime(this.solarDuration*progress);
  this.invalidateFrame();
 }
 drawPayloadOrbit(progress,age){
  this.setSolarDeployment(progress);
  const drift=1-Math.exp(-age*.52);
  const framing=this.separationFraming;
  if(age>0){
   const offset=4.5*drift;
   this.placeSeparationCamera(this.separationCamera,
    {...framing,x:framing.x-offset*Math.cos(framing.angle),z:framing.z+offset*Math.sin(framing.angle)},
    this.layer.clientWidth/this.layer.clientHeight);
   this.dirty=true;
  }
  this.update(0);
 }
 moveSeparationDebris(index,local,camera){
  this.separationDebris??=new Map();
  if(!this.separationDebris.has(index)){
   const names=[[],['Stage1'],['FairingLeft','FairingRight'],['Stage2']][index];
   const parts=names.map(name=>{
    const node=this.nodes[name];
    const parent=node.parent;
    this.scene.attach(node);
    return {node,parent,start:node.position.clone(),bounds:new T.Box3()};
   });
   this.separationDebris.set(index,parts);
  }
  const parts=this.separationDebris.get(index);
  const drift=18*local+34*local*local;
  let cleared=true;
  for(const [offset,part] of parts.entries()){
   const {node,start,bounds}=part;
   if(!node.parent)continue;
   node.position.copy(start);
   node.position.y-=drift;
   if(parts.length>1)node.position.z+=(offset===0?-1:1)*drift*.28;
   if(this.isBelowSeparationFrame(camera,bounds.setFromObject(node)))node.removeFromParent();
   else cleared=false;
  }
  return cleared;
 }
 restoreSeparationDebris(){
  if(!this.separationDebris)return;
  for(const parts of this.separationDebris.values()){
   for(const {node,parent} of parts)parent.add(node);
  }
  this.separationDebris.clear();
 }
 dropBoosters(local,reduced){
  const boosters=this.nodes.Boosters;
  if(!this.boosterFall){
   this.boosterFall={parent:boosters.parent,bounds:new T.Box3(),collapseAt:null};
   this.scene.attach(boosters);
   this.boosterFall.startY=boosters.position.y;
  }
  const fall=this.boosterFall;
  if(fall.collapseAt===null){
   boosters.position.y=fall.startY-24*local-22*local*local;
  }else{
   this.boosterViewportAmount=reduced?0:1-T.MathUtils.smoothstep(local,fall.collapseAt,fall.collapseAt+.42);
  }
 }
 finishBoosterDrop(local,reduced){
  const fall=this.boosterFall;
  if(fall.collapseAt!==null)return this.boosterViewportAmount===0;
  const boosters=this.nodes.Boosters;
  fall.bounds.setFromObject(boosters);
  if(![this.separationCamera,this.firstStageCamera].every(camera=>this.isBelowSeparationFrame(camera,fall.bounds)))return false;
  boosters.removeFromParent();
  fall.collapseAt=local;
  if(!reduced)return false;
  this.boosterViewportAmount=0;
  return true;
 }
 isBelowSeparationFrame(camera,{min,max}){
  camera.updateMatrixWorld();
  for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
   const point=this.padProjectionPoint.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);
   if(point.z<0&&point.applyMatrix4(camera.projectionMatrix).y>=-1.03)return false;
  }
  return true;
 }
 restoreBoosters(){
  if(!this.boosterFall)return;
  this.boosterFall.parent.add(this.nodes.Boosters);
  this.boosterFall=null;
  this.boosterViewportAmount=0;
 }
 setSeparationShot(shot){
  if(this.layer.dataset.separationShot===shot)return;
  this.layer.dataset.separationShot=shot;
  if(shot!=='ignition')this.layer.style.removeProperty('transform');
  this.layer.toggleAttribute('data-separation-pad',shot==='pad'||shot==='ignition');
  this.separationViews.hidden=shot!=='split';
  this.syncSeparationPad();
 }
 hasClearedPadFrame(){
  const {min,max}=this.padRocketBounds;
  const camera=this.separationCamera;
  camera.updateMatrixWorld();
  this.layout.updateMatrix();
  for(const x of [min.x,max.x]){
   for(const y of [min.y,max.y]){
    for(const z of [min.z,max.z]){
     if(this.padProjectionPoint.set(x,y,z).applyMatrix4(this.layout.matrix).project(camera).y<=1)return false;
    }
   }
  }
  return true;
 }
 frameSeparation(width,height){
  if(!this.separationFraming||!width||!height)return;
  const {split}=this.separationFraming;
  this.boosterFullViewport=Math.floor(width*.40);
  this.boosterViewport=Math.round(this.boosterFullViewport*(this.boosterViewportAmount||0));
  this.firstStageViewport=split?Math.floor(width/2):this.boosterViewport;
  this.layer.style.setProperty('--booster-viewport',`${this.boosterViewport}px`);
  this.layer.toggleAttribute('data-booster-viewport',this.boosterViewport>0);
  this.placeSeparationCamera(this.separationCamera,this.separationFraming,(width-this.firstStageViewport)/height);
  if(split)this.placeSeparationCamera(this.firstStageCamera,this.firstStageFraming,this.firstStageViewport/height);
  if(this.boosterViewport)this.placeSeparationCamera(this.firstStageCamera,
   {x:0,y:14,z:0,half:29,angle:-1.18,elevation:-.92,fov:37},this.boosterFullViewport/height);
  this.invalidateFrame();
 }
 placeSeparationCamera(camera,{x,y,z,half,angle,elevation,fov,minY=-Infinity},aspect){
  camera.fov=fov;
  camera.aspect=aspect;
  const distance=half/(Math.tan(T.MathUtils.degToRad(fov/2))*Math.min(1,aspect/.48));
  camera.position.set(x+distance*Math.sin(angle),Math.max(minY,y+distance*elevation),z+distance*Math.cos(angle));
  camera.lookAt(x,y,z);
  camera.updateProjectionMatrix();
 }
 renderSeparation(){
  const renderer=this.renderer;
  const side=this.firstStageViewport;
  if(!side){renderer.render(this.scene,this.separationCamera);return;}
  const {clientWidth:width,clientHeight:height}=this.layer;
  const main=width-side;
  const modules=MODULES.map(name=>this.nodes[name]);
  const visibility=modules.map(module=>module.visible);
  const firstStage=this.nodes.Stage1;
  const boosters=this.nodes.Boosters;
  renderer.setScissorTest(true);
  try {
   if(!this.boosterViewport){
    firstStage.visible=false;
    boosters.visible=false;
   }
   renderer.setViewport(side,0,main,height);
   renderer.setScissor(side,0,main,height);
   renderer.render(this.scene,this.separationCamera);
   const observedPart=this.boosterViewport?boosters:firstStage;
   modules.forEach((module,index)=>{module.visible=module===observedPart&&visibility[index];});
   const sideWidth=this.boosterViewport?this.boosterFullViewport:side;
   renderer.setViewport(side-sideWidth,0,sideWidth,height);
   renderer.setScissor(0,0,side,height);
   renderer.render(this.scene,this.firstStageCamera);
  } finally {
   modules.forEach((module,index)=>{module.visible=visibility[index];});
   renderer.setScissorTest(false);
   renderer.setViewport(0,0,width,height);
  }
 }
 async loadComparison(){
  if(this.stagingRig||this.disposed)return;
  this.status.hidden=false;this.status.textContent='正在加载分级对照模型…';if(this.stagingLoading)return;
  this.stagingLoading=StagingRig.load({model:this.model,nodes:this.nodes,manifest:this.manifest});
  try{const rig=await this.stagingLoading;if(this.disposed){rig.dispose();return;}this.stagingRig=rig;this.scene.add(rig.root);rig.root.visible=this.mode==='comparison';if(this.comparisonLesson)rig.setState(this.comparisonLesson);if(this.mode==='comparison')this.status.hidden=true;this.invalidateFrame();}
  catch(e){if(this.disposed)return;this.stagingError=e;if(this.mode==='comparison')this.showComparisonError();}
  finally{this.stagingLoading=null;}
 }
 showComparisonError(){this.status.hidden=false;this.status.textContent='分级对照模型加载失败：'+this.stagingError.message;const b=document.createElement('button');b.textContent='重试';b.onclick=()=>{this.stagingError=null;this.loadComparison();};this.status.append(b);}
 setComparison(lesson){this.comparisonLesson=lesson;if(this.ready&&this.mode==='comparison'){this.stagingRig?.setState(lesson);this.invalidateFrame();}}
 setAscent(progress,heightRatio=0){
  if(this.mode!=='launch')return 0;
  const reduced=this.reducedMotion.matches;
  const reveal=reduced?Number(progress>0):T.MathUtils.smoothstep(progress,0,.16);
  if(progress===this.ascentProgress&&heightRatio===this.ascentHeightRatio&&reduced===this.ascentReducedMotion)return reveal;
  this.ascentProgress=progress;
  this.ascentHeightRatio=heightRatio;
  this.ascentReducedMotion=reduced;
  this.layer.style.setProperty('--launch-pad-opacity',String(1-reveal));
  const scan=reduced?Math.floor(heightRatio*2)/2:heightRatio;
  this.layer.style.setProperty('--launch-sky-position',(100*(1-scan))+'%');
  return reveal;
 }
 beginLaunch(){this.assemblyParts?.setVisible(false);if(this.reference)this.reference.visible=false;this.blueprint?.setVisible(false);this.launchTime=0;}
 startSeparationVapor(index,effectTime){
  this.separationVapor?.start(index,effectTime);
 }
 updateSeparationEffects(effectTime,padIgnition){
  const reduced=this.reducedMotion.matches;
  this.separationVapor?.update(effectTime,reduced);
  if(padIgnition)updatePadAir(this.liftoffAir,this.padIgnitionTime,reduced,this.layout.position.y,effectTime);
  if(reduced){
   this.layer.style.removeProperty('transform');
   return;
  }
  const ignition=padIgnition?T.MathUtils.smoothstep(this.padIgnitionTime,.02,.23):1;
  const groundShock=padIgnition?1-T.MathUtils.smoothstep(this.layout.position.y,8,75):0;
  const strength=ignition*(.48+2.4*groundShock);
  const dx=strength*(Math.sin(effectTime*34)+.36*Math.sin(effectTime*57));
  const dy=strength*(Math.sin(effectTime*43+.2)+.4*Math.sin(effectTime*71));
  this.layer.style.transform=`translate(${dx}px,${dy}px) scale(${1+.012*ignition*groundShock})`;
  this.dirty=true;
 }
 update(dt,{animate=false,effectTime=0,flames=false,exhaustStage=0,renderFrame=true}={}){
  if(!this.ready||!this.mode||document.hidden)return;
  if(this.assemblyMotion){const m=this.assemblyMotion;m.elapsed+=dt;const t=Math.max(0,Math.min(1,m.elapsed/m.duration));m.amount.value=m.direction==='out'?t:1-t;m.tick.value=this.reducedMotion.matches?0:Math.floor(Math.max(0,m.elapsed)*12);this.dirty=true;if(t===1){this.assemblyMotion=null;if(m.direction==='out'){this.model.visible=false;}this.clearDissolve();m.onComplete?.();}}
  this.updateSelection(dt);
  if(this.mode==='comparison'){if(this.dirty){this.renderer.render(this.scene,this.camera);this.dirty=false;}return;}
  if(animate){this.mixer.update(dt);if(this.launchTime!==null){this.launchTime+=dt;const u=T.MathUtils.smoothstep(this.launchTime,0,1.6);this.layout.rotation.z=Math.PI/2*(1-u);this.layout.scale.setScalar(1);const aspect=this.host.clientWidth/this.host.clientHeight,half=22*(1-u)+36*u+3*Math.sin(Math.PI*u);this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.layout.position.y=Math.min(8,Math.max(0,this.launchTime-1.6)*3);
    this.scene.updateMatrixWorld(true);this.launchBox??=new T.Box3();this.launchBox.setFromObject(this.model);const box=this.launchBox;
    const fit=Math.max(half,Math.abs(box.min.y)*1.06,Math.abs(box.max.y)*1.06,Math.abs(box.min.x)/aspect*1.06,Math.abs(box.max.x)/aspect*1.06);
    this.camera.left=-fit*aspect;this.camera.right=fit*aspect;this.camera.top=fit;this.camera.bottom=-fit;this.camera.updateProjectionMatrix(); }this.dirty=true;}
  if(!renderFrame)return;
  const padIgnition=this.mode==='separation'&&this.layer.dataset.separationShot==='ignition';
  if(this.mode==='separation'&&flames)this.updateSeparationEffects(effectTime,padIgnition);
  const spool=padIgnition?T.MathUtils.smoothstep(this.padIgnitionTime,.01,.31):0;
  this.effects.forEach(e=>{
   const engineStage=e.name.startsWith('Stage2')?2:e.name.startsWith('Stage1')?1:0;
   const show=flames&&(engineStage===exhaustStage||(exhaustStage===0&&engineStage===1));
   if(show!==e.group.visible)this.dirty=true;
   e.group.visible=show;
   const width=padIgnition?1+spool*.48:1;
   e.group.scale.set(width,padIgnition?.48+spool*.64:1,width);
   if(show){e.update(this.reducedMotion.matches?0:effectTime,padIgnition?spool:null,padIgnition&&this.separationPad?this.separationPad.position.y+1.8:0,this.mode==='separation'&&!padIgnition);if(animate)this.dirty=true;}
  });
  if(this.dirty){this.blueprint?.drawShadows();if(this.mode==='separation')this.renderSeparation();else this.renderer.render(this.scene,this.camera);this.selectionOutline.update();this.assemblyGuide?.update();this.info.update();if(this.selected){const p=this.moduleCenter(this.selected);this.label.style.left=Math.max(100,Math.min(this.host.clientWidth-100,p.x))+'px';this.label.style.top=Math.max(16,Math.min(this.host.clientHeight-55,p.y-75))+'px';}this.dirty=false;}
 }
 disposeObject(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});textures.forEach(t=>t.dispose());}
 destroy(){this.disposed=true;this.ready=false;this.mode=null;this.abort.abort();this.ro.disconnect();this.mixer?.stopAllAction();this.assemblyMotion=null;this.clearDissolve();this.clearSelection();this.stagingRig?.dispose();this.separationVapor?.dispose();this.effects.forEach(e=>{e.group.removeFromParent();e.dispose();});if(this.separationPad){this.scene.remove(this.separationPad);this.disposeObject(this.separationPad);this.separationPad=null;}this.restoreBoosters();this.restoreSeparationDebris();this.solarMixer?.stopAllAction();this.tianzhouPaper?.dispose();if(this.model)this.disposeObject(this.model);for(const mesh of this.retiredPayloadMeshes||[])this.disposeObject(mesh);this.retiredPayloadMeshes=[];this.referenceMaterial?.dispose();this.assemblyParts?.destroy();this.assemblyGuide?.destroy();this.selectionOutline?.destroy();this.info?.destroy();this.blueprint?.destroy();this.paperShadow?.geometry.dispose();this.paperShadow?.material.dispose();this.paperLight?.shadow.dispose();this.renderer?.dispose();this.renderer?.forceContextLoss();this.pivot?.clear();if(this.stagingRig)this.scene.remove(this.stagingRig.root);this.stagingRig=null;this.model=null;this.nodes={};this.scanMeshes.clear();this.reference=null;this.effects=[];this.clips={};this.active=null;this.mixer=null;this.layer.remove();}
}

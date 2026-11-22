import {comparisonFlight,comparisonFrame,comparisonRange} from './comparison-flight.js?v=altitude-result-focus';
import * as T from './vendor/three/three.module.js';
import {createRocketExhaust} from './rocket-exhaust.js?v=flight-refinement-20261117';

const copyMaterial=base=>{const m=base.clone();m.onBeforeCompile=base.onBeforeCompile;m.customProgramCacheKey=base.customProgramCacheKey;return m;};
const eachMaterial=(mesh,make)=>{mesh.material=Array.isArray(mesh.material)?mesh.material.map(make):make(mesh.material);};
// Keep the source texture/paint, with a restrained translucent vessel and solid liquid interior.
function ghostMaterial(base,owned,opacity=.13){const m=copyMaterial(base);owned.add(m);m.transparent=true;m.depthWrite=false;m.opacity=opacity;return m;}
function liquidMaterial(base,matrix,bounds,state,color,owned){
 const m=copyMaterial(base),compile=m.onBeforeCompile,key=m.customProgramCacheKey();owned.add(m);m.color.setHex(color);m.metalness=.12;m.roughness=.32;m.emissive.setHex(color);m.emissiveIntensity=.16;
 m.onBeforeCompile=shader=>{compile.call(m,shader);Object.assign(shader.uniforms,{tankFrame:{value:matrix},tankLow:{value:bounds.min.y},tankHigh:{value:bounds.max.y},tankFill:state});
 shader.vertexShader='varying float tankY;uniform mat4 tankFrame;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntankY=(tankFrame*vec4(position,1.)).y;');
 shader.fragmentShader='varying float tankY;uniform float tankLow,tankHigh,tankFill;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(tankFill<.00001||tankY>mix(tankLow,tankHigh,tankFill))discard;');};
 m.customProgramCacheKey=()=>key+'-existing-rocket-liquid-v1';return m;
}

/** Ideal one/three-stage teaching schemes assembled from the current source modules.
 * Source geometry and textures are borrowed; no GLB request and no change to scientific samples.
 */
export class StagingRig{
 static async load(source){return new StagingRig(source);}
 constructor({nodes,manifest}){
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.root=new T.Group();this.root.name='StagingComparison';this.root.visible=false;this.assetSource='current-cz7-shared';this.actors=[];this.materials=new Set();this.geometries=new Set();this.exhausts=[];this.manifest=manifest;
  const y2=manifest.modules.Stage2.assembledGLTF.translation[1],payloadY=manifest.modules.Payload.assembledGLTF.translation[1],upperSpan=payloadY-y2;
  const clone=(name)=>{const o=nodes[name].clone(true);const trim=root=>{for(const c of [...root.children]){if(c.userData.scan||c.name==='EngineExhaust')c.removeFromParent();else trim(c);}};trim(o);o.traverse(c=>{c.visible=true;});return o;};
  for(let index=0;index<3;index++){
   const root=new T.Group();root.name='CurrentScheme'+index;root.position.set(260+index*470,95,0);this.root.add(root);const stages=[];
   const arrangements=index===0?[{modules:['Stage2'],y:0}]:index===1?[{modules:['Stage1'],y:0}]:[{modules:['Stage1'],y:0},{modules:['Stage2'],y:y2},{modules:['Stage2'],y:payloadY}];
   for(const [order,arrangement]of arrangements.entries()){
    const group=new T.Group();group.name='Scheme'+index+'Stage'+order;group.userData.stagingPart={plan:index,stage:order+1};group.position.y=arrangement.y;root.add(group);const tanks=[],shells=[],exhausts=[];
    for(const name of arrangement.modules){const module=clone(name);module.position.y=0;
     if(index===1){
      module.getObjectByName('Interstage')?.removeFromParent();
      module.updateWorldMatrix(true,true);
      const bodyTop=new T.Box3().setFromObject(module.getObjectByName('Stage1Shell')).max.y;
      const fairing=clone('Fairing');
      fairing.position.y=manifest.modules.Fairing.assembledGLTF.translation[1];
      const fairingBase=new T.Box3().setFromObject(fairing).min.y;
      const largeBodyScale=fairingBase/bodyTop;
      module.scale.y*=largeBodyScale;
      // The long tank bay spans the original two bays. Leave the engines and
      // nozzle anchors at their original size and position inside the base.
      for(const child of module.children){
       if(!child.name.startsWith('Stage1Engine'))continue;
       child.position.y/=largeBodyScale;
       child.scale.y/=largeBodyScale;
      }
     }
     group.add(module);
     module.updateWorldMatrix(true,true);
     module.traverse(mesh=>{if(!mesh.isMesh)return;if(/Shell$|^Interstage$/.test(mesh.name)){eachMaterial(mesh,m=>ghostMaterial(m,this.materials,.11));shells.push(mesh);}});
     for(const tankName of[name+'LOXTank',name+'FuelTank']){
      const tank=module.getObjectByName(tankName);if(!tank)continue;const fill={value:1};tank.updateWorldMatrix(true,true);const inv=tank.matrixWorld.clone().invert(),bounds=new T.Box3(),meshes=[];tank.traverse(o=>{if(o.isMesh)meshes.push(o);});
      for(const mesh of meshes){mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(mesh.matrixWorld)));}
      const fluid=new T.Group();fluid.name=tankName+'_VisiblePropellant';tank.add(fluid);const color=/LOX/.test(tankName)?0x66c9e6:0xe5b44c;
      for(const mesh of meshes){const liquid=new T.Mesh(mesh.geometry,mesh.material),relative=inv.clone().multiply(mesh.matrixWorld);relative.decompose(liquid.position,liquid.quaternion,liquid.scale);eachMaterial(liquid,m=>liquidMaterial(m,relative,bounds,fill,color,this.materials));fluid.add(liquid);eachMaterial(mesh,m=>ghostMaterial(m,this.materials,.10));}
      const radius=Math.min(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)*.475,geo=new T.CircleGeometry(radius,48);geo.rotateX(-Math.PI/2);const mat=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.25,roughness:.28,metalness:.1,side:T.DoubleSide});this.materials.add(mat);this.geometries.add(geo);const surface=new T.Mesh(geo,mat);surface.position.set((bounds.min.x+bounds.max.x)/2,bounds.max.y,(bounds.min.z+bounds.max.z)/2);tank.add(surface);tanks.push({name:tankName,fill,bounds,fluid,surface});
     }
     const enginePrefix=name+'Engine';module.traverse(anchor=>{if(anchor.name.startsWith(enginePrefix)&&anchor.name.endsWith('Flame')){const effect=createRocketExhaust();effect.group.scale.setScalar(.35);anchor.add(effect.group);this.exhausts.push(effect);exhausts.push(effect);}});
    }
    stages.push({group,tanks,shells,exhausts,baseY:arrangement.y});
   }
   const topShift=index===0?-y2:index===2?upperSpan:0;
   for(const name of ['Payload','Fairing']){const part=clone(name);part.position.y=manifest.modules[name].assembledGLTF.translation[1]+topShift;part.traverse(o=>{if(o.isMesh&&name==='Fairing')eachMaterial(o,m=>ghostMaterial(m,this.materials,.10));});root.add(part);}
   root.rotation.y=-.4;root.updateWorldMatrix(true,true);const bounds=new T.Box3().setFromObject(root),height=bounds.max.y-bounds.min.y;const scale=[270,350,390][index]/height;root.scale.setScalar(scale);this.actors.push({root,stages,height,displayScale:scale,baseOffset:-(bounds.min.y-95)*scale});
  }
 }
 reset(){for(const a of this.actors)for(const s of a.stages){s.group.position.set(0,s.baseY,0);s.group.rotation.set(0,0,0);s.group.visible=true;for(const t of s.tanks){t.fill.value=1;t.fluid.visible=true;t.surface.visible=true;t.surface.position.y=t.bounds.max.y;}for(const e of s.exhausts)e.reset();}}
 setState(lesson){
  const samples=lesson.samples(),triple=lesson.lessons?.[2]||lesson,flight=comparisonFlight(lesson);
  const launched=lesson.running||lesson.progress>0||lesson.complete;
  const range=comparisonRange(flight.heights,lesson.complete);
  this.actors.forEach((a,index)=>{
   const frame=comparisonFrame(index,flight.heights[index],launched,range);
   const ratio=launched?Math.min(1,144/(a.height*a.displayScale)):1;
   a.root.scale.setScalar(a.displayScale*ratio);
   a.root.position.set(frame.modelX,650-frame.modelBase+a.baseOffset*ratio,0);
   a.root.visible=lesson.activeIndex===undefined||lesson.activeIndex===index;const state=lesson.lessons?.[index]||lesson,sample=samples[index];a.stages.forEach((s,i)=>{
   const fraction=Math.max(0,sample.remaining[i]/(index===1?300:100)),eject=index===2?(i<sample.detached?1:triple.phase==='eject'&&triple.ejectStage===i+1?triple.ejectProgress:0):0;
   s.group.position.set(-eject*5,s.baseY-eject*13,0);s.group.rotation.z=eject*.12;s.group.visible=eject<1;
   for(const tank of s.tanks){tank.fill.value=fraction;tank.fluid.visible=fraction>1e-6;tank.surface.visible=fraction>1e-6;tank.surface.position.y=T.MathUtils.lerp(tank.bounds.min.y,tank.bounds.max.y,fraction);}
   const burning=sample.progress>0&&sample.progress<1&&fraction>1e-6&&sample.remaining.slice(0,i).every(v=>v<1e-6)&&!['gate','eject','after'].includes(state.phase);
   for(const e of s.exhausts){e.group.visible=burning;e.update(this.motion.matches?0:state.effectTime);}
  });});
 }
 pick(e,renderer,camera){const r=renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);this.root.updateMatrixWorld(true);for(const hit of ray.intersectObject(this.root,true)){let shown=true;for(let o=hit.object;o;o=o.parent)if(!o.visible)shown=false;if(!shown)continue;for(let o=hit.object;o;o=o.parent)if(o.userData.stagingPart)return o.userData.stagingPart;}return null;}
 dispose(){for(const e of this.exhausts){e.group.removeFromParent();e.dispose();}this.exhausts.length=0;this.materials.forEach(m=>m.dispose());this.geometries.forEach(g=>g.dispose());this.root.removeFromParent();this.root.clear();this.actors.length=0;}
}

/* True R2 BufferGeometry viewer. Course state remains owned by the adapter.
   The selected source meshes are preserved; only documented optical surfaces are fixed. */
(function(N){'use strict';
// Offline hand-painted albedo maps, kept separate from the source mesh data.
// See assets/step2-handpaint/README.md for generation and visual references.
const PAINT_MAPS={
 wood:new URL("../../assets/step2-handpaint/wood-gouache-v1.png", document.currentScript.src).href,
 inner:new URL("../../assets/step2-handpaint/wood-gouache-v1.png", document.currentScript.src).href,
 blue:new URL("../../assets/step2-handpaint/blue-gouache-v1.png", document.currentScript.src).href
};
// Private mesh adaptation of the shared globe pigment and rough-lighting model.
// The sphere-only public renderer cannot accept BufferGeometry; see SOURCE.md.
const GLOBE_PIGMENT=`
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
}

// Two octaves are sufficient at the supplied globe sizes.
float fbm3(vec3 p) {
  return 0.68 * vnoise3(p) + 0.32 * vnoise3(p * 2.13);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

`;
function paintMaterial(material,kind,style){
 const wood=['wood','inner','cut'].includes(kind),optical=['mirror','glass'].includes(kind);
 material.roughness=Math.max(material.roughness,wood ? .82 : optical ? .38 : .68);
 material.metalness=Math.min(material.metalness,wood ? .16 : .28);
 material.userData.paintStyle='handpaint-globe-light-v1';
 material.userData.paintSurface=kind;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,style,{newtonSurfaceGrain:{value:optical?0:wood?1:.75}});
  shader.vertexShader='varying vec3 vNewtonPaintPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNewtonPaintPosition=position;');
  shader.fragmentShader=`varying vec3 vNewtonPaintPosition;
   uniform float newtonGrain,newtonLighting,newtonSurfaceGrain,newtonFloor;
   uniform vec3 newtonKey;
   ${GLOBE_PIGMENT}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec3 paintP=vNewtonPaintPosition*.30;
   float brush=fbm3(paintP*vec3(7.,21.,7.));
   // Globe default pigment modulation, attenuated over the existing painted map.
   diffuseColor.rgb*=mix(1.,.895+.210*brush,newtonGrain*newtonSurfaceGrain);
   vec3 paperP=vNewtonPaintPosition*75.;
   float footprint=max(length(dFdx(paperP)),length(dFdy(paperP)));
   float paper=(hash31(floor(paperP))-.5)*(1.-smoothstep(.65,1.8,footprint));
   diffuseColor.rgb=max(vec3(0.),diffuseColor.rgb+paper*.022*newtonGrain*newtonSurfaceGrain);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float pigment=fbm3(paintP*vec3(24.,48.,24.));
   roughnessFactor=clamp(roughnessFactor+(pigment-.5)*.20*newtonLighting*newtonSurfaceGrain,.35,1.);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec3 paintN=inverseTransformDirection(normal,viewMatrix);
   float paintNoL=max(dot(paintN,normalize(newtonKey)),0.);
   float paintNoV=max(dot(normal,normalize(vViewPosition)),.001);
   float broadBrush=fbm3(paintP*vec3(5.,12.,5.));
   float grazing=pow(1.-paintNoV,.70);
   float sunSide=smoothstep(.05,.85/1.53,paintNoL);
   float softWash=pow(paintNoL,2./1.53)*.18;
   float edgeWash=grazing*sunSide*1.20;
   float warmth=clamp((softWash+edgeWash)*(.82+.30*broadBrush+.12*pigment),0.,.91);
   vec3 warmPigment=outgoingLight*vec3(1.13,1.05,.98)+diffuseColor.rgb*.04;
   outgoingLight=mix(outgoingLight,warmPigment,clamp(warmth*.24*newtonLighting,0.,1.));
   float rim=pow(1.-paintNoV,4.);
   float coolSide=1.-smoothstep(-.3,.75,dot(paintN,normalize(newtonKey)));
   outgoingLight+=vec3(.35,.42,.56)*rim*coolSide*.05*newtonLighting;
   // Anchor the lower pedestal edge, analogous to the globe's contact AO.
   float contact=1.-smoothstep(newtonFloor,newtonFloor+.23,vNewtonPaintPosition.y);
   outgoingLight*=1.-contact*.16*newtonLighting;
   #include <opaque_fragment>
  `);
 };
 material.customProgramCacheKey=()=> 'newton-handpaint-globe-light-v1';
 return material;
}
function createContactShadow(T,model,resources,floor){
 const geometry=new T.PlaneGeometry(8,7);
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
  uniforms:{strength:{value:1},viewportSize:{value:new T.Vector2(1,1)}},
  vertexShader:'varying vec2 shadowUV;void main(){shadowUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`precision highp float;varying vec2 shadowUV;uniform float strength;
   uniform vec2 viewportSize;
   void main(){vec2 p=(shadowUV-.5)*vec2(8.,7.);
    float tight=(1.-smoothstep(.72,1.30,length(p/vec2(1.77))))*.62;
    float broad=(1.-smoothstep(.25,1.,length((p-vec2(.55,.50))/vec2(3.4,2.4))))*.24;
    float viewportEdge=min(min(gl_FragCoord.x,viewportSize.x-gl_FragCoord.x),min(gl_FragCoord.y,viewportSize.y-gl_FragCoord.y));
    float viewportFade=smoothstep(8.,max(24.,viewportSize.y*.065),viewportEdge);
    float alpha=(1.-(1.-tight)*(1.-broad))*strength*viewportFade;
    gl_FragColor=vec4(.035,.045,.055,alpha);
   }`});
 const shadow=new T.Mesh(geometry,material);shadow.name='Newton_TableContactShadow';
 shadow.userData.isContactShadow=true;shadow.rotation.x=-Math.PI/2;shadow.position.y=floor-.008;
 shadow.renderOrder=-1;model.add(shadow);resources.push(geometry,material);return shadow;
}

N.mountRotationViewer=function(root,onReady){
 const T=window.THREE,D=window.NEWTON_MODEL;if(!T||!D)throw new Error('Local Three.js / R2 mesh data not loaded');
 root.classList.add('real-mesh-viewer');root.querySelectorAll('#r360-opticalLegend,#r360-opticalDescription,#r360-status').forEach(el=>el.remove());root.querySelector('h2').textContent='立体观察 · 牛顿望远镜';
 const host=root.querySelector('.rotation-stage'),dock=root.querySelector('.rotation-dock');host.replaceChildren();host.setAttribute('aria-label','真实三维望远镜，可水平拖动绕垂直轴旋转');
 dock.innerHTML='<div class="rotation-controls" role="group" aria-label="立体观察控制"><button type="button" data-real-action="section" aria-pressed="false">查看剖面</button><button type="button" data-real-action="rays" aria-pressed="false">显示光路</button><button type="button" data-real-action="bloom" aria-pressed="true">柔光 Bloom</button><button type="button" data-real-action="auto" aria-pressed="false">自动环视</button><button type="button" data-real-action="reset">旋转复位</button></div><div class="real-viewer-parts" role="group" aria-label="选择高亮部件"></div><p class="real-viewer-status" id="r360-message" role="status">正在载入真实网格…</p>';
 const turnControls=document.createElement('div');turnControls.className='rotation-turn-controls';turnControls.setAttribute('role','group');turnControls.setAttribute('aria-label','转动望远镜');
 const turnIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10a9 9 0 1 1 2.6 9.4M3 4v6h6"/></svg>';
 turnControls.innerHTML='<button type="button" data-rotation-turn="left" aria-label="向左旋转望远镜" title="向左旋转">'+turnIcon+'</button><button type="button" data-rotation-turn="right" aria-label="向右旋转望远镜" title="向右旋转">'+turnIcon+'</button>';root.append(turnControls);
 const turnButtons=[...turnControls.querySelectorAll('button')];
 const partNames={tube:'木质镜筒',primary:'凹面主镜',secondary:'平面副镜',eyepiece:'目镜',mount:'转轴与支架',base:'底座'};
 const parts=dock.querySelector('.real-viewer-parts');for(const [key,label] of Object.entries(partNames)){const b=document.createElement('button');b.type='button';b.dataset.realPart=key;b.textContent=label;b.setAttribute('aria-pressed','false');parts.append(b);}
 const action=k=>dock.querySelector('[data-real-action="'+k+'"]'),status=dock.querySelector('.real-viewer-status');
  let disposed=false,frame=0,last=0,section=false,rays=false,bloomOn=true,auto=false,selected=null,intro=1;
  let autoTurn=null,lastInspectionCompleted=false;
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const canvas=renderer.domElement;canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none;pointer-events:auto';canvas.setAttribute('aria-label','真实网格望远镜。水平拖动绕垂直轴旋转，固定桌面视角。部件按钮用于高亮。');canvas.tabIndex=0;host.append(canvas);
 const scene=new T.Scene(),model=new T.Group();model.name='Newton_Step2_R2';scene.add(model);
 const camera=new T.PerspectiveCamera(24,1,.1,100),target=new T.Vector3(0,3.45,0),initial=new T.Vector3(-7.2,6.2,19.6).sub(target),baseDistance=initial.length(),initialYaw=Math.atan2(initial.x,initial.z),initialPitch=Math.asin(initial.y/baseDistance);
 let yaw=initialYaw,distance=baseDistance;const pitch=initialPitch;
 scene.add(new T.HemisphereLight(0xe8e4f1,0x514331,1.35));const key=new T.DirectionalLight(0xffefd7,2.4);key.position.set(-5,10,12);scene.add(key);const fill=new T.DirectionalLight(0xa5aec0,.45);fill.position.set(7,6,-5);scene.add(fill);
 const surfaceStyle={newtonGrain:{value:1},newtonLighting:{value:1},newtonFloor:{value:0},newtonKey:{value:key.position.clone().normalize()}};
 const meshes=[],textures=[],texturePromises=[],materialTemplates={},resources=[];
 function bytes(s,C){return new C(Uint8Array.from(atob(s),v=>v.charCodeAt(0)).buffer);}
 const textureCache=new Map();
 function loadTexture(url){
  if(textureCache.has(url))return textureCache.get(url);
  let resolveLoad;texturePromises.push(new Promise(resolve=>resolveLoad=resolve));
  const map=new T.TextureLoader().load(url,()=>{resolveLoad();schedule();},undefined,()=>{resolveLoad();status.textContent='部分纹理载入失败，请检查离线文件。';});
  map.colorSpace=T.SRGBColorSpace;
  map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  textures.push(map);textureCache.set(url,map);return map;
 }
 for(const [key,spec] of Object.entries(D.materials)){
  const source=PAINT_MAPS[key]||spec.texture,map=source?loadTexture(source):null;
  const [r,g,b]=spec.color;
  // Reuse the warm wood map inside the tube, tinted to its original dark walnut role.
  const color=key==='inner'?0x8a7058:(r<<16)|(g<<8)|b;
  materialTemplates[key]=new T.MeshStandardMaterial({color,map,metalness:Math.min(spec.metalness,.55),roughness:Math.max(spec.roughness,.35),side:T.DoubleSide});
 }
 for(const item of D.objects){const geo=new T.BufferGeometry();for(const [name,C,size] of [['position',Float32Array,3],['normal',Float32Array,3],['uv',Float32Array,2]])geo.setAttribute(name,new T.BufferAttribute(bytes(item[name],C),size));geo.setIndex(new T.BufferAttribute(bytes(item.index,Uint32Array),1));geo.computeBoundingSphere();const mesh=new T.Mesh(geo,paintMaterial(materialTemplates[item.material].clone(),item.material,surfaceStyle));mesh.name=item.name;mesh.userData={part:item.part,sectionHide:item.sectionHide,sectionOnly:item.sectionOnly};mesh.visible=!item.sectionOnly;model.add(mesh);meshes.push(mesh);}
 Object.values(materialTemplates).forEach(m=>m.dispose());model.updateMatrixWorld(true);
 const floor=new T.Box3().setFromObject(model).min.y;surfaceStyle.newtonFloor.value=floor;
 const contactShadow=createContactShadow(T,model,resources,floor);
 const optical=N.createStep2Optics(T,meshes);model.add(optical.group);optical.group.visible=false;
 const bloom=N.createStep2Bloom(T,renderer);
 let hotspots=null; // Newton Step2 V1-V3 integration
  let renderCount=0,firstReady=false,textureReady=false;
 function pose(){const introYaw=(1-intro)*.10;camera.position.set(target.x+distance*Math.sin(yaw+introYaw)*Math.cos(pitch),target.y+distance*Math.sin(pitch),target.z+distance*Math.cos(yaw+introYaw)*Math.cos(pitch));camera.lookAt(target);camera.updateMatrixWorld();}
 function finishAutoTurn(){
  const done=autoTurn?.onComplete;autoTurn=null;lastInspectionCompleted=true;auto=false;
  action('auto').setAttribute('aria-pressed','false');action('auto').textContent='自动环视';last=0;
  turnButtons.forEach(button=>button.disabled=false);if(done)queueMicrotask(done);
 }
 function render(time=performance.now()){frame=0;if(disposed)return;const elapsed=last?Math.max(0,(time-last)/1000):0;last=time;if(auto){const step=elapsed*(autoTurn?.speed||.22);yaw+=step;if(autoTurn){autoTurn.travelled+=step;if(autoTurn.travelled+1e-9>=Math.PI*2)finishAutoTurn();}}pose();if(rays&&bloomOn)bloom.render(scene,camera);else{renderer.setRenderTarget(null);renderer.render(scene,camera);}renderCount++;hotspots?.update();if(textureReady&&!firstReady){firstReady=true;onReady?.();}if(auto)schedule();}
 function schedule(){if(!disposed&&!frame&&!document.hidden)frame=requestAnimationFrame(render);}
 function updateStatus(){status.textContent=(section?'剖面':'外观')+' · '+meshes.length+' 个独立网格 · 拖动环视'+(rays?' · '+optical.report.accepted+' 条几何光路 · 教学示意':'')+(selected?' · '+partNames[selected]:'');}
 function setSection(value){section=Boolean(value);for(const m of meshes)m.visible=m.userData.sectionOnly?section:m.userData.sectionHide?!section:true;action('section').setAttribute('aria-pressed',String(section));action('section').textContent=section?'返回外观':'查看剖面';updateStatus();schedule();}
 function setRays(value){rays=Boolean(value);optical.group.visible=rays;action('rays').setAttribute('aria-pressed',String(rays));action('rays').textContent=rays?'隐藏光路':'显示光路';updateStatus();schedule();}
 function setBloom(value){bloomOn=Boolean(value);action('bloom').setAttribute('aria-pressed',String(bloomOn));schedule();}
 function selectPart(part){selected=part;for(const m of meshes){m.material.emissive.setHex(m.userData.part===part?0xc39545:0);m.material.emissiveIntensity=.26;}for(const b of parts.children)b.setAttribute('aria-pressed',String(b.dataset.realPart===part));updateStatus();schedule();}
 function setAuto(value){if(!value&&autoTurn)return;auto=Boolean(value);action('auto').setAttribute('aria-pressed',String(auto));action('auto').textContent=auto?'停止环视':'自动环视';last=0;schedule();}
 function startInspection({durationMs=12000,onComplete}={}){
  if(disposed)return false;
  if(durationMs<=0){lastInspectionCompleted=true;autoTurn=null;auto=false;queueMicrotask(()=>onComplete?.());return true;}
  turnButtons.forEach(button=>button.disabled=true);lastInspectionCompleted=false;autoTurn={speed:Math.PI*2/(durationMs/1000),travelled:0,onComplete};auto=true;
  action('auto').setAttribute('aria-pressed','true');action('auto').textContent='停止环视';last=0;schedule();return true;
 }
 // One tap is one horizontal step; retain the current pitch and camera distance.
 function turn(direction){if(autoTurn||root.classList.contains('is-introducing'))return;setAuto(false);yaw+=direction*Math.PI/12;schedule();}
 for(const button of turnButtons)button.onclick=()=>turn(button.dataset.rotationTurn==='left'?1:-1);
 function reset(){yaw=initialYaw;distance=baseDistance;setAuto(false);schedule();}
 action('section').onclick=()=>setSection(!section);action('rays').onclick=()=>setRays(!rays);action('bloom').onclick=()=>setBloom(!bloomOn);action('auto').onclick=()=>setAuto(!auto);action('reset').onclick=reset;
 for(const b of parts.children)b.onclick=()=>selectPart(selected===b.dataset.realPart?null:b.dataset.realPart);
 const controller=new AbortController(),signal=controller.signal,raycaster=new T.Raycaster(),pointer=new T.Vector2();let drag=null;const touches=new Map();
 function pick(x,y){const r=canvas.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);pose();raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(meshes.filter(m=>m.visible),false)[0]||null;}
 canvas.addEventListener('pointerdown',e=>{if(autoTurn||e.button!==0&&e.pointerType==='mouse')return;setAuto(false);touches.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false,pinch:null};},{signal});
 canvas.addEventListener('pointermove',e=>{if(!touches.has(e.pointerId)||!drag)return;touches.set(e.pointerId,[e.clientX,e.clientY]);if(touches.size>1){drag.moved=true;}else{yaw-=(e.clientX-drag.x)*.006;drag.moved||=Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>5;}drag.x=e.clientX;drag.y=e.clientY;schedule();},{signal});
 function end(e){if(!drag)return;const old=drag;touches.delete(e.pointerId);if(!touches.size){drag=null;if(e.type==='pointerup'&&!old.moved)selectPart(pick(e.clientX,e.clientY)?.object.userData.part||null);}else{old.moved=true;const p=[...touches.values()][0];old.x=p[0];old.y=p[1];old.pinch=null;}}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end,{signal});
 // Fixed tabletop framing: wheel/pinch never change the viewpoint distance.
 canvas.addEventListener('keydown',e=>{if(autoTurn)return;let used=true;if(e.key==='ArrowLeft')yaw+=.1;else if(e.key==='ArrowRight')yaw-=.1;else if(e.key==='Home')reset();else used=false;if(used){e.preventDefault();schedule();}},{signal});
  function resize(){const w=host.clientWidth||1000,h=host.clientHeight||550;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.max(8,10.8/(w/h))/(2*baseDistance)));camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new T.Vector2());contactShadow.material.uniforms.viewportSize.value.copy(size);bloom.resize(size.x,size.y);schedule();}
 const observer=new ResizeObserver(resize);observer.observe(host);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else schedule();},{signal});
 const api={renderer,scene,model,camera,meshes,setSurfaceStyle(options={}){
    if(Number.isFinite(options.grain))surfaceStyle.newtonGrain.value=T.MathUtils.clamp(options.grain,0,1);
    if(Number.isFinite(options.lighting))surfaceStyle.newtonLighting.value=T.MathUtils.clamp(options.lighting,0,1);
    if(typeof options.contactShadow==='boolean')contactShadow.visible=options.contactShadow;
    schedule();
    },opticalReport:optical.report,setSection,setRays,setBloom,selectPart,reset,startInspection,pick,renderNow(){cancelAnimationFrame(frame);frame=0;render();},setIntroProgress(t){
    // Camera-based R2 pull-back: use the SAME mesh, never zoom a raster frame.
    const u=T.MathUtils.clamp(Number(t)||0,0,1),ease=u*u*(3-2*u);
    intro=1; yaw=initialYaw+(1-ease)*.025;
    distance=baseDistance*(.54+.46*ease);schedule();
   },setView(y){if(Number.isFinite(y))yaw=y;distance=baseDistance;schedule();},getState(){const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {surfaceStyle:{grain:surfaceStyle.newtonGrain.value,lighting:surfaceStyle.newtonLighting.value,contactShadow:contactShadow.visible,floor,shadowY:contactShadow.position.y},section,rays,bloom:bloomOn,bloomType:bloom.type,selected,yaw,pitch,distance,auto,inspectionProgress:autoTurn?autoTurn.travelled/(Math.PI*2):lastInspectionCompleted?1:0,meshCount:meshes.length,visibleMeshes:meshes.filter(m=>m.visible).length,triangleCount:meshes.reduce((n,m)=>n+(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3,0),acceptedRays:optical.report.accepted,renderCount,disposed,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),rendererInfo:{memory:{...renderer.info.memory},render:{...renderer.info.render},programs:renderer.info.programs.length},canvasAlpha:(renderer.getContext().getContextAttributes()?.alpha??true),clearAlpha:renderer.getClearAlpha(),materialOpacity:[...new Set(meshes.map(m=>m.material.opacity))],depthTest:meshes.every(m=>m.material.depthTest)&&optical.group.children.every(m=>m.material.depthTest),depthWrite:meshes.every(m=>m.material.depthWrite),bloomTargets:bloom.targets.length};}};
 root.realViewer=api;N.step2Viewer=api;
  hotspots=N.createStep2Hotspots?.({THREE:T,root,host,canvas,api,meshes,dock});
 updateStatus();resize();Promise.all(texturePromises).then(()=>{if(disposed)return;textureReady=true;schedule();});
 return function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);controller.abort();observer.disconnect();touches.clear();hotspots?.dispose();bloom.dispose();optical.dispose();for(const m of meshes){m.geometry.dispose();m.material.dispose();}for(const t of textures)t.dispose();for(const r of resources)r.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();turnControls.remove();delete root.realViewer;if(N.step2Viewer===api)delete N.step2Viewer;};
};
})(window.Newton=window.Newton||{});

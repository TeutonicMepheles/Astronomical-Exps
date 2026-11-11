/* Local supplied telescope, with a fixed-height horizontal camera orbit. */
(function(N){
  'use strict';
  const T=window.THREE,initialYaw=.9;
  N.ObservationModel=class{
    constructor(container){
      this.container=container;this.yaw=initialYaw;this.enabled=false;this.drag=null;this.frame=0;
      this.backdrop=container.closest('.observation-scene').querySelector('.observation-art');
      this.state=N.store.get();this.viewMode='exterior';this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.exteriorYaw=initialYaw;this.transition=null;
      this.textureLoads=[];this.resourcesReady=false;
      this.currentPose={center:new T.Vector3(0,1.3,0),span:1.53,yaw:initialYaw};
      this.scene=new T.Scene();
      this.camera=new T.OrthographicCamera(-2,2,1.5,-1.5,.1,30);
      // Keep the composition camera for orbiting and labels. A wider render camera
      // draws the same view beyond the interaction box, through to the stage edges.
      this.renderCamera=this.camera.clone();
      this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
      this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;
      this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate=false;
      this.renderer.domElement.setAttribute('aria-hidden','true');container.prepend(this.renderer.domElement);
      this.scene.add(new T.HemisphereLight(0xdceaff,0x4a4156,2));
      const key=new T.DirectionalLight(0xffedda,2.7);key.position.set(3,6,4);key.castShadow=true;
      key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2,right:2,top:3,bottom:-2,near:.1,far:15});
      key.shadow.bias=-.0003;key.shadow.normalBias=.015;this.scene.add(key);
      const rim=new T.DirectionalLight(0x9ec9ff,2.2);rim.position.set(-3,3,-4);this.scene.add(rim);
      const fill=new T.DirectionalLight(0xc0d9ff,.7);fill.position.set(-3,1,4);this.scene.add(fill);
      // Only base color is sRGB. The supplied OpenGL normal and packed ORM are linear data.
      const load=(url,colorSpace)=>{
        let ready;this.textureLoads.push(new Promise(resolve=>{ready=resolve;}));
        const texture=new T.TextureLoader().load(url,()=>{ready();this.render();},undefined,()=>ready());
        texture.colorSpace=colorSpace;texture.channel=0;
        texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());return texture;
      };
      const color=load('assets/telescope-model/base-color.png',T.SRGBColorSpace);
      const normal=load('assets/telescope-model/normal.png',T.NoColorSpace);
      const orm=load('assets/telescope-model/orm.png',T.NoColorSpace);
      this.material=new T.MeshStandardMaterial({map:color,normalMap:normal,normalScale:new T.Vector2(.8,.8),
        aoMap:orm,aoMapIntensity:1,roughnessMap:orm,roughness:1,metalnessMap:orm,metalness:1,envMapIntensity:.7});
      // A local reflection environment gives the brass and black metal readable highlights.
      // It is used only for lighting, leaving the existing night-sky backdrop visible.
      const room=new T.Scene();room.background=new T.Color(0x64738b);
      for(const [position,size,intensity] of [[[3,4,3],[4,5],3],[[-4,2,-3],[3,4],2],[[0,6,0],[5,4],2]]){
        const panel=new T.Mesh(new T.PlaneGeometry(...size),new T.MeshBasicMaterial({color:new T.Color().setRGB(intensity,intensity,intensity)}));
        panel.position.set(...position);panel.lookAt(0,1,0);room.add(panel);
      }
      const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(room,.04);
      this.scene.environment=this.environment.texture;pmrem.dispose();
      room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
      this.model=new T.Group();this.scene.add(this.model);
      const decode=value=>{const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));return new Float32Array(bytes.buffer);};
      for(const part of N.observationModel.meshes){
        const geometry=new T.BufferGeometry();
        for(const [name,size] of [['position',3],['normal',3],['uv',2]])geometry.setAttribute(name,new T.BufferAttribute(decode(part[name]),size));
        geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,this.material);mesh.name=part.name;
        mesh.castShadow=mesh.receiveShadow=true;this.model.add(mesh);
      }
      const ground=new T.Mesh(new T.PlaneGeometry(12,12),new T.ShadowMaterial({color:0x020716,opacity:.25}));
      ground.rotation.x=-Math.PI/2;ground.position.y=-.008;ground.receiveShadow=true;this.scene.add(ground);
      this.ground=ground;this.section=new N.ObservationSection(this);
      this.unsubscribe=N.store.subscribe(state=>{this.state=state;this.section.update(state);this.render();});
      this.bind();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);
      this.preparationStatus=document.createElement('p');this.preparationStatus.className='observation-preparation-status';
      this.preparationStatus.textContent='正在准备剖面…';this.preparationStatus.setAttribute('role','status');this.preparationStatus.hidden=true;container.append(this.preparationStatus);
      this.resize();
      this.preparation=this.prepareResources();
    }
    async prepareResources(){
      const idle=()=>new Promise(resolve=>window.requestIdleCallback?requestIdleCallback(resolve,{timeout:250}):setTimeout(resolve,0));
      await idle();
      // Prepare once off the click path. Hidden state changes are still picked up
      // by update() on entry; unchanged geometry and ray meshes stay GPU-resident.
      this.section.update(this.state,true);
      await Promise.all(this.textureLoads);
      const textures=new Set([this.material,this.section.material].flatMap(m=>[m.map,m.normalMap,m.roughnessMap]));
      for(const texture of textures){await idle();if(texture.image?.width)this.renderer.initTexture(texture);}
      // Compile opaque, crossfade and double-sided glass variants without
      // showing them on the page. Retain their program-cache owners for reuse.
      const warm=this.scene.clone(true),variants=new Map(),meshes=[];
      warm.traverse(object=>{if(object.isMesh)meshes.push(object);});
      for(const object of meshes){
        const source=object.material,crossfade=[this.material,this.section.material].includes(source);
        if(!crossfade&&!(source.transparent&&source.side===T.DoubleSide&&!source.forceSinglePass))continue;
        const sides=source.side===T.DoubleSide&&!source.forceSinglePass?[T.BackSide,T.FrontSide]:[source.side];
        const settings=[...(crossfade?[[false,source.side]]:[]),...sides.map(side=>[true,side])];
        for(const [transparent,side] of settings){
          const key=source.uuid+'/'+side+'/'+transparent;let material=variants.get(key);
          if(!material){
            material=source.clone();material.transparent=transparent;material.opacity=transparent ? .5 : 1;material.depthWrite=!transparent;material.side=side;
            material.onBeforeCompile=source.onBeforeCompile;material.customProgramCacheKey=source.customProgramCacheKey;
            variants.set(key,material);
          }
          const mesh=new T.Mesh(object.geometry,material);mesh.receiveShadow=object.receiveShadow;mesh.castShadow=object.castShadow;warm.add(mesh);
        }
      }
      this.warmMaterials=[...variants.values()];
      await this.renderer.compileAsync(warm,this.camera);
      this.resourcesReady=true;this.render();
    }
    render(){
      if(!this.enabled||document.hidden||this.frame)return;
      this.frame=requestAnimationFrame(time=>{this.frame=0;if(!this.enabled)return;
        if(this.transition)this.tickTransition(time);
        else this.applyPose(this.section.active?this.section.pose(this.yaw,this.container.clientWidth/this.container.clientHeight):this.exteriorPose(this.yaw));
        if(this.section.root.visible){this.section.updateView(this.camera);this.section.animate(time/1000);}
        this.updateRenderArea();
        this.renderCamera.copy(this.camera);
        const area=this.renderArea,unit=2*this.currentPose.span/this.container.clientHeight;
        this.renderCamera.left-=area.left*unit;this.renderCamera.right+=area.right*unit;
        this.renderCamera.top+=area.top*unit;this.renderCamera.bottom-=area.bottom*unit;
        this.renderCamera.updateProjectionMatrix();
        const shadowKey=[this.model.visible,this.section.root.visible,this.section.geometryKey,this.section.apertureKey,this.section.elevationAngle].join('/');
        if(shadowKey!==this.shadowKey){this.shadowKey=shadowKey;this.renderer.shadowMap.needsUpdate=true;}
        this.renderer.render(this.scene,this.renderCamera);
        if(this.section.root.visible)this.section.placeLabels(this.camera);
        this.container.dispatchEvent(new CustomEvent('viewrender'));
        if(this.transition||this.layoutTransitions?.size||this.section.active&&this.state.running&&!this.reducedMotion)this.render();
      });
    }
    resize(){
      const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
      const half=1.53,aspect=w/h;this.camera.left=-half*aspect;this.camera.right=half*aspect;
      this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();
      this.render();
    }
    updateRenderArea(){
      const el=this.container,w=el.clientWidth,h=el.clientHeight;
      const rect=el.getBoundingClientRect(),stage=el.closest('.observation-scene').getBoundingClientRect();
      const css=getComputedStyle(el),scale=css.scale==='none'?[1,1]:css.scale.split(' ').map(Number);
      const rotation=css.rotate==='none'?0:parseFloat(css.rotate);
      const stageScale=stage.width/1600;
      const inverse=new DOMMatrix().scale(stageScale).rotate(rotation).scale(scale[0],scale[1]??scale[0]).inverse();
      const corners=[[stage.left,stage.top],[stage.right,stage.top],[stage.left,stage.bottom],[stage.right,stage.bottom]].map(([x,y])=>{
        const p=new DOMPoint(x-(rect.left+rect.width/2),y-(rect.top+rect.height/2),0,0).matrixTransform(inverse);
        return {x:p.x+w/2,y:p.y+h/2};
      });
      const padding={left:Math.ceil(Math.max(0,-Math.min(...corners.map(p=>p.x))))+24,
        right:Math.ceil(Math.max(0,Math.max(...corners.map(p=>p.x))-w))+24,
        top:Math.ceil(Math.max(0,-Math.min(...corners.map(p=>p.y))))+24,
        bottom:Math.ceil(Math.max(0,Math.max(...corners.map(p=>p.y))-h))+24};
      const width=w+padding.left+padding.right,height=h+padding.top+padding.bottom;
      // Developer scaling can create a large local surface; bound its backing buffer.
      const ratio=Math.min(devicePixelRatio||1,2,4096/width,4096/height,Math.sqrt(6000000/(width*height)));
      const key=[width,height,ratio].join('/');
      this.renderArea={...padding,width,height};
      Object.assign(this.renderer.domElement.style,{left:-padding.left+'px',top:-padding.top+'px'});
      if(this.renderAreaKey!==key){
        this.renderAreaKey=key;this.renderer.setPixelRatio(ratio);this.renderer.setSize(width,height);
      }
    }
    setEnabled(value){this.enabled=value;if(!value){this.end();if(this.transition)this.finishViewMode(this.viewMode);}else this.resize();}
    exteriorPose(yaw=this.exteriorYaw){return {center:new T.Vector3(0,1.3,0),span:1.53,yaw};}
    applyPose(pose){
      const aspect=this.container.clientWidth/this.container.clientHeight;
      this.currentPose={center:pose.center.clone(),span:pose.span,yaw:pose.yaw};this.yaw=pose.yaw;
      // The painted environment follows the exact camera zoom, including reversals.
      this.backdrop.style.setProperty('--environment-zoom',String(this.exteriorPose().span/pose.span));
      this.camera.left=-pose.span*aspect;this.camera.right=pose.span*aspect;this.camera.top=pose.span;this.camera.bottom=-pose.span;
      this.camera.updateProjectionMatrix();this.camera.position.copy(pose.center).add(new T.Vector3(Math.sin(pose.yaw)*6,1.2,Math.cos(pose.yaw)*6));
      this.camera.lookAt(pose.center);this.camera.updateMatrixWorld(true);
      const marker=this.pointingTarget&&!this.pointingTarget.hidden?this.pointingTarget.getBoundingClientRect():null;
      const rect=this.container.getBoundingClientRect();
      const css=getComputedStyle(this.container);
      const pointingKey=[pose.yaw,this.state.angle,rect.left,rect.top,rect.width,rect.height,css.scale,css.rotate,marker?.left,marker?.top,marker?.width,marker?.height].join('/');
      if(this.pointingKey!==pointingKey){
        this.pointingKey=pointingKey;
        this.container.dispatchEvent(new CustomEvent('pointingchange',{detail:{yaw:pose.yaw,angle:this.state.angle}}));
      }
    }
    fade(material,opacity){
      const transparent=opacity<1;if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
      material.opacity=opacity;material.depthWrite=opacity===1;
    }
    transitionEvent(){
      this.container.setAttribute('aria-busy',String(Boolean(this.transition||this.pendingViewMode)));
      this.preparationStatus.hidden=!this.pendingViewMode;this.container.dispatchEvent(new CustomEvent('viewtransitionchange'));
    }
    finishViewMode(mode){
      this.transition=null;this.viewMode=mode;const section=mode==='section';
      if(this.section.active!==section)this.section.setActive(section);
      this.section.root.visible=section;this.section.setReveal(section?1:0);
      this.model.visible=this.ground.visible=!section;this.fade(this.material,1);this.fade(this.section.material,1);
      this.container.dataset.instrumentView=mode;this.yaw=section?1.42:this.exteriorYaw;
      this.applyPose(section?this.section.pose(this.yaw,this.container.clientWidth/this.container.clientHeight):this.exteriorPose());
      this.container.dispatchEvent(new CustomEvent('viewmodechange',{detail:{mode}}));
      this.transitionEvent();this.render();
    }
    resetView(){
      this.end();if(this.transition)this.finishViewMode(this.viewMode);
      this.yaw=this.viewMode==='section'?1.42:initialYaw;if(this.viewMode==='exterior')this.exteriorYaw=initialYaw;this.resize();
    }
    returnToExterior({immediate=false}={}){
      if(this.pendingViewMode){this.pendingViewMode=null;this.transitionEvent();}
      this.exteriorYaw=initialYaw;
      if(this.viewMode==='exterior'&&!this.transition){this.resetView();return;}
      this.setViewMode('exterior',{immediate});
    }
    setViewMode(mode,{immediate=false}={}){
      if(mode==='section'&&!immediate&&!this.reducedMotion&&!this.resourcesReady){
        if(this.pendingViewMode)return;
        const pending=this.pendingViewMode={mode};this.transitionEvent();
        this.preparation.then(()=>{
          if(this.pendingViewMode!==pending)return;
          this.pendingViewMode=null;this.setViewMode(mode,{immediate});
        });
        return;
      }
      if(!['exterior','section'].includes(mode)||mode===this.viewMode&&!immediate)return;
      this.end();const from={center:this.currentPose.center.clone(),span:this.currentPose.span,yaw:this.currentPose.yaw};
      const wasSectionVisible=this.section.root.visible;
      if(mode==='section'&&this.viewMode==='exterior'&&!this.transition)this.exteriorYaw=this.yaw;
      this.viewMode=mode;
      if(mode==='section'){this.section.setActive(true);this.section.root.visible=wasSectionVisible;this.section.labels.hidden=true;}
      if(immediate||this.reducedMotion||!this.enabled){this.finishViewMode(mode);return;}
      this.transition={target:mode,start:null,from,wasSectionVisible,
        exteriorOpacity:this.model.visible?this.material.opacity:0,sectionOpacity:wasSectionVisible?this.section.material.opacity:0,
        rayOpacity:wasSectionVisible?this.section.reveal:0,phase:mode==='section'?'zoom':'return',swapped:false};
      this.container.dispatchEvent(new CustomEvent('viewmodechange',{detail:{mode}}));this.transitionEvent();this.render();
    }
    tickTransition(time){
      const tr=this.transition;if(tr.start===null)tr.start=time;
      const elapsed=Math.max(0,time-tr.start),entering=tr.target==='section';
      const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
      const end=entering?this.section.pose(1.42,this.container.clientWidth/this.container.clientHeight):this.exteriorPose();
      const delay=entering?0:tr.wasSectionVisible?200:0;
      const progress=ease((elapsed-delay)/740),yawDelta=Math.atan2(Math.sin(end.yaw-tr.from.yaw),Math.cos(end.yaw-tr.from.yaw));
      this.applyPose({center:tr.from.center.clone().lerp(end.center,progress),span:tr.from.span+(end.span-tr.from.span)*progress,yaw:tr.from.yaw+yawDelta*progress});
      if(entering){
        // Crossfade while the camera is still moving, completing before the
        // zoom ends. Resource preparation already precedes the first frame.
        const revealAt=tr.wasSectionVisible?0:120;
        const blend=ease((elapsed-revealAt)/500),rays=ease((elapsed-300)/380);
        this.section.root.visible=elapsed>=revealAt||tr.wasSectionVisible;
        this.model.visible=tr.exteriorOpacity>0&&blend<1;this.ground.visible=elapsed<revealAt&&this.model.visible;
        this.fade(this.material,tr.exteriorOpacity*(1-blend));
        this.fade(this.section.material,tr.sectionOpacity+(1-tr.sectionOpacity)*blend);
        this.section.setReveal(tr.rayOpacity+(1-tr.rayOpacity)*rays);
        if(elapsed>=revealAt&&!tr.swapped){tr.swapped=true;tr.phase='reveal';this.transitionEvent();}
        if(elapsed>=740)this.finishViewMode('section');
      }else{
        const blend=ease(elapsed/200);this.model.visible=true;this.ground.visible=elapsed>=200;
        this.section.root.visible=tr.wasSectionVisible&&elapsed<200;
        this.fade(this.material,tr.exteriorOpacity+(1-tr.exteriorOpacity)*blend);
        this.fade(this.section.material,tr.sectionOpacity*(1-blend));this.section.setReveal(tr.rayOpacity*(1-blend));
        if(elapsed>=200&&this.section.active)this.section.setActive(false);
        if(elapsed>=delay+740)this.finishViewMode('exterior');
      }
    }
    end(){
      if(!this.drag)return;const id=this.drag.id;this.drag=null;this.container.classList.remove('is-dragging');
      const surface=this.interactionSurface;
      if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);
    }
    pointerFrame(){
      const el=this.container,r=el.getBoundingClientRect(),stage=el.closest('.observatory');
      const css=getComputedStyle(el),scale=css.scale==='none'?[1,1]:css.scale.split(' ').map(Number);
      const rotation=css.rotate==='none'?0:parseFloat(css.rotate),stageScale=stage.getBoundingClientRect().width/1600;
      const matrix=new DOMMatrix().scale(stageScale).rotate(rotation).scale(scale[0],scale[1]??scale[0]);
      return {x:r.left+r.width/2,y:r.top+r.height/2,matrix};
    }
    projectPointer(world,frame=this.pointerFrame()){
      const p=world.clone().project(this.camera),el=this.container;
      const local=new DOMPoint(p.x*el.clientWidth/2,-p.y*el.clientHeight/2,0,0).matrixTransform(frame.matrix);
      return new T.Vector2(frame.x+local.x,frame.y+local.y);
    }
    pickHit(clientX,clientY){
      const el=this.container,frame=this.pointerFrame();
      const p=new DOMPoint(clientX-frame.x,clientY-frame.y,0,0).matrixTransform(frame.matrix.inverse());
      const point=new T.Vector2(p.x/(el.clientWidth/2),-p.y/(el.clientHeight/2));
      this.scene.updateMatrixWorld(true);
      const ray=new T.Raycaster();ray.setFromCamera(point,this.camera);
      const section=this.viewMode==='section',eye=section?this.section.lens:this.model.getObjectByName('Scope_01_MuJing');
      const meshes=section?[...this.section.parts.map(p=>p.mesh),this.section.tripod,this.section.glassLens].filter(Boolean):this.model.children;
      const hit=ray.intersectObjects(meshes,false)[0];
      const target=!hit?'environment':hit.object===eye||hit.object===this.section.glassLens?'eyepiece':'telescope';
      return {target,object:hit?.object,point:hit?.point};
    }
    pickTarget(clientX,clientY){return this.pickHit(clientX,clientY).target;}
    setPointingTarget(marker){this.pointingTarget=marker;this.pointingKey='';this.render();}
    measurePointing(){
      const marker=this.pointingTarget,section=this.section;
      if(this.viewMode!=='section'||!marker||marker.hidden||!section.calculation)return null;
      const r=marker.getBoundingClientRect();if(!r.width||!r.height)return null;
      const frame=this.pointerFrame(),p=new DOMPoint(r.left+r.width/2-frame.x,r.top+r.height/2-frame.y,0,0).matrixTransform(frame.matrix.inverse());
      const camera=this.camera,el=this.container;
      const skyX=(camera.left+camera.right)/2+p.x/el.clientWidth*(camera.right-camera.left);
      const skyY=(camera.top+camera.bottom)/2-p.y/el.clientHeight*(camera.top-camera.bottom);
      this.scene.updateMatrixWorld(true);
      const bounds=section.root.getObjectByName('Scope_02_Main').geometry.boundingBox;
      const center=new T.Vector3((bounds.min.x+bounds.max.x)/2,0,0);
      const displayedOrigin=section.interior.localToWorld(center.clone());
      // Diameter scaling raises the displayed tube about its mounting rail.
      // A distant target has no parallax from that cosmetic translation: keep
      // its pointing origin in the unscaled mount frame, retaining elevation.
      const origin=section.elevationRoot.localToWorld(center);
      // Negative local X is the open end. Positive X is the primary mirror;
      // confusing the two admits a target behind the telescope.
      const axis=new T.Vector3(-1,0,0).transformDirection(section.interior.matrixWorld);
      const local=origin.clone().applyMatrix4(camera.matrixWorldInverse),right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
      const up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),forward=camera.getWorldDirection(new T.Vector3());
      // A virtual plane behind the rendered tube ties the original sky pixel
      // to the visible forward ray. Its depth is a display parameter, not a sky distance.
      const target=forward.clone().multiplyScalar(1.1).addScaledVector(right,skyX-local.x).addScaledVector(up,skyY-local.y).normalize();
      const levelForward=new T.Vector3(forward.x,0,forward.z).normalize();
      const azimuth=d=>Math.atan2(d.dot(right),d.dot(levelForward));
      const delta=azimuth(target)-azimuth(axis),horizontalError=Math.atan2(Math.sin(delta),Math.cos(delta));
      const verticalError=Math.asin(T.MathUtils.clamp(target.y,-1,1))-Math.asin(T.MathUtils.clamp(axis.y,-1,1));
      return {horizontalError,verticalError,facing:axis.dot(forward)>.05&&axis.dot(target)>0,origin,displayedOrigin,axis,target};
    }
    elevationGesture(hit){
      // Use the actual picked point and axle, so opposite ends follow opposite
      // vertical directions even after orbiting or authoring-layout transforms.
      if(this.viewMode!=='section'||hit.target!=='telescope'||!hit.point||
        !['Scope_02_Main','Scope_02_ZhuJing','Scope_02_GlassPlane','Scope_02_GlassPlaneShelf'].includes(hit.object?.name))return null;
      const section=this.section,pivot=section.root.localToWorld(section.elevationPivot.clone());
      const lever=section.elevationRoot.worldToLocal(hit.point.clone()).x-section.elevationPivot.x;
      if(Math.abs(lever)<.025)return null;
      const axis=new T.Vector3(0,0,1).transformDirection(section.root.matrixWorld);
      const velocity=new T.Vector3().crossVectors(axis,hit.point.clone().sub(pivot)).multiplyScalar(Math.PI/180*.4);
      const frame=this.pointerFrame(),start=this.projectPointer(hit.point,frame),next=this.projectPointer(hit.point.clone().add(velocity),frame);
      const slope=next.y-start.y,minimum=this.container.getBoundingClientRect().height/550*.7;
      // Preserve the physical front/rear direction at every camera/layout angle;
      // projection sets sensitivity only, so a steep view cannot reverse it.
      return {pixelsPerDegree:-Math.sign(lever)*Math.max(minimum,Math.abs(slope))};
    }
    setAngle(value){
      const precision=N.observationAim?.current?.selected?10:1;
      const angle=Math.round(T.MathUtils.clamp(value,0,90)*precision)/precision;
      if(angle!==N.store.get().angle)N.store.set({angle});
    }
    turnView(direction){
      if(!this.enabled||this.transition||this.pendingViewMode)return;
      const finding=Boolean(N.observationAim?.current?.selected);
      if(direction==='left'||direction==='right'){
        const step=finding?N.store.metrics(N.store.get()).field*Math.PI/180/8:Math.PI/12;
        this.yaw+=(direction==='left'?1:-1)*step;this.render();
      }else if(this.viewMode==='section'&&(direction==='up'||direction==='down')){
        this.setAngle(N.store.get().angle+(direction==='up'?-1:1)*(finding ? .1 : 2));
      }
    }
    activate(target){
      this.container.dispatchEvent(new CustomEvent('instrumentactivate',{detail:{target}}));
    }
    bind(){
      const el=this.container,surface=this.interactionSurface=el.closest('.observatory');
      this.layoutTransitions=new Set();
      el.addEventListener('transitionrun',e=>{if(e.target===el){this.layoutTransitions.add(e.propertyName);this.render();}});
      for(const type of ['transitionend','transitioncancel'])el.addEventListener(type,e=>{if(e.target===el){this.layoutTransitions.delete(e.propertyName);this.render();}});
      window.addEventListener('resize',()=>this.render());
      surface.addEventListener('pointerdown',e=>{
        if(!this.enabled||this.transition||this.drag||!e.isPrimary||e.button!==0||e.defaultPrevented)return;
        if(e.target.closest('button,input,select,textarea,a,dialog,[role="dialog"],.preview-card,.observation-details,#course-progress,.developer-panel,.developer-launch'))return;
        if(document.documentElement.classList.contains('developer-picking'))return;
        const width=el.getBoundingClientRect().width;
        const hit=this.pickHit(e.clientX,e.clientY);
        this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:this.yaw,width,moved:false,target:hit.target,
          angle:N.store.get().angle,axis:null};
        surface.setPointerCapture(e.pointerId);
      });
      surface.addEventListener('pointermove',e=>{
        const d=this.drag;if(!d||d.id!==e.pointerId)return;
        const dx=e.clientX-d.x,dy=e.clientY-d.y;
        if(!d.moved&&Math.hypot(dx,dy)>5){d.moved=true;d.axis=Math.abs(dy)>Math.abs(dx)?'elevation':'orbit';}
        // Movement only cancels click activation; angle changes use explicit buttons.
      });
      surface.addEventListener('pointerup',e=>{
        if(!this.drag||this.drag.id!==e.pointerId)return;
        const clicked=!this.drag.moved&&Math.hypot(e.clientX-this.drag.x,e.clientY-this.drag.y)<=5,target=this.drag.target;this.end();
        if(clicked&&target===this.pickTarget(e.clientX,e.clientY))this.activate(target);
      });

      surface.addEventListener('pointercancel',()=>this.end());surface.addEventListener('lostpointercapture',()=>this.end());
      el.addEventListener('keydown',e=>{
        if(!this.enabled||this.transition||e.target!==el)return;
        const direction={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];
        if(direction){e.preventDefault();this.turnView(direction);}
        if(e.key==='Home'){e.preventDefault();this.resetView();}
        if(e.key==='Enter'||e.key===' '){e.preventDefault();this.activate(this.viewMode==='section'?'eyepiece':'telescope');}
      });
      window.addEventListener('blur',()=>this.end());
      document.addEventListener('visibilitychange',()=>{this.end();this.render();});
      this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.end();el.classList.add('model-unavailable');});
      this.renderer.domElement.addEventListener('webglcontextrestored',()=>{el.classList.remove('model-unavailable');this.render();});
    }
  };
})(window.Newton);

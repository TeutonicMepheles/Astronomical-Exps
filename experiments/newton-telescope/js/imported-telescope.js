/* Local FBX-derived geometry. Existing course state, rays and controls stay authoritative. */
(function(N){
 'use strict';const T=window.THREE;
 const floats=encoded=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));return new Float32Array(bytes.buffer);};
 N.ImportedTelescope=class{
  constructor(view){
   this.view=view;this.group=new T.Group();this.group.name='Imported telescope';view.tube.add(this.group);
   const loader=new T.TextureLoader(),texture=src=>{const t=loader.load(src,()=>{view.dirty=true;});t.colorSpace=T.SRGBColorSpace;return t;};
   const materials={main:new T.MeshStandardMaterial({map:texture('assets/imported-telescope/TelescopeShader_Main_BaseColor.png'),roughness:.7,metalness:.15,side:T.DoubleSide}),inner:new T.MeshStandardMaterial({map:texture('assets/imported-telescope/TelescopeShader_InnerSystem_BaseColor.png'),roughness:.7,metalness:.15,side:T.DoubleSide})};
   this.variants={};this.progress=0;this.target=0;this.eyeProgress=0;this.eyeTarget=0;
   for(const kind of ['exterior','cutaway']){
    const group=new T.Group();group.name=kind;this.group.add(group);this.variants[kind]=group;
    const own={main:materials.main.clone(),inner:materials.inner.clone()};
    for(const part of N.importedTelescopeData[kind]){const g=new T.BufferGeometry();for(const [key,size] of [['position',3],['normal',3],['uv',2]])g.setAttribute(key,new T.BufferAttribute(floats(part[key]),size));g.computeBoundingSphere();const mesh=new T.Mesh(g,own[part.material].clone());mesh.name=part.name;mesh.visible=kind==='exterior'||!/^Scope_02_(Shelf|MuJing)/.test(part.name);group.add(mesh);if(part.name==='Scope_02_ZhuJing'){this.primary=mesh;this.primaryBase=g.attributes.position.array.slice();}}
   }
   Object.values(materials).forEach(m=>m.dispose());this.applyFade();
   this.original=view.tube.children.filter(o=>o!==this.group&&o!==view.rayGroup);
   this.backButton=document.createElement('button');this.backButton.className='eyepiece-return';this.backButton.textContent='返回镜筒视图';this.backButton.hidden=true;document.querySelector('.observatory').append(this.backButton);this.backButton.addEventListener('click',()=>this.focusEyepiece(false));
   this.sync(N.course.get());
  }
  sync(s){const active=s.stage==='observation';this.group.visible=active;this.view.root.scale.setScalar(1);this.view.root.position.y=active ? -.6 : 0;if(!active){this.progress=this.target=0;this.transition=null;this.eyeProgress=this.eyeTarget=0;this.eyeTransition=null;document.querySelector('.observatory').classList.remove('eyepiece-view');this.backButton.hidden=true;this.applyFade();}if(active){this.applyFade();this.original.forEach(o=>o.visible=false);this.view.mount.visible=false;}else this.original.forEach(o=>o.visible=true);}
  toggle(){if(!this.group.visible)return;if(this.eyeTarget){this.focusEyepiece(false);return;}this.target=1-this.target;this.transition={from:this.progress,start:performance.now()};if(this.view.reducedMotion){this.progress=this.target;this.transition=null;this.applyFade();}this.view.dirty=true;}
  focusEyepiece(active=true){if(active&&this.progress<.99)return;this.eyeTarget=active?1:0;this.eyeTransition={from:this.eyeProgress,start:performance.now()};document.querySelector('.observatory').classList.toggle('eyepiece-view',active);this.backButton.hidden=!active;if(this.view.reducedMotion){this.eyeProgress=this.eyeTarget;this.eyeTransition=null;}this.view.resize();this.view.dirty=true;}
  hit(clientX,clientY){const rect=this.view.renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2),this.view.camera);this.view.scene.updateMatrixWorld(true);return ray.intersectObjects(Object.values(this.variants).filter(g=>g.visible).flatMap(g=>g.children.filter(m=>m.visible&&m.material.opacity>0)),false)[0]?.object;}
  activate(clientX,clientY){const hit=this.hit(clientX,clientY);if(!hit)return;if(hit.name==='Scope_01_MuJing'&&this.progress>.99)this.focusEyepiece(!this.eyeTarget);else this.toggle();}
  tick(time){for(const [key,transitionKey,targetKey] of [['progress','transition','target'],['eyeProgress','eyeTransition','eyeTarget']]){const transition=this[transitionKey];if(!transition)continue;const t=Math.min(1,Math.max(0,(time-transition.start)/700)),ease=t*t*(3-2*t);this[key]=transition.from+(this[targetKey]-transition.from)*ease;if(t===1)this[transitionKey]=null;this.applyFade();this.view.dirty=true;}}
  applyFade(){for(const [kind,group] of Object.entries(this.variants)){group.visible=kind==='exterior'||this.progress>0;group.traverse(o=>{if(!o.isMesh)return;const support=/^Scope_01_(Shelf|Tripod)/.test(o.name),shell=/_(Main|FrontScreen)$/.test(o.name);const opacity=kind==='exterior'?(support||o.name==='Scope_01_MuJing'?1:shell?1-.78*this.progress:1-this.progress):(shell?.35:1)*this.progress;const transparent=opacity<1;if(o.material.transparent!==transparent){o.material.transparent=transparent;o.material.needsUpdate=true;}o.material.opacity=opacity;o.material.depthWrite=!transparent;o.material.side=transparent?T.FrontSide:T.DoubleSide;});}}
  frame(){if(!this.group.visible)return;const v=this.view;const pivot=new T.Vector3(...N.importedTelescopeData.mountPivot),angle=-v.tube.rotation.z+N.importedTelescopeData.uprightAngle;for(const mesh of this.variants.exterior.children){if(/^Scope_01_(ShelfC|Tripod)$/.test(mesh.name)){mesh.rotation.z=angle;mesh.position.copy(pivot).sub(pivot.clone().applyAxisAngle(new T.Vector3(0,0,1),angle));}}v.root.scale.setScalar(1);v.root.position.set(0,0,0);v.scene.updateMatrixWorld(true);
   const cy=v.director.current.y,a=this.eyeProgress*1.0;v.camera.position.set(0,cy+Math.sin(a)*15,Math.cos(a)*15);v.camera.lookAt(0,cy,0);v.camera.updateMatrixWorld(true);
   const inverse=new T.Matrix4().makeRotationFromQuaternion(v.camera.quaternion.clone().invert()),full=new T.Box3(),body=new T.Box3();
   for(const mesh of this.variants.exterior.children){if(mesh.name.endsWith('_Tripod'))continue;const bounds=new T.Box3().setFromObject(mesh).applyMatrix4(inverse);full.union(bounds);if(/_(Main|MuJing|FrontScreen)$/.test(mesh.name))body.union(bounds);}
   full.min.y-=1.4;const box=new T.Box3(full.min.clone().lerp(body.min,this.progress),full.max.clone().lerp(body.max,this.progress)),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()).applyQuaternion(v.camera.quaternion);
   const scale=Math.min((v.camera.right-v.camera.left)*.86/size.x,(v.camera.top-v.camera.bottom)*.86/size.y);v.root.scale.setScalar(scale);v.root.position.copy(center.multiplyScalar(-scale)).add(new T.Vector3(0,cy,0));
  }

  update(state){
   // Preserve the old demonstration's focal adjustment around its 800 mm baseline.
   const p=this.primary.geometry.attributes.position,b=this.primaryBase,delta=1/32-1/(4*(state.focal/100));
   for(let i=0;i<p.count;i++){const k=i*3;p.setX(i,b[k]+(b[k+1]**2+b[k+2]**2)*delta);}
   p.needsUpdate=true;this.primary.geometry.computeVertexNormals();this.primary.geometry.computeBoundingSphere();
  }
 };
})(window.Newton);

/* Real-time Three.js viewport: procedural model, folded rays and camera controls. */
(function (N) {
  'use strict';
  const T = window.THREE;
  N.Telescope = class {
    constructor(container) {
      this.container = container;
      this.scene = new T.Scene();
      this.camera = new T.OrthographicCamera(-6,6,4,-4,.1,100);
      this.camera.position.set(-3.3,2.4,15); this.camera.lookAt(0,.15,0);
      this.renderer = new T.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1,2));
      this.renderer.setClearColor(0,0); this.renderer.outputColorSpace = T.SRGBColorSpace;
      container.prepend(this.renderer.domElement);
      this.scene.add(new T.HemisphereLight(0xc3dcff,0x1b2343,2));
      const key = new T.DirectionalLight(0xbcd7ff,3.1); key.position.set(-5,8,7); this.scene.add(key);
      const rim = new T.DirectionalLight(0x5e9bff,3); rim.position.set(4,1,-5); this.scene.add(rim);
      const warm = new T.DirectionalLight(0xf0dabc,.5); warm.position.set(-3,-2,5); this.scene.add(warm);
      this.root = new T.Group(); this.scene.add(this.root);
      this.tube = new T.Group(); this.root.add(this.tube);
      this.rayGroup = new T.Group(); this.tube.add(this.rayGroup);
      this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.state = N.store.get(); this.yaw = 0; this.pitch = 0; this.zoom = 1;
      this.materials = {
        metal: new T.MeshPhongMaterial({color:0x30466d,specular:0x8caddd,shininess:65}),
        edge: new T.MeshStandardMaterial({color:0x6a91c9,metalness:.65,roughness:.28}),
        dark: new T.MeshStandardMaterial({color:0x0e1a32,metalness:.45,roughness:.45}),
        silver: new T.MeshPhongMaterial({color:0xa2c4ed,specular:0xe6f2ff,shininess:110,side:T.DoubleSide}),
        glass: new T.MeshPhongMaterial({color:0x527baa,shininess:110,transparent:true,opacity:.105,side:T.DoubleSide,depthWrite:false}),
        band: new T.MeshPhongMaterial({color:0x49638f,shininess:70,transparent:true,opacity:.48,side:T.DoubleSide,depthWrite:false})
      };
      this.buildTube(); this.buildMount(); this.director=new N.CameraDirector(this); this.lab=new N.LabScene(this); this.bindControls();
      this.unsubscribe = N.store.subscribe(state => { this.state=state; this.updateRays(); this.dirty=true; });
      this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
      this.updateRays(); this.resize(); this.lastTime=0; this.elapsed=0; this.animate=this.animate.bind(this);
      this.dirty=true; this.frame=requestAnimationFrame(this.animate);
    }
    mesh(geometry, material, parent=this.tube, position=[0,0,0]) { const mesh=new T.Mesh(geometry,material);mesh.position.set(...position);parent.add(mesh);return mesh; }
    cylinder(radius,length,x,mat,parent=this.tube) {const mesh=this.mesh(new T.CylinderGeometry(radius,radius,length,64,1,true),mat,parent,[x,0,0]);mesh.rotation.z=Math.PI/2;return mesh;}
    ring(x,radius=.99,width=.023,mat=this.materials.edge,parent=this.tube){const mesh=this.mesh(new T.TorusGeometry(radius,width,8,80),mat,parent,[x,0,0]);mesh.rotation.y=Math.PI/2;return mesh;}
    rod(a,b,radius,mat,parent=this.tube){const start=new T.Vector3(...a),end=new T.Vector3(...b),dir=end.clone().sub(start);const mesh=this.mesh(new T.CylinderGeometry(radius,radius,dir.length(),10),mat,parent);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return mesh;}
    buildTube(){
      const m=this.materials;
      this.cylinder(.99,6.5,0,m.glass);
      [-3.25,3.25].forEach(x=>{this.cylinder(1.025,.17,x,m.band);this.ring(x-.08,1.025,.024);this.ring(x+.08,1.025,.017);});
      [-1.02,1.66].forEach(x=>{
        this.cylinder(1.012,.13,x,m.band);this.ring(x-.065,1.018,.012,m.edge);this.ring(x+.065,1.018,.012,m.edge);
        this.mesh(new T.BoxGeometry(.36,.13,.42),m.metal,this.tube,[x,1.02,0]);
        this.mesh(new T.BoxGeometry(.34,.11,.34),m.metal,this.tube,[x,-1.02,0]);
      });
      // Four rails, rather than an opaque shell, reveal the complete optical system.
      [Math.PI*.2,Math.PI*.8,Math.PI*1.2,Math.PI*1.8].forEach(a=>{
        const y=Math.cos(a)*1.01,z=Math.sin(a)*1.01;
        this.rod([-3.25,y,z],[3.25,y,z],.042,m.metal);
        this.rod([-3.25,y+.015,z+.015],[3.25,y+.015,z+.015],.009,m.edge);
      });
      const primaryStart=this.tube.children.length;
      this.cylinder(.92,.21,3.12,m.dark);this.ring(3.17,.91,.035,m.edge);
      // Concave paraboloid, built in concentric rings (normal points into the tube).
      const positions=[],normals=[],indices=[],rings=22,segments=80;
      for(let r=0;r<=rings;r++)for(let s=0;s<=segments;s++){
        const radius=.89*r/rings,a=s/segments*Math.PI*2,y=radius*Math.cos(a),z=radius*Math.sin(a);
        positions.push(3-(y*y+z*z)/32,y,z);normals.push(-1,-y/16,-z/16);
      }
      for(let r=0;r<rings;r++)for(let s=0;s<segments;s++){const a=r*(segments+1)+s,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setIndex(indices);
      this.primary=this.mesh(geo,m.silver);
      // Soft radial faceting produces the cool silver look of the reference mirror.
      for(let s=0;s<8;s++){
        const a=s*Math.PI/4,b=a+Math.PI/4;
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([2.996,0,0,2.969,.87*Math.cos(a),.87*Math.sin(a),2.969,.87*Math.cos(b),.87*Math.sin(b)],3));g.computeVertexNormals();
        this.mesh(g,new T.MeshBasicMaterial({color:s%2?0xc3ddff:0x709bd5,side:T.DoubleSide,transparent:true,opacity:s%2?.17:.19,depthWrite:false}));
      }
      this.primaryParts=this.tube.children.slice(primaryStart);
      const secondaryStart=this.tube.children.length;
      this.secondary=this.mesh(new T.CylinderGeometry(.37,.37,.055,48),m.silver,this.tube,[-1.9,0,0]);
      this.secondary.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(1,1,0).normalize());
      this.rod([-1.9,0,-.99],[-1.9,0,-.22],.019,m.dark);
      this.rod([-1.9,-.99,0],[-1.9,-.25,0],.013,m.metal);
      this.secondaryParts=this.tube.children.slice(secondaryStart);
      const eye=new T.Group();eye.position.set(-1.9,0,0);this.tube.add(eye);this.eyepiece=eye;
      const eyecyl=(r,h,y,mat)=>this.mesh(new T.CylinderGeometry(r,r,h,48,1,true),mat,eye,[0,y,0]);
      eyecyl(.34,.35,1.11,m.metal);eyecyl(.255,.86,1.6,m.dark);
      // Transparent eyepiece sleeve exposes the last leg of the ray bundle.
      eyecyl(.237,1.06,2.36,new T.MeshPhongMaterial({color:0x90c8ff,transparent:true,opacity:.18,shininess:100,side:T.DoubleSide,depthWrite:false}));
      [1.18,1.3,1.92,2.02,2.76,2.94].forEach((y,i)=>{eyecyl(i<2?.35:.285,.085,y,m.metal);const ring=this.mesh(new T.TorusGeometry(i<2?.35:.285,.02,8,48),m.edge,eye,[0,y+.039,0]);ring.rotation.x=Math.PI/2;});
      eyecyl(.27,.16,2.85,m.dark);eyecyl(.235,.12,3.02,m.metal);
      [-.20,.20].forEach(z=>this.rod([-.13,2.07,z],[-.13,2.71,z],.017,m.edge,eye));
      const lens=this.mesh(new T.SphereGeometry(.215,32,16),new T.MeshPhongMaterial({color:0xc6e6ff,transparent:true,opacity:.46,shininess:160,depthWrite:false}),eye,[0,2.48,0]);lens.scale.y=.22;
      this.rod([-2.23,1.13,.05],[-2.51,1.13,.05],.12,m.dark);this.rod([-2.48,1.13,.05],[-2.55,1.13,.05],.14,m.edge);
      this.anchors={primary:new T.Vector3(3.27,-.24,.7),secondary:new T.Vector3(-1.9,-.23,.25),eyepiece:new T.Vector3(-1.63,2.62,0)};
    }
    buildMount(){
      const m=this.materials,g=new T.Group();this.root.add(g);this.mount=g;
      this.mesh(new T.BoxGeometry(1.18,.19,.73),m.metal,g,[.1,-1.22,0]);
      const housing=this.mesh(new T.CylinderGeometry(.42,.4,.9,32),m.metal,g,[.08,-1.69,0]);housing.rotation.z=-.23;
      this.rod([-.3,-1.55,.02],[-.75,-1.55,.02],.17,m.metal,g);this.rod([-.69,-1.55,.02],[-.8,-1.55,.02],.19,m.edge,g);
      this.rod([.4,-1.77,.02],[.87,-1.77,.02],.07,m.dark,g);this.rod([.77,-1.77,.02],[.87,-1.77,.02],.11,m.metal,g);
      this.rod([.11,-1.64,.3],[.11,-1.64,.46],.18,m.dark,g);this.rod([.11,-1.64,.43],[.11,-1.64,.49],.145,m.metal,g);
      const hub=this.mesh(new T.CylinderGeometry(.39,.39,.44,32),m.metal,g,[.15,-2.3,0]);hub.rotation.x=Math.PI/2;
      this.rod([.15,-2.3,.18],[.15,-2.3,.28],.29,m.edge,g);this.rod([.15,-2.3,.28],[.15,-2.3,.31],.22,m.metal,g);
      [[-1.45,-4.4,.8],[1.65,-4.4,.8],[.25,-4.25,-1.1]].forEach(end=>{
        const start=[.15,-2.38,0];this.rod(start,end,.105,m.metal,g);
        this.rod([start[0]-.06,start[1],start[2]+.07],[end[0]-.06,end[1],end[2]+.07],.025,m.edge,g);
        this.rod([end[0]-.04,end[1]+.15,end[2]],end,.14,m.dark,g);
      });
    }
    clearRays(){while(this.rayGroup.children.length){const o=this.rayGroup.children[0];this.rayGroup.remove(o);o.traverse(child=>{if(child.geometry)child.geometry.dispose();if(child.material)child.material.dispose();});}}
    updateRays(){
      this.clearRays();
      const apertureScale=.85+((this.state.aperture||130)-80)/170*.51;
      this.tube.scale.set(1,apertureScale,apertureScale);
      this.rayGroup.scale.set(1,1/apertureScale,1/apertureScale);
      const positions=this.primary.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){const y=positions.getY(i),z=positions.getZ(i);positions.setX(i,3-(y*y+z*z)/(4*(this.state.focal/100)));}
      positions.needsUpdate=true;this.primary.geometry.computeVertexNormals();this.primary.geometry.computeBoundingSphere();
      this.paths=N.optics.calculate(this.state).paths;this.particles=[];
      const course=N.course.get();
      if(course.stage==='mirrors')return;
      if(course.stage==='assembly'){
        if(!course.installed.includes('primary'))this.paths=this.paths.map(p=>p.slice(0,2));
        else if(!course.installed.includes('secondary')){const focal=this.state.focal/100;this.paths=this.paths.map(p=>[p[0],p[1],[3-focal,0,0]]);}
      }
      this.paths.forEach((points,index)=>{
        const vectors=points.map(p=>new T.Vector3(...p));
        for(let j=0;j<vectors.length-1;j++){
          const a=vectors[j],b=vectors[j+1],length=a.distanceTo(b);
          this.rod(a.toArray(),b.toArray(),.011,new T.MeshBasicMaterial({color:0xffdfa1,transparent:true,opacity:.95}),this.rayGroup);
          this.rod(a.toArray(),b.toArray(),.038,new T.MeshBasicMaterial({color:0xffc96c,transparent:true,opacity:.065,depthWrite:false,blending:T.AdditiveBlending}),this.rayGroup);
          if(j<2){const direction=b.clone().sub(a).normalize();const arrow=new T.ArrowHelper(direction,a.clone().lerp(b,j===0?.64:.59),.22,0xffdfa8,.16,.075);this.rayGroup.add(arrow);}
          if(length>0){const spark=this.mesh(new T.SphereGeometry(.035,10,8),new T.MeshBasicMaterial({color:0xfff1ca}),this.rayGroup);spark.visible=false;this.particles.push({mesh:spark,a,b,index,segment:j});}
        }
      });
      if(this.state.mode==='point'){
        // The true finite source is outside the viewport; visible bundles diverge from it.
        const marker=this.mesh(new T.SphereGeometry(.07,16,8),new T.MeshBasicMaterial({color:0xffd58b}),this.rayGroup,[-6.8,0,0]);marker.visible=false;
      }
    }
    bindControls(){
      let drag=null;
      this.container.addEventListener('pointerdown',e=>{if(this.lab.darkroom.beginDrag(e)){e.preventDefault();this.container.setPointerCapture(e.pointerId);return;}if(N.course.get().stage==='mirrors'||e.target.closest('button')||this.director.busy)return;drag={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch};this.container.setPointerCapture(e.pointerId);});
      this.container.addEventListener('pointermove',e=>{if(this.lab.darkroom.drag){this.lab.darkroom.moveDrag(e);return;}if(!drag)return;this.yaw=drag.yaw+(e.clientX-drag.x)*.006;this.pitch=Math.max(-.85,Math.min(.85,drag.pitch+(e.clientY-drag.y)*.004));this.dirty=true;});
      const end=e=>{this.lab.darkroom.endDrag(e,e.type!=='pointerup');drag=null;};this.container.addEventListener('pointerup',end);this.container.addEventListener('pointercancel',end);this.container.addEventListener('lostpointercapture',end);
      this.container.addEventListener('wheel',e=>{e.preventDefault();if(this.director.busy||N.course.get().stage==='mirrors')return;this.zoom=Math.max(.65,Math.min(1.7,this.zoom-e.deltaY*.0007));this.resize();},{passive:false});
      this.container.addEventListener('keydown',e=>{
        if(e.target!==this.container)return;
        const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','=','-'];if(!keys.includes(e.key))return;e.preventDefault();
        if(e.key==='Home')return this.resetView();
        if(N.course.get().stage==='mirrors')return;
        if(e.key==='ArrowLeft')this.yaw-=.1;if(e.key==='ArrowRight')this.yaw+=.1;
        if(e.key==='ArrowUp')this.pitch=Math.max(-.85,this.pitch-.08);if(e.key==='ArrowDown')this.pitch=Math.min(.85,this.pitch+.08);
        if(e.key==='+'||e.key==='=')this.zoom=Math.min(1.7,this.zoom+.1);if(e.key==='-')this.zoom=Math.max(.65,this.zoom-.1);this.resize();
      });
    }
    resetView(){this.director.frame(N.course.get().stage,null);}
    resize(){const w=this.container.clientWidth,h=this.container.clientHeight;const aspect=w/h;const height=(this.director?.current.span||(w<600?10:aspect<1?11:7.6))/this.zoom;this.camera.left=-height*aspect/2;this.camera.right=height*aspect/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.dirty=true;}
    placeLabels(){
      const w=this.container.clientWidth,h=this.container.clientHeight;
      const lesson=N.course.get(),focusLabel=this.container.querySelector('#focus-marker');
      if(lesson.stage==='mirrors')this.lab.darkroom.placeLabels();
      focusLabel.hidden=lesson.stage!=='mirrors'||!lesson.mirrorMounted||lesson.mirror==='plane';
      if(!focusLabel.hidden){const f=lesson.mirrorFocal/300;const p=this.lab.group.localToWorld(new T.Vector3(lesson.mirrorPosition+(lesson.mirror==='concave'?-f:f),0,0)).project(this.camera);focusLabel.textContent=lesson.mirror==='concave'?'实焦点 F':'虚焦点 F';focusLabel.style.left=`${(p.x*.5+.5)*w}px`;focusLabel.style.top=`${(-p.y*.5+.5)*h}px`;focusLabel.style.visibility=Math.abs(p.x)>1||Math.abs(p.y)>1?'hidden':'visible';}
      for(const [name,x] of [['primary',3],['secondary',-1.9]]){const point=this.tube.localToWorld(new T.Vector3(x,0,0)).project(this.camera);const button=this.container.querySelector(`[data-slot="${name}"]`);button.style.left=`${(point.x*.5+.5)*w}px`;button.style.top=`${(-point.y*.5+.5)*h}px`;button.style.visibility=Math.abs(point.x)>1||Math.abs(point.y)>1?'hidden':'visible';}
      Object.entries(this.anchors).forEach(([name,anchor])=>{const p=this.tube.localToWorld(anchor.clone()).project(this.camera);const label=this.container.querySelector(`[data-part="${name}"]`);label.classList.toggle('label-inward',name==='primary');label.style.left=`${(p.x*.5+.5)*w}px`;label.style.top=`${(-p.y*.5+.5)*h}px`;label.style.visibility=N.course.get().stage==='mirrors'||(N.course.get().stage==='assembly'&&!N.course.get().installed.includes(name)&&name!=='eyepiece')||p.z>1||Math.abs(p.x)>1.05||Math.abs(p.y)>.85?'hidden':'visible';});
    }
    animate(time){
      this.frame=requestAnimationFrame(this.animate);
      const dt=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;
      if(document.hidden)return;
      this.director.tick(time);this.lab.tick(time);
      if((this.state.running||N.course.get().stage==='assembly')&&!this.reducedMotion){this.elapsed+=dt;this.dirty=true;}
      if(!this.dirty)return;
      // 45° is the default mount elevation; view projection is chosen to match the reference.
      this.tube.rotation.z=N.course.get().stage==='assembly'?0:-.31+(45-this.state.angle)*Math.PI/180*.62;
      this.root.rotation.y=this.yaw;this.root.rotation.x=this.pitch;this.lab.group.rotation.y=this.yaw;this.lab.group.rotation.x=this.pitch;
      this.particles.forEach(p=>{p.mesh.visible=(this.state.running||N.course.get().stage==='assembly')&&!this.reducedMotion;if(p.mesh.visible){const t=(this.elapsed*.28+p.index*.2+p.segment*.29)%1;p.mesh.position.copy(p.a).lerp(p.b,t);}});
      this.scene.updateMatrixWorld(true);this.placeLabels();this.renderer.render(this.scene,this.camera);this.dirty=false;
    }
    dispose(){cancelAnimationFrame(this.frame);this.unsubscribe();this.lab.unsubscribe();this.resizeObserver.disconnect();this.scene.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});this.renderer.dispose();}
  };
})(window.Newton);

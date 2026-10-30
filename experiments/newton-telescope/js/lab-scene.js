/* Independent mirror experiment and assembly presentation, sharing one renderer. */
(function(N){
  'use strict';const T=window.THREE;
  N.LabScene=class{
    constructor(view){
      this.view=view;this.group=new T.Group();view.scene.add(this.group);this.beams=new T.Group();this.group.add(this.beams);
      this.surface=null;this.lastMirror='';this.lastFrame='';this.lastStage='';this.beamOpacity=1;this.beamMaterialStates=new WeakMap();
      this.stand=new T.Mesh(new T.CylinderGeometry(.06,.09,1.4,20),view.materials.metal);this.stand.position.set(1,-1.4,0);this.group.add(this.stand);
      const base=new T.Mesh(new T.CylinderGeometry(.55,.65,.12,32),view.materials.edge);base.position.set(1,-2.1,0);this.group.add(base);
      this.base=base;this.profile=new T.Group();this.group.add(this.profile);
      this.stand.position.y=-.65;this.stand.scale.y=.65;base.position.y=-1.13;base.scale.set(.55,1,.55);
      this.darkroom=new N.Darkroom(this);
      this.assemblyGroups={};this.flights=[];this.lastInstalled=[];
      for(const name of ['primary','secondary']){const group=new T.Group();view.tube.add(group);view[name+'Parts'].forEach(o=>group.add(o));this.assemblyGroups[name]=group;}
      this.slots={};for(const [name,x] of [['primary',3],['secondary',-1.9]]){const ring=new T.Mesh(new T.TorusGeometry(name==='primary'?.92:.46,.027,8,48),new T.MeshBasicMaterial({color:0x81baff,transparent:true,opacity:.7}));ring.rotation.y=Math.PI/2;ring.position.set(x,0,0);view.tube.add(ring);this.slots[name]=ring;}
      this.unsubscribe=N.course.subscribe(s=>this.sync(s));this.sync(N.course.get(),true);
    }
    line(points,color=0xffd395,dashed=false){const geometry=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const material=dashed?new T.LineDashedMaterial({color,dashSize:.12,gapSize:.08,transparent:true,opacity:.6}):new T.LineBasicMaterial({color,transparent:true,opacity:.4});const line=new T.Line(geometry,material);if(dashed)line.computeLineDistances();this.beams.add(line);
      if(!dashed)for(let i=0;i<points.length-1;i++)N.BeamVisual.addSegment(this.beams,points[i],points[i+1],color);
      return line;}
    mirrorGeometry(type,focal){
      const vertices=[],indices=[],rings=18,segments=64,f=focal/300;
      for(let r=0;r<=rings;r++)for(let a=0;a<=segments;a++){const radius=r/rings*1.7,theta=a/segments*Math.PI*2,y=radius*Math.cos(theta),z=radius*Math.sin(theta);vertices.push(1+(type==='plane'?0:(type==='concave'?-1:1)*radius*radius/(4*f)),y,z);}
      for(let r=0;r<rings;r++)for(let a=0;a<segments;a++){const i=r*(segments+1)+a,j=i+segments+1;indices.push(i,j,i+1,j,j+1,i+1);}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
    }
    setBeamOpacity(value){
      this.beamOpacity=Math.max(0,Math.min(1,value));this.beams.visible=this.beamOpacity>0;
      this.beams.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){
        if(m.uniforms?.beamOpacity){m.uniforms.beamOpacity.value=this.beamOpacity;continue;}
        if(!this.beamMaterialStates.has(m))this.beamMaterialStates.set(m,{opacity:m.opacity,transparent:m.transparent});
        const base=this.beamMaterialStates.get(m),transparent=this.beamOpacity<1||base.transparent;
        if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=base.opacity*this.beamOpacity;
      }});this.view.dirty=true;
    }
    buildMirror(s,lensPage=false){
      while(this.profile.children.length){const o=this.profile.children[0];this.profile.remove(o);o.geometry?.dispose();o.material?.dispose();}
      if(this.surface){this.group.remove(this.surface);this.surface.geometry.dispose();}
      while(this.beams.children.length){const o=this.beams.children[0];this.beams.remove(o);o.traverse(child=>{child.geometry?.dispose();if(child.material)(Array.isArray(child.material)?child.material:[child.material]).forEach(material=>material.dispose());});}
      const f=s.mirrorFocal/300,geometry=this.mirrorGeometry(s.mirror,s.mirrorFocal);this.surface=new T.Mesh(geometry,this.view.materials.silver);this.surface.visible=s.mirrorMounted;this.group.add(this.surface);
      if(s.mirror==='plane'){geometry.translate(-1,0,0);this.surface.rotation.z=-Math.PI/4;this.surface.position.x=1;}
      this.surface.position.x+=s.mirrorPosition-1;this.stand.position.x=s.mirrorPosition;this.base.position.x=s.mirrorPosition;this.stand.visible=this.base.visible=false;this.surface.visible=false;this.profile.visible=false;
      if(s.mirrorMounted){
        for(const [offset,radius,color] of [[.045,.06,0x6d8fbf],[-.015,.017,0xd5e9ff]]){
          const points=[];for(let i=0;i<=40;i++){const y=-1+i/20,x=s.mirrorPosition+(s.mirror==='plane'?y:(s.mirror==='concave'?-1:1)*y*y/(4*f));points.push(new T.Vector3(x+offset,y,.03));}
          this.profile.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),48,radius,8,false),new T.MeshPhongMaterial({color,shininess:110,specular:0xffffff})));
        }
      }
      this.mirrorPaths=[];
      (lensPage?N.lensOptics.calculate(s):N.mirrorOptics.calculate(s)).forEach(({points:path,virtual})=>{
        if(virtual)this.line([path[1],virtual],0x8ea9d3,true);
        this.line(path);this.mirrorPaths.push(path.map(p=>new T.Vector3(...p)));
        const vectors=this.mirrorPaths.at(-1);
        for(let i=0;i<vectors.length-1;i++){const a=vectors[i],b=vectors[i+1],direction=b.clone().sub(a).normalize();this.beams.add(new T.ArrowHelper(direction,a.clone().lerp(b,.6),.18,0xffd395,.14,.07));}
        const spark=new T.Mesh(new T.SphereGeometry(.018,8,8),new T.MeshBasicMaterial({color:0xffefb9,transparent:true,opacity:.65}));this.beams.add(spark);spark.userData.path=this.mirrorPaths.at(-1);
      });
      const focus=lensPage?N.lensOptics.focus(s):s.mirrorMounted&&s.mirror!=='plane'?N.mirrorOptics.focus(s):null;
      if(focus){const virtual=lensPage?s.lens==='concave':s.mirror==='convex',marker=new T.Mesh(new T.SphereGeometry(.065,16,8),new T.MeshBasicMaterial({color:virtual?0x8ea9d3:0xffc474,...(virtual?{transparent:true,depthTest:false,depthWrite:false}:{})}));marker.position.set(...focus);if(virtual)marker.renderOrder=10;this.beams.add(marker);}
      this.setBeamOpacity(this.beamOpacity);
    }
    sync(s,instant=false){
      const v=this.view,isMirror=s.stage==='mirrors',isAssembly=s.stage==='assembly';this.group.visible=isMirror;v.root.visible=!isMirror;v.mount.visible=s.stage==='observation';
      if(isAssembly){s.installed.filter(name=>!this.lastInstalled.includes(name)).forEach(name=>{const group=this.assemblyGroups[name];const from=new T.Vector3(name==='primary'?.9:-.6,.6,0);group.position.copy(from);this.flights.push({group,from,start:performance.now()});});}
      if(!isAssembly||!s.installed.length){this.flights=[];Object.values(this.assemblyGroups).forEach(group=>group.position.set(0,0,0));}
      this.lastInstalled=[...s.installed];
      v.primaryParts.forEach(o=>o.visible=!isAssembly||s.installed.includes('primary'));v.secondaryParts.forEach(o=>o.visible=!isAssembly||s.installed.includes('secondary'));
      Object.entries(this.slots).forEach(([name,o])=>{o.visible=isAssembly&&!s.installed.includes(name);o.material.color.setHex(s.selected===name?0xffc474:0x81baff);});
      v.importedModel?.sync(s);
      this.darkroom.sync(s);
      const lensPage=document.querySelector('.observatory').dataset.trayPage==='lenses';
      const key=[s.mirror,s.mirrorFocal,s.mirrorMounted,s.mirrorSource,s.mirrorPosition,lensPage,s.lens,s.convexShape,s.concaveShape].join('/');if(isMirror&&key!==this.lastMirror){this.buildMirror(s,lensPage);this.lastMirror=key;}
      const frame=s.stage+'/'+(isAssembly?s.selected||'':'');if(frame!==this.lastFrame){if(isAssembly&&s.selected&&s.focusSelection===false)v.director.transition=null;else v.director.frame(s.stage,isAssembly?s.selected:null,instant);this.lastFrame=frame;}
      if(s.stage!==this.lastStage){v.state={...v.state,running:false};this.lastStage=s.stage;}
      v.updateRays();v.dirty=true;
    }
    tick(time){
      this.flights=this.flights.filter(f=>{const t=this.view.reducedMotion?1:Math.min(1,(time-f.start)/500);f.group.position.copy(f.from).multiplyScalar(1-t*t*(3-2*t));this.view.dirty=true;return t<1;});
      if(!this.group.visible||this.view.reducedMotion)return;this.beams.children.forEach((o,index)=>{const path=o.userData.path;if(!path)return;const phase=(time/3200+index*.12)%1,segments=path.length-1,t=phase*segments,i=Math.floor(t);o.position.copy(path[i]).lerp(path[i+1],t-i);});this.view.dirty=true;}
  };
})(window.Newton);

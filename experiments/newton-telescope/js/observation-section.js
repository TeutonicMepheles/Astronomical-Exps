/* Supplied Scope_02 section assembly, with matching InnerSystem maps and optical overlays. */
(function(N){
  'use strict';
  const T=window.THREE;
  const EYE_BORE_RADIUS=.036;
  // The art model has closed caps across the focuser and no hole through the tube.
  // Subtract a convex 24-sided bore from those triangles, interpolating their UVs.
  function openBore(geometry,tube){
    const source=N.sectionOptics.model,keys=['position','normal','uv'],output={position:[],normal:[],uv:[]};
    const planes=Array.from({length:24},(_,i)=>{
      const a=i*Math.PI/12,nx=Math.cos(a),nz=Math.sin(a);
      return v=>EYE_BORE_RADIUS-nx*(v[0][0]-source.eyeAxisX-source.eyeTilt*(v[0][1]-source.eyeAxisY))-nz*v[0][2];
    });
    if(tube)planes.unshift(v=>v[0][1]-.08);
    const vertex=i=>keys.map(key=>Array.from(geometry.attributes[key].array.slice(i*geometry.attributes[key].itemSize,(i+1)*geometry.attributes[key].itemSize)));
    const emit=polygon=>{for(let i=1;i<polygon.length-1;i++)for(const v of [polygon[0],polygon[i],polygon[i+1]])keys.forEach((key,k)=>output[key].push(...v[k]));};
    for(let i=0;i<geometry.attributes.position.count;i+=3){
      let polygon=[vertex(i),vertex(i+1),vertex(i+2)];
      for(const plane of planes){
        if(!polygon.length)break;
        const inside=[],outside=[];
        for(let j=0;j<polygon.length;j++){
          const a=polygon[j],b=polygon[(j+1)%polygon.length],da=plane(a),db=plane(b);
          (da>=0?inside:outside).push(a);
          if((da>0&&db<0)||(da<0&&db>0)){
            const t=da/(da-db),v=a.map((attribute,k)=>attribute.map((x,l)=>x+(b[k][l]-x)*t));
            inside.push(v);outside.push(v);
          }
        }
        emit(outside);polygon=inside;
      }
    }
    keys.forEach(key=>geometry.setAttribute(key,new T.Float32BufferAttribute(output[key],key==='uv'?2:3)));
  }
  // The supplied mirror cap consists of large, almost coplanar triangles. Give its
  // optical surface enough interior vertices to become a paraboloid, retaining UVs.
  function refinePrimary(geometry){
    const attributes=['position','normal','uv'],output={position:[],normal:[],uv:[]};
    const vertex=i=>attributes.map(key=>Array.from(geometry.attributes[key].array.slice(i*geometry.attributes[key].itemSize,(i+1)*geometry.attributes[key].itemSize)));
    const split=(a,b,c,depth)=>{
      const distance=(u,v)=>Math.hypot(...u[0].map((x,i)=>x-v[0][i]));
      if(depth<5&&Math.max(distance(a,b),distance(b,c),distance(c,a))>.014){
        const midpoint=(u,v)=>u.map((value,k)=>value.map((x,i)=>(x+v[k][i])/2));
        const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
        split(a,ab,ca,depth+1);split(ab,b,bc,depth+1);split(ca,bc,c,depth+1);split(ab,bc,ca,depth+1);
      }else for(const v of [a,b,c])attributes.forEach((key,i)=>output[key].push(...v[i]));
    };
    for(let i=0;i<geometry.attributes.position.count;i+=3){
      const a=vertex(i),b=vertex(i+1),c=vertex(i+2);
      if([a,b,c].every(v=>v[0][0]>1.27&&v[0][0]<1.28))split(a,b,c,0);
      else for(const v of [a,b,c])attributes.forEach((key,j)=>output[key].push(...v[j]));
    }
    attributes.forEach(key=>geometry.setAttribute(key,new T.Float32BufferAttribute(output[key],key==='uv'?2:3)));
  }
  // A closed biconvex glass volume, with its optical axis along local +Y.
  // The existing thin-lens ray calculation supplies the center plane.
  function eyepieceGlass(radius,thickness,referenceThickness){
    const surface=thickness=>{
      const edge=Math.min(.003,thickness*.2),sag=(thickness-edge)/2;
      const curvature=(radius*radius+sag*sag)/(2*sag),rim=Math.sqrt(curvature*curvature-radius*radius);
      return r=>edge/2+Math.sqrt(curvature*curvature-r*r)-rim;
    };
    const original=surface(thickness),reference=surface(referenceThickness),strength=N.sectionOptics.model.lensMorphStrength;
    const height=r=>reference(r)+strength*(original(r)-reference(r));
    const profile=[];
    for(let i=0;i<=16;i++){
      const r=radius*i/16;
      profile.push(new T.Vector2(r,-height(r)));
    }
    for(let i=16;i>=0;i--){
      const r=radius*i/16;
      profile.push(new T.Vector2(r,height(r)));
    }
    return new T.LatheGeometry(profile,64);
  }
  // Separate the cradle from its post along the actual underside of the long
  // mounting rail. Split crossing triangles so no lower surface gets stretched.
  function partitionMount(geometry){
    const p=geometry.attributes.position,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    let boundary,largest=0;
    for(let i=0;i<p.count;i+=3){
      a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
      const triangle=new T.Triangle(a,b,c),normal=triangle.getNormal(new T.Vector3());
      if(normal.y<-.99&&Math.min(a.y,b.y,c.y)>-.3&&triangle.getArea()>largest){
        largest=triangle.getArea();boundary=new T.Plane().setFromCoplanarPoints(a,b,c).negate();
      }
    }
    if(!boundary)throw Error('The supplied cradle mounting rail was not found');
    const keys=['position','normal','uv'],output={position:[],normal:[],uv:[],apertureRegion:[]};
    const joint=new T.Box3();
    const vertex=i=>keys.map(key=>Array.from(geometry.attributes[key].array.slice(i*geometry.attributes[key].itemSize,(i+1)*geometry.attributes[key].itemSize)));
    const distance=v=>boundary.distanceToPoint(new T.Vector3(...v[0]));
    const interpolate=(a,b,t)=>a.map((attribute,k)=>attribute.map((x,j)=>x+(b[k][j]-x)*t));
    const emit=(polygon,upper)=>{
      for(let i=1;i<polygon.length-1;i++)for(const v of [polygon[0],polygon[i],polygon[i+1]]){
        keys.forEach((key,k)=>output[key].push(...v[k]));output.apertureRegion.push(upper?1:0);
      }
    };
    for(let i=0;i<p.count;i+=3){
      const vertices=[vertex(i),vertex(i+1),vertex(i+2)],d=vertices.map(distance);
      if(Math.min(...d)>=0){emit(vertices,true);continue;}
      if(Math.max(...d)<=0){emit(vertices,false);continue;}
      const upper=[],lower=[];
      for(let j=0;j<3;j++){
        const a=vertices[j],b=vertices[(j+1)%3],da=d[j],db=d[(j+1)%3];
        if(da>=0)upper.push(a);if(da<=0)lower.push(a);
        if(da*db<0){
          const v=interpolate(a,b,da/(da-db));upper.push(v);lower.push(v);
          // Exclude nearly coplanar rail faces when locating the circular post.
          if(Math.min(...d)<-.00002&&Math.max(...d)>.00002)joint.expandByPoint(new T.Vector3(...v[0]));
        }
      }
      emit(upper,true);emit(lower,false);
    }
    if(joint.isEmpty())throw Error('The mounting post did not intersect its rail');
    const anchor=joint.getCenter(new T.Vector3());boundary.projectPoint(anchor,anchor);
    for(const key of keys)geometry.setAttribute(key,new T.Float32BufferAttribute(output[key],key==='uv'?2:3));
    geometry.setAttribute('apertureRegion',new T.Float32BufferAttribute(output.apertureRegion,1));
    return {boundary,anchor};
  }
  // Identify the two thin circular axle caps and their coaxial bearing by
  // connected geometry. Keep those fixed; the upper casting pivots around them.
  function elevationJoint(geometry){
    const p=geometry.attributes.position,ids=new Map(),parents=[],indices=[];
    const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
    for(let i=0;i<p.count;i++){
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*100000)).join('/');
      if(!ids.has(key)){const id=parents.length;ids.set(key,id);parents.push(id);}
      indices.push(ids.get(key));
    }
    for(let i=0;i<p.count;i+=3){parents[find(indices[i+1])]=find(indices[i]);parents[find(indices[i+2])]=find(indices[i]);}
    const components=new Map();
    for(let i=0;i<p.count;i++){
      const id=find(indices[i]);
      if(!components.has(id))components.set(id,{vertices:[],box:new T.Box3()});
      const part=components.get(id);part.vertices.push(i);part.box.expandByPoint(new T.Vector3().fromBufferAttribute(p,i));
    }
    const parts=[...components.values()];
    const caps=parts.filter(part=>{
      const size=part.box.getSize(new T.Vector3());
      return size.x>.06&&size.y>.06&&size.x/size.y>.8&&size.x/size.y<1.25&&size.z<Math.min(size.x,size.y)*.15;
    });
    if(caps.length!==2)throw Error('The supplied elevation axle caps could not be identified');
    const anchor=caps.reduce((sum,part)=>sum.add(part.box.getCenter(new T.Vector3())),new T.Vector3()).multiplyScalar(.5);anchor.z=0;
    const region=new Float32Array(p.count).fill(1);
    for(const part of parts){
      const center=part.box.getCenter(new T.Vector3());
      if(Math.hypot(center.x-anchor.x,center.y-anchor.y)<.005)for(const i of part.vertices)region[i]=0;
    }
    geometry.setAttribute('elevationRegion',new T.BufferAttribute(region,1));
    return anchor;
  }
  N.ObservationSection=class{
    constructor(view){
      this.view=view;this.active=false;this.root=new T.Group();view.scene.add(this.root);this.root.visible=false;
      this.baseRotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(
        new T.Vector3(0,-.103702971,-.994608312),new T.Vector3(0,.994608312,-.103702971),new T.Vector3(1,0,0)));
      this.root.position.fromArray(N.observationSectionModel.frame.origin);
      this.root.scale.setScalar(N.observationSectionModel.frame.scale/1.9981170343179426);
      this.root.quaternion.copy(this.baseRotation);this.root.updateMatrixWorld(true);
      const inverse=this.root.matrixWorld.clone().invert();
      const load=(url,colorSpace)=>{
        let ready;view.textureLoads?.push(new Promise(resolve=>{ready=resolve;}));
        const texture=new T.TextureLoader().load(url,()=>{ready?.();view.render();},undefined,()=>ready?.());
        texture.colorSpace=colorSpace;texture.channel=0;texture.anisotropy=Math.min(4,view.renderer.capabilities.getMaxAnisotropy());return texture;
      };
      const color=load('assets/telescope-model/section-base-color.png',T.SRGBColorSpace);
      const normal=load('assets/telescope-model/section-normal.png',T.NoColorSpace);
      const orm=load('assets/telescope-model/section-orm.png',T.NoColorSpace);
      this.material=new T.MeshStandardMaterial({map:color,normalMap:normal,normalScale:new T.Vector2(.8,.8),aoMap:orm,roughnessMap:orm,metalnessMap:orm,metalness:1,roughness:1,envMapIntensity:.7,side:T.DoubleSide});
      // One user-controlled transparency for both inner and outer tube walls.
      this.transparency=70;
      try{const saved=localStorage.getItem('newton-telescope.section-transparency.v1');
        if(saved!==null&&Number.isFinite(Number(saved)))this.transparency=T.MathUtils.clamp(Math.round(Number(saved)),0,100);
      }catch(_){ /* The slider also works when browser storage is unavailable. */ }
      this.wallOpacity={value:1-this.transparency/100};this.wallMaterial=this.material.clone();
      this.wallMaterial.transparent=true;this.wallMaterial.depthWrite=false;this.wallMaterial.forceSinglePass=true;
      this.wallMaterial.onBeforeCompile=shader=>{
        shader.uniforms.sectionWallOpacity=this.wallOpacity;
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
          '#include <common>\nuniform float sectionWallOpacity;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',
          '#include <metalnessmap_fragment>\nfloat sectionSurface = min(1.0, sectionWallMask) * max(1.0 - smoothstep(0.2, 0.6, metalnessFactor), step(1.5, sectionWallMask));\ndiffuseColor.a *= mix(1.0, sectionWallOpacity, sectionSurface);');
        shader.vertexShader=shader.vertexShader.replace('#include <common>',
          '#include <common>\nattribute float sectionWall;\nvarying float sectionWallMask;').replace('#include <begin_vertex>',
          '#include <begin_vertex>\nsectionWallMask = sectionWall;');
        shader.fragmentShader=shader.fragmentShader.replace('uniform float sectionWallOpacity;',
          'uniform float sectionWallOpacity;\nvarying float sectionWallMask;');
      };
      this.wallMaterial.customProgramCacheKey=()=> 'newton-section-adjustable-wall-v2';
      this.eyepieceMaterial=this.material.clone();this.eyepieceMaterial.transparent=true;
      this.eyepieceMaterial.depthWrite=false;this.eyepieceMaterial.forceSinglePass=true;
      const decode=value=>new Float32Array(Uint8Array.from(atob(value),c=>c.charCodeAt(0)).buffer);
      this.parts=N.observationSectionModel.meshes.map(part=>{
        const geometry=new T.BufferGeometry();
        for(const [name,size] of [['position',3],['normal',3],['uv',2]])geometry.setAttribute(name,new T.BufferAttribute(decode(part[name]),size));
        geometry.applyMatrix4(inverse);
        if(part.name==='Scope_02_ShelfA'){
          const mount=partitionMount(geometry);this.mountBoundary=mount.boundary;this.mountAnchor=mount.anchor;
        }
        if(part.name==='Scope_02_ShelfB')this.elevationAnchor=elevationJoint(geometry);
        if(part.name==='Scope_02_ZhuJing')refinePrimary(geometry);
        if(part.name==='Scope_02_Main'||part.name==='Scope_02_MuJing')openBore(geometry,part.name==='Scope_02_Main');
        const wall=part.name==='Scope_02_Main',eyepiece=part.name==='Scope_02_MuJing';
        if(wall){
          const mask=new Float32Array(geometry.attributes.position.count),p=geometry.attributes.position,n=geometry.attributes.normal;
          // Classify whole triangles so long wall panels are not missed when all
          // their vertices sit on an end ring. 2 = inner wall, 1 = outer wood.
          for(let i=0;i<mask.length;i+=3){
            let x=0,nx=0,radial=0;
            for(let j=i;j<i+3;j++){x+=p.getX(j)/3;nx+=Math.abs(n.getX(j))/3;radial+=(p.getY(j)*n.getY(j)+p.getZ(j)*n.getZ(j))/3;}
            const value=x>.07&&x<1.26&&nx<.5&&Math.abs(radial)>.08?(radial<0?2:1):0;
            mask.fill(value,i,i+3);
          }
          geometry.setAttribute('sectionWall',new T.BufferAttribute(mask,1));
        }
        const mesh=new T.Mesh(geometry,wall?this.wallMaterial:eyepiece?this.eyepieceMaterial:this.material);mesh.name=part.name;
        mesh.castShadow=!wall&&!eyepiece;mesh.receiveShadow=true;this.root.add(mesh);
        return {mesh,original:Float32Array.from(geometry.attributes.position.array),normals:Float32Array.from(geometry.attributes.normal.array)};
      });
      // Reuse the supplied exterior tripod and its Main maps below the section mount.
      // It belongs to the fixed lower assembly, outside aperture deformation.
      const tripod=view.model?.getObjectByName('Scope_01_Tripod');
      if(tripod){
        const pedestal=view.model.getObjectByName('Scope_01_ShelfC');
        tripod.geometry.computeBoundingBox();pedestal.geometry.computeBoundingBox();
        const join=pedestal.geometry.boundingBox.min.y-tripod.geometry.boundingBox.max.y+.002;
        this.tripod=tripod.clone();this.tripod.name='Scope_02_Tripod';
        this.tripod.geometry=tripod.geometry.clone().translate(0,join,0).applyMatrix4(inverse);
        this.tripod.geometry.computeBoundingBox();this.tripod.geometry.computeBoundingSphere();
        this.tripod.material=tripod.material.clone();this.root.add(this.tripod);
      }
      this.primary=this.root.getObjectByName('Scope_02_ZhuJing');
      this.secondary=this.root.getObjectByName('Scope_02_GlassPlane');this.lens=this.root.getObjectByName('Scope_02_MuJing');
      this.elevationRoot=new T.Group();this.elevationRoot.name='Elevation • upper assembly';this.root.add(this.elevationRoot);
      for(const {mesh} of this.parts)if(!['Scope_02_ShelfB','Scope_02_ShelfC'].includes(mesh.name))this.elevationRoot.add(mesh);
      this.aperturePivot=this.mountAnchor.clone();this.apertureBoundary=this.mountBoundary.clone();
      this.orbitPivot=new T.Vector3();
      this.interior=new T.Group();this.elevationRoot.add(this.interior);
      this.lensGlassMaterial=new T.MeshPhysicalMaterial({color:0xa7e5f2,metalness:0,roughness:.13,
        transparent:true,opacity:.62,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.1,
        depthWrite:false,side:T.DoubleSide});
      this.materials={
        incoming:new T.MeshBasicMaterial({color:0xffd17e,toneMapped:false}),
        returned:new T.MeshBasicMaterial({color:0x6fe8ff,toneMapped:false}),
        outgoing:new T.MeshBasicMaterial({color:0xd3adff,toneMapped:false,vertexColors:true}),
        focus:new T.MeshBasicMaterial({color:0xffedaa,toneMapped:false}),
        photon:new T.MeshBasicMaterial({color:0xffffff,toneMapped:false,vertexColors:true})
      };
      // Readable optical overlays remain visible through the supplied solid focuser and bands.
      Object.values(this.materials).forEach(material=>{material.transparent=true;material.depthTest=material.depthWrite=false;});
      this.labels=document.createElement('div');this.labels.className='observation-section-labels';this.labels.hidden=true;
      this.labels.setAttribute('aria-hidden','true');
      this.labels.innerHTML='<span data-optical-label="focus">F</span>';
      view.container.append(this.labels);this.update(N.store.get());
    }
    setActive(active){
      this.active=active;this.root.visible=active;this.labels.hidden=!active;
      if(active){
        const previousKey=this.key;this.framingKey='';this.update(this.state);
        if(this.key===previousKey)this.updateFraming(this.state,this.calculation);
      }
    }
    setReveal(value){
      this.reveal=value;this.labels.hidden=!this.root.visible||value<.5;this.labels.style.opacity=String(value);
      for(const material of Object.values(this.materials)){
        material.opacity=value;
      }
    }
    mesh(geometry,material,position=[0,0,0]){const mesh=new T.Mesh(geometry,material);mesh.position.set(...position);mesh.renderOrder=10;this.interior.add(mesh);return mesh;}
    rod(a,b,radius,material,fade){
      const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
      const geometry=new T.CylinderGeometry(radius,radius,delta.length(),8,fade?32:1,!!fade);
      if(fade){
        // RGBA vertex colors multiply the shared reveal opacity, so the outside
        // tail fades continuously without extra materials or a bright end cap.
        const colors=new Float32Array(geometry.attributes.position.count*4).fill(1),uv=geometry.attributes.uv;
        for(let i=0;i<uv.count;i++)colors[i*4+3]=1-T.MathUtils.smoothstep(start.y+uv.getY(i)*delta.y,fade.start,fade.end);
        geometry.setAttribute('color',new T.BufferAttribute(colors,4));
      }
      const mesh=this.mesh(geometry,material,start.clone().add(end).multiplyScalar(.5).toArray());
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return mesh;
    }
    update(state,prepare=false){
      this.state=state;if(!this.active&&!prepare)return;
      const opticsKey=[state.focal,state.eyepiece,state.aperture,state.mode].join('/'),key=opticsKey+'/'+state.angle;
      if(key===this.key)return;this.key=key;
      if(this.opticsKey===opticsKey){
        const previousOrbitPivot=this.orbitPivot.clone();
        this.setElevation(state.angle);this.updateOrbitPivot();
        this.updateFraming(state,this.calculation,previousOrbitPivot);return;
      }
      this.opticsKey=opticsKey;
      const c=this.calculation=N.sectionOptics.calculate(N.store.telescopeState?.(state)||state);
      const geometryKey='fixed-reference';
      if(this.geometryKey!==geometryKey){
        this.geometryKey=geometryKey;
        this.root.quaternion.copy(this.baseRotation);
        const ratio=c.ratio,source=N.sectionOptics.model;
        // Preserve the focuser opening and end cells as rigid regions, extending only
        // the straight tube between them. A uniform X scale moved the hole off-axis.
        const frontAnchor=c.secondaryX+(.43-source.eyeAxisX)*ratio,rearShift=c.primaryX-source.primaryFaceX;
        const bodyScale=(1.22+rearShift-frontAnchor)/(1.22-.43);
        const bodyX=x=>x<=.43?c.secondaryX+(x-source.eyeAxisX)*ratio:x>=1.22?x+rearShift:frontAnchor+(x-.43)*bodyScale;
        const secondaryAngle=Math.PI/4-Math.atan2(.496274,.868166),cs=Math.cos(secondaryAngle),sn=Math.sin(secondaryAngle);
        this.parts.forEach(({mesh,original,normals})=>{
          const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
          for(let i=0;i<p.count;i++){
            const x=original[i*3],y=original[i*3+1],z=original[i*3+2];
            let sx=1,sy=1,sz=1,px=x,py=y,pz=z;
            if(mesh===this.primary){
              sy=sz=c.radius/source.primaryRadius;py=(y-source.primaryCenterY)*sy;pz=z*sz;
              const depth=x>1.27&&x<1.28?0:x-source.primaryFaceX-source.primaryTilt*(y-source.primaryCenterY);
              px=c.primaryX+depth-(py*py+pz*pz)/(4*c.geometryFocal);
            }
            else if(mesh===this.secondary){
              const dx=x-.313406378,dy=y-.000839248;
              sx=sy=sz=ratio;px=c.secondaryX+(cs*dx-sn*dy)*ratio;py=(sn*dx+cs*dy)*ratio;pz=(z-.000000357)*ratio;
            }
            else if(mesh.name==='Scope_02_GlassPlaneShelf'){py=y*ratio;pz=z*ratio;sx=sy=sz=ratio;px=c.secondaryX+(x-.3234)*ratio;}
            else if(mesh===this.lens){
              sx=sz=ratio;sy=(c.eyeTop-c.eyeBase)/(source.eyeTop-source.eyeBase);
              px=(x-source.eyeAxisX-source.eyeTilt*(y-source.eyeAxisY))*sx+c.secondaryX;
              py=c.eyeBase+(y-source.eyeBase)*sy;pz=z*sz;
            }else{
              sx=x<=.43?ratio:x<1.22?bodyScale:1;sy=sz=ratio;
              px=bodyX(x);py=y*sy;pz=z*sz;
              if(mesh.name==='Scope_02_Main')px-=source.eyeTilt*(y-source.eyeAxisY)*ratio*(1-T.MathUtils.clamp((x-.43)/.79,0,1));
            }
            p.setXYZ(i,px,py,pz);
            const normal=new T.Vector3(normals[i*3]/sx,normals[i*3+1]/sy,normals[i*3+2]/sz).normalize();
            if(mesh===this.primary){
              normal.set(normals[i*3],normals[i*3+1]/sy+normals[i*3]*(source.primaryTilt/sy+py/(2*c.geometryFocal)),
                normals[i*3+2]/sz+normals[i*3]*pz/(2*c.geometryFocal)).normalize();
              if(x>1.27&&x<1.28&&normals[i*3]<-.95)normal.set(-1,-py/(2*c.geometryFocal),-pz/(2*c.geometryFocal)).normalize();
            }else if(mesh===this.secondary){
              normal.set(cs*normals[i*3]-sn*normals[i*3+1],sn*normals[i*3]+cs*normals[i*3+1],normals[i*3+2]).normalize();
            }else if(mesh===this.lens){
              normal.set(normals[i*3]/sx,(normals[i*3+1]+source.eyeTilt*normals[i*3])/sy,normals[i*3+2]/sz).normalize();
            }
            n.setXYZ(i,normal.x,normal.y,normal.z);
          }
          p.needsUpdate=n.needsUpdate=true;mesh.geometry.computeBoundingSphere();mesh.geometry.computeBoundingBox();
        });
        const mountTransform=new T.Matrix4().makeScale(bodyScale,ratio,ratio);
        mountTransform.setPosition(frontAnchor-.43*bodyScale,0,0);
        this.aperturePivot.copy(this.mountAnchor).applyMatrix4(mountTransform);
        this.apertureBoundary.copy(this.mountBoundary).applyMatrix4(mountTransform);
        this.elevationPivot=this.elevationAnchor.clone().applyMatrix4(mountTransform);
        const joint=this.root.getObjectByName('Scope_02_ShelfB').geometry;
        this.jointReference={position:Float32Array.from(joint.attributes.position.array),normal:Float32Array.from(joint.attributes.normal.array)};
        this.supportReference=Float32Array.from(this.root.getObjectByName('Scope_02_ShelfA').geometry.attributes.position.array);
        this.apertureKey='';
      }
      const previousOrbitPivot=this.orbitPivot.clone();
      this.setElevation(state.angle);
      this.setAperture(c.displayScale);
      this.updateOrbitPivot();
      this.interior.traverse(o=>o.geometry?.dispose());this.interior.clear();this.photons=[];
      // Keep the glass on the cyan-to-violet ray junction, inside the original
      // eyepiece bore. It shares the optical overlay's aperture transform and is
      // excluded from opaque-hardware occlusion tests because rays cross glass.
      this.glassLens=this.mesh(eyepieceGlass(EYE_BORE_RADIUS*c.ratio*.99,c.lensOriginalThickness,c.lensReferenceThickness),this.lensGlassMaterial,
        [c.secondaryX,c.lensY,0]);
      this.glassLens.name='Scope_02_Eyepiece_ConvexLens';this.glassLens.renderOrder=9;
      this.focus=this.mesh(new T.SphereGeometry(.012,16,12),this.materials.focus,c.focus);
      this.focus.visible=c.focusBeforeSecondary||c.focus[1]>0&&c.focus[1]<c.eyeTop;
      this.root.updateMatrixWorld(true);
      const rayRotation=this.interior.getWorldQuaternion(new T.Quaternion());
      this.renderPaths=c.rays.map(path=>{
        const sourcePoints=path.secondaryValid?path.points:path.points.slice(0,2);
        const points=[sourcePoints[0]],worldScale=this.interior.getWorldScale(new T.Vector3()).x;
        for(let j=0;j<sourcePoints.length-1;j++){
          const a=this.interior.localToWorld(new T.Vector3(...sourcePoints[j])),b=this.interior.localToWorld(new T.Vector3(...sourcePoints[j+1]));
          const direction=b.clone().sub(a),length=direction.length();
          direction.normalize();
          const localDirection=new T.Vector3(...sourcePoints[j+1]).sub(new T.Vector3(...sourcePoints[j])).normalize();
          const reference=Math.abs(localDirection.z)<.9?new T.Vector3(0,0,1):new T.Vector3(0,1,0);
          const localSide=new T.Vector3().crossVectors(reference,localDirection).normalize();
          const side=localSide.clone().applyQuaternion(rayRotation);
          const across=new T.Vector3().crossVectors(localDirection,localSide).normalize().applyQuaternion(rayRotation);
          const offsets=[new T.Vector3(),...Array.from({length:8},(_,k)=>side.clone().multiplyScalar(Math.cos(k*Math.PI/4))
            .addScaledVector(across,Math.sin(k*Math.PI/4)).multiplyScalar(c.envelope*worldScale))];
          let hit;
          for(const offset of offsets){
            const trim=offset.lengthSq()?c.envelope*2*worldScale:.0004*worldScale;
            if(length<=trim*2)continue;
            const ray=new T.Raycaster(a.clone().add(offset),direction,trim,length-trim);
            const candidate=ray.intersectObjects(this.parts.map(p=>p.mesh),false)[0];
            if(candidate&&(!hit||candidate.distance<hit.distance))hit=candidate;
          }
          if(hit){
            const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
            const gap=c.envelope*worldScale/Math.max(.05,Math.abs(direction.dot(normal)));
            const end=a.addScaledVector(direction,Math.max(0,hit.distance-gap));
            points.push(this.interior.worldToLocal(end).toArray());break;
          }
          points.push(sourcePoints[j+1]);
        }
        return {...path,points};
      });
      const lineScale=Math.min(1,Math.sqrt(4/c.rayCount));
      this.renderPaths.forEach((path,index)=>{
        path.points.slice(1).forEach((point,j)=>{
          const material=j===0?this.materials.incoming:j===3?this.materials.outgoing:this.materials.returned;
          const start=path.points[j],segment=this.rod(start,point,c.envelope*.45*lineScale,material,
            j===3?{start:c.fadeStartY,end:c.exitY}:undefined);
          if(j===0)segment.userData.opticalRole='incident-line';
          if(j<3){const a=new T.Vector3(...start),b=new T.Vector3(...point),d=b.clone().sub(a).normalize();
            const arrow=this.mesh(new T.ConeGeometry(c.envelope*lineScale,.024*lineScale,10),material,a.lerp(b,.56).toArray());arrow.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d);
            if(j===0)arrow.userData.opticalRole='incident-arrow';}
        });
        const photonGeometry=new T.SphereGeometry(c.envelope*.65*lineScale,10,8);
        photonGeometry.setAttribute('color',new T.BufferAttribute(new Float32Array(photonGeometry.attributes.position.count*4).fill(1),4));
        const photon=this.mesh(photonGeometry,this.materials.photon);photon.visible=false;
        const vertices=path.points.map(p=>new T.Vector3(...p)),lengths=vertices.slice(1).map((p,i)=>p.distanceTo(vertices[i]));
        this.photons.push({mesh:photon,points:path.points,index,vertices,lengths,total:lengths.reduce((a,b)=>a+b,0)});
      });
      this.anchors={primary:[c.primaryX,c.radius+.1,0],secondary:[c.secondaryX,-c.outerRadius-.09,0],eyepiece:[c.secondaryX,c.lensY+.18,0],focus:c.focus};
      this.root.updateMatrixWorld(true);
      this.updateFraming(state,c,previousOrbitPivot);
    }
    updateFraming(state,c,previousOrbitPivot=this.orbitPivot){
      // Aperture changes scale the assembly on screen instead of auto-fitting it away.
      const framingKey='fixed-mount';
      if(this.framingKey!==framingKey){
        this.framingKey=framingKey;
        this.framingOffset=new T.Vector3();
        this.bounds=new T.Box3();this.parts.filter(p=>['Scope_02_Main','Scope_02_MuJing'].includes(p.mesh.name)).forEach(({mesh})=>this.bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(this.root.matrixWorld)));
        this.bounds.expandByPoint(this.root.localToWorld(new T.Vector3(c.front-.24,0,0)));
        this.bounds.expandByPoint(this.root.localToWorld(new T.Vector3(c.secondaryX,c.lensY+.27,0)));
        // Keep the original tube close-up; the tripod must not pull the camera back.
      }else{
        const delta=this.orbitPivot.clone().sub(previousOrbitPivot),turn=(this.view.transition?1.42:this.view.yaw)-1.42;
        this.framingOffset.add(delta).sub(delta.clone().applyAxisAngle(new T.Vector3(0,1,0),-turn));
      }
    }
    setElevation(angle){
      if(this.elevationAngle===angle)return;this.elevationAngle=angle;
      const pivot=this.elevationPivot,rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),(angle-45)*Math.PI/180*.4);
      this.elevationRoot.quaternion.copy(rotation);
      this.elevationRoot.position.copy(pivot).sub(pivot.clone().applyQuaternion(rotation));
      const mesh=this.root.getObjectByName('Scope_02_ShelfB'),p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
      const region=mesh.geometry.attributes.elevationRegion,reference=this.jointReference,v=new T.Vector3(),normal=new T.Vector3();
      for(let i=0;i<p.count;i++){
        v.fromArray(reference.position,i*3);normal.fromArray(reference.normal,i*3);
        if(region.getX(i)){v.sub(pivot).applyQuaternion(rotation).add(pivot);normal.applyQuaternion(rotation);}
        p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
      }
      p.needsUpdate=n.needsUpdate=true;mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
    }
    setAperture(scale){
      if(this.apertureKey===scale)return;this.apertureKey=scale;
      const pivot=this.aperturePivot;
      for(const {mesh} of this.parts){
        if(!['Scope_02_ShelfA','Scope_02_ShelfB','Scope_02_ShelfC'].includes(mesh.name)){
          mesh.scale.setScalar(scale);mesh.position.copy(pivot).multiplyScalar(1-scale);
        }else if(mesh.name==='Scope_02_ShelfA'){
          // The pre-split lower triangles are immutable at every aperture.
          const p=mesh.geometry.attributes.position,base=this.supportReference,region=mesh.geometry.attributes.apertureRegion;
          for(let i=0;i<p.count;i++){
            const x=base[i*3],y=base[i*3+1],z=base[i*3+2],k=region.getX(i)?scale:1;
            p.setXYZ(i,pivot.x+(x-pivot.x)*k,pivot.y+(y-pivot.y)*k,pivot.z+(z-pivot.z)*k);
          }
          p.needsUpdate=true;mesh.geometry.computeBoundingSphere();mesh.geometry.computeBoundingBox();
        }
      }
      this.interior.scale.setScalar(scale);this.interior.position.copy(pivot).multiplyScalar(1-scale);
    }
    updateOrbitPivot(){
      this.root.updateMatrixWorld(true);
      const box=this.root.getObjectByName('Scope_02_Main').geometry.boundingBox;
      this.orbitPivot.copy(this.interior.localToWorld(new T.Vector3((box.min.x+box.max.x)/2,0,0)));
    }
    pose(yaw,aspect){
      const center=this.bounds.getCenter(new T.Vector3()).add(this.framingOffset),size=this.bounds.getSize(new T.Vector3());
      // Frame once at the reference angle for these parameters and viewport.
      // Orbiting must never refit/zoom the tube as its projected width changes.
      const referenceYaw=1.42,axis=new T.Vector3(0,1,0);
      const direction=new T.Vector3(Math.sin(referenceYaw),.2,Math.cos(referenceYaw)).normalize();
      const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize();
      const up=new T.Vector3().crossVectors(direction,right);
      const width=Math.abs(right.x)*size.x+Math.abs(right.y)*size.y+Math.abs(right.z)*size.z;
      const height=Math.abs(up.x)*size.x+Math.abs(up.y)*size.y+Math.abs(up.z)*size.z;
      const span=Math.max(.42,width/(aspect*2.24),height/2.18);
      // Rotate the framing offset along with the camera. This preserves the
      // original composition while holding the tube midpoint at an exact screen position.
      const centerY=center.y;
      center.sub(this.orbitPivot).applyAxisAngle(axis,yaw-referenceYaw).add(this.orbitPivot);center.y=centerY;
      return {center,span,yaw};
    }
    setTransparency(value){
      value=Number(value);if(!Number.isFinite(value))return;
      this.transparency=T.MathUtils.clamp(Math.round(value),0,100);this.wallOpacity.value=1-this.transparency/100;
      try{localStorage.setItem('newton-telescope.section-transparency.v1',String(this.transparency));}catch(_){}
      this.view.container.dispatchEvent(new CustomEvent('transparencychange'));this.view.render();
    }
    updateView(){
      // Keep the existing zoom/model crossfade as a separate multiplier.
      this.wallMaterial.opacity=this.material.opacity;
      this.eyepieceMaterial.opacity=this.material.opacity*this.wallOpacity.value;
      this.lensGlassMaterial.opacity=this.material.opacity*.62;
      if(this.tripod)this.view.fade(this.tripod.material,this.material.opacity);
    }
    animate(time){
      const moving=this.state.running&&!this.view.reducedMotion;
      this.photons.forEach(({mesh,vertices,lengths,total,index})=>{
        mesh.visible=moving;if(!moving)return;
        let distance=((time*.24+index*.23)%1)*total;
        for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){mesh.position.copy(vertices[i]).lerp(vertices[i+1],distance/lengths[i]);break;}distance-=lengths[i];}
        const alpha=1-T.MathUtils.smoothstep(mesh.position.y,this.calculation.fadeStartY,this.calculation.exitY),colors=mesh.geometry.attributes.color;
        if(mesh.userData.rayAlpha!==alpha){for(let i=0;i<colors.count;i++)colors.setW(i,alpha);colors.needsUpdate=true;mesh.userData.rayAlpha=alpha;}
      });
    }
    placeLabels(camera){
      const w=this.view.container.clientWidth,h=this.view.container.clientHeight;
      const rect=this.view.container.getBoundingClientRect(),scaleX=rect.width/w,scaleY=rect.height/h;
      const stage=this.view.container.closest('.observatory');
      const stageRect=stage.getBoundingClientRect();
      const limits={left:(stageRect.left-rect.left)/scaleX,right:(stageRect.right-rect.left)/scaleX,
        top:(stageRect.top-rect.top)/scaleY,bottom:(stageRect.bottom-rect.top)/scaleY};
      const obstacles=[...stage.querySelectorAll('.introduction,.observation-display-mode,.observation-sliders,.observation-transparency,.observation-section-caption')]
        .filter(el=>el.checkVisibility()).map(el=>{const r=el.getBoundingClientRect();return {x:(r.x-rect.x)/scaleX,y:(r.y-rect.y)/scaleY,w:r.width/scaleX,h:r.height/scaleY};});
      for(const [name,anchor] of Object.entries(this.anchors)){
        const label=this.labels.querySelector('[data-optical-label="'+name+'"]');
        if(!label)continue;
        const p=this.interior.localToWorld(new T.Vector3(...anchor)).project(camera);
        const anchorX=(p.x*.5+.5)*w,anchorY=(-p.y*.5+.5)*h;
        label.hidden=name==='focus'&&!this.focus.visible||anchorX<limits.left||anchorX>limits.right||anchorY<limits.top||anchorY>limits.bottom;
        if(label.hidden)continue;
        const halfW=label.offsetWidth/2+8,halfH=label.offsetHeight/2+8;
        const x=(p.x*.5+.5)*w+(name==='secondary'?45:name==='focus'?18:0),y=(-p.y*.5+.5)*h+(name==='focus'?12:0);
        let position;
        for(const [dx,dy] of [[0,0],[70,0],[-70,0],[0,45],[0,-45],[140,0],[-140,0],[70,60]]){
          const left=Math.max(limits.left+halfW,Math.min(limits.right-halfW,x+dx)),top=Math.max(limits.top+halfH,Math.min(limits.bottom-halfH,y+dy));
          position={left,top};
          if(!obstacles.some(b=>left-halfW<b.x+b.w&&left+halfW>b.x&&top-halfH<b.y+b.h&&top+halfH>b.y))break;
        }
        label.style.left=position.left+'px';label.style.top=position.top+'px';
      }
    }
  };
})(window.Newton);

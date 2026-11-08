/* 月面材质试验页：复用本实验的环形山高度场，只保留剖切和太阳高度交互。
 * 纹理、笔刷痕迹与色带在初始化时生成；交互时只更新剖面几何与光源。
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const topCanvas = $('top'), sideCanvas = $('section');
  const topRenderer = new THREE.WebGLRenderer({ canvas: topCanvas, antialias: true });
  const sideRenderer = new THREE.WebGLRenderer({ canvas: sideCanvas, antialias: true, alpha: true });
  for (const renderer of [topRenderer, sideRenderer]) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
  }
  sideRenderer.setClearColor(0x101d35, 0);

  const topScene = new THREE.Scene(), sideScene = new THREE.Scene();
  topScene.background = new THREE.Color(0xdcd6ca);
  const state = { cut: 0, angle: 35 };
  for (const scene of [topScene, sideScene]) {
    scene.add(new THREE.HemisphereLight(0xf9f1e7, 0x77716f, 0.72));
    const sun = new THREE.DirectionalLight(0xfff4e4, 1.6);
    sun.position.set(180*Math.cos(35*Math.PI/180),180*Math.sin(35*Math.PI/180),0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left:-175, right:175, top:175, bottom:-175, near:1, far:600 });
    sun.shadow.normalBias = 0.09;
    scene.add(sun);
    scene.userData.sun = sun;
  }
  const topCamera = new THREE.OrthographicCamera(-160, 160, 160, -160, 1, 600);
  topCamera.position.set(0, 260, 0);
  topCamera.up.set(0, 0, -1);
  topCamera.lookAt(0, 0, 0);
  const sideCamera = new THREE.OrthographicCamera(-160, 160, 160, -160, 1, 600);
  sideCamera.position.set(0, -5, 255);
  sideCamera.lookAt(0, -5, 0);

  const fract = value => value - Math.floor(value);
  const smooth = (a, b, value) => {
    const t = Math.max(0, Math.min(1, (value-a)/(b-a)));
    return t*t*(3-2*t);
  };
  function noise(x, z) {
    const ix=Math.floor(x), iz=Math.floor(z);
    let u=fract(x), v=fract(z);
    u=u*u*(3-2*u); v=v*v*(3-2*v);
    const hash=(a,b)=>fract(Math.sin(a*127.1+b*311.7)*43758.5453);
    return (1-v)*((1-u)*hash(ix,iz)+u*hash(ix+1,iz))
      +v*((1-u)*hash(ix,iz+1)+u*hash(ix+1,iz+1));
  }
  function rimRadius(x,z) {
    const a=Math.atan2(z,x);
    return 88+10*Math.sin(3*a+1.2)+6*Math.sin(5*a+0.4)+4*Math.cos(2*a-0.8);
  }
  function heightAt(x,z) {
    const r=Math.hypot(x,z), a=Math.atan2(z,x), radius=rimRadius(x,z);
    const rim=28*Math.exp(-Math.pow((r-radius)/14,2));
    const bowl=-27*Math.exp(-Math.pow(r/(radius*.70),4));
    const peak=13*Math.exp(-Math.pow(r/18,2));
    const reliefFade=1-.8*smooth(radius+12,radius+65,r);
    const ripples=((noise(x*.18,z*.18)-.5)*3.5+(noise(x*.65+20,z*.65)-.5)*.8)*reliefFade;
    const wall=3*Math.sin(a*9+.3)*Math.exp(-Math.pow((r-radius*.73)/18,2));
    return rim+bowl+peak+wall+ripples;
  }

  // 原实验的地形保持可比较；用浅暖色层次区分坑缘和内壁，不绘制灰色阴影贴图。
  const SIZE=320, SEG=200;
  const geometry=new THREE.PlaneGeometry(SIZE,SIZE,SEG,SEG);
  const positions=geometry.attributes.position, colors=[];
  const fieldColor=new THREE.Color(0xd9d2c7), floorColor=new THREE.Color(0xd8cbbd);
  const outerColor=new THREE.Color(0xc7b7a5);
  const wallColor=new THREE.Color(0xab9684), rimColor=new THREE.Color(0xfff4e3);
  const color=new THREE.Color();
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=-positions.getY(i),d=Math.hypot(x,z)-rimRadius(x,z);
    positions.setZ(i,heightAt(x,z));
    const floor=1-smooth(-68,-38,d);
    const wall=smooth(-78,-48,d)*(1-smooth(-7,5,d));
    const outer=smooth(9,25,d)*(1-smooth(40,62,d));
    const rim=Math.exp(-Math.pow(d/15,2))*.9;
    color.copy(fieldColor).lerp(floorColor,floor).lerp(outerColor,outer*.48)
      .lerp(wallColor,wall).lerp(rimColor,rim);
    color.multiplyScalar(.96+.06*noise(x*.075+12,z*.075-7));
    colors.push(color.r,color.g,color.b);
  }
  positions.needsUpdate=true;
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();

  // 非平铺浅色画布：低对比色洗、短笔触、细颗粒和零星小坑在加载时绘制一次。
  let seed=0xa34f97c1;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const textureCanvas=document.createElement('canvas');
  const T=1024;
  textureCanvas.width=textureCanvas.height=T;
  const ctx=textureCanvas.getContext('2d');
  const pixels=ctx.createImageData(T,T);
  for(let i=0;i<T*T;i++){
    const shade=238+Math.floor(random()*12);
    pixels.data[4*i]=shade;
    pixels.data[4*i+1]=shade-3;
    pixels.data[4*i+2]=shade-9;
    pixels.data[4*i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  for(let i=0;i<280;i++){
    const x=random()*T,y=random()*T,rx=18+random()*100,ry=9+random()*50;
    ctx.fillStyle=i%3===0?'rgba(139,118,95,.025)':'rgba(255,251,237,.045)';
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,random()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  for(let i=0;i<13000;i++){
    const x=random()*T,y=random()*T,length=3+random()*20,dy=(random()-.5)*8;
    ctx.strokeStyle=i%4===0?'rgba(255,255,246,.23)':'rgba(126,107,89,.18)';
    ctx.lineWidth=.5+random()*2.1;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+length*.5,y+dy,x+length,y+dy*.4);ctx.stroke();
  }
  ctx.fillStyle='rgba(121,106,90,.16)';
  for(let i=0;i<55000;i++)ctx.fillRect(random()*T,random()*T,.5+random()*1.5,.5+random()*1.2);
  for(let i=0;i<90;i++){
    const x=30+random()*(T-60),y=30+random()*(T-60);
    const r=i<14?12+random()*13:2+random()*8;
    ctx.fillStyle='rgba(125,109,93,.12)';
    ctx.beginPath();ctx.ellipse(x+1,y+1,r,r*.72,random()*Math.PI,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,251,239,.46)';ctx.lineWidth=1+random()*2;
    ctx.beginPath();ctx.arc(x,y,r,Math.PI*.78,Math.PI*1.8);ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  const gradient=new THREE.DataTexture(new Uint8Array([
    100,100,100,255, 158,158,158,255, 214,214,214,255, 255,255,255,255,
  ]),4,1,THREE.RGBAFormat);
  gradient.magFilter=THREE.NearestFilter;
  gradient.minFilter=THREE.NearestFilter;
  gradient.generateMipmaps=false;
  gradient.needsUpdate=true;
  const surfaceBase={color:0xffffff,vertexColors:true,map:texture,bumpMap:texture,
    bumpScale:.012,gradientMap:gradient,side:THREE.DoubleSide};
  const topMesh=new THREE.Mesh(geometry,new THREE.MeshToonMaterial(surfaceBase));
  const cutPlane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
  const sideMesh=new THREE.Mesh(geometry,new THREE.MeshToonMaterial({
    ...surfaceBase,clippingPlanes:[cutPlane],clipShadows:true,
  }));
  for(const mesh of [topMesh,sideMesh]){
    mesh.rotation.x=-Math.PI/2;
    mesh.castShadow=mesh.receiveShadow=true;
  }
  topScene.add(topMesh);sideScene.add(sideMesh);

  // 少量低面数碎石用实例绘制，增强俯视图的手绘比例感。
  const rockGeometry=new THREE.IcosahedronGeometry(1,0);
  const rockMaterial=new THREE.MeshStandardMaterial({color:0xe6dfd3,roughness:1,flatShading:true});
  const rocks=new THREE.InstancedMesh(rockGeometry,rockMaterial,42);
  const dummy=new THREE.Object3D(),rockColor=new THREE.Color();
  for(let i=0;i<42;i++){
    const x=(random()-.5)*300,z=(random()-.5)*300,size=.9+random()*2.6;
    dummy.position.set(x,heightAt(x,z)+size*.55,z);
    dummy.rotation.set(random()*2,random()*6,random()*2);
    dummy.scale.set(size,size*(.55+random()*.4),size);
    dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
    rockColor.setHex(i%3===0?0xbcb8b0:0xe7dfd1);rocks.setColorAt(i,rockColor);
  }
  rocks.castShadow=rocks.receiveShadow=true;
  rocks.instanceMatrix.needsUpdate=true;
  rocks.instanceColor.needsUpdate=true;
  topScene.add(rocks);

  const cap=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({
    vertexColors:true,map:texture,side:THREE.DoubleSide,
  }));
  const lineMaterial=new THREE.MeshBasicMaterial({color:0xd2b688,side:THREE.DoubleSide,
    depthTest:false,depthWrite:false});
  const topLine=new THREE.Mesh(new THREE.PlaneGeometry(312,1.3),lineMaterial);
  topLine.rotation.x=-Math.PI/2;topLine.position.y=2;topLine.renderOrder=20;
  const edge=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({
    color:0xf8edd9,side:THREE.DoubleSide,depthTest:false,depthWrite:false,
  }));
  edge.renderOrder=20;
  topScene.add(topLine);sideScene.add(cap,edge);

  function replaceGeometry(mesh,newGeometry){mesh.geometry.dispose();mesh.geometry=newGeometry;}
  function rebuildSection(){
    cutPlane.constant=state.cut;
    topLine.position.z=state.cut;
    const vertices=[],capColors=[],capUV=[],outline=[];
    const z=state.cut+.08,bottom=-180;
    const colorAt=x=>{
      const n=noise(x*.03+7,state.cut*.03-9);
      return new THREE.Color(0x776e69).lerp(new THREE.Color(0x6c6664),n*.28);
    };
    for(let i=0;i<SEG;i++){
      const x0=-160+i*SIZE/SEG,x1=x0+SIZE/SEG;
      const y0=heightAt(x0,state.cut),y1=heightAt(x1,state.cut);
      vertices.push(x0,y0,z,x0,bottom,z,x1,y1,z,x1,y1,z,x0,bottom,z,x1,bottom,z);
      const u0=(x0+160)/SIZE,u1=(x1+160)/SIZE,v0=(y0+180)/240,v1=(y1+180)/240;
      capUV.push(u0,v0,u0,0,u1,v1,u1,v1,u0,0,u1,0);
      const c0=colorAt(x0),c1=colorAt(x1);
      for(const c of [c0,c0,c1,c1,c0,c1])capColors.push(c.r,c.g,c.b);
      const half=.8,front=z+.06;
      outline.push(x0,y0-half,front,x1,y1-half,front,x1,y1+half,front,
        x0,y0-half,front,x1,y1+half,front,x0,y0+half,front);
    }
    const capGeometry=new THREE.BufferGeometry();
    capGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    capGeometry.setAttribute('color',new THREE.Float32BufferAttribute(capColors,3));
    capGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(capUV,2));
    capGeometry.computeVertexNormals();
    replaceGeometry(cap,capGeometry);
    replaceGeometry(edge,new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(outline,3)));
    requestRender();
  }
  function setCut(value){
    const next=Math.max(-155,Math.min(155,Math.round(value)));
    if(next===state.cut)return;
    state.cut=next;$('cut').value=next;$('cutValue').textContent=next;
    rebuildSection();
  }
  function setAngle(value){
    const next=Math.max(10,Math.min(85,Math.round(value)));
    if(next===state.angle&&topScene.userData.sun.position.length()>0)return;
    state.angle=next;$('angle').value=next;$('angleValue').textContent=next+'°';
    const angle=next*Math.PI/180;
    for(const scene of [topScene,sideScene])scene.userData.sun.position.set(180*Math.cos(angle),180*Math.sin(angle),0);
    requestRender();
  }
  $('cut').addEventListener('input',event=>setCut(Number(event.target.value)));
  $('angle').addEventListener('input',event=>setAngle(Number(event.target.value)));

  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function hitTop(event){
    const box=topCanvas.getBoundingClientRect();
    pointer.set((event.clientX-box.left)/box.width*2-1,1-(event.clientY-box.top)/box.height*2);
    ray.setFromCamera(pointer,topCamera);
    return ray.intersectObject(topMesh,false)[0];
  }
  let topDrag=null,sideDrag=null;
  topCanvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const hit=hitTop(event);
    if(!hit||Math.abs(hit.point.z-state.cut)>10)return;
    topDrag={y:event.clientY,cut:state.cut};
    topCanvas.setPointerCapture(event.pointerId);
  });
  topCanvas.addEventListener('pointermove',event=>{
    if(topDrag)setCut(topDrag.cut+(event.clientY-topDrag.y)*SIZE/topCanvas.clientHeight);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])
    topCanvas.addEventListener(name,()=>{topDrag=null;});
  sideCanvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    sideDrag={x:event.clientX,cut:state.cut};
    sideCanvas.setPointerCapture(event.pointerId);
    sideCanvas.style.cursor='grabbing';
  });
  sideCanvas.addEventListener('pointermove',event=>{
    if(sideDrag)setCut(sideDrag.cut-(event.clientX-sideDrag.x)*SIZE/sideCanvas.clientWidth);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])
    sideCanvas.addEventListener(name,()=>{sideDrag=null;sideCanvas.style.cursor='ew-resize';});

  let pending=false;
  function requestRender(){if(!pending){pending=true;requestAnimationFrame(render);}}
  function fit(renderer,canvas,camera,halfHeight){
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!width||!height)return;
    renderer.setSize(width,height,false);
    const halfWidth=halfHeight*width/height;
    camera.left=-halfWidth;camera.right=halfWidth;
    camera.top=halfHeight;camera.bottom=-halfHeight;
    camera.updateProjectionMatrix();
  }
  function render(){
    pending=false;
    fit(topRenderer,topCanvas,topCamera,160);
    fit(sideRenderer,sideCanvas,sideCamera,150);
    topRenderer.render(topScene,topCamera);
    sideRenderer.render(sideScene,sideCamera);
  }
  new ResizeObserver(requestRender).observe(topCanvas.parentElement);
  new ResizeObserver(requestRender).observe(sideCanvas.parentElement);
  function fitStage(){
    document.documentElement.style.setProperty('--stage-scale',Math.min(innerWidth/1600,innerHeight/900));
    requestRender();
  }
  window.addEventListener('resize',fitStage);
  fitStage();setAngle(35);rebuildSection();
})();

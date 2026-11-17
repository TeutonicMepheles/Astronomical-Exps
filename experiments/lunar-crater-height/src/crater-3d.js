/* 三维地形与剖面交互。../assets/three.reference.local.js 为“陨石坑参考”页面所带 Three.js r152；
   本实验单独保留副本，以便该 HTML 不依赖网络即可运行。 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const topCanvas = $('top'), sideCanvas = $('section');
  const topRenderer = new THREE.WebGLRenderer({ canvas: topCanvas, antialias: true });
  const sideRenderer = new THREE.WebGLRenderer({ canvas: sideCanvas, antialias: true, alpha:true });
  for (const renderer of [topRenderer, sideRenderer]) {
    renderer.setPixelRatio(1);
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Reference terrain is static: recompute shadows only when lighting/cut changes.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
  }
  sideRenderer.setClearColor(0x10203e,0);
  const topScene = new THREE.Scene(), sideScene = new THREE.Scene();
  topScene.background = new THREE.Color(0xdcd6ca);
  for (const scene of [topScene, sideScene]) {
    scene.add(new THREE.HemisphereLight(0xf9f1e7, 0x77716f, 0.72));
    // 固定为原光强调节的最大值（200%）；仅为视觉演示强度。
    const sun = new THREE.DirectionalLight(0xfff4e4, 3.2);
    sun.position.set(180*Math.cos(35*Math.PI/180),180*Math.sin(35*Math.PI/180),0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    // 光源距原点 180，背光侧地形距光源可超过 340；须覆盖整个高度场。
    Object.assign(sun.shadow.camera, { left: -175, right: 175, top: 175, bottom: -175, near: 1, far: 600 });
    sun.shadow.normalBias = 0.09;
    scene.add(sun);
    scene.userData.sun = sun;
  }
  const topCamera = new THREE.OrthographicCamera(-160, 160, 160, -160, 1, 600);
  topCamera.position.set(0, 260, 0);
  topCamera.up.set(0, 0, -1);
  topCamera.lookAt(0, 0, 0);
  const sideCamera = new THREE.OrthographicCamera(-165, 165, 110, -110, 1, 600);
  const view = { measuring: false, cut: 0, angle: 35, outlined: false, radius: 110, points: [], length: null, height: null };
  const clampSolarAngle = angle => Math.max(35,Math.min(70,Math.round(angle)));
  sideCamera.position.set(0, -7, 255);
  sideCamera.lookAt(0, -7, 0);

  // 用户指定参考模型的上表面；沿用原材质与模型单位，不采用 GLB 材质。
  const fract = x => x - Math.floor(x);
  const smooth = (a, b, value) => {
    const t = Math.max(0, Math.min(1, (value-a)/(b-a)));
    return t*t*(3-2*t);
  };
  function noise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    let u = fract(x), v = fract(z);
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
    return (1-v) * ((1-u)*hash(ix,iz)+u*hash(ix+1,iz)) + v*((1-u)*hash(ix,iz+1)+u*hash(ix+1,iz+1));
  }
  function rimRadius(x, z) {
    const a = Math.atan2(z, x);
    return 88 + 10*Math.sin(3*a+1.2)+6*Math.sin(5*a+0.4)+4*Math.cos(2*a-0.8);
  }
  const terrain=window.LunarReferenceTerrain;
  const heightAt=terrain.heightAt;
  const SIZE=terrain.size, SEG=200;
  const geometry=new THREE.PlaneGeometry(SIZE,SIZE,terrain.segments,terrain.segments);
  const positions = geometry.attributes.position, colors = [];
  const fieldColor = new THREE.Color(0xd9d2c7), floorColor = new THREE.Color(0xd8cbbd);
  const outerColor = new THREE.Color(0xc7b7a5);
  const wallColor = new THREE.Color(0xab9684), rimColor = new THREE.Color(0xfff4e3);
  const color = new THREE.Color();
  for (let i=0; i<positions.count; i++) {
    const x=positions.getX(i), z=-positions.getY(i), d=Math.hypot(x,z)-rimRadius(x,z);
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
  positions.needsUpdate = true;
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  // 与标准受光测试页相同的非平铺画布纹理，加载时只生成一次。
  let textureSeed = 0xa34f97c1;
  const random = () => ((textureSeed = (Math.imul(textureSeed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const textureSize = 1024;
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = textureSize;
  const tx = texCanvas.getContext('2d'), tex = tx.createImageData(textureSize, textureSize);
  for (let i=0; i<textureSize*textureSize; i++) {
    const shade=238+Math.floor(random()*12);
    tex.data[4*i]=shade;
    tex.data[4*i+1]=shade-3;
    tex.data[4*i+2]=shade-9;
    tex.data[4*i+3]=255;
  }
  tx.putImageData(tex,0,0);
  for(let i=0;i<280;i++){
    const x=random()*textureSize,y=random()*textureSize,rx=18+random()*100,ry=9+random()*50;
    tx.fillStyle=i%3===0?'rgba(139,118,95,.025)':'rgba(255,251,237,.045)';
    tx.beginPath();tx.ellipse(x,y,rx,ry,random()*Math.PI,0,Math.PI*2);tx.fill();
  }
  for(let i=0;i<13000;i++){
    const x=random()*textureSize,y=random()*textureSize,r=.7+random()*3.2,rotation=random()*Math.PI*2;
    tx.fillStyle=i%4===0?'rgba(255,255,246,.20)':'rgba(126,107,89,.13)';
    tx.beginPath();
    for(let j=0;j<5;j++){
      const a=rotation+j*Math.PI*2/5,radius=r*(.55+random()*.45);
      const px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius;
      if(j===0)tx.moveTo(px,py);else tx.lineTo(px,py);
    }
    tx.closePath();tx.fill();
  }
  tx.fillStyle='rgba(121,106,90,.16)';
  for(let i=0;i<55000;i++)tx.fillRect(random()*textureSize,random()*textureSize,.5+random()*1.5,.5+random()*1.2);
  for(let i=0;i<90;i++){
    const x=30+random()*(textureSize-60),y=30+random()*(textureSize-60);
    const r=i<14?12+random()*13:2+random()*8;
    tx.fillStyle='rgba(125,109,93,.12)';
    tx.beginPath();tx.ellipse(x+1,y+1,r,r*.72,random()*Math.PI,0,Math.PI*2);tx.fill();
    tx.strokeStyle='rgba(255,251,239,.46)';tx.lineWidth=1+random()*2;
    tx.beginPath();tx.arc(x,y,r,Math.PI*.78,Math.PI*1.8);tx.stroke();
  }
  const lunarTexture = new THREE.CanvasTexture(texCanvas);
  lunarTexture.colorSpace = THREE.SRGBColorSpace;
  lunarTexture.anisotropy = 4;
  const base = { color: 0xffffff, vertexColors:true, roughness: 0.95, metalness: 0,
    map: lunarTexture, bumpMap: lunarTexture, bumpScale: 0.006, side: THREE.DoubleSide };
  // The zoomed-out circular lens sees beyond the square source patch. Add one
  // peripheral ring to the overview only; source vertices and section stay intact.
  function overviewApron(source) {
    const steps=terrain.segments,n=steps+1,perimeter=[];
    for(let i=0;i<steps;i++)perimeter.push(i);
    for(let i=0;i<steps;i++)perimeter.push(i*n+steps);
    for(let i=steps;i>0;i--)perimeter.push(steps*n+i);
    for(let i=steps;i>0;i--)perimeter.push(i*n);
    const pos=[],uv=[],colors=[],indices=[],offset=perimeter.length;
    const {position,color,normal}=source.attributes;
    const extent=1.25; // 200 model units > the circular lens radius (~173).
    const mirror=v=>v<0?-v:v>1?2-v:v;
    for(const scale of [1,extent])for(const i of perimeter){
      const x=position.getX(i)*scale,y=position.getY(i)*scale;
      pos.push(x,y,position.getZ(i));
      // Mirror just the outer apron so its texture joins the existing edge continuously.
      uv.push(mirror(.5+x/SIZE),mirror(.5+y/SIZE));
      colors.push(color.getX(i),color.getY(i),color.getZ(i));
    }
    for(let i=0;i<perimeter.length;i++){
      const next=(i+1)%perimeter.length;
      indices.push(i,next,offset+next,i,offset+next,offset+i);
    }
    const result=new THREE.BufferGeometry();
    result.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    result.setIndex(indices);result.computeVertexNormals();
    for(let i=0;i<perimeter.length;i++){
      const vertex=perimeter[i];
      result.attributes.normal.setXYZ(i,normal.getX(vertex),normal.getY(vertex),normal.getZ(vertex));
    }
    return result;
  }
  const topMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial(base));
  const topApron = new THREE.Mesh(overviewApron(geometry),topMesh.material);
  topApron.rotation.x=-Math.PI/2;
  topApron.receiveShadow=true;
  topScene.add(topApron);
  // 保留剖面背后的半块地形，让正面剖切面不会被前景遮住。
  const cutPlane = new THREE.Plane(new THREE.Vector3(0,0,-1), 0);
  const sideMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ ...base, clippingPlanes: [cutPlane], clipShadows: true }));
  for (const mesh of [topMesh, sideMesh]) {
    mesh.rotation.x = -Math.PI/2;
    mesh.castShadow = mesh.receiveShadow = true;
  }
  topScene.add(topMesh); sideScene.add(sideMesh);
  // 少量低面数碎石与测试页使用相同的随机序列和位置，只作为月面外观。
  const rockGeometry=new THREE.IcosahedronGeometry(1,0);
  const rockMaterial=new THREE.MeshStandardMaterial({color:0xe6dfd3,roughness:1,flatShading:true});
  const rocks=new THREE.InstancedMesh(rockGeometry,rockMaterial,42);
  const rockDummy=new THREE.Object3D(),rockColor=new THREE.Color();
  for(let i=0;i<42;i++){
    const x=(random()-.5)*300,z=(random()-.5)*300,size=.9+random()*2.6;
    rockDummy.position.set(x,heightAt(x,z)+size*.55,z);
    rockDummy.rotation.set(random()*2,random()*6,random()*2);
    rockDummy.scale.set(size,size*(.55+random()*.4),size);
    rockDummy.updateMatrix();rocks.setMatrixAt(i,rockDummy.matrix);
    rockColor.setHex(i%3===0?0xbcb8b0:0xe7dfd1);rocks.setColorAt(i,rockColor);
  }
  rocks.castShadow=rocks.receiveShadow=true;
  rocks.instanceMatrix.needsUpdate=true;
  rocks.instanceColor.needsUpdate=true;
  topScene.add(rocks);

  const cap = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors:true, map:lunarTexture, side: THREE.DoubleSide }));
  // 使用实心窄带，避免 WebGL 在部分设备上把线宽固定为 1 像素。
  const referenceMaterial = new THREE.MeshBasicMaterial({color:0xf3cc62,side:THREE.DoubleSide,depthTest:false,depthWrite:false});
  const edge = new THREE.Mesh(new THREE.BufferGeometry(), referenceMaterial);
  edge.renderOrder=20;
  sideScene.add(cap, edge);
  const markers = [0xf2d59a,0xf2d59a].map(color => {
    const material=new THREE.MeshBasicMaterial({color,depthTest:false});
    const sphere=new THREE.SphereGeometry(3.2,16,12);
    const top=new THREE.Mesh(sphere,material),side=new THREE.Mesh(sphere,material);
    top.renderOrder=side.renderOrder=30;topScene.add(top);sideScene.add(side);
    return {top,side};
  });
  const spanMaterial=new THREE.LineBasicMaterial({color:0xf2d59a,depthTest:false});
  const topSpan=new THREE.Line(new THREE.BufferGeometry(),spanMaterial);
  const sideSpan=new THREE.Line(new THREE.BufferGeometry(),spanMaterial);
  topSpan.renderOrder=sideSpan.renderOrder=29;topScene.add(topSpan);sideScene.add(sideSpan);
  function replaceGeometry(mesh, geo) { mesh.geometry.dispose(); mesh.geometry = geo; }
  // 与剖切面深色阴影带共用同一份判定，避免视觉显示与可选区域不一致。
  const sectionShadow=new Uint8Array(SEG);
  function rebuildSection() {
    sideRenderer.shadowMap.needsUpdate=true;
    cutPlane.constant = view.cut;
    const verts = [], outline = [], colors=[],capUV=[];
    const profile=Array.from({length:SEG+1},(_,i)=>heightAt(-160+i*SIZE/SEG,view.cut));
    const slope=Math.tan(view.angle*Math.PI/180);
    const litColor=new THREE.Color(0x776e69),shadowColor=new THREE.Color(0x4c4a51);
    const bottom = -180, z = view.cut + 0.08;
    for (let i=0;i<SEG;i++) {
      const x0 = -160+i*SIZE/SEG, x1=x0+SIZE/SEG;
      const y0=profile[i], y1=profile[i+1];
      const midHeight=(y0+y1)/2;
      let shadow=false;
      for(let j=i+1;j<=SEG;j++){
        if(profile[j]>midHeight+(j-i-0.5)*SIZE/SEG*slope+0.15){shadow=true;break;}
      }
      const color=shadow?shadowColor:litColor;
      sectionShadow[i]=shadow?1:0;
      for(let k=0;k<6;k++)colors.push(color.r,color.g,color.b);
      verts.push(x0,y0,z,x0,bottom,z,x1,y1,z, x1,y1,z,x0,bottom,z,x1,bottom,z);
      const u0=(x0+160)/SIZE,u1=(x1+160)/SIZE,v0=(y0+180)/240,v1=(y1+180)/240;
      capUV.push(u0,v0,u0,0,u1,v1,u1,v1,u0,0,u1,0);
    }
    for(let i=0;i<SEG;i++) {
      const x0=-160+i*SIZE/SEG,x1=x0+SIZE/SEG;
      const y0=heightAt(x0,view.cut)+0.16,y1=heightAt(x1,view.cut)+0.16;
      const dz=z+0.05,half=0.65;
      outline.push(x0,y0-half,dz,x1,y1-half,dz,x1,y1+half,dz,
        x0,y0-half,dz,x1,y1+half,dz,x0,y0+half,dz);
    }
    const geo = new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(capUV,2));geo.computeVertexNormals();replaceGeometry(cap,geo);
    replaceGeometry(edge,new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(outline,3)));
    edge.userData.strokeZoom=0;
    updateMarker();
    requestRender();
  }
  function updateMarker() {
    markers.forEach(({top,side},i)=>{
      const visible=view.measuring && i<view.points.length;
      top.visible=visible;side.visible=false;
      if(visible){const x=view.points[i],y=heightAt(x,view.cut);top.position.set(x,y+.3,view.cut);side.position.set(x,y+.3,view.cut+0.5);}
    });
    sideSpan.visible=view.measuring&&view.points.length===2;
    topSpan.visible=sideSpan.visible;
    if(topSpan.visible){
      replaceGeometry(topSpan,new THREE.BufferGeometry().setFromPoints(view.points.map(x=>new THREE.Vector3(x,40,view.cut))));
      replaceGeometry(sideSpan,new THREE.BufferGeometry().setFromPoints(view.points.map(x=>new THREE.Vector3(x,heightAt(x,view.cut)+.3,view.cut+.5))));
    }
  }
  let rimCandidates=[];
  const measurementAnimation={frame:0,horizontal:0,baseline:0,angle:0,vertical:0,angleShown:false,phase:'idle'};
  function setStep(id){
    const current=['start','measure','height'].indexOf(id);
    for(const [i,el] of [...document.querySelectorAll('.measurement-steps [data-step]')].entries()){
      const done=i<current||(i===2&&view.height!==null);
      el.classList.toggle('active',i===current&&!done);el.classList.toggle('done',done);
      if(i===current)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
    }
    $('start').hidden=view.outlined;
    $('pickGuide').hidden=view.points.length===2;
    $('sectionGuide').hidden=view.points.length!==2;
    $('heightGuide').hidden=false;
    $('pickTitle').textContent=view.outlined?'第二步 · 选择山峰 A':'第一步 · 框出山峰轮廓';
    $('pickInstruction').textContent=view.outlined
      ?rimCandidates.length?'只点亮起的坑缘候选点。系统沿背光方向生成 B 点、连线与影长。':'当前轮廓附近没有明显投影。请降低太阳高度角，或重新调整辅助圆。'
      :'拖动圆上的把手或下方滑条，让辅助圆尽量贴合环形山坑缘，再确认轮廓。';
    $('height').hidden=view.height!==null;
    $('height').disabled=!!measurementAnimation.frame;
    $('height').textContent=measurementAnimation.angleShown?'计算高度差':'标出太阳高度角';
    $('heightTitle').textContent=view.height===null?'第三步 · 计算高度差':'测量完成 ✓';
    $('heightInstruction').textContent=view.height===null?'影长已自动测得。先在 A—B 下方标出太阳高度角，再连出高度差。':'下方为由影长估算的高度差，单位为模型单位。';
    $(view.points.length===2?'rightStatusHost':'pickStatusHost').append($('status'));
    $('cutHint').textContent=view.outlined?'亮点为有明显投影的可选山峰':'调整辅助圆，框出环形山山峰轮廓';
  }
  function cancelMeasurementAnimation(){
    cancelAnimationFrame(measurementAnimation.frame);
    Object.assign(measurementAnimation,{frame:0,horizontal:0,baseline:0,angle:0,vertical:0,angleShown:false,phase:'idle'});
  }
  function clearReadout(){
    document.dispatchEvent(new Event('lunar-measurement-reset'));
    cancelMeasurementAnimation();view.points=[];view.length=null;view.height=null;
    $('lengthLabel').textContent='水平影长 L';
    $('lengthValue').textContent=$('heightValue').textContent='—';$('formula').textContent='';
    setStep(view.outlined?'measure':'start');
  }
  function refreshCandidates(){
    rimCandidates=view.outlined?LunarRimMeasurement.candidates(terrain,view.radius,view.angle):[];
    setStep(view.points.length===2?'height':view.outlined?'measure':'start');
  }
  function setRadius(value){
    const hadSelection=view.points.length>0;
    view.radius=Math.max(70,Math.min(140,Math.round(value)));
    $('rimRadius').value=view.radius;$('rimRadiusValue').textContent=view.radius;
    view.outlined=false;view.measuring=false;rimCandidates=[];clearReadout();updateMarker();
    $('status').textContent='辅助圆已更新，确认轮廓后选择山峰。';
    if(hadSelection)requestRender();else requestBoundaryRender();
  }
  $('rimRadius').addEventListener('input',e=>setRadius(Number(e.target.value)));
  $('start').addEventListener('click',()=>{
    view.outlined=true;view.measuring=true;clearReadout();refreshCandidates();
    $('status').textContent=rimCandidates.length?'请选择亮起的山峰 A，系统会自动找出同一段投影的 B 点。':'暂无可选山峰：请调整辅助圆或降低太阳高度角。';
    requestRender();
  });
  $('clear').addEventListener('click',()=>setRadius(view.radius));
  $('angle').addEventListener('input',e=>{
    view.angle=clampSolarAngle(Number(e.target.value));e.target.value=view.angle;$('angleValue').textContent=view.angle+'°';
    for(const scene of [topScene,sideScene])scene.userData.sun.position.set(180*Math.cos(view.angle*Math.PI/180),180*Math.sin(view.angle*Math.PI/180),0);
    topRenderer.shadowMap.needsUpdate=sideRenderer.shadowMap.needsUpdate=true;
    clearReadout();refreshCandidates();rebuildSection();
    $('status').textContent=view.outlined?(rimCandidates.length?'太阳角度已改变，请重新选择山峰 A。':'当前没有明显投影，请降低太阳高度角或重新框选。'):'太阳角度已更新，请先确认山峰轮廓。';
  });
  function selectCandidate(id){
    if(!view.outlined)return;
    const pair=rimCandidates.find(p=>p.id===id);if(!pair)return;
    clearReadout();view.measuring=true;view.cut=pair.a.z;
    view.points=[pair.a.x,pair.b.x];view.length=pair.length;
    Object.assign(measurementAnimation,{horizontal:1,vertical:0,phase:'horizontal-done'});
    $('lengthValue').textContent=view.length.toFixed(2)+' 模型单位';
    setStep('height');
    $('status').textContent=(pair.side==='left'?'左侧坑缘向坑外投影。':'右侧坑缘向坑内投影。')+'已自动生成 B 点和影长，可继续计算高度差，或改选其他亮点。';
    rebuildSection();
  }
  function updateMeasurementInk(){
    document.querySelectorAll('[data-measure-axis]').forEach(path=>{
      const progress=measurementAnimation[path.dataset.measureAxis];
      path.setAttribute('stroke-dashoffset',String(1-progress));path.style.visibility=progress>0?'visible':'hidden';
    });
    document.querySelectorAll('[data-angle-arc]').forEach(path=>{
      path.setAttribute('stroke-dashoffset',String(1-measurementAnimation.angle));
      path.style.visibility=measurementAnimation.angle>0?'visible':'hidden';
    });
    document.querySelectorAll('[data-angle-fill]').forEach(el=>el.setAttribute('opacity',String(.3*measurementAnimation.angle)));
    document.querySelectorAll('[data-angle-label]').forEach(el=>el.setAttribute('opacity',String(measurementAnimation.angle)));
    sideCanvas.parentElement.dataset.measurePhase=measurementAnimation.phase;
  }
  function animatedLeg(x1,y1,x2,y2,axis,color){
    return `<path data-measure-axis="${axis}" d="M ${x1} ${y1} L ${x2} ${y2}" pathLength="1" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/>`;
  }
  $('height').addEventListener('click',()=>{
    if(view.length===null||measurementAnimation.frame)return;
    if(!measurementAnimation.angleShown){
      measurementAnimation.angleShown=true;measurementAnimation.phase='angle';
      measurementAnimation.baseline=measurementAnimation.angle=0;
      setStep('height');$('height').disabled=true;
      $('status').textContent='先画下方水平辅助线，再标出 B 点处的太阳高度角。';
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      let previous=null,elapsed=0;
      const tick=now=>{
        // Keep the teaching steps visible even when an initial GPU frame is slow.
        if(previous!==null)elapsed+=Math.min(80,Math.max(0,now-previous));
        previous=now;
        if(reduced)elapsed=1000;
        measurementAnimation.baseline=Math.min(1,elapsed/400);
        measurementAnimation.angle=Math.max(0,Math.min(1,(elapsed-400)/600));
        if(elapsed>=1000){
          measurementAnimation.frame=0;measurementAnimation.phase='angle-done';setStep('height');
          $('status').textContent='太阳高度角已标出。点击“计算高度差”，从下方直角点连接至 A。';
        }else measurementAnimation.frame=requestAnimationFrame(tick);
        updateMeasurementInk();
      };
      requestRender();measurementAnimation.frame=requestAnimationFrame(tick);return;
    }
    measurementAnimation.phase='vertical';measurementAnimation.vertical=0;
    $('height').disabled=true;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,started=performance.now();
    const tick=now=>{
      measurementAnimation.vertical=reduced?1:Math.min(1,(now-started)/900);
      if(measurementAnimation.vertical===1){
        measurementAnimation.frame=0;measurementAnimation.phase='done';
        view.height=view.length*Math.tan(view.angle*Math.PI/180);
        $('heightValue').textContent=view.height.toFixed(2)+' 模型单位';
        $('formula').textContent=`Δh = L × tan(${view.angle}°) · 由所选影长估算`;
        setStep('height');$('status').textContent='测量完成。可改选山峰，或重新框选轮廓。';requestRender();
      }else measurementAnimation.frame=requestAnimationFrame(tick);
      updateMeasurementInk();
    };
    requestRender();measurementAnimation.frame=requestAnimationFrame(tick);
  });
  function angleAnnotation(b){
    if(!measurementAnimation.angleShown)return '';
    const a=view.angle*Math.PI/180,r=48;
    const x=b.x+r*Math.cos(a),y=b.y-r*Math.sin(a);
    const arc=`M ${b.x+r} ${b.y} A ${r} ${r} 0 0 0 ${x} ${y}`;
    const labelX=b.x+108*Math.cos(a/2),labelY=b.y-108*Math.sin(a/2);
    return `<g data-solar-angle><path data-angle-fill d="M ${b.x} ${b.y} L ${b.x+r} ${b.y} A ${r} ${r} 0 0 0 ${x} ${y} Z" fill="#ffd97d" opacity="0"/><path data-angle-arc d="${arc}" pathLength="1" fill="none" stroke="#172a38" stroke-width="8" stroke-dasharray="1" stroke-dashoffset="1"/><path data-angle-arc d="${arc}" pathLength="1" fill="none" stroke="#ffe39b" stroke-width="4" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/><g data-angle-label opacity="0"><text x="${labelX}" y="${labelY+7}" text-anchor="middle" fill="#fff0c4" font-size="22" font-weight="600">α = ${view.angle}°</text></g></g>`;
  }
  // Only explicit rim handles/candidates accept input; terrain and section are read-only.
  const boundaryLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');
  boundaryLayer.id='lunarBoundaryPicker';
  boundaryLayer.style.cssText='position:absolute;inset:0;z-index:3;width:100%;height:100%;pointer-events:none;touch-action:none;clip-path:circle(320px at 50% 50%)';
  topCanvas.after(boundaryLayer);
  let boundaryFrame=0,rimDrag=false;
  function requestBoundaryRender(){
    if(!boundaryFrame)boundaryFrame=requestAnimationFrame(()=>{boundaryFrame=0;drawBoundaries();updateMeasurementInk();});
  }
  boundaryLayer.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.target.closest('[data-rim-handle]')||view.outlined)return;
    rimDrag=true;boundaryLayer.setPointerCapture(e.pointerId);e.preventDefault();
  });
  boundaryLayer.addEventListener('pointermove',e=>{
    if(!rimDrag)return;
    const rect=boundaryLayer.getBoundingClientRect();
    const distance=Math.hypot(e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2);
    setRadius(distance*(topCamera.right-topCamera.left)/topCamera.zoom/rect.width);
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])boundaryLayer.addEventListener(event,()=>{rimDrag=false;});
  boundaryLayer.addEventListener('click',e=>{
    const target=e.target.closest('[data-rim-candidate]');
    if(target)selectCandidate(Number(target.dataset.rimCandidate));
  });
  boundaryLayer.addEventListener('keydown',e=>{
    const candidate=e.target.closest('[data-rim-candidate]');
    if(candidate&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectCandidate(Number(candidate.dataset.rimCandidate));}
    if(e.target.closest('[data-rim-handle]')&&!view.outlined&&['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'].includes(e.key)){
      e.preventDefault();setRadius(view.radius+(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1));
      requestAnimationFrame(()=>boundaryLayer.querySelector('[data-rim-handle]')?.focus());
    }
  });

  function drawBoundaries(){
    const w=topCanvas.clientWidth,h=topCanvas.clientHeight;
    boundaryLayer.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const cutPoint=new THREE.Vector3(0,0,view.cut).project(topCamera);
    const cutY=(1-cutPoint.y)*h/2;
    const project=(x,z)=>{
      const p=new THREE.Vector3(x,0,z).project(topCamera);
      return {x:(p.x+1)*w/2,y:(1-p.y)*h/2};
    };
    const center=project(0,0),radius=Math.abs(project(view.radius,0).x-center.x);
    let rim=`<circle data-rim-circle cx="${center.x}" cy="${center.y}" r="${radius}" fill="none" stroke="#182c39" stroke-width="5" opacity=".55"/><circle cx="${center.x}" cy="${center.y}" r="${radius}" fill="none" stroke="#f3d79b" stroke-width="2.5" stroke-dasharray="8 6"/>`;
    if(!view.outlined){
      for(const [x,z] of [[view.radius,0],[0,view.radius],[-view.radius,0],[0,-view.radius]]){
        const p=project(x,z);
        rim+=`<g data-rim-handle role="slider" tabindex="0" aria-label="调整辅助圆大小" aria-valuemin="70" aria-valuemax="140" aria-valuenow="${view.radius}" transform="translate(${p.x},${p.y})" style="pointer-events:all;cursor:nwse-resize"><circle r="20" fill="transparent"/><circle r="10" fill="#263f4d" stroke="#f3d79b" stroke-width="2.5"/><path d="M -4 0 H 4 M 0 -4 V 4" stroke="#fff0ce" stroke-width="2"/></g>`;
      }
    }else for(const pair of rimCandidates){
      const p=project(pair.a.x,pair.a.z),selected=view.points.length===2&&view.points[0]===pair.a.x&&view.cut===pair.a.z;
      rim+=`<g class="rim-candidate" data-rim-candidate="${pair.id}" data-side="${pair.side}" data-selected="${selected}" role="button" tabindex="0" aria-label="选择${pair.side==='left'?'左':'右'}侧山峰 A" transform="translate(${p.x},${p.y})" style="pointer-events:all;cursor:pointer"><circle r="${selected?7:12}" fill="#142b38" stroke="#f3d79b" stroke-width="1.5"/><circle class="rim-dot" r="5" fill="#f3d79b"/></g>`;
    }
    const cutGuide=`<line data-cut-guide x1="0" x2="${w}" y1="${cutY}" y2="${cutY}" stroke="#d6e9ef" stroke-width="3.5" stroke-dasharray="9 7" opacity=".85"/>`;
    let readouts='';
    if(view.points.length===2&&measurementAnimation.phase!=='idle'){
      const projected=view.points.map(x=>new THREE.Vector3(x,0,view.cut).project(topCamera));
      const ax=(projected[0].x+1)*w/2,bx=(projected[1].x+1)*w/2,mid=Math.max(w/2-120,Math.min(w/2+120,(ax+bx)/2));
      const text=(kind,y,value,color)=>`<text data-top-readout="${kind}" x="${mid}" y="${y}" text-anchor="middle" fill="${color}" stroke="#101d2a" stroke-width="5" paint-order="stroke" font-size="20" font-weight="500">${value}</text>`;
      readouts=animatedLeg(ax,cutY,bx,cutY,'horizontal','#f2d59a');
      if(view.length!==null)readouts+=text('length',cutY-38,`影长 L = ${view.length.toFixed(2)} 模型单位`,'#f2e1bd');
      if(view.height!==null)readouts+=text('height',cutY+48,`高度差 Δh = ${view.height.toFixed(2)} 模型单位`,'#a9d8df');
    }
    boundaryLayer.innerHTML=rim+(view.points.length===2?cutGuide:'')+readouts+(view.measuring?view.points.map((x,i)=>{
      const p=new THREE.Vector3(x,heightAt(x,view.cut),view.cut).project(topCamera);
      const cx=(p.x+1)*w/2,cy=(1-p.y)*h/2;
      return `<g class="lunar-picked-point" data-point="${i}" data-model-x="${x}" data-model-y="${heightAt(x,view.cut)}" data-model-z="${view.cut}" transform="translate(${cx},${cy})"><circle r="7" fill="#152735" stroke="#f2d59a" stroke-width="1.8"/><circle r="3" fill="${i===0?'#fff4d4':'#a9d8df'}"/><text y="-20" text-anchor="middle" fill="#f2e1bd" stroke="#101d2a" stroke-width="4" paint-order="stroke" font-size="14">${i===0?'A':'B'}</text></g>`;    }).join(''):'');
  }
  // 光线的天空部分接收拖动，地形区域仍用于选点与剖切。
  // 光线独立置于透明 WebGL 月面之后；测量标注与命中区仍在前景。
  const rayLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');
  rayLayer.id='lunarSunRays';
  rayLayer.setAttribute('aria-hidden','true');
  rayLayer.style.cssText='position:absolute;z-index:1;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden';
  sideCanvas.before(rayLayer);
  sideCanvas.style.zIndex='2';
  const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  overlay.id='sunOverlay';
  overlay.style.cssText='position:absolute;z-index:3;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;touch-action:none';
  sideCanvas.after(overlay);
  let rayDrag=null;
  function pointerAngle(event){
    const rect=overlay.getBoundingClientRect();
    const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
    return Math.atan2(y-event.clientY,event.clientX-x)*180/Math.PI;
  }
  overlay.addEventListener('pointerdown',event=>{
    if(!view.measuring||event.button!==0||!event.target.closest('[data-ray-drag]'))return;
    rayDrag={pointerAngle:pointerAngle(event),angle:view.angle};
    overlay.setPointerCapture(event.pointerId);event.preventDefault();
  });
  overlay.addEventListener('pointermove',event=>{
    if(!rayDrag)return;
    const delta=pointerAngle(event)-rayDrag.pointerAngle;
    const wrappedDelta=((delta+540)%360)-180;
    $('angle').value=clampSolarAngle(rayDrag.angle+wrappedDelta);
    $('angle').dispatchEvent(new Event('input'));
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])overlay.addEventListener(event,()=>{rayDrag=null;});
  function drawAnnotations(){
    const w=sideCanvas.clientWidth,h=sideCanvas.clientHeight;
    overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);
    rayLayer.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const a=view.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const projectPlane=(x,y)=>{const p=new THREE.Vector3(x,y,view.cut).project(sideCamera);return {x:(p.x+1)*w/2,y:(1-p.y)*h/2};};
    const seg=(x1,y1,x2,y2,color,width=1.5,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
    const origin=projectPlane(0,0),sunward=projectPlane(c,s);
    const magnitude=Math.hypot(sunward.x-origin.x,sunward.y-origin.y);
    const dx=(origin.x-sunward.x)/magnitude,dy=(origin.y-sunward.y)/magnitude;
    const nx=-dy,ny=dx;
    const centerOffset=(w*nx+h*ny)/2;
    const offsets=[0,w*nx,h*ny,w*nx+h*ny].map(offset=>offset-centerOffset);
    let rays='',hitRays='',gradients='';
    // 以屏幕法向等距排列，逐条裁到视口边界，覆盖不同太阳角度下的整个视图。
    for(let offset=Math.ceil(Math.min(...offsets)/32)*32,index=0;offset<Math.max(...offsets);offset+=32,index++){
      const px=w/2+nx*offset,py=h/2+ny*offset;
      let entry=-Infinity,exit=Infinity;
      for(const [position,direction,limit] of [[px,dx,w],[py,dy,h]]){
        if(Math.abs(direction)<1e-8){if(position<0||position>limit){entry=1;exit=0;}continue;}
        const t0=-position/direction,t1=(limit-position)/direction;
        entry=Math.max(entry,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));
      }
      if(exit<=entry)continue;
      const from={x:px+dx*entry,y:py+dy*entry},to={x:px+dx*exit,y:py+dy*exit};
      const near=Math.exp(-Math.pow(offset/300,2));
      const alpha=.09+.17*near,id=`lunarRayGradient${index}`;
      // 视觉参考日月食 drawRays（01ee4f4）：淡金色、入射端渐显及细线层次；独立实现，无跨实验依赖。
      gradients+=`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"><stop offset="0" stop-color="#fadcaa" stop-opacity="0"/><stop offset=".10" stop-color="#fadcaa" stop-opacity="${alpha*.55}"/><stop offset=".72" stop-color="#fce2b2" stop-opacity="${alpha}"/><stop offset="1" stop-color="#ffecc4" stop-opacity="${alpha*1.25}"/></linearGradient>`;
      rays+=seg(from.x,from.y,to.x,to.y,`url(#${id})`,near>.55?1.9:1.2);
      hitRays+=seg(from.x,from.y,to.x,to.y,'transparent',18);
    }
    rayLayer.innerHTML=`<defs>${gradients}</defs>${rays}`;
    if(!view.measuring){overlay.innerHTML='';return;}
    let measurement='';
    if(view.points.length===2){
      const [x0,x1]=view.points,p=projectPlane(x0,heightAt(x0,view.cut)),q=projectPlane(x1,heightAt(x1,view.cut));
      const mid=(p.x+q.x)/2,base=q.y;
      // 放大框出现时，数值移入步骤区下方的天空，避免落在放大框背后。
      const enlarged=!$('lunarCloseup').hidden;
      const labelX=enlarged?44:mid,labelY=enlarged?280:base+24,labelAnchor=enlarged?'start':'middle';
      measurement=`<g id="lunarHeightTriangle">${seg(p.x,p.y,q.x,q.y,'#ffe18a',1.4,'5 5')}${animatedLeg(q.x,base,p.x,base,'baseline','#f2d59a')}${animatedLeg(p.x,base,p.x,p.y,'vertical','#a9d8df')}<text x="${p.x-10}" y="${p.y-12}" fill="#fff0d5" font-size="14">A</text><text x="${q.x+10}" y="${q.y-12}" fill="#fff0d5" font-size="14">B</text></g>`;
      measurement+=angleAnnotation(q)+`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff0c9"/><circle cx="${q.x}" cy="${q.y}" r="4" fill="#fff0c9"/>`;
      if(view.height!==null)measurement+=`<text data-measure-label="length" x="${labelX}" y="${labelY}" text-anchor="${labelAnchor}" fill="#f2e1bd" stroke="#102330" stroke-width="4" paint-order="stroke" font-size="14">水平影长 L = ${view.length.toFixed(2)}</text>`;
      if(view.height!==null)measurement+=`<text data-measure-label="height" x="${labelX}" y="${labelY+24}" text-anchor="${labelAnchor}" fill="#a9d8df" stroke="#102330" stroke-width="4" paint-order="stroke" font-size="14">测量估算 Δh = ${view.height.toFixed(2)}</text>`;
    }
    // 仅天空内设置较宽的拖动命中区，避免光线挡住地形选点。
    const visibleProfile=Array.from({length:SEG+1},(_,i)=>{
      const x=-160+i*SIZE/SEG;return projectPlane(x,heightAt(x,view.cut));
    }).filter(p=>p.x>=0&&p.x<=w);
    const skyBottom=Math.max(0,Math.min(h,...visibleProfile.map(p=>p.y))-8);
    overlay.innerHTML=`${measurement}<defs><clipPath id="rayDragSky"><rect width="${w}" height="${skyBottom}"/></clipPath></defs><g data-ray-drag="true" aria-label="拖动光线调整太阳高度角" style="pointer-events:stroke;cursor:grab" clip-path="url(#rayDragSky)">${hitRays}</g>`;
  }
  let pending=false;
  // 复用剖面渲染器，以局部相机重新光栅化；不放大主视图已有像素。
  const closeupCanvas=$('closeupCanvas'),closeupContext=closeupCanvas.getContext('2d');
  const closeupCamera=sideCamera.clone();
  function drawCloseup(){
    const panel=$('lunarCloseup');
    const project=x=>{const p=new THREE.Vector3(x,heightAt(x,view.cut),view.cut).project(sideCamera);return {x:(p.x+1)*sideCanvas.clientWidth/2,y:(1-p.y)*sideCanvas.clientHeight/2};};
    const projected=view.points.map(project);
    const displayScale=sideCanvas.getBoundingClientRect().width/sideCanvas.clientWidth;
    const span=projected.length===2?Math.abs(projected[1].x-projected[0].x)*displayScale:0;
    panel.hidden=!view.measuring||view.points.length!==2||measurementAnimation.phase!=='idle'||span>=120;
    panel.dataset.sourceSpan=span.toFixed(1);
    if(panel.hidden){$('closeupOverlay').innerHTML='';return;}
    const w=closeupCanvas.clientWidth,h=closeupCanvas.clientHeight;
    const screenRatio=closeupCanvas.getBoundingClientRect().width/w*(devicePixelRatio||1);
    const bw=Math.max(1,Math.round(w*screenRatio)),bh=Math.max(1,Math.round(h*screenRatio));
    if(closeupCanvas.width!==bw||closeupCanvas.height!==bh){closeupCanvas.width=bw;closeupCanvas.height=bh;}
    const [a,b]=projected;
    const zoom=Math.min(12,(w-100)/Math.max(1,Math.abs(a.x-b.x)),(h-90)/Math.max(1,Math.abs(a.y-b.y)));
    if(zoom<=1.15){panel.hidden=true;$('closeupOverlay').innerHTML='';return;}
    const centerX=(a.x+b.x)/2,centerY=(a.y+b.y)/2;
    const cropW=w/zoom,cropH=h/zoom,cropX=centerX-cropW/2,cropY=centerY-cropH/2;
    closeupCamera.copy(sideCamera);
    closeupCamera.setViewOffset(sideCanvas.clientWidth,sideCanvas.clientHeight,cropX,cropY,cropW,cropH);
    // 三维参考带会随局部相机放大；放大框改用固定屏幕线宽描边。
    const edgeVisible=edge.visible;
    edge.visible=false;
    try{sideRenderer.render(sideScene,closeupCamera);}finally{edge.visible=edgeVisible;}
    closeupContext.clearRect(0,0,bw,bh);
    closeupContext.drawImage(sideCanvas,0,0,sideCanvas.width,sideCanvas.height,0,0,bw,bh);
    closeupContext.save();
    closeupContext.scale(bw/w,bh/h);
    closeupContext.beginPath();
    for(let i=0;i<=SEG;i++){
      const point=project(-SIZE/2+i*SIZE/SEG);
      const x=(point.x-cropX)*zoom,y=(point.y-cropY)*zoom;
      if(i===0)closeupContext.moveTo(x,y);else closeupContext.lineTo(x,y);
    }
    closeupContext.strokeStyle='#f3cc62';closeupContext.lineWidth=1.25;
    closeupContext.lineJoin='round';closeupContext.stroke();
    closeupContext.restore();
    const p={x:(a.x-cropX)*zoom,y:(a.y-cropY)*zoom},q={x:(b.x-cropX)*zoom,y:(b.y-cropY)*zoom};
    const mid=(p.x+q.x)/2,base=q.y;
    const label=(x,y,text,color='#fff0c9')=>`<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" stroke="#132735" stroke-width="4" paint-order="stroke" font-size="15" font-weight="600">${text}</text>`;
    $('closeupOverlay').setAttribute('viewBox',`0 0 ${w} ${h}`);
    $('closeupOverlay').innerHTML=`<path d="M ${p.x} ${p.y} L ${q.x} ${q.y}" stroke="#f2d59a" stroke-width="1.5" stroke-dasharray="5 4" fill="none"/>${animatedLeg(q.x,base,p.x,base,'baseline','#f2d59a')}${animatedLeg(p.x,base,p.x,p.y,'vertical','#a9d8df')}<circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff0c9"/><circle cx="${q.x}" cy="${q.y}" r="5" fill="#fff0c9"/>${label(p.x,p.y-12,'A')}${label(q.x,q.y-12,'B')}${angleAnnotation(q)}${view.height===null?'':label(mid,Math.min(h-8,base+20),`L = ${view.length.toFixed(2)} 模型单位`)}`;
    $('closeupScale').textContent=`${zoom.toFixed(1)}× · 跟随 A / B`;
    $('closeupCaption').textContent=view.height===null?'先连线，再标出太阳高度角，最后计算高度差。':`按所选影长估算 Δh = ${view.height.toFixed(2)} 模型单位 · 太阳高度角 ${view.angle}°`;
  }
  function requestRender() { if(!pending){pending=true;requestAnimationFrame(render);} }
  function fit(renderer,canvas,camera,halfHeight) {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    // CSS 舞台可能放大至 1920/4K；绘图缓冲匹配屏幕物理像素，避免低分辨率画布被拉大。
    const displayScale=canvas.getBoundingClientRect().width/w;
    const pixelRatio=(devicePixelRatio||1)*displayScale;
    if(Math.abs(renderer.getPixelRatio()-pixelRatio)>0.001)renderer.setPixelRatio(pixelRatio);
    if(canvas.width!==Math.floor(w*pixelRatio)||canvas.height!==Math.floor(h*pixelRatio))renderer.setSize(w,h,false);
    const ratio=w/h;
    // 月面宽度为 320：宽画布按宽度取景，避免在模型两侧露出背景。
    halfHeight=Math.min(halfHeight,160/ratio);
    camera.left=-halfHeight*ratio;camera.right=halfHeight*ratio;
    camera.top=halfHeight;camera.bottom=-halfHeight;
    camera.updateProjectionMatrix();
  }
  function render() {
    pending=false;
    if(boundaryFrame){cancelAnimationFrame(boundaryFrame);boundaryFrame=0;}
    fit(topRenderer,topCanvas,topCamera,160);
    fit(sideRenderer,sideCanvas,sideCamera,165);
    const focused=view.points.length===2&&measurementAnimation.phase!=='idle';
    // 拉远左侧取景，为圆形观察窗中的坑缘及左侧投影留白；测量聚焦只作用于右侧剖面。
    topCamera.zoom=.66;
    topCamera.position.set(0,260,0);
    topCamera.lookAt(0,0,0);
    topCamera.updateProjectionMatrix();topCamera.updateMatrixWorld();
    topCanvas.dataset.measureZoom=topCamera.zoom.toFixed(2);
    let centerX=0,centerY=-7;
    sideCamera.zoom=1;
    if(focused){
      const [a,b]=view.points,ha=heightAt(a,view.cut),hb=heightAt(b,view.cut);
      sideCamera.zoom=Math.min(8,Math.max(1,Math.min((sideCamera.right-sideCamera.left)*.65/Math.abs(b-a),(sideCamera.top-sideCamera.bottom)*.4/Math.max(6,Math.abs(hb-ha)))));
      centerX=(a+b)/2;
      // 线段中心落在右侧视口约 58% 高度处，给上方步骤区和下方结果区留位。
      centerY=(ha+hb)/2+.08*(sideCamera.top-sideCamera.bottom)/sideCamera.zoom;
    }
    sideCamera.position.set(centerX,centerY,255);sideCamera.lookAt(centerX,centerY,0);
    sideCamera.updateProjectionMatrix();sideCamera.updateMatrixWorld();
    sideCanvas.dataset.measureZoom=sideCamera.zoom.toFixed(2);
    // Keep the section contour legible when short outer-rim shadows are magnified.
    if(edge.userData.strokeZoom!==sideCamera.zoom){
      const positions=edge.geometry.attributes.position,sign=[-1,-1,1,-1,1,1];
      for(let i=0;i<positions.count;i++)positions.setY(i,heightAt(positions.getX(i),view.cut)+.16+sign[i%6]*.65/sideCamera.zoom);
      positions.needsUpdate=true;edge.userData.strokeZoom=sideCamera.zoom;
    }
    $('cutHint').hidden=false;
    topRenderer.render(topScene,topCamera);
    drawCloseup();
    // 局部帧复制后恢复主视图，保证屏幕与后续命中使用原剖面相机。
    sideRenderer.render(sideScene,sideCamera);
    drawBoundaries();
    drawAnnotations();
    updateMeasurementInk();

  }
  new ResizeObserver(requestRender).observe(topCanvas.parentElement);
  new ResizeObserver(requestRender).observe(sideCanvas.parentElement);
  function fitStage(){
    document.documentElement.style.setProperty('--stage-scale',Math.min(innerWidth/1600,innerHeight/900));
    requestRender();
  }
  window.addEventListener('resize',fitStage);
  setStep('start');fitStage();rebuildSection();requestRender();
})();

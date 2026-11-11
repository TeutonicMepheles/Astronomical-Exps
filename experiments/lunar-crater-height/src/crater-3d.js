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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
  }
  sideRenderer.setClearColor(0x10203e,0);
  const topScene = new THREE.Scene(), sideScene = new THREE.Scene();
  topScene.background = new THREE.Color(0xdcd6ca);
  for (const scene of [topScene, sideScene]) {
    scene.add(new THREE.HemisphereLight(0xf9f1e7, 0x77716f, 0.72));
    const sun = new THREE.DirectionalLight(0xfff4e4, 1.6);
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
  const view = { measuring: false, cut: 0, angle: 35, points: [], length: null, height: null };
  sideCamera.position.set(0, -7, 255);
  sideCamera.lookAt(0, -7, 0);

  // 与标准受光测试页共用的演示高度场；测量长度仍以模型单位表示。
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
  function heightAt(x, z) {
    const r = Math.hypot(x, z), a = Math.atan2(z, x), radius = rimRadius(x,z);
    const rim = 28 * Math.exp(-Math.pow((r-radius)/14, 2));
    const bowl = -27 * Math.exp(-Math.pow(r/(radius*0.70), 4));
    const peak = 13 * Math.exp(-Math.pow(r/18, 2));
    const reliefFade = 1 - 0.8*smooth(radius+12,radius+65,r);
    const ripples = ((noise(x*0.18,z*0.18)-0.5)*3.5 + (noise(x*0.65+20,z*0.65)-0.5)*0.8)*reliefFade;
    const wall = 3*Math.sin(a*9+0.3)*Math.exp(-Math.pow((r-radius*0.73)/18, 2));
    return rim + bowl + peak + wall + ripples;
  }
  const SIZE = 320, SEG = 200;
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
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
  const topMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial(base));
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
  function setStep(id){
    const steps=['start','measure','height'],current=steps.indexOf(id);
    for(const [index,element] of [...document.querySelectorAll('.measurement-steps [data-step]')].entries()){
      const done=index<current||(index===2&&view.height!==null);
      element.classList.toggle('active',index===current&&!done);element.classList.toggle('done',done);
      if(index===current)element.setAttribute('aria-current','step');else element.removeAttribute('aria-current');
    }
    $('start').hidden=view.measuring;
    $('pickTitle').textContent=current===0?'第一步 · 选取两点':'选点完成 ✓';
    $('pickInstruction').textContent=current>0?'A、B 已同步到右侧。若需更换，点击“重新选点”或从阴影边界开始一组新选点。':!view.measuring?'先调整剖切位置与太阳高度角，再开始选点。':view.points.length===1?'已选 A 点。沿同一条剖切线，选择同一段阴影的另一端。':'在左侧点击阴影的开始边界，再选择同一段阴影的结束边界。';
    $('pickInstruction').classList.toggle('completed-note',current>0);
    $('pickGuide').hidden=current!==0;
    $('sectionGuide').hidden=current===0;$('measureGuide').hidden=current!==1;$('heightGuide').hidden=current!==2;
    $('height').hidden=view.height!==null;
    $('height').textContent=measurementAnimation.angleShown?'计算高度差':'标出太阳高度角';
    $('heightTitle').textContent=view.height===null?'第三步 · 太阳高度角与高度差':'测量完成 ✓';
    $('heightInstruction').textContent=view.height===null?'用已测影长与太阳高度角计算 Δh = L × tan(α)。':'下方显示由所选影长估算的高度差；这不是直接读取的地形真实高差。';
    $(current===0?'pickStatusHost':'rightStatusHost').append($('status'));
  }
  function clearReadout() {
    cancelMeasurementAnimation();
    view.length=null;view.height=null;
    setStep('start');
    $('lengthLabel').textContent='影长 L';
    $('lengthValue').textContent='—';$('heightValue').textContent='—';$('formula').textContent='';
  }
  function isInSectionShadow(x,cut=view.cut){
    if(!Number.isFinite(x)||x<-SIZE/2||x>=SIZE/2)return false;
    const i=Math.floor((x+SIZE/2)*SEG/SIZE);
    if(cut===view.cut)return sectionShadow[i]===1;
    // 首次点选可选择新剖面；在改变已有状态前用相同的面片判定验证。
    const x0=-SIZE/2+i*SIZE/SEG,x1=x0+SIZE/SEG;
    const midHeight=(heightAt(x0,cut)+heightAt(x1,cut))/2;
    const slope=Math.tan(view.angle*Math.PI/180);
    for(let j=i+1;j<=SEG;j++){
      if(heightAt(-SIZE/2+j*SIZE/SEG,cut)>midHeight+(j-i-.5)*SIZE/SEG*slope+.15)return true;
    }
    return false;
  }
  function rejectLitPoint(){
    $('status').textContent='只能选择同一段阴影的开始点和结束点，请点击阴影边界。';
  }
  function shadowRanges(cut=view.cut){
    const ranges=[];let start=null;
    for(let i=0;i<=SEG;i++){
      const x=-SIZE/2+i*SIZE/SEG;
      const shaded=i<SEG&&(cut===view.cut?sectionShadow[i]===1:isInSectionShadow(x+SIZE/SEG/2,cut));
      if(shaded&&start===null)start=x;
      if(!shaded&&start!==null){
        if(start>-SIZE/2&&i<SEG)ranges.push([start,x]);
        start=null;
      }
    }
    return ranges;
  }
  function boundaryHit(x,cut=view.cut){
    const tolerance=10*(topCamera.right-topCamera.left)/topCanvas.clientWidth;
    const ranges=shadowRanges(cut).filter(pair=>view.points.length!==1||pair.includes(view.points[0]));
    let best=null;
    for(const pair of ranges)for(const point of pair){
      const distance=Math.abs(x-point);
      if(distance<=tolerance&&(!best||distance<best.distance))best={point,distance};
    }
    return best;
  }
  function setPin(x) {
    const candidate=boundaryHit(x);
    if(!candidate){rejectLitPoint();return;}
    x=candidate.point;
    if(view.points.length===2)view.points=[];
    if(view.points.length&&Math.abs(view.points[0]-x)<.5){
      $('status').textContent='请选择与第一点不同的位置。';return;
    }
    view.points.push(x);
    clearReadout();updateMarker();requestRender();
    if(view.points.length===2){
      view.points.sort((a,b)=>a-b);updateMarker();setStep('measure');
      $('status').textContent='两端点已选好，点击“测量影长”绘制水平连线。';
    }
    else $('status').textContent='已选中阴影一端，请选择同一段阴影的另一端。';
  }
  function setCut(v) {
    const next=Math.max(-155,Math.min(155,Math.round(v)));
    if(next===view.cut)return;
    view.cut=next;
    $('cut').value=view.cut;$('cutValue').textContent=view.cut;
    view.points=[];clearReadout();rebuildSection();
    $('status').textContent=view.measuring?'剖切面已更新，请重新选取两点。':'剖切面已更新，可开始测量。';
  }
  $('cut').addEventListener('input',e=>setCut(Number(e.target.value)));
  $('intensity').addEventListener('input',e=>{
    const percent=Number(e.target.value);
    $('intensityValue').textContent=percent+'%';
    // 相对视觉强度，100% 保持原有 1.6；不表示真实辐照度，也不改变几何测量。
    for(const scene of [topScene,sideScene])scene.userData.sun.intensity=1.6*percent/100;
    requestRender();
  });
  $('angle').addEventListener('input',e=>{
    view.angle=Number(e.target.value);$('angleValue').textContent=view.angle+'°';
    // 光源始终位于剖面的 X/Y 平面内：俯视从正右方入射，高度角仅改变仰角。
    for(const scene of [topScene,sideScene]) scene.userData.sun.position.set(180*Math.cos(view.angle*Math.PI/180),180*Math.sin(view.angle*Math.PI/180),0);
    clearReadout();
    view.points=[];
    $('status').textContent='太阳角度已改变，请重新选择阴影两端。';
    rebuildSection();
  });
  $('start').addEventListener('click',()=>{
    view.measuring=true;view.points=[];clearReadout();rebuildSection();
    setStep('start');
    $('status').textContent='在左侧俯视图点击阴影的起止边界。';
  });
  $('clear').addEventListener('click',()=>{view.points=[];clearReadout();updateMarker();requestRender();$('status').textContent='已清除选点。';});
  const measurementAnimation={frame:0,horizontal:0,vertical:0,angleShown:false,phase:'idle'};
  function cancelMeasurementAnimation(){
    if(measurementAnimation.frame)cancelAnimationFrame(measurementAnimation.frame);
    Object.assign(measurementAnimation,{frame:0,horizontal:0,vertical:0,angleShown:false,phase:'idle'});
    $('measure').disabled=$('height').disabled=false;
  }
  function updateMeasurementInk(){
    document.querySelectorAll('[data-measure-axis]').forEach(path=>{
      const progress=measurementAnimation[path.dataset.measureAxis];
      path.setAttribute('stroke-dashoffset',String(1-progress));
      path.style.visibility=progress>0?'visible':'hidden';
    });
    sideCanvas.parentElement.dataset.measurePhase=measurementAnimation.phase;
  }
  function animatedLeg(x1,y1,x2,y2,axis,color){
    return `<path data-measure-axis="${axis}" d="M ${x1} ${y1} L ${x2} ${y2}" pathLength="1" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/>`;
  }
  function startMeasurementAnimation(axis){
    if(!view.measuring||view.points.length!==2||measurementAnimation.frame)return;
    if(axis==='vertical'&&view.length===null)return;
    measurementAnimation.phase=axis;measurementAnimation[axis]=0;
    if(axis==='horizontal'){
      view.length=null;view.height=null;measurementAnimation.vertical=0;
      $('lengthValue').textContent=$('heightValue').textContent='—';$('formula').textContent='';
      setStep('measure');
    }
    $('measure').disabled=$('height').disabled=true;
    $('status').textContent=axis==='horizontal'?'正在连接水平影长线…':'正在连接垂直高度差线…';
    const started=performance.now(),duration=axis==='horizontal'?1000:900;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick=now=>{
      const progress=reduced?1:Math.min(1,(now-started)/duration);
      measurementAnimation[axis]=progress;
      if(progress===1){
        measurementAnimation.frame=0;
        $('measure').disabled=$('height').disabled=false;
        if(axis==='horizontal'){
          view.length=Math.abs(view.points[1]-view.points[0]);
          $('lengthLabel').textContent='水平影长 L';$('lengthValue').textContent=view.length.toFixed(2)+' 模型单位';
          measurementAnimation.phase='horizontal-done';setStep('height');
          $('status').textContent='水平连线已完成。先标出太阳高度角，再计算高度差。';
        }else{
          view.height=view.length*Math.tan(view.angle*Math.PI/180);
          $('heightValue').textContent=view.height.toFixed(2)+' 模型单位';
          $('formula').textContent=`Δh = L × tan(${view.angle}°) · 由所选影长估算`;
          measurementAnimation.phase='done';setStep('height');
          $('status').textContent='高度差连线已完成。';
        }
        requestRender();
      }else measurementAnimation.frame=requestAnimationFrame(tick);
      updateMeasurementInk();
    };
    requestRender();measurementAnimation.frame=requestAnimationFrame(tick);
  }
  $('measure').addEventListener('click',()=>startMeasurementAnimation('horizontal'));
  $('height').addEventListener('click',()=>{
    if(view.length===null||measurementAnimation.frame)return;
    if(!measurementAnimation.angleShown){
      measurementAnimation.angleShown=true;setStep('height');requestRender();
      $('status').textContent='太阳高度角已标出。点击“计算高度差”完成计算。';
      return;
    }
    startMeasurementAnimation('vertical');
  });
  function angleAnnotation(p,extent=70){
    if(!measurementAnimation.angleShown)return '';
    const a=view.angle*Math.PI/180,r=24;
    return `<g data-solar-angle><path d="M ${p.x} ${p.y} l ${extent*Math.cos(a)} ${-extent*Math.sin(a)}" fill="none" stroke="#f2d59a" stroke-width="1.5" stroke-dasharray="4 3"/><path d="M ${p.x+r} ${p.y} A ${r} ${r} 0 0 0 ${p.x+r*Math.cos(a)} ${p.y-r*Math.sin(a)}" fill="none" stroke="#fff0c9" stroke-width="2"/><text x="${p.x+38}" y="${p.y-10}" fill="#fff0c9" stroke="#132735" stroke-width="3" paint-order="stroke" font-size="14">α = ${view.angle}°</text></g>`;
  }
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function hit(canvas,camera,objects,event) {
    const rect=canvas.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    ray.setFromCamera(pointer,camera);
    return ray.intersectObjects(objects,false)[0];
  }
  let dragLine=null;
  topCanvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    const hitTop=hit(topCanvas,topCamera,[topMesh],e);
    if(!hitTop)return;
    const p=hitTop.point;
    if(!view.measuring&&Math.abs(p.z-view.cut)>9)return;
    dragLine={x:p.x,z:p.z,startY:e.clientY,cut:view.cut,moved:false};
    topCanvas.setPointerCapture(e.pointerId);
  });
  topCanvas.addEventListener('pointermove',e=>{
    if(!dragLine)return;
    const dy=e.clientY-dragLine.startY;
    if(Math.abs(dy)>5)dragLine.moved=true;
    if(dragLine.moved)setCut(dragLine.cut+dy*(topCamera.top-topCamera.bottom)/topCanvas.getBoundingClientRect().height);
  });
  topCanvas.addEventListener('pointerup',()=>{
    if(dragLine&&!dragLine.moved&&view.measuring){
      const newCut=view.points.length===0||view.points.length===2;
      const cut=newCut?Math.max(-155,Math.min(155,Math.round(dragLine.z))):view.cut;
      if(!newCut&&Math.abs(dragLine.z-view.cut)>9){
        $('status').textContent='请沿当前剖切线，在阴影区域选择第二点。';
      }else if(boundaryHit(dragLine.x,cut)){
        if(newCut)setCut(cut);
        setPin(dragLine.x);
      }else rejectLitPoint();
    }
    dragLine=null;
  });
  topCanvas.addEventListener('pointercancel',()=>{dragLine=null;});
  topCanvas.addEventListener('lostpointercapture',()=>{dragLine=null;});
  let sectionDrag=null;
  sideCanvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    const h=hit(sideCanvas,sideCamera,[cap,sideMesh],e);
    if(!h)return;
    sectionDrag={startX:e.clientX,cut:view.cut,x:h.point.x,moved:false};
    sideCanvas.setPointerCapture(e.pointerId);
    sideCanvas.style.cursor='grabbing';
  });
  sideCanvas.addEventListener('pointermove',e=>{
    if(!sectionDrag)return;
    const dx=e.clientX-sectionDrag.startX;
    if(Math.abs(dx)>5)sectionDrag.moved=true;
    if(sectionDrag.moved)setCut(sectionDrag.cut-dx*(sideCamera.right-sideCamera.left)/sideCanvas.getBoundingClientRect().width);
  });
  function endSectionDrag(){sectionDrag=null;sideCanvas.style.cursor='grab';}
  sideCanvas.style.cursor='grab';
  sideCanvas.addEventListener('pointerup',()=>{
    if(sectionDrag&&!sectionDrag.moved&&view.measuring)$('status').textContent='请在左侧俯视图选择阴影两端，右侧仅同步显示。';
    endSectionDrag();
  });
  sideCanvas.addEventListener('pointercancel',endSectionDrag);
  sideCanvas.addEventListener('lostpointercapture',endSectionDrag);
  // 实验私有测量层：只显示用户已经选取的点，不预显答案或拦截剖切拖动。
  const boundaryLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');
  boundaryLayer.id='lunarBoundaryPicker';
  boundaryLayer.style.cssText='position:absolute;inset:0;z-index:3;width:100%;height:100%;pointer-events:none;clip-path:circle(320px at 50% 50%)';
  topCanvas.after(boundaryLayer);
  function drawBoundaries(){
    const w=topCanvas.clientWidth,h=topCanvas.clientHeight;
    boundaryLayer.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const cutPoint=new THREE.Vector3(0,0,view.cut).project(topCamera);
    const cutY=(1-cutPoint.y)*h/2;
    // Match the 9 7 dashed reference guide in earth-circumference/textured.html.
    const cutGuide=`<line data-cut-guide x1="0" x2="${w}" y1="${cutY}" y2="${cutY}" stroke="#d6e9ef" stroke-width="3.5" stroke-dasharray="9 7" opacity=".85"/>`;
    boundaryLayer.innerHTML=cutGuide+(view.measuring?view.points.map((x,i)=>{
      const p=new THREE.Vector3(x,heightAt(x,view.cut),view.cut).project(topCamera);
      const cx=(p.x+1)*w/2,cy=(1-p.y)*h/2;
      return `<g class="lunar-picked-point" data-point="${i}" data-model-x="${x}" data-model-y="${heightAt(x,view.cut)}" transform="translate(${cx},${cy})"><circle r="11" fill="#152735" stroke="#f2d59a" stroke-width="1.8"/><circle r="4" fill="#f2d59a"/><text y="-20" text-anchor="middle" fill="#f2e1bd" stroke="#101d2a" stroke-width="4" paint-order="stroke" font-size="14">${i===0?'A':'B'}</text></g>`;    }).join(''):'');
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
    $('angle').value=Math.max(10,Math.min(85,Math.round(rayDrag.angle+wrappedDelta)));
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
      const mid=(p.x+q.x)/2,base=p.y,labelY=base+24;
      measurement=`<g id="lunarHeightTriangle">${seg(p.x,p.y,q.x,q.y,'#ffe18a',1.4,'5 5')}${animatedLeg(p.x,base,q.x,base,'horizontal','#f2d59a')}${animatedLeg(q.x,base,q.x,q.y,'vertical','#a9d8df')}<text x="${p.x-10}" y="${p.y-12}" fill="#fff0d5" font-size="14">A</text><text x="${q.x+10}" y="${q.y-12}" fill="#fff0d5" font-size="14">B</text></g>`;
      measurement+=angleAnnotation(p)+`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff0c9"/><circle cx="${q.x}" cy="${q.y}" r="4" fill="#fff0c9"/>`;
      if(view.height!==null)measurement+=`<text x="${mid}" y="${labelY}" text-anchor="middle" fill="#f2e1bd" stroke="#102330" stroke-width="4" paint-order="stroke" font-size="14">水平影长 L = ${view.length.toFixed(2)}</text>`;
      if(view.height!==null)measurement+=`<text x="${mid}" y="${labelY+24}" text-anchor="middle" fill="#a9d8df" stroke="#102330" stroke-width="4" paint-order="stroke" font-size="14">测量估算 Δh = ${view.height.toFixed(2)}</text>`;
    }
    // 仅天空内设置较宽的拖动命中区，避免光线挡住地形选点。
    const skyBottom=Math.max(0,Math.min(...Array.from({length:SEG+1},(_,i)=>{
      const x=-160+i*SIZE/SEG;return projectPlane(x,heightAt(x,view.cut)).y;
    }))-8);
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
    panel.hidden=!view.measuring||view.points.length!==2||span>=120;
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
    const mid=(p.x+q.x)/2,base=p.y;
    const label=(x,y,text,color='#fff0c9')=>`<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" stroke="#132735" stroke-width="4" paint-order="stroke" font-size="15" font-weight="600">${text}</text>`;
    $('closeupOverlay').setAttribute('viewBox',`0 0 ${w} ${h}`);
    $('closeupOverlay').innerHTML=`<path d="M ${p.x} ${p.y} L ${q.x} ${q.y}" stroke="#f2d59a" stroke-width="1.5" stroke-dasharray="5 4" fill="none"/>${animatedLeg(p.x,base,q.x,base,'horizontal','#f2d59a')}${animatedLeg(q.x,base,q.x,q.y,'vertical','#a9d8df')}<circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff0c9"/><circle cx="${q.x}" cy="${q.y}" r="5" fill="#fff0c9"/>${label(p.x,p.y-12,'A')}${label(q.x,q.y-12,'B')}${angleAnnotation(p)}${view.height===null?'':label(mid,Math.min(h-8,base+20),`L = ${view.length.toFixed(2)} 模型单位`)}`;
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
    fit(topRenderer,topCanvas,topCamera,160);
    fit(sideRenderer,sideCanvas,sideCamera,165);
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
  fitStage();rebuildSection();requestRender();
})();

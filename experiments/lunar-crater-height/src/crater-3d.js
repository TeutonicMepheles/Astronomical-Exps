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
  const initialSolarAngle = 35;
  const referenceRimRadius = 110;
  const tychoReferenceDiameterKm = 85;
  const kilometresPerModelUnit = tychoReferenceDiameterKm/(2*referenceRimRadius);
  const view = { lightConfirmed: false, measuring: false, cut: 0, angle: initialSolarAngle, outlined: false, radius: referenceRimRadius, points: [], length: null, height: null };
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
  // 用户指定沿用陨石坑撞击的灰色配色；仅同步色值，保留本实验纹理和材质参数。
  const fieldColor = new THREE.Color(0x989b9f), floorColor = new THREE.Color(0x929599);
  const outerColor = new THREE.Color(0xa6a8ab);
  const wallColor = new THREE.Color(0x727578), rimColor = new THREE.Color(0xb4b7ba);
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
  const rockMaterial=new THREE.MeshStandardMaterial({color:0xb4b7ba,roughness:1,flatShading:true});
  const rocks=new THREE.InstancedMesh(rockGeometry,rockMaterial,42);
  const rockDummy=new THREE.Object3D(),rockColor=new THREE.Color();
  for(let i=0;i<42;i++){
    const x=(random()-.5)*300,z=(random()-.5)*300,size=.9+random()*2.6;
    rockDummy.position.set(x,heightAt(x,z)+size*.55,z);
    rockDummy.rotation.set(random()*2,random()*6,random()*2);
    rockDummy.scale.set(size,size*(.55+random()*.4),size);
    rockDummy.updateMatrix();rocks.setMatrixAt(i,rockDummy.matrix);
    rockColor.setHex(i%3===0?0x989b9f:0xb4b7ba);rocks.setColorAt(i,rockColor);
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
    const litColor=new THREE.Color(0x727578),shadowColor=new THREE.Color(0x4a4c50);
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
  const lightTip=new ExperimentUI.OperationTip(document.querySelector('.view.top'),{top:'158px',className:'lunar-light-tip lunar-light-prompt'});
  const rimTip=new ExperimentUI.OperationTip(document.querySelector('.view.top'),{top:'158px',className:'lunar-light-tip'});
  const readyTip=new ExperimentUI.OperationTip(document.querySelector('.view.side'),{className:'lunar-ready-tip'});
  function bindSteppedSlider(panelId,inputId,outputId,unit=''){
    const input=$(inputId),output=$(outputId),bar=input.closest('label');
    const low=Number(input.min),high=Number(input.max);
    const buttons=[...$(panelId).querySelectorAll('[data-nudge]')];
    for(const button of buttons){
      button.addEventListener('click',()=>{
        input.value=Number(input.value)+Number(button.dataset.nudge);
        input.dispatchEvent(new Event('input'));
      });
    }
    return value=>{
      input.value=value;
      output.value=value+unit;
      input.setAttribute('aria-valuetext',output.value);
      bar.style.setProperty('--slider-fill',100*(value-low)/(high-low)+'%');
      for(const button of buttons){
        button.disabled=Number(button.dataset.nudge)<0?value<=low:value>=high;
      }
    };
  }

  const updateAngleSlider=bindSteppedSlider('lightPanel','angle','angleValue','°');
  const updateRimSlider=bindSteppedSlider('rimPanel','rimRadius','rimRadiusValue');
  let lightReady=false;

  function updateLightControls(){
    updateAngleSlider(view.angle);
    $('solarAltitudeReadout').textContent=view.angle+'°';
    $('confirmLight').hidden=view.lightConfirmed||!lightReady;
    if(view.lightConfirmed||lightReady)lightTip.hide();
    else lightTip.show('请选择适合测量的太阳高度角');
    if(!view.lightConfirmed&&lightReady)readyTip.show('角度合适，可前往测量！');
    else readyTip.hide();
    if(view.lightConfirmed&&!view.outlined)rimTip.show('调节合适的测量辅助圆');
    else rimTip.hide();
  }

  let rimCandidates=[];
  const measurementAnimation={frame:0,horizontal:0,baseline:0,angle:0,vertical:0,angleShown:false,phase:'idle'};
  const steps=[...document.querySelectorAll('.measurement-steps [data-step]')];
  const notice=document.createElement('output');
  notice.className='step-entry-note';notice.hidden=true;
  steps[0].parentElement.after(notice);
  let reachable=[],requested=null,activeStep='light';
  function showMissing(i){
    requested=i;setStep(activeStep,true);
  }
  steps.forEach((el,i)=>{
    el.setAttribute('role','button');el.tabIndex=0;
    const navigate=()=>{
      if(!reachable[i]){showMissing(i);return;}
      if(requested!==null)setStep(activeStep);
      if(el.hasAttribute('aria-current'))return;
      if(i===0){if(view.lightConfirmed)returnToLighting();}
      if(i===1){if(!view.lightConfirmed)$('confirmLight').click();else if(view.outlined)setRadius(view.radius);}
      if(i===2){if(!view.outlined)$('start').click();else if(view.points.length){view.cut=0;clearReadout();rebuildSection();}}
    };
    el.addEventListener('click',navigate);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();navigate();}});
  });
  function setStep(id,keepRequest=false){
    activeStep=id;
    if(!keepRequest)requested=null;
    $('lightPanel').hidden=view.lightConfirmed;
    $('rimPanel').hidden=!view.lightConfirmed||view.outlined;
    $('angle').disabled=view.lightConfirmed;
    updateLightControls();
    const current=view.lightConfirmed?['light','start','measure','height'].indexOf(id):0;
    reachable=[true,view.lightConfirmed||lightReady,view.lightConfirmed,view.points.length===2];
    const shown=requested??current;
    const message=requested===null?'':'请先完成前置操作';
    notice.hidden=!message;
    if(notice.textContent!==message)notice.textContent=message;
    for(const [i,el] of steps.entries()){
      const done=i<current||(i===3&&view.height!==null);
      el.classList.toggle('active',i===shown&&(!done||requested!==null));el.classList.toggle('done',done);
      el.querySelector('b').textContent=done?'✓':String(i+1);
      el.setAttribute('aria-label',el.querySelector('.step-name').textContent+(i===shown?'，当前阶段':done?'，已完成':''));
      if(i===shown&&(!done||requested!==null))el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
    }
    $('start').hidden=!view.lightConfirmed||view.outlined;
    $('previousStep').hidden=!view.lightConfirmed;
    $('manualHistory').hidden=id!=='measure'&&id!=='height';
    $('manualCalculation').hidden=id!=='height'||view.points.length!==2;
    const heightAction=$('height'),complete=view.height!==null;
    heightAction.hidden=!view.outlined;
    heightAction.disabled=view.length===null||!!measurementAnimation.frame;
    heightAction.classList.toggle('primary',!complete);
    heightAction.textContent=complete?'重新实验':'自动测高';
  }
  function cancelMeasurementAnimation(){
    cancelAnimationFrame(measurementAnimation.frame);
    Object.assign(measurementAnimation,{frame:0,horizontal:0,baseline:0,angle:0,vertical:0,angleShown:false,phase:'idle'});
  }
  function clearReadout(){
    document.dispatchEvent(new Event('lunar-measurement-reset'));
    cancelMeasurementAnimation();view.points=[];view.length=null;view.height=null;
    setStep(view.outlined?'measure':'start');
  }
  function refreshCandidates(){
    rimCandidates=view.outlined?LunarRimMeasurement.candidates(terrain,view.radius,view.angle):[];
    setStep(view.points.length===2?'height':view.outlined?'measure':'start');
  }
  function setRadius(value){
    if(!view.lightConfirmed)return;
    const hadSelection=view.points.length>0;
    view.radius=Math.max(70,Math.min(140,Math.round(value)));
    updateRimSlider(view.radius);
    view.outlined=false;view.measuring=false;rimCandidates=[];clearReadout();updateMarker();
    if(hadSelection)requestRender();else requestBoundaryRender();
  }
  $('rimRadius').addEventListener('input',e=>setRadius(Number(e.target.value)));
  $('start').addEventListener('click',()=>{
    if(!view.lightConfirmed)return;
    rimCandidates=LunarRimMeasurement.candidates(terrain,view.radius,view.angle);
    if(!rimCandidates.length){
      rimTip.show('这个辅助圆附近没有明显投影，请调整圆的大小，让它贴合坑缘。');
      return;
    }
    view.outlined=true;view.measuring=true;clearReadout();
    requestRender();
  });
  $('confirmLight').addEventListener('click',()=>{
    if(!lightReady)return;
    view.lightConfirmed=true;setStep('start');requestRender();
  });
  $('previousStep').addEventListener('click',()=>{
    if(view.points.length){
      view.cut=0;clearReadout();rebuildSection();
      document.querySelector('[data-rim-candidate]')?.focus();
      return;
    }
    if(view.outlined){
      setRadius(view.radius);$('start').focus();
      return;
    }
    returnToLighting();
  });
  function returnToLighting(){
    view.lightConfirmed=false;view.outlined=false;view.measuring=false;view.cut=0;rimCandidates=[];
    clearReadout();updateMarker();rebuildSection();$('angle').focus();
  }
  $('angle').addEventListener('input',e=>{
    if(view.lightConfirmed){e.target.value=view.angle;return;}
    view.angle=clampSolarAngle(Number(e.target.value));e.target.value=view.angle;
    const ready=LunarRimMeasurement.candidates(terrain,referenceRimRadius,view.angle).length>0;
    lightReady=ready;
    updateSunPosition();
    clearReadout();refreshCandidates();rebuildSection();
  });
  function updateSunPosition(){
    for(const scene of [topScene,sideScene])scene.userData.sun.position.set(180*Math.cos(view.angle*Math.PI/180),180*Math.sin(view.angle*Math.PI/180),0);
    topRenderer.shadowMap.needsUpdate=sideRenderer.shadowMap.needsUpdate=true;
  }
  function selectCandidate(id){
    if(!view.outlined)return;
    const pair=rimCandidates.find(p=>p.id===id);if(!pair)return;
    clearReadout();view.measuring=true;view.cut=pair.a.z;
    view.points=[pair.a.x,pair.b.x];view.length=pair.length;
    Object.assign(measurementAnimation,{horizontal:1,baseline:1,vertical:0,phase:'horizontal-done'});
    setStep('height');
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
    const heightLabel=overlay.querySelector('[data-measure-label="height"]');
    if(heightLabel)heightLabel.setAttribute('opacity',String(measurementAnimation.vertical));
    sideCanvas.parentElement.dataset.measurePhase=measurementAnimation.phase;
  }
  function animatedLeg(x1,y1,x2,y2,axis,color){
    return `<path data-measure-axis="${axis}" d="M ${x1} ${y1} L ${x2} ${y2}" pathLength="1" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/>`;
  }
  $('height').addEventListener('click',()=>{
    if(view.length===null||measurementAnimation.frame)return;
    if(view.height!==null){
      lightReady=false;
      view.angle=initialSolarAngle;view.radius=referenceRimRadius;
      updateRimSlider(view.radius);updateSunPosition();returnToLighting();
      return;
    }
    view.height=view.length*Math.tan(view.angle*Math.PI/180);
    Object.assign(measurementAnimation,{angleShown:true,angle:1,vertical:0,phase:'vertical'});
    $('height').disabled=true;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let previous,elapsed=0;
    const tick=now=>{
      if(previous!==undefined)elapsed+=Math.min(80,now-previous);
      previous=now;
      measurementAnimation.vertical=reduced?1:Math.min(1,elapsed/900);
      if(measurementAnimation.vertical===1){
        measurementAnimation.frame=0;measurementAnimation.phase='done';
        setStep('height');
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
  // Only explicit rim candidates accept input; terrain and section are read-only.
  const boundaryLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');
  boundaryLayer.id='lunarBoundaryPicker';
  boundaryLayer.style.cssText='position:absolute;inset:0;z-index:3;width:100%;height:100%;pointer-events:none;touch-action:none;clip-path:circle(320px at 50% 50%)';
  const shadowScaleLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');
  shadowScaleLayer.id='lunarShadowScale';
  shadowScaleLayer.style.cssText='position:absolute;inset:0;z-index:5;width:100%;height:100%;pointer-events:none';
  topCanvas.after(boundaryLayer,shadowScaleLayer);
  let boundaryFrame=0;
  function requestBoundaryRender(){
    if(!boundaryFrame)boundaryFrame=requestAnimationFrame(()=>{boundaryFrame=0;drawBoundaries();updateMeasurementInk();});
  }
  boundaryLayer.addEventListener('click',e=>{
    const target=e.target.closest('[data-rim-candidate]');
    if(target)selectCandidate(Number(target.dataset.rimCandidate));
  });
  boundaryLayer.addEventListener('keydown',e=>{
    const candidate=e.target.closest('[data-rim-candidate]');
    if(candidate&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectCandidate(Number(candidate.dataset.rimCandidate));}
  });

  function measurementPoint(x,y,index){
    const label=index===0?'A':'B';
    const color=index===0?'#fff4d4':'#a9d8df';
    return `<circle cx="${x}" cy="${y}" r="9" fill="#152735" stroke="#f2d59a" stroke-width="2"/><circle cx="${x}" cy="${y}" r="4" fill="${color}"/><text x="${x}" y="${y-24}" text-anchor="middle" fill="#f2e1bd" stroke="#101d2a" stroke-width="4" paint-order="stroke" style="font-size:var(--type-body)">${label}</text>`;
  }

  const formatModelDistance = units => (units*kilometresPerModelUnit).toFixed(2)+' km';

  function measureLabel(kind,x,y,anchor,value){
    const height=kind==='height';
    const text=height?'Δh':'L',color=height?'#a9d8df':'#fff0c9';
    return `<text data-measure-label="${kind}" x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" fill="${color}" stroke="#102330" stroke-width="5" stroke-linejoin="round" paint-order="stroke" style="font-size:var(--type-data-label);font-variant-numeric:tabular-nums" font-weight="500" opacity="${height?measurementAnimation.vertical:1}">${text}=${formatModelDistance(value)}</text>`;
  }

  const scaleKm=20;
  const calculatorScale=$('manualScaleBar');
  const calculatorScalePath=calculatorScale.querySelector('path');
  function drawBoundaries(){
    const w=topCanvas.clientWidth,h=topCanvas.clientHeight;
    shadowScaleLayer.setAttribute('viewBox',`0 0 ${w} ${h}`);
    // Match the nominal rim diameter to Tycho for the plan-view reference scale.
    const scaleUnits=scaleKm/kilometresPerModelUnit;
    const scaleStart=new THREE.Vector3(0,0,0).project(topCamera);
    const scaleEnd=new THREE.Vector3(scaleUnits,0,0).project(topCamera);
    const scaleCenter=w/2,scaleHalfWidth=Math.abs(scaleEnd.x-scaleStart.x)*w/4,scaleY=h/2+270;
    const scaleLeft=scaleCenter-scaleHalfWidth,scaleRight=scaleCenter+scaleHalfWidth;
    const scaleWidth=scaleRight-scaleLeft;
    calculatorScale.setAttribute('width',String(scaleWidth+4));
    calculatorScalePath.setAttribute('d',`M 2 4 v 8 h ${scaleWidth} v -8`);
    shadowScaleLayer.innerHTML=`<path data-model-scale d="M ${scaleLeft} ${scaleY-6} v 6 H ${scaleRight} v -6" fill="none" stroke="#f2d59a" stroke-width="2.5"/>
      <text x="${scaleCenter}" y="${scaleY-16}" text-anchor="middle" fill="#fff0c9" stroke="#102330" stroke-width="4" paint-order="stroke" style="font-size:var(--type-body)">${scaleKm} km</text>`;

    boundaryLayer.hidden=!view.lightConfirmed;
    if(!view.lightConfirmed){boundaryLayer.innerHTML='';return;}
    boundaryLayer.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const cutPoint=new THREE.Vector3(0,0,view.cut).project(topCamera);
    const cutY=(1-cutPoint.y)*h/2;
    const project=(x,z)=>{
      const p=new THREE.Vector3(x,0,z).project(topCamera);
      return {x:(p.x+1)*w/2,y:(1-p.y)*h/2};
    };
    const center=project(0,0),radius=Math.abs(project(view.radius,0).x-center.x);
    const circle=`cx="${center.x}" cy="${center.y}" r="${radius}"`;
    let rim=`<circle data-rim-circle ${circle} fill="none" stroke="#182c39" stroke-width="5" opacity=".55"/><circle ${circle} fill="none" stroke="#f3d79b" stroke-width="2.5" stroke-dasharray="8 6"/>`;
    if(view.outlined) for(const pair of rimCandidates){
      const p=project(pair.a.x,pair.a.z),selected=view.points.length===2&&view.points[0]===pair.a.x&&view.cut===pair.a.z;
      rim+=`<g class="rim-candidate" data-rim-candidate="${pair.id}" data-side="${pair.side}" data-selected="${selected}" role="button" tabindex="0" aria-label="选择右侧山峰 A" transform="translate(${p.x},${p.y})" style="pointer-events:all;cursor:pointer"><circle r="${selected?7:12}" fill="#142b38" stroke="#f3d79b" stroke-width="1.5"/><circle class="rim-dot" r="5" fill="#f3d79b"/></g>`;
    }
    const cutGuide=`<line data-cut-guide x1="0" x2="${w}" y1="${cutY}" y2="${cutY}" stroke="#d6e9ef" stroke-width="3.5" stroke-dasharray="9 7" opacity=".85"/>`;
    let shadowLine='';
    if(view.points.length===2&&measurementAnimation.phase!=='idle'){
      const [a,b]=view.points.map(x=>project(x,view.cut));
      shadowLine=animatedLeg(a.x,cutY,b.x,cutY,'horizontal','#f2d59a');
    }
    boundaryLayer.innerHTML=rim+(view.points.length===2?cutGuide:'')+shadowLine+(view.measuring?view.points.map((x,i)=>{
      const p=new THREE.Vector3(x,heightAt(x,view.cut),view.cut).project(topCamera);
      const cx=(p.x+1)*w/2,cy=(1-p.y)*h/2;
      return `<g class="lunar-picked-point" data-point="${i}" data-model-x="${x}" data-model-y="${heightAt(x,view.cut)}" data-model-z="${view.cut}">${measurementPoint(cx,cy,i)}</g>`;    }).join(''):'');
  }
  // 光线独立置于透明 WebGL 月面之后；测量标注仍在前景。
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
    let rays='',gradients='';
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
    }
    rayLayer.innerHTML=`<defs>${gradients}</defs>${rays}`;
    let measurement='';
    if(view.points.length===2){
      const [x0,x1]=view.points,p=projectPlane(x0,heightAt(x0,view.cut)),q=projectPlane(x1,heightAt(x1,view.cut));
      const base=q.y;
      measurement=`<g id="lunarHeightTriangle">${seg(p.x,p.y,q.x,q.y,'#ffe18a',1.4,'5 5')}${animatedLeg(q.x,base,p.x,base,'baseline','#f2d59a')}${animatedLeg(p.x,base,p.x,p.y,'vertical','#a9d8df')}</g>`;
      measurement+=angleAnnotation(q)+`<g data-section-point="0">${measurementPoint(p.x,p.y,0)}</g><g data-section-point="1">${measurementPoint(q.x,q.y,1)}</g>`;
      const lengthX=Math.max(80,Math.min(w-80,(p.x+q.x)/2));
      const lengthY=base+26<=h-18?base+26:base-26;
      measurement+=measureLabel('length',lengthX,lengthY,'middle',view.length);
      if(view.height!==null){
        const labelOnRight=p.x+150<=w;
        measurement+=measureLabel('height',p.x+(labelOnRight?14:-14),(p.y+base)/2,labelOnRight?'start':'end',view.height);
      }
    }
    overlay.innerHTML=measurement;
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
    $('closeupOverlay').innerHTML=`<path d="M ${p.x} ${p.y} L ${q.x} ${q.y}" stroke="#f2d59a" stroke-width="1.5" stroke-dasharray="5 4" fill="none"/>${animatedLeg(q.x,base,p.x,base,'baseline','#f2d59a')}${animatedLeg(p.x,base,p.x,p.y,'vertical','#a9d8df')}${measurementPoint(p.x,p.y,0)}${measurementPoint(q.x,q.y,1)}${angleAnnotation(q)}${view.height===null?'':label(mid,Math.min(h-8,base+20),`L=${formatModelDistance(view.length)}`)}`;
    $('closeupScale').textContent=`${zoom.toFixed(1)}× · 跟随 A / B`;
    $('closeupCaption').textContent=view.height===null?'先连线，再标出太阳高度角，最后计算高度差。':`按所选影长估算 Δh = ${formatModelDistance(view.height)} · 太阳高度角 ${view.angle}°`;
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
    topRenderer.render(topScene,topCamera);
    drawCloseup();
    // 局部帧复制后恢复主视图，保证屏幕与后续命中使用原剖面相机。
    sideRenderer.render(sideScene,sideCamera);
    drawBoundaries();
    drawAnnotations();
    updateMeasurementInk();

  }
  // Capture only on confirmation, while the WebGL drawing buffer is still available.
  window.LunarManualSection = {
    scaleKm,
    capture() {
      if (view.points.length !== 2) return null;
      const w=sideCanvas.clientWidth,h=sideCanvas.clientHeight;
      if (!w || !h) return null;
      const [a,b]=view.points.map(x=>{
        const vec=new THREE.Vector3(x,heightAt(x,view.cut),view.cut).project(sideCamera);
        return {x:(vec.x+1)*w/2,y:(1-vec.y)*h/2};
      });
      const left=Math.max(0,Math.min(a.x,b.x)-44),right=Math.min(w,Math.max(a.x,b.x)+44);
      const top=Math.max(0,Math.min(a.y,b.y)-48),bottom=Math.min(h,Math.max(a.y,b.y)+38);
      const width=right-left,height=bottom-top;
      if (width<=0 || height<=0) return null;
      const image=document.createElement('canvas');
      const scale=Math.min(512/width,400/height,1.5);
      image.width=Math.ceil(width*scale);image.height=Math.ceil(height*scale);
      const ctx=image.getContext('2d');
      ctx.scale(scale,scale);
      ctx.fillStyle='#102334';ctx.fillRect(0,0,width,height);
      sideRenderer.render(sideScene,sideCamera);
      const sx=sideCanvas.width/w,sy=sideCanvas.height/h;
      ctx.drawImage(sideCanvas,left*sx,top*sy,width*sx,height*sy,0,0,width,height);
      ctx.translate(-left,-top);
      ctx.strokeStyle='#f2d59a';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,b.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      ctx.setLineDash([]);
      ctx.font='600 18px sans-serif';ctx.textAlign='center';
      for (const [point,label] of [[a,'A'],[b,'B']]) {
        ctx.fillStyle='#f2d59a';ctx.beginPath();ctx.arc(point.x,point.y,5,0,2*Math.PI);ctx.fill();
        ctx.strokeStyle='#102334';ctx.lineWidth=4;ctx.strokeText(label,point.x,point.y-12);
        ctx.fillText(label,point.x,point.y-12);
      }
      return {angle:view.angle, image:image.toDataURL('image/webp',0.85)};
    }
  };
  new ResizeObserver(requestRender).observe(topCanvas.parentElement);
  new ResizeObserver(requestRender).observe(sideCanvas.parentElement);
  function fitStage(){
    document.documentElement.style.setProperty('--stage-scale',Math.min(innerWidth/1600,innerHeight/900));
    requestRender();
  }
  window.addEventListener('resize',fitStage);
  updateRimSlider(view.radius);
  setStep('start');fitStage();rebuildSection();requestRender();
})();

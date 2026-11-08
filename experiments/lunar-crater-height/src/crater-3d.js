/* 三维地形与剖面交互。../assets/three.reference.local.js 为“陨石坑参考”页面所带 Three.js r152；
   本实验单独保留副本，以便该 HTML 不依赖网络即可运行。 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const topCanvas = $('top'), sideCanvas = $('section');
  const topRenderer = new THREE.WebGLRenderer({ canvas: topCanvas, antialias: true });
  const sideRenderer = new THREE.WebGLRenderer({ canvas: sideCanvas, antialias: true });
  for (const renderer of [topRenderer, sideRenderer]) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
  }
  const topScene = new THREE.Scene(), sideScene = new THREE.Scene();
  for (const scene of [topScene, sideScene]) {
    scene.background = new THREE.Color(0x0b0e14);
    scene.add(new THREE.HemisphereLight(0xbfc9da, 0x28231f, 1.0));
    const sun = new THREE.DirectionalLight(0xffecc5, 2.4);
    sun.position.set(180*Math.cos(35*Math.PI/180),180*Math.sin(35*Math.PI/180),0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    // 光源距原点 180，背光侧地形距光源可超过 340；须覆盖整个高度场。
    Object.assign(sun.shadow.camera, { left: -175, right: 175, top: 175, bottom: -175, near: 1, far: 600 });
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    scene.userData.sun = sun;
  }
  const topCamera = new THREE.OrthographicCamera(-160, 160, 160, -160, 1, 600);
  topCamera.position.set(0, 260, 0);
  topCamera.up.set(0, 0, -1);
  topCamera.lookAt(0, 0, 0);
  const sideCamera = new THREE.OrthographicCamera(-165, 165, 110, -110, 1, 600);
  const view = { measuring: false, cut: 0, angle: 35, points: [], length: null, height: null };
  function setSideCamera() {
    sideCamera.position.set(view.measuring ? 0 : 165, view.measuring ? -7 : 100, view.measuring ? 255 : 185);
    sideCamera.lookAt(0, -7, 0);
  }
  setSideCamera();

  // 在原演示高度场基础上增加坑底起伏；所有长度均为演示模型单位。
  const fract = x => x - Math.floor(x);
  function noise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    let u = fract(x), v = fract(z);
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
    return (1-v) * ((1-u)*hash(ix,iz)+u*hash(ix+1,iz)) + v*((1-u)*hash(ix,iz+1)+u*hash(ix+1,iz+1));
  }
  function heightAt(x, z) {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    const radius = 88 + 10*Math.sin(3*a+1.2)+6*Math.sin(5*a+0.4)+4*Math.cos(2*a-0.8);
    const rim = 28 * Math.exp(-Math.pow((r-radius)/14, 2));
    const bowl = -27 * Math.exp(-Math.pow(r/(radius*0.70), 4));
    const peak = 13 * Math.exp(-Math.pow(r/18, 2));
    const ripples = (noise(x*0.18,z*0.18)-0.5)*3.5 + (noise(x*0.65+20,z*0.65)-0.5)*0.8;
    const wall = 3*Math.sin(a*9+0.3)*Math.exp(-Math.pow((r-radius*0.73)/18, 2));
    return rim + bowl + peak + wall + ripples;
  }
  const SIZE = 320, SEG = 200;
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  const positions = geometry.attributes.position;
  for (let i=0; i<positions.count; i++) positions.setZ(i, heightAt(positions.getX(i), -positions.getY(i)));
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  // 一张覆盖整块月面的细颗粒纹理，避免小贴图反复平铺时出现方块边界。
  const textureSize = 1024;
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = textureSize;
  const tx = texCanvas.getContext('2d'), tex = tx.createImageData(textureSize, textureSize);
  let textureSeed = 0x51a7c3d9;
  const random = () => ((textureSeed = (Math.imul(textureSeed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i=0; i<textureSize*textureSize; i++) {
    const grain = 227 + Math.floor(random()*11);
    tex.data[i*4] = grain;
    tex.data[i*4+1] = grain-3;
    tex.data[i*4+2] = grain-10;
    tex.data[i*4+3] = 255;
  }
  // 不规则的短暗纹模拟细小月壤颗粒，方向和长度轻微变化，且不重复。
  for (let i=0; i<90000; i++) {
    const x = Math.floor(random()*(textureSize-7)), y = Math.floor(random()*(textureSize-2));
    const width = 1 + Math.floor(random()*5), slope = (random()-0.5)*0.7;
    const depth = 45 + Math.floor(random()*95);
    for (let dx=0; dx<width; dx++) {
      const yy = y + Math.round(dx*slope), p = (yy*textureSize+x+dx)*4;
      tex.data[p] = Math.max(55, tex.data[p]-depth);
      tex.data[p+1] = Math.max(55, tex.data[p+1]-depth);
      tex.data[p+2] = Math.max(55, tex.data[p+2]-depth);
    }
  }
  tx.putImageData(tex,0,0);
  const lunarTexture = new THREE.CanvasTexture(texCanvas);
  lunarTexture.colorSpace = THREE.SRGBColorSpace;
  lunarTexture.anisotropy = 4;
  const base = { color: 0xc4c0b8, roughness: 0.95, metalness: 0,
    map: lunarTexture, bumpMap: lunarTexture, bumpScale: 0.018, side: THREE.DoubleSide };
  const topMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial(base));
  // 保留剖面背后的半块地形，让正面剖切面不会被前景遮住。
  const cutPlane = new THREE.Plane(new THREE.Vector3(0,0,-1), 0);
  const sideMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ ...base, clippingPlanes: [cutPlane], clipShadows: true }));
  for (const mesh of [topMesh, sideMesh]) {
    mesh.rotation.x = -Math.PI/2;
    mesh.castShadow = mesh.receiveShadow = true;
  }
  topScene.add(topMesh); sideScene.add(sideMesh);

  const cap = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors:true, side: THREE.DoubleSide }));
  // 使用实心窄带，避免 WebGL 在部分设备上把线宽固定为 1 像素。
  const referenceMaterial = new THREE.MeshBasicMaterial({color:0xf3cc62,side:THREE.DoubleSide,depthTest:false,depthWrite:false});
  const edge = new THREE.Mesh(new THREE.BufferGeometry(), referenceMaterial);
  edge.renderOrder=20;
  sideScene.add(cap, edge);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(310,1.3), referenceMaterial);
  line.rotation.x=-Math.PI/2;
  line.position.y=2;
  line.renderOrder = 20;
  line.visible = true;
  topScene.add(line);
  const markers = [0x75e4ff,0xffd965].map(color => {
    const material=new THREE.MeshBasicMaterial({color,depthTest:false});
    const sphere=new THREE.SphereGeometry(3.2,16,12);
    const top=new THREE.Mesh(sphere,material),side=new THREE.Mesh(sphere,material);
    top.renderOrder=side.renderOrder=30;topScene.add(top);sideScene.add(side);
    return {top,side};
  });
  const spanMaterial=new THREE.LineBasicMaterial({color:0xff6f80,depthTest:false});
  const topSpan=new THREE.Line(new THREE.BufferGeometry(),spanMaterial);
  const sideSpan=new THREE.Line(new THREE.BufferGeometry(),spanMaterial);
  topSpan.renderOrder=sideSpan.renderOrder=29;topScene.add(topSpan);sideScene.add(sideSpan);
  function replaceGeometry(mesh, geo) { mesh.geometry.dispose(); mesh.geometry = geo; }
  function rebuildSection() {
    cutPlane.constant = view.cut;
    line.position.z = view.cut;
    line.visible = true;
    const verts = [], outline = [], colors=[];
    const profile=Array.from({length:SEG+1},(_,i)=>heightAt(-160+i*SIZE/SEG,view.cut));
    const slope=Math.tan(view.angle*Math.PI/180);
    const litColor=new THREE.Color(0x725239),shadowColor=new THREE.Color(0x353846);
    const bottom = -58, z = view.cut + 0.08;
    for (let i=0;i<SEG;i++) {
      const x0 = -160+i*SIZE/SEG, x1=x0+SIZE/SEG;
      const y0=profile[i], y1=profile[i+1];
      const midHeight=(y0+y1)/2;
      let shadow=false;
      for(let j=i+1;j<=SEG;j++){
        if(profile[j]>midHeight+(j-i-0.5)*SIZE/SEG*slope+0.15){shadow=true;break;}
      }
      const color=shadow?shadowColor:litColor;
      for(let k=0;k<6;k++)colors.push(color.r,color.g,color.b);
      verts.push(x0,y0,z,x0,bottom,z,x1,y1,z, x1,y1,z,x0,bottom,z,x1,bottom,z);
    }
    for(let i=0;i<SEG;i++) {
      const x0=-160+i*SIZE/SEG,x1=x0+SIZE/SEG;
      const y0=heightAt(x0,view.cut)+0.16,y1=heightAt(x1,view.cut)+0.16;
      const dz=z+0.05,half=0.65;
      outline.push(x0,y0-half,dz,x1,y1-half,dz,x1,y1+half,dz,
        x0,y0-half,dz,x1,y1+half,dz,x0,y0+half,dz);
    }
    const geo = new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();replaceGeometry(cap,geo);
    replaceGeometry(edge,new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(outline,3)));
    updateMarker();
    requestRender();
  }
  function updateMarker() {
    markers.forEach(({top,side},i)=>{
      const visible=view.measuring && i<view.points.length;
      top.visible=side.visible=visible;
      if(visible){const x=view.points[i],y=heightAt(x,view.cut);top.position.set(x,y+6,view.cut);side.position.set(x,y+8,view.cut+0.5);}
    });
    sideSpan.visible=false;
    topSpan.visible=view.measuring&&view.points.length===1&&view.length!==null;
    if(topSpan.visible){
      const x=view.points[0];
      const direction=heightAt(x,view.cut)<0?1:-1;
      replaceGeometry(topSpan,new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,2,view.cut),new THREE.Vector3(x+direction*view.length,2,view.cut)]));
    }
  }
  function clearReadout() {
    view.length=null;view.height=null;
    $('lengthLabel').textContent='影长 L';
    $('lengthValue').textContent='—';$('heightValue').textContent='—';$('formula').textContent='';
  }
  function setPin(x) {
    x=Math.max(-150,Math.min(150,x));
    if(isShadowed(x)){
      view.points=[];clearReadout();updateMarker();requestRender();
      $('status').textContent='该点位于阴影中，请选择被阳光照亮的点。';return;
    }
    view.points=[x];
    clearReadout();updateMarker();requestRender();
    $('status').textContent=`已同步放置图钉：横坐标 ${x.toFixed(1)}。点击“测量影长”。`;
  }
  function isShadowed(x){
    const h=heightAt(x,view.cut),slope=Math.tan(view.angle*Math.PI/180);
    // 坑底低于基准面时用反向延长线求有向海拔；不要求该点投下实体阴影。
    if(h<0)return false;
    for(let xx=x+0.5;xx<=160;xx+=0.8)if(heightAt(xx,view.cut)>h+(xx-x)*slope+0.4)return true;
    return false;
  }
  function setCut(v) {
    const next=Math.max(-155,Math.min(155,Math.round(v)));
    if(next===view.cut)return;
    view.cut=next;
    $('cut').value=view.cut;$('cutValue').textContent=view.cut;
    view.points=[];clearReadout();rebuildSection();
    $('status').textContent=view.measuring?'剖切面已更新，请重新选点。':'剖切面已更新，可开始测量。';
  }
  $('cut').addEventListener('input',e=>setCut(Number(e.target.value)));
  $('angle').addEventListener('input',e=>{
    view.angle=Number(e.target.value);$('angleValue').textContent=view.angle+'°';
    // 光源始终位于剖面的 X/Y 平面内：俯视从正右方入射，高度角仅改变仰角。
    for(const scene of [topScene,sideScene]) scene.userData.sun.position.set(180*Math.cos(view.angle*Math.PI/180),180*Math.sin(view.angle*Math.PI/180),0);
    clearReadout();
    if(view.points.length&&isShadowed(view.points[0])){
      view.points=[];$('status').textContent='太阳角度改变后，原选点进入阴影，请重新选取受光点。';
    }
    rebuildSection();
  });
  $('start').addEventListener('click',()=>{
    view.measuring=true;setSideCamera();rebuildSection();
    $('start').classList.add('active');$('start').textContent='测量中';
    $('sectionLabel').textContent='正对剖面 · 点击地形选点';
    $('topHelp').textContent='沿剖切线点击一个受光点；重新点击替换图钉。';
    $('sectionHelp').textContent='点击受光处放图钉，再测量影长；拖动太阳改变高度角。';
    $('status').textContent='请在左侧剖切线上或右侧剖面选取一个受光点。';
  });
  $('clear').addEventListener('click',()=>{view.points=[];clearReadout();updateMarker();requestRender();$('status').textContent='已清除选点。';});
  $('measure').addEventListener('click',()=>{
    if(!view.measuring||view.points.length!==1){$('status').textContent='请先开始测量并选取一个受光点。';return;}
    const h=heightAt(view.points[0],view.cut);
    if(Math.abs(h)<0.5){$('status').textContent='该点接近水平基准面，距离和海拔都接近 0；请选择地形起伏更明显的点。';return;}
    view.length=Math.round(Math.abs(h)/Math.tan(view.angle*Math.PI/180)*100)/100;
    view.height=null;$('heightValue').textContent='—';$('formula').textContent='';
    $('lengthLabel').textContent=h<0?'基准面距离 L':'影长 L';
    $('lengthValue').textContent=view.length.toFixed(2)+' 模型单位';
    $('status').textContent=h<0?'已显示该点到水平基准面的几何延长距离。点击“计算高度”得到负海拔。':'已显示该点投向水平基准面的几何影长。点击“计算高度”。';
    updateMarker();
    requestRender();
  });
  $('height').addEventListener('click',()=>{
    if(view.length===null){$('status').textContent='请先测量影长。';return;}
    const sign=heightAt(view.points[0],view.cut)<0?-1:1;
    view.height=sign*Math.round(view.length*Math.tan(view.angle*Math.PI/180)*100)/100;
    $('heightValue').textContent=view.height.toFixed(2)+' 模型单位';
    $('formula').textContent=`h = ${sign<0?'−':''}L × tan(${view.angle}°)`;
    $('status').textContent='计算完成；更换剖面、角度或选点可重新测量。';
    requestRender();
  });

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
    if(Math.abs(p.z-view.cut)>9)return;
    dragLine={x:p.x,startY:e.clientY,cut:view.cut,moved:false};
    topCanvas.setPointerCapture(e.pointerId);
  });
  topCanvas.addEventListener('pointermove',e=>{
    if(!dragLine)return;
    const dy=e.clientY-dragLine.startY;
    if(Math.abs(dy)>5)dragLine.moved=true;
    if(dragLine.moved)setCut(dragLine.cut+dy*320/topCanvas.clientHeight);
  });
  topCanvas.addEventListener('pointerup',()=>{
    if(dragLine&&!dragLine.moved&&view.measuring)setPin(dragLine.x);
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
    if(sectionDrag.moved)setCut(sectionDrag.cut-dx*320/sideCanvas.clientWidth);
  });
  function endSectionDrag(){sectionDrag=null;sideCanvas.style.cursor='grab';}
  sideCanvas.style.cursor='grab';
  sideCanvas.addEventListener('pointerup',()=>{
    if(sectionDrag&&!sectionDrag.moved&&view.measuring)setPin(sectionDrag.x);
    endSectionDrag();
  });
  sideCanvas.addEventListener('pointercancel',endSectionDrag);
  sideCanvas.addEventListener('lostpointercapture',endSectionDrag);
  // 独立 SVG 注释层：仅太阳接收指针，地形选点与剖面拖动仍由下方画布处理。
  const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  overlay.id='sunOverlay';
  overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;touch-action:none';
  sideCanvas.after(overlay);
  let sunDrag=false;
  const sunRay=new THREE.Raycaster();
  overlay.addEventListener('pointerdown',e=>{
    if(!view.measuring||!e.target.closest('[data-sun]')||e.button!==0)return;
    sunDrag=true;overlay.setPointerCapture(e.pointerId);e.preventDefault();
  });
  overlay.addEventListener('pointermove',e=>{
    if(!sunDrag)return;
    const rect=overlay.getBoundingClientRect();
    sunRay.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),sideCamera);
    const p=sunRay.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),-view.cut),new THREE.Vector3());
    if(!p)return;
    const angle=Math.atan2(p.y,p.x-15)*180/Math.PI;
    $('angle').value=Math.max(10,Math.min(85,Math.round(angle)));
    $('angle').dispatchEvent(new Event('input'));
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])overlay.addEventListener(event,()=>{sunDrag=false;});
  function drawAnnotations(){
    if(!view.measuring){overlay.innerHTML='';return;}
    const w=sideCanvas.clientWidth,h=sideCanvas.clientHeight;
    overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const a=view.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const projectPlane=(x,y)=>{const p=new THREE.Vector3(x,y,view.cut).project(sideCamera);return {x:(p.x+1)*w/2,y:(1-p.y)*h/2};};
    const origin=projectPlane(15,0),sun=projectPlane(15+90*c,90*s);
    const cx=origin.x,cy=origin.y,sx=sun.x,sy=sun.y;
    const seg=(x1,y1,x2,y2,color,width=1.5,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
    let rays='';
    for(let k=-3;k<=3;k++){
      const x=15+90*c+k*20*s,y=90*s-k*20*c;
      const from=projectPlane(x,y),to=projectPlane(x-c*260,y-s*260);
      rays+=seg(from.x,from.y,to.x,to.y,'#e8ba4a55');
    }
    const horizontal=projectPlane(70,0);
    let arc='';
    for(let i=0;i<=32;i++){const t=a*i/32,p=projectPlane(15+28*Math.cos(t),28*Math.sin(t));arc+=`${i?'L':'M'} ${p.x} ${p.y} `;}
    const label=projectPlane(52,9);
    let measurement='';
    if(view.length!==null&&view.points.length===1){
      const x=view.points[0],below=heightAt(x,view.cut)<0;
      const p=projectPlane(x,heightAt(x,view.cut)),q=projectPlane(x+(below?view.length:-view.length),0),foot=projectPlane(x,0);
      const base=foot.y,mid=(p.x+q.x)/2,labelY=base+(below?60:12),heightY=base+(below?105:57);
      measurement=seg(p.x,p.y,p.x,base,'#6fd4ff',1.8,'7 5')+seg(p.x,p.y,q.x,q.y,'#ffe18a',1.4,'3 5')
        +seg(p.x,base,q.x,base,'#ff4d70',3.4)+seg(p.x,base-8,p.x,base+8,'#ff8098',2)+seg(q.x,base-8,q.x,base+8,'#ff8098',2)
        +`<rect x="${mid-100}" y="${labelY}" width="200" height="26" rx="7" fill="#200e19e8" stroke="#ff8098"/><text x="${mid}" y="${labelY+18}" text-anchor="middle" fill="#ff9bad" font-size="14" font-weight="700">${below?'基准面距离':'影长'} ${view.length.toFixed(2)} 模型单位</text>`;
      if(view.height!==null)measurement+=`<text x="${mid}" y="${heightY}" text-anchor="middle" fill="#6cf0b0" font-size="14">计算海拔 h = ${view.height.toFixed(2)}</text>`;
    }
    overlay.innerHTML=`<defs><radialGradient id="sunHalo"><stop stop-color="#ffe59b" stop-opacity=".5"/><stop offset="1" stop-color="#ffbd40" stop-opacity="0"/></radialGradient><radialGradient id="sunCore" cx="35%" cy="30%"><stop stop-color="#fffce2"/><stop offset=".6" stop-color="#ffd54a"/><stop offset="1" stop-color="#f2a825"/></radialGradient></defs>${rays}
      ${seg(cx,cy,horizontal.x,horizontal.y,'#e8ba4a88',1.5,'5 5')}
      <path d="${arc}" fill="none" stroke="#e8ba4a" stroke-width="1.8"/>
      <text x="${label.x}" y="${label.y}" fill="#ffdc76" font-size="15" font-weight="700">${view.angle.toFixed(1)}°</text>
      <g data-sun="true" style="pointer-events:all;cursor:grab" role="img" aria-label="拖动太阳调整高度角">
      <circle cx="${sx}" cy="${sy}" r="59" fill="url(#sunHalo)" pointer-events="none"/>
      <circle id="sunHandle" cx="${sx}" cy="${sy}" r="31" fill="transparent" stroke="#ffe19a" stroke-dasharray="4 4"/>
      <circle cx="${sx}" cy="${sy}" r="21" fill="url(#sunCore)"/></g>${measurement}`;
  }
  let pending=false;
  function requestRender() { if(!pending){pending=true;requestAnimationFrame(render);} }
  function fit(renderer,canvas,camera,halfHeight) {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    renderer.setSize(w,h,false);
    const ratio=w/h;
    camera.left=-halfHeight*ratio;camera.right=halfHeight*ratio;
    camera.top=halfHeight;camera.bottom=-halfHeight;
    camera.updateProjectionMatrix();
  }
  function render() {
    pending=false;
    fit(topRenderer,topCanvas,topCamera,160);
    fit(sideRenderer,sideCanvas,sideCamera,view.measuring?165:165);
    topRenderer.render(topScene,topCamera);sideRenderer.render(sideScene,sideCamera);
    drawAnnotations();
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

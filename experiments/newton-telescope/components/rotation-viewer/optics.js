(function(){
'use strict';
const C=window.Newton.rotationCalibration,T=window.THREE;
function create(root){
 const canvas=root.querySelector('#r360-opticalCanvas'),photo=root.querySelector('#r360-photo'),toggle=root.querySelector('#r360-light'),description=root.querySelector('#r360-opticalDescription'),legend=root.querySelector('#r360-opticalLegend'),debugBox=root.querySelector('#r360-calibration');
 const V=(x,y,z)=>new T.Vector3(x,y,z), f=C.focalLength, focusY=f-C.primaryX, normal=V(1,1,0).normalize();
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setClearColor(0,0);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,-100,100);camera.updateMatrixWorld();
 const rays=[];for(const [y,z] of [[-.56,.05],[-.42,-.08],[.45,.08],[.60,-.04]]){
  const a=V(C.frontX-.20,y,z),m=V(C.primaryX-(y*y+z*z)/(4*f),y,z),n=V(1,y/(2*f),z/(2*f)).normalize();
  const r=V(1,0,0).reflect(n),s=m.clone().addScaledVector(r,-m.dot(normal)/r.dot(normal)),q=r.clone().reflect(normal);
  const e=s.clone().addScaledVector(q,(focusY-s.y)/q.y), entry=s.clone().addScaledVector(q,(C.eyeEntry-s.y)/q.y);
  if(Math.hypot(y,z)>C.primaryRadius||s.length()>C.secondaryRadius||q.y<=0||Math.hypot(entry.x,entry.z)>C.eyeRadius||Math.hypot(e.x,e.z)>1e-6)throw Error('Invalid optical geometry');
  rays.push({points:[a,m,s,e],entry});
 }
 const colors=[0xffc56a,0xffe7a1,0x9be9ff];
 const lines=[],dots=[];for(const [i,r] of rays.entries()){
  for(let j=0;j<3;j++){const material=new T.LineBasicMaterial({color:colors[j],transparent:true,depthTest:false,depthWrite:false});const line=new T.Line(new T.BufferGeometry().setFromPoints(r.points.slice(j,j+2)),material);line.frustumCulled=false;scene.add(line);lines.push(line)}
  if(i%2===0){const g=new T.BufferGeometry().setFromPoints([V(0,0,0)]),o=new T.Points(g,new T.PointsMaterial({color:0xfff3c6,size:3.5,sizeAttenuation:false,transparent:true,depthTest:false,depthWrite:false}));o.frustumCulled=false;scene.add(o);dots.push({o,r});}
 }
 let enabled=false,frame=0,pose,resize=true,dirty=true;const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const lerp=(a,b,t)=>a+(b-a)*t, blend=(a,b,t)=>a.map((x,i)=>lerp(x,b[i],t));
 function getPose(i){const keys=C.keys,k=keys.findIndex(x=>x[0]>=i),b=keys[Math.max(0,k)],a=keys[Math.max(0,k-1)],t=a===b?0:(i-a[0])/(b[0]-a[0]);return {yaw:lerp(a[1],b[1],t),s:blend(a[2],b[2],t),p:blend(a[3],b[3],t),e:blend(a[4],b[4],t),f:blend(a[5],b[5],t),base:blend(a[6],b[6],t),visibility:lerp(a[7],b[7],t),aperture:blend(a[8],b[8],t)};}
 const markers=root.querySelector('#r360-opticalMarkers');
 for(const [id,label] of [['f','筒口'],['p','主镜'],['s','副镜'],['e','目镜内焦点'],['base','底座轴']]){const el=document.createElement('span');el.dataset.marker=id;el.textContent=label;markers.append(el);}
 function setFrame(i){frame=Math.max(0,Math.min(71,i|0));pose=getPose(frame);dirty=true;update();}
 function update(){toggle.setAttribute('aria-label',enabled?'隐藏光路':'显示光路');toggle.setAttribute('aria-pressed',enabled);legend.hidden=!enabled;
  description.textContent=!enabled?'光路关闭 · 点击“显示光路”查看两次反射。':pose.visibility<.08?'该视角的内部结构被遮挡，隐藏光路。':frame>=17&&frame<=23?'前端视角 · 只显示入光口内可见的光路。':'教学近轴示意 · 主镜会聚 → 斜副镜折转 → 目镜通道。';
  toggle.title=enabled?description.textContent:'显示光路';
  root.querySelector('#r360-calFrame').textContent=`第 ${frame+1} 帧 · 估计方位 ${pose.yaw.toFixed(1)}°`;
 }
 function fit(){
  // Pose-dependent transverse direction from a tilted tube rotating around world Y.
  // The two measured image axes replace the ideal camera axes (affine residual
  // correction for artwork drift); no individual ray endpoint is moved.
  const yaw=(pose.yaw-12)*Math.PI/180,tilt=C.elevation*Math.PI/180;
  const X=V(Math.cos(tilt)*Math.cos(yaw),-Math.sin(tilt),Math.cos(tilt)*Math.sin(yaw));
  const Y=V(Math.sin(tilt)*Math.cos(yaw),Math.cos(tilt),Math.sin(tilt)*Math.sin(yaw));
  const Z=X.clone().cross(Y);
  const px=(pose.p[0]-pose.s[0])/C.primaryX,py=(pose.p[1]-pose.s[1])/C.primaryX;
  const ex=(pose.e[0]-pose.s[0])/focusY,ey=(pose.e[1]-pose.s[1])/focusY;
  const scale=Math.hypot(ex,ey),zx=Z.x*scale,zy=-Z.y*scale;
  camera.projectionMatrix.set(2*px/C.width,2*ex/C.width,2*zx/C.width,2*pose.s[0]/C.width-1,-2*py/C.height,-2*ey/C.height,-2*zy/C.height,1-2*pose.s[1]/C.height,0,0,0,0,0,0,0,1);
  for(const el of markers.children){const p=pose[el.dataset.marker];el.style.left=100*p[0]/C.width+'%';el.style.top=100*p[1]/C.height+'%';}
  if(frame>=17&&frame<=23){const [x,y,rx,ry]=pose.aperture;canvas.style.clipPath=`ellipse(${100*rx/C.width}% ${100*ry/C.height}% at ${100*x/C.width}% ${100*y/C.height}%)`;}else canvas.style.clipPath='none';
 }
 function paint(t){if(resize){const b=photo.getBoundingClientRect();renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(b.width,b.height,false);resize=false;dirty=true;}
  if(!dirty&&(!enabled||pose.visibility<=.01||reduce.matches))return;
  if(dirty)fit();const alpha=enabled?pose.visibility:0;
  for(const [i,l] of lines.entries()){l.visible=alpha>.01;l.material.opacity=alpha*(i%3===2?.98:.82);}
  for(const [i,{o,r}] of dots.entries()){o.visible=alpha>.15&&!reduce.matches;o.material.opacity=alpha;const u=(t/3100+i*.43)%1;const ps=r.points, lens=ps.slice(1).map((v,j)=>v.distanceTo(ps[j]));let d=u*lens.reduce((a,b)=>a+b,0),j=0;while(j<2&&d>lens[j])d-=lens[j++];o.position.copy(ps[j]).lerp(ps[j+1],d/lens[j]);}
  renderer.render(scene,camera);dirty=false;
 }
 function flip(){enabled=!enabled;dirty=true;update();}
 toggle.onclick=flip;debugBox.ontoggle=()=>{markers.hidden=!debugBox.open;dirty=true};const observer=new ResizeObserver(()=>resize=true);observer.observe(photo);
 setFrame(0);return {setFrame,paint,toggle:flip,dispose(){observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});renderer.dispose();renderer.forceContextLoss();},getDebug:()=>({frame,pose,enabled,rayCount:rays.length,hits:rays.map(r=>r.points.slice(1).map(p=>p.toArray()))})};
}
window.Newton.rotationOptics={create};
})();

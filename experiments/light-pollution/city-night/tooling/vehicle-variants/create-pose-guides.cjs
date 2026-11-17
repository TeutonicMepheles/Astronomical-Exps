/* Offline sprite bake: three local vehicle meshes, each with 36 azimuths x 7 elevations.
 * No runtime 3D dependency. Frame coordinates use the ground centre as pivot. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),crypto=require('crypto');
(async()=>{const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();const data=await page.evaluate(()=>{
 const variants=[
 {id:'sedan',name:'普通轿车',scale:24,halfWidth:.96,halfLength:1.96,height:1.405,lampSide:.54,lampHeight:.615,frontZ:1.958,rearZ:-1.908},
 {id:'suv',name:'SUV',scale:20,halfWidth:1.02,halfLength:2.25,height:1.85,lampSide:.70,lampHeight:.72,frontZ:2.255,rearZ:-2.255},
 {id:'bus',name:'公交车',scale:11,halfWidth:1.12,halfLength:4.25,height:3.0,lampSide:.82,lampHeight:.70,frontZ:4.255,rearZ:-4.255}
 ];
 const meshes=[];
 const N=36,P=7,F=128,C=16,pivot=[64,90],canvas=document.createElement('canvas');canvas.width=C*F;canvas.height=variants.length*16*F;const ctx=canvas.getContext('2d');
 for(const [variantIndex,variant] of variants.entries()){
 const scale=variant.scale;
 const faces=[];const face=(pts,color)=>faces.push({pts,color});
 // Sedan: chamfered lower hull, hood, boot and a glazed cabin.
 // Explicit symmetric rings, ordered around the car.
 function shell(a,b,colors){for(let i=0;i<a.length;i++){const j=(i+1)%a.length;face([a[i],a[j],b[j],b[i]],colors[i%colors.length])}face(b,'#647186')}
 if(variant.id==='sedan'){
 const bottom=[[-.75,.30,-1.9],[.75,.30,-1.9],[.87,.33,-1.5],[.87,.33,1.5],[.72,.34,1.95],[-.72,.34,1.95],[-.87,.33,1.5],[-.87,.33,-1.5]];
 const belt=bottom.map(([x,y,z])=>[x*.98,.73,z*.99]);shell(bottom,belt,['#343f51','#465267','#536078','#4e5c72']);
 const cabinBase=[[-.80,.75,-1.35],[.80,.75,-1.35],[.80,.75,.92],[-.80,.75,.92]],roof=[[-.61,1.39,-.88],[.61,1.39,-.88],[.61,1.39,.34],[-.61,1.39,.34]];shell(cabinBase,roof,['#202c3e','#25364a','#273b51','#202f43']);
 face([[-.62,1.405,-.88],[.62,1.405,-.88],[.62,1.405,.34],[-.62,1.405,.34]],'#69788f');
 // Pillars, window split and door seams sit on the cabin sides.
 for(const side of [-1,1]){
  face([[side*.808,.77,-.35],[side*.62,1.39,-.35],[side*.62,1.39,-.25],[side*.808,.77,-.25]],'#68758a');
  face([[side*.875,.38,-.32],[side*.875,.72,-.32],[side*.875,.72,-.30],[side*.875,.38,-.30]],'#303c4e');
  face([[side*.882,.64,.08],[side*.882,.64,.29],[side*.882,.67,.29],[side*.882,.67,.08]],'#8a93a2');
  // Tyres and hubs, axis across the car.
  for(const z of [-1.25,1.27]){const x=side*.88,r=.35,cy=.35;for(let j=0;j<16;j++){const a=j*Math.PI/8,b=(j+1)*Math.PI/8;face([[x-side*.11,cy+Math.sin(a)*r,z+Math.cos(a)*r],[x+side*.07,cy+Math.sin(a)*r,z+Math.cos(a)*r],[x+side*.07,cy+Math.sin(b)*r,z+Math.cos(b)*r],[x-side*.11,cy+Math.sin(b)*r,z+Math.cos(b)*r]],'#131a25')}
   for(const [radius,col,dx] of [[r,'#17202d',.075],[r*.65,'#778092',.08],[r*.25,'#3c485b',.085]])face(Array.from({length:16},(_,j)=>[x+side*dx,cy+Math.sin(j*Math.PI/8)*radius,z+Math.cos(j*Math.PI/8)*radius]),col);
  }
 }
 // Small physical lamps, not baked glare. Light controls remain independent.
 for(const end of [-1,1])for(const side of [-1,1]){const z=end>0?1.956:-1.906;face([[side*.68,.55,z],[side*.39,.55,z],[side*.39,.68,z],[side*.68,.68,z]],end>0?'#d1c8a5':'#8b3035')}
 face([[-.36,.40,1.96],[.36,.40,1.96],[.36,.51,1.96],[-.36,.51,1.96]],'#182333');
 }else{
  // SUV and city bus have independent silhouettes, proportions, windows and axles.
  const bus=variant.id==='bus',w=variant.halfWidth-.04,L=variant.halfLength,h=variant.height;
  const body=bus?['#385961','#4d7980','#749c9f','#40666e']:['#533a43','#74515a','#8a6068','#60434c'];
  const ring=(width,y,front,rear)=>[[-width,y,-rear],[width,y,-rear],[width,y,front],[-width,y,front]];
  shell(ring(w,.38,L,L),ring(w,h*.44,L,L),body);
  shell(ring(w,h*.44,L-(bus?0:.60),L-(bus?0:.18)),ring(w*.86,h,L-(bus?.12:.96),L-(bus?.12:.38)),['#233442','#203544','#263d48','#233442']);
  face(ring(w*.86,h+.008,L-(bus?.12:.96),L-(bus?.12:.38)),bus?'#9eafb1':'#986d74');
  for(const side of [-1,1]){
   const zFront=bus?L-.12:L-.96,zBack=bus?-L+.12:-L+.38;
   const splits=bus?8:3;
   for(let j=0;j<=splits;j++){const z=zBack+(zFront-zBack)*j/splits;face([[side*w,h*.46,z],[side*w*.86,h,z],[side*w*.86,h,z+.065],[side*w,h*.46,z+.065]],bus?'#8ba4a6':'#73545c');}
   if(bus){
    // Pale lower band and distinct two-leaf front passenger door.
    face([[side*(w+.005),.90,-L],[side*(w+.005),1.20,-L],[side*(w+.005),1.20,L],[side*(w+.005),.90,L]],'#c2c8be');
    if(side===1)for(const z of [2.9,3.43])face([[w+.012,.43,z],[w*.89,2.6,z],[w*.89,2.6,z+.46],[w+.012,.43,z+.46]],'#243b44');
   }
   const wheelZ=bus?[-2.65,2.65]:[-1.48,1.48],r=bus?.48:.40;
   for(const z of wheelZ){const x=side*(w+.025);for(const [radius,col,offset] of [[r,'#111b26',0],[r*.59,'#899197',.015],[r*.26,'#3b4b55',.022]])face(Array.from({length:20},(_,j)=>[x+side*offset,r+Math.sin(j*Math.PI/10)*radius,z+Math.cos(j*Math.PI/10)*radius]),col);}
  }
  for(const end of [-1,1])for(const side of [-1,1]){const z=end>0?variant.frontZ:variant.rearZ,x=side*variant.lampSide,y=variant.lampHeight;face([[x-.16,y-.07,z],[x+.16,y-.07,z],[x+.16,y+.07,z],[x-.16,y+.07,z]],end>0?'#d1c8a5':'#8b3035');}
  if(bus){
   face([[-.72,2.55,L+.012],[.72,2.55,L+.012],[.72,2.82,L+.012],[-.72,2.82,L+.012]],'#182b32');
   // Small amber route display marks, baked locally without a runtime font.
   for(let i=0;i<5;i++)face([[-.52+i*.19,2.62,L+.02],[-.42+i*.19,2.62,L+.02],[-.42+i*.19,2.73,L+.02],[-.52+i*.19,2.73,L+.02]],'#bda36b');
  }
 }
 // Retain generated painting as a projective material on continuous geometry.
 const vertices=[];
 for(const f of faces){
  const a=f.pts[0],b=f.pts[1],c=f.pts[2],u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
  const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),center=f.pts.reduce((s,p)=>s.map((v,i)=>v+p[i]/f.pts.length),[0,0,0]);
  const yaw=axis===0?(center[0]>0?Math.PI/2:Math.PI*1.5):axis===2?(center[2]>0?0:Math.PI):Math.PI/2;
  const pitch=(axis===1?60:40)*Math.PI/180,tilePitch=axis===1?2:1,tileYaw=Math.round(yaw/(2*Math.PI)*12)%12,tile=variantIndex*48+tilePitch*12+tileYaw;
  const color=[1,3,5].map(i=>parseInt(f.color.slice(i,i+2),16)/255);
  const vertex=p=>{const [x,y,z]=p,px=64+variant.scale*(Math.cos(yaw)*x-Math.sin(yaw)*z),py=90-variant.scale*(Math.cos(pitch)*y-Math.sin(pitch)*(Math.sin(yaw)*x+Math.cos(yaw)*z));return [...p,(tile%16+px/128)/16,(Math.floor(tile/16)+py/128)/9,...color]};
  for(let i=1;i<f.pts.length-1;i++)for(const p of [f.pts[0],f.pts[i],f.pts[i+1]])vertices.push(...vertex(p));
 }
 meshes.push({id:variant.id,vertices:vertices.map(v=>Math.round(v*1e6)/1e6)});
 for(let pitch=0;pitch<P;pitch++)for(let yaw=0;yaw<N;yaw++){
  const a=yaw*2*Math.PI/N,e=pitch*10*Math.PI/180,sa=Math.sin(a),ca=Math.cos(a),se=Math.sin(e),ce=Math.cos(e),idx=variantIndex*256+pitch*N+yaw,ox=(idx%C)*F,oy=Math.floor(idx/C)*F;
  function project([x,y,z]){return [pivot[0]+scale*(ca*x-sa*z),pivot[1]-scale*(ce*y-se*(sa*x+ca*z)),ce*(sa*x+ca*z)+se*y]}
  const sorted=faces.map(f=>({...f,p:f.pts.map(project)})).sort((a,b)=>a.p.reduce((s,v)=>s+v[2],0)/a.p.length-b.p.reduce((s,v)=>s+v[2],0)/b.p.length);
  ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.rect(0,0,F,F);ctx.clip();for(const f of sorted){ctx.beginPath();f.p.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.color;ctx.lineWidth=.35;ctx.stroke()}ctx.restore();

 }
 }
 const guides=variants.map((v,vi)=>{const sheet=document.createElement('canvas');sheet.width=sheet.height=2048;const g=sheet.getContext('2d');for(let p=0;p<3;p++)for(let y=0;y<12;y++){const tile=vi*256+(p*2+2)*36+y*3;g.drawImage(canvas,(tile%16)*128,Math.floor(tile/16)*128,128,128,Math.floor((y%6)*2048/6),Math.floor((p*2+Math.floor(y/6))*2048/6),340,340)}return {id:v.id,png:sheet.toDataURL()}});
 return {meshes,guides,layout:{frameSize:F,columns:C,yawCount:N,pitchCount:P,pitchStep:10,pivot,scale:24,rows:variants.length*16,variants:variants.map((v,i)=>({...v,tileOffset:i*256}))}};
});
 const dest=path.resolve(process.argv[2]||__dirname);if(process.argv.includes('--mesh')){const manifestFile=path.resolve(__dirname,'../../runtime-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));manifest.vehicleMeshes=data.meshes;fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');console.log('Updated continuous painted vehicle geometry');return;}fs.mkdirSync(dest,{recursive:true});for(const guide of data.guides)fs.writeFileSync(path.join(dest,guide.id+'-pose-guide.png'),Buffer.from(guide.png.split(',')[1],'base64'));fs.writeFileSync(path.join(dest,'guide-layout.json'),JSON.stringify(data.layout,null,2));console.log('Created pose guides only; runtime assets are unchanged');
}finally{await browser.close()}})();

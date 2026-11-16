/* Offline sprite bake: one shared car mesh, 36 azimuths x 7 elevations.
 * No runtime 3D dependency. Frame coordinates use the ground centre as pivot. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),crypto=require('crypto');
(async()=>{const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();const data=await page.evaluate(()=>{
 const N=36,P=7,F=128,C=16,scale=24,pivot=[64,90],canvas=document.createElement('canvas');canvas.width=C*F;canvas.height=Math.ceil(N*P/C)*F;const ctx=canvas.getContext('2d');
 const faces=[];const face=(pts,color)=>faces.push({pts,color});
 // Sedan: chamfered lower hull, hood, boot and a glazed cabin.
 // Explicit symmetric rings, ordered around the car.
 function shell(a,b,colors){for(let i=0;i<a.length;i++){const j=(i+1)%a.length;face([a[i],a[j],b[j],b[i]],colors[i%colors.length])}face(b,'#647186')}
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
 for(let pitch=0;pitch<P;pitch++)for(let yaw=0;yaw<N;yaw++){
  const a=yaw*2*Math.PI/N,e=pitch*10*Math.PI/180,sa=Math.sin(a),ca=Math.cos(a),se=Math.sin(e),ce=Math.cos(e),idx=pitch*N+yaw,ox=(idx%C)*F,oy=Math.floor(idx/C)*F;
  function project([x,y,z]){return [pivot[0]+scale*(ca*x-sa*z),pivot[1]-scale*(ce*y-se*(sa*x+ca*z)),ce*(sa*x+ca*z)+se*y]}
  const sorted=faces.map(f=>({...f,p:f.pts.map(project)})).sort((a,b)=>a.p.reduce((s,v)=>s+v[2],0)/a.p.length-b.p.reduce((s,v)=>s+v[2],0)/b.p.length);
  ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.rect(0,0,F,F);ctx.clip();for(const f of sorted){ctx.beginPath();f.p.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.color;ctx.lineWidth=.35;ctx.stroke()}ctx.restore();

 }
 return {png:canvas.toDataURL(),layout:{frameSize:F,columns:C,yawCount:N,pitchCount:P,pitchStep:10,pivot,scale}};
});
 const file=path.join(__dirname,'assets/car-angles.png');fs.writeFileSync(file,Buffer.from(data.png.split(',')[1],'base64'));const manifestFile=path.join(__dirname,'runtime-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));const index=manifest.runtime.findIndex(r=>r.name==='car-angles'),entry={name:'car-angles',path:'assets/car-angles.png',provenance:'Local procedural sedan; bake-car-sprites.cjs; no external model',crop:[0,0,1,1],sourceSize:[2048,2048],sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),...data.layout};if(index<0)manifest.runtime.push(entry);else manifest.runtime[index]=entry;fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');console.log('Baked 252 perspective frames');
}finally{await browser.close()}})();

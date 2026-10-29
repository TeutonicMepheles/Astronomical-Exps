/* Local candidate assembly. Originals remain untouched; enclosed white gaps in ground railings and trees are also keyed. */
window.loadCandidateScene=async function(W,H){
 const root='../assets/libtv-composite-options-20261027/panorama/';
 const choices=LightPollution.candidateLayers;
 const make=(w=W,h=H)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 const surfaces={},objects=[],registrations={};
 function transparent(im,holes){
  const c=make(im.width,im.height),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height),a=d.data,n=c.width*c.height,seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
  const visit=p=>{if(p<0||p>=n||seen[p])return;const i=p*4;if(Math.min(a[i],a[i+1],a[i+2])<235||Math.max(a[i],a[i+1],a[i+2])-Math.min(a[i],a[i+1],a[i+2])>15)return;seen[p]=1;queue[tail++]=p;};
  for(let x=0;x<c.width;x++){visit(x);visit(n-c.width+x);}for(let y=0;y<c.height;y++){visit(y*c.width);visit((y+1)*c.width-1);}
  while(head<tail){const p=queue[head++],x=p%c.width;visit(p-c.width);visit(p+c.width);if(x)visit(p-1);if(x<c.width-1)visit(p+1);a[p*4+3]=0;}
  if(holes)for(let p=0;p<n;p++){const i=p*4;if(Math.min(a[i],a[i+1],a[i+2])>=235&&Math.max(a[i],a[i+1],a[i+2])-Math.min(a[i],a[i+1],a[i+2])<=15){a[i+3]=0;seen[p]=1;}}
  let x0=c.width,y0=c.height,x1=0,y1=0;for(let p=0;p<n;p++)if(a[p*4+3]){const x=p%c.width,y=Math.floor(p/c.width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  // Remove the white matte from edge samples, using nearby interior color as an estimate.
  const rgb=new Uint8ClampedArray(a);
  for(let p=0;p<n;p++){if(!a[p*4+3])continue;const x=p%c.width,y=Math.floor(p/c.width);let edge=false,best=p,score=765;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(x+dx<0||x+dx>=c.width||y+dy<0||y+dy>=c.height)continue;const j=(y+dy)*c.width+x+dx;if(seen[j])edge=true;else{const sum=rgb[j*4]+rgb[j*4+1]+rgb[j*4+2];if(sum<score){score=sum;best=j;}}}
   if(!edge)continue;let alpha=0;for(let k=0;k<3;k++)alpha=Math.max(alpha,(255-rgb[p*4+k])/Math.max(1,255-rgb[best*4+k]));alpha=Math.max(0,Math.min(1,alpha));a[p*4+3]=Math.round(alpha*255);for(let k=0;k<3;k++)a[p*4+k]=alpha?Math.max(0,(rgb[p*4+k]-255*(1-alpha))/alpha):0;
  }
  g.putImageData(d,0,0);return {canvas:c,b:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1}};
 }
 await Promise.all(choices.map(async([id,label,file,x,bottom,width])=>{
  const im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(Error('候选资源加载失败：'+file));im.src=window.LIB_STATIC_ASSETS?.[root+file+'.png']||root+file+'.png';});
  const {canvas,b}=transparent(im,id==='trees'||id==='ground'),s=width/b.w,y=bottom-b.h*s,c=make(),g=c.getContext('2d');
  if(id==='front-water')g.drawImage(canvas,0,b.y+b.h-92,Math.min(W,canvas.width),92,0,632,Math.min(W,canvas.width),92);
  else g.drawImage(canvas,b.x,b.y,b.w,b.h,x,y,b.w*s,b.h*s);
  // One extra edge pixel closes the 2171px source / 2172px editor seam.
  if(width===2171)g.drawImage(c,2170,0,1,H,2171,0,1,H);
  surfaces[id]=c;registrations[id]={source:file+'.png',sourceBounds:b,x,y,scale:s};
 }));
 // Quads are normalized against each building's visible bounds, then placed with its sprite.
 const quads={residential:[
  [.057,.19,.145,.185,.145,.329,.057,.333],[.2,.17,.34,.18,.34,.329,.2,.327],
  [.72,.258,.866,.281,.866,.392,.72,.38],[.057,.407,.096,.405,.096,.505,.057,.505],
  [.2,.378,.34,.387,.34,.519,.2,.519],[.72,.44,.866,.46,.866,.555,.72,.549],
  [.057,.597,.096,.594,.096,.692,.057,.694],[.2,.572,.34,.58,.34,.713,.2,.714],
  [.72,.61,.866,.625,.866,.727,.72,.722],[.207,.753,.391,.755,.391,.998,.207,.998],
  [.719,.765,.87,.771,.87,.997,.719,.997]
 ],public:[[.045,.442,.199,.335,.199,.931,.045,.932],[.254,.477,.49,.543,.49,.929,.254,.931],[.595,.503,.727,.554,.727,.93,.595,.929],[.742,.557,.792,.578,.792,.931,.742,.931],[.903,.551,.99,.593,.99,.931,.903,.929]],'ad-building':[[.34,.121,.973,.196,.973,.515,.34,.461],
 [.075,.385,.21,.32,.21,.535,.075,.575],[.075,.59,.21,.545,.21,.70,.075,.74],[.075,.795,.21,.77,.21,.975,.075,.975],
 [.35,.53,.52,.54,.52,.705,.35,.695],[.575,.545,.74,.555,.74,.72,.575,.71],[.81,.56,.94,.57,.94,.73,.81,.72],
 [.35,.76,.52,.765,.52,.98,.35,.98],[.575,.775,.78,.785,.78,.985,.575,.985],[.82,.785,.94,.79,.94,.985,.82,.985]]};
 for(const [parent,list]of Object.entries(quads)){
  const r=registrations[parent],surface=surfaces[parent],g=surface.getContext('2d',{willReadFrequently:true});
  const source=g.getImageData(0,0,W,H).data;
  list.forEach((values,i)=>{
   const corners=Array.from({length:4},(_,j)=>[r.x+values[j*2]*r.sourceBounds.w*r.scale,r.y+values[j*2+1]*r.sourceBounds.h*r.scale]);
   const texture=make(256,256),tg=texture.getContext('2d'),pixels=tg.createImageData(256,256);
   // Rectify the quadrilateral using its projective map, inverse of the renderer's mapping.
   const [a,b,c,d]=corners,dx=a[0]-b[0]+c[0]-d[0],dy=a[1]-b[1]+c[1]-d[1],bx=b[0]-c[0],by=b[1]-c[1],cx=d[0]-c[0],cy=d[1]-c[1],det=bx*cy-cx*by,k=(dx*cy-cx*dy)/det,l=(bx*dy-dx*by)/det;
   for(let y=0;y<256;y++)for(let x=0;x<256;x++){const u=(x+.5)/256,v=(y+.5)/256,z=k*u+l*v+1,sx=((b[0]-a[0]+k*b[0])*u+(d[0]-a[0]+l*d[0])*v+a[0])/z,sy=((b[1]-a[1]+k*b[1])*u+(d[1]-a[1]+l*d[1])*v+a[1])/z,p=(Math.max(0,Math.min(H-1,Math.floor(sy)))*W+Math.max(0,Math.min(W-1,Math.floor(sx))))*4,q=(y*256+x)*4;pixels.data.set(source.subarray(p,p+4),q);}
   tg.putImageData(pixels,0,0);
   const billboard=parent==='ad-building'&&i===0;objects.push({id:billboard?'billboard':parent+'-window-'+i,parent,type:billboard?'billboard':'window',label:billboard?'广告大屏':(parent==='residential'?'住宅窗 ':parent==='ad-building'?'广告楼窗 ':'公共建筑窗 ')+(parent==='ad-building'?i:i+1),corners,texture});
   g.beginPath();corners.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle='#10162b';g.fill();
  });
 }
 return {surfaces,objects,registrations,specs:choices.map(([id,label],i)=>[id,label,i])};
};

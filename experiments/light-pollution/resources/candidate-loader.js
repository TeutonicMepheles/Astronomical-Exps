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
 function alphaBounds(im){const c=make(im.width,im.height),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data,n=c.width*c.height;let x0=c.width,y0=c.height,x1=0,y1=0;for(let p=0;p<n;p++)if(d[p*4+3]>8){const x=p%c.width,y=Math.floor(p/c.width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {canvas:c,b:x0<c.width?{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1}:{x:0,y:0,w:c.width,h:c.height}};}
 const darkFiles=[['stadium','09-stadium/02'],['viaduct','10-viaduct/02']];
 const darkImages=Object.fromEntries(darkFiles.map(([id,file])=>[id,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('候选资源加载失败：'+file));im.src=window.LIB_STATIC_ASSETS?.[root+file+'.png']||root+file+'.png';})]));
 await Promise.all(choices.map(async([id,label,file,x,bottom,width])=>{
  const im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(Error('候选资源加载失败：'+file));im.src=window.LIB_STATIC_ASSETS?.[root+file+'.png']||root+file+'.png';});
  const {canvas,b}=(id==='stadium'||id==='viaduct'?alphaBounds(im):transparent(im,id==='trees'||id==='ground')),s=width/b.w,y=bottom-b.h*s,c=make(),g=c.getContext('2d');
  if(id==='front-water')g.drawImage(canvas,b.x,b.y+b.h-92,b.w,92,x,bottom-92*s,width,92*s);
  else g.drawImage(canvas,b.x,b.y,b.w,b.h,x,y,b.w*s,b.h*s);
  surfaces[id]=c;registrations[id]={source:file+'.png',sourceBounds:b,x,y,scale:s};
 }));
 const dark={};
 await Promise.all(darkFiles.map(async([id])=>{const im=await darkImages[id],{canvas,b}=alphaBounds(im),r=registrations[id],c=make(),g=c.getContext('2d');g.drawImage(canvas,b.x,b.y,b.w,b.h,r.x,r.y,r.sourceBounds.w*r.scale,r.sourceBounds.h*r.scale);dark[id]=c;}));
 // Quads are normalized against each building's visible bounds, then placed with its sprite.
 const quads={residential:[
  [.241,.24,.271,.24,.271,.343,.241,.343],[.296,.232,.367,.232,.367,.349,.296,.349],[.387,.223,.4,.223,.4,.343,.387,.343],[.429,.338,.441,.338,.441,.402,.429,.402],[.503,.316,.557,.316,.557,.424,.503,.424],[.587,.337,.599,.337,.599,.406,.587,.406],
  [.241,.414,.254,.414,.254,.488,.241,.488],[.298,.402,.347,.402,.347,.515,.298,.515],[.387,.391,.4,.391,.4,.51,.387,.51],[.429,.492,.441,.492,.441,.557,.429,.557],[.503,.466,.557,.466,.557,.572,.503,.572],[.587,.482,.599,.482,.599,.551,.587,.551],
  [.241,.569,.254,.569,.254,.646,.241,.646],[.298,.561,.348,.561,.348,.675,.298,.675],[.387,.557,.4,.557,.4,.671,.387,.671],[.429,.647,.441,.647,.441,.713,.429,.713],[.503,.615,.557,.615,.557,.719,.503,.719],[.587,.627,.6,.627,.6,.696,.587,.696],
  [.241,.768,.27,.768,.27,.871,.241,.871],[.284,.714,.396,.714,.396,.926,.284,.926],[.429,.813,.441,.813,.441,.904,.429,.904],[.483,.762,.576,.762,.576,.946,.483,.946],[.589,.793,.599,.793,.599,.889,.589,.889]
 ],public:[
  [.134,.477,.245,.477,.245,.685,.134,.685],[.302,.495,.499,.495,.499,.685,.302,.685],[.47,.357,.516,.357,.516,.401,.47,.401],[.518,.362,.532,.362,.532,.617,.518,.617],[.581,.451,.678,.451,.678,.619,.581,.619],[.696,.44,.733,.44,.733,.582,.696,.582],[.826,.439,.891,.439,.891,.593,.826,.593]
 ],'ad-building':[
  [.53771,.26666,.79082,.17945,.78924,.38528,.53613,.48489],
  [.425,.331,.462,.331,.462,.475,.425,.475],[.466,.363,.487,.363,.487,.496,.466,.496],
  [.424,.465,.462,.465,.462,.598,.424,.598],[.466,.499,.487,.499,.487,.609,.466,.609],
  [.424,.623,.461,.623,.461,.795,.424,.795],[.465,.663,.487,.663,.487,.823,.465,.823],
  [.542,.513,.602,.513,.602,.645,.542,.645],[.631,.477,.689,.477,.689,.604,.631,.604],[.723,.444,.768,.444,.768,.561,.723,.561],
  [.542,.673,.603,.673,.603,.849,.542,.849],[.63,.625,.705,.625,.705,.804,.63,.804],[.728,.594,.768,.594,.768,.749,.728,.749]
 ]};
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
 return {surfaces,objects,registrations,dark,specs:choices.map(([id,label],i)=>[id,label,i])};
};

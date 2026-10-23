/* Production adapter of the approved parts-v2 preview: fixed hardware, invariant
 * silver strip, analytic front. The same curve supplies artwork and ray normals. */
(function(N){
 'use strict';
 const config=N.mirrorPartsConfig,ppu=125,axis=330,mmPerUnit=300,cache=new Map();
 const conic=(type,sag)=>{const p=config[type];return window.MirrorProfile.create(p.start,p.end,sag,'parabola',p.bendSign);};
 const focalFor=(p,sag)=>((p.end.x-p.start.x)**2+(p.end.y-p.start.y)**2)/(16*sag)/ppu*mmPerUnit;
 const limits=type=>{
  const p=config[type];if(!p)return {min:200,max:1200,initial:700};
  const min=Math.round(focalFor(p,p.maxSag));
  return {min,max:Math.round(focalFor(p,p.minSag)),initial:min};
 };
 const curve=(type,focal)=>{
  const key=type+'/'+focal;if(cache.has(key))return cache.get(key);
  const p=config[type],length=Math.hypot(p.end.x-p.start.x,p.end.y-p.start.y),f=focal/mmPerUnit*ppu,sag=length*length/(16*f);
  const registered=conic(type,sag),a=-p.bendSign/(4*f);
  // Image registration has a small tilt and an off-centre chord. It must not
  // tilt the bench's optical axis. Fit the same-curvature horizontal parabola
  // inside the approved front, leaving the rear band and hardware untouched.
  let vertexX=Infinity;
  for(let y=p.start.y;y<=p.end.y;y++)vertexX=Math.min(vertexX,registered.atY(y)-a*(y-axis)**2);
  const atY=y=>y<p.start.y||y>p.end.y?null:vertexX+a*(y-axis)**2;
  const result={sag,length,focalMagnitude:f,direction:p.bendSign,normal:{x:1,y:0},along:{x:0,y:1},vertex:{x:vertexX,y:axis},focus:{x:vertexX-p.bendSign*f,y:axis},start:{x:atY(p.start.y),y:p.start.y},end:{x:atY(p.end.y),y:p.end.y},atY};
  cache.set(key,result);if(cache.size>512)cache.delete(cache.keys().next().value);return result;
 };
 const toScene=(type,p)=>({x:(p.x-config[type].anchor)/ppu,y:(axis-p.y)/ppu});
 const surface=(type,focal,y)=>{
  const c=curve(type,focal),py=axis-y*ppu,x=c.atY(py);
  if(x===null)throw new RangeError('Ray is outside the approved mirror aperture');
  const slope=-c.direction*(py-axis)/(2*c.focalMagnitude),norm=Math.hypot(1,slope);
  return {x:(x-config[type].anchor)/ppu,y,normal:[1/norm,slope/norm]};
 };
 const focus=(type,focal)=>toScene(type,curve(type,focal).focus);
 N.mirrorParts={config,ppu,axis,limits,curve,surface,focus,toScene};
 N.MirrorPartsArt=class{
  constructor(onload){this.images={};this.sources={};for(const type of Object.keys(config)){
   this.images[type]={};for(const part of ['deformable','fixed']){const img=new Image();img.onload=onload;img.src=config[type][part].src;this.images[type][part]=img;}
  }}
  source(type){
   if(this.sources[type])return this.sources[type];
   const imgs=this.images[type];if(Object.values(imgs).some(i=>!i.complete||!i.naturalWidth))return null;
   const p=config[type],canvas=document.createElement('canvas');canvas.width=1672;canvas.height=941;
   const ctx=canvas.getContext('2d',{willReadFrequently:true}),m=p.deformable.transform;
   ctx.setTransform(m.a,m.b,-m.b,m.a,m.x,m.y);ctx.drawImage(imgs.deformable,0,0);ctx.resetTransform();
   const pixels=ctx.getImageData(0,0,1672,941).data,rows=[];
   const native=conic(type,p.nativeSag),spherical=window.MirrorProfile.create(p.start,p.end,p.nativeSag,'sphere',p.bendSign);
   for(let y=0;y<941;y++){
    let front=-1,rear=-1;for(let x=0;x<1672;x++)if(pixels[(y*1672+x)*4+3]>32){if(front<0)front=x;rear=x;}
    const row={front,rear};rows.push(row);if(front<0||y<p.start.y||y>p.end.y)continue;
    let seam=front+1,score=-Infinity;
    for(let x=front+Math.ceil((rear-front)*.4);x<=rear-9;x++){
     let drop=0;for(let k=1;k<=4;k++){const a=(y*1672+x-k)*4,b=(y*1672+x+k-1)*4;drop+=pixels[a]+pixels[a+1]-pixels[b]-pixels[b+1];}
     if(drop>score){score=drop;seam=x;}
    }
    row.colourSeam=seam;
    const available=Math.floor(rear-3-1.5-(Math.max(native.atY(y),spherical.atY(y))-front)-.1);
    row.seam=Math.min(seam+4,available);row.silverWidth=(row.seam-front)*(p.shape.silverWidthScale??1);
   }
   return this.sources[type]={canvas,rows,top:p.start.y,bottom:p.end.y+1,axis,anchor:p.anchor};
  }
  render(type,focal,canvas){
   const source=this.source(type);if(!source)return false;
   canvas.width=1672;canvas.height=941;const ctx=canvas.getContext('2d'),c=curve(type,focal);
   for(let y=0;y<941;y++){
    const row=source.rows[y];if(row.front<0)continue;const target=c.atY(y);
    if(target===null){ctx.drawImage(source.canvas,0,y,1672,1,0,y,1672,1);continue;}
    const seam=target+row.silverWidth,split=row.rear-3;
    if(split-seam<1.5-1e-6)throw new RangeError('Mirror curvature crosses the fixed rear band');
    ctx.drawImage(source.canvas,row.front,y,row.seam-row.front,1,target,y,row.silverWidth,1);
    ctx.drawImage(source.canvas,row.seam,y,split-row.seam,1,seam,y,split-seam,1);
    ctx.drawImage(source.canvas,split,y,1672-split,1,split,y,1672-split,1);
   }
   const m=config[type].fixed.transform;ctx.setTransform(m.a,m.b,-m.b,m.a,m.x,m.y);ctx.drawImage(this.images[type].fixed,0,0);ctx.resetTransform();return true;
  }
  contour(canvas){
   // Follow a filtered alpha isoline with subpixel interpolation. Joining the
   // samples into closed quadratic paths avoids disconnected pixel stair steps.
   const w=836,h=471,scratch=document.createElement('canvas');scratch.width=w;scratch.height=h;
   const ctx=scratch.getContext('2d');ctx.drawImage(canvas,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data;
   const horizontal=new Float32Array(w*h),alpha=new Float32Array(w*h);
   for(let y=0;y<h;y++)for(let x=1;x<w-1;x++){const i=y*w+x;horizontal[i]=(data[(i-1)*4+3]+2*data[i*4+3]+data[(i+1)*4+3])/4;}
   for(let y=1;y<h-1;y++)for(let x=0;x<w;x++){const i=y*w+x;alpha[i]=(horizontal[i-w]+2*horizontal[i]+horizontal[i+w])/4;}
   const threshold=64,nodes=new Map(),segments=new Map(),sx=canvas.width/w,sy=canvas.height/h;
   const point=(id,x1,y1,v1,x2,y2,v2)=>{
    if(!nodes.has(id)){const t=(threshold-v1)/(v2-v1);nodes.set(id,{x:(x1+(x2-x1)*t+.5)*sx,y:(y1+(y2-y1)*t+.5)*sy});}
    return id;
   };
   const link=(a,b)=>{if(!segments.has(a))segments.set(a,[]);if(!segments.has(b))segments.set(b,[]);segments.get(a).push(b);segments.get(b).push(a);};
   for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){
    const i=y*w+x,v=[alpha[i],alpha[i+1],alpha[i+w+1],alpha[i+w]],crossings=[];
    if((v[0]>=threshold)!==(v[1]>=threshold))crossings.push(point(i*2,x,y,v[0],x+1,y,v[1]));
    if((v[1]>=threshold)!==(v[2]>=threshold))crossings.push(point((i+1)*2+1,x+1,y,v[1],x+1,y+1,v[2]));
    if((v[3]>=threshold)!==(v[2]>=threshold))crossings.push(point((i+w)*2,x,y+1,v[3],x+1,y+1,v[2]));
    if((v[0]>=threshold)!==(v[3]>=threshold))crossings.push(point(i*2+1,x,y,v[0],x,y+1,v[3]));
    if(crossings.length===2)link(...crossings);
    else if(crossings.length===4){
     const insideCenter=(v[0]+v[1]+v[2]+v[3])/4>=threshold;
     if((v[0]>=threshold)===insideCenter){link(crossings[0],crossings[1]);link(crossings[2],crossings[3]);}
     else {link(crossings[0],crossings[3]);link(crossings[1],crossings[2]);}
    }
   }
   const visited=new Set(),paths=[],format=p=>p.x.toFixed(2)+','+p.y.toFixed(2),mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
   for(const start of segments.keys()){
    if(visited.has(start))continue;let previous=null,current=start;const loop=[];
    do {visited.add(current);loop.push(nodes.get(current));const next=segments.get(current).find(id=>id!==previous);previous=current;current=next;}while(current!==undefined&&current!==start&&!visited.has(current));
    if(current!==start||loop.length<8)continue;
    let area=0;for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length];area+=a.x*b.y-b.x*a.y;}if(Math.abs(area)<64)continue;
    // Resample at roughly 2 native pixels; quadratic joins preserve tight
    // mechanical corners while removing alpha noise on the long curved arcs.
    const points=[loop[0]];for(let i=1;i<loop.length;i++){const p=points.at(-1),q=loop[i];if(Math.hypot(q.x-p.x,q.y-p.y)>=2)points.push(q);}
    let path='M'+format(mid(points.at(-1),points[0]));
    for(let i=0;i<points.length;i++)path+='Q'+format(points[i])+' '+format(mid(points[i],points[(i+1)%points.length]));
    paths.push(path+'Z');
   }
   const path=paths.join(' ');
   return {viewBox:'0 0 1672 941',path};
  }
 };
})(window.Newton);

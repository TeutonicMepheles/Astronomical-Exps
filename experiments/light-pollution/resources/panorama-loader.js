/* Transparent cutouts use true alpha. Layout and quads are scene data, not panel state. */
window.loadPanoramaScene=async function(W,H){
 const root='../assets/panorama-20261111/',make=(w=W,h=H)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 const layout=window.LP_PANORAMA_LAYOUT||await fetch(root+'layout.json').then(r=>{if(!r.ok)throw Error('全景配置加载失败');return r.json();});
 if(layout.width!==W||layout.height!==H)throw Error('全景尺寸不匹配');
 function rectifyNative(native,corners,r){    const finalTexture=make(640,384);const [a,b,c,d]=corners,dx=a[0]-b[0]+c[0]-d[0],dy=a[1]-b[1]+c[1]-d[1],bx=b[0]-c[0],by=b[1]-c[1],cx=d[0]-c[0],cy=d[1]-c[1],det=bx*cy-cx*by,k=(dx*cy-cx*dy)/det,l=(bx*dy-dx*by)/det;const fg=finalTexture.getContext('2d'),out=fg.createImageData(640,384),src=native.pixels,nw=native.width,nh=native.height;
    // Rectify once from the native sprite, before its scene-sized rasterization.
    // Bilinear filtering uses premultiplied colors to avoid dark transparent fringes.
    for(let y=0;y<384;y++)for(let x=0;x<640;x++){const u=(x+.5)/640,v=(y+.5)/384,z=k*u+l*v+1,sx=(((b[0]-a[0]+k*b[0])*u+(d[0]-a[0]+l*d[0])*v+a[0])/z-r.x)/r.w*nw-.5,sy=(((b[1]-a[1]+k*b[1])*u+(d[1]-a[1]+l*d[1])*v+a[1])/z-r.y)/r.h*nh-.5,ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,t=(y*640+x)*4;let alpha=0,red=0,green=0,blue=0;
     for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const px=Math.max(0,Math.min(nw-1,ix+xx)),py=Math.max(0,Math.min(nh-1,iy+yy)),j=(py*nw+px)*4,w=(xx?fx:1-fx)*(yy?fy:1-fy)*src[j+3];alpha+=w;red+=src[j]*w;green+=src[j+1]*w;blue+=src[j+2]*w;}
     if(alpha){out.data[t]=red/alpha;out.data[t+1]=green/alpha;out.data[t+2]=blue/alpha;out.data[t+3]=alpha;}
    }fg.putImageData(out,0,0);return finalTexture;}
 const sourceImages=new Map(),nativeSources=new Map(),legacySources=new Map(),previousDefaults={...layout.previousDefaultObjectImages};
 const surfaces={},registrations={},objects=[],lightMasks={version:1,buildings:{},windows:{}};
 await Promise.all([...layout.layers,...(layout.stadiumParts||[]).filter(l=>l.id!=='stadium')].map(async l=>{const im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(Error('全景资源加载失败：'+l.file));im.src=window.LIB_STATIC_ASSETS?.[root+l.file]||root+l.file;});
  sourceImages.set(l.id,im);const height=l.height||l.width*im.height/im.width,c=make(),g=c.getContext('2d');g.save();if(l.colorGrade)g.filter='brightness('+l.colorGrade.brightness+') saturate('+l.colorGrade.saturation+')';if(l.id==='billboard'||l.id==='ad-building'){const old=make(),og=old.getContext('2d');og.filter=g.filter;og.drawImage(im,l.x,l.y,l.width,height);legacySources.set(l.id,og.getImageData(0,0,W,H).data);g.imageSmoothingQuality='high';}g.drawImage(im,l.x,l.y,l.width,height);g.restore();if(l.id==='environment'&&layout.skyline){const g=c.getContext('2d');g.save();g.globalCompositeOperation='destination-out';g.beginPath();g.moveTo(0,0);g.lineTo(W,0);for(const [x,y]of [...layout.skyline].reverse())g.lineTo(x*W/2048,y*H/512);g.closePath();g.fill();g.restore();}surfaces[l.id]=c;registrations[l.id]={x:l.x,y:l.y,w:l.width,h:height,lightAnchor:l.lightAnchor,lightFoot:l.lightFoot};
  if(l.lightMask){const mask=new Image();await new Promise((resolve,reject)=>{mask.onload=resolve;mask.onerror=()=>reject(Error('窗灯遮罩加载失败'));mask.src=window.LIB_STATIC_ASSETS?.[root+l.lightMask]||root+l.lightMask;});if(mask.width!==W||mask.height!==H)throw Error('窗灯遮罩尺寸不符');const m=make();m.getContext('2d').drawImage(mask,0,0);lightMasks.buildings[l.id]={name:l.lightMask,image:m.toDataURL()};registrations[l.id].mask=m;}
 }));
 const quads={residential:[
 [.12,.175,.23,.17,.23,.325,.12,.33],[.12,.37,.23,.37,.23,.51,.12,.51],[.12,.56,.23,.56,.23,.70,.12,.70],
 [.45,.21,.63,.235,.63,.365,.45,.34],[.45,.39,.63,.41,.63,.54,.45,.52],[.45,.565,.63,.585,.63,.72,.45,.70],
 [.80,.26,.965,.29,.965,.41,.80,.385],[.80,.44,.965,.465,.965,.585,.80,.56],[.80,.62,.965,.64,.965,.755,.80,.735],
 [.125,.76,.26,.76,.26,.985,.125,.985],[.45,.77,.63,.77,.63,.99,.45,.99],[.81,.795,.96,.795,.96,.985,.81,.985]],
 public:[[.145,.34,.25,.34,.25,.80,.145,.80],[.26,.34,.40,.34,.40,.80,.26,.80],[.41,.34,.49,.34,.49,.80,.41,.80],[.54,.36,.63,.36,.63,.80,.54,.80],[.64,.36,.735,.36,.735,.80,.64,.80]],
 'ad-building':[[.35,.115,.94,.165,.94,.49,.35,.45],[.35,.54,.51,.55,.51,.69,.35,.68],[.57,.55,.74,.56,.74,.70,.57,.69],[.83,.56,.93,.56,.93,.71,.83,.71],[.35,.79,.51,.79,.51,.97,.35,.97],[.57,.79,.74,.79,.74,.97,.57,.97],[.83,.79,.94,.79,.94,.97,.83,.97]],
 billboard:[[.04,.025,.65,.105,.65,.36,.04,.275],[.70,.105,.965,.025,.965,.265,.70,.36]]};
 const legacyBillboardQuads=quads.billboard.map(q=>[...q]);
 Object.assign(quads,layout.windowQuads||{});if(!layout.windowQuads?.billboard)quads.billboard=[[.057,.032,.628,.129,.628,.406,.065,.296],[.707,.124,.947,.021,.940,.276,.706,.406]];
 for(const [parent,list] of Object.entries(quads)){
  const r=registrations[parent],g=surfaces[parent].getContext('2d',{willReadFrequently:true}),source=legacySources.get(parent)||g.getImageData(0,0,W,H).data;
  list.forEach((q,i)=>{const corners=Array.from({length:4},(_,j)=>[r.x+q[j*2]*r.w,r.y+q[j*2+1]*r.h]),oldQ=parent==='billboard'?legacyBillboardQuads[i]:q,legacyCorners=Array.from({length:4},(_,j)=>[r.x+oldQ[j*2]*r.w,r.y+oldQ[j*2+1]*r.h]);
   const texture=make(256,256),tg=texture.getContext('2d'),pixels=tg.createImageData(256,256);
   const [a,b,c,d]=legacyCorners,dx=a[0]-b[0]+c[0]-d[0],dy=a[1]-b[1]+c[1]-d[1],bx=b[0]-c[0],by=b[1]-c[1],cx=d[0]-c[0],cy=d[1]-c[1],det=bx*cy-cx*by,k=(dx*cy-cx*dy)/det,l=(bx*dy-dx*by)/det;
   for(let y=0;y<256;y++)for(let x=0;x<256;x++){const u=(x+.5)/256,v=(y+.5)/256,z=k*u+l*v+1,sx=((b[0]-a[0]+k*b[0])*u+(d[0]-a[0]+l*d[0])*v+a[0])/z,sy=((b[1]-a[1]+k*b[1])*u+(d[1]-a[1]+l*d[1])*v+a[1])/z,p=(Math.max(0,Math.min(H-1,Math.floor(sy)))*W+Math.max(0,Math.min(W-1,Math.floor(sx))))*4;pixels.data.set(source.subarray(p,p+4),(y*256+x)*4);}
   tg.putImageData(pixels,0,0);const billboard=parent==='billboard'||parent==='ad-building'&&i===0;
   let finalTexture=texture;
   if(billboard){
    const id=parent==='ad-building'?'billboard':parent+'-face-'+i,legacy=[texture.toDataURL()];previousDefaults[id]=[...(previousDefaults[id]?[previousDefaults[id]]:[]),legacy,...(layout.previousBillboardImages?.[id]||[])];
    let native=nativeSources.get(parent);if(!native){const im=sourceImages.get(parent),c=make(im.width,im.height),g=c.getContext('2d',{willReadFrequently:true}),grade=layout.layers.find(l=>l.id===parent)?.colorGrade;if(grade)g.filter='brightness('+grade.brightness+') saturate('+grade.saturation+')';g.drawImage(im,0,0);native={pixels:g.getImageData(0,0,c.width,c.height).data,width:c.width,height:c.height};nativeSources.set(parent,native);}
    const previousTexture=rectifyNative(native,legacyCorners,r);previousDefaults[id].push([previousTexture.toDataURL()]);finalTexture=parent==='billboard'?rectifyNative(native,corners,r):previousTexture;
   }

   objects.push({previousDefaultCorners:parent==='billboard'?[legacyCorners]:undefined,geometryRevision:parent==='billboard'?2:layout.legacyReuseRevision&&['residential','public','ad-building'].includes(parent)?1:undefined,id:parent==='ad-building'&&i===0?'billboard':parent+(billboard?'-face-':'-window-')+i,parent,type:billboard?'billboard':'window',label:billboard?(parent==='billboard'?'三面广告牌 · '+(i+1):'广告楼大屏'):({'residential':'住宅窗','public':'公共建筑窗','ad-building':'广告楼窗'}[parent])+' '+(i+1),corners,curtainCorners:corners,texture:finalTexture,initialImage:billboard});
   if(!billboard){g.beginPath();corners.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle='#10162b';g.fill();}
  });
 }
 // Lighting zones retain the native building pixels; only the explicit pane mask is lit.
 const parent='residential-backdrop',r=registrations[parent];
 if(r?.mask){const pixels=r.mask.getContext('2d').getImageData(0,0,W,H).data;for(let i=0;i<3;i++){
  const x=r.x+r.w*i/3,w=r.w/3,corners=[[x,r.y],[x+w,r.y],[x+w,r.y+r.h],[x,r.y+r.h]],texture=make(256,256);texture.getContext('2d').drawImage(surfaces[parent],x,r.y,w,r.h,0,0,256,256);
  let emitterArea=0;for(let yy=Math.max(0,Math.floor(r.y));yy<Math.min(H,Math.ceil(r.y+r.h));yy++)for(let xx=Math.max(0,Math.ceil(x));xx<Math.min(W,Math.ceil(x+w));xx++)emitterArea+=pixels[(yy*W+xx)*4]/255;
  objects.push({id:parent+'-window-'+i,parent,type:'window',label:['中景住宅 · 左区','中景住宅 · 中区','中景住宅 · 右区'][i],corners,texture,lightRegion:true,emitterArea});
 }}
 const distant=registrations['distant-buildings'];if(distant?.mask){
  const {x,y,w,h,mask}=distant,texture=make(256,256);texture.getContext('2d').drawImage(surfaces['distant-buildings'],x,y,w,h,0,0,256,256);
  const pixels=mask.getContext('2d').getImageData(0,0,W,H).data;let emitterArea=0;for(let i=0;i<pixels.length;i+=4)emitterArea+=pixels[i]/255;
  objects.push({id:'distant-buildings-window-0',parent:'distant-buildings',type:'window',label:'远景建筑 · 整体窗光',corners:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],texture,lightRegion:true,emitterArea,ambientStrength:0});
 }
 const stadium=registrations.stadium;if(stadium?.mask){const {x,y,w,h}=stadium;const texture=make(256,256);texture.getContext('2d').drawImage(surfaces.stadium,x,y,w,h,0,0,256,256);const emission=createLightMask(surfaces.stadium).getContext('2d').getImageData(0,0,W,H).data;let emitterArea=0;for(let i=0;i<emission.length;i+=4)emitterArea+=emission[i]/255;objects.push({id:'stadium-window-0',parent:'stadium',type:'window',label:'体育场馆 · 照明',defaultTemperature:6500,preserveMaterial:true,lightingRevision:3,outlineEnabled:true,corners:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],texture,lightRegion:true,emitterArea,ambientStrength:.16,linkedAmbientStrength:.025,lightLinks:['floodlight-1','floodlight-2','floodlight-3','floodlight-4']});}
 for(let i=1;i<=5;i++){const parent='roadlamp-'+i,r=registrations[parent];if(!r?.mask)continue;const {x,y,w,h}=r,texture=make(256,256);texture.getContext('2d').drawImage(surfaces[parent],x,y,w,h,0,0,256,256);const pixels=r.mask.getContext('2d').getImageData(0,0,W,H).data;let emitterArea=0;for(let j=0;j<pixels.length;j+=4)emitterArea+=pixels[j]/255;objects.push({id:parent+'-window-0',parent,type:'window',label:'高架路灯 '+i,defaultTemperature:3500,corners:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],texture,lightRegion:true,emitterArea,ambientStrength:layout.legacyReuseRevision ? .06 : .025,linkedAmbientStrength:.85,lightLinks:['highway']});}
 nativeSources.clear();sourceImages.clear();legacySources.clear();
 let stadiumParts=null;if(layout.stadiumParts){stadiumParts=layout.stadiumParts.map(l=>({id:l.id,source:surfaces[l.id]}));const combined=make(),g=combined.getContext('2d');for(const part of stadiumParts)g.drawImage(part.source,0,0);surfaces.stadium=combined;}
 return {stadiumParts,surfaces,registrations,objects,lightMasks,previousDefaultImages:previousDefaults,hintContours:layout.hintContours||{},specs:layout.layers.map((l,i)=>[l.id,l.label,i])};
};

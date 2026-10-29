/* Building-local grayscale masks. Geometry comes from the original texture registration,
 * so masks follow the same parent transforms and window warps as the artwork. */
window.createBuildingLightMasks=function(W,H){
 'use strict';
 const groups=['residential','public','ad-building'],make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 const empty=()=>({version:1,buildings:{},windows:{}}),clone=v=>JSON.parse(JSON.stringify(v));
 const decoded=new Map(),pending=new Map(),fullCache=new Map(),windowCache=new Map(),sources=new Map();
 let state=empty(),definitions=[],originals=null,warp=null;
 const definition=id=>definitions.find(o=>o.id===id&&o.type==='window');
 const mapObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
 function pngDimensions(image){
  if(typeof image!=='string'||image.length>12000000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image))throw Error('遮罩必须是内嵌 PNG');
  let bytes;try{bytes=Uint8Array.from(atob(image.slice(image.indexOf(',')+1,image.indexOf(',')+1+44)),ch=>ch.charCodeAt(0));}catch{throw Error('遮罩 PNG 数据无效');}
  const signature=[137,80,78,71,13,10,26,10];
  if(bytes.length<24||signature.some((v,i)=>bytes[i]!==v)||String.fromCharCode(...bytes.slice(12,16))!=='IHDR')throw Error('遮罩 PNG 文件头无效');
  const data=new DataView(bytes.buffer);return [data.getUint32(16),data.getUint32(20)];
 }
 function validate(value){
  if(value===undefined)return empty();
  if(!mapObject(value)||value.version!==1||!mapObject(value.buildings)||!mapObject(value.windows))throw Error('光照遮罩配置无效');
  const result=empty();let total=0;
  for(const kind of ['buildings','windows'])for(const [id,entry]of Object.entries(value[kind])){
   if(kind==='buildings'?!groups.includes(id):!definition(id))throw Error('未知建筑或窗口遮罩');
   if(!mapObject(entry)||typeof entry.name!=='string'||entry.name.length>200)throw Error('遮罩名称无效');
   const [w,h]=pngDimensions(entry.image),expected=kind==='buildings'?[W,H]:[256,256];
   if(w!==expected[0]||h!==expected[1])throw Error(`遮罩尺寸须为 ${expected[0]} × ${expected[1]}，不会自动拉伸`);
   total+=entry.image.length;if(total>24000000)throw Error('遮罩数据总量超过 24 MB，请精简 PNG');
   result[kind][id]={name:entry.name,image:entry.image};
  }
  return result;
 }
 function gray(im){const c=make(im.width,im.height),g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){const v=Math.round(.2126*d.data[i]+.7152*d.data[i+1]+.0722*d.data[i+2]);d.data[i]=d.data[i+1]=d.data[i+2]=v;}g.putImageData(d,0,0);return c;}
 function decode(image){
  if(decoded.has(image))return Promise.resolve(decoded.get(image));if(pending.has(image))return pending.get(image);
  pngDimensions(image);
  const task=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const c=gray(im);decoded.set(image,c);resolve(c);};im.onerror=()=>reject(Error('无法解码遮罩 PNG，未应用'));im.src=image;});
  pending.set(image,task);task.finally(()=>pending.delete(image)).catch(()=>{});return task;
 }
 function preload(v){return Promise.all([...Object.values(v.buildings),...Object.values(v.windows)].map(e=>decode(e.image)));}
 function setData(v){state=validate(v);fullCache.clear();windowCache.clear();}
 function sample(im,q){
  const input=im.getContext('2d').getImageData(0,0,im.width,im.height).data,c=make(256,256),g=c.getContext('2d'),out=g.createImageData(256,256);
  const [a,b,cq,d]=q,dx=a[0]-b[0]+cq[0]-d[0],dy=a[1]-b[1]+cq[1]-d[1],bx=b[0]-cq[0],by=b[1]-cq[1],cx=d[0]-cq[0],cy=d[1]-cq[1],det=bx*cy-cx*by,k=(dx*cy-cx*dy)/det,l=(bx*dy-dx*by)/det;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const u=(x+.5)/256,v=(y+.5)/256,z=k*u+l*v+1,sx=Math.floor(((b[0]-a[0]+k*b[0])*u+(d[0]-a[0]+l*d[0])*v+a[0])/z),sy=Math.floor(((b[1]-a[1]+k*b[1])*u+(d[1]-a[1]+l*d[1])*v+a[1])/z),m=sx>=0&&sx<im.width&&sy>=0&&sy<im.height?input[(sy*im.width+sx)*4]:0,i=(y*256+x)*4;out.data[i]=out.data[i+1]=out.data[i+2]=m;out.data[i+3]=255;}
  g.putImageData(out,0,0);return c;
 }
 function fullMask(id,source){
  sources.set(id,source);const record=fullCache.get(id);if(record?.source===source)return record.mask;
  const building=state.buildings[id],overrides=definitions.filter(o=>o.parent===id&&state.windows[o.id]);
  if(!building&&!overrides.length)return null;
  const base=building?decoded.get(building.image):createLightMask(source);if(!base)return null;
  const c=make(W,H),g=c.getContext('2d');g.drawImage(base,0,0);
  for(const o of overrides){const im=decoded.get(state.windows[o.id].image);if(!im)continue;const placed=warp(im,o.corners);g.drawImage(placed.canvas,placed.x,placed.y);}
  fullCache.set(id,{source,mask:c});return c;
 }
 function windowMask(o){
  const own=state.windows[o.id];if(own)return decoded.get(own.image)||null;
  const building=state.buildings[o.parent],d=definition(o.id);if(!building||!d)return null;
  if(windowCache.has(o.id))return windowCache.get(o.id);const im=decoded.get(building.image);if(!im)return null;
  const c=sample(im,d.corners);windowCache.set(o.id,c);return c;
 }
 async function readFile(file,target){
  if(!file||file.type!=='image/png'||file.size>8000000)throw Error('请选择 8 MB 内的 PNG 遮罩');
  const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('遮罩文件读取失败'));reader.readAsDataURL(file);});
  const next=empty();next[target.kind][target.id]={name:file.name.slice(0,200),image};validate(next);
  const c=await decode(image),normalized=c.toDataURL('image/png');decoded.set(normalized,c);return {name:file.name.slice(0,200),image:normalized};
 }
 function exportMask(target){
  if(target.kind==='buildings'){const source=sources.get(target.id);if(!source)throw Error('请先显示该建筑，再导出遮罩');return fullMask(target.id,source)||createLightMask(source);}
  const d=definition(target.id),source=originals?.get(target.id)?.[0];if(!d||!source)throw Error('窗口素材尚未就绪');return windowMask(d)||createLightMask(source);
 }
 return {validate,preload,setData,readFile,fullMask,windowMask,exportMask,register(list,images,project){definitions=list;originals=images;warp=project;},getData:()=>clone(state)};
};

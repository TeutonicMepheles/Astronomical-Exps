/* Building/window pixels only; callers provide state and resources. */
window.createBuildingRenderer=function({W,H,getObjects,style,styleId,pictures,lightMasks,getLayer=()=>null}){
 const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const lighting=createMaskedLighting(),maskCache=new WeakMap(),baseCache=new Map(),windowCache=new Map(),curtainCache=new Map();
 let curtainTime=0;

 LightPollution.disposers.push(()=>{baseCache.clear();windowCache.clear();curtainCache.clear();});

 function resolvedMask(image,override){
  let mask=override||maskCache.get(image);
  if(!mask){mask=createLightMask(image);maskCache.set(image,mask);}
  return mask;
 }

 function masked(image,items,owner,override,ambient=0,preserveMaterial=false){
  return lighting.render(image,resolvedMask(image,override),items,owner,ambient,preserveMaterial);
 }

 function drawCurtain(context,curtain,object){
  const coverage=Math.max(0,Math.min(1,object.coverage/100));
  if(!coverage)return;
  const edge=256*(1-coverage),overlap=1.5,overscan=3;
  context.save();
  context.beginPath();
  context.rect(edge-overlap,-2,256-edge+overlap+2,260);
  context.clip();

  // An opaque underlay closes texture alpha and resampling gaps before fabric is drawn.
  context.fillStyle='#111827';
  context.fillRect(edge-overlap,-2,256-edge+overlap+2,260);
  const wind=object.windEnabled!==false&&!reduced.matches?object.windStrength??25:0,step=2;
  const speed=object.windSpeed??1;

  // The blackout underlay stays fixed while the visible fabric hem moves over it.
  // This makes the lower edge readable without reopening light leaks.
  context.save();
  context.beginPath();
  context.moveTo(edge-overlap,-2);
  context.lineTo(260,-2);
  for(let x=260;x>=edge-overlap;x-=12){
   const position=Math.max(0,Math.min(1,(x-edge)/Math.max(1,256-edge)));
   const flutter=LightPollution.curtainMotion(object.id+'-hem',curtainTime,position,wind,speed)*.42;
   const travelling=Math.sin(position*Math.PI*3+curtainTime*2.4*speed)*wind/22;
   context.lineTo(x,Math.max(242,Math.min(258,(wind?251:258)+flutter+travelling)));
  }
  context.closePath();
  context.clip();
  context.filter=`brightness(${.46+Math.min(2,object.brightness/100)*.16}) saturate(.84)`;

  for(let y=0;y<256;y+=step){
   const height=Math.min(step,256-y),position=y/255;
   const free=Math.max(0,Math.min(1,(position-.24)/.76));
   const release=free*free*(3-2*free);
   const offset=LightPollution.curtainMotion(object.id,curtainTime,position,wind,speed)*release;
   const sourceY=y/256*curtain.height;
   const sourceHeight=Math.max(1,height/256*curtain.height);
   context.drawImage(curtain,0,sourceY,curtain.width,sourceHeight,-overscan+offset,y,256+overscan*2,height+.35);
  }
  context.restore();
  context.restore();
 }

 function renderWindow(object,image){
  const mask=resolvedMask(image,lightMasks.windowMask(object)),key=object.brightness+':'+object.temperature;
  let cached=windowCache.get(object.id);
  if(!cached||cached.image!==image||cached.mask!==mask||cached.key!==key){
   const lit=make(256,256);
   lit.getContext('2d').drawImage(masked(image,[object],undefined,mask),0,0,256,256);
   cached={image,mask,key,lit,out:cached?.out||make(256,256)};
   windowCache.set(object.id,cached);
  }
  const context=cached.out.getContext('2d');
  context.clearRect(0,0,256,256);
  context.drawImage(cached.lit,0,0);
  return cached.out;
 }

 function renderCurtainLayer(object){
  let output=curtainCache.get(object.id);
  if(!output){output=make(256,256);curtainCache.set(object.id,output);}
  const context=output.getContext('2d');
  context.clearRect(0,0,256,256);
  if(object.coverage<=0)return output;
  const selected=style(styleId(object)),curtain=selected&&pictures.get(selected.image);
  if(curtain)drawCurtain(context,curtain,object);
  return output;
 }

 function renderBase(context,id,source,definitions,originals,warp){
  const list=getObjects().getData().items.filter(object=>(object.parent===id||object.lightLinks?.includes(id))&&object.type==='window');
  const visibleKey=list.map(object=>object.visible).join();
  let record=baseCache.get(id);
  if(!record||record.source!==source||record.visibleKey!==visibleKey){
   const full=make(W,H),fullContext=full.getContext('2d');
   fullContext.drawImage(source,0,0);
   for(const definition of definitions.filter(item=>!item.lightRegion&&item.parent===id&&list.find(object=>object.id===item.id)?.visible)){
    const result=warp(originals.get(definition.id)[0],definition.corners);
    fullContext.drawImage(result.canvas,result.x,result.y);
   }
   const owner=make(W,H),ownerContext=owner.getContext('2d'),pixels=ownerContext.createImageData(W,H);
   const centers=list.map(object=>{const definition=definitions.find(item=>item.id===object.id);return [definition.corners.reduce((sum,point)=>sum+point[0],0)/4,definition.corners.reduce((sum,point)=>sum+point[1],0)/4];});
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let nearest=0,distance=Infinity;
    centers.forEach((point,index)=>{const next=(x-point[0])**2+(y-point[1])**2;if(next<distance){distance=next;nearest=index;}});
    pixels.data[(y*W+x)*4]=nearest;
    pixels.data[(y*W+x)*4+3]=255;
   }
   ownerContext.putImageData(pixels,0,0);
   record={source,full,owner,visibleKey,key:'',output:make(W,H)};
   baseCache.set(id,record);
  }

  const key=JSON.stringify(list.map(object=>[object.brightness,object.temperature,object.coverage,object.material,object.parent!==id?getLayer(object.parent):null]));
  if(record.key!==key){
   record.key=key;
   const attenuated=list.map(object=>({...object,brightness:(object.lightRegion&&!object.visible?0:object.brightness)*(object.parent!==id?(getLayer(object.parent)?.visible===false?0:getLayer(object.parent)?.opacity??1):1)*LightPollution.curtainTransmission(object.coverage,object.material)}));
   const output=record.output.getContext('2d');
   output.clearRect(0,0,W,H);
   output.drawImage(masked(record.full,attenuated,record.owner,lightMasks.fullMask(id,record.full),list[0]?.parent===id?(list[0]?.ambientStrength||0):(list[0]?.linkedAmbientStrength||0),!!list[0]?.preserveMaterial),0,0);
  }
  context.drawImage(record.output,0,0);
 }

 return {
  renderWindow,
  renderCurtainLayer,
  renderBase,
  setMotionTime(time){curtainTime=time;},
  invalidate(){for(const record of baseCache.values())record.key=null;windowCache.clear();curtainCache.clear();}
 };
};

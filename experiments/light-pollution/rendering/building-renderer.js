/* Building/window pixels only; callers provide state and resources. */
window.createBuildingRenderer=function({W,H,getObjects,style,styleId,pictures,lightMasks}){
 const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),lighting=createMaskedLighting(),maskCache=new WeakMap(),baseCache=new Map(),windowCache=new Map();
 LightPollution.disposers.push(()=>{baseCache.clear();windowCache.clear();});
 function masked(im,items,owner,override){let mask=override||maskCache.get(im);if(!mask){mask=createLightMask(im);maskCache.set(im,mask);}return lighting.render(im,mask,items,owner);}
 let curtainTime=0;
 function renderWindow(o,im){const mask=lightMasks.windowMask(o),key=o.brightness+':'+o.temperature;let cached=windowCache.get(o.id);if(!cached||cached.im!==im||cached.mask!==mask||cached.key!==key){const lit=make(256,256);lit.getContext('2d').drawImage(masked(im,[o],undefined,mask),0,0,256,256);cached={im,mask,key,lit,out:cached?.out||make(256,256)};windowCache.set(o.id,cached);}const out=cached.out,c=out.getContext('2d');c.clearRect(0,0,256,256);c.drawImage(cached.lit,0,0);if(o.coverage>0){const curtain=pictures.get(style(styleId(o)).image);if(curtain){c.save();c.beginPath();c.rect(256*(1-o.coverage/100),0,256*o.coverage/100,256);c.clip();c.filter=`brightness(${.45+o.brightness/100*(o.material==='linen'?.55:.2)})`;const sway=LightPollution.curtainMotion(o.id,curtainTime);
 // Sample the fabric in narrow rows: upper 70% fixed, lower folds gently drift.
 // Overscan keeps the coverage silhouette closed even at 100%.
 c.drawImage(curtain,0,0,curtain.width,curtain.height*.7,0,0,256,179.2);
 for(let y=179.2;y<256;y+=3.2){const h=Math.min(3.2,256-y),u=(y-179.2)/76.8,offset=sway*u*u;const sourceX=3*u*u-offset;
 c.drawImage(curtain,sourceX/256*curtain.width,y/256*curtain.height,(256-6*u*u)/256*curtain.width,h/256*curtain.height,0,y,256,h+.15);}
 c.restore();}}return out;}
 function renderBase(c,id,source,definitions,originals,warp){const list=getObjects().getData().items.filter(o=>o.parent===id&&o.type==='window'),visibleKey=list.map(o=>o.visible).join();let rec=baseCache.get(id);if(!rec||rec.source!==source||rec.visibleKey!==visibleKey){const full=make(W,H),g=full.getContext('2d');g.drawImage(source,0,0);for(const d of definitions.filter(o=>o.parent===id&&list.find(w=>w.id===o.id)?.visible)){const r=warp(originals.get(d.id)[0],d.corners);g.drawImage(r.canvas,r.x,r.y);}const owner=make(W,H),og=owner.getContext('2d'),pixels=og.createImageData(W,H),centers=list.map(o=>{const d=definitions.find(d=>d.id===o.id);return [d.corners.reduce((s,p)=>s+p[0],0)/4,d.corners.reduce((s,p)=>s+p[1],0)/4];});for(let y=0;y<H;y++)for(let x=0;x<W;x++){let nearest=0,dist=Infinity;centers.forEach((p,i)=>{const d=(x-p[0])**2+(y-p[1])**2;if(d<dist){dist=d;nearest=i;}});pixels.data[(y*W+x)*4]=nearest;pixels.data[(y*W+x)*4+3]=255;}og.putImageData(pixels,0,0);rec={source,full,owner,visibleKey,key:'',output:make(W,H)};baseCache.set(id,rec);}const key=JSON.stringify(list.map(o=>[o.brightness,o.temperature]));if(rec.key!==key){rec.key=key;const g=rec.output.getContext('2d');g.clearRect(0,0,W,H);g.drawImage(masked(rec.full,list,rec.owner,lightMasks.fullMask(id,rec.full)),0,0);}c.drawImage(rec.output,0,0);}

 return {renderWindow,renderBase,setMotionTime(t){curtainTime=t;},invalidate(){baseCache.clear();windowCache.clear();}};
};

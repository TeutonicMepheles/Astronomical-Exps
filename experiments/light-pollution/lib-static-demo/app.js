/* Static assembly of Lib Image output. Original panorama is reference-only. */
(() => {
 'use strict';
 const candidateMode=new URLSearchParams(location.search).get('scene')!=='legacy';let candidate=null;
 const W=2172,H=724,canvas=document.querySelector('#scene'),screen=canvas.getContext('2d');
 const files=['01-foreground-water','02-background-water','03-mountains','04-distant-city','05-near-buildings','06-residential-interiors','07-public-interiors','08-billboard','10-vegetation','11-shore-structures','window-apertures','reference'];
 const legacyLabels=['远山与山脚衔接','远景建筑','近景建筑与窗灯','广告屏','树木与灌木','远岸与近岸设施','背景水体','前景水体'];
 const labels=candidateMode?['远景整体 · 01','地面与岸壁 · 02','住宅组 · 02','公共建筑 · 03','广告楼 · 02','前景树木 · 03','前景水体 · 01']:legacyLabels;
 const visible=labels.map(()=>true),images={},parts={},make=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
 const scene=make(),mountainBase=make(),interiors=make(),sourceView=make();let ready=false,mode='generated',view='all';
 const views={all:{z:1,x:1086,y:362},homes:{z:2.1,x:430,y:390},public:{z:2.1,x:960,y:440},billboard:{z:3,x:1320,y:410},water:{z:2.1,x:1670,y:510}};
 const viewNames={all:'全景',homes:'住宅与植被',public:'公共建筑',billboard:'广告屏',water:'滨河水面'};
 function components(image,min=60){const c=make(),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);const d=g.getImageData(0,0,W,H).data,seen=new Uint8Array(W*H),q=new Int32Array(W*H),result=[];
  for(let p=0;p<W*H;p++){if(seen[p]||d[p*4+3]<100)continue;let head=0,tail=1,x0=W,y0=H,x1=0,y1=0;seen[p]=1;q[0]=p;
   while(head<tail){const n=q[head++],x=n%W,y=Math.floor(n/W);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(const j of[n-W,n+W,x>0?n-1:-1,x<W-1?n+1:-1])if(j>=0&&j<W*H&&!seen[j]&&d[j*4+3]>=100){seen[j]=1;q[tail++]=j;}}
   if(tail>=min)result.push({x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,area:tail});
  }return result;
 }
 function cover(c,image,b,target){const scale=Math.max(target.w/b.w,target.h/b.h),dw=b.w*scale,dh=b.h*scale;c.save();c.beginPath();c.rect(target.x,target.y,target.w,target.h);c.clip();c.drawImage(image,b.x,b.y,b.w,b.h,target.x+(target.w-dw)/2,target.y+(target.h-dh)/2,dw,dh);c.restore();}
 function prepare(){
  for(const key of['04-distant-city','06-residential-interiors','07-public-interiors','10-vegetation','window-apertures'])parts[key]=components(images[key],key==='window-apertures'?30:90);
  // Vector underpaint only: fills missing mountain feet, never stretches raster texture.
  const mg=mountainBase.getContext('2d'),sampling=make(),sg=sampling.getContext('2d',{willReadFrequently:true});sg.drawImage(images['03-mountains'],0,70);const d=sg.getImageData(0,0,W,H).data;
  const bottom=new Int16Array(W);bottom.fill(-1);for(let x=0;x<W;x++)for(let y=500;y>=250;y--)if(d[(y*W+x)*4+3]>128){bottom[x]=y;break;}
  let previous=-1;for(let x=0;x<W;x++){if(bottom[x]<0)continue;if(previous>=0&&x-previous<350)for(let j=previous+1;j<x;j++)bottom[j]=Math.round(bottom[previous]+(bottom[x]-bottom[previous])*(j-previous)/(x-previous));previous=x;}
  const fill=mg.createLinearGradient(0,350,0,510);fill.addColorStop(0,'#404477');fill.addColorStop(1,'#30395c');mg.fillStyle=fill;for(let x=0;x<W;x++)if(bottom[x]>=0)mg.fillRect(x,bottom[x]-2,1,512-bottom[x]);
  const ic=interiors.getContext('2d');
  for(const a of parts['window-apertures']){
   if(a.x>1250&&a.y<450&&a.w>100)continue;
   const residential=a.x<410,key=residential?'06-residential-interiors':'07-public-interiors';
   const candidates=parts[key].filter(b=>!residential||b.x<410);const cx=a.x+a.w/2,cy=residential?184+(a.y-220)*263/340:370;
   const b=candidates.reduce((best,item)=>{const distance=(item.x+item.w/2-cx)**2+(item.y+item.h/2-cy)**2;return !best||distance<best.distance?{item,distance}:best;},null)?.item;
   ic.fillStyle='#d9a15e';ic.fillRect(a.x,a.y,a.w,a.h);if(b)cover(ic,images[key],b,a);
  }
  ic.globalCompositeOperation='destination-in';ic.drawImage(images['window-apertures'],0,0);ic.globalCompositeOperation='source-over';
  sourceView.getContext('2d').drawImage(images.reference,0,0); // Native 2171px reference; no color/style sampling.
 }
 let specs=[['mountains','远山与山脚',0],['distant','远景建筑',1],['back-water','背景水体',6],['far-shore','远岸设施',5],['buildings','近景建筑 · 窗灯 · 广告屏',2],['vegetation','树木与灌木',4],['near-shore','近岸步道',5],['front-water','前景水体',7]];
 const surfaces={},bounds={},masks={};
 function rebuildSurfaces(){
  for(const [id] of specs){const surface=surfaces[id]||(surfaces[id]=make()),c=surface.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,W,H);
  if(candidate){c.drawImage(candidate.surfaces[id],0,0);}else{
  if(id==='mountains'){c.drawImage(mountainBase,0,0);c.drawImage(images['03-mountains'],0,70);}
  if(id==='distant')for(const b of parts['04-distant-city']){const s=.9;c.drawImage(images['04-distant-city'],b.x,b.y,b.w,b.h,198.2+b.x*s,500-b.h*s,b.w*s,b.h*s);}
  // Water uses identical source/destination dimensions: crop, never stretch.
  if(id==='back-water')c.drawImage(images['02-background-water'],1418,417,722,60,1450,508,722,60);
  if(id==='far-shore')c.drawImage(images['11-shore-structures'],1450,410,722,22,1450,487,722,22);
  if(id==='buildings'&&visible[2]){c.save();c.translate(0,43.25);c.scale(.95,.95);c.drawImage(images['05-near-buildings'],0,0);c.restore();}
  if(id==='buildings'&&(visible[2]||visible[3])){c.save();c.translate(0,43.25);c.scale(.95,.95);c.beginPath();c.moveTo(1305,337);c.lineTo(1469,352);c.lineTo(1469,448);c.lineTo(1305,438);c.closePath();c.clip();c.fillStyle='#18233a';c.fillRect(1300,330,180,125);c.restore();}
  if(id==='vegetation')for(const b of parts['10-vegetation']){const s=.86,x=b.x===0?0:b.x+b.w*(1-s)/2;c.drawImage(images['10-vegetation'],b.x,b.y,b.w,b.h,x,572-b.h*s,b.w*s,b.h*s);}
  if(id==='near-shore')c.drawImage(images['11-shore-structures'],0,461,W,64,0,568,W,64);
  if(id==='front-water')c.drawImage(images['01-foreground-water'],0,591,W,92,0,632,W,92);

  }
   const pixels=c.getImageData(0,0,W,H).data,mask=new Uint8Array(W*H);let x0=W,y0=H,x1=0,y1=0;
   for(let i=0;i<mask.length;i++){mask[i]=pixels[i*4+3];if(mask[i]>8){const x=i%W,y=Math.floor(i/W);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
   masks[id]=mask;bounds[id]=x0<W?{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1}:{x:0,y:0,w:W,h:H};
  }
 }
 let editor=null,objects=null;const buildings=window.createBuildingControls({canvas,W,H,getEditor:()=>editor,getObjects:()=>objects,compose,bounds,masks,getView:()=>views[view]});const lamps=window.createCompositorLamps({canvas,W,H,getEditor:()=>editor,compose});const gradient=window.createGradientEditor({canvas,W,H,getView:()=>views[view],getEditor:()=>editor,compose});const navigation=window.createStreetNavigation(()=>!!editor?.active);
 function compose(){if(!ready)return;const c=scene.getContext('2d');c.clearRect(0,0,W,H);
  for(const layer of editor?editor.layers:specs.map(([id])=>({id,x:0,y:0,scale:1,opacity:1,visible:true}))){
   const group=specs.find(s=>s[0]===layer.id)[2];
   if(!layer.visible||!(layer.id==='buildings'?(visible[2]||visible[3]):visible[group]))continue;
   const b=bounds[layer.id];c.save();c.globalAlpha=layer.opacity;c.translate(b.x+layer.x,b.y+layer.y);c.scale(layer.scale,layer.scale);c.translate(-b.x,-b.y);

   const replacement=objects?.getLayerImage(layer.id);if(replacement)cover(c,replacement,{x:0,y:0,w:replacement.width,h:replacement.height},b);else if(candidate&&objects&&['residential','public'].includes(layer.id))objects.renderBuildingBase(c,layer.id,surfaces[layer.id]);else c.drawImage(surfaces[layer.id],0,0);
   if(candidate){objects?.render(c,'window',layer.id);objects?.render(c,'billboard',layer.id);}else{if(layer.id==='buildings'&&visible[2])objects?.render(c,'window');if(layer.id==='buildings'&&visible[3])objects?.render(c,'billboard');}c.restore();
  }lamps.render(c);paint();
 }
 function paint(){if(!ready)return;const v=views[view],w=W/v.z,h=H/v.z,x=Math.max(0,Math.min(W-w,v.x-w/2)),y=Math.max(0,Math.min(H-h,v.y-h/2));document.querySelector('#sky-viewport').style.transform=`translate(${-x/W*100*v.z}%,${-y/H*100*v.z}%) scale(${v.z})`;screen.clearRect(0,0,W,H);screen.drawImage(mode==='generated'?scene:sourceView,x,y,w,h,0,0,W,H);document.querySelector('#view-label').textContent=(mode==='generated'?'Lib Image 合成':'原图构图参照')+' / '+viewNames[view];document.documentElement.dataset.mode=mode;document.documentElement.dataset.view=view;if(editor)editor.drawSelection();navigation.sync();}
 labels.forEach((name,i)=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.onchange=()=>{visible[i]=input.checked;if(i===2||i===3)rebuildSurfaces();compose();};label.append(input,document.createTextNode(name));document.querySelector('#layers').append(label);});
 const inspect=document.querySelector('#inspect-layers');
 function setInspecting(value){if(!value&&mode==='reference')document.querySelector('[data-mode=generated]').click();document.documentElement.dataset.inspecting=String(value);inspect.setAttribute('aria-pressed',String(value));document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=!value&&Boolean(editor?.active));}
 inspect.onclick=()=>setInspecting(document.documentElement.dataset.inspecting!=='true');
 document.querySelector('#edit-toggle').addEventListener('click',()=>setInspecting(false));
 document.querySelector('#restore').onclick=()=>{visible.fill(true);rebuildSurfaces();document.querySelectorAll('#layers input').forEach(b=>b.checked=true);compose();};
 document.querySelectorAll('button[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('button[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint();});
 // Capture-phase navigation owns the entire gesture, before any editing listeners.
 let spaceHeld=false,pan=null;
 const typing=e=>e.target.closest?.('input,textarea,select,[contenteditable="true"]');
 function panCursor(){canvas.style.cursor=pan?'grabbing':spaceHeld?'grab':'';}
 function endPan(cancel=false){if(!pan)return;const old=pan;pan=null;if(cancel){views.custom=old.view;view='custom';viewNames.custom='局部 '+old.view.z.toFixed(2)+'×';paint();}if(canvas.hasPointerCapture(old.id))canvas.releasePointerCapture(old.id);panCursor();}
 document.addEventListener('keydown',e=>{if(e.code==='Space'&&!typing(e)){spaceHeld=true;panCursor();e.preventDefault();}if(e.key==='Escape'&&pan){e.preventDefault();e.stopImmediatePropagation();endPan(true);}},true);
 document.addEventListener('keyup',e=>{if(e.code==='Space'){spaceHeld=false;panCursor();}},true);
 window.addEventListener('blur',()=>{spaceHeld=false;endPan();panCursor();});
 canvas.addEventListener('pointerdown',e=>{if(!editor?.active||!spaceHeld||e.button!==0||!ready)return;e.preventDefault();e.stopImmediatePropagation();if(pan)return;const v=views[view];pan={id:e.pointerId,x:e.clientX,y:e.clientY,view:{z:v.z,x:Math.max(W/v.z/2,Math.min(W-W/v.z/2,v.x)),y:Math.max(H/v.z/2,Math.min(H-H/v.z/2,v.y))}};canvas.setPointerCapture(e.pointerId);panCursor();},true);
 canvas.addEventListener('pointermove',e=>{if(!pan||pan.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const r=canvas.getBoundingClientRect(),v=pan.view,z=v.z;
  views.custom={z,x:Math.max(W/z/2,Math.min(W-W/z/2,v.x-(e.clientX-pan.x)*W/r.width/z)),y:Math.max(H/z/2,Math.min(H-H/z/2,v.y-(e.clientY-pan.y)*H/r.height/z))};view='custom';viewNames.custom='局部 '+z.toFixed(2)+'×';document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));paint();
 },true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(!pan||pan.id!==e.pointerId)return;e.stopImmediatePropagation();endPan(type==='pointercancel');},true);
 // Optional mouse shortcut; preset buttons remain the touch-friendly navigation.
 canvas.addEventListener('wheel',e=>{
  if(!editor?.active||!ready||!e.shiftKey)return;
  e.preventDefault();if(e.buttons||pan)return;
  const delta=e.deltaY||e.deltaX;if(!delta)return;
  const r=canvas.getBoundingClientRect(),v=views[view],u=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),t=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
  const x=Math.max(0,Math.min(W-W/v.z,v.x-W/v.z/2)),y=Math.max(0,Math.min(H-H/v.z,v.y-H/v.z/2));
  const pixels=delta*(e.deltaMode===1?16:e.deltaMode===2?r.height:1),z=Math.max(1,Math.min(8,v.z*Math.exp(-Math.max(-500,Math.min(500,pixels))*.002)));
  const left=Math.max(0,Math.min(W-W/z,x+u*W/v.z-u*W/z)),top=Math.max(0,Math.min(H-H/z,y+t*H/v.z-t*H/z));
  views.custom={z,x:left+W/z/2,y:top+H/z/2};viewNames.custom='局部 '+z.toFixed(2)+'×';view='custom';
  document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));paint();
 },{passive:false});
 document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('button[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint();});
 const load=key=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(new Error('无法加载 '+key));const p='assets/'+key+'.png';im.src=window.LIB_STATIC_ASSETS?.[p]||p;});
 Promise.all((candidateMode?['reference']:files).map(load)).then(async()=>{await lamps.ready;await buildings.ready;if(candidateMode){candidate=await window.loadCandidateScene(W,H);specs=candidate.specs;sourceView.getContext('2d').drawImage(images.reference,0,0);document.querySelector('#provenance').textContent='七类候选已配准 · 水体原尺寸裁切 · 三类建筑独立编辑';document.querySelector('.stamp').innerHTML='候选合成 <span>01 / 02 / 03 / 01 / 02 / 03 / 02</span>';document.documentElement.dataset.scene='candidates';}else prepare();rebuildSurfaces();ready=true;objects=window.createSceneObjects({buildings,definitions:candidate?.objects,canvas,screen,W,H,apertures:parts['window-apertures'],interiors,images,bounds,specs,compose,getView:()=>views[view],getEditor:()=>editor,isObjectVisible:(type,o)=>mode==='generated'&&(candidate?(!o||visible[specs.find(s=>s[0]===o.parent)[2]]):visible[type==='window'?2:3])});editor=window.createLayerEditor({buildings,lamps,gradient,sceneId:candidate?'candidates-20261027':'legacy',storageKey:candidate?'lib-candidate-layout-v1':'lib-static-layout-v1',extras:objects,canvas,W,H,specs,bounds,masks,compose,isVisible:id=>{const group=specs.find(s=>s[0]===id)[2];return id==='buildings'?(visible[2]||visible[3]):visible[group];},getView:()=>views[view],setGenerated:()=>{if(!editor.active){view="all";document.querySelectorAll("button[data-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view==="all")));}mode="generated";document.querySelectorAll("button[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===mode)));},screen});objects.bind();gradient.bind();lamps.bind();buildings.bind();compose();document.querySelector('#loading').hidden=true;document.documentElement.dataset.ready='true';}).catch(e=>{console.error(e);document.querySelector('#loading').textContent=e.message;});
})();

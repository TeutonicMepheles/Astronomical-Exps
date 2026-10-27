/* Local scene layout editor. Layouts contain no scripts or external asset URLs. */
window.createLayerEditor = function ({canvas,W,H,specs,bounds,masks,compose,isVisible,getView,setGenerated,screen,extras,gradient,lamps,storageKey='lib-static-layout-v1',sceneId='legacy'}) {
 const $=id=>document.getElementById(id), copy=value=>JSON.parse(JSON.stringify(value));
 const defaults=()=>specs.map(([id])=>({id,x:0,y:0,scale:1,opacity:1,visible:true,locked:false}));
 const undo=[],redo=[];
 let layers=defaults(),selected=specs.some(s=>s[0]==='buildings')?'buildings':'residential',active=false,selectionVisible=true,drag=null,rowDrag=null;
 const water=id=>id==='front-water'||id==='back-water';
 const status=text=>{$('editor-status').textContent=text;};
 function validate(doc){
  if(!doc||(doc.sceneId||'legacy')!==sceneId||doc.format!=='lib-static-layout'||![1,2].includes(doc.version)||doc.width!==W||doc.height!==H||!Array.isArray(doc.layers)||doc.layers.length!==specs.length)throw Error('布局格式、版本或画布尺寸不匹配');
  const ids=new Set();
  const result=doc.layers.map(l=>{
   if(!l||!specs.some(s=>s[0]===l.id)||ids.has(l.id))throw Error('图层缺失、重复或未知');ids.add(l.id);
   for(const [key,min,max] of [['x',-W*2,W*2],['y',-H*2,H*2],['scale',.1,4],['opacity',0,1]])if(typeof l[key]!=='number'||!Number.isFinite(l[key])||l[key]<min||l[key]>max)throw Error('属性超出允许范围');
   if(typeof l.visible!=='boolean'||typeof l.locked!=='boolean'||(water(l.id)&&l.scale!==1))throw Error('图层状态无效，水体必须保持原尺寸');
   return {id:l.id,x:l.x,y:l.y,scale:l.scale,opacity:l.opacity,visible:l.visible,locked:l.locked};
  });return result;
 }
 function snapshot(){return {layers:copy(layers),objects:extras.getData(),skyGradient:gradient.getData(),lamps:lamps.getData()};}
 function apply(state){layers=copy(state.layers);extras.setData(state.objects);gradient.setData(state.skyGradient);lamps.setData(state.lamps);}
 function documentData(){return {format:'lib-static-layout',version:2,sceneId,width:W,height:H,...snapshot()};}
 function validateAll(doc){return {layers:validate(doc),objects:extras.validate(doc.objects),skyGradient:gradient.validate(doc.skyGradient),lamps:lamps.validate(doc.lamps)};}
 function save(){try{localStorage.setItem(storageKey,JSON.stringify(documentData()));status('草稿已保存到此浏览器 · 导出 JSON 可备份');}catch{status('浏览器无法保存草稿，请导出 JSON 备份');}}
 function record(before){if(JSON.stringify(before)===JSON.stringify(snapshot()))return;undo.push(before);if(undo.length>100)undo.shift();redo.length=0;save();}
 function change(fn){const before=snapshot();fn();record(before);refresh();compose();}
 const chosen=()=>layers.find(l=>l.id===selected);
 function refresh(){
  const list=$('editor-layers');list.replaceChildren();
  [...layers].reverse().forEach(l=>{
   const row=document.createElement('div');row.className='editor-row';row.dataset.id=l.id;row.draggable=!l.locked;
   const select=document.createElement('button');select.className='layer-select';select.textContent=specs.find(s=>s[0]===l.id)[1];select.setAttribute('aria-pressed',String(selected===l.id));select.onclick=()=>{selected=l.id;selectionVisible=true;refresh();compose();};
   const show=document.createElement('button');show.textContent=l.visible?'显示':'隐藏';show.setAttribute('aria-label',select.textContent+' 显示');show.setAttribute('aria-pressed',String(l.visible));show.disabled=l.locked;show.onclick=()=>change(()=>{l.visible=!l.visible;});
   const lock=document.createElement('button');lock.textContent=l.locked?'已锁':'锁定';lock.setAttribute('aria-label',select.textContent+' 锁定');lock.setAttribute('aria-pressed',String(l.locked));lock.onclick=()=>change(()=>{l.locked=!l.locked;});
   row.append(select,show,lock);row.ondragstart=e=>{if(l.locked){e.preventDefault();return;}rowDrag=l.id;e.dataTransfer.setData('text/plain',l.id);};row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();if(!rowDrag||rowDrag===l.id)return;change(()=>{const i=layers.findIndex(x=>x.id===rowDrag),j=layers.indexOf(l);const [item]=layers.splice(i,1);layers.splice(j,0,item);});rowDrag=null;};row.ondragend=()=>{rowDrag=null;};list.append(row);
  });
  const l=chosen();$('selected-name').textContent=l?specs.find(s=>s[0]===l.id)[1]:'选择素材组';
  for(const key of ['x','y','scale','opacity']){const input=$('prop-'+key);input.disabled=!l||l.locked||(key==='scale'&&water(l.id));input.value=l?Number((l[key]*(key==='opacity'?100:1)).toFixed(2)):'';}
  document.querySelectorAll('[data-order]').forEach(b=>{const i=layers.indexOf(l);b.disabled=!l||l.locked||(['top','up'].includes(b.dataset.order)?i===layers.length-1:i===0);});
  $('undo').disabled=!undo.length;$('redo').disabled=!redo.length;
 }
 for(const key of ['x','y','scale','opacity'])$('prop-'+key).onchange=e=>{
  const l=chosen(),n=e.target.valueAsNumber;if(!l||l.locked)return;
  if(!e.target.validity.valid||!Number.isFinite(n)){refresh();status('请输入范围内的有效数值');return;}
  change(()=>{l[key]=n/(key==='opacity'?100:1);});
 };
 document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{const l=chosen();if(!l||l.locked)return;change(()=>{const i=layers.indexOf(l),action=b.dataset.order,j=action==='top'?layers.length-1:action==='bottom'?0:action==='up'?i+1:i-1;layers.splice(i,1);layers.splice(j,0,l);});});
 function travel(from,to){if(!from.length)return;to.push(snapshot());apply(from.pop());save();refresh();compose();}
 $('undo').onclick=()=>travel(undo,redo);$('redo').onclick=()=>travel(redo,undo);
 $('reset-layout').onclick=()=>change(()=>{layers=defaults();extras.reset();gradient.reset();lamps.reset();});
 $('export-layout').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(documentData(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='light-pollution-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('已导出完整场景 JSON（含替换图片）');};
 $('import-layout').onclick=()=>$('layout-file').click();
 $('layout-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>32000000)throw Error('布局文件过大');const doc=JSON.parse(await file.text()),next=validateAll(doc);await extras.preload(next.objects);change(()=>{apply(next);});status('布局已导入，可撤销');}catch(err){status('导入失败：'+err.message);}finally{e.target.value='';}};
 function viewport(){const v=getView(),w=W/v.z,h=H/v.z;return {z:v.z,x:Math.max(0,Math.min(W-w,v.x-w/2)),y:Math.max(0,Math.min(H-h,v.y-h/2))};}
 function point(e){const r=canvas.getBoundingClientRect(),v=viewport();return {x:v.x+(e.clientX-r.left)*W/r.width/v.z,y:v.y+(e.clientY-r.top)*H/r.height/v.z};}
 function hit(l,p){const b=bounds[l.id],x=Math.floor((p.x-b.x-l.x)/l.scale+b.x),y=Math.floor((p.y-b.y-l.y)/l.scale+b.y);return x>=0&&y>=0&&x<W&&y<H&&(extras.hasLayerImage(l.id)?x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h:masks[l.id][y*W+x]>8);}
 canvas.addEventListener('pointerdown',e=>{if(!active||gradient.active||extras.editingObjects()||e.button!==0||drag)return;const p=point(e),l=[...layers].reverse().find(l=>l.visible&&isVisible(l.id)&&l.opacity>0&&hit(l,p));if(!l){selectionVisible=false;compose();return;}selected=l.id;selectionVisible=true;if(l.locked){refresh();compose();return;}drag={pointer:e.pointerId,p,x:l.x,y:l.y,before:snapshot()};canvas.setPointerCapture(e.pointerId);refresh();compose();e.preventDefault();});
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const p=point(e),l=chosen();l.x=Math.max(-W*2,Math.min(W*2,drag.x+p.x-drag.p.x));l.y=Math.max(-H*2,Math.min(H*2,drag.y+p.y-drag.p.y));compose();});
 function finish(e,cancel=false){if(!drag||(e&&e.pointerId!==drag.pointer))return;const old=drag;drag=null;if(cancel)apply(old.before);else record(old.before);if(canvas.hasPointerCapture(old.pointer))canvas.releasePointerCapture(old.pointer);refresh();compose();}
 canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));canvas.addEventListener('lostpointercapture',e=>finish(e,true));
 $('edit-toggle').disabled=false;$('edit-toggle').onclick=()=>{finish(null);active=!active;setGenerated();document.documentElement.dataset.editing=String(active);$('editor-panel').hidden=!active;$('edit-toggle').setAttribute('aria-expanded',String(active));$('edit-toggle').setAttribute('aria-label',active?'退出素材编辑':'打开素材编辑');document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=active);refresh();compose();};
 document.addEventListener('keydown',e=>{if(!active||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'){if(drag)finish(null,true);else $('edit-toggle').click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(!drag&&!gradient.busy&&!lamps.busy)travel(e.shiftKey?redo:undo,e.shiftKey?undo:redo);}});
 try{const raw=localStorage.getItem(storageKey);if(raw){apply(validateAll(JSON.parse(raw)));status('已恢复此浏览器的布局草稿');}}catch{status('草稿不可用，已使用初始构图');}
 refresh();
 return {get layers(){return layers;},get active(){return active;},get selectedId(){return selected;},changeExternal:change,beginExternal:snapshot,commitExternal(before){record(before);refresh();compose();},cancelExternal(before){apply(before);refresh();compose();},drawSelection(){gradient.draw();if(gradient.active)return;extras.drawSelection(active);if(!active||!selectionVisible||extras.editingObjects())return;const l=chosen();if(!l||!l.visible||!isVisible(l.id))return;const b=bounds[l.id],v=viewport();screen.save();screen.strokeStyle=l.locked?'#9ba9b880':'#f1ce9280';screen.lineWidth=2*W/canvas.getBoundingClientRect().width;screen.setLineDash([10,6]);screen.strokeRect((b.x+l.x-v.x)*v.z,(b.y+l.y-v.y)*v.z,b.w*l.scale*v.z,b.h*l.scale*v.z);screen.restore();}};
};

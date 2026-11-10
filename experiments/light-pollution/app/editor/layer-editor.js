/* Local scene layout editor. Layouts contain no scripts or external asset URLs. */
window.createLayerEditor = function ({canvas,W,H,specs,bounds,masks,compose,isVisible,getView,setGenerated,screen,extras,gradient,lamps,buildings,lightEnvironment,sceneEffects,store,session}) {
 const $=id=>document.getElementById(id), copy=value=>JSON.parse(JSON.stringify(value));
 const layersDefault=()=>specs.map(([id])=>({id,x:0,y:0,scale:1,opacity:1,visible:true,locked:false}));
 let layers=store.layers,selected=specs.some(s=>s[0]==='buildings')?'buildings':'residential',active=false,selectionVisible=true,drag=null,rowDrag=null;
 const water=id=>id==='front-water'||id==='back-water';
 const status=text=>{$('editor-status').textContent=text;};
 const snapshot=store.beginExternal,record=store.commitExternal,change=store.changeExternal;
 const documentData=store.documentData;
 const unsubscribe=store.subscribe(()=>{layers=store.layers;refresh();status(store.message);});
 LightPollution.disposers.push(unsubscribe);
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
  session.selectedId=selected;sceneEffects.refresh(l);$('undo').disabled=!store.history.canUndo;$('redo').disabled=!store.history.canRedo;
 }
 for(const key of ['x','y','scale','opacity'])$('prop-'+key).onchange=e=>{
  const l=chosen(),n=e.target.valueAsNumber;if(!l||l.locked)return;
  if(!e.target.validity.valid||!Number.isFinite(n)){refresh();status('请输入范围内的有效数值');return;}
  change(()=>{l[key]=n/(key==='opacity'?100:1);});
 };
 document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{const l=chosen();if(!l||l.locked)return;change(()=>{const i=layers.indexOf(l),action=b.dataset.order,j=action==='top'?layers.length-1:action==='bottom'?0:action==='up'?i+1:i-1;layers.splice(i,1);layers.splice(j,0,l);});});
 $('undo').onclick=store.history.undo;$('redo').onclick=store.history.redo;
 $('reset-layout').onclick=store.reset;
 $('export-layout').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(documentData(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='light-pollution-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('已导出完整场景 JSON（含替换图片）');};
 $('import-layout').onclick=()=>$('layout-file').click();
 $('layout-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>32000000)throw Error('布局文件过大');const doc=JSON.parse(await file.text()),next=await store.importDocument(doc);status('布局已导入，可撤销');}catch(err){status('导入失败：'+err.message);}finally{e.target.value='';}};
 function viewport(){return LightPollution.viewport(getView(),W,H);}
 function point(e){const r=canvas.getBoundingClientRect(),v=viewport();return {x:v.x+(e.clientX-r.left)*W/r.width/v.z,y:v.y+(e.clientY-r.top)*H/r.height/v.z};}
 function hit(l,p){const b=bounds[l.id],x=Math.floor((p.x-b.x-l.x)/l.scale+b.x),y=Math.floor((p.y-b.y-l.y)/l.scale+b.y);return x>=0&&y>=0&&x<W&&y<H&&(extras.hasLayerImage(l.id)?x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h:masks[l.id][y*W+x]>8);}
 LightPollution.on(canvas,'pointerdown',e=>{if(!active||gradient.active||extras.editingObjects()||e.button!==0||drag)return;const p=point(e),l=[...layers].reverse().find(l=>l.visible&&isVisible(l.id)&&l.opacity>0&&hit(l,p));if(!l){selectionVisible=false;compose();return;}selected=l.id;selectionVisible=true;if(l.locked){refresh();compose();return;}drag={pointer:e.pointerId,p,x:l.x,y:l.y,before:snapshot()};canvas.setPointerCapture(e.pointerId);refresh();compose();e.preventDefault();});
 LightPollution.on(canvas,'pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const p=point(e),l=chosen();l.x=Math.max(-W*2,Math.min(W*2,drag.x+p.x-drag.p.x));l.y=Math.max(-H*2,Math.min(H*2,drag.y+p.y-drag.p.y));compose();});
 function finish(e,cancel=false){if(!drag||(e&&e.pointerId!==drag.pointer))return;const old=drag;drag=null;if(cancel)store.cancelExternal(old.before);else record(old.before);if(canvas.hasPointerCapture(old.pointer))canvas.releasePointerCapture(old.pointer);refresh();compose();}
 LightPollution.on(canvas,'pointerup',e=>finish(e));LightPollution.on(canvas,'pointercancel',e=>finish(e,true));LightPollution.on(canvas,'lostpointercapture',e=>finish(e,true));
 $('edit-toggle').disabled=false;$('edit-toggle').onclick=toggle;function toggle(){finish(null);active=!active;session.active=active;setGenerated();document.documentElement.dataset.editing=String(active);$('editor-panel').hidden=!active;$('edit-toggle').setAttribute('aria-expanded',String(active));$('edit-toggle').setAttribute('aria-label',active?'退出素材编辑':'打开素材编辑');document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=active);refresh();compose();};
 LightPollution.on(document,'keydown',e=>{if(!active||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'){if(drag)finish(null,true);else toggle();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(!drag&&!gradient.busy&&!lamps.busy&&!buildings.busy&&!sceneEffects.busy)(e.shiftKey?store.history.redo:store.history.undo)();}});
 refresh();
 return {setActive(value){if(active!==value)toggle();},get layers(){return layers;},get active(){return active;},get selectedId(){return selected;},drawSelection(){gradient.draw();if(gradient.active)return;extras.drawSelection(active);if(!active||!selectionVisible||extras.editingObjects())return;const l=chosen();if(!l||!l.visible||!isVisible(l.id))return;const b=bounds[l.id],v=viewport();screen.save();screen.strokeStyle=l.locked?'#9ba9b880':'#f1ce9280';screen.lineWidth=2*W/canvas.getBoundingClientRect().width;screen.setLineDash([10,6]);screen.strokeRect((b.x+l.x-v.x)*v.z,(b.y+l.y-v.y)*v.z,b.w*l.scale*v.z,b.h*l.scale*v.z);screen.restore();}};
};

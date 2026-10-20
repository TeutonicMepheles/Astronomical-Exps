/* Host geometry/state adapter for the existing generic AffordanceHint. */
(function(N){
 const entries=[...document.querySelectorAll('[data-mirror]')].map(button=>({button,target:button.querySelector('img'),key:button.dataset.mirror}));
 entries.push({button:document.querySelector('#rail-carriage'),target:document.querySelector('#optical-mirror-art'),key:'mounted-holder'});
 let selectedClamp=false,frame;
 for(const entry of entries){
  entry.hover=false;entry.focus=false;
  for(const [event,value] of [['pointerenter',true],['pointerleave',false]])entry.button.addEventListener(event,e=>{if(e.pointerType!=='touch')entry.hover=value;});
  entry.button.addEventListener('focus',()=>entry.focus=true);entry.button.addEventListener('blur',()=>entry.focus=false);
  entry.overlay=document.createElement('div');entry.overlay.setAttribute('aria-hidden','true');
  Object.assign(entry.overlay.style,{position:'fixed',zIndex:'90',pointerEvents:'none'});document.body.append(entry.overlay);
  // Hover, keyboard focus and selection share the same stable highlight on a whiteboard.
  for(const [key,value] of [['--hint-outline','#F4CB83'],['--hint-outline-width','3px'],['--hint-outline-min','1'],['--hint-outline-max','1']])entry.overlay.style.setProperty(key,value);
  entry.hint=new ExperimentHints.AffordanceHint(entry.target,{contour:CourseContours[entry.key],overlayRoot:entry.overlay});
 }
 const clamp=entries[3];
 clamp.button.addEventListener('click',()=>selectedClamp=true);
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#rail-carriage,#mirror-move-handle,#mounted-mirror-controls'))selectedClamp=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){selectedClamp=false;entries.forEach(e=>e.focus=false);}});
 let previousStage=N.course.get().stage;
 const unsubscribe=N.course.subscribe(s=>{if(s.stage!==previousStage){selectedClamp=false;entries.forEach(e=>{e.hover=false;e.focus=false;});}previousStage=s.stage;});
 function render(){
  const s=N.course.get(),key='mounted-'+(s.mirrorMounted?s.mirror:'holder');
  const art=N.app.telescope?.lab.darkroom.art,curved=s.mirrorMounted&&['concave','convex'].includes(s.mirror);
  const signature=key+(curved?'/'+s.mirrorFocal+'/'+art?.surfaceKey:'');
  if(clamp.signature!==signature){
   clamp.key=key;clamp.signature=signature;clamp.hint.destroy();
   const contour=curved?art.contour(s.mirror,s.mirrorFocal):CourseContours[key];
   clamp.hint=new ExperimentHints.AffordanceHint(clamp.target,{contour,overlayRoot:clamp.overlay});
  }
  for(const entry of entries){
   const selected=entry===clamp?selectedClamp:s.mirrorSelection===entry.key;
   const active=!entry.button.disabled&&s.stage==='mirrors'&&(entry.hover||entry.focus||(entry===clamp?selectedClamp:s.mirrorSelection===entry.key));
   entry.hint.setEnabled(active);
   if(active){const r=entry.target.getBoundingClientRect();Object.assign(entry.overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});}
  }
  frame=requestAnimationFrame(render);
 }
 render();window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);unsubscribe();entries.forEach(e=>{e.hint.destroy();e.overlay.remove();});},{once:true});
 N.courseOutlines=entries;
})(window.Newton);

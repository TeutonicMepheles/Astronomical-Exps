/* Host geometry/state adapter for the existing generic AffordanceHint. */
(function(N){
 const entries=[...document.querySelectorAll('[data-mirror]')].map(button=>({button,target:button.querySelector('img'),key:button.dataset.mirror}));
 entries.push({button:document.querySelector('#rail-carriage'),target:document.querySelector('#optical-mirror-art'),key:'mounted-holder'});
 let selectedClamp=false,frame;
 for(const entry of entries){
  entry.hover=false;entry.focus=false;
  for(const [event,value] of [['pointerenter',true],['pointerleave',false]])entry.button.addEventListener(event,e=>{if(e.pointerType!=='touch')entry.hover=value;});
  entry.button.addEventListener('focus',()=>entry.focus=true);entry.button.addEventListener('blur',()=>entry.focus=false);
  entry.hint=new ExperimentHints.AffordanceHint(entry.target,{contour:CourseContours[entry.key],overlayRoot:document.body});
  Object.assign(entry.hint.layer.style,{position:'fixed',inset:'auto',zIndex:'90',pointerEvents:'none'});
 }
 const clamp=entries[3];
 clamp.button.addEventListener('click',()=>selectedClamp=true);
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#rail-carriage,#mirror-move-handle,#mounted-mirror-controls'))selectedClamp=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){selectedClamp=false;entries.forEach(e=>e.focus=false);}});
 let previousStage=N.course.get().stage;
 const unsubscribe=N.course.subscribe(s=>{if(s.stage!==previousStage){selectedClamp=false;entries.forEach(e=>{e.hover=false;e.focus=false;});}previousStage=s.stage;});
 function render(){
  const s=N.course.get(),key='mounted-'+(s.mirrorMounted?s.mirror:'holder');
  if(clamp.key!==key){clamp.key=key;clamp.hint.layer.querySelectorAll('path').forEach(p=>p.setAttribute('d',CourseContours[key].path));}
  for(const entry of entries){
   const selected=entry===clamp?selectedClamp:s.mirrorSelection===entry.key;
   entry.hint.layer.style.setProperty('--hint-outline',selected?'#F4CB83':'#C4E3F1');
   entry.hint.layer.style.setProperty('--hint-outline-width',selected?'3px':'2px');
   entry.hint.layer.style.animation=selected?'none':'';
   entry.hint.layer.style.opacity=selected?'1':'';
   const active=!entry.button.disabled&&s.stage==='mirrors'&&(entry.hover||entry.focus||(entry===clamp?selectedClamp:s.mirrorSelection===entry.key));
   entry.hint.setEnabled(active);
   if(active){const r=entry.target.getBoundingClientRect();Object.assign(entry.hint.layer.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',transform:'none'});}
  }
  frame=requestAnimationFrame(render);
 }
 render();window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);unsubscribe();entries.forEach(e=>e.hint.destroy());},{once:true});
 N.courseOutlines=entries;
})(window.Newton);

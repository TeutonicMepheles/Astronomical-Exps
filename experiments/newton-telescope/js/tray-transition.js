/* Selected proposal B: fade hardware in place; slide only the specimen tray. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),animations=new Set();
 const driver=document.createElement('span');driver.className='tray-beam-driver';driver.setAttribute('aria-hidden','true');stage.append(driver);
 const notice=document.createElement('div');notice.className='tray-transition-notice';notice.setAttribute('role','alert');notice.hidden=true;stage.append(notice);
 const deviceSelectors=['#optical-mirror-art','#optical-mirror-surface','#optical-round-holder-art','#optical-frame-occlusion','#convex-original-glass','#concave-original-glass'];
 const visible=selector=>[...document.querySelectorAll(selector)].filter(el=>!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden');
 let busy=false,committing=false,epoch=0,beamFrame=0,restoreInert=false,restoreBusy=null;
 const lab=()=>N.app.telescope.lab;
 function stopAnimations(){animations.forEach(a=>a.cancel());animations.clear();}
 function cleanup(){
  cancelAnimationFrame(beamFrame);stopAnimations();stage.classList.remove('is-tray-switching');delete stage.dataset.trayTransition;
  lab().setBeamOpacity(1);busy=false;
  if(!stage.classList.contains('workbench-transition')){stage.inert=restoreInert;if(restoreBusy===null)stage.removeAttribute('aria-busy');else stage.setAttribute('aria-busy',restoreBusy);}
 }
 function cancel(){if(!busy)return;++epoch;cleanup();}
 function focusArrow(value){if(N.course.get().stage==='mirrors')document.querySelector(value==='lenses'?'.table-page-previous':'.table-page-next')?.focus({preventScroll:true});}
 function animate(elements,frames,duration,delay=0,easing='cubic-bezier(.22,.7,.25,1)'){
  return Promise.all(elements.map(el=>{const a=el.animate(frames,{duration,delay,easing,fill:'both'});animations.add(a);return a.finished.catch(()=>{});}));
 }
 function fade(elements,from,to,duration,delay=0,easing){return animate(elements,[{opacity:from},{opacity:to}],duration,delay,easing);}
 function driveBeams(){if(!busy)return;lab().setBeamOpacity(Number(getComputedStyle(driver).opacity));beamFrame=requestAnimationFrame(driveBeams);}
 async function decode(value){
  const art=lab().darkroom.art,s=N.course.get(),tray=document.querySelector(value==='lenses'?'#table-lens-page':'#table-mirror-page');
  const image=value==='lenses'?new Image():art.images[s.mirrorMounted?s.mirror:'holder'];
  if(value==='lenses')image.src=art.roundSources[s.lens||'holder'];
  const glass=value==='lenses'&&s.lens?art[s.lens+'Art'].image:null;
  await Promise.all([image,glass,...tray.querySelectorAll('img')].filter(Boolean).map(img=>img.decode()));
 }
 async function run(value,commit,prepare=()=>{}){
  if(busy||value===stage.dataset.trayPage||N.course.get().stage!=='mirrors')return false;
  const from=stage.dataset.trayPage,direction=from==='mirrors'?1:-1,token=++epoch;
  prepare();lab().darkroom.endDrag();N.mirrorDragVisual.end();N.courseInteractions.guide.hide();N.courseInteractions.bubble.hide();
  busy=true;restoreInert=stage.inert;restoreBusy=stage.getAttribute('aria-busy');stage.inert=true;stage.setAttribute('aria-busy','true');stage.dataset.trayTransition='preparing';notice.hidden=true;
  try{
   await decode(value);if(token!==epoch)return false;
   if(reduced.matches){committing=true;try{commit(value);N.app.telescope.placeLabels();}finally{committing=false;}return true;}
   stage.classList.add('is-tray-switching');stage.dataset.trayTransition='out';
   const arrow=visible('.table-page-arrow');animate(arrow,[{filter:'brightness(1)'},{filter:'brightness(1.18)'},{filter:'brightness(1)'}],80);
   const exit='cubic-bezier(.4,0,1,1)';
   const outgoing=[
    fade(visible(deviceSelectors.join(',')),1,0,120,0,exit),
    animate(visible(from==='mirrors'?'#table-mirror-page':'#table-lens-page'),[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX('+(-direction*16)+'px)'}],120,0,exit),
    fade([driver,...visible('#focus-marker,#mounted-mirror-controls')],1,0,80,0,exit)
   ];
   driveBeams();await Promise.all(outgoing);if(token!==epoch)return false;
   // Every outgoing layer is invisible before committing the destination state.
   committing=true;try{commit(value);N.app.telescope.placeLabels();}finally{committing=false;}
   stopAnimations();lab().setBeamOpacity(0);stage.dataset.trayTransition='in';
   await Promise.all([
    fade(visible(deviceSelectors.join(',')),0,1,180),
    animate(visible(value==='mirrors'?'#table-mirror-page':'#table-lens-page'),[{opacity:0,transform:'translateX('+(direction*16)+'px)'},{opacity:1,transform:'translateX(0)'}],180),
    fade([driver,...visible('#focus-marker,#mounted-mirror-controls')],0,1,80,100)
   ]);
   return token===epoch;
  }catch(error){if(token===epoch){notice.textContent='镜片资源未加载，仍保留当前页。请再次点击箭头重试。';notice.hidden=false;}return false;}
  finally{if(token===epoch){cleanup();focusArrow(stage.dataset.trayPage);}}
 }
 const unsubscribe=N.course.subscribe(()=>{if(busy&&!committing)cancel();notice.hidden=true;});
 // Native inert handles pointer/keyboard input; this also rejects synthetic events.
 for(const event of ['click','pointerdown','keydown','input','dragstart','dragover','drop'])stage.addEventListener(event,e=>{if(busy){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
 window.addEventListener('pagehide',()=>{cancel();unsubscribe();driver.remove();notice.remove();},{once:true});
 N.trayTransition={run,cancel,get busy(){return busy;}};
})(window.Newton);

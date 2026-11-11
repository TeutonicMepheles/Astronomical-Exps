/* First-stage focal control. Uses the same scene projection as the optical focus. */
(function(N){
 'use strict';
 const root=document.querySelector('#focus-marker'),view=document.querySelector('#viewport');
 root.className='newton-focus-control';root.setAttribute('role','group');root.setAttribute('aria-label','拖动焦点调节焦距');
 root.innerHTML='<button class="newton-focus-dot" type="button" aria-label="拖动焦点调节焦距"></button><div class="newton-focus-tip"><button type="button" data-focus-direction="-1" aria-label="焦点向左移动150毫米">‹</button><output aria-live="off"><strong class="newton-focus-name"></strong><span class="newton-focus-value"></span></output><button type="button" data-focus-direction="1" aria-label="焦点向右移动150毫米">›</button></div>';
 const dot=root.querySelector('.newton-focus-dot'),tip=root.querySelector('.newton-focus-tip'),output=root.querySelector('output');let drag=null,moveFrame=0,pendingX=null,motion=null,motionFrame=0;
 const lensActive=s=>document.querySelector('.observatory').dataset.trayPage==='lenses'&&Boolean(s.lens);
 function config(s=N.course.get()){const lens=lensActive(s);return{lens,key:lens?'lens:'+s.lens:'mirror:'+s.mirror,range:lens?N.lensOptics.focalRange:{...N.mirrorParts.limits(s.mirror),step:1},value:lens?Math.abs(N.lensOptics.focalLength(s)):s.mirrorFocal};}
 function set(value,c=config()){if(c.lens){const shape=N.lensOptics.shapeFromFocal(N.course.get().lens,value);N.course.get().lens==='concave'?N.course.setConcaveShape(shape):N.course.setConvexShape(shape);}else N.course.setMirrorFocal(value);}
 const point=new THREE.Vector3();
 function screenX(value,s,c){const candidate={...s};if(c.lens){const shape=N.lensOptics.shapeFromFocal(s.lens,value);candidate[s.lens==='concave'?'concaveShape':'convexShape']=shape;}else candidate.mirrorFocal=value;
  const focus=c.lens?N.lensOptics.focus(candidate):N.mirrorOptics.focus(candidate),t=N.app.telescope;
  point.set(...focus);t.lab.group.localToWorld(point);point.project(t.camera);const r=c.rect;return r.left+(point.x*.5+.5)*r.width;
 }
 function stopMotion(){cancelAnimationFrame(motionFrame);motionFrame=0;motion=null;delete root.dataset.moving;}
 function nudge(direction){
  const s=N.course.get(),c=config(s);c.rect=view.getBoundingClientRect();const increasing=screenX(c.range.max,s,c)>screenX(c.range.min,s,c);
  const base=motion?.c.key===c.key?motion.target:c.value,target=Math.max(c.range.min,Math.min(c.range.max,base+(increasing?direction:-direction)*150));
  stopMotion();if(Math.abs(target-c.value)<1e-6)return;
  const run={c,from:c.value,target,value:c.value,reset:N.course.resetVersion,start:performance.now(),applying:false};motion=run;root.dataset.moving='true';
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?200:480;
  function tick(now){
   motionFrame=0;if(motion!==run)return;
   const progress=Math.min(1,(now-run.start)/duration),ease=progress*progress*(3-2*progress);
   const value=progress===1?target:Math.max(c.range.min,Math.min(c.range.max,Math.round((run.from+(target-run.from)*ease)/c.range.step)*c.range.step));
   if(Math.abs(value-run.value)>1e-6){run.value=value;run.applying=true;set(value,c);run.applying=false;}
   if(motion!==run)return;if(progress<1)motionFrame=requestAnimationFrame(tick);else stopMotion();
  }
  motionFrame=requestAnimationFrame(tick);
 }
 root.addEventListener('pointerdown',e=>e.stopPropagation());
 dot.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();stopMotion();const s=N.course.get();drag={id:e.pointerId,x:e.clientX,c:config(s),state:s,reset:N.course.resetVersion};dot.setPointerCapture(e.pointerId);});
 function applyDrag(){moveFrame=0;if(!drag||pendingX===null)return;const clientX=pendingX;pendingX=null;const {state:s,c}=drag;c.rect=view.getBoundingClientRect();let lo=c.range.min,hi=c.range.max;const increasing=screenX(hi,s,c)>screenX(lo,s,c),target=screenX(c.value,s,c)+clientX-drag.x;
  // Bounded search on the existing optical model; candidates are snapped to its step.
  for(let i=0;i<12&&hi-lo>c.range.step;i++){const mid=Math.round((lo+hi)/2/c.range.step)*c.range.step;if(mid<=lo||mid>=hi)break;if((screenX(mid,s,c)<target)===increasing)lo=mid;else hi=mid;}
  set(Math.abs(screenX(lo,s,c)-target)<Math.abs(screenX(hi,s,c)-target)?lo:hi,c);
 }
 dot.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;pendingX=e.clientX;if(!moveFrame)moveFrame=requestAnimationFrame(applyDrag);});
 function end(e,cancel=false){if(!drag||e.pointerId!==drag.id)return;cancelAnimationFrame(moveFrame);moveFrame=0;if(!cancel)applyDrag();pendingX=null;const old=drag;drag=null;if(cancel&&config().key===old.c.key&&N.course.resetVersion===old.reset)set(old.c.value,old.c);if(dot.hasPointerCapture(e.pointerId))dot.releasePointerCapture(e.pointerId);}
 dot.addEventListener('pointerup',e=>end(e));dot.addEventListener('pointercancel',e=>end(e,true));dot.addEventListener('lostpointercapture',e=>end(e,true));
 dot.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();nudge(e.key==='ArrowLeft'?-1:1);}});
 for(const button of tip.querySelectorAll('button'))button.onclick=()=>nudge(Number(button.dataset.focusDirection));
 const off=N.course.subscribe(s=>{if(motion&&!motion.applying&&(s.stage!=='mirrors'||config(s).key!==motion.c.key||N.course.resetVersion!==motion.reset||Math.abs(config(s).value-motion.value)>1e-6))stopMotion();if(drag&&(s.stage!=='mirrors'||config(s).key!==drag.c.key||N.course.resetVersion!==drag.reset)){cancelAnimationFrame(moveFrame);moveFrame=0;pendingX=null;drag=null;}const c=config(s),virtual=c.lens?s.lens==='concave':s.mirror==='convex';output.querySelector('.newton-focus-name').textContent=virtual?'虚焦点 F':'实焦点 F';output.querySelector('.newton-focus-value').textContent='焦距 '+Math.round(c.lens?N.lensOptics.focalLength(s):c.value)+' mm'+(c.lens?'（示意）':'');dot.setAttribute('aria-label',output.textContent+'，左右拖动调节');});
 N.focusControls={place(x,y,w,h){dot.hidden=x<0||x>w||y<0||y>h;tip.style.setProperty('--focus-tip-offset',Math.max(245,Math.min(w-245,x))-x+'px');},};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMotion();});
 N.course.refresh();window.addEventListener('pagehide',()=>{off();stopMotion();cancelAnimationFrame(moveFrame);pendingX=null;drag=null;});
})(window.Newton);

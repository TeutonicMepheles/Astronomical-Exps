/* Layer orchestration. Course state remains synchronous and owns all gates. */
(function(N){
  'use strict';
  const stage=document.querySelector('.observatory'),viewport=document.querySelector('#viewport'),consolePanel=document.querySelector('.console');
  const table=document.createElement('div');table.className='workbench-table';table.setAttribute('aria-hidden','true');stage.append(table);
  const assembly=document.createElement('section');assembly.className='assembly-preview';assembly.setAttribute('aria-label','牛顿望远镜组装台');
  assembly.innerHTML='<img class="assembly-telescope" src="assets/workbench/telescope.png" alt="待组装的牛顿望远镜" draggable="false"><div class="assembly-caption"><strong>组装牛顿望远镜</strong></div>';
  stage.append(assembly);
  const tray=document.createElement('div');tray.className='assembly-mirror-tray';tray.setAttribute('aria-label','组装镜片托盘');
  document.querySelectorAll('[data-mirror] .mirror-art').forEach(img=>{const copy=img.cloneNode();copy.alt=img.closest('button').getAttribute('aria-label');tray.append(copy);});stage.append(tray);
  let busy=false,epoch=0;const animations=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function sync(s){const isAssembly=s.stage==='assembly';stage.classList.toggle('layered-assembly',isAssembly);assembly.hidden=tray.hidden=!isAssembly;viewport.inert=isAssembly;consolePanel.inert=isAssembly;}
  function motion(el,frames,duration,delay=0){if(!el)return Promise.resolve();const a=el.animate(frames,{duration:reduced.matches?0:duration,delay:reduced.matches?0:delay,fill:'forwards',easing:'cubic-bezier(.22,.7,.25,1)'});animations.add(a);return a.finished.catch(()=>{});}
  function cleanup(){animations.forEach(a=>a.cancel());animations.clear();busy=false;stage.classList.remove('workbench-transition');stage.removeAttribute('aria-busy');stage.inert=false;sync(N.course.get());}
  N.course.requestEnter=async function(target){
    if(busy||target===N.course.get().stage||!N.course.canEnter(target))return false;
    const from=N.course.get().stage;if(from!=='mirrors'||target!=='assembly')return N.course.enter(target);
    const token=++epoch;busy=true;stage.inert=true;stage.classList.add('workbench-transition');stage.setAttribute('aria-busy','true');
    try{
      await assembly.querySelector('img').decode();if(token!==epoch)return false;
      N.app.telescope.lab.darkroom.endDrag();N.mirrorDragVisual?.end();N.courseInteractions?.guide.hide();N.courseInteractions?.bubble.hide();
      await Promise.all([motion(viewport.querySelector(':scope > canvas'),[{opacity:1},{opacity:0}],180),motion(consolePanel,[{opacity:1},{opacity:0}],180)]);
      await Promise.all(['#optical-mirror-art','#optical-emitter-art','#optical-rail-art'].map((selector,i)=>motion(document.querySelector(selector),[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(38px)'}],340,i*65)));
      if(token!==epoch)return false;
      if(!N.course.enter(target))return false;
      await Promise.all([motion(table,[{transform:'translateY(0)'},{transform:'translateY(40px)'}],540),motion(assembly,[{opacity:0,transform:'translateY(30px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],540),motion(tray,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],220,540)]);
      return true;
    }catch(error){console.error('Workbench transition failed',error);return false;}finally{if(token===epoch)cleanup();}
  };
  N.course.subscribe(s=>{sync(s);if(busy&&s.stage!=='mirrors'&&s.stage!=='assembly'){++epoch;cleanup();}});sync(N.course.get());
  window.addEventListener('pagehide',()=>{++epoch;cleanup();});
})(window.Newton);

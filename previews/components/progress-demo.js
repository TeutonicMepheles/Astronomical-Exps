(() => {
  const $=id=>document.getElementById(id),course=Newton.course;
  const view=new ExperimentUI.ExperimentProgress($('experiment-navigation'),{onRequest:id=>course.enter(id)});
  const stages=['mirrors','assembly','observation'];
  stages.forEach(id=>$('progress-page-'+id).setAttribute('aria-labelledby',view.getTabId(id)));
  const unsubscribe=connectNewtonProgress({course,view,onActiveChange:s=>{
    stages.forEach(id=>$('progress-page-'+id).hidden=s.stage!==id);
    document.querySelectorAll('[data-observe]').forEach(button=>{const done=s.seen.includes('mirror:'+button.dataset.observe);button.classList.toggle('is-done',done);button.querySelector('small').textContent=done?'✓ 已观察':'点击观察';});
    document.querySelectorAll('[data-lens]').forEach(button=>{const done=s.seen.includes('lens:'+button.dataset.lens);button.classList.toggle('is-done',done);button.querySelector('small').textContent=done?'✓ 已观察':'点击观察';});
    document.querySelectorAll('[data-install]').forEach(button=>{const done=s.installed.includes(button.dataset.install);button.classList.toggle('is-done',done);button.disabled=done;button.querySelector('small').textContent=done?'✓ 已安装':'点击安装';});
    document.querySelectorAll('[data-record]').forEach(button=>{const done=s.records.some(r=>r.target===button.dataset.record);button.classList.toggle('is-done',done);button.querySelector('small').textContent=done?'✓ 已记录':'记录对照';});
    const next=stages[stages.indexOf(s.stage)+1];$('progress-next').disabled=!next||!course.canEnter(next);$('progress-next').textContent=next==='assembly'?'进入组装 →':next==='observation'?'进入观测 →':s.complete?'实验已完成 ✓':'完成四天体记录';
    $('progress-demo-feedback').textContent=s.complete?'三阶段已完成，可以切换页签复习。':s.message;
  }});
  const abort=new AbortController(),on=(node,event,fn)=>node.addEventListener(event,fn,{signal:abort.signal});
  document.querySelectorAll('[data-lens]').forEach(button=>on(button,'click',()=>course.mountLens(button.dataset.lens)));
  document.querySelectorAll('[data-observe]').forEach(button=>on(button,'click',()=>course.mountMirror(button.dataset.observe)));
  document.querySelectorAll('[data-install]').forEach(button=>on(button,'click',()=>course.install(button.dataset.install,button.dataset.install)));
  document.querySelectorAll('[data-record]').forEach(button=>on(button,'click',()=>{const target=button.dataset.record,pairs={saturn:[1600,9],moon:[1500,35],jupiter:[1600,13],pleiades:[1450,50]},[focal,eyepiece]=pairs[target];Newton.store.set({target,focal,eyepiece});const canvas=document.createElement('canvas');canvas.width=canvas.height=1;course.recordDrawing({optical:Newton.store.get(),image:canvas.toDataURL(),aim:{target,aligned:true,focused:true}});}));
  on($('progress-next'),'click',()=>course.enter(stages[stages.indexOf(course.get().stage)+1]));
  on($('progress-reset'),'click',()=>course.resetStage());on($('progress-restart'),'click',()=>course.restart());
  on(window,'pagehide',()=>{unsubscribe();view.destroy();abort.abort();});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
})();

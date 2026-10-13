(() => {
  const $=id=>document.getElementById(id),course=Newton.course;
  const view=new ExperimentUI.ExperimentProgress($('experiment-navigation'),{onRequest:id=>course.enter(id)});
  const stages=['mirrors','assembly','observation'];
  stages.forEach(id=>$('progress-page-'+id).setAttribute('aria-labelledby',view.getTabId(id)));
  const unsubscribe=connectNewtonProgress({course,view,onActiveChange:s=>{
    stages.forEach(id=>$('progress-page-'+id).hidden=s.stage!==id);
    document.querySelectorAll('[data-observe]').forEach(button=>{const done=s.seen.includes(button.dataset.observe);button.classList.toggle('is-done',done);button.querySelector('small').textContent=done?'✓ 已观察':'点击观察';});
    document.querySelectorAll('[data-install]').forEach(button=>{const done=s.installed.includes(button.dataset.install);button.classList.toggle('is-done',done);button.disabled=done;button.querySelector('small').textContent=done?'✓ 已安装':'点击安装';});
    document.querySelectorAll('[data-record]').forEach(button=>{const done=s.records.some(r=>r.eyepiece===Number(button.dataset.record));button.classList.toggle('is-done',done);button.querySelector('small').textContent=done?'✓ 已记录':'记录对照';});
    const next=stages[stages.indexOf(s.stage)+1];$('progress-next').disabled=!next||!course.canEnter(next);$('progress-next').textContent=next==='assembly'?'进入组装 →':next==='observation'?'进入观测 →':s.complete?'实验已完成 ✓':'完成三档记录';
    $('progress-demo-feedback').textContent=s.complete?'三阶段已完成，可以切换页签复习。':s.message;
  }});
  const abort=new AbortController(),on=(node,event,fn)=>node.addEventListener(event,fn,{signal:abort.signal});
  document.querySelectorAll('[data-observe]').forEach(button=>on(button,'click',()=>course.mountMirror(button.dataset.observe)));
  document.querySelectorAll('[data-install]').forEach(button=>on(button,'click',()=>course.install(button.dataset.install,button.dataset.install)));
  document.querySelectorAll('[data-record]').forEach(button=>on(button,'click',()=>{Newton.store.set({eyepiece:Number(button.dataset.record)});course.record();}));
  on($('progress-next'),'click',()=>course.enter(stages[stages.indexOf(course.get().stage)+1]));
  on($('progress-reset'),'click',()=>course.resetStage());on($('progress-restart'),'click',()=>course.restart());
  on(window,'pagehide',()=>{unsubscribe();view.destroy();abort.abort();});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
})();

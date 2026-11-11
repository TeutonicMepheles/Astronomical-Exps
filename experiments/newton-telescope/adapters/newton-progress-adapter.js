/* Newton-specific mapping lives outside the generic UI component. */
(() => {
  function connectNewtonProgress({course,view,onActiveChange=()=>{}}) {
    const sync=()=>{
      const s=course.get();
      const recognized=course.lessonTypes.filter(type=>s.seen.includes(type)).length,total=course.lessonTypes.length,stageOneDone=course.isStageOneComplete(s);
      view.setState({activeId:s.stage,steps:[
        {id:'mirrors',label:'认识五种镜片',current:recognized,total,detail:`${recognized} / ${total} 已认识`,completed:stageOneDone,panelId:'progress-page-mirrors'},
        {id:'assembly',label:'组装牛顿望远镜',current:s.installed.length,total:2,detail:`${s.installed.length} / 2 已安装`,completed:s.assemblyDone,locked:!s.testNavigation&&!course.canEnter('assembly'),lockReason:'先认识五类镜片',panelId:'progress-page-assembly'},
        {id:'observation',label:'观测四个天体',current:s.observedTargets.length,total:4,detail:`${s.observedTargets.length} / 4 已观测`,completed:s.complete,locked:!s.testNavigation&&!course.canEnter('observation'),lockReason:'先完成组装',panelId:'progress-page-observation'}
      ]});onActiveChange(s);
    };
    const unsubscribe=course.subscribe(sync);sync();return unsubscribe;
  }
  window.connectNewtonProgress=connectNewtonProgress;
})();

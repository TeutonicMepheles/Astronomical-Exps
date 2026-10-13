/* Newton-specific mapping lives outside the generic UI component. */
(() => {
  function connectNewtonProgress({course,view,onActiveChange=()=>{}}) {
    const sync=()=>{
      const s=course.get();
      view.setState({activeId:s.stage,steps:[
        {id:'mirrors',label:'认识镜面',current:s.seen.length,total:3,detail:`${s.seen.length} / 3 已观察`,completed:s.seen.length===3,panelId:'progress-page-mirrors'},
        {id:'assembly',label:'组装望远镜',current:s.installed.length,total:2,detail:`${s.installed.length} / 2 已安装`,completed:s.assemblyDone,locked:!course.canEnter('assembly'),lockReason:'先完成镜面观察',panelId:'progress-page-assembly'},
        {id:'observation',label:'参数观测',current:s.records.length,total:3,detail:`${s.records.length} / 3 已记录`,completed:s.complete,locked:!course.canEnter('observation'),lockReason:'先完成组装',panelId:'progress-page-observation'}
      ]});onActiveChange(s);
    };
    const unsubscribe=course.subscribe(sync);sync();return unsubscribe;
  }
  window.connectNewtonProgress=connectNewtonProgress;
})();

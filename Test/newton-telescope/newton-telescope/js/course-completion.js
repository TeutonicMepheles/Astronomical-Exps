/* Host adapter: completion edges open the shared view; only confirmation navigates. */
(function(N){
 'use strict';
 const dialog=new StageCompletionDialog(),notified=new Set();
 const steps=['mirrors','assembly','observation'];
 const content={
  mirrors:{title:'镜面观察完成',body:'你已观察平面镜、凹面镜和凸面镜的光路。',action:'前往组装 →',next:'assembly'},
  assembly:{title:'望远镜组装完成',body:'凹面主镜与平面副镜已安装到位。',action:'前往观测 →',next:'observation'},
  observation:{title:'本次实验已完成',body:'你已完成三档目镜的观测与记录。',action:'完成实验 ✓'}
 };
 const completed=s=>({mirrors:s.seen.length===3,assembly:s.assemblyDone,observation:s.complete});
 let pending=false;
 function sync(s){
  const done=completed(s);steps.forEach(key=>{if(!done[key])notified.delete(key);});
  if(pending||!done[s.stage]||notified.has(s.stage))return;
  pending=true;
  // Wait for all course subscribers and the current drop handler to finish first.
  queueMicrotask(()=>{
   pending=false;const current=N.course.get(),stage=current.stage;
   if(!completed(current)[stage]||notified.has(stage))return;
   const data=content[stage];
   if(dialog.show({...data,kicker:`阶段 0${steps.indexOf(stage)+1} 完成`},()=>{
    const latest=N.course.get();
    if(data.next&&latest.stage===stage&&completed(latest)[stage])N.course.requestEnter(data.next);
   }))notified.add(stage);
  });
 }
 N.course.subscribe(sync);sync(N.course.get());
})(window.Newton);

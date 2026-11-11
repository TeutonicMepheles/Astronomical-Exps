/* Completion feedback follows the actual learning edges; assembly waits for its 3D turn. */
(function(N){
 'use strict';
 const dialog=new NewtonCompletionDialog(),notified=new Set();
 const steps=['mirrors','assembly','observation'];
 const content={
  mirrors:{title:'镜片认识完成',body:'你已观察平面镜、凹面镜、凸面镜、凹透镜和凸透镜的光路。',action:'前往组装 →',next:'assembly'},
  assembly:{title:'望远镜组装完成',body:'凹面主镜与平面副镜已安装到位。你已完成一圈立体观察。',stayAction:'继续观察',action:'前往星空观测 →',next:'observation'},
  observation:{title:'本次实验已完成',body:'你已完成三档目镜的观测与记录。',action:'完成实验 ✓'}
 };
 const completed=s=>({mirrors:N.course.isStageOneComplete(s),assembly:s.assemblyDone,observation:s.complete});
 function show(stage){
  const data=content[stage];
  return dialog.show({...data,kicker:`阶段 0${steps.indexOf(stage)+1} 完成`},()=>{
   const latest=N.course.get();
   if(data.next&&latest.stage===stage&&completed(latest)[stage])N.course.requestEnter(data.next,{completionConfirmed:true});
  });
 }
 N.courseCompletion={dismiss(){return dialog.dismiss(false);},requestMirrors(){
  const s=N.course.get();return s.stage==='mirrors'&&completed(s).mirrors?show('mirrors'):false;
 },requestAssembly(){
  const s=N.course.get();return s.stage==='assembly'&&completed(s).assembly?show('assembly'):false;
 }};
 let pending=false;
 function sync(s){
  if(N.developer?.enabled&&s.stage!=='mirrors')return;
  const done=completed(s);steps.forEach(key=>{if(!done[key])notified.delete(key);});
  // Assembly is confirmed after the automatic inspection completes, not when
  // the second mirror is installed.
  if(s.stage==='assembly'||pending||!done[s.stage]||notified.has(s.stage))return;
  pending=true;
  // Wait for all course subscribers and the current drop handler to finish first.
  queueMicrotask(()=>{
   pending=false;const current=N.course.get(),stage=current.stage;
   if((N.developer?.enabled&&stage!=='mirrors')||stage==='assembly'||!completed(current)[stage]||notified.has(stage))return;
   if(show(stage))notified.add(stage);
  });
 }
 N.course.subscribe(sync);sync(N.course.get());
})(window.Newton);

// Client-provided ideal comparison, not CZ-7 engineering parameters.
export const STAGING_CONSTANTS=Object.freeze({payload:5,exhaustSpeed:3,playbackSeconds:18});
export const STAGING_PLANS=Object.freeze([
 Object.freeze({name:'单级小火箭',fuel:Object.freeze([100]),dry:Object.freeze([10]),color:'#96b4d4'}),
 Object.freeze({name:'单级大火箭',fuel:Object.freeze([300]),dry:Object.freeze([30]),color:'#d1a7a1'}),
 Object.freeze({name:'三级火箭',fuel:Object.freeze([100,100,100]),dry:Object.freeze([10,10,10]),color:'#a8c4c6'})
]);
const total=items=>items.reduce((sum,value)=>sum+value,0);
const EPS=1e-10;

/** Absolute propulsion-consumption sample. Jettison removes dry mass, adds no Δv. */
export function sampleStaging(index,progress,edge='after'){
 const plan=STAGING_PLANS[index];if(!plan)throw new RangeError('Unknown comparison plan');
 if(!Number.isFinite(progress)||!['before','after'].includes(edge))throw new TypeError('Invalid staging sample');
 const u=Math.max(0,Math.min(1,progress)),fuelTotal=total(plan.fuel),dryTotal=total(plan.dry);
 const initialMass=STAGING_CONSTANTS.payload+fuelTotal+dryTotal;
 let mass=initialMass,dv=0,availableBurn=u*fuelTotal,detached=0;
 const remaining=[...plan.fuel];
 for(let stage=0;stage<plan.fuel.length;stage++){
  const consumed=Math.min(plan.fuel[stage],Math.max(0,availableBurn)),ignitionMass=mass;
  mass-=consumed;dv+=STAGING_CONSTANTS.exhaustSpeed*Math.log(ignitionMass/mass);
  remaining[stage]-=consumed;availableBurn-=consumed;
  if(remaining[stage]>EPS)break;
  const boundary=total(plan.fuel.slice(0,stage+1))/fuelTotal;
  if(stage<plan.fuel.length-1){
   if(Math.abs(u-boundary)<=EPS&&edge==='before')break;
   mass-=plan.dry[stage];detached++;
  }
 }
 return{progress:u,edge,initialMass,mass,dv,remaining,detached,fuelTotal,dryTotal,fuelRemaining:total(remaining)};
}

export const STAGING_EVENTS=Object.freeze([
 {progress:1/3,edge:'before',stage:1},{progress:1/3,edge:'after',stage:1},
 {progress:2/3,edge:'before',stage:2},{progress:2/3,edge:'after',stage:2},
 {progress:1,edge:'before',stage:3}
].map(Object.freeze));

export class StagingLesson {
 constructor(planIndex=2){if(!STAGING_PLANS[planIndex])throw new RangeError('Unknown comparison plan');this.planIndex=planIndex;this.slow=false;this.reset();}
 reset(){this.progress=0;this.edge='after';this.running=false;this.phase='fuel';this.ejectStage=0;this.ejectProgress=0;this.effectTime=0;}
 get complete(){return this.progress>=1;}
 get waitingStage(){return this.phase==='gate'?Math.round(this.progress*3):0;}
 get actionLabel(){if(this.phase==='gate')return this.waitingStage===1?'抛掉空一级':'抛掉空二级';if(this.phase==='eject')return this.running?'暂停':'继续分离';if(this.complete)return '重播';if(this.running)return '暂停';return this.progress>0?'继续燃烧':'点火对比';}
 samples(){return STAGING_PLANS.map((_,i)=>sampleStaging(i,this.progress,this.edge));}
 act(){
  if(this.complete){this.reset();this.running=true;return;}
  if(this.phase==='gate'){this.ejectStage=this.waitingStage;this.ejectProgress=0;this.phase='eject';this.running=true;return;}
  if(this.phase==='after'){this.phase='fuel';this.edge='after';this.running=true;return;}
  this.running=!this.running;
 }
 toggle(){this.act();}
 pause(){this.running=false;}
 advance(dt){
  if(!Number.isFinite(dt)||dt<0)throw new TypeError('Invalid clock delta');if(!this.running)return false;
  const delta=dt*(this.slow?.25:1);if(this.phase!=='eject')this.effectTime+=delta;
  if(this.phase==='eject'){this.ejectProgress=Math.min(1,this.ejectProgress+delta/.8);if(this.ejectProgress>=1){this.edge='after';this.phase='after';this.running=false;}return true;}
  const next=(this.planIndex===2?[1/3,2/3,1]:[1]).find(u=>u>this.progress+EPS)||1;
  // Snap the accumulated endpoint before selecting another boundary on the next frame.
  // Otherwise rounding just below a gate can make the EPS-based search skip it.
  const advanced=this.progress+delta/STAGING_CONSTANTS.playbackSeconds;
  this.progress=advanced>=next-EPS?next:advanced;
  if(this.progress>=next){this.running=false;this.edge=next<1?'before':'after';this.phase=next<1?'gate':'complete';}
  return true;
 }
 seek(progress,{snap=false}={}){
  if(!Number.isFinite(progress))throw new TypeError('Invalid progress');let u=Math.max(0,Math.min(1,progress));
  const near=(this.planIndex===2?[1/3,2/3]:[]).find(boundary=>Math.abs(boundary-u)<(snap?.008:EPS));if(near!==undefined)u=near;
  this.progress=u;this.edge=near!==undefined?'before':'after';this.phase=near!==undefined?'gate':u>=1?'complete':'fuel';this.ejectStage=0;this.ejectProgress=0;this.pause();
 }
 // Exact before/after samples remain available to tests and teacher inspection.
 nextEvent(){const next=STAGING_EVENTS.find(e=>e.progress>this.progress+EPS||Math.abs(e.progress-this.progress)<=EPS&&e.edge==='after'&&this.edge==='before')||STAGING_EVENTS[0];this.progress=next.progress;this.edge=next.edge;this.phase=next.progress===1?'complete':next.edge==='before'?'gate':'after';this.ejectStage=0;this.ejectProgress=0;this.pause();return next;}
 get event(){return STAGING_EVENTS.find(e=>Math.abs(e.progress-this.progress)<=EPS&&e.edge===this.edge);}
 get explanation(){
  if(this.complete){const values=this.samples();return '末级结构保留 · 同样投入，三级方案的理想 Δv 多 '+(values[2].dv-values[1].dv).toFixed(2)+' km/s。';}
  if(this.phase==='eject')return '抛离空结构 · Δv 保持 '+this.samples()[2].dv.toFixed(2)+' km/s';
  const e=this.event;if(!e)return '';
  if(e.edge==='before')return '第'+e.stage+'级燃尽 · 点选高亮空结构，观察抛离后的变化。';
  const before=sampleStaging(2,e.progress,'before'),after=sampleStaging(2,e.progress,'after');return before.mass.toFixed(0)+' → '+after.mass.toFixed(0)+' t · Δv 保持 '+after.dv.toFixed(2)+' km/s';
 }
}

/** Three independent playbacks; switching tabs never advances a hidden plan. */
export class StagingComparison {
 constructor(){this.lessons=STAGING_PLANS.map((_,i)=>new StagingLesson(i));this.activeIndex=0;this.completed=new Set();}
 get current(){return this.lessons[this.activeIndex];}
 get allFinished(){return this.completed.size===3;}
 select(index){if(!this.lessons[index])throw new RangeError('Unknown comparison plan');this.pause();this.activeIndex=index;}
 get progress(){return this.current.progress;} get edge(){return this.current.edge;}
 get phase(){return this.current.phase;} get running(){return this.current.running;}
 get complete(){return this.current.complete;} get waitingStage(){return this.current.waitingStage;}
 get ejectStage(){return this.current.ejectStage;} get ejectProgress(){return this.current.ejectProgress;}
 get effectTime(){return this.current.effectTime;} get slow(){return this.current.slow;}
 set slow(value){this.lessons.forEach(l=>l.slow=!!value);}
 get actionLabel(){return this.current.progress===0&&!this.current.running?'开始':this.current.actionLabel;}
 get explanation(){
  if(this.allFinished)return '相同投入：三级比单级大火箭多 '+(sampleStaging(2,1).dv-sampleStaging(1,1).dv).toFixed(2)+' km/s。';
  if(this.activeIndex===2&&!this.complete)return this.current.explanation;
  return this.complete?'播放完成 · 可切换方案继续观察。':'';
 }
 samples(){return this.lessons.map((l,i)=>sampleStaging(i,l.progress,l.edge));}
 act(){if(this.current.complete)this.completed.delete(this.activeIndex);this.current.act();} toggle(){this.act();}
 pause(){this.lessons.forEach(l=>l.pause());}
 advance(dt){const changed=this.current.advance(dt);if(changed&&this.current.complete)this.completed.add(this.activeIndex);return changed;}
 seek(progress,options){this.current.seek(progress,options);}
 reset(){this.lessons.forEach(l=>l.reset());this.completed.clear();}
}

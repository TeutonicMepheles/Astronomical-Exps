// Adapted from SpaceHTML/app.js foucaultState and drawFoucaultPendulum,
// explicitly requested in Raft db142a28, 2026-11-04. No runtime dependency.
export const defaults={latitude:39.9,length:67,mass:28,speedMode:'earth',speed:3600};
export function stageOnePeriod(config){return config.periodOverride??2*Math.PI*Math.sqrt(config.length/9.81);}
export function pendulumState(time,config=defaults){
  const period=stageOnePeriod(config);
  const pendulumTime=time*(config.speedMode==='all'?config.speed:1);
  const swing=Math.sin(pendulumTime*2*Math.PI/period)*.48;
  const rotation=time*config.speed*15*Math.sin(config.latitude*Math.PI/180)/3600*Math.PI/180;
  const reach=Math.sin(swing)/Math.sin(.48);
  return {period,swing,rotation,x:reach*Math.cos(rotation),z:reach*Math.sin(rotation)};
}
export function createTrail(config=defaults){
  const points=[];
  return {points,advance(time){
    let sampleTime=points.length?points[points.length-1].time:-.025,added=0;
    while(sampleTime+.025<=time&&added<80){sampleTime+=.025;const p=pendulumState(sampleTime,config);points.push({time:sampleTime,x:p.x,z:p.z});added++;}
    if(points.length>900)points.splice(0,points.length-900);
  }};
}

// Integrate elapsed intervals: changing speed affects future motion only.
export function createMotion(config=defaults){
  let swingPhase=0, rotation=0, time=0;
  const points=[];
  function state(){
    const period=stageOnePeriod(config);
    const p={period,swing:Math.sin(swingPhase)*.48};
    return {...p,rotation,x:Math.sin(p.swing)/Math.sin(.48)*Math.cos(rotation),
      z:Math.sin(p.swing)/Math.sin(.48)*Math.sin(rotation)};
  }
  return {points,state,clearTrail(){points.length=0;},advance(dt){
    if(!Number.isFinite(dt)||dt<=0)return state();
    // Bounded substeps keep trail vertices on the same continuous motion.
    const steps=Math.ceil(dt/.025),step=dt/steps;
    for(let i=0;i<steps;i++){
      const period=stageOnePeriod(config);
      swingPhase+=step*(config.speedMode==='all'?config.speed:1)*2*Math.PI/period;
      rotation+=step*config.speed*15*Math.sin(config.latitude*Math.PI/180)/3600*Math.PI/180;
      time+=step;
      const p=state();points.push({time,x:p.x,z:p.z});
    }
    if(points.length>900)points.splice(0,points.length-900);
    return state();
  }};
}

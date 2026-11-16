// Great-circle travel over the Earth, driven by the existing scene clock.
export function createObserverTransition(){
 let travel=null,progress=1;
 const vector=a=>[Math.cos(a.latitude)*Math.cos(a.longitude),Math.cos(a.latitude)*Math.sin(a.longitude),Math.sin(a.latitude)];
 return {
  start(from,to,now){travel={from,to,started:now};progress=0;},
  cancel(){travel=null;progress=1;},
  get active(){return travel!==null;},
  get progress(){return progress;},
  update(now){if(!travel)return null;const {from,to,started}=travel,t=Math.max(0,Math.min(1,(now-started)/1000));progress=t*t*(3-2*t);if(t===1){travel=null;return to;}const a=vector(from),b=vector(to),angle=Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0)))),sin=Math.sin(angle),p=angle<1e-7?a.map((x,i)=>x+(b[i]-x)*progress):a.map((x,i)=>(x*Math.sin((1-progress)*angle)+b[i]*Math.sin(progress*angle))/sin),length=Math.hypot(...p);return {latitude:Math.asin(p[2]/length),longitude:Math.atan2(p[1],p[0])};},
  dispose(){travel=null;}
 };
}

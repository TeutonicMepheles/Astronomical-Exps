// Presentation geometry only: no thrust, mass, velocity or trajectory parameters.
export const smooth=value=>{const u=Math.max(0,Math.min(1,value));return u*u*(3-2*u);};
const lerp=(a,b,u)=>a+(b-a)*u;
export function separationCamera(time){
 const lower=smooth((time-5)/1.5),fairing=smooth((time-8)/1.5),payload=smooth((time-11)/1.5);
 let top=50*fairing,bottom=lerp(700,318,lower),height=lerp(460,420,lower)-20*fairing;
 if(payload>0){top=50-85*payload;bottom=lerp(318,164-85*payload,payload);height=lerp(400,380,payload);}
 const scale=height/(bottom-top),focus=(top+bottom)/2;
 return{x:1100,y:255-focus*scale,height:scale*700,rotation:0,scale,top,bottom,focus,screenHeight:height,clip:{x:720,y:8,width:775,height:550}};
}
// A released part keeps drifting and exits; it does not remain at a fixed offset.
export function releasedAppearance(part,item,time,state){
 let age=-1,side=1;
 if(part===2){age=time-2;side=[-1,1,-1,1][item.index];}
 else if(part===0){age=time-5;side=-1;}
 else if(part===4){age=time-8;side=item.x<0?-1:1;}
 if(age<=0)return item;
 const r={...item},e=age*age;
 r.x+=side*(part===2?34:part===4?30:10)*e;
 r.y+=(part===0?100:75)*e;
 r.angle+=side*.055*age;
 r.alpha*=1-smooth((age-1.2)/1.5);
 return r;
}
export function ascentOffset(step,time,distance=0){
 if(step===2)return distance*smooth(time/5)*4;
 if(step===7){const u=Math.max(0,time-1.2);return 45*u*u;}
 if(step===8)return time*36+time*time*3;
 return 0;
}

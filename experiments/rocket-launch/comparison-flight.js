import {sampleStaging,STAGING_CONSTANTS} from './staging-model.js';
export const COMPARISON_BOTTOM=552;
export const COMPARISON_TOP=114;
export const COMPARISON_SPAN=30;

export function comparisonRange(heights,complete){
 if(complete)return {min:80,max:105};
 const highest=Math.max(...heights),lowest=Math.min(...heights);
 const headroom=Math.min(5,(100-highest)/2);
 const min=Math.max(0,Math.min(70,highest+headroom-COMPARISON_SPAN,Math.max(lowest,highest-COMPARISON_SPAN)));
 const approach=Math.max(0,Math.min(1,(highest-90)/10));
 const blend=approach*approach*(3-2*approach);
 return {
  min:Math.min(lowest,min+(80-min)*blend),
  max:min+COMPARISON_SPAN+(105-min-COMPARISON_SPAN)*blend
 };
}

export const comparisonHeightY=(height,range)=>COMPARISON_BOTTOM-
 (COMPARISON_BOTTOM-COMPARISON_TOP)*(height-range.min)/(range.max-range.min);

export function comparisonFrame(index,height,launched,range){
 const arrowX=180+index*435, arrowY=comparisonHeightY(height,range);
 const window={x:arrowX+54,y:Math.min(332,arrowY+5),width:158,height:210};
 return {arrowX,arrowY,window,labelX:arrowX+100,
  modelX:launched?window.x+window.width/2:arrowX+100,
  modelBase:launched?window.y+158:COMPARISON_BOTTOM};
}
const N=384,integrals=Array.from({length:3},(_,i)=>{const a=new Float64Array(N+1);let previous=0;for(let n=1;n<=N;n++){const v=sampleStaging(i,n/N).dv;a[n]=a[n-1]+(previous+v)/2/N*STAGING_CONSTANTS.playbackSeconds;previous=v;}return a;});
const gates=[1/3,2/3],coast=.8;
const integral=(i,u)=>{const n=Math.min(N,u*N),lo=Math.floor(n);return integrals[i][lo]+(integrals[i][Math.min(N,lo+1)]-integrals[i][lo])*(n-lo);};
const reference=integral(2,1)+gates.reduce((sum,u)=>sum+sampleStaging(2,u).dv*coast,0);
/** Common-scale displacement of the existing ideal velocities, normalized to the triple's final 100. No real altitude claim. */
export function comparisonFlight(lesson){const u=lesson.progress,triple=lesson.lessons[2];const fractions=gates.map((gate,i)=>u>gate+1e-9?1:Math.abs(u-gate)<1e-9?(triple.phase==='eject'&&triple.ejectStage===i+1?triple.ejectProgress:triple.edge==='after'?1:0):0);const heights=[0,1,2].map(i=>100*(integral(i,u)+gates.reduce((sum,gate,j)=>sum+sampleStaging(i,gate).dv*coast*fractions[j],0))/reference);const progress=(u*18+fractions.reduce((a,b)=>a+b,0)*coast)/19.6;return{heights,progress};}

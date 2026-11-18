import {sampleStaging,STAGING_CONSTANTS} from './staging-model.js';
import {comparisonView} from './ascent-presentation.js';
const N=384,integrals=Array.from({length:3},(_,i)=>{const a=new Float64Array(N+1);let previous=0;for(let n=1;n<=N;n++){const v=sampleStaging(i,n/N).dv;a[n]=a[n-1]+(previous+v)/2/N*STAGING_CONSTANTS.playbackSeconds;previous=v;}return a;});
const gates=[1/3,2/3],coast=.8;
const integral=(i,u)=>{const n=Math.min(N,u*N),lo=Math.floor(n);return integrals[i][lo]+(integrals[i][Math.min(N,lo+1)]-integrals[i][lo])*(n-lo);};
const reference=integral(2,1)+gates.reduce((sum,u)=>sum+sampleStaging(2,u).dv*coast,0);
/** Common-scale displacement of the existing ideal velocities, normalized to the triple's final 100. No real altitude claim. */
export function comparisonFlight(lesson){const u=lesson.progress,triple=lesson.lessons[2];const fractions=gates.map((gate,i)=>u>gate+1e-9?1:Math.abs(u-gate)<1e-9?(triple.phase==='eject'&&triple.ejectStage===i+1?triple.ejectProgress:triple.edge==='after'?1:0):0);const heights=[0,1,2].map(i=>100*(integral(i,u)+gates.reduce((sum,gate,j)=>sum+sampleStaging(i,gate).dv*coast*fractions[j],0))/reference);const progress=(u*18+fractions.reduce((a,b)=>a+b,0)*coast)/19.6;return{heights,progress,view:comparisonView(progress,heights)};}

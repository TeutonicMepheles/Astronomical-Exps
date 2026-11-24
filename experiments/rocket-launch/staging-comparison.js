import {decorateReplayButton} from './replay-icon.js';
import {STAGING_PLANS as PLANS,sampleStaging} from './staging-model.js';
import {comparisonFlight,comparisonFrame,comparisonHeightY,comparisonRange,COMPARISON_BOTTOM,COMPARISON_TOP} from './comparison-flight.js?v=altitude-result-focus';
const conditions=PLANS.map((_,i)=>{
 const {dryTotal,fuelTotal}=sampleStaging(i,0);
 return `自重 ${dryTotal} t · 燃料 ${fuelTotal} t`;
});
const heightText=(height,complete)=>`${complete?'最终高度':'当前高度'} ${Math.round(height)} 示意格`;

function drawHeightGrid(c,range){
 c.font='20px "Alibaba PuHuiTi 3",sans-serif';
 c.textAlign='left';
 c.fillStyle='#c5d4de';
 c.fillText('相对高度 · 示意格',56,COMPARISON_TOP-25);
 for(let value=Math.ceil(range.min/5)*5;value<=range.max;value+=5){
  const y=comparisonHeightY(value,range);
  c.beginPath();
  c.moveTo(54,y);
  c.lineTo(1438,y);
  c.strokeStyle=value===0?'#a6b8c6':'#8ca6b948';
  c.lineWidth=value===0?2:1;
  c.stroke();
  c.fillText(String(value),56,y-8);
 }
}

function drawResult(c,x,y,height,color){
 c.beginPath();
 c.roundRect(x-75,y-53,150,37,10);
 c.fillStyle='#192e43';
 c.fill();
 c.strokeStyle=color;
 c.lineWidth=1.5;
 c.stroke();
 c.beginPath();
 c.moveTo(x-6,y-16);
 c.lineTo(x,y-8);
 c.lineTo(x+6,y-16);
 c.stroke();
 c.font='22px "Alibaba PuHuiTi 3",sans-serif';
 c.fillStyle=color;
 c.fillText(Math.round(height)+' 示意格',x,y-28);
}

export function drawStagingComparison(c,lesson,arrows){
 const {heights}=comparisonFlight(lesson);
 const launched=lesson.running||lesson.progress>0||lesson.complete;
 c.save();
 const range=comparisonRange(heights,lesson.complete);
 if(launched)drawHeightGrid(c,range);
 for(const [index,plan] of PLANS.entries()){
  const height=heights[index];
  const {arrowX,arrowY,window:panel,labelX}=comparisonFrame(index,height,launched,range);
  c.textAlign='center';
  if(launched){
   c.beginPath();
   c.roundRect(panel.x,panel.y,panel.width,panel.height,12);
   c.fillStyle='#101e30f2';
   c.fill();
   c.strokeStyle=plan.color;
   c.lineWidth=1.5;
   c.stroke();
   if(arrowY<COMPARISON_BOTTOM)arrows.drawBetween(c,{id:'staging-height-'+index,from:[arrowX,COMPARISON_BOTTOM],to:[arrowX,arrowY],color:plan.color,height:32});
   if(lesson.complete)drawResult(c,arrowX,arrowY,height,plan.color);
  }
  c.fillStyle=plan.color;
  c.font='25px "Alibaba PuHuiTi 3",sans-serif';
  c.fillText(plan.name,labelX,598);
  c.font='21px "Alibaba PuHuiTi 3",sans-serif';
  c.fillText(conditions[index],labelX,627);
 }
 c.restore();
}
export function mountStagingComparison({lesson,controls,parts,feedback,invalidate,onRunning,isReady=()=>true}){const output=document.createElement('output');output.id='dv-metrics';output.className='dv-accessible';output.setAttribute('aria-label','三枚火箭教学数据与相对高度');parts.append(output);const play=document.createElement('button');play.id='dv-play';play.className='rocket-comparison-play';controls.append(play);play.onclick=()=>{lesson.reset();lesson.act();sync();};let last='',wasLaunched;function sync(){
 const launched=lesson.running||lesson.progress>0||lesson.complete;
 if(launched!==wasLaunched){
  if(launched)decorateReplayButton(play);
  else{play.textContent='▶';play.setAttribute('aria-label','发射');play.title='发射';}
  wasLaunched=launched;
 }
 play.disabled=!isReady();onRunning(lesson.running);const text=comparisonFlight(lesson).heights.map((h,i)=>PLANS[i].name+'，'+conditions[i]+'，'+heightText(h,lesson.complete)).join('；');if(text!==last){output.textContent=text;last=text;}feedback.textContent='';invalidate();}sync();return{sync,destroy(){lesson.pause();output.remove();}};}

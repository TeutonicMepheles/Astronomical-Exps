import {loadRocketSilhouette} from './rocket-silhouette.js';
import {decorateReplayButton} from './replay-icon.js';
import {STAGING_PLANS as PLANS,sampleStaging} from './staging-model.js';
import {comparisonFlight,comparisonFrame,comparisonHeightY,comparisonRange,COMPARISON_BOTTOM,COMPARISON_TOP} from './comparison-flight.js?v=taller-comparison';
import {ALTITUDE_INK,altitudeLine,drawAltitudeGrid,drawAltitudeFlight,drawAltitudeGuides} from './altitude-chart.js';
const AXIS_LEFT=94;
const backdrop=new Image();
const launchPad=new Image();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const conditions=PLANS.map((_,i)=>{
 const {dryTotal,fuelTotal}=sampleStaging(i,0);
 return `自重 ${dryTotal} t · 燃料 ${fuelTotal} t`;
});
const heightText=(height,complete)=>`${complete?'最终高度':'当前高度'} ${Math.round(height)} 示意格`;

function drawPreview(c,panel,height,launched,color){
 const {x,y,width,height:boxHeight}=panel;
 const image=launched?backdrop:launchPad;
 c.save();
 c.beginPath();
 c.roundRect(x,y,width,boxHeight,12);
 c.clip();
 c.fillStyle='#14263a';
 c.fillRect(x,y,width,boxHeight);
 if(image.naturalWidth&&launched){
  // Crop a vertical slice so the horizon can move through the tall window.
  const altitude=reducedMotion.matches?(height>=98?100:height>=90?92:height>=45?86:0):height;
  const sourceHeight=image.naturalHeight*.35;
  const sourceWidth=sourceHeight*width/boxHeight;
  const sourceTop=altitude<=86?.65-.12*altitude/86:
   .53*Math.max(0,(100-altitude)/14);
  c.drawImage(image,(image.naturalWidth-sourceWidth)/2,sourceTop*image.naturalHeight,
   sourceWidth,sourceHeight,x,y,width,boxHeight);
 }else if(image.naturalWidth){
  const scale=Math.max(width/image.naturalWidth,boxHeight/image.naturalHeight);
  const imageWidth=image.naturalWidth*scale, imageHeight=image.naturalHeight*scale;
  c.drawImage(image,x+(width-imageWidth)/2,y+boxHeight-imageHeight,imageWidth,imageHeight);
 }
 c.fillStyle='#0d1c2d88';
 c.fillRect(x,y,width,boxHeight);
 c.strokeStyle=color;
 c.lineWidth=2;
 c.stroke();
 c.restore();
}

function drawResult(c,x,y,height,color){
 c.beginPath();
 c.roundRect(x-34,y-53,68,37,10);
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
 c.fillText(String(Math.round(height)),x,y-28);
}

export function drawStagingComparison(c,lesson){
 const {heights}=comparisonFlight(lesson);
 const range=comparisonRange(heights);
 const yAt=height=>comparisonHeightY(height,range);
 const launched=lesson.running||lesson.progress>0||lesson.complete;
 c.save();
 drawAltitudeGrid(c,{left:AXIS_LEFT,right:1438,top:COMPARISON_TOP,ground:COMPARISON_BOTTOM,
  ...range,interval:5,yAt,title:'相对高度（示意格）'});
 if(lesson.complete){
  PLANS.forEach((plan,index)=>{
   const {x}=comparisonFrame(index);
   drawAltitudeGuides(c,AXIS_LEFT,COMPARISON_BOTTOM,x,yAt(heights[index]),plan.color);
  });
 }
 const triple=lesson.lessons[2];
 const detached=lesson.samples()[2].detached;
 for(const [index,plan] of PLANS.entries()){
  const height=heights[index];
  const {x,panel}=comparisonFrame(index);
  const y=yAt(height), labelX=panel.x+panel.width/2;
  c.textAlign='center';
  altitudeLine(c,x,COMPARISON_BOTTOM,x,COMPARISON_BOTTOM+7,ALTITUDE_INK);
  drawPreview(c,panel,height,launched,plan.color);
  if(index===2&&(triple.phase==='eject'||detached)){
   c.fillStyle='#f2ddaf';
   c.font='22px "Alibaba PuHuiTi 3", sans-serif';
   const stage=triple.ejectStage===1?'一':'二';
   c.fillText(triple.phase==='eject'?stage+'级正在分离':'已分离 '+detached+' 级',panel.x+panel.width/2,COMPARISON_BOTTOM-28);
  }
  if(launched){
   if(lesson.complete){
    c.beginPath();
    c.arc(x,y,7,0,Math.PI*2);
    c.fillStyle=plan.color;
    c.fill();
    drawResult(c,x,y,height,plan.color);
   }else{
    drawAltitudeFlight(c,x,y,COMPARISON_BOTTOM,plan.color);
    c.font='20px "Alibaba PuHuiTi 3", sans-serif';
    c.textAlign='right';
    c.fillStyle=plan.color;
    c.fillText(String(Math.round(height)),x-24,y-9);
    c.textAlign='center';
   }
  }
  c.fillStyle=plan.color;
  c.font='25px "Alibaba PuHuiTi 3",sans-serif';
  c.fillText(plan.name,labelX,COMPARISON_BOTTOM+29);
  c.font='21px "Alibaba PuHuiTi 3",sans-serif';
  c.fillText(conditions[index],labelX,COMPARISON_BOTTOM+54);
 }
 c.restore();
}
export function mountStagingComparison({lesson,controls,parts,feedback,invalidate,onRunning,isReady=()=>true}){loadRocketSilhouette(invalidate);
 if(!backdrop.src){
  backdrop.onload=invalidate;
  backdrop.src=new URL('./assets/vertical-launch/ascent.webp',import.meta.url).href;
  launchPad.onload=invalidate;
  launchPad.src=new URL('./assets/launch-pad/force-window-ground.webp',import.meta.url).href;
 }
 const output=document.createElement('output');output.id='dv-metrics';output.className='dv-accessible';output.setAttribute('aria-label','三枚火箭教学数据与相对高度');parts.append(output);const play=document.createElement('button');play.id='dv-play';play.className='rocket-comparison-play';controls.append(play);play.onclick=()=>{lesson.reset();lesson.act();sync();};let last='',wasLaunched;function sync(){
 const launched=lesson.running||lesson.progress>0||lesson.complete;
 if(launched!==wasLaunched){
  if(launched)decorateReplayButton(play);
  else{play.textContent='▶';play.setAttribute('aria-label','发射');play.title='发射';}
  wasLaunched=launched;
 }
 play.disabled=!isReady();onRunning(lesson.running);const text=comparisonFlight(lesson).heights.map((h,i)=>PLANS[i].name+'，'+conditions[i]+'，'+heightText(h,lesson.complete)).join('；');if(text!==last){output.textContent=text;last=text;}feedback.textContent='';invalidate();}sync();return{sync,destroy(){lesson.pause();output.remove();}};}

import {STAGING_PLANS as PLANS,sampleStaging} from './staging-model.js';
import {createControlGroup,markSwitch} from './interaction-contract.js';

// Curves are cached independently of playback and drawing. No additional RAF/renderer.
const curves=PLANS.map((_,i)=>Array.from({length:601},(_,j)=>sampleStaging(i,j/600)));
const ink='#e8e0cc',muted='#a9b0bf',lineColor='#a9b0bf40';
const text=(c,value,x,y,size=22,color=ink,align='left')=>{c.fillStyle=color;c.font=`${size}px "Microsoft YaHei",sans-serif`;c.textAlign=align;c.fillText(value,x,y);};
const line=(c,x1,y1,x2,y2,color=lineColor,width=1)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
const rect=(c,x,y,w,h,color,r=4)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};

export function drawStagingComparison(c,lesson){
 const values=lesson.samples(),index=lesson.activeIndex,selected=values[index],all=lesson.allFinished;c.save();
 rect(c,20,12,640,622,'#10182c42',16);rect(c,685,12,795,622,'#10182c42',16);
 text(c,all?'三方案对比':'累计 Δv',730,62,27);
 if(all){
  PLANS.forEach((p,i)=>{const y=107+i*36;line(c,730,y-7,759,y-7,p.color,4);text(c,p.name,774,y,21,p.color);text(c,sampleStaging(i,1).dv.toFixed(2)+' km/s',1430,y,23,p.color,'right');});
 }else{
  text(c,selected.dv.toFixed(2),730,129,54,PLANS[index].color);text(c,'km/s',920,127,22,muted);
  text(c,'当前质量 '+selected.mass.toFixed(1)+' t',730,177,22);text(c,'推进剂 '+selected.fuelRemaining.toFixed(1)+' t',1430,177,22,muted,'right');
 }
 const plan=PLANS[index];text(c,'推进剂 '+plan.fuel.reduce((a,b)=>a+b,0)+' t · 结构 '+plan.dry.reduce((a,b)=>a+b,0)+' t · 载荷 5 t',340,600,20,muted,'center');
 const x0=790,y0=550,w=640,h=305;
 text(c,'Δv / km/s',730,225,19,muted);
 for(const tick of [0,2,4,6,8,10]){const y=y0-tick/10*h;line(c,x0,y,x0+w,y);text(c,String(tick),x0-20,y+6,18,muted,'right');}
 for(const u of [0,.25,.5,.75,1]){const x=x0+u*w;text(c,String(u*100)+'%',x,y0+33,18,muted,'center');}
 if(index===2&&!all)for(const [u,label]of [[1/3,'一级'],[2/3,'二级']]){line(c,x0+u*w,y0-h,x0+u*w,y0,'#d8b07435');text(c,label,x0+u*w,y0-h-10,18,'#d8b074','center');}
 text(c,'推进剂消耗比例',1110,615,20,muted,'center');
 for(const i of all?[0,1,2]:[index]){
  const progress=all?1:lesson.progress,p=PLANS[i];c.beginPath();c.lineWidth=3.5;c.strokeStyle=p.color;
  for(const [j,v]of curves[i].entries()){if(v.progress>progress)break;const x=x0+v.progress*w,y=y0-v.dv/10*h;if(j)c.lineTo(x,y);else c.moveTo(x,y);}
  const v=all?sampleStaging(i,1):selected,x=x0+progress*w,y=y0-v.dv/10*h;c.lineTo(x,y);c.stroke();c.fillStyle=p.color;c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();
 }
 if(!all){const cursor=x0+lesson.progress*w;line(c,cursor,y0-h,cursor,y0,'#d8b07455');c.fillStyle='#d8b074';c.beginPath();c.arc(cursor,y0,7,0,Math.PI*2);c.fill();}
 c.restore();return values;
}

/** Tabs and the chart share the page's existing clock and renderer. */
export function mountStagingComparison({lesson,controls,parts,feedback,invalidate,onRunning}){
 const make=(name,fn,parent)=>{const b=document.createElement('button');b.textContent=name;b.onclick=fn;parent.append(b);return b;};
 const model=document.createElement('section');model.className='dv-model-panel';model.id='dv-model-panel';model.setAttribute('role','tabpanel');parts.append(model);
 const chart=document.createElement('section');chart.className='dv-chart-panel';chart.setAttribute('aria-label','速度增量曲线');parts.append(chart);
 const tablist=document.createElement('div');tablist.className='dv-tabs';tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','火箭方案');model.append(tablist);
 const tabs=PLANS.map((p,i)=>{const b=make(p.name,()=>{lesson.select(i);sync();},tablist);b.id='dv-tab-'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls',model.id);b.setAttribute('aria-label',p.name);return b;});
 tablist.onkeydown=e=>{const i=tabs.indexOf(document.activeElement);if(i<0)return;const next=e.key==='ArrowRight'?(i+1)%3:e.key==='ArrowLeft'?(i+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next===null)return;e.preventDefault();lesson.select(next);sync();tabs[next].focus();};
 const playback=createControlGroup(controls,{label:'分级对照操作',kind:'action'}),play=make(lesson.actionLabel,()=>{lesson.act();sync();},playback);play.id='dv-play';play.className='primary';
 const speed=createControlGroup(controls,{label:'分级对照速度',kind:'toggle'}),slow=make('慢动作',()=>{lesson.slow=!lesson.slow;sync();},speed);slow.id='dv-slow';
 const reset=createControlGroup(controls,{label:'重置分级对照',kind:'action'});make('全部重来',()=>{lesson.reset();sync();},reset).id='dv-reset';
 const help=createControlGroup(controls,{label:'模型定义',kind:'utility'}),dialog=document.createElement('dialog');dialog.className='dv-definition';const heading=document.createElement('h2');heading.textContent='理想速度增量 Δv';dialog.append(heading);
 for(const value of ['每段燃烧：Δv = vₑ ln(m₀ / m₁)，各段相加。','m₀、m₁是该段燃烧前、后的总质量；抛掉空结构不直接增加 Δv。','vₑ = 3.0 km/s，载荷 5 t；不计重力与阻力损失。','单级大火箭与三级火箭均为推进剂 300 t、结构 30 t，用来比较相同投入下的分级作用。']){const p=document.createElement('p');p.textContent=value;dialog.append(p);}
 make('关闭',()=>dialog.close(),dialog);document.querySelector('#app').append(dialog);make('模型说明',()=>dialog.showModal(),help).id='dv-model-info';
 const input=document.createElement('input');input.id='dv-progress';input.className='dv-progress-axis';input.type='range';input.min='0';input.max='100';input.step='.1';input.setAttribute('aria-label','推进剂消耗比例');parts.append(input);input.oninput=()=>{lesson.seek(Number(input.value)/100,{snap:!input.matches(':focus-visible')});sync();};
 const gates=[1,2].map(stage=>{const b=make('',()=>{lesson.seek(stage/3);sync();},parts);b.className='dv-gate';b.dataset.dvGate=stage;b.setAttribute('aria-label','定位到第'+stage+'级燃尽');return b;});
 const place=()=>{const k=Math.min(parts.clientWidth/1500,parts.clientHeight/650),ox=(parts.clientWidth-1500*k)/2,oy=(parts.clientHeight-650*k)/2;const box=(el,x,y,w,h)=>Object.assign(el.style,{left:(ox+x*k)+'px',top:(oy+y*k)+'px',width:w*k+'px',height:h*k+'px'});box(model,20,12,640,622);box(chart,685,12,795,622);model.style.setProperty('--dv-scale',k);box(input,790,526,640,48);gates.forEach((b,i)=>box(b,790+640*(i+1)/3-22/k,550-22/k,44/k,44/k));};
 const ro=new ResizeObserver(place);ro.observe(parts);place();
 const accessible=document.createElement('output');accessible.id='dv-metrics';accessible.className='dv-accessible';accessible.setAttribute('aria-live','off');accessible.setAttribute('aria-label','火箭实时读数');parts.append(accessible);
 let previousKey='',previousControls='',previousPercent='',previousTabs='';
 function sync(){
  const signature=[lesson.activeIndex,lesson.phase,lesson.running,lesson.complete,lesson.slow].join('|');if(signature!==previousControls){markSwitch(slow,lesson.slow);play.textContent=lesson.actionLabel;onRunning(lesson.running);previousControls=signature;}
  const percent=(lesson.progress*100).toFixed(1),rangeKey=percent+':'+lesson.phase+':'+lesson.activeIndex;if(rangeKey!==previousPercent){input.value=String(lesson.progress*100);input.setAttribute('aria-valuetext',percent+'%'+(lesson.waitingStage?' · 第'+lesson.waitingStage+'级燃尽':''));previousPercent=rangeKey;}
  const tabKey=lesson.activeIndex+':'+[...lesson.completed].join(',');if(tabKey!==previousTabs){
  tabs.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===lesson.activeIndex));b.tabIndex=i===lesson.activeIndex?0:-1;b.dataset.complete=String(lesson.completed.has(i));});model.setAttribute('aria-labelledby',tabs[lesson.activeIndex].id);
  gates.forEach(b=>b.hidden=lesson.activeIndex!==2||lesson.allFinished);input.hidden=lesson.allFinished;chart.dataset.comparison=String(lesson.allFinished);
   previousTabs=tabKey;
  }
  const values=lesson.samples(),key=lesson.activeIndex+':'+lesson.allFinished+':'+values.map(v=>v.dv.toFixed(2)+':'+v.mass.toFixed(1)).join('|');if(key!==previousKey){const indices=lesson.allFinished?[0,1,2]:[lesson.activeIndex];accessible.textContent=indices.map(i=>{const v=lesson.allFinished?sampleStaging(i,1):values[i];return PLANS[i].name+'：理想累计 Δv '+v.dv.toFixed(2)+' km/s，当前质量 '+v.mass.toFixed(1)+' t，剩余推进剂 '+v.fuelRemaining.toFixed(1)+' t';}).join('；');previousKey=key;}
  const message=lesson.explanation;if(feedback.textContent!==message)feedback.textContent=message;invalidate();
 }
 sync();return{sync,destroy(){lesson.pause();ro.disconnect();if(dialog.open)dialog.close();dialog.remove();accessible.remove();input.remove();model.remove();chart.remove();gates.forEach(b=>b.remove());}};
}

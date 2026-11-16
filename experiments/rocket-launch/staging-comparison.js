import {STAGING_PLANS as PLANS} from './staging-model.js';
export function drawStagingComparison(c,lesson){
 c.save();c.font='24px sans-serif';
 const samples=lesson.samples();
 PLANS.forEach((p,i)=>{const x=100+i*470,v=samples[i];c.fillStyle=p.color;c.fillText(p.name,x,52);c.font='36px sans-serif';c.fillText(v.dv.toFixed(2)+' km/s',x,108);c.font='21px sans-serif';c.fillText('理想速度',x,142);});
 c.fillStyle='#a9b0bf';c.font='19px sans-serif';c.fillText('小火箭：100 t 推进剂 · 大火箭 / 三级：300 t 推进剂 · 相同载荷 5 t',80,625);c.restore();
}
export function mountStagingComparison({lesson,controls,parts,feedback,invalidate,onRunning}){
 const output=document.createElement('output');output.id='dv-metrics';output.className='dv-accessible';output.setAttribute('aria-label','三枚火箭实时理想速度');parts.append(output);
 const play=document.createElement('button');play.id='dv-play';play.className='primary';controls.append(play);
 const reset=document.createElement('button');reset.id='dv-reset';reset.textContent='全部重来';controls.append(reset);
 play.onclick=()=>{lesson.act();sync();};reset.onclick=()=>{lesson.reset();sync();};
 let last='';function sync(){play.textContent=lesson.actionLabel;onRunning(lesson.running);const text=lesson.samples().map((v,i)=>PLANS[i].name+' '+v.dv.toFixed(2)+' km/s').join('；');if(text!==last){output.textContent=text;last=text;}feedback.textContent=lesson.explanation;invalidate();}
 sync();return{sync,destroy(){lesson.pause();output.remove();}};
}

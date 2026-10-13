/* Isolated functional demo, never reads/writes Newton.course or its progress. */
(()=>{
 const section=document.createElement('section');section.className='completion-demo';section.id='completion-demo';
 section.innerHTML='<p class="eyebrow">阶段完成 · 实验记录卡</p><h2>完成任务后，确认再前往下一阶段。</h2><p>此处模拟三个阶段的完成事件；重复触发同一阶段不会重复弹窗。</p><output aria-live="polite"></output><button data-complete>完成当前阶段任务</button><button data-replay>重看完成提示</button><button data-restart>重置演示</button>';
 document.querySelector('.intro').after(section);
 const dialog=new StageCompletionDialog(),seen=new Set();let stage=0,finished=false;
 const data=[{name:'认识镜面',title:'镜面观察完成',body:'你已观察平面镜、凹面镜和凸面镜的光路。',action:'前往组装 →'},{name:'组装望远镜',title:'望远镜组装完成',body:'凹面主镜与平面副镜已安装到位。',action:'前往观测 →'},{name:'参数观测',title:'本次实验已完成',body:'你已完成三档目镜的观测与记录。',action:'完成实验 ✓'}];
 function render(){section.querySelector('output').textContent=finished?'全部阶段已完成。可重置演示再次体验。':`当前：${stage+1} / 3 · ${data[stage].name}　${seen.has(stage)?'任务已完成，等待确认':'等待完成任务'}`;section.querySelector('[data-complete]').disabled=finished;section.querySelector('[data-replay]').disabled=!seen.has(stage)||finished;}
 function show(){const current=stage;dialog.show({...data[current],kicker:`阶段 0${current+1} 完成`},()=>{if(current<2)stage=current+1;else finished=true;render();});}
 section.querySelector('[data-complete]').onclick=()=>{if(finished||seen.has(stage))return;seen.add(stage);render();show();};section.querySelector('[data-replay]').onclick=show;section.querySelector('[data-restart]').onclick=()=>{stage=0;finished=false;seen.clear();render();};render();
})();

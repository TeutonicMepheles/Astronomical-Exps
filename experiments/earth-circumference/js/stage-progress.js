/* Host-owned gates. Private horizontal presentation, inspired by the shared
 * ExperimentProgress controlled-state contract; no shared DOM coupling. */
export function mountStageProgress(scene){
 const progress=document.createElement('nav');progress.className='astro-stage-progress';progress.setAttribute('aria-label','实验进度');
 const names=['选取观测点','测量参数','计算地球周长'];
 progress.innerHTML='<ol>'+names.map((name,i)=>`<li><span class="step-number">${i+1}</span><span>${name}</span><span class="step-check" aria-hidden="true">✓</span></li>`).join('')+'</ol>';
 const next=document.createElement('button');next.type='button';next.className='stage-next';next.textContent='下一步 →';next.hidden=true;
 const back=document.createElement('button');back.type='button';back.className='stage-back';back.innerHTML='<span aria-hidden="true">&#8592;</span>';back.hidden=true;
 scene.stage.append(progress,next,back);let geometryKey='',measurementsComplete=false;
 function update(){
  const a=scene.measureArc(),key=[a.selLat,a.selLon,a.subLat,scene.phase,scene.observationDate].join(',');
  if(geometryKey!==key){measurementsComplete=false;geometryKey=key;}
  const current=scene.calculating?2:scene.measuring?1:0;
  back.hidden=current===0;back.setAttribute('aria-label',current===2?'返回测量参数':'返回选取观测点');
  const picked=scene.stage.classList.contains('has-selection')&&!scene.stage.classList.contains('aligning-point')&&!scene.stage.classList.contains('showing-reference');
  if(current===1){const r=scene.measurements.snapshot();measurementsComplete=Boolean(r.selected.saved);}
  const completed=[picked,measurementsComplete,scene.stage.dataset.calculationComplete==='true'];
  [...progress.querySelectorAll('li')].forEach((el,i)=>{el.classList.toggle('current',current===i);el.classList.toggle('complete',completed[i]);el.setAttribute('aria-label',`${i+1}. ${names[i]}，${current===i?'当前阶段，':''}${completed[i]?'已完成':'未完成'}`);if(current===i)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
  next.hidden=current===0||current===2||!completed[current];next.dataset.stage=String(current);next.setAttribute('aria-label',current===0?'下一步：测量参数':'下一步：计算地球周长');
 }
 back.addEventListener('click',()=>{if(scene.calculating)scene.exitCalculation();else if(scene.measuring)scene.exitMeasure();update();});
 next.addEventListener('click',()=>{update();if(next.hidden)return;if(!scene.measuring)scene.enterMeasure();else if(!scene.calculating)scene.enterCalculation();update();});
 for(const event of ['globe-frame','globe-mode-change','measurement-change','calculation-progress'])window.addEventListener(event,update);
 update();
}

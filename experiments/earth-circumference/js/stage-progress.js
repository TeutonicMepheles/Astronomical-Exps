/* Host-owned gates. Private horizontal presentation, inspired by the shared
 * ExperimentProgress controlled-state contract; no shared DOM coupling. */
export function mountStageProgress(scene){
 const progress=document.createElement('nav');progress.className='astro-stage-progress';progress.setAttribute('aria-label','实验进度');
 const names=['选取观测点','观测正午夹角','计算地球周长'];
 progress.innerHTML='<ol>'+names.map((name,i)=>`<li><span class="step-number">${i+1}</span><span>${name}</span></li>`).join('')+'</ol>';
 const notice=document.createElement('output');
 notice.className='step-entry-note';notice.hidden=true;progress.append(notice);
 let requested=null;
 const next=document.createElement('button');next.type='button';next.className='stage-next';next.textContent='下一步 →';next.hidden=true;
 const back=document.createElement('button');back.type='button';back.className='stage-back';back.innerHTML='<span aria-hidden="true">&#8592;</span>';back.hidden=true;
 const actions=document.createElement('div');actions.className='earth-stage-actions';
 actions.setAttribute('role','group');actions.setAttribute('aria-label','实验阶段操作');
 actions.append(back,next);
 scene.stage.append(progress,actions);let geometryKey='',measurementsComplete=false;
 const steps=[...progress.querySelectorAll('li')];
 let current=0,reachable=[];
 function navigate(i){
  update();
  requested=null;
  if(i===current){update();return;}
  if(!reachable[i]){requested=i;update();return;}
  if(i<2&&scene.calculating)scene.exitCalculation();
  if(i===0){if(scene.measuring)scene.exitMeasure();}
  else if(!scene.measuring)scene.enterMeasure();
  if(i===2)scene.enterCalculation();
  update();
 }
 steps.forEach((el,i)=>{
  el.setAttribute('role','button');el.tabIndex=0;
  el.addEventListener('click',()=>navigate(i));
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();navigate(i);}});
 });
 function update(){
  const a=scene.measureArc(),key=[a.selLat,a.selLon,a.subLat,scene.phase,scene.observationDate].join(',');
  if(geometryKey!==key){measurementsComplete=false;geometryKey=key;}
  current=scene.calculating?2:scene.measuring?1:0;
  back.hidden=current===0;back.setAttribute('aria-label',current===2?'返回观测正午夹角':'返回选取观测点');
  const picked=scene.stage.classList.contains('has-selection')&&!scene.stage.classList.contains('aligning-point')&&!scene.stage.classList.contains('awaiting-noon');
  if(current===1){const r=scene.measurements.snapshot();measurementsComplete=Boolean(r.selected.saved);}
  const completed=[picked,measurementsComplete,scene.stage.dataset.calculationComplete==='true'];
  reachable=[true,picked||current>=1,measurementsComplete||current===2];
  if(requested===current)requested=null;
  const shown=requested??current;
  const message=requested===null?'':(reachable[shown]?'数据已就绪，点此步骤继续。':'请先完成前置操作');
  notice.hidden=!message;
  if(notice.textContent!==message)notice.textContent=message;
  steps.forEach((el,i)=>{
   const done=completed[i]&&i!==shown;
   el.classList.toggle('current',shown===i);
   el.classList.toggle('complete',done);
   el.classList.toggle('step-done',done);
   const marker=el.querySelector('.step-number'),text=done?'✓':String(i+1);
   if(marker.textContent!==text)marker.textContent=text;
   el.setAttribute('aria-label',names[i]+(i===shown?'，当前阶段':done?'，已完成':''));
   if(shown===i)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
  });
  next.hidden=current===0||current===2||!completed[current];next.dataset.stage=String(current);next.setAttribute('aria-label',current===0?'下一步：观测正午夹角':'下一步：计算地球周长');
  actions.hidden=back.hidden&&next.hidden;
 }
 back.addEventListener('click',()=>{requested=null;if(scene.calculating)scene.exitCalculation();else if(scene.measuring)scene.exitMeasure();update();});
 next.addEventListener('click',()=>{requested=null;update();if(next.hidden)return;if(!scene.measuring)scene.enterMeasure();else if(!scene.calculating)scene.enterCalculation();update();});
 for(const event of ['globe-frame','globe-mode-change','measurement-change','calculation-progress'])window.addEventListener(event,update);
 update();
}

// Reusable top progress control, extracted from EXP-04 stage-progress.js.
// Decoupled from any scene: the host supplies stage names, state getters, and
// navigation handlers. Two navigation styles:
//   - linear (EXP-04): onNext/onBack drive a next/back button pair.
//   - independent (Foucault): onSelect makes the steps clickable as parallel entries.
export function mountProgress(container, stages, {getCurrent, getCompleted, onSelect, onNext, onBack, events=[]}={}){
  const progress=document.createElement('nav');
  progress.className='astro-stage-progress';
  progress.setAttribute('aria-label','实验进度');
  progress.innerHTML='<ol>'+stages.map((name,i)=>`<li><span class="step-number">${i+1}</span><span>${name}</span><span class="step-check" aria-hidden="true">✓</span></li>`).join('')+'</ol>';
  const lis=[...progress.querySelectorAll('li')];
  const next=onNext?document.createElement('button'):null;
  const back=onBack?document.createElement('button'):null;
  if(next){next.type='button';next.className='stage-next';next.textContent='下一步 →';next.hidden=true;container.append(next);}
  if(back){back.type='button';back.className='stage-back';back.innerHTML='<span aria-hidden="true">&#8592;</span>';back.hidden=true;container.append(back);}
  container.append(progress);
  function update(){
    const current=getCurrent?getCurrent():0;
    const completed=getCompleted?getCompleted():[];
    lis.forEach((el,i)=>{
      el.classList.toggle('current',current===i);
      el.classList.toggle('complete',!!completed[i]);
      if(onSelect){el.classList.toggle('clickable',true);el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',`${i+1}. ${stages[i]}${current===i?'，当前阶段':''}`);}
      if(current===i)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
    });
    if(next){next.hidden=current===stages.length-1;next.dataset.stage=String(current);if(current<stages.length-1)next.setAttribute('aria-label',`下一步：${stages[current+1]}`);}
    if(back)back.hidden=current===0;
  }
  if(onSelect){
    lis.forEach((el,i)=>{
      el.addEventListener('click',()=>onSelect(i));
      el.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(i);}});
    });
  }
  if(next)next.addEventListener('click',()=>{onNext();update();});
  if(back)back.addEventListener('click',()=>{onBack();update();});
  for(const ev of events)window.addEventListener(ev,update);
  update();
  return {update};
}

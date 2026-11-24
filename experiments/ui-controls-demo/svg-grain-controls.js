const form=document.querySelector('.settings');
const strength=document.querySelector('#strength');
const density=document.querySelector('#density');
const noise=document.querySelector('#noise');
const sections=document.querySelector('#specimen-sections');
const grainLayer=document.querySelector('#grain-layer');
const boards=[...document.querySelectorAll('.board')];
const detail=document.querySelector('#detail');
const timers=new Map();
let pressTimer;

function update(){
  document.documentElement.style.setProperty('--strength',String(Number(strength.value)/100));
  document.querySelector('#strength-value').value=strength.value+'%';
  noise.setAttribute('baseFrequency',density.value);
  document.querySelector('#density-value').value=Number(density.value).toFixed(2);
}

function updateRange(input){
  const label=input.closest('label');
  const value=Number(input.value);
  const low=Number(input.min);
  const high=Number(input.max);
  const unit=input.dataset.unit??'%';
  const precision=input.dataset.precision;
  const output=label.querySelector('output');
  output.value=(precision===undefined?input.value:value.toFixed(Number(precision)))+unit;
  label.style.setProperty('--slider-fill',100*(value-low)/(high-low)+'%');
  const stepper=label.closest('.slider-with-stepper');
  if(stepper){
    input.setAttribute('aria-valuetext',output.value);
    for(const button of stepper.querySelectorAll('[data-nudge]')){
      const atLimit=Number(button.dataset.nudge)<0?value<=low:value>=high;
      button.setAttribute('aria-disabled',String(input.disabled||atLimit));
    }
  }
  if(label.matches('.dial'))label.style.setProperty('--dial-angle',(value*2.4-120)+'deg');
}

function decorateBar(label){
  const input=label.querySelector('input[type=range]');
  const output=label.querySelector('output');
  const name=[...label.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim();
  const caption=document.createElement('span');
  caption.className='slider-name';
  caption.textContent=name;
  input.setAttribute('aria-label',name);
  output.setAttribute('aria-hidden','true');
  const fill=document.createElement('span');
  fill.className='slider-fill surface';
  fill.setAttribute('aria-hidden','true');
  label.classList.replace('value-slider','slider-bar');
  label.replaceChildren(fill,caption,output,input);
  if(input.dataset.increments)decorateStepper(label,input,name);
  updateRange(input);
}

function decorateStepper(label,input,name){
  const wrapper=document.createElement('div');
  wrapper.className='slider-with-stepper';
  label.before(wrapper);
  wrapper.setAttribute('role','group');
  wrapper.setAttribute('aria-label',name+'步进');
  const unit=input.dataset.unit??'%';
  const increments=input.dataset.increments.split(' ');
  for(const direction of [-1,1]){
    const side=document.createElement('div');
    side.className='slider-step-side';
    const ordered=direction<0?[...increments].reverse():increments;
    for(const increment of ordered){
      const button=document.createElement('button');
      button.type='button';
      button.className='surface';
      button.dataset.speed=increment===increments[0]?'fine':'coarse';
      button.dataset.nudge=String(direction*Number(increment));
      button.textContent=(direction<0?'−':'+')+increment+unit;
      button.setAttribute('aria-label',name+(direction<0?'减少':'增加')+increment+unit);
      button.disabled=input.disabled;
      side.append(button);
    }
    if(direction<0)wrapper.append(side,label);
    else wrapper.append(side);
  }
}

function decorate(root){
  for(const label of root.querySelectorAll('.value-slider:not(.divider,.rail)'))decorateBar(label);
  for(const control of root.querySelectorAll('input.surface,select.surface')){
    const wrap=document.createElement('span');
    wrap.className='surface field-shell';
    control.classList.remove('surface');
    control.before(wrap);
    wrap.append(control);
  }
  for(const element of root.querySelectorAll('[data-play],[data-drop],[data-validation],[data-save-status]')){
    const label=document.createElement('span');
    label.textContent=element.textContent;
    element.replaceChildren(label);
  }
  for(const surface of root.querySelectorAll('.surface')) surface.prepend(grainLayer.content.cloneNode(true));
}

function show(index){
  for(const timer of timers.values()) clearInterval(timer);
  timers.clear();
  clearInterval(pressTimer);
  [...sections.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  boards.forEach((board,i)=>{
    board.replaceChildren();
    for(const [label,html] of svgSpecimens[index][1]){
      const item=document.createElement('article');
      item.className='card surface';
      const heading=document.createElement('h3');
      heading.textContent=label;
      item.append(heading);
      item.insertAdjacentHTML('beforeend',html);
      board.append(item);
    }
    for(const radio of board.querySelectorAll('input[type=radio]')) radio.name+='-'+i;
    decorate(board);
  });
}

function setTimeline(item,next){
  const range=item.querySelector('[data-timeline]');
  range.value=next;
  range.dispatchEvent(new Event('input',{bubbles:true}));
}

function setPressed(button,next){
  button.setAttribute('aria-pressed',String(next));
}

function install(item){
  item.querySelector('[data-drop] span').textContent='✓ 凹面镜已安装';
  setPressed(item.querySelector('[data-piece]'),false);
}

function increasePressure(item){
  const out=item.querySelector('[data-pressure]');
  out.value=(parseInt(out.value,10)+1)+' 次';
}

function commitStepValue(input,delta=0){
  const value=Number.isFinite(input.valueAsNumber)
    ? input.valueAsNumber : Number(input.dataset.committed??input.defaultValue);
  input.value=String(Math.max(Number(input.min),Math.min(Number(input.max),Math.round(value)+delta)));
  input.dataset.committed=input.value;
  const demo=input.closest('.longitude-stepper');
  if(demo){
    const status=demo.querySelector('[data-longitude-status]');
    const message=demo.dataset.confirmed===input.value?'已确认 '+input.value+'°':'待确认';
    if(status.textContent!==message)status.textContent=message;
  }
}

function handleClick(event){
  const previewButton=event.target.closest('[data-progress-delta]');
  if(previewButton){
    if(previewButton.getAttribute('aria-disabled')==='true')return;
    const index=Number(previewButton.closest('[data-progress-preview]').dataset.progressPreview)+Number(previewButton.dataset.progressDelta);
    for(const preview of document.querySelectorAll('[data-progress-preview]')){
      preview.dataset.progressPreview=String(index);
      const variants=preview.querySelector('[data-progress-variants]');
      variants.innerHTML=progressAlternatives(index);
      decorate(variants);
      for(const button of preview.querySelectorAll('[data-progress-delta]')){
        const atLimit=Number(button.dataset.progressDelta)<0?index===0:index===progressSteps.length-1;
        button.setAttribute('aria-disabled',String(atLimit));
      }
    }
    return;
  }
  const nudge=event.target.closest('[data-nudge]');
  if(nudge){
    if(nudge.getAttribute('aria-disabled')==='true')return;
    const input=nudge.closest('.slider-with-stepper').querySelector('input[type=range]');
    const steps=Math.round(Number(nudge.dataset.nudge)/Number(input.step||1));
    if(steps<0)input.stepDown(-steps);
    else input.stepUp(steps);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    return;
  }
  const button=event.target.closest('button');
  if(!button)return;
  const item=button.closest('article'),d=button.dataset;
  if(button.hasAttribute('aria-pressed')){
    const group=button.closest('[data-single]');
    if(group) for(const option of group.querySelectorAll('[aria-pressed]'))setPressed(option,option===button);
    else setPressed(button,button.getAttribute('aria-pressed')!=='true');
  }
  if('longitudeConfirm' in d){
    const demo=button.closest('.longitude-stepper');
    const input=demo.querySelector('[data-step-value]');
    commitStepValue(input);
    demo.dataset.confirmed=input.value;
    demo.querySelector('[data-longitude-status]').textContent='已确认 '+input.value+'°';
  }
  if('delta' in d){
    commitStepValue(item.querySelector('[data-step-value]'),Number(d.delta));
  }
  if('play' in d){
    const active=button.getAttribute('aria-pressed')==='true';
    button.querySelector('span').textContent=active?'Ⅱ 暂停':'▶ 播放';
    if(active)timers.set(item,setInterval(()=>setTimeline(item,(Number(item.querySelector('[data-timeline]').value)+1)%101),140));
    else {clearInterval(timers.get(item));timers.delete(item);}
  }
  if('replay' in d)setTimeline(item,0);
  if('tick' in d)setTimeline(item,Number(item.querySelector('[data-timeline]').value)+1);
  if('turn' in d){
    const out=item.querySelector('[data-view-angle]');
    out.value=(Number(d.turn)===0?0:parseInt(out.value,10)+Number(d.turn))+'°';
  }
  if('point' in d){
    const ready=item.querySelectorAll('[data-point][aria-pressed=true]').length===2;
    item.querySelector('[data-measure]').textContent=ready?'待确认 · 125 cm':'等待取点';
    item.querySelector('[data-measure-confirm]').disabled=!ready;
  }
  if('measureConfirm' in d)item.querySelector('[data-measure]').textContent='已记录 · 125 cm';
  if('drop' in d&&item.querySelector('[data-piece]').getAttribute('aria-pressed')==='true')install(item);
  if('dialog' in d){
    detail.dataset.method=button.closest('[data-method]').dataset.method;
    detail.querySelector('h3').textContent={complete:'阶段已完成',params:'调整单摆参数',records:'实验记录'}[d.dialog];
    detail.querySelector('[data-dialog-body]').innerHTML=d.dialog==='complete'?'✓ 已记录操作，可进入下一阶段。':d.dialog==='records'?'<p>第 01 组 · 大小对照</p>':'<label>摆长 <input type="number" min="1" value="67"> m</label>';
    detail.showModal();
  }
  if('page' in d){
    const page=item.querySelector('[data-page-label]');
    const next=Math.max(1,Math.min(2,parseInt(page.value,10)+Number(d.page)));
    page.value=next+' / 2';
    item.querySelector('[data-record]').textContent=String(next).padStart(2,'0');
  }
  if('bubbleSelect' in d){
    const panel=button.closest('.bubble-panel');
    panel.querySelector('.bubble-feedback').textContent='已选中观测点 A';
  }
  if('bubbleClose' in d){
    const details=button.closest('details');
    details.open=false;
    details.querySelector('summary').focus();
  }
  if('save' in d)item.querySelector('[data-save-status] span').textContent='✓ 本次设置已确认';
  if('hold' in d&&event.detail===0)increasePressure(item);
}

for(const [index,[label]] of svgSpecimens.entries()){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  button.addEventListener('click',()=>show(index));
  sections.append(button);
}

for(const board of boards){
  board.addEventListener('click',handleClick);
  board.addEventListener('focusout',event=>{
    if(event.target.matches('[data-step-value]'))commitStepValue(event.target);
  });
  board.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target.matches('[data-step-value]'))commitStepValue(event.target);
    if(event.key!=='Escape')return;
    const details=event.target.closest('.knowledge-disclosure[open]');
    if(!details)return;
    event.preventDefault();
    details.open=false;
    details.querySelector('summary').focus();
  });
  board.addEventListener('input',event=>{
    const target=event.target;
    if(target.matches('[data-range]'))updateRange(target);
    if(target.matches('[data-longitude]')){
      const valid=target.value.trim()!==''&&Number.isInteger(Number(target.value))&&Math.abs(Number(target.value))<=180;
      target.setAttribute('aria-invalid',String(!valid));
      target.closest('article').querySelector('[data-validation] span').textContent=valid?'经度范围 −180° 至 180°':'△ 请输入 −180 至 180 之间的整数';
    }
  });
  board.addEventListener('dragstart',event=>{
    if(event.target.closest('[data-piece]'))event.dataTransfer.setData('text/plain','mirror');
  });
  board.addEventListener('dragover',event=>{if(event.target.closest('[data-drop]'))event.preventDefault();});
  board.addEventListener('drop',event=>{
    const drop=event.target.closest('[data-drop]');
    if(!drop)return;
    event.preventDefault();
    if(event.dataTransfer.getData('text/plain')==='mirror')install(drop.closest('article'));
  });
  board.addEventListener('pointerdown',event=>{
    const hold=event.target.closest('[data-hold]');
    if(!hold||!event.isPrimary||event.button!==0)return;
    hold.setPointerCapture(event.pointerId);
    const item=hold.closest('article');
    increasePressure(item);
    clearInterval(pressTimer);
    pressTimer=setInterval(()=>increasePressure(item),280);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(type,()=>clearInterval(pressTimer));
}
form.addEventListener('input',update);
form.addEventListener('reset',event=>{
  event.preventDefault();
  strength.value=strength.defaultValue;
  density.value=density.defaultValue;
  update();
});
decorate(detail);
update();
const demoType=new URLSearchParams(location.search).get('type');
show(demoType==='slider'?2:['tips','knowledge'].includes(demoType)?5:0);

if(demoType==='knowledge'){
  document.querySelector('.knowledge-disclosure').closest('article').scrollIntoView({block:'start'});
}
if(demoType==='progress'){
  document.querySelector('[data-progress-preview]').closest('article').scrollIntoView({block:'start'});
}

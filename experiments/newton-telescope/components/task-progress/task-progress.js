/* Newton-specific task progress card with a completion check on its header. */
(function(){
  'use strict';
  let serial=0;
  const checkIcon='<svg class="newton-task-progress__check-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20"/><path d="m14.5 24.5 6.3 6.2L34 17.5"/></svg>';

  class NewtonTaskProgress {
    constructor(root,{label='实验进度',onRequest=()=>{}}={}){
      if(!(root instanceof Element))throw new TypeError('A mount element is required');
      this.root=root;this.onRequest=onRequest;this.prefix=`newton-task-progress-${++serial}`;this.nodes=new Map();this.ids=new Map();this.state=null;this.destroyed=false;this.busy=false;this.expanded=false;this.timers=new Set();
      this.abort=new AbortController();
      this.element=document.createElement('section');this.element.className='newton-task-progress';
      this.element.innerHTML=`<button type="button" class="newton-task-progress__toggle" aria-expanded="false"><span class="newton-task-progress__number">1</span><span class="newton-task-progress__check" aria-hidden="true">${checkIcon}</span></button><div class="newton-task-progress__popup" hidden><div class="newton-task-progress__summary"><span></span><output></output></div><div class="newton-task-progress__tabs" role="tablist"></div><p class="newton-task-progress__message" role="status"></p></div>`;
      this.element.querySelector('.newton-task-progress__summary span').textContent=label;
      this.toggle=this.element.querySelector('.newton-task-progress__toggle');
      this.popup=this.element.querySelector('.newton-task-progress__popup');
      this.popup.id=this.prefix+'-popup';this.toggle.setAttribute('aria-controls',this.popup.id);
      this.tabs=this.element.querySelector('[role=tablist]');this.tabs.setAttribute('aria-label',label);this.tabs.setAttribute('aria-orientation','vertical');
      this.message=this.element.querySelector('[role=status]');
      root.append(this.element);

      this.toggle.addEventListener('click',()=>this.setExpanded(!this.expanded),{signal:this.abort.signal});
      this.element.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.expanded){e.preventDefault();this.setExpanded(false,true);}},{signal:this.abort.signal});
      document.addEventListener('pointerdown',e=>{if(!this.element.contains(e.target))this.setExpanded(false);},{signal:this.abort.signal});
      this.element.addEventListener('focusout',e=>{if(e.relatedTarget&&!this.element.contains(e.relatedTarget))this.setExpanded(false);},{signal:this.abort.signal});
      this.tabs.addEventListener('click',e=>{const button=e.target.closest('[role=tab]');if(button&&this.tabs.contains(button))this.request(button.dataset.step);},{signal:this.abort.signal});
      this.tabs.addEventListener('keydown',e=>{
        if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key)||!this.state)return;
        const enabled=this.state.steps.filter(step=>!step.locked);if(!enabled.length)return;
        const index=enabled.findIndex(step=>step.id===e.target.dataset.step);if(index<0)return;
        e.preventDefault();
        const next=e.key==='Home'?0:e.key==='End'?enabled.length-1:(index+(e.key==='ArrowDown'?1:-1)+enabled.length)%enabled.length;
        const button=this.nodes.get(enabled[next].id).button;
        this.nodes.forEach(({button:item})=>{item.tabIndex=item===button?0:-1;});button.focus();button.scrollIntoView({block:'nearest',inline:'nearest'});
      },{signal:this.abort.signal});
    }

    setExpanded(expanded,restoreFocus=false){
      if(this.destroyed)return;
      if(!expanded&&(restoreFocus||this.popup.contains(document.activeElement)))this.toggle.focus();
      this.expanded=Boolean(expanded);this.popup.hidden=!this.expanded;this.toggle.setAttribute('aria-expanded',String(this.expanded));
    }

    getTabId(id){
      if(!this.ids.has(id))this.ids.set(id,`${this.prefix}-tab-${this.ids.size+1}`);
      return this.ids.get(id);
    }

    setState(snapshot){
      if(this.destroyed)return;
      const steps=snapshot?.steps;
      if(!Array.isArray(steps)||!steps.length)throw new TypeError('steps must be a non-empty array');
      const unique=new Set();
      for(const step of steps){
        if(typeof step.id!=='string'||!step.id||unique.has(step.id)||typeof step.label!=='string')throw new TypeError('Steps require unique string IDs and labels');
        unique.add(step.id);
      }
      if(!steps.some(step=>step.id===snapshot.activeId&&!step.locked))throw new TypeError('activeId must identify an unlocked step');

      const previous=this.state,previousId=previous?.activeId;
      const previousCompletion=new Map(previous?.steps.map(step=>[step.id,Boolean(step.completed)])||[]);
      const newlyCompleted=previous?steps.filter(step=>step.completed&&previousCompletion.get(step.id)===false):[];
      this.state={activeId:snapshot.activeId,steps:steps.map(step=>({...step}))};
      const activeIndex=steps.findIndex(step=>step.id===snapshot.activeId),activeStep=steps[activeIndex],allDone=steps.every(step=>step.completed);
      this.element.querySelector('.newton-task-progress__number').textContent=String(activeIndex+1);
      this.toggle.classList.toggle('is-complete',Boolean(activeStep.completed));
      this.toggle.setAttribute('aria-label',`任务清单，当前第 ${activeIndex+1} 阶段：${activeStep.label}${allDone?'，全部已完成':activeStep.completed?'，已完成':''}`);
      this.toggle.title=this.toggle.getAttribute('aria-label');
      if(previousId&&previousId!==snapshot.activeId)this.setExpanded(false);
      this.message.textContent='';
      this.element.querySelector('output').textContent=`${steps.filter(step=>step.completed).length} / ${steps.length} 已完成`;

      for(const [id,node] of this.nodes){
        if(!unique.has(id)){node.button.remove();this.nodes.delete(id);}
      }
      this.state.steps.forEach((step,index)=>{
        let node=this.nodes.get(step.id);
        if(!node){
          const button=document.createElement('button');
          button.type='button';button.className='newton-task-progress__tab';button.setAttribute('role','tab');button.id=this.getTabId(step.id);button.dataset.step=step.id;
          button.innerHTML=`<span class="newton-task-progress__marker" aria-hidden="true"><span class="newton-task-progress__marker-number"></span>${checkIcon}</span><span class="newton-task-progress__copy"><strong></strong><small></small></span><span class="newton-task-progress__count"></span><span class="newton-task-progress__meter" aria-hidden="true"><i></i></span>`;
          node={
            button,marker:button.querySelector('.newton-task-progress__marker'),markerNumber:button.querySelector('.newton-task-progress__marker-number'),
            label:button.querySelector('strong'),detail:button.querySelector('small'),count:button.querySelector('.newton-task-progress__count'),
            meter:button.querySelector('.newton-task-progress__meter'),fill:button.querySelector('.newton-task-progress__meter i')
          };
          this.nodes.set(step.id,node);
        }
        const {button}=node,active=step.id===snapshot.activeId,complete=Boolean(step.completed),locked=Boolean(step.locked);
        button.setAttribute('aria-selected',String(active));button.setAttribute('aria-disabled',String(locked));button.tabIndex=active?0:-1;
        if(step.panelId)button.setAttribute('aria-controls',step.panelId);else button.removeAttribute('aria-controls');
        button.classList.toggle('is-complete',complete);button.classList.toggle('is-locked',locked);
        node.markerNumber.textContent=String(index+1);
        node.label.textContent=step.label;
        const known=Number.isFinite(step.current)&&Number.isFinite(step.total)&&step.total>0;
        const current=known?Math.max(0,Math.min(step.total,step.current)):0;
        const count=known?`${current} / ${step.total}`:'';
        node.count.textContent=count;
        node.detail.textContent=locked?(step.lockReason||'暂未解锁'):(step.detail||count||(complete?'已完成':'待完成'));
        button.setAttribute('aria-label',[step.label,active?'当前阶段':'',complete?'已完成':'',locked?(step.lockReason||'暂未解锁'):node.detail.textContent].filter(Boolean).join('，'));
        button.title=locked?(step.lockReason||'暂未解锁'):step.label;
        node.meter.hidden=!known;node.fill.style.width=known?`${current/step.total*100}%`:'0%';
        if(this.tabs.children[index]!==button)this.tabs.insertBefore(button,this.tabs.children[index]||null);
        if(newlyCompleted.some(done=>done.id===step.id))this.animateCard(button);
      });

      if(newlyCompleted.length)this.animateHeader(newlyCompleted[0]);
      const focused=document.activeElement;
      if(this.tabs.contains(focused)&&focused.getAttribute('aria-disabled')==='true')this.nodes.get(snapshot.activeId).button.focus();
    }

    schedule(fn,delay){
      const timer=setTimeout(()=>{this.timers.delete(timer);if(!this.destroyed)fn();},delay);
      this.timers.add(timer);return timer;
    }

    animateHeader(step){
      this.toggle.classList.remove('is-checking');void this.toggle.offsetWidth;this.toggle.classList.add('is-checking');
      const index=this.state.steps.findIndex(item=>item.id===step.id);
      this.message.textContent=`第 ${index+1} 阶段完成：${step.label}`;
      this.schedule(()=>this.toggle.classList.remove('is-checking'),1050);
    }

    animateCard(button){
      button.classList.remove('is-newly-complete');void button.offsetWidth;button.classList.add('is-newly-complete');
      this.schedule(()=>button.classList.remove('is-newly-complete'),900);
    }

    async request(id){
      if(this.destroyed||this.busy||!this.state)return;
      const step=this.state.steps.find(item=>item.id===id);if(!step)return;
      if(step.locked){this.message.textContent=step.lockReason||'请先完成前面的步骤';return;}
      if(id===this.state.activeId){this.setExpanded(false,true);return;}
      this.busy=true;this.tabs.setAttribute('aria-busy','true');this.message.textContent='';
      try{
        const accepted=await this.onRequest(id,{previousId:this.state.activeId});
        if(!this.destroyed&&accepted===false)this.message.textContent='暂时无法切换，请完成当前操作后重试。';
      }catch{if(!this.destroyed)this.message.textContent='切换未完成，请重试。';}
      finally{this.busy=false;if(!this.destroyed)this.tabs.removeAttribute('aria-busy');}
    }

    destroy(){
      this.destroyed=true;this.abort.abort();for(const timer of this.timers)clearTimeout(timer);this.timers.clear();
      this.element.remove();this.nodes.clear();this.ids.clear();
    }
  }

  window.NewtonTaskProgress=NewtonTaskProgress;
})();

/* Controlled view: hosts own progress, unlock rules, routes and persistence. */
(() => {
  let serial = 0;
  class ExperimentProgress {
    constructor(root, { label = '实验进度', onRequest = () => {} } = {}) {
      if (!(root instanceof Element)) throw new TypeError('A mount element is required');
      this.root=root;this.onRequest=onRequest;this.prefix=`experiment-progress-${++serial}`;this.nodes=new Map();this.ids=new Map();this.state=null;this.destroyed=false;this.busy=false;
      this.abort=new AbortController();
      this.element=document.createElement('section');this.element.className='experiment-progress';
      this.expanded=false;
      this.element.innerHTML='<button type="button" class="experiment-progress__toggle" aria-expanded="false"><span class="experiment-progress__number">1</span><span class="experiment-progress__badge" hidden aria-hidden="true">✓</span></button><div class="experiment-progress__popup" hidden><div class="experiment-progress__summary"><span></span><output></output></div><div class="experiment-progress__tabs" role="tablist"></div><p class="experiment-progress__message" role="status"></p></div>';
      this.element.querySelector('.experiment-progress__summary span').textContent=label;
      this.toggle=this.element.querySelector('.experiment-progress__toggle');this.popup=this.element.querySelector('.experiment-progress__popup');this.popup.id=this.prefix+'-popup';this.toggle.setAttribute('aria-controls',this.popup.id);
      this.toggle.addEventListener('click',()=>this.setExpanded(!this.expanded),{signal:this.abort.signal});
      this.element.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.expanded){e.preventDefault();this.setExpanded(false,true);}}, {signal:this.abort.signal});
      document.addEventListener('pointerdown',e=>{if(!this.element.contains(e.target))this.setExpanded(false);},{signal:this.abort.signal});
      this.element.addEventListener('focusout',e=>{if(e.relatedTarget&&!this.element.contains(e.relatedTarget))this.setExpanded(false);},{signal:this.abort.signal});
      this.tabs=this.element.querySelector('[role=tablist]');this.tabs.setAttribute('aria-label',label);this.tabs.setAttribute('aria-orientation','vertical');
      this.message=this.element.querySelector('[role=status]');root.append(this.element);
      this.tabs.addEventListener('click',e=>{const button=e.target.closest('[role=tab]');if(button&&this.tabs.contains(button))this.request(button.dataset.step);},{signal:this.abort.signal});
      this.tabs.addEventListener('keydown',e=>{
        if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key)||!this.state)return;
        const enabled=this.state.steps.filter(s=>!s.locked);if(!enabled.length)return;
        const index=enabled.findIndex(s=>s.id===e.target.dataset.step);if(index<0)return;
        e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?enabled.length-1:(index+(e.key==='ArrowDown'?1:-1)+enabled.length)%enabled.length;
        const button=this.nodes.get(enabled[next].id).button;
        this.nodes.forEach(({button:b})=>b.tabIndex=b===button?0:-1);button.focus();button.scrollIntoView({block:'nearest',inline:'nearest'});
      },{signal:this.abort.signal});
    }
    setExpanded(expanded,restoreFocus=false) {
      if(this.destroyed)return;
      if(!expanded&&(restoreFocus||this.popup.contains(document.activeElement)))this.toggle.focus();
      this.expanded=Boolean(expanded);this.popup.hidden=!this.expanded;this.toggle.setAttribute('aria-expanded',String(this.expanded));
    }
    getTabId(id) {
      if(!this.ids.has(id))this.ids.set(id,`${this.prefix}-tab-${this.ids.size+1}`);
      return this.ids.get(id);
    }
    setState(snapshot) {
      if(this.destroyed)return;
      const steps=snapshot?.steps;
      if(!Array.isArray(steps)||!steps.length)throw new TypeError('steps must be a non-empty array');
      const unique=new Set();
      for(const step of steps){if(typeof step.id!=='string'||!step.id||unique.has(step.id)||typeof step.label!=='string')throw new TypeError('Steps require unique string IDs and labels');unique.add(step.id);}
      if(!steps.some(s=>s.id===snapshot.activeId&&!s.locked))throw new TypeError('activeId must identify an unlocked step');
      const previousId=this.state?.activeId;
      this.state={activeId:snapshot.activeId,steps:steps.map(s=>({...s}))};
      const activeStep=steps.find(s=>s.id===snapshot.activeId),allDone=steps.every(s=>s.completed);
      this.element.querySelector('.experiment-progress__number').textContent=String(steps.indexOf(activeStep)+1);
      this.element.querySelector('.experiment-progress__badge').hidden=!activeStep.completed;
      this.toggle.classList.toggle('is-complete',Boolean(activeStep.completed));
      this.toggle.setAttribute('aria-label',`任务清单，当前第 ${steps.indexOf(activeStep)+1} 阶段：${activeStep.label}${allDone?'，全部已完成':activeStep.completed?'，已完成':''}`);
      this.toggle.title=this.toggle.getAttribute('aria-label');
      if(previousId&&previousId!==snapshot.activeId)this.setExpanded(false);
      this.message.textContent='';
      this.element.querySelector('output').textContent=`${steps.filter(s=>s.completed).length} / ${steps.length} 已完成`;
      for(const [id,node] of this.nodes)if(!unique.has(id)){node.button.remove();this.nodes.delete(id);}
      this.state.steps.forEach((step,index)=>{
        let node=this.nodes.get(step.id);
        if(!node){
          const button=document.createElement('button');button.type='button';button.className='experiment-progress__tab';button.setAttribute('role','tab');button.id=this.getTabId(step.id);button.dataset.step=step.id;
          button.innerHTML='<span class="experiment-progress__marker" aria-hidden="true"></span><span class="experiment-progress__copy"><strong></strong><small></small></span><span class="experiment-progress__state"></span><span class="experiment-progress__meter" aria-hidden="true"><i></i></span>';
          node={button,marker:button.querySelector('.experiment-progress__marker'),label:button.querySelector('strong'),detail:button.querySelector('small'),meter:button.querySelector('.experiment-progress__meter'),fill:button.querySelector('i')};this.nodes.set(step.id,node);
        }
        const {button}=node,active=step.id===snapshot.activeId;
        button.setAttribute('aria-selected',String(active));button.setAttribute('aria-disabled',String(Boolean(step.locked)));button.tabIndex=active?0:-1;
        if(step.panelId)button.setAttribute('aria-controls',step.panelId);else button.removeAttribute('aria-controls');
        button.classList.toggle('is-complete',Boolean(step.completed));
        node.marker.textContent=String(index+1);button.querySelector('.experiment-progress__state').textContent=step.completed?'✓ 已完成':step.locked?'未解锁':active?'当前':'';node.label.textContent=step.label;
        const known=Number.isFinite(step.current)&&Number.isFinite(step.total)&&step.total>0;
        const count=known?`${Math.max(0,Math.min(step.total,step.current))} / ${step.total}`:'';
        node.detail.textContent=step.locked?(step.lockReason||'暂未解锁'):(step.detail||count||(step.completed?'已完成':'待完成'));
        button.setAttribute('aria-label',[step.label,active?'当前页面':'',step.completed?'已完成':'',node.detail.textContent].filter(Boolean).join('，'));
        button.title=step.locked?(step.lockReason||'暂未解锁'):step.label;
        node.meter.hidden=step.locked||!known;node.fill.style.width=known?`${Math.max(0,Math.min(1,step.current/step.total))*100}%`:'0%';
        if(this.tabs.children[index]!==button)this.tabs.insertBefore(button,this.tabs.children[index]||null);
      });
      // If an external reset locks/removes the focused tab, keep focus on a valid page.
      const focused=document.activeElement;
      if(this.tabs.contains(focused)&&focused.getAttribute('aria-disabled')==='true')this.nodes.get(snapshot.activeId).button.focus();
    }
    async request(id) {
      if(this.destroyed||this.busy||!this.state)return;
      const step=this.state.steps.find(s=>s.id===id);if(!step)return;
      if(step.locked){this.message.textContent=step.lockReason||'请先完成前面的步骤';return;}
      if(id===this.state.activeId){this.setExpanded(false,true);return;}
      this.busy=true;this.tabs.setAttribute('aria-busy','true');this.message.textContent='';
      try {
        const accepted=await this.onRequest(id,{previousId:this.state.activeId});
        if(!this.destroyed&&accepted===false)this.message.textContent='暂时无法切换，请完成当前操作后重试。';
      } catch {if(!this.destroyed)this.message.textContent='切换未完成，请重试。';}
      finally{this.busy=false;if(!this.destroyed)this.tabs.removeAttribute('aria-busy');}
    }
    destroy(){this.destroyed=true;this.abort.abort();this.element.remove();this.nodes.clear();this.ids.clear();}
  }
  window.ExperimentUI=window.ExperimentUI||{};window.ExperimentUI.ExperimentProgress=ExperimentProgress;
})();

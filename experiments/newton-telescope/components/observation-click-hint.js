/* Experiment-local gesture presentation; see SOURCE.md for the shared artwork/style source. */
(function(N){
  'use strict';
  N.ObservationClickHint=class{
    constructor(model){
      this.model=model;this.phase='initial';this.point=new THREE.Vector3();
      this.node=this.createNode();model.container.append(this.node);
      model.container.addEventListener('viewrender',()=>this.update());
      for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture']){
        model.interactionSurface.addEventListener(type,()=>this.update());
      }
      window.addEventListener('blur',()=>this.update());
      document.addEventListener('visibilitychange',()=>this.update());
    }
    createNode(){
      const node=document.createElement('span');
      node.className='observation-click-hint';node.hidden=true;node.setAttribute('aria-hidden','true');
      const ring=document.createElement('span');ring.className='observation-click-ring';
      const hand=document.createElement('img');hand.className='observation-click-hand';hand.alt='';hand.draggable=false;
      const icon=ExperimentHints.handIcons.find(item=>item.id==='grab');
      hand.src=icon.src;hand.style.clipPath=icon.clip;
      node.style.setProperty('--click-tip-x',76*icon.anchor[0]+'px');
      node.style.setProperty('--click-tip-y',76*icon.anchor[1]+'px');
      const label=document.createElement('span');label.className='observation-click-label';
      node.append(ring,hand,label);return node;
    }
    setObservationTargets(buttons){
      this.targetNodes=buttons.map(button=>{
        const node=this.createNode(),target=button.dataset.observationTarget;
        node.dataset.target=target;node.classList.add('observation-click-target');
        node.lastElementChild.textContent='点击'+N.observationTargets[target].name+'，开始找星';
        button.append(node);return node;
      });this.update();
    }
    setPhase(phase){this.phase=phase;this.update();}
    update(){
      const m=this.model,eye=this.phase==='section';
      const suggested=N.observationAim?.suggestedTarget();
      for(const node of this.targetNodes||[])node.hidden=!m.enabled||document.hidden||this.phase!=='observing'||node.dataset.target!==suggested;
      this.node.hidden=!m.enabled||document.hidden||Boolean(m.transition||m.pendingViewMode||m.drag)||
        !['initial','section'].includes(this.phase);
      if(this.node.hidden)return;
      const mesh=eye?m.section.lens:m.model.getObjectByName('Scope_01_Main');
      if(!mesh){this.node.hidden=true;return;}
      if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
      const box=mesh.geometry.boundingBox;
      box.getCenter(this.point);
      if(eye)this.point.y+=(box.max.y-box.min.y)*.2;
      mesh.localToWorld(this.point);this.point.project(m.camera);
      this.node.hidden=this.point.z<-1||this.point.z>1;
      const target=eye?'eyepiece':'telescope';
      if(this.node.dataset.target!==target){
        this.node.dataset.target=target;
        this.node.lastElementChild.textContent=eye?'点击目镜，开始观测':'点击望远镜，查看剖面';
      }
      const x=(this.point.x+1)*m.container.clientWidth/2+'px',y=(1-this.point.y)*m.container.clientHeight/2+'px';
      if(this.node.style.left!==x)this.node.style.left=x;
      if(this.node.style.top!==y)this.node.style.top=y;
    }
  };
})(window.Newton);

/* Figma third-stage presentation; the original course and optics stores own behavior. */
(function(N){
  'use strict';
  const stage=document.querySelector('.observatory');
  const $=s=>document.querySelector(s);
  const scene=document.createElement('section');
  scene.className='observation-scene';scene.hidden=true;
  scene.setAttribute('aria-label','参数观测场景');
  scene.innerHTML=`
    <div class="observation-art" aria-hidden="true">
      <img class="newton-nebula-image" src="assets/observation-landscape/nebula.png" alt="" draggable="false">
      <canvas class="newton-nebula-flow" hidden aria-hidden="true"></canvas>
      <canvas class="newton-dynamic-stars" aria-hidden="true"></canvas>
      <img class="newton-distant-landscape" src="assets/observation-landscape/distant.png" alt="" draggable="false">
      <img class="newton-ground-landscape" src="assets/observation-landscape/ground.png" alt="" draggable="false">
      <div class="observation-saturn-layer"><div class="observation-saturn-marker" hidden aria-hidden="true"></div></div>
    </div>
    <div class="observation-instrument" role="button" tabindex="0" aria-label="牛顿反射式望远镜，点击进入剖面光路" aria-controls="observation-feedback" aria-expanded="false">
      <p class="observation-model-fallback" role="status">三维视图暂不可用，请刷新页面。</p>
    </div>
    <div class="observation-sliders" aria-label="望远镜参数" hidden></div>
    <div class="observation-targets" role="group" aria-label="观测目标">
      <button type="button" data-observation-target="saturn" aria-label="待观测热区"></button><button type="button" data-observation-target="moon" aria-label="待观测热区"></button><button type="button" data-observation-target="jupiter" aria-label="待观测热区"></button><button type="button" data-observation-target="pleiades" aria-label="待观测热区"></button>
    </div>
    <button type="button" class="observation-close" hidden aria-label="退出观测">退出观测 <span aria-hidden="true">×</span></button>
    <section id="observation-details" class="observation-details" hidden inert aria-hidden="true"></section>
    `;
  stage.append(scene);
  const aim=N.observationAim=new N.ObservationAim();
  const marker=scene.querySelector('.observation-saturn-marker');
  let model;
  try{model=new N.ObservationModel($('.observation-instrument'));}
  catch(error){$('.observation-instrument').classList.add('model-unavailable');console.error('Telescope model could not start:',error);}
  N.app.observationModel=model;
  const backdrop=N.observationBackdrop=new N.ObservationBackdrop(scene);
  model?.setPointingTarget(marker);
  const suggestTarget=()=>{
    const course=N.course.get();
    return aim.suggestedTarget();
  };
  const clickHint=model?new N.ObservationClickHint(model,suggestTarget):null;
  let flow;
  function syncMode(){
    const busy=Boolean(model?.transition||model?.pendingViewMode),sectionMode=model?.viewMode==='section',phase=flow?.phase??'initial';
    if(phase==='initial')aim.reset();
    scene.dataset.flowPhase=phase;
    clickHint?.setPhase(phase);
    scene.classList.toggle('observation-section-mode',sectionMode);
    sliders.hidden=phase==='initial';
    $('.observation-instrument').setAttribute('aria-label',sectionMode?'望远镜剖面，点击目镜进入观测':'牛顿反射式望远镜，点击进入剖面光路');
    updateAim();
  }
  $('.observation-instrument').addEventListener('viewmodechange',syncMode);
  $('.observation-instrument').addEventListener('viewtransitionchange',syncMode);

  // Move the existing controls, retaining IDs, listeners, limits and public-store bindings.
  const sliders=scene.querySelector('.observation-sliders');
  const sliderEntries=[['focal','主镜焦距'],['eyepiece','目镜焦距'],['aperture','主镜口径']];
  const inputs=sliderEntries.map(([id,label])=>{
    const input=$('#'+id),output=$('#'+id+'-value');
    if(id!=='aperture')input.closest('.parameter').hidden=true;
    const rotary=new N.ParameterKnob({id,input,output,label,host:sliders});
    return {id,input,wrap:rotary.wrap,rotary};
  });
  const details=$('#observation-details');details.hidden=true;
  details.append($('#progress-page-observation'),$('#observation-task'));
  // Retain the legacy binding for the other module, but expose no pause control.
  $('#start').hidden=true;$('#start').disabled=true;
  const target=$('#target');
  target.parentElement.classList.add('observation-target-select');
  // Aperture was relocated above; its old wrapper is no longer a control.
  const oldApertureLabel=$('#observation-task .observation-task__tools>label');
  if(oldApertureLabel&&!oldApertureLabel.querySelector('input,select'))oldApertureLabel.remove();
  const feedback=$('#observation-feedback');
  const previewCard=$('.preview-card');
  const guide=document.createElement('div');guide.className='observation-aim-guide';guide.hidden=true;
  const reticle=document.createElement('i');reticle.className='observation-aim-reticle';reticle.setAttribute('aria-hidden','true');
  const direction=document.createElement('span');direction.className='observation-aim-direction';direction.textContent='➤';direction.setAttribute('aria-hidden','true');
  const aimHint=document.createElement('span');aimHint.className='observation-aim-hint';aimHint.setAttribute('role','status');
  guide.append(reticle,direction,aimHint);$('.planet-viewport').append(guide);
  const close=$('.observation-close');
  // Animate the complete right-hand preview as one layer. A parent layer also
  // preserves authoring-mode opacity/translation overrides on the child panels.
  const targetButtons=[...scene.querySelectorAll('[data-observation-target]')];
  clickHint?.setObservationTargets([]);
  const previewReveal=document.createElement('div');previewReveal.className='observation-preview-reveal';
  previewReveal.append(previewCard);stage.append(previewReveal,close);
  const skyTargets=scene.querySelector('.observation-targets');
  scene.querySelector('.observation-saturn-layer').append(skyTargets);
  scene.querySelector('.observation-art').removeAttribute('aria-hidden');
  for(const button of targetButtons){const meta=N.observationTargets[button.dataset.observationTarget];button.style.left=meta.x+'px';button.style.top=meta.y+'px';}
  let active=false,lastStage='',lastReset=N.course.resetVersion,lastAimEnabled=false;
  const recording=N.observationRecording=new N.ObservationRecording(stage,inputs[1],renderAimGuide);
  function renderAimGuide(){
    const value=N.app.preview.aim,course=N.course.get();
    const record=recording.render(active&&!document.hidden,value,N.store.get(),course);
    guide.hidden=!active||!value?.enabled||value.target!==N.app.preview.state.target||N.app.preview.state.mode!=='parallel';
    if(guide.hidden)return;
    guide.dataset.acquired=String(value.acquired);
    direction.hidden=!value.selected||!value.available||value.distance<.9;
    if(!direction.hidden){
      const length=value.distance||1;
      direction.style.left=(50+42*value.x/length)+'%';direction.style.top=(50+42*value.y/length)+'%';
      direction.style.transform=`translate(-50%,-50%) rotate(${Math.atan2(value.y,value.x)*180/Math.PI}deg)`;
    }
    const name=N.observationTargets[value.target]?.name||'目标';
    let hint=!value.selected?'选择天空热区':model?.autoAim?'正在进入观测范围':!value.acquired?'正在寻找目标':value.focused?'':'调节主镜或目镜，使画面清晰';
    hint=record.hint??hint;
    aimHint.hidden=!hint;
    if(aimHint.textContent!==hint)aimHint.textContent=hint;
  }
  function updateAim(s=N.store.get()){
    const meta=N.observationTargets[s.target],name=meta?.name||'目标';
    const looking=active&&!document.hidden&&N.course.get().stage==='observation'&&Boolean(meta)&&s.mode==='parallel';
    marker.hidden=!(looking&&aim.target===s.target);
    if(meta){marker.dataset.target=s.target;marker.dataset.name=name;marker.style.left=meta.x+'px';marker.style.top=meta.y+'px';}
    const value=aim.update({active:looking,state:s,pointing:model?.measurePointing()});
    const enabled=Boolean(value);
    N.app.preview.setAim(value,{force:enabled&&!lastAimEnabled});lastAimEnabled=enabled;
    marker.dataset.acquired=String(Boolean(value?.acquired));
    updateTargetProgress(N.course.get());
    renderAimGuide();
    clickHint?.update();
  }
  function updateTargetProgress(course){
    targetButtons.forEach(button=>{
      const id=button.dataset.observationTarget,recorded=course.records.some(r=>r.target===id&&r.image);
      const observed=recorded||course.observedTargets.includes(id);
      button.dataset.observed=String(observed);
      button.setAttribute('aria-label',recorded?N.observationTargets[id].name+'，已记录':'待观测热区 '+(targetButtons.indexOf(button)+1));
    });
  }
  N.app.preview.subscribeDraw(renderAimGuide);
  document.addEventListener('visibilitychange',()=>updateAim());
  $('.observation-instrument').addEventListener('pointingchange',()=>updateAim());
  function open(value){
    active=value;stage.classList.toggle('observation-is-open',active);
    if(!active){recording.leave();model?.cancelAutoAim();}
    previewReveal.hidden=N.course.get().stage==='observation'&&!active;
    feedback.inert=!active;
    $('.observation-instrument').setAttribute('aria-expanded',String(active));
    close.hidden=!active;
    updateAim();
    // Canvas changes size with the composition; update using the preview's frozen-state API.
    requestAnimationFrame(()=>N.app.preview.draw(N.app.preview.state));
  }
  flow=N.observationFlow=new N.ObservationFlow({model,store:N.store,showPreview:open,changed:syncMode});
  $('.observation-instrument').addEventListener('instrumentactivate',e=>flow.activate(e.detail?.target));
  close.addEventListener('click',()=>{flow.closePreview();$('.observation-instrument').focus();});
  document.addEventListener('keydown',e=>{
    if(e.target.closest('dialog'))return;
    if(e.key==='Escape'&&N.course.get().stage==='observation'){
      if(flow.phase==='section'){flow.initial();$('.observation-instrument').focus();}
    }
  });
  targetButtons.forEach(button=>button.addEventListener('click',()=>{
    recording.leave();
    aim.select(button.dataset.observationTarget);
    N.store.set({target:button.dataset.observationTarget,mode:'parallel'});
    model?.aimAtTarget();
  }));
  function optical(s){
    inputs.forEach(({id,input,wrap,rotary})=>{
      const value=s[id],fraction=(value-Number(input.min))/(Number(input.max)-Number(input.min));
      rotary.update();
      input.setAttribute('aria-valuetext',value+' 毫米');
    });
    targetButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.observationTarget===s.target&&s.mode==='parallel')));
    updateAim(s);
  }
  function course(s){
    const observing=s.stage==='observation';
    if(!observing||lastReset!==N.course.resetVersion)inputs.forEach(({rotary})=>rotary.cancel(lastReset===N.course.resetVersion));
    if(lastStage===s.stage&&lastReset===N.course.resetVersion){
      if(observing){
        updateTargetProgress(s);
        renderAimGuide();
        clickHint?.update();
      }
      return;
    }
    scene.hidden=!observing;
    backdrop.setActive(observing);
    model?.setEnabled(observing);
    clickHint?.update();
    // Legacy 3D interaction is limited to the original two stages.
    $('#viewport').inert=observing||s.stage==='assembly';
    if(observing){
      if(lastStage!==s.stage||lastReset!==N.course.resetVersion){aim.reset();flow.initial({immediate:true});}
    }else{if(lastStage==='observation')flow.initial({immediate:true});stage.classList.remove('observation-is-open');feedback.inert=false;}
    previewCard.classList.toggle('observation-preview',observing);
    previewReveal.hidden=observing&&!active;
    lastStage=s.stage;lastReset=N.course.resetVersion;optical(N.store.get());
  }
  N.store.subscribe(optical);N.course.subscribe(course);course(N.course.get());
})(window.Newton);

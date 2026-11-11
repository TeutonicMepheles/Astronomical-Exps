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
      <img class="observation-starfield" src="assets/observation-figma/starfield.png" alt="" draggable="false">
      <img class="observation-foreground" src="assets/observation-figma/foreground.png" alt="" draggable="false">
      <img class="observation-legacy" src="assets/observation-figma/legacy-background.png" alt="" draggable="false">
      <img class="observation-night" src="assets/observation-figma/night-landscape-hd-4k.png" width="3840" height="2160" decoding="async" alt="" draggable="false">
      <div class="observation-saturn-layer"><div class="observation-saturn-marker" hidden aria-hidden="true"></div></div>
    </div>
    <div class="observation-instrument" role="button" tabindex="0" aria-label="牛顿反射式望远镜，点击进入剖面光路" aria-controls="observation-feedback" aria-expanded="false">
      <p class="observation-model-fallback" role="status">三维视图暂不可用，请刷新页面。</p>
    </div>
    <div class="observation-view-tools"><div class="observation-turn-controls" role="group" aria-label="调整望远镜角度"><button type="button" data-observation-turn="left"><span aria-hidden="true">↶</span>左转</button><button type="button" data-observation-turn="right"><span aria-hidden="true">↷</span>右转</button><button type="button" data-observation-turn="up" hidden>抬高</button><button type="button" data-observation-turn="down" hidden>压低</button></div><button type="button" class="observation-view-reset" hidden>恢复视角</button></div>
    <div class="observation-sliders" aria-label="望远镜参数" hidden></div>
    <div class="observation-targets" role="group" aria-label="观测目标">
      <button type="button" data-observation-target="saturn">土星</button><button type="button" data-observation-target="moon">月球</button><button type="button" data-observation-target="jupiter">木星</button><button type="button" data-observation-target="pleiades">昴星团</button>
    </div>
    <button type="button" class="observation-close" hidden aria-label="收起目镜观测">收起观测 <span aria-hidden="true">×</span></button>
    <button type="button" class="observation-detail-toggle" hidden aria-controls="observation-details" aria-expanded="false">对照实验与光路设置</button>
    <section id="observation-details" class="observation-details" hidden aria-label="对照实验与光路设置"><div class="observation-detail-heading"><h2>目镜对照实验</h2><button type="button" class="observation-detail-close" aria-label="关闭对照实验设置">×</button></div></section>
    `;
  stage.append(scene);
  const aim=N.observationAim=new N.ObservationAim();
  const marker=scene.querySelector('.observation-saturn-marker');
  let model;
  try{model=new N.ObservationModel($('.observation-instrument'));}
  catch(error){$('.observation-instrument').classList.add('model-unavailable');console.error('Telescope model could not start:',error);}
  N.app.observationModel=model;
  model?.setPointingTarget(marker);
  const clickHint=model?new N.ObservationClickHint(model):null;
  let flow;
  $('.observation-view-reset').addEventListener('click',()=>model?.resetView());
  const turnButtons=[...scene.querySelectorAll('[data-observation-turn]')];
  for(const button of turnButtons)button.addEventListener('click',()=>model?.turnView(button.dataset.observationTurn));
  function syncMode(){
    const busy=Boolean(model?.transition||model?.pendingViewMode),sectionMode=model?.viewMode==='section',phase=flow?.phase??'initial';
    if(phase==='initial')aim.reset();
    scene.dataset.flowPhase=phase;
    clickHint?.setPhase(phase);
    scene.classList.toggle('observation-section-mode',sectionMode);
    sliders.hidden=phase==='initial';
    $('.observation-view-reset').hidden=phase==='initial';$('.observation-view-reset').disabled=busy;
    $('.observation-instrument').setAttribute('aria-label',sectionMode?'望远镜剖面，使用角度按钮调整方向，点击目镜进入观测':'牛顿反射式望远镜，点击进入剖面光路');
    for(const button of turnButtons){button.disabled=busy||!model;button.hidden=['up','down'].includes(button.dataset.observationTurn)&&!sectionMode;}
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
    const wrap=document.createElement('div');wrap.className='observation-slider';
    wrap.innerHTML='<div class="observation-slider-art" aria-hidden="true"><img src="assets/observation-figma/slider.png" alt="" draggable="false"><i class="observation-slider-track-patch"></i><i class="observation-slider-knob"></i></div>';
    const caption=document.createElement('label');caption.htmlFor=id;caption.textContent=label;
    input.setAttribute('aria-label',label+'（毫米）');input.setAttribute('aria-orientation','vertical');
    wrap.append(input,caption,output);sliders.append(wrap);
    return {id,input,wrap};
  });
  const details=$('#observation-details');
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
  const close=$('.observation-close'),detailToggle=$('.observation-detail-toggle');
  // Animate the complete right-hand preview as one layer. A parent layer also
  // preserves authoring-mode opacity/translation overrides on the child panels.
  const targetButtons=[...scene.querySelectorAll('[data-observation-target]')];
  clickHint?.setObservationTargets(targetButtons);
  const previewReveal=document.createElement('div');previewReveal.className='observation-preview-reveal';
  previewReveal.append(previewCard,close,scene.querySelector('.observation-targets'));stage.append(previewReveal);
  let active=false,lastStage='',lastReset=N.course.resetVersion,lastAimEnabled=false;
  function renderAimGuide(){
    const value=N.app.preview.aim;
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
    let hint='点击下方「'+(N.observationTargets[aim.suggestedTarget()]?.name||name)+'」开始寻找';
    if(value.selected){
      const directions=[];
      if(Math.abs(value.x)>.3)directions.push(value.x>0?'点按左转':'点按右转');
      if(Math.abs(value.y)>.3)directions.push(value.y<0?'抬高镜筒':'压低镜筒');
      hint=!value.available?'正在定位目标':!value.facing?'开口背向目标 · '+directions.join(' · '):value.acquired?
        (value.aligned?(value.observed?name+'观测完成':'已对准'+name):name+'已进入视野'):directions.join(' · ');
    }
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
    const record=$('#record-observation'),waiting=enabled&&!value.acquired;
    record.disabled=!s.live||waiting;
    record.textContent=!s.live?'恢复实时预览后记录':waiting?'先对准'+name+'再记录':'记录当前结果';
    targetButtons.forEach(button=>{
      const id=button.dataset.observationTarget,observed=aim.completed.has(id);
      button.dataset.observed=String(observed);
      button.setAttribute('aria-label',N.observationTargets[id].name+(observed?'，已观测':''));
    });
    renderAimGuide();
    clickHint?.update();
  }
  N.app.preview.subscribeDraw(renderAimGuide);
  document.addEventListener('visibilitychange',()=>updateAim());
  $('.observation-instrument').addEventListener('pointingchange',()=>updateAim());
  function open(value){
    active=value;stage.classList.toggle('observation-is-open',active);
    previewReveal.hidden=N.course.get().stage==='observation'&&!active;
    feedback.inert=!active;
    $('.observation-instrument').setAttribute('aria-expanded',String(active));
    close.hidden=detailToggle.hidden=!active;
    if(!active){details.hidden=true;detailToggle.setAttribute('aria-expanded','false');}
    updateAim();
    // Canvas changes size with the composition; update using the preview's frozen-state API.
    requestAnimationFrame(()=>N.app.preview.draw(N.app.preview.state));
  }
  flow=N.observationFlow=new N.ObservationFlow({model,store:N.store,showPreview:open,changed:syncMode});
  $('.observation-instrument').addEventListener('instrumentactivate',e=>flow.activate(e.detail?.target));
  close.addEventListener('click',()=>{flow.closePreview();$('.observation-instrument').focus();});
  function showDetails(value){details.hidden=!value;detailToggle.setAttribute('aria-expanded',String(value));}
  detailToggle.addEventListener('click',()=>showDetails(details.hidden));
  $('.observation-detail-close').addEventListener('click',()=>{showDetails(false);detailToggle.focus();});
  document.addEventListener('keydown',e=>{
    if(e.target.closest('dialog'))return;
    if(e.key==='Escape'&&N.course.get().stage==='observation'){
      if(!details.hidden){showDetails(false);detailToggle.focus();}
      else if(flow.phase!=='initial'){flow.initial();$('.observation-instrument').focus();}
    }
  });
  targetButtons.forEach(button=>button.addEventListener('click',()=>{
    aim.select(button.dataset.observationTarget);
    N.store.set({target:button.dataset.observationTarget,mode:'parallel'});
  }));
  function optical(s){
    inputs.forEach(({id,input,wrap})=>{
      const value=s[id],fraction=(value-Number(input.min))/(Number(input.max)-Number(input.min));
      wrap.style.setProperty('--slider-position',(177*(1-fraction))+'px');
      input.setAttribute('aria-valuetext',value+' 毫米');
    });
    targetButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.observationTarget===s.target&&s.mode==='parallel')));
    updateAim(s);
  }
  function course(s){
    const observing=s.stage==='observation';
    scene.hidden=!observing;
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

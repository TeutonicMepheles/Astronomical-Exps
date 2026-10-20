/* DOM bindings only. Controls use data attributes; all presentation lives in course.css. */
(function(N){
  'use strict';const $=s=>document.querySelector(s),all=s=>document.querySelectorAll(s);
  const mirrors={plane:{title:'平面镜',summary:'改变传播方向',description:'平面镜折转光路，不使平行光自动会聚。牛顿望远镜的副镜利用这一作用，把会聚光导向目镜。',formula:'无有限焦点 · 不提供放大',hint:'沿箭头观察：光线经 45° 平面镜反射后转向。'},concave:{title:'凹面镜',summary:'平行光会聚到实焦点',description:'凹面主镜收集远方天体的光并形成像。缩短焦距，焦点靠近镜面；增大焦距，焦点远离镜面。',formula:'抛物面：轴上平行光汇聚于实焦点',hint:'调节焦距，比较焦点位置。实线是光线的实际传播路径。'},convex:{title:'凸面镜',summary:'反射光发散 · 镜后虚焦点',description:'凸面镜将光线向外发散。反向延长线交于镜后虚焦点，因此不作为牛顿望远镜的主镜。',formula:'抛物面：反射光反向延长线交于虚焦点',hint:'虚线是反向延长线，光子不会沿虚线传播。'}};
  const names={saturn:'土星',moon:'月球',jupiter:'木星',pleiades:'昴星团'};
  const stageNames={mirrors:'认识镜面',assembly:'组装望远镜',observation:'参数观测'};
  let lastStage='';
  const heading=new N.ExperimentHeading($('.introduction'));
  $('#mirror-workspace').appendChild($('#remove-mirror'));
  $('#mirror-workspace').appendChild($('#finish-mirrors'));
  function sync(s){
    const optical=N.store.get(),m=mirrors[s.mirror];document.querySelector('.observatory').dataset.stage=s.stage;
    $('#mirror-workspace').hidden=s.stage!=='mirrors';$('#remove-mirror').disabled=!s.mirrorMounted;
    $('#mirror-drop-slot').classList.toggle('is-selected',!!s.mirrorSelection);$('#mirror-drop-slot').setAttribute('aria-label',s.mirrorSelection?'将所选镜片放入光路':'光路安装位，请拖入镜片');
    heading.update(s.stage);
    $('#mirror-position').value=s.mirrorPosition;$('#mirror-position').disabled=!s.mirrorMounted;$('#mirror-position-value').textContent=s.mirrorMounted?Math.round(s.mirrorPosition*30)+' cm':'先放入镜片';$('#mirror-position').style.setProperty('--fill',((s.mirrorPosition+1)/4.5*100)+'%');
    $('#mirror-drop-slot').firstChild.textContent=s.mirrorMounted?m.title:'拖入镜片';$('#mirror-drop-slot span').textContent=s.mirrorMounted?'沿导轨移动 · 左右键微调':'拖到夹具上安装';
    $('.view-tools>span').firstChild.textContent=s.stage==='mirrors'?'拖入镜片':'拖动旋转';$('.view-tools .dot').nextSibling.textContent=s.stage==='mirrors'?'实时光路':'滚轮缩放';
    all('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==s.stage);
    $('#controls-title').lastChild.textContent=' '+stageNames[s.stage];
    $('#observation-feedback').hidden=s.stage!=='observation';$('#lesson-feedback').hidden=s.stage==='observation';$('#observation-task').hidden=s.stage!=='observation';$('#assembly-hotspots').hidden=s.stage!=='assembly';
    $('#scene-title').textContent=s.stage==='mirrors'?(s.mirrorMounted?m.title+' · 已放入光路':'空光路 · 等待镜片'):s.stage==='assembly'?'反射镜装配台':'牛顿望远镜 · 完整光路';
    $('#scene-subtitle').textContent=s.stage==='mirrors'?(s.mirrorMounted?'入射光 → 镜面反射 → '+(s.mirror==='convex'?'发散光束':s.mirror==='concave'?'实焦点':'折转光束'):'将桌面镜片拖到夹具 · 光源固定于导轨'):s.stage==='assembly'?'选择或拖放零件到安装位':'入射光 → 凹面主镜 → 平面副镜 → 目镜';
    $('#course-message').textContent=s.message;
    all('[data-mirror]').forEach(button=>{button.disabled=s.mirrorMounted&&s.mirror===button.dataset.mirror;button.draggable=!button.disabled;if(button.disabled&&document.activeElement===button)button.blur();button.setAttribute('aria-pressed',String(!button.disabled&&button.dataset.mirror===s.mirrorSelection));button.classList.toggle('is-observed',s.seen.includes(button.dataset.mirror));button.classList.toggle('is-mounted',s.mirrorMounted&&s.mirror===button.dataset.mirror);});
    $('#mirror-focal').disabled=!s.mirrorMounted||s.mirror==='plane';const range=N.mirrorParts.limits(s.mirror);$('#mirror-focal').min=range.min;$('#mirror-focal').max=range.max;$('#mirror-focal').step=1;$('#mirror-focal').value=s.mirrorFocal;$('#mirror-focal').style.setProperty('--fill',((s.mirrorFocal-range.min)/(range.max-range.min)*100)+'%');$('#mirror-focal-value').textContent=!s.mirrorMounted?'先放入镜片':s.mirror==='plane'?'无有限焦距':s.mirrorFocal+' mm';$('#mirror-hint').textContent=s.mirrorMounted?m.summary:'拖入镜片后实时显示反射光路';
    $('#finish-mirrors').disabled=s.seen.length!==3;$('#finish-assembly').disabled=!s.assemblyDone;
    all('[data-piece]').forEach(button=>{const installed=s.installed.includes(button.dataset.piece);button.disabled=installed;button.draggable=!installed;button.setAttribute('aria-pressed',String(s.selected===button.dataset.piece));button.classList.toggle('is-installed',installed);button.querySelector('i').textContent=installed?'已安装':'待安装';});
    all('[data-slot]').forEach(button=>{button.hidden=s.installed.includes(button.dataset.slot);button.classList.toggle('is-target',s.selected===button.dataset.slot);});
    $('#assembly-checklist').textContent=`${s.installed.includes('primary')?'✓':'○'} 凹面主镜　${s.installed.includes('secondary')?'✓':'○'} 平面副镜`;
    if(s.stage==='mirrors'){$('#feedback-eyebrow').textContent='01 / DARKROOM';$('#feedback-title').textContent=s.mirrorMounted?m.title:'先观察空光路';$('#feedback-mirror').hidden=!s.mirrorMounted;$('#feedback-mirror').src='assets/optical/'+s.mirror+'.png';$('#feedback-mirror').alt=m.title;$('#feedback-symbol').hidden=true;$('#feedback-summary').textContent=s.mirrorMounted?m.summary:'光束直行 · 镜片尚未放入';$('#feedback-description').textContent=s.mirrorMounted?m.description:'实验台左侧发出平行光。将一块镜片放入光路，比较放入前后的变化。实际光束用暖金实线表示；虚焦点延长线使用蓝色虚线。';$('#feedback-formula').textContent=s.mirrorMounted?m.formula:'任务：实际放入并观察三种镜面';}
    if(s.stage==='assembly'){$('#feedback-mirror').hidden=true;$('#feedback-symbol').hidden=false;$('#feedback-eyebrow').textContent='02 / ASSEMBLY';$('#feedback-title').textContent=s.assemblyDone?'光路已接通':'两面镜子的分工';$('#feedback-symbol').textContent=s.assemblyDone?'✓':`${s.installed.length} / 2`;$('#feedback-summary').textContent=s.assemblyDone?'主镜 → 副镜 → 目镜':'选择零件，寻找安装位';$('#feedback-description').textContent='凹面主镜位于镜筒后端；45° 平面副镜位于前部，将会聚光折向侧面的目镜。安装后可拖动查看。';$('#feedback-formula').textContent='目镜是透镜组件，不是第三面反射镜';}
    if(lastStage!==s.stage){N.store.set({running:false});$('#part-tooltip').hidden=true;lastStage=s.stage;}
    syncOptics(optical);renderRecords(s);
  }
  function syncOptics(s){
    $('#aperture').value=s.aperture;$('#aperture-value').textContent=s.aperture+' mm';$('#target').value=s.target;$('#aperture').style.setProperty('--fill',((s.aperture-80)/170*100)+'%');
    all('[data-eyepiece]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.eyepiece)===s.eyepiece)));
    const metrics=N.store.metrics(s);$('#optical-metrics').innerHTML=[['倍率',metrics.magnification.toFixed(1)+'×'],['估算视场',metrics.field.toFixed(2)+'°'],['焦比','f/'+metrics.focalRatio.toFixed(1)],['出瞳',metrics.exitPupil.toFixed(1)+' mm'],['集光能力',metrics.lightGathering]].map(([label,value])=>`<span>${label} <strong>${typeof value==='number'?value.toFixed(0)+'×':value}</strong></span>`).join('');
    $('#record-observation').disabled=!s.live;
    $('#record-observation').textContent=s.live?'记录当前结果':'恢复实时预览后记录';
    if(N.course.get().stage==='observation')renderRecords(N.course.get());
  }
  function renderRecords(s){
    const optical=N.store.get(),key=[optical.focal,optical.aperture,optical.target,optical.mode].join('/'),valid=s.records.length&&s.records[0].key===key;
    $('#observation-records').textContent=s.records.length?s.records.slice().sort((a,b)=>b.eyepiece-a.eyepiece).map(r=>`${r.eyepiece} mm → ${r.magnification.toFixed(1)}× / ${r.field.toFixed(2)}°`).join('　 |　 ')+(valid?(s.complete?'　✓ 对照完成':''):'　（历史记录；当前配置已改变，记录新结果将重建对照）'):'任务：保持主镜与目标不变，记录三档目镜。';
  }
  all('[data-mirror]').forEach(b=>{b.draggable=true;b.querySelector('img').draggable=false;b.addEventListener('click',()=>N.course.selectMirror(b.dataset.mirror));b.addEventListener('dragstart',e=>{N.course.selectMirror(b.dataset.mirror);e.dataTransfer.setData('text/plain',b.dataset.mirror);e.dataTransfer.effectAllowed='copy';});});
  $('#mirror-drop-slot').addEventListener('dragover',e=>{e.preventDefault();e.currentTarget.classList.add('is-target');});
  $('#mirror-drop-slot').addEventListener('dragleave',e=>e.currentTarget.classList.remove('is-target'));
  $('#viewport').addEventListener('dragover',e=>{if(N.course.get().stage!=='mirrors'||!N.course.get().mirrorSelection)return;e.preventDefault();e.dataTransfer.dropEffect='copy';$('#viewport').classList.add('is-drop-target');});
  $('#viewport').addEventListener('dragleave',e=>{if(!$('#viewport').contains(e.relatedTarget))$('#viewport').classList.remove('is-drop-target');});
  const overClamp=e=>{const m=N.app.telescope.lab.darkroom.art.mount,v=$('#viewport').getBoundingClientRect(),scale=v.width/$('#viewport').clientWidth;return !!e.target.closest('#mirror-drop-slot')||(m&&Math.abs(e.clientX-(v.left+m.x*scale))<105*scale&&e.clientY>v.top+(m.y-150)*scale&&e.clientY<v.top+(m.y+290)*scale);};
  N.isOverMirrorClamp=overClamp;
  $('#viewport').addEventListener('drop',e=>{if(N.course.get().stage!=='mirrors')return;e.preventDefault();$('#viewport').classList.remove('is-drop-target');$('#mirror-drop-slot').classList.remove('is-target');if(overClamp(e))N.course.mountMirror(e.dataTransfer.getData('text/plain'));});
  $('#rail-carriage').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();N.course.setMirrorPosition(N.course.get().mirrorPosition+(e.key==='ArrowLeft'?-.1:.1));});
  // Touch/pen uses pointer capture; desktop keeps native drag/drop and keyboard fallback.
  all('[data-mirror]').forEach(button=>{let gesture=null;
    button.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||button.disabled)return;gesture={x:e.clientX,y:e.clientY,ghost:null};button.setPointerCapture(e.pointerId);N.course.selectMirror(button.dataset.mirror);});
    button.addEventListener('pointermove',e=>{if(!gesture)return;if(!gesture.ghost&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>8){gesture.ghost=true;N.mirrorDragVisual.start(button,e);}if(gesture.ghost)N.mirrorDragVisual.move(e);});
    const end=e=>{if(!gesture)return;if(gesture.ghost&&e.type==='pointerup'&&overClamp(e))N.course.mountMirror(button.dataset.mirror);N.mirrorDragVisual.end();gesture=null;$('#mirror-drop-slot').classList.remove('is-target');};
    button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);button.addEventListener('lostpointercapture',end);
  });
  document.addEventListener('dragend',()=>{$('#viewport').classList.remove('is-drop-target');$('#mirror-drop-slot').classList.remove('is-target');});
  $('#mirror-position').addEventListener('input',e=>N.course.setMirrorPosition(Number(e.target.value)));
  $('#remove-mirror').addEventListener('click',()=>N.course.removeMirror());
  $('#mirror-focal').addEventListener('input',e=>N.course.setMirrorFocal(e.target.value));
  $('#finish-mirrors').addEventListener('click',()=>N.course.requestEnter('assembly'));
  $('#finish-assembly').addEventListener('click',()=>N.course.requestEnter('observation'));
  all('[data-reset-stage]').forEach(b=>b.addEventListener('click',()=>{N.course.resetStage();N.app.telescope?.resetView();}));
  all('[data-piece]').forEach(b=>{b.addEventListener('click',()=>N.course.selectPart(b.dataset.piece));b.addEventListener('dragstart',e=>{N.course.selectPart(b.dataset.piece,false);e.dataTransfer.setData('text/plain',b.dataset.piece);});});
  all('[data-slot]').forEach(b=>{b.addEventListener('click',()=>N.course.install(b.dataset.slot));b.addEventListener('dragover',e=>e.preventDefault());b.addEventListener('drop',e=>{e.preventDefault();N.course.install(b.dataset.slot,e.dataTransfer.getData('text/plain'));});});
  $('#aperture').addEventListener('input',e=>N.store.set({aperture:Number(e.target.value)}));$('#target').addEventListener('change',e=>N.store.set({target:e.target.value}));
  all('[data-eyepiece]').forEach(b=>b.addEventListener('click',()=>N.store.set({eyepiece:Number(b.dataset.eyepiece)})));
  $('#record-observation').addEventListener('click',()=>N.course.record());
  N.course.subscribe(sync);N.store.subscribe(syncOptics);sync(N.course.get());
})(window.Newton);

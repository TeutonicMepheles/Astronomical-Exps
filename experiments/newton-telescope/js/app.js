/* UI orchestration only: model geometry and optical calculations live in their modules. */
(function (N) {
  'use strict';
  const $=selector=>document.querySelector(selector),store=N.store;
  const preview=new N.Preview($('#planet'));
  let telescope;
  try{telescope=new N.Telescope($('#viewport'));}catch(error){$('#webgl-fallback').hidden=false;console.error('3D viewport could not start:',error);}
  const ranges=[['focal','focal','mm'],['angle-input','angle','°'],['eyepiece','eyepiece','mm']];
  function sync(state){
    ranges.forEach(([id,key,unit])=>{const input=$('#'+id);input.value=state[key];input.style.setProperty('--fill',`${(state[key]-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);const output=$('#'+(key==='angle'?'angle':id)+'-value');output.innerHTML=`${state[key]}${unit==='mm'?' ':''}<span>${unit}</span>`;input.setAttribute('aria-valuetext',`${state[key]}${unit==='mm'?' 毫米':' 度'}`);});
    document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===state.mode)));
    $('#live-preview').checked=state.live;
    $('#refresh-preview').hidden=state.live;
    $('#start').classList.toggle('is-running',state.running);$('#start span').textContent=state.running?'暂停观测':'开始观测';$('#start').setAttribute('aria-pressed',String(state.running));
    $('#start use').setAttribute('href',state.running?'#icon-eye':'#icon-play');
    const status=!state.live?'预览已冻结':state.running?'正在追踪光路':'光路就绪';$('#observation-status').textContent=status;
    preview.update(state);
  }
  ranges.forEach(([id,key])=>$('#'+id).addEventListener('input',event=>store.set({[key]:Number(event.target.value)})));
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>store.set({mode:button.dataset.mode})));
  $('#live-preview').addEventListener('change',event=>store.set({live:event.target.checked}));
  $('#refresh-preview').addEventListener('click',()=>preview.update(store.get(),true));
  $('#start').addEventListener('click',()=>{const next=!store.get().running;store.set({running:next});if(next){preview.update(store.get(),true);if(!store.get().live)toast('已按当前参数更新观测图像');}});
  $('#reset').addEventListener('click',()=>{N.course.resetStage();telescope?.resetView();$('#part-tooltip').hidden=true;toast('已恢复默认参数与视角');});
  $('#restore-view').addEventListener('click',()=>{telescope?.resetView();toast('已恢复初始视角');});
  const descriptions={
    primary:['主镜 · 凹面反射镜','收集来自远方的光，并将光线反射、汇聚。调节主镜焦距，可以观察汇聚位置的变化。'],
    secondary:['副镜 · 45° 平面镜','将主镜反射回来的光束折转约 90°，导向镜筒侧面的目镜。副镜本身不提供放大。'],
    eyepiece:['目镜 · 放大成像','放大主镜形成的像。放大倍率 = 主镜焦距 ÷ 目镜焦距。默认设置为 800 ÷ 25 = 32 倍。']
  };
  document.querySelectorAll('[data-part] button').forEach(button=>button.addEventListener('click',()=>{const [title,body]=descriptions[button.parentElement.dataset.part];$('#part-tooltip h3').textContent=title;$('#part-tooltip p').textContent=body;$('#part-tooltip').hidden=false;}));
  $('#close-tooltip').addEventListener('click',()=>$('#part-tooltip').hidden=true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')$('#part-tooltip').hidden=true;});
  let toastTimer;function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,2200);}
  store.subscribe(sync);sync(store.get());
  N.app={telescope,preview};
})(window.Newton);

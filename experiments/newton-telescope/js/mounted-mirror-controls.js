(function(N){
 const root=document.createElement('section');root.id='mounted-mirror-controls';root.setAttribute('aria-label','已安装镜片参数');root.hidden=true;
 root.innerHTML='<div class="mounted-focal"><label for="mounted-focal">焦距</label><input id="mounted-focal" type="range" min="200" max="1200" step="10" aria-orientation="vertical"><output for="mounted-focal"></output></div><button type="button" aria-label="取下镜片"><img src="assets/remove-mirror-options/selected-return.png" alt="" draggable="false"></button>';
 document.querySelector('#mirror-workspace').append(root);
 const input=root.querySelector('input'),output=root.querySelector('output'),focal=root.querySelector('.mounted-focal');
 input.addEventListener('input',()=>{if(lensPage()){const type=N.course.get().lens,value=N.lensOptics.shapeFromFocal(type,input.value);if(type==='concave')N.course.setConcaveShape(value);else if(type==='convex')N.course.setConvexShape(value);}else N.course.setMirrorFocal(input.value);});
 const remove=root.querySelector('button'),bubble=new ExperimentHints.NameBubble();
 remove.addEventListener('pointerenter',()=>bubble.show({target:remove,text:'取下镜片'}));remove.addEventListener('pointerleave',()=>bubble.hide());remove.addEventListener('focus',()=>bubble.show({target:remove,text:'取下镜片'}));remove.addEventListener('blur',()=>bubble.hide());
 const lensPage=()=>document.querySelector('.observatory').dataset.trayPage==='lenses';
 remove.addEventListener('click',()=>{bubble.hide();if(lensPage())N.course.removeLens();else N.course.removeMirror();});
 const sync=s=>{
  const lens=lensPage(),convex=lens&&s.lens==='convex',shaped=lens&&Boolean(s.lens),mounted=lens?Boolean(s.lens):s.mirrorMounted;
  if(s.stage!=='mirrors'||!mounted)bubble.hide();root.hidden=s.stage!=='mirrors'||!mounted;root.dataset.optic=convex?'convex':lens?'lens':'mirror';
  focal.hidden=lens?!shaped:s.mirror==='plane';input.disabled=lens?!shaped:s.mirror==='plane'||!s.mirrorMounted;
  focal.querySelector('label').textContent='焦距';
  if(shaped){const range=N.lensOptics.focalRange,value=Math.round(N.lensOptics.focalLength(s));input.min=range.min;input.max=range.max;input.step=range.step;input.value=Math.abs(value);input.setAttribute('aria-label',(convex?'凸透镜焦距':'凹透镜焦距的绝对值')+'（毫米，示意）');input.setAttribute('aria-valuetext',value+' 毫米，示意焦距');output.textContent=Math.abs(value)+' mm';}
  else{const range=N.mirrorParts.limits(s.mirror);input.min=range.min;input.max=range.max;input.step=1;input.value=s.mirrorFocal;input.setAttribute('aria-label','反射镜焦距（毫米）');input.removeAttribute('aria-valuetext');output.textContent=s.mirrorFocal+' mm';}
 };
 const off=N.course.subscribe(sync);sync(N.course.get());window.addEventListener('pagehide',()=>{off();bubble.destroy();root.remove();},{once:true});
})(window.Newton);

(function(N){
 const root=document.createElement('section');root.id='mounted-mirror-controls';root.setAttribute('aria-label','已安装镜片参数');root.hidden=true;
 root.innerHTML='<div class="mounted-focal"><label for="mounted-focal">焦距</label><input id="mounted-focal" type="range" min="200" max="1200" step="10" aria-orientation="vertical"><output for="mounted-focal"></output></div><button type="button" aria-label="取下镜片"><img src="assets/remove-mirror-options/selected-return.png" alt="" draggable="false"></button>';
 document.querySelector('#mirror-workspace').append(root);
 const input=root.querySelector('input'),output=root.querySelector('output'),focal=root.querySelector('.mounted-focal');
 input.addEventListener('input',()=>N.course.setMirrorFocal(input.value));
 const remove=root.querySelector('button'),bubble=new ExperimentHints.NameBubble();
 remove.addEventListener('pointerenter',()=>bubble.show({target:remove,text:'取下镜片'}));remove.addEventListener('pointerleave',()=>bubble.hide());remove.addEventListener('focus',()=>bubble.show({target:remove,text:'取下镜片'}));remove.addEventListener('blur',()=>bubble.hide());
 remove.addEventListener('click',()=>{bubble.hide();N.course.removeMirror();});
 const sync=s=>{if(s.stage!=='mirrors'||!s.mirrorMounted)bubble.hide();root.hidden=s.stage!=='mirrors'||!s.mirrorMounted;focal.hidden=s.mirror==='plane';input.disabled=s.mirror==='plane'||!s.mirrorMounted;const range=N.mirrorParts.limits(s.mirror);input.min=range.min;input.max=range.max;input.step=1;input.value=s.mirrorFocal;output.textContent=s.mirrorFocal+' mm';};
 const off=N.course.subscribe(sync);sync(N.course.get());window.addEventListener('pagehide',()=>{off();bubble.destroy();root.remove();},{once:true});
})(window.Newton);

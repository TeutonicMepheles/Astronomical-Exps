/* Shared contour and bubble components on a pointer-following drag preview. */
(function(N){
 const names={plane:'平面镜',concave:'凹面镜',convex:'凸面镜'};
 const bubble=new ExperimentHints.NameBubble();
 const tip=new ExperimentUI.OperationTip(document.querySelector('.observatory'),{top:'64px',className:'mirror-install-tip'});
 const empty=document.createElement('canvas');empty.width=empty.height=1;
 let ghost=null,hint=null;
 function end(){hint?.destroy();hint=null;bubble.hide();ghost?.remove();ghost=null;tip.hide();document.body.classList.remove('is-dragging-specimen');}
 function move(e){
  if(!ghost)return;
  ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
  const valid=N.course.get().stage==='mirrors'&&N.isOverMirrorClamp(e);
  if(valid)tip.show('放下以安装镜片');else tip.hide();
 }
 function start(button,e){
  end();N.courseInteractions.bubble.hide();N.courseInteractions.guide.hide();
  ghost=document.createElement('div');ghost.className='mirror-drag-preview';const img=button.querySelector('img').cloneNode();img.draggable=false;ghost.append(img);document.body.append(ghost);
  hint=new ExperimentHints.AffordanceHint(img,{contour:CourseContours[button.dataset.mirror],overlayRoot:ghost});hint.setEnabled(true);hint.layer.classList.add('drag-white-outline');
  document.body.classList.add('is-dragging-specimen');move(e);bubble.show({target:ghost,text:names[button.dataset.mirror]});
 }
 document.addEventListener('dragstart',e=>{const button=e.target.closest('[data-mirror]');if(!button)return;e.dataTransfer.setDragImage(empty,0,0);start(button,e);});
 document.addEventListener('dragover',e=>{if(ghost){e.preventDefault();move(e);if(e.dataTransfer)e.dataTransfer.dropEffect=N.isOverMirrorClamp(e)?'copy':'none';}});
 document.addEventListener('dragleave',e=>{if(!e.relatedTarget)tip.hide();});
 for(const event of ['drop','dragend'])document.addEventListener(event,end);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')end();});
 window.addEventListener('blur',end);window.addEventListener('pagehide',()=>{end();tip.destroy();});
 N.course.subscribe(s=>{if(s.stage!=='mirrors')end();});
 N.mirrorDragVisual={start,move,end};
})(window.Newton);

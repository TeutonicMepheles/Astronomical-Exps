/* Pointer-free mounting fallback. Course APIs still own recognition and installation. */
(function(N){
 const stage=document.querySelector('.observatory'),root=document.createElement('section');root.id='mounted-mirror-controls';root.setAttribute('aria-label','镜片安装与取下');root.hidden=true;
 const icon=down=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><path d="M4 18v3h16v-3'+(down?'M12 10v7m-4-4 4 4 4-4':'M12 17v-7m-4 4 4-4 4 4')+'"/></svg>';
 root.innerHTML='<button type="button" data-remove-optic aria-label="取下镜片" title="取下镜片">'+icon(false)+'</button><button type="button" data-mount-optic aria-label="放上镜片" title="放上镜片" hidden>'+icon(true)+'</button>';
 document.querySelector('#mirror-workspace').append(root);
 const remove=root.querySelector('[data-remove-optic]'),mount=root.querySelector('[data-mount-optic]'),bubble=N.courseInteractions.bubble;
 function selection(s=N.course.get()){return N.tableSpecimens?.getSelection()||(s.mirrorSelection?{kind:'mirror',type:s.mirrorSelection}:null);}
 for(const button of [remove,mount]){
  const describe=()=>bubble.show({target:button,text:button.getAttribute('aria-label')});
  button.addEventListener('pointerenter',describe);button.addEventListener('focus',describe);
  const hide=()=>{bubble.hide(button);N.courseInteractions.restoreTip();};button.addEventListener('pointerleave',hide);button.addEventListener('blur',hide);
 }
 remove.onclick=()=>{const s=N.course.get(),candidate=selection(s);bubble.hide();if(s.lens)N.course.removeLens();if(N.course.get().mirrorMounted)N.course.removeMirror();if(candidate?.kind==='mirror')N.course.selectMirror(candidate.type);};
 mount.onclick=()=>{const s=N.course.get(),candidate=selection(s);if(s.stage!=='mirrors'||!candidate)return;bubble.hide();
  if(candidate.kind==='lens'){if(s.mirrorMounted)N.course.removeMirror();N.tableSpecimens.installSelected();}
  else{N.tableSpecimens?.clearSelection();if(s.lens)N.course.removeLens();N.course.mountMirror(candidate.type);}
 };
 const sync=s=>{const mounted=Boolean(s.lens||s.mirrorMounted),candidate=selection(s);root.hidden=s.stage!=='mirrors'||(!mounted&&!candidate);remove.hidden=!mounted;mount.hidden=!candidate;root.dataset.optic=s.lens==='convex'?'convex':s.lens?'lens':'mirror';if(root.hidden)bubble.hide(remove);if(!candidate)bubble.hide(mount);if(!mounted)bubble.hide(remove);N.app?.telescope&&(N.app.telescope.dirty=true);};
 const selectionChanged=()=>sync(N.course.get());stage.addEventListener('newton-specimen-selection',selectionChanged);
 const off=N.course.subscribe(sync);sync(N.course.get());window.addEventListener('pagehide',()=>{off();stage.removeEventListener('newton-specimen-selection',selectionChanged);root.remove();},{once:true});
})(window.Newton);

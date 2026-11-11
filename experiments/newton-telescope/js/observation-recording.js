/* Four-target notebook. Capture only after the live preview has actually drawn. */
(function(N){
 'use strict';
 N.ObservationRecording=class{
  constructor(stage,eyepiece,changed){
   this.preview=N.app.preview;this.changed=changed;
   this.discovery=document.createElement('div');this.discovery.className='observation-discovery';this.discovery.hidden=true;
   this.discovery.innerHTML='<span role="status"></span><button type="button">记录结果</button>';
   this.discoveryTitle=this.discovery.querySelector('span');this.saveButton=this.discovery.querySelector('button');
   this.saveButton.addEventListener('click',()=>this.captureObserved());
   this.preview.canvas.closest('.preview-card').append(this.discovery);
   this.button=document.createElement('button');this.button.type='button';
   this.button.className='observation-record-book-button';
   this.button.innerHTML='<i aria-hidden="true"></i>实验记录 <b>0/4</b>';
   this.count=this.button.querySelector('b');this.button.hidden=true;
   this.button.addEventListener('click',()=>this.openBook());stage.append(this.button);
   this.book=document.createElement('dialog');this.book.className='observation-record-book';
   this.book.setAttribute('aria-labelledby','observation-record-book-title');
   this.book.innerHTML=`<article class="observation-record-paper"><button type="button" class="observation-record-close">关闭 ×</button>
    <h2 id="observation-record-book-title">实验记录</h2><p class="observation-record-subtitle"></p><div class="observation-record-cards"></div></article>`;
   this.closeButton=this.book.querySelector('.observation-record-close');
   this.closeButton.addEventListener('click',()=>this.closeBook());
   this.book.addEventListener('click',e=>{if(e.target===this.book)this.closeBook();});
   this.book.addEventListener('cancel',e=>{e.preventDefault();this.closeBook();});stage.append(this.book);
  }
  render(active,aim,optical,course){
   this.active=active;this.button.hidden=!active;
   const count=course.observedTargets.length+'/4';
   if(this.count.textContent!==count)this.count.textContent=count;
   const inRange=active&&aim?.acquired&&aim.target===optical.target&&!N.app.observationModel?.autoAim;
   const setup=N.store.observationSetup(optical);
   const ready=setup.suitable&&N.observationArt?.ready&&inRange&&aim.aligned&&aim.focused&&optical.live&&N.store.focusAcceptable(optical,aim.focused);
   const saved=course.records.some(r=>r.target===optical.target&&r.image);
   this.discovery.hidden=!ready;
   this.saveButton.hidden=saved;
   this.discoveryTitle.textContent=ready?'观测到'+N.observationTargets[optical.target].name:'';
   return {hint:inRange&&!setup.suitable?setup.hint:inRange&&!N.observationArt?.ready?(N.observationArt?.failed?'观测图像加载失败，请刷新':'正在加载观测图像…'):ready?'':undefined};
  }
  captureObserved(){
   if(!N.observationArt?.ready||!this.active||this.capturing||document.hidden||N.app.observationModel?.autoAim)return;
   const optical=this.preview.state,live=N.store.get(),aim=this.preview.aim,course=N.course.get();
   if(!N.store.observationSetup(optical).suitable||!optical.live||!live.live||optical.mode!=='parallel'||!aim?.aligned||!aim.focused||!N.store.focusAcceptable(optical,aim.focused)||aim.target!==optical.target)return;
   if(['target','focal','eyepiece','aperture','mode'].some(k=>live[k]!==optical[k]))return;
   if(course.records.some(r=>r.target===optical.target&&r.image))return;
   const source=this.preview.canvas;if(!source.width||!source.height)return;
   this.capturing=true;
   try{
    const snapshot=document.createElement('canvas');snapshot.width=snapshot.height=320;
    snapshot.getContext('2d').drawImage(source,0,0,320,320);
    if(N.course.recordDrawing({optical,aim,image:snapshot.toDataURL('image/png')}))this.button.focus({preventScroll:true});
   }finally{this.capturing=false;}
  }
  openBook(){
   if(!this.active||this.book.open)return;
   const course=N.course.get();
   this.book.querySelector('.observation-record-subtitle').textContent='已完成 '+course.observedTargets.length+' / 4 个天体观测';
   const cards=Object.entries(N.observationTargets).map(([id,meta])=>{
    const card=document.createElement('section');card.className='observation-record-card';
    const record=course.records.find(r=>r.target===id&&r.image);
    const image=document.createElement(record?'img':'div');
    if(record){image.src=record.image;image.alt=meta.name+'观测图';}
    else{image.className='observation-record-empty';image.textContent='?';image.setAttribute('aria-hidden','true');card.classList.add('is-empty');}
    const title=document.createElement('h3');title.textContent=record?meta.name:'待发现';
    card.append(image,title);
    if(record){
     const data=document.createElement('dl');
     for(const [label,value] of [['主镜焦距',record.focal+' mm'],['目镜焦距',record.eyepiece+' mm'],['主镜口径',record.aperture+' mm'],['倍率',Number(record.magnification.toFixed(1))+'×'],['估算视场',record.field.toFixed(2)+'°']]){
      const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;data.append(dt,dd);
     }
     card.append(data);
    }
    return card;
   });
   this.book.querySelector('.observation-record-cards').replaceChildren(...cards);
   this.book.showModal();this.closeButton.focus();
  }
  closeBook(restoreFocus=true){if(!this.book.open)return;this.book.close();if(restoreFocus&&!this.button.hidden)this.button.focus();}
  leave(){this.closeBook(false);}
 };
})(window.Newton);

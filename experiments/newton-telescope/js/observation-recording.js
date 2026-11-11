/* A single comparison drawn from the live eyepiece, with one image per focal length. */
(function(N){
  'use strict';
  N.ObservationRecording=class{
    constructor(stage,eyepiece,changed){
      this.stage=stage;
      this.preview=N.app.preview;
      this.changed=changed;
      this.eyepiece=eyepiece;
      this.viewport=this.preview.canvas.closest('.planet-viewport');
      this.capture=document.createElement('button');
      this.capture.type='button';
      this.capture.className='observation-draw';
      this.capture.setAttribute('aria-label','绘制记录');
      this.capture.hidden=true;
      this.capture.addEventListener('click',()=>this.save());
      this.viewport.append(this.capture);

      this.sliderHint=document.createElement('span');
      this.sliderHint.className='observation-draw-slider-hint';
      this.sliderHint.hidden=true;
      eyepiece.wrap.append(this.sliderHint);
      this.bindSlider();

      this.button=document.createElement('button');
      this.button.type='button';
      this.button.className='observation-record-book-button';
      this.button.innerHTML='<i aria-hidden="true"></i>实验记录 <b>0/3</b>';
      this.count=this.button.querySelector('b');
      this.button.hidden=true;
      this.button.addEventListener('click',()=>this.openBook());
      stage.append(this.button);
      this.book=document.createElement('dialog');
      this.book.className='observation-record-book';
      this.book.setAttribute('aria-labelledby','observation-record-book-title');
      this.book.setAttribute('aria-modal','true');
      this.book.innerHTML=`<article class="observation-record-paper">
        <button type="button" class="observation-record-close">关闭 ×</button>
        <h2 id="observation-record-book-title">实验记录</h2>
        <p class="observation-record-subtitle"></p>
        <div class="observation-record-cards"></div>
      </article>`;
      this.closeButton=this.book.querySelector('.observation-record-close');
      this.closeButton.addEventListener('click',()=>this.closeBook());
      this.book.addEventListener('click',e=>{if(e.target===this.book)this.closeBook()});
      this.book.addEventListener('keydown',e=>{
        if(e.key==='Escape'){e.preventDefault();this.closeBook();}
        if(e.key==='Tab')e.preventDefault();
      });
      stage.append(this.book);
    }
    status(active,aim,optical,course){
      const first=course.records[0];
      if(!active||optical.mode!=='parallel')return {};
      if(course.complete){
        return first.target===optical.target
          ?{hint:N.observationTargets[first.target].name+'三档已记录 · 实验完成'}
          :{};
      }
      if(this.pending)return {hint:'正在收入实验记录…'};
      if(first&&first.target!==optical.target){
        return {hint:'返回'+N.observationTargets[first.target].name+'继续记录（'+course.records.length+'/3）'};
      }
      if(!aim?.selected||!aim.acquired||aim.target!==optical.target)return {};
      if(!aim.recordingCentered)return {hint:aim.inField?'将天体移到准星中心':undefined};
      if(!optical.live)return {hint:'恢复实时预览后记录'};
      if(first&&(first.focal!==optical.focal||first.aperture!==optical.aperture)){
        return {hint:`请恢复主镜焦距 ${first.focal} mm、口径 ${first.aperture} mm`};
      }
      const next=N.course.observationEyepieces[course.records.length];
      return next===optical.eyepiece
        ?{next,ready:true,hint:'点击观测画面 · 绘制记录'}
        :{next,sliderHint:'拖动目镜焦距至 '+next+' mm',hint:'已对准准星'};
    }
    render(active,aim,optical,course){
      this.active=active;
      const status=this.status(active,aim,optical,course);
      this.next=status.next;
      this.capture.hidden=!status.ready;
      this.viewport.classList.toggle('is-draw-ready',Boolean(status.ready));
      this.sliderHint.hidden=!status.sliderHint;
      const sliderText=status.sliderHint??'';
      if(this.sliderHint.textContent!==sliderText)this.sliderHint.textContent=sliderText;
      this.eyepiece.wrap.classList.toggle('is-draw-guided',Boolean(status.sliderHint));
      this.button.hidden=!active;
      const count=course.records.length+'/3';
      if(this.count.textContent!==count)this.count.textContent=count;
      return status;
    }
    openBook(){
      if(!this.active||this.pending||this.book.open)return;
      const records=N.course.get().records;
      const target=records[0]?.target??N.store.get().target;
      this.book.querySelector('.observation-record-subtitle').textContent=
        (N.observationTargets[target]?.name??'观测对象')+' · '+records.length+'/3 条绘制记录';
      const cards=N.course.observationEyepieces.map((focal,i)=>{
        const card=document.createElement('section');
        card.className='observation-record-card';
        const record=records[i];
        if(record){
          const photo=document.createElement('img');
          photo.src=record.image;
          photo.alt=N.observationTargets[target].name+'，'+focal+' mm 目镜下的观测图';
          card.append(photo);
        }else{
          const empty=document.createElement('div');
          empty.className='observation-record-empty';
          empty.textContent='待记录';
          card.append(empty);
        }
        const title=document.createElement('h3');
        title.textContent=(i+1)+' · '+focal+' mm';
        card.append(title);
        if(record){
          const values=document.createElement('dl');
          const rows=[
            ['目镜焦距',record.eyepiece+' mm'],['物镜焦距',record.focal+' mm'],
            ['倍率',Number(record.magnification.toFixed(1))+'×'],['图像视场',record.field.toFixed(2)+'°']
          ];
          for(const [label,value] of rows){
            const term=document.createElement('dt'),description=document.createElement('dd');
            term.textContent=label;description.textContent=value;
            values.append(term,description);
          }
          card.append(values);
        }
        return card;
      });
      this.book.querySelector('.observation-record-cards').replaceChildren(...cards);
      this.book.show();
      this.closeButton.focus();
    }
    closeBook(restoreFocus=true){
      if(!this.book.open)return;
      this.book.close();
      if(restoreFocus&&!this.button.hidden)this.button.focus();
    }
    leave(){
      this.closeBook(false);
      this.pending?.cancel();
    }
    async save(){
      const optical=this.preview.state,aim=this.preview.aim,course=N.course.get();
      if(this.book.open||!this.status(this.active,aim,optical,course).ready)return;
      const live=N.store.get();
      if(!live.live||live.target!==optical.target||live.eyepiece!==optical.eyepiece||
        live.focal!==optical.focal||live.aperture!==optical.aperture||live.mode!==optical.mode)return;
      const source=this.preview.canvas;
      if(!source.width||!source.height)return;
      const snapshot=document.createElement('canvas');
      snapshot.width=snapshot.height=320;
      snapshot.getContext('2d').drawImage(source,0,0,320,320);
      const resetVersion=N.course.resetVersion;
      const image=snapshot.toDataURL('image/png');
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
        const arrived=await this.fly(snapshot);
        if(!arrived){this.changed();return;}
      }
      if(this.active&&resetVersion===N.course.resetVersion&&N.course.recordDrawing({optical,image})){
        this.button.focus({preventScroll:true});
      }
      this.changed();
    }
    async fly(snapshot){
      const stage=this.stage.getBoundingClientRect();
      const scale=stage.width/this.stage.offsetWidth;
      const center=node=>{
        const rect=node.getBoundingClientRect();
        return {x:(rect.left+rect.width/2-stage.left)/scale,y:(rect.top+rect.height/2-stage.top)/scale};
      };
      const from=center(this.viewport),to=center(this.button);
      const dx=to.x-from.x,dy=to.y-from.y;
      snapshot.className='observation-record-flight';
      snapshot.style.left=from.x+'px';
      snapshot.style.top=from.y+'px';
      this.stage.append(snapshot);
      const pose=(x,y,size)=>`translate(-50%,-50%) translate(${x}px,${y}px) scale(${size})`;
      const landing=pose(dx,dy,.24);
      const animation=snapshot.animate([
        {transform:pose(0,0,1),opacity:1,easing:'ease-out'},
        {transform:pose(dx*.53,dy*.52-52,.64),opacity:1,offset:.48,easing:'ease-in-out'},
        {transform:landing,opacity:1,offset:.80},
        {transform:landing,opacity:1,offset:.90},
        {transform:landing,opacity:0}
      ],{duration:940,fill:'forwards'});
      this.pending=animation;
      this.changed();
      try{
        await animation.finished;
        return true;
      }catch(error){
        if(error.name!=='AbortError')throw error;
        return false;
      }finally{
        snapshot.remove();
        this.pending=null;
      }
    }
    bindSlider(){
      const {input,wrap}=this.eyepiece;
      const hit=document.createElement('div');
      hit.className='observation-eyepiece-drag';
      hit.setAttribute('aria-hidden','true');
      wrap.append(hit);
      const knob=wrap.querySelector('.observation-slider-knob');
      const min=Number(input.min),max=Number(input.max);
      const slowDistance=6,snapDistance=1.5;
      let drag;
      function atPointer(event){
        const rect=wrap.getBoundingClientRect();
        const scale=rect.height/wrap.offsetHeight;
        return max-((event.clientY-rect.top)/scale-23)*(max-min)/177;
      }
      const move=event=>{
        if(!drag||event.pointerId!==drag.id||drag.snapped)return;
        const raw=Math.max(min,Math.min(max,atPointer(event)+drag.grabOffset));
        const goal=drag.goal;
        let value=Math.round(raw);
        if(goal!==undefined){
          const offset=raw-goal,distance=Math.abs(offset);
          const crossed=(drag.previous-goal)*offset<0;
          drag.previous=raw;
          if(drag.armed&&(crossed||distance<=snapDistance)){
            drag.snapped=true;
            value=goal;
          }else{
            if(distance>=slowDistance)drag.armed=true;
            if(drag.armed&&distance<slowDistance){
              const slowed=distance*(.4+.6*distance/slowDistance);
              value=goal+Math.sign(offset)*Math.max(1,Math.round(slowed));
            }
          }
        }
        if(Number(input.value)!==value){
          input.value=value;
          input.dispatchEvent(new Event('input',{bubbles:true}));
        }
      };
      hit.addEventListener('pointerdown',event=>{
        if(!event.isPrimary||event.button!==0||drag)return;
        event.preventDefault();
        input.focus({preventScroll:true});
        const rect=knob.getBoundingClientRect();
        const onKnob=event.clientY>=rect.top&&event.clientY<=rect.bottom;
        const value=Number(input.value),goal=this.next;
        drag={id:event.pointerId,goal,previous:value,grabOffset:onKnob?value-atPointer(event):0,armed:value!==goal,snapped:false};
        hit.setPointerCapture(event.pointerId);
        if(!onKnob)move(event);
      });
      hit.addEventListener('pointermove',move);
      for(const type of ['pointerup','pointercancel','lostpointercapture']){
        hit.addEventListener(type,event=>{if(event.pointerId===drag?.id)drag=null;});
      }
    }
  };
})(window.Newton);

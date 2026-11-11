/* Experiment-private rotary presentation; existing range inputs retain store bindings. */
(function(N){
 'use strict';
 const knobImage=new URL("knob.png", document.currentScript.src).href;
 N.ParameterKnob=class{
  constructor({id,input,output,label,host}){
   this.eyepiece=id==='eyepiece';this.input=input;this.min=Number(input.min);this.max=Number(input.max);this.step=Number(input.step)||1;
   const wrap=this.wrap=document.createElement('div');wrap.className='newton-parameter-knob';wrap.dataset.parameter=id;wrap.setAttribute('role','group');wrap.setAttribute('aria-label',label);
   const caption=document.createElement('label');caption.htmlFor=id;caption.textContent=label;
   const dial=this.dial=document.createElement('div');dial.className='newton-parameter-dial';
   dial.innerHTML='<b class="newton-knob-origin" aria-hidden="true"></b><img src="'+knobImage+'" alt="" draggable="false"><svg class="newton-knob-scale" viewBox="0 0 144 144" aria-hidden="true"></svg><i class="newton-knob-pointer" aria-hidden="true"><span class="newton-knob-position-dot"></span></i>';
   const svg=dial.querySelector('svg'),ns='http://www.w3.org/2000/svg';
   for(let i=0;i<=18;i++){const a=(-135+i*15)*Math.PI/180,l=document.createElementNS(ns,'line'),r=i%3?65:62;l.setAttribute('x1',72+Math.sin(a)*r);l.setAttribute('y1',72-Math.cos(a)*r);l.setAttribute('x2',72+Math.sin(a)*69);l.setAttribute('y2',72-Math.cos(a)*69);svg.append(l);}
   const row=document.createElement('div');row.className='newton-knob-readout';
   const minus=document.createElement('button'),plus=document.createElement('button');minus.type=plus.type='button';minus.textContent='−';plus.textContent='+';minus.setAttribute('aria-label',label+'减小');plus.setAttribute('aria-label',label+'增大');minus.onclick=()=>this.write(Number(input.value)-this.step);plus.onclick=()=>this.write(Number(input.value)+this.step);this.minus=minus;this.plus=plus;
   input.setAttribute('aria-orientation','horizontal');input.setAttribute('aria-label',label+'（毫米），外圈旋转、中心左右或上下拖动、方向键调节');input.classList.add('newton-knob-input');dial.append(input);
   row.append(minus,output,plus);wrap.append(caption,dial,row);host.append(wrap);
   input.addEventListener('input',()=>this.update());this.bind();this.update();
  }
  quantize(value){return Math.max(this.min,Math.min(this.max,this.min+Math.round((value-this.min)/this.step)*this.step));}
  write(value){const next=this.quantize(value);if(next===Number(this.input.value))return;this.input.value=next;this.input.dispatchEvent(new Event('input',{bubbles:true}));this.update();}
  update(){const value=Number(this.input.value);this.wrap.style.setProperty('--knob-angle',(-135+(value-this.min)/(this.max-this.min)*270)+'deg');this.input.setAttribute('aria-valuetext',value+' 毫米');this.minus.disabled=value<=this.min;this.plus.disabled=value>=this.max;}
  setGoal(value){if(this.goal===value)return;this.goal=value;this.update();}
  bind(){
   const dial=this.dial;let drag,frame=0,pending;
   const flush=()=>{cancelAnimationFrame(frame);frame=0;if(pending!==undefined){const value=pending;pending=undefined;this.write(value);}};
   const end=(event,cancel=false)=>{if(!drag||event.pointerId!==drag.id)return;const old=drag;drag=null;if(cancel){pending=undefined;cancelAnimationFrame(frame);frame=0;if(cancel===true)this.write(old.value);}else flush();this.wrap.classList.remove('is-dragging');if(dial.hasPointerCapture(old.id))dial.releasePointerCapture(old.id);};
   dial.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0||drag)return;
    event.preventDefault();this.input.focus({preventScroll:true});
    const rect=dial.getBoundingClientRect(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,
     value:Number(this.input.value),current:Number(this.input.value),scale:rect.width/144,cx,cy,
     rotary:Math.hypot(event.clientX-cx,event.clientY-cy)>rect.width*.22,
     angle:Math.atan2(event.clientY-cy,event.clientX-cx),deadRadius:rect.width*.12};
    dial.setPointerCapture(event.pointerId);this.wrap.classList.add('is-dragging');
   });
   dial.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    let delta=0;
    if(drag.rotary){
     const radius=Math.hypot(event.clientX-drag.cx,event.clientY-drag.cy);
     const angle=Math.atan2(event.clientY-drag.cy,event.clientX-drag.cx);
     if(radius<drag.deadRadius){drag.angle=null;return;}
     if(drag.angle!==null){
      const turn=Math.atan2(Math.sin(angle-drag.angle),Math.cos(angle-drag.angle));
      delta=turn/(Math.PI*1.5)*(this.max-this.min);
     }
     drag.angle=angle;
    }else{
     if(!drag.axis){
      const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
      if(Math.max(Math.abs(dx),Math.abs(dy))<3*drag.scale)return;
      drag.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';
     }
     delta=(drag.axis==='x'?event.clientX-drag.x:drag.y-event.clientY)/drag.scale/240*(this.max-this.min);
    }
    drag.x=event.clientX;drag.y=event.clientY;
    // Clamp each increment so reversing at a limit responds immediately.
    // No target snapping: every value can be passed in the same gesture.
    drag.current=Math.max(this.min,Math.min(this.max,drag.current+delta));
    pending=drag.current;if(!frame)frame=requestAnimationFrame(flush);
   });
   dial.addEventListener('pointerup',e=>end(e));dial.addEventListener('pointercancel',e=>end(e,true));dial.addEventListener('lostpointercapture',e=>end(e,true));
   const cancel=(restore=true)=>{if(drag)end({pointerId:drag.id},restore===false?'discard':true);};window.addEventListener('blur',()=>cancel());document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});this.cancel=cancel;
  }
 };
})(window.Newton);

/* Illustrated eyepiece image. This is a pedagogical preview, not a sky renderer. */
(function (N) {
  'use strict';
  // Fixed decorative field, not a catalogue or a celestial-coordinate measurement.
  // Generate once: no random flicker, image downloads or additional animation clock.
  const eyepieceStars=Array.from({length:64},(_,i)=>{
    const fraction=x=>x-Math.floor(x);
    return {x:fraction((i+1)*.754877666),y:fraction((i+1)*.569840291),
      radius:i%13===0?1.45:i%4===0?1:.65,alpha:i%13===0?.84:i%4===0?.58:.34};
  });
  N.Preview = class {
    constructor(canvas) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.state=N.store.get();
      this.pendingAim=this.aim=null;this.drawListeners=new Set();
      N.observationArt?.subscribe(()=>this.draw(this.state));
      this.observer=new ResizeObserver(()=>this.draw(this.state));this.observer.observe(canvas);
    }
    subscribeDraw(fn){this.drawListeners.add(fn);return ()=>this.drawListeners.delete(fn);}
    setAim(value,{force=false}={}){
      this.pendingAim=value?{...value}:null;
      if(N.store.get().live||force){
        const key=JSON.stringify(this.pendingAim);
        if(key!==JSON.stringify(this.aim)){this.aim=this.pendingAim?{...this.pendingAim}:null;this.draw(this.state);}
      }
    }
    update(state,force=false){if(state.live||force){this.state={...state};this.aim=this.pendingAim?{...this.pendingAim}:null;this.draw(this.state);}document.querySelector('.preview-paused').hidden=state.live;}
    draw(state){
      let ctx=this.ctx;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
      const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=w*dpr;this.canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      // Preserve the default 32x illustration; all scene spacing follows inverse field.
      // Target sizes are schematic, not a catalogue of measured angular diameters.
      const optics=N.optics.calculate(state),scale=(60/32)/optics.field;
      // Compress the collecting-area response so highlights remain readable.
      // This brightness cue is illustrative, not calibrated surface photometry.
      const areaRatio=((state.aperture||130)/130)**2,response=Math.sqrt(areaRatio);
      const brightness=2*response/(1+response);
      ctx.save();ctx.filter=`brightness(${brightness})`;
      // Keep the full default Saturn visible in the circular observation viewport.
      // The original wide viewport retains its existing image scale.
      const imageHeight=Math.min(h,w*.55);
      const snapshot=state.mode==='parallel'?this.aim:null;
      const aim=snapshot?.target&&snapshot.target!==state.target?{...snapshot,selected:false,acquired:false,x:0,y:0}:snapshot,guided=Boolean(aim?.enabled);
      const r=(state.target==='jupiter'?imageHeight*.14:state.target==='moon'?imageHeight*.38:imageHeight*.31)*scale;
      const cx=guided?w/2+(aim.selected?aim.x:0)*Math.min(w,h)*.46:w*.51+(state.angle-45)*w*.001;
      const cy=guided?h/2+(aim.selected?aim.y:0)*Math.min(w,h)*.46:h*.52+(state.angle-45)*h*.001;
      if(guided){
        ctx.fillStyle='#080d22';ctx.fillRect(0,0,w,h);
        const fieldScale=Math.min(w,h)/600;
        for(const star of eyepieceStars){
          const x=star.x*w,y=star.y*h,r=Math.max(.65,star.radius*fieldScale);
          ctx.fillStyle=`rgba(202,222,248,${star.alpha})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
          if(star.radius>1){ctx.fillStyle='rgba(150,184,230,.10)';ctx.beginPath();ctx.arc(x,y,r*2.5,0,Math.PI*2);ctx.fill();}
        }
      }else [[.16,.35,1],[.81,.61,.8],[.75,.17,.5],[.26,.79,.7],[.93,.29,.5],[.1,.84,.4]].forEach(([x,y,r])=>{ctx.fillStyle='#cddfff99';ctx.beginPath();ctx.arc(cx+(x-.51)*w*scale,cy+(y-.52)*h*scale,r,0,Math.PI*2);ctx.fill();});
      const blur=guided?N.store.focusBlur(state):Math.min(5,Math.abs(optics.focusHeight-3.1)*.45);
      this.canvas.setAttribute('data-focus-blur',String(blur));
      this.canvas.setAttribute('data-target-art',guided&&N.observationArt?.ready?'libtv-transparent-v2':'procedural');
      if(!guided||aim.acquired){
      if(guided){
        // Blur the completed object, not each clipped primitive: even the limb
        // and ring silhouette must lose focus. Reuse one bounded canvas.
        const layer=this.targetLayer??(this.targetLayer=document.createElement('canvas'));
        if(layer.width!==this.canvas.width||layer.height!==this.canvas.height){layer.width=this.canvas.width;layer.height=this.canvas.height;}
        ctx=layer.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      }
      ctx.save();ctx.translate(cx,cy);ctx.rotate(guided&&N.observationArt?.ready?0:-.37);ctx.filter=guided?'none':`blur(${blur}px) brightness(${brightness})`;
      if(!guided){const halo=ctx.createRadialGradient(0,0,r*.3,0,0,r*1.9);halo.addColorStop(0,'#d3b59318');halo.addColorStop(1,'#d3b59300');ctx.fillStyle=halo;ctx.fillRect(-r*2,-r*2,r*4,r*4);}
      if(guided&&N.observationArt?.ready){
        N.observationArt.draw(ctx,state.target,r,w,h,scale);
      }else if(state.mode==='point'){
        const glow=ctx.createRadialGradient(0,0,0,0,0,r*.6);glow.addColorStop(0,'#fff9e8');glow.addColorStop(.08,'#ffe6b4');glow.addColorStop(.3,'#a7c5f17a');glow.addColorStop(1,'#6786b000');ctx.fillStyle=glow;ctx.fillRect(-r,-r,r*2,r*2);
        for(let i=1;i<4;i++){ctx.beginPath();ctx.ellipse(0,0,r*.12*i,r*.12*i,0,0,Math.PI*2);ctx.strokeStyle=`rgba(188,209,255,${.13/i})`;ctx.lineWidth=1;ctx.stroke();}
      }else{
        if(state.target==='moon'){
          ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle='#c8cbd0';ctx.fill();
          [[-.3,-.25,.17],[.4,.1,.13],[-.1,.4,.2],[.15,-.5,.09]].forEach(([x,y,a])=>{ctx.beginPath();ctx.arc(x*r,y*r,a*r,0,Math.PI*2);ctx.fillStyle='#7e8793';ctx.fill();});
        }else if(state.target==='pleiades'){
          [[-.72,-.08],[-.46,.36],[-.28,-.34],[-.08,.1],[.13,-.15],[.29,.42],[.51,.07],[.66,-.38],[-.11,.59],[.39,-.61],[-.76,.54],[.02,-.04],[.16,.035],[-.15,-.075],[.35,.16],[-.34,.05]].forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x*w*.55*scale,y*h*.75*scale,i<8?2:1.2,0,Math.PI*2);ctx.fillStyle=i<8?'#e1ecff':`rgba(196,218,255,${Math.min(1,state.aperture/220)})`;ctx.shadowBlur=8;ctx.shadowColor='#b8d5ff';ctx.fill();ctx.shadowBlur=0;});
        }else{
        if(state.target!=='jupiter')this.rings(ctx,r,false);
        ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
        const base=ctx.createLinearGradient(-r,-r,r,r);base.addColorStop(0,'#e1c7aa');base.addColorStop(.4,'#b4a6a6');base.addColorStop(1,'#536085');ctx.fillStyle=base;ctx.fillRect(-r,-r,r*2,r*2);
        for(let i=-7;i<9;i++){ctx.beginPath();ctx.ellipse(-r*.06,i*r*.175-r*.19,r*1.17,r*.3,0,0,Math.PI);ctx.strokeStyle=i%3===0?'#dec7ad66':i%3===1?'#887f9966':'#d2bca344';ctx.lineWidth=r*(i%3===0?.12:.085);ctx.stroke();}
        const shadow=ctx.createRadialGradient(-r*.5,-r*.6,r*.05,r*.06,0,r*1.35);shadow.addColorStop(0,'#fff2d522');shadow.addColorStop(.55,'#333b5e00');shadow.addColorStop(1,'#101d45c7');ctx.fillStyle=shadow;ctx.fillRect(-r,-r,r*2,r*2);
        ctx.restore();if(state.target!=='jupiter')this.rings(ctx,r,true);
        }
      }
      ctx.restore();
      if(guided){ctx=this.ctx;ctx.filter=`blur(${blur}px) brightness(${brightness})`;ctx.drawImage(this.targetLayer,0,0,w,h);}
      }
      ctx.restore();
      const vignette=ctx.createRadialGradient(w/2,h/2,h*.3,w/2,h/2,w*.61);vignette.addColorStop(0,'#050b1e00');vignette.addColorStop(1,'#050b1e66');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
      document.getElementById('magnification').textContent=`${Number(optics.magnification.toFixed(1))}×`;
      const identified=!guided||(aim?.aligned&&aim.focused&&N.store.observationSetup(state).suitable);
      const target=state.mode==='point'?'点光源':!identified?'待观测目标':({saturn:'土星',moon:'月球',jupiter:'木星',pleiades:'昴星团'}[state.target]);
      document.getElementById('preview-target').textContent=target;
      document.getElementById('preview-field').textContent=`${optics.field.toFixed(2)}°`;
      this.canvas.setAttribute('data-aperture',String(state.aperture||130));
      this.canvas.setAttribute('data-brightness',String(brightness));
      this.canvas.setAttribute('data-aim-phase',!guided?'none':!aim.selected?'select':aim.acquired?'observing':'finding');
      this.canvas.setAttribute('data-aim-x',guided?String(aim.x):'0');this.canvas.setAttribute('data-aim-y',guided?String(aim.y):'0');
      this.canvas.setAttribute('aria-label',`${target}目镜成像示意，放大倍率 ${optics.magnification.toFixed(1)} 倍，估算视场 ${optics.field.toFixed(2)} 度，口径 ${state.aperture||130} 毫米；${guided?(aim.acquired?'已对准'+target+'；':'尚未对准'+target+'，点击天空天体自动对准；'):''}天体尺寸、间距与亮度为教学示意`);
      this.drawListeners.forEach(fn=>fn(this.aim));
    }
    rings(ctx,r,front){
      const start=front?0:Math.PI,end=front?Math.PI:Math.PI*2;
      for(let i=0;i<12;i++){
        const a=r*(1.13+i*.067),b=r*(.29+i*.017);ctx.beginPath();ctx.ellipse(0,0,a,b,0,start,end);
        ctx.strokeStyle=i===8?'#101b38':i<3?'#53617fa6':i<8?'#8b90accc':'#5d6b8fd9';ctx.lineWidth=r*(i===8?.045:.062);ctx.stroke();
      }
      ctx.beginPath();ctx.ellipse(0,0,r*1.95,r*.5,0,start,end);ctx.strokeStyle='#a4adcc66';ctx.lineWidth=.7;ctx.stroke();
    }
  };
})(window.Newton);

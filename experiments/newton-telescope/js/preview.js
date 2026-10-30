/* Illustrated eyepiece image. This is a pedagogical preview, not a sky renderer. */
(function (N) {
  'use strict';
  N.Preview = class {
    constructor(canvas) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.state=N.store.get();
      this.observer=new ResizeObserver(()=>this.draw(this.state));this.observer.observe(canvas);
    }
    update(state,force=false){if(state.live||force){this.state={...state};this.draw(this.state);}document.querySelector('.preview-paused').hidden=state.live;}
    draw(state){
      const ctx=this.ctx,w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
      const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=w*dpr;this.canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      // Preserve the default 32x illustration; all scene spacing follows inverse field.
      // Target sizes are schematic, not a catalogue of measured angular diameters.
      const optics=N.optics.calculate(state),scale=(60/32)/optics.field;
      const r=(state.target==='jupiter'?h*.14:state.target==='moon'?h*.38:h*.31)*scale,cx=w*.51+(state.angle-45)*w*.001,cy=h*.52+(state.angle-45)*h*.001;
      [[.16,.35,1],[.81,.61,.8],[.75,.17,.5],[.26,.79,.7],[.93,.29,.5],[.1,.84,.4]].forEach(([x,y,r])=>{ctx.fillStyle='#cddfff99';ctx.beginPath();ctx.arc(cx+(x-.51)*w*scale,cy+(y-.52)*h*scale,r,0,Math.PI*2);ctx.fill();});
      const blur=Math.min(5,Math.abs(optics.focusHeight-3.1)*.45);
      ctx.save();ctx.translate(cx,cy);ctx.rotate(-.37);ctx.filter=`blur(${blur}px)`;
      const halo=ctx.createRadialGradient(0,0,r*.3,0,0,r*1.9);halo.addColorStop(0,'#d3b59318');halo.addColorStop(1,'#d3b59300');ctx.fillStyle=halo;ctx.fillRect(-r*2,-r*2,r*4,r*4);
      if(state.mode==='point'){
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
      const vignette=ctx.createRadialGradient(w/2,h/2,h*.3,w/2,h/2,w*.61);vignette.addColorStop(0,'#050b1e00');vignette.addColorStop(1,'#050b1e66');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
      document.getElementById('magnification').textContent=`${Number(optics.magnification.toFixed(1))}×`;
      const target=state.mode==='point'?'点光源':({saturn:'土星',moon:'月球',jupiter:'木星',pleiades:'昴星团'}[state.target]);
      document.getElementById('preview-target').textContent=target;
      document.getElementById('preview-field').textContent=`${optics.field.toFixed(2)}°`;
      this.canvas.setAttribute('aria-label',`${target}目镜成像示意，放大倍率 ${optics.magnification.toFixed(1)} 倍，估算视场 ${optics.field.toFixed(2)} 度；天体尺寸与间距为示意`);
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

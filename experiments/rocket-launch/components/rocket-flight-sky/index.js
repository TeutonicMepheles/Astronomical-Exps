// Rocket-specific derivative of NewtonObservationStarfield; provenance in SOURCE.md.
export class RocketFlightSky{
 constructor(host,onChange=()=>{}){
  this.canvas=document.createElement('canvas');this.canvas.className='rocket-flight-sky';this.canvas.setAttribute('aria-hidden','true');host.prepend(this.canvas);this.ctx=this.canvas.getContext('2d');this.host=host;this.lastKey='';
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');let seed=4703;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  this.stars=Array.from({length:260},()=>({x:random(),y:random(),b:Math.pow(random(),2.1),r:.45+random()*.9,phase:random()*Math.PI*2,f:1.1+random()*1.3,depth:.25+random()*.75}));
  this.resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),ratio=Math.min(1,1440/w);this.canvas.width=Math.round(w*ratio);this.canvas.height=Math.round(h*ratio);this.lastKey='';onChange();};this.observer=new ResizeObserver(this.resize);this.observer.observe(host);this.resize();this.onMotion=()=>{this.lastKey='';onChange();};this.motion.addEventListener('change',this.onMotion);
 }
 draw({offset=0,time=0,flight=false,speed=0}={}){
  if(this.motion.matches){offset=0;time=0;speed=0;}
  const key=[this.canvas.width,this.canvas.height,offset,time,flight,speed].join(':');if(key===this.lastKey)return;this.lastKey=key;
  const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;ctx.clearRect(0,0,w,h);
  const travel=flight?offset*3.8:offset;
  this.sample={offset:travel,speed,flight,reducedMotion:this.motion.matches};
  // Broad, very faint atmospheric veils scroll downward more slowly than near stars.
  if(flight&&!this.motion.matches&&offset>0){
   ctx.save();const fade=Math.max(0,1-time/9)*.14;
   const horizon=ctx.createLinearGradient(0,h*.5,0,h);horizon.addColorStop(0,'rgba(49,103,146,0)');horizon.addColorStop(1,`rgba(68,128,169,${fade})`);ctx.fillStyle=horizon;ctx.fillRect(0,h*.5,w,h*.5);
   for(let i=0;i<5;i++){const y=((i*.243*h+travel*.16)%(h+240))-120,g=ctx.createRadialGradient(w*(.35+.13*(i%3)),y,0,w*.6,y,w*.65);g.addColorStop(0,`rgba(91,135,168,${.012+fade*.1})`);g.addColorStop(1,'rgba(91,135,168,0)');ctx.save();ctx.translate(0,y);ctx.scale(1,.18);ctx.fillStyle=g;ctx.translate(0,-y);ctx.fillRect(0,y-h*3,w,h*6);ctx.restore();}ctx.restore();
  }
  for(const star of this.stars){const x=star.x*w,y=((star.y*h+travel*star.depth*.85)%(h+28)+h+28)%(h+28)-14;
   const flicker=.9+.1*Math.sin(time*star.f+star.phase),alpha=(.18+star.b*.6)*flicker*(flight&&x<w*.4?.3:1),r=star.r*(.65+star.b*.65);
   ctx.fillStyle=`rgba(201,215,234,${alpha})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
   if(flight&&offset>0&&speed>0&&star.depth>.42){const length=Math.min(60,3+speed*.12*star.depth*star.depth),g=ctx.createLinearGradient(0,y-length,0,y);g.addColorStop(0,'rgba(172,205,237,0)');g.addColorStop(1,`rgba(195,220,243,${alpha*.6})`);ctx.strokeStyle=g;ctx.lineWidth=.45+star.depth*.5;ctx.beginPath();ctx.moveTo(x,y-length);ctx.lineTo(x,y);ctx.stroke();}
  }
 }
 destroy(){this.motion.removeEventListener('change',this.onMotion);this.observer.disconnect();this.canvas.remove();this.stars.length=0;}
}

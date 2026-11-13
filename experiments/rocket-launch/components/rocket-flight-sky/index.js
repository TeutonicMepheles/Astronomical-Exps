// Rocket-specific derivative of NewtonObservationStarfield; provenance in SOURCE.md.
export class RocketFlightSky{
 constructor(host,onChange=()=>{}){
  this.canvas=document.createElement('canvas');this.canvas.className='rocket-flight-sky';this.canvas.setAttribute('aria-hidden','true');host.prepend(this.canvas);this.ctx=this.canvas.getContext('2d');this.host=host;this.lastKey='';
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');let seed=4703;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  this.stars=Array.from({length:260},()=>({x:random(),y:random(),b:Math.pow(random(),2.1),r:.45+random()*.9,phase:random()*Math.PI*2,f:1.1+random()*1.3,depth:.25+random()*.75}));
  this.resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),ratio=Math.min(1,1440/w);this.canvas.width=Math.round(w*ratio);this.canvas.height=Math.round(h*ratio);this.lastKey='';onChange();};this.observer=new ResizeObserver(this.resize);this.observer.observe(host);this.resize();this.onMotion=()=>{this.lastKey='';onChange();};this.motion.addEventListener('change',this.onMotion);
 }
 draw({offset=0,time=0,flight=false}={}){
  if(this.motion.matches){offset=0;time=0;}
  const key=[this.canvas.width,this.canvas.height,offset,time,flight].join(':');if(key===this.lastKey)return;this.lastKey=key;
  const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;ctx.clearRect(0,0,w,h);
  for(const star of this.stars){const x=star.x*w,y=((star.y*h+offset*star.depth*.65)%(h+28)+h+28)%(h+28)-14;
   const flicker=.9+.1*Math.sin(time*star.f+star.phase),alpha=(.18+star.b*.6)*flicker*(flight&&x<w*.4?.3:1),r=star.r*(.65+star.b*.65);
   ctx.fillStyle=`rgba(201,215,234,${alpha})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
   if(flight&&offset>0&&star.depth>.7){ctx.strokeStyle=`rgba(201,215,234,${alpha*.25})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y-2);ctx.lineTo(x,y-Math.min(8,2+star.depth*offset*.004));ctx.stroke();}
  }
 }
 destroy(){this.motion.removeEventListener('change',this.onMotion);this.observer.disconnect();this.canvas.remove();this.stars.length=0;}
}

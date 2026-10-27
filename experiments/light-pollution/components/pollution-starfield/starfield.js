/* Local adaptation of Newton background.js at 574b89d; see SOURCE.md. */
(() => {
'use strict';
const presets=[['#040916','#101d2f',0],['#141e2a','#303e4b',.30],['#263343','#596371',.66],['#384457','#7c818b',1]];
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const mix=(a,b,t)=>a+(b-a)*t;
class PollutionStarfield {
 constructor(canvas,options={}){
  if(!(canvas instanceof HTMLCanvasElement))throw new TypeError('A canvas is required');
  this.canvas=canvas;this.ctx=canvas.getContext('2d');if(!this.ctx)throw new Error('Canvas 2D unavailable');
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.settings={level:0,count:2100,density:1,twinkle:.12,speed:1,topColor:presets[0][0],bottomColor:presets[0][1],starColor:'#dce8f7',paused:this.motion.matches};
  this.time=0;this.angle=0;this.last=0;this.frame=0;this.dead=false;this.p=0;this.colors=[rgb(presets[0][0]),rgb(presets[0][1])];
  let seed=4703;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  this.stars=Array.from({length:6000},()=>({x:(random()-.5)*2400,y:(random()-.5)*2400,b:Math.pow(random(),2.1),r:.45+random()*.9,phase:random()*Math.PI*2,f:1.1+random()*1.3}));
  this.onVisibility=()=>{cancelAnimationFrame(this.frame);this.frame=0;this.last=0;this.start();};
  this.onMotion=()=>this.update({paused:this.motion.matches});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
  document.addEventListener('visibilitychange',this.onVisibility);this.motion.addEventListener('change',this.onMotion);
  this.update(options);this.resize();
 }
 getSettings(){return {...this.settings};}
 setLevel(level){this.update({level});}
 update(patch={}){
  if(this.dead)return;const next={...this.settings};
  if(Number.isInteger(patch.level)&&patch.level>=0&&patch.level<4){next.level=patch.level;next.topColor=presets[patch.level][0];next.bottomColor=presets[patch.level][1];}
  for(const [key,min,max] of [['count',0,6000],['density',.25,1.5],['twinkle',0,1],['speed',0,5]])if(Number.isFinite(patch[key]))next[key]=Math.max(min,Math.min(max,patch[key]));next.count=Math.round(next.count);
  for(const key of ['topColor','bottomColor','starColor'])if(typeof patch[key]==='string'&&/^#[\da-f]{6}$/i.test(patch[key]))next[key]=patch[key];
  if(typeof patch.paused==='boolean')next.paused=patch.paused;
  this.settings=next;this.start();this.canvas.dispatchEvent(new Event('starfieldchange'));
 }
 reset(){this.update({level:0,count:2100,density:1,twinkle:.12,speed:1,starColor:'#dce8f7',paused:this.motion.matches});}
 resize(){if(this.dead)return;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.max(1,Math.round(this.canvas.clientWidth*dpr));this.canvas.height=Math.max(1,Math.round(this.canvas.clientHeight*dpr));this.ctx.setTransform(this.canvas.width/1600,0,0,this.canvas.height/900,0,0);this.draw();}
 start(){if(!this.dead&&!this.frame&&!document.hidden)this.frame=requestAnimationFrame(t=>this.tick(t));}
 tick(now){
  this.frame=0;if(this.dead)return;const dt=this.last?Math.min((now-this.last)/1000,.05):1/60;this.last=now;const s=this.settings;
  if(!s.paused){this.time+=dt;this.angle+=dt*.00065*s.speed;}
  const amount=this.motion.matches?1:1-Math.exp(-dt*6),target=presets[s.level][2];this.p=mix(this.p,target,amount);if(Math.abs(this.p-target)<.0001)this.p=target;
  let moving=this.p!==target;
  [s.topColor,s.bottomColor].forEach((hex,i)=>rgb(hex).forEach((v,j)=>{this.colors[i][j]=mix(this.colors[i][j],v,amount);if(Math.abs(this.colors[i][j]-v)<.05)this.colors[i][j]=v;else moving=true;}));
  this.draw();if(moving||(!s.paused&&(s.speed>0||s.twinkle>0)))this.start();else this.last=0;
 }
 draw(){
  const ctx=this.ctx,s=this.settings,p=this.p,bg=ctx.createLinearGradient(0,0,0,900);
  this.colors.forEach((c,i)=>bg.addColorStop(i,`rgb(${c.map(Math.round).join(',')})`));ctx.fillStyle=bg;ctx.fillRect(0,0,1600,900);
  for(const [x,r,c] of [[340,640,'220,176,121'],[920,760,'163,185,218'],[1340,540,'207,179,177']]){ctx.save();ctx.translate(x,900);ctx.scale(1,.85);const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(${c},${.025+p*.43})`);g.addColorStop(.48,`rgba(${c},${.01+p*.16})`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();}
  const co=Math.cos(this.angle),si=Math.sin(this.angle),starColor=rgb(s.starColor).join(',');
  for(let i=0;i<s.count;i++){
   const star=this.stars[i],x=800+(star.x*co-star.y*si)/Math.sqrt(s.density),y=450+(star.x*si+star.y*co)/Math.sqrt(s.density);if(x<0||x>1600||y<0||y>900)continue;
   const low=Math.pow(y/900,1.65),local=Math.exp(-Math.pow((x-340)/420,2))*.10+Math.exp(-Math.pow((x-920)/480,2))*.13;
   const visibility=Math.max(0,Math.min(1,(star.b-(.018+p*.88+p*low*(.23+local)))/.12));if(!visibility)continue;
   const flicker=1-s.twinkle*.5+s.twinkle*.5*Math.sin(this.time*star.f+star.phase),alpha=visibility*(.28+star.b*.72)*flicker;
   ctx.fillStyle=`rgba(${starColor},${alpha})`;ctx.beginPath();ctx.arc(x,y,star.r*(.65+star.b*.65),0,Math.PI*2);ctx.fill();
   if(star.b>.965){const r=6,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${starColor},${alpha*.23})`);g.addColorStop(1,`rgba(${starColor},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  }
 }
 destroy(){if(this.dead)return;this.dead=true;cancelAnimationFrame(this.frame);this.frame=0;this.observer.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);this.motion.removeEventListener('change',this.onMotion);}
}
window.PollutionStarfield=PollutionStarfield;
})();

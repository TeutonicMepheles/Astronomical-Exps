/* Third-stage background, sharing the telescope's render clock. */
(function(N){
 N.ObservationBackdrop=class{
  constructor(scene){
   this.scene=scene;this.active=false;this.last=0;this.time=0;this.drawCount=0;this.dirty=true;
   this.motion=matchMedia('(prefers-reduced-motion: reduce)');
   this.nebula=new N.ObservationNebula(scene.querySelector('.newton-nebula-flow'),scene.querySelector('.newton-nebula-image'));
   this.stars=new window.NewtonObservationStarfield(scene.querySelector('.newton-dynamic-stars'),{transparent:true,count:3000,density:1,twinkle:.25,speed:.35,paused:this.motion.matches});
   this.stars.useScheduler({add:fn=>{this.starTick=fn;return ()=>{this.starTick=null;};}});
   this.density=50;
   this.onMotion=()=>{this.stars.update({paused:this.motion.matches});this.dirty=true;N.app.observationModel?.render();};this.motion.addEventListener('change',this.onMotion);
  }
  get animating(){return this.active&&!this.motion.matches;}
  setActive(value){this.active=value;window.NightSkyBackground?.setActive(!value);this.last=0;this.dirty=true;this.stars.last=0;}
  setDensity(value){this.density=Math.max(0,Math.min(100,value));this.stars.update({count:Math.round(this.density*60)});this.dirty=true;N.app.observationModel?.render();}
  tick(now){
   if(!this.active||document.hidden)return;
   if(!this.dirty&&!this.animating)return;
   if(this.last&&now-this.last<33&&!this.dirty)return;
   const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
   if(!this.motion.matches)this.time+=dt;
   this.nebula.draw(this.time);this.starTick?.(now);this.dirty=false;this.drawCount++;
  }
  destroy(){this.active=false;this.stars.destroy();this.nebula.destroy();this.motion.removeEventListener('change',this.onMotion);}
 };
})(window.Newton);

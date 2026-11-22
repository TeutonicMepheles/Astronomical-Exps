/* View-only guidance; acceptance rules remain in Newton.store/course. */
(function(N){
 'use strict';
 N.ObservationCriteria=class{
  constructor(card){
   this.ring=document.createElement('div');this.ring.className='observation-size-ring';this.ring.hidden=true;this.ring.setAttribute('aria-hidden','true');
   this.legend=document.createElement('p');this.legend.className='observation-size-legend';this.legend.hidden=true;this.legend.setAttribute('aria-live','polite');
   card.querySelector('.planet-viewport').append(this.ring,this.legend);
  }
  render(active,aim,optical,ready){
   const acquired=active&&aim?.acquired&&aim.target===optical.target;
   this.ring.hidden=this.legend.hidden=!acquired||!N.observationArt?.ready;
   if(!active)return;
   const setup=N.store.observationSetup(optical),power=N.store.metrics(optical).magnification;
   this.ring.hidden=this.ring.hidden||Boolean(setup.apertureOnly);
   const diameter=N.observationArt?.footprint(optical.target,setup.min,1,1)*100;
   if(Number.isFinite(diameter)){const width=diameter.toFixed(3)+'%';if(this.ring.style.width!==width)this.ring.style.width=this.ring.style.height=width;}
   const ringPass=String(acquired&&setup.sizeOK&&setup.apertureOK);if(this.ring.dataset.pass!==ringPass)this.ring.dataset.pass=ringPass;
   const legend=setup.apertureOnly?(ready?'亮度合适，可以记录':!setup.brightnessOK?'增大口径，观察亮度与细节':'等待目标对准'):
    ready?'倍率合适，可以记录':!setup.sizeOK?(power<setup.min?'增大倍率，让目标最外缘达到虚线圈':'目标过大，调小倍率'):'等待目标对准';
   if(this.legend.textContent!==legend)this.legend.textContent=legend;
  }
 };
})(window.Newton);

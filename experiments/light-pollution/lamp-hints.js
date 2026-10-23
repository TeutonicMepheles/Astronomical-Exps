/* Host adapter for the project's shared GestureHint; one visible target, no repeated prose. */
(() => {
  const stage=document.querySelector('.stage'),world=document.querySelector('.world');
  const guide=new ExperimentHints.GestureHint();
  let timer=0,dismissed=false,pressed=false;
  function hide(){clearTimeout(timer);guide.hide();}
  function schedule(){
    hide();if(dismissed||pressed)return;
    timer=setTimeout(()=>{
      if(dismissed||pressed||document.hidden)return;
      const s=stage.getBoundingClientRect();
      const candidates=[...document.querySelectorAll('.lamp-object')].map(el=>({el,r:el.getBoundingClientRect()}))
        .filter(({r})=>r.height>40&&r.left>s.left+36&&r.right<s.right-64&&r.top>s.top&&r.bottom<s.bottom-40)
        .sort((a,b)=>Math.abs(a.r.left+a.r.width/2-(s.left+s.width*.4))-Math.abs(b.r.left+b.r.width/2-(s.left+s.width*.4)));
      if(!candidates.length)return;
      guide.show({target:candidates[0].el,mode:'tap',iconId:'grab'});
      guide.node.classList.add('lamp-tap-guide');
    },900);
  }
  stage.addEventListener('lamp-selected',()=>{dismissed=true;hide();});
  stage.addEventListener('residential-selected',()=>{dismissed=true;hide();});
  stage.addEventListener('billboard-selected',()=>{dismissed=true;hide();});
  stage.addEventListener('public-building-selected',()=>{dismissed=true;hide();});
  stage.addEventListener('pointerdown',()=>{pressed=true;hide();});
  window.addEventListener('pointerup',()=>{pressed=false;schedule();});
  window.addEventListener('pointercancel',()=>{pressed=false;schedule();});
  stage.addEventListener('wheel',schedule,{passive:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){dismissed=true;hide();}});
  document.addEventListener('visibilitychange',()=>document.hidden?hide():schedule());
  const observer=new MutationObserver(schedule);observer.observe(world,{attributes:true,attributeFilter:['style']});
  const resize=new ResizeObserver(schedule);resize.observe(stage);
  window.addEventListener('pagehide',()=>{hide();observer.disconnect();resize.disconnect();guide.destroy();},{once:true});
  schedule();
})();

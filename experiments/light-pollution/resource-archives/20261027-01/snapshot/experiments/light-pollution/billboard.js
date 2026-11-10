/* Brightness is a visual percentage, not a calibrated luminance measurement. */
(() => {
  const stage=document.querySelector('.stage'),world=document.querySelector('.world');
  const image=document.querySelector('.billboard-light'),panel=document.querySelector('.billboard-editor');
  const target=document.querySelector('.billboard-target'),brightness=document.querySelector('#billboard-brightness');
  let opened=false;
  function hitTest(clientX,clientY){
    const r=world.getBoundingClientRect(),x=(clientX-r.left)/r.width*2172,y=(clientY-r.top)/r.height*724;
    // Perspective aperture remains selectable even when emission is fully off.
    if(x<1222||x>1363)return false;
    const t=(x-1222)/141;
    return y>=362+13*t&&y<=447+7*t;
  }
  function close(restoreFocus=false){
    const wasOpen=opened;opened=false;panel.hidden=true;target.setAttribute('aria-expanded','false');
    if(restoreFocus&&wasOpen)target.focus({preventScroll:true});
  }
  function positionPanel(){
    if(!opened)return;
    const s=stage.getBoundingClientRect(),w=world.getBoundingClientRect();
    const x=w.left-s.left+1292.5/2172*w.width,y=w.top-s.top+408/724*w.height;
    if(x<0||x>s.width){close();return;}
    const width=panel.offsetWidth,height=panel.offsetHeight;
    const left=x+26+width<s.width-12?x+26:x-width-26;
    panel.style.left=`${Math.max(12,Math.min(s.width-width-12,left))}px`;
    panel.style.top=`${Math.max(12,Math.min(s.height-height-12,y-height*.35))}px`;
  }
  function select(){
    window.LampScene.close();window.ResidentialScene.close();window.PublicBuildingScene.close();
    opened=true;panel.hidden=false;target.setAttribute('aria-expanded','true');positionPanel();
    stage.dispatchEvent(new Event('billboard-selected'));
  }
  target.addEventListener('click',event=>{if(event.detail===0)select();});
  function updateSky(){window.SkyScene.update('billboard',[{x:1292.5,radius:360,strength:.6*Number(brightness.value)/100,color:[224,201,224]}]);}
  brightness.addEventListener('input',()=>{
    updateSky();
    image.style.opacity=String(Number(brightness.value)/100);
    document.querySelector('#billboard-brightness-value').value=`${brightness.value}%`;
  });
  document.querySelector('.close-billboard').addEventListener('click',()=>close(true));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close(true);});
  for(const name of ['lamp-selected','residential-selected','public-building-selected'])stage.addEventListener(name,()=>close());
  function dismissOutside(event){
    if(opened&&!event.target.closest('.billboard-editor')&&!event.target.closest('.viewport'))close();
  }
  document.addEventListener('pointerdown',dismissOutside);document.addEventListener('click',dismissOutside);
  new ResizeObserver(positionPanel).observe(stage);
  window.BillboardScene={hitTest,select,close,positionPanel};
  close();updateSky();
})();

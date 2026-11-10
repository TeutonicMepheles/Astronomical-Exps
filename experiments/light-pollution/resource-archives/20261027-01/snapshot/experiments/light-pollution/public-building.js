/* PublicBuilding emission is an independent group; temperature follows the existing
   road-lamp demonstration palette. Brightness is a visual percentage, not lux. */
(() => {
  const W=2172,H=724;
  const stage=document.querySelector('.stage'),world=document.querySelector('.world');
  const image=document.querySelector('.public-building-light'),panel=document.querySelector('.public-building-editor');
  const temperature=document.querySelector('#public-building-temperature'),brightness=document.querySelector('#public-building-brightness');
  const state={temperature:3000,brightness:100,anchor:null};
  const targets=[];
  // Whole window apertures include dark mullions and furniture, not only bright pixels.
  const windows=[
    [525,449,83,108],[640,478,180,96],[773,429,83,75],
    [821,523,29,37],[910,472,67,96],[1097,432,58,76],
    [1070,523,70,46],[1182,385,14,61],[1177,531,18,34],
    [1208,464,164,114]
  ];
  windows.forEach(([x,y,width,height],i)=>{
    const button=document.createElement('button');
    button.className='public-building-target';button.type='button';button.dataset.publicBuilding=String(i);
    button.setAttribute('aria-label',`编辑公共建筑窗灯 ${i+1}`);
    button.setAttribute('aria-controls','public-building-editor');button.setAttribute('aria-expanded','false');
    Object.assign(button.style,{left:`${x/W*100}%`,top:`${y/H*100}%`,width:`${width/W*100}%`,height:`${height/H*100}%`});
    document.querySelector('.public-building-targets').append(button);
    // Pointer taps are handled once by the viewport gesture controller.
    // Native keyboard/assistive clicks have no pointer gesture.
    button.addEventListener('click',event=>{
      if(event.detail===0)select({x:x+width/2,y:y+height/2},button);
    });
    targets.push(button);
  });
  let alpha=null;
  function prepareHitMap(){
    if(!image.naturalWidth)return;
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(image,0,0,W,H);
    alpha=context.getImageData(0,0,W,H).data;
  }
  image.addEventListener('load',prepareHitMap);
  if(image.complete&&image.naturalWidth)prepareHitMap();
  function point(clientX,clientY){
    const r=world.getBoundingClientRect();
    return {x:(clientX-r.left)/r.width*W,y:(clientY-r.top)/r.height*H};
  }
  function hitTest(clientX,clientY){
    const p=point(clientX,clientY),x=Math.floor(p.x),y=Math.floor(p.y);
    if(x<0||x>=W||y<0||y>=H)return false;
    if(windows.some(([wx,wy,width,height])=>x>=wx&&x<=wx+width&&y>=wy&&y<=wy+height))return true;
    if(!alpha)return false;
    // Small distant windows need a few screen pixels of touch tolerance.
    const radius=Math.min(12,Math.max(3,Math.ceil(4/world.getBoundingClientRect().width*W)));
    for(let sy=Math.max(0,y-radius);sy<=Math.min(H-1,y+radius);sy++)
      for(let sx=Math.max(0,x-radius);sx<=Math.min(W-1,x+radius);sx++)
        if(alpha[(sy*W+sx)*4+3]>64)return true;
    return false;
  }
  function color(k){const t=(k-2200)/4300;return [255-70*t,179+35*t,100+155*t];}
  function render(){
    window.SkyScene.update('public',windows.map(([x,y,w,h])=>({x:x+w/2,radius:420,strength:Math.min(.28,w*h/35000)*state.brightness/100,color:color(state.temperature)})));
    // Preserve source light/dark detail, but remove baked amber hue so distant
    // yellow windows use the same selected temperature as foreground windows.
    const weights=[.2126,.7152,.0722],reference=255*weights[0]+179*weights[1]+100*weights[2];
    const rows=color(state.temperature).flatMap(channel=>[...weights.map(weight=>weight*channel/reference),0,0]);
    document.querySelector('#public-building-color-matrix').setAttribute('values',[...rows,0,0,0,1,0].join(' '));
    image.style.opacity=String(state.brightness/100);
    document.querySelector('#public-building-temperature-value').value=`${state.temperature} K`;
    document.querySelector('#public-building-brightness-value').value=`${state.brightness}%`;
  }
  let returnTarget=null;
  function close(restoreFocus=false){
    const wasOpen=state.anchor!==null;
    state.anchor=null;panel.hidden=true;
    targets.forEach(button=>button.setAttribute('aria-expanded','false'));
    if(restoreFocus&&wasOpen)returnTarget?.focus({preventScroll:true});
  }
  function positionPanel(){
    if(!state.anchor)return;
    const s=stage.getBoundingClientRect(),w=world.getBoundingClientRect();
    const x=w.left-s.left+state.anchor.x/W*w.width,y=w.top-s.top+state.anchor.y/H*w.height;
    if(x<0||x>s.width){close();return;}
    const width=panel.offsetWidth,height=panel.offsetHeight;
    const left=x+26+width<s.width-12?x+26:x-width-26;
    panel.style.left=`${Math.max(12,Math.min(s.width-width-12,left))}px`;
    panel.style.top=`${Math.max(12,Math.min(s.height-height-12,y-height*.35))}px`;
  }
  function select(anchor,button=null){
    window.LampScene.close();
    window.ResidentialScene.close();
    state.anchor=anchor;returnTarget=button||targets[0];
    panel.hidden=false;
    targets.forEach(target=>target.setAttribute('aria-expanded','true'));
    positionPanel();
    stage.dispatchEvent(new Event('public-building-selected'));
  }
  temperature.addEventListener('input',()=>{state.temperature=Number(temperature.value);render();});
  brightness.addEventListener('input',()=>{state.brightness=Number(brightness.value);render();});
  document.querySelector('.close-public-building').addEventListener('click',()=>close(true));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close(true);});
  stage.addEventListener('lamp-selected',()=>close());
  stage.addEventListener('billboard-selected',()=>close());
  stage.addEventListener('residential-selected',()=>close());
  function dismissOutside(event){
    // Scene taps (including blank space) belong to app.js. A trailing click
    // after pointer capture must never undo the selection made on pointerup.
    if(panel.hidden||event.target.closest('.public-building-editor')||event.target.closest('.viewport'))return;
    close();
  }
  document.addEventListener('pointerdown',dismissOutside);
  document.addEventListener('click',dismissOutside);
  new ResizeObserver(positionPanel).observe(stage);
  window.PublicBuildingScene={hitTest,point,select,close,positionPanel};
  close();
  render();
})();

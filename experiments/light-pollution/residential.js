/* Residential emission is an independent group; temperature follows the existing
   road-lamp demonstration palette. Brightness is a visual percentage, not lux. */
(() => {
  const W=2172,H=724;
  const stage=document.querySelector('.stage'),world=document.querySelector('.world');
  const image=document.querySelector('.residential-light'),panel=document.querySelector('.residential-editor');
  const temperature=document.querySelector('#residential-temperature'),brightness=document.querySelector('#residential-brightness');
  const state={temperature:3000,brightness:100,curtain:0,anchor:null};
  const targets=[];
  // Whole window apertures include dark mullions and furniture, not only bright pixels.
  const windows=[
    [22,265,36,53],[276,289,57,54],
    [79,259,55,57],[165,267,14,54],[79,334,54,55],
    [165,337,14,54],[84,402,70,55],[164,406,15,53],
    [50,475,105,89],[277,352,55,53],[276,414,53,51],
    [270,474,92,96],[205,305,14,27],[204,370,15,26],
    [349,324,14,85],[349,440,15,27],
    [946,421,14,32],[1114,373,11,31]
  ];
  windows.forEach(([x,y,width,height],i)=>{
    const button=document.createElement('button');
    button.className='residential-target'+(i<2?' residential-primary':'');button.type='button';button.dataset.residential=String(i);
    button.setAttribute('aria-label',`编辑住宅窗灯 ${i+1}`);
    button.setAttribute('aria-controls','residential-editor');button.setAttribute('aria-expanded','false');
    Object.assign(button.style,{left:`${x/W*100}%`,top:`${y/H*100}%`,width:`${width/W*100}%`,height:`${height/H*100}%`});
    document.querySelector('.residential-targets').append(button);
    // Pointer taps are handled once by the viewport gesture controller.
    // Native keyboard/assistive clicks have no pointer gesture.
    button.addEventListener('click',event=>{
      if(event.detail===0)select({x:x+width/2,y:y+height/2},button);
    });
    targets.push(button);
  });
  const svgNS='http://www.w3.org/2000/svg';
  // The exporter embeds local asset literals in scripts for standalone delivery.
  document.querySelector('#curtain-foreground image').setAttribute('href','assets/city-layer-all-lamps.png');
  const curtainMask=document.createElementNS(svgNS,'mask');
  curtainMask.id='residential-curtain-mask';
  curtainMask.setAttribute('maskContentUnits','objectBoundingBox');
  curtainMask.innerHTML='<rect width="1" height="1" fill="white"/>';
  document.querySelector('.residential-filter-defs defs').append(curtainMask);
  image.style.mask='url(#residential-curtain-mask)';
  const cloth=document.querySelector('.curtain-cloth');
  // Only the first sixteen apertures belong to the two near apartment buildings.
  // Distant residential emission remains independent of these curtains.
  const curtains=windows.slice(0,16).map(()=>{
    const fabric=document.createElementNS(svgNS,'polygon');
    const shade=document.createElementNS(svgNS,'polygon');shade.setAttribute('fill','black');
    cloth.append(fabric);curtainMask.append(shade);return {fabric,shade};
  });
  function renderCurtains(){
    updateSky();
    curtains.forEach(({fabric,shade},i)=>{
      const [x,y,w,h]=windows[i],left=x+w*(1-state.curtain/100);
      const points=[[left,y],[x+w,y],[x+w,y+h],[left,y+h]];
      fabric.setAttribute('points',points.map(p=>p.join(',')).join(' '));
      shade.setAttribute('points',points.map(([px,py])=>`${px/W},${py/H}`).join(' '));
    });
    document.querySelectorAll('[data-curtain]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.curtain)===state.curtain)));
  }
  document.querySelectorAll('[data-curtain]').forEach(button=>button.addEventListener('click',()=>{
    state.curtain=Number(button.dataset.curtain);renderCurtains();positionPanel();
  }));
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
  function updateSky(){
    const colorValue=color(state.temperature),gain=state.brightness/100;
    const near=[100,310].map(x=>({x,radius:420,strength:.52*gain*(1-state.curtain/100),color:colorValue}));
    const distant=[450,600,750,950,1120,1400,1580,1780,2010].map(x=>({x,radius:320,strength:.09*gain,color:colorValue}));
    window.SkyScene.update('residential',[...near,...distant]);
  }
  function render(){
    updateSky();
    // Preserve source light/dark detail, but remove baked amber hue so distant
    // yellow windows use the same selected temperature as foreground windows.
    const weights=[.2126,.7152,.0722],reference=255*weights[0]+179*weights[1]+100*weights[2];
    const rows=color(state.temperature).flatMap(channel=>[...weights.map(weight=>weight*channel/reference),0,0]);
    document.querySelector('#residential-color-matrix').setAttribute('values',[...rows,0,0,0,1,0].join(' '));
    image.style.opacity=String(state.brightness/100);
    document.querySelector('#residential-temperature-value').value=`${state.temperature} K`;
    document.querySelector('#residential-brightness-value').value=`${state.brightness}%`;
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
    state.anchor=anchor;returnTarget=button||targets[anchor.x<190?0:1];
    panel.hidden=false;
    targets.forEach(target=>target.setAttribute('aria-expanded','true'));
    positionPanel();
    stage.dispatchEvent(new Event('residential-selected'));
  }
  temperature.addEventListener('input',()=>{state.temperature=Number(temperature.value);render();});
  brightness.addEventListener('input',()=>{state.brightness=Number(brightness.value);render();});
  document.querySelector('.close-residential').addEventListener('click',()=>close(true));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close(true);});
  stage.addEventListener('lamp-selected',()=>close());
  stage.addEventListener('billboard-selected',()=>close());
  stage.addEventListener('public-building-selected',()=>close());
  function dismissOutside(event){
    // Scene taps (including blank space) belong to app.js. A trailing click
    // after pointer capture must never undo the selection made on pointerup.
    if(panel.hidden||event.target.closest('.residential-editor')||event.target.closest('.viewport'))return;
    close();
  }
  document.addEventListener('pointerdown',dismissOutside);
  document.addEventListener('click',dismissOutside);
  new ResizeObserver(positionPanel).observe(stage);
  window.ResidentialScene={hitTest,point,select,close,positionPanel};
  close();
  renderCurtains();
  render();
})();

/* Presentation navigation follows the owning experiment's app.js interaction model. */
window.createStreetNavigation=function(editing){
 const stage=document.querySelector('.stage'),viewport=document.querySelector('.viewer'),canvas=document.querySelector('#scene'),sky=document.querySelector('#sky-viewport'),range=document.querySelector('#street-position'),left=document.querySelector('#street-left'),right=document.querySelector('#street-right'),label=document.querySelector('#street-location');
 let fraction=0,drag=null,lastSync='';
 const limit=()=>Math.max(0,stage.clientHeight*3-stage.clientWidth);
 function finish(){if(!drag)return;const id=drag.id;drag=null;viewport.classList.remove('street-dragging');if(viewport.hasPointerCapture(id))viewport.releasePointerCapture(id);}
 function sync(){
  const edit=editing(),extent=limit(),key=`${edit}:${fraction}:${extent}`;
  if(key===lastSync)return;lastSync=key;
  if(edit){finish();canvas.style.transform='';return;}
  const x=fraction*extent;canvas.style.transform=`translate3d(${-x}px,0,0)`;sky.style.transform=`translate3d(${-x}px,0,0)`;
  canvas.dispatchEvent(new Event('streetnavigationchange'));
  range.value=Math.round(fraction*1000);range.style.setProperty('--fill',`${fraction*100}%`);left.disabled=fraction<=0;right.disabled=fraction>=1;viewport.dataset.streetPosition=String(fraction);
  label.textContent=fraction<.33?'住宅 · 公共建筑':fraction<.72?'公共建筑 · 广告牌':'广告牌 · 滨河水面';
 }
 function move(x){fraction=limit()?Math.max(0,Math.min(1,x/limit())):0;sync();}
 viewport.addEventListener('pointerdown',e=>{if(editing()||e.button!==0||!e.isPrimary||drag)return;drag={id:e.pointerId,x:e.clientX,position:fraction*limit()};viewport.setPointerCapture(e.pointerId);viewport.classList.add('street-dragging');viewport.focus({preventScroll:true});e.preventDefault();},true);
 viewport.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;move(drag.position+drag.x-e.clientX);},true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,e=>{if(drag?.id===e.pointerId)finish();},true);
 LightPollution.on(window,'blur',finish);
 viewport.addEventListener('wheel',e=>{if(editing()||e.ctrlKey)return;e.preventDefault();const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;move(fraction*limit()+delta*(e.deltaMode===1?16:e.deltaMode===2?stage.clientWidth:1));},{passive:false});
 viewport.addEventListener('keydown',e=>{if(editing())return;const x=fraction*limit(),actions={ArrowLeft:x-stage.clientWidth*.22,ArrowRight:x+stage.clientWidth*.22,Home:0,End:limit()};if(Object.hasOwn(actions,e.key)){e.preventDefault();move(actions[e.key]);}});
 left.onclick=()=>move(fraction*limit()-stage.clientWidth*.55);right.onclick=()=>move(fraction*limit()+stage.clientWidth*.55);range.oninput=()=>move(Number(range.value)/1000*limit());
 const observer=new ResizeObserver(()=>{finish();sync();});observer.observe(stage);LightPollution.disposers.push(()=>observer.disconnect());sync();return {sync};
};

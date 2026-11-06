/* Original 72-frame viewer behaviour retained; optical layer is additive. */
(function(){
'use strict';
window.Newton.mountRotationViewer=function(root,onReady){
const $=s=>root.querySelector(s),scope=$('#r360-scope'),range=$('#r360-scrub');
const photo=$('#r360-photo');
let matte,displayed=-1;
function useOriginal(){matte=null;photo.classList.add('matte-fallback');}
try{matte=window.Newton.createRotationMatte($('#r360-matte'));}catch{useOriginal();}
const count=72,cache=[],tasks=[],loaded=new Set;
let index=0,wanted=0,playing=false,down=false,lastX=0,remainder=0,failed=[],lastTime=0,budget=0;
let disposed=false,raf=0;
let optics={setFrame(){},paint(){},toggle(){},dispose(){}};
try{optics=window.Newton.rotationOptics.create(root)}catch(error){$('#r360-light').disabled=true;$('#r360-light').title='光路不可用';$('#r360-message').textContent='光路不可用';console.warn(error)}
const frames=[
 "assets/rotation-360/frame-001.webp",
 "assets/rotation-360/frame-002.webp",
 "assets/rotation-360/frame-003.webp",
 "assets/rotation-360/frame-004.webp",
 "assets/rotation-360/frame-005.webp",
 "assets/rotation-360/frame-006.webp",
 "assets/rotation-360/frame-007.webp",
 "assets/rotation-360/frame-008.webp",
 "assets/rotation-360/frame-009.webp",
 "assets/rotation-360/frame-010.webp",
 "assets/rotation-360/frame-011.webp",
 "assets/rotation-360/frame-012.webp",
 "assets/rotation-360/frame-013.webp",
 "assets/rotation-360/frame-014.webp",
 "assets/rotation-360/frame-015.webp",
 "assets/rotation-360/frame-016.webp",
 "assets/rotation-360/frame-017.webp",
 "assets/rotation-360/frame-018.webp",
 "assets/rotation-360/frame-019.webp",
 "assets/rotation-360/frame-020.webp",
 "assets/rotation-360/frame-021.webp",
 "assets/rotation-360/frame-022.webp",
 "assets/rotation-360/frame-023.webp",
 "assets/rotation-360/frame-024.webp",
 "assets/rotation-360/frame-025.webp",
 "assets/rotation-360/frame-026.webp",
 "assets/rotation-360/frame-027.webp",
 "assets/rotation-360/frame-028.webp",
 "assets/rotation-360/frame-029.webp",
 "assets/rotation-360/frame-030.webp",
 "assets/rotation-360/frame-031.webp",
 "assets/rotation-360/frame-032.webp",
 "assets/rotation-360/frame-033.webp",
 "assets/rotation-360/frame-034.webp",
 "assets/rotation-360/frame-035.webp",
 "assets/rotation-360/frame-036.webp",
 "assets/rotation-360/frame-037.webp",
 "assets/rotation-360/frame-038.webp",
 "assets/rotation-360/frame-039.webp",
 "assets/rotation-360/frame-040.webp",
 "assets/rotation-360/frame-041.webp",
 "assets/rotation-360/frame-042.webp",
 "assets/rotation-360/frame-043.webp",
 "assets/rotation-360/frame-044.webp",
 "assets/rotation-360/frame-045.webp",
 "assets/rotation-360/frame-046.webp",
 "assets/rotation-360/frame-047.webp",
 "assets/rotation-360/frame-048.webp",
 "assets/rotation-360/frame-049.webp",
 "assets/rotation-360/frame-050.webp",
 "assets/rotation-360/frame-051.webp",
 "assets/rotation-360/frame-052.webp",
 "assets/rotation-360/frame-053.webp",
 "assets/rotation-360/frame-054.webp",
 "assets/rotation-360/frame-055.webp",
 "assets/rotation-360/frame-056.webp",
 "assets/rotation-360/frame-057.webp",
 "assets/rotation-360/frame-058.webp",
 "assets/rotation-360/frame-059.webp",
 "assets/rotation-360/frame-060.webp",
 "assets/rotation-360/frame-061.webp",
 "assets/rotation-360/frame-062.webp",
 "assets/rotation-360/frame-063.webp",
 "assets/rotation-360/frame-064.webp",
 "assets/rotation-360/frame-065.webp",
 "assets/rotation-360/frame-066.webp",
 "assets/rotation-360/frame-067.webp",
 "assets/rotation-360/frame-068.webp",
 "assets/rotation-360/frame-069.webp",
 "assets/rotation-360/frame-070.webp",
 "assets/rotation-360/frame-071.webp",
 "assets/rotation-360/frame-072.webp"
];
function status(){$('#r360-status').textContent=`第 ${index+1} / 72 帧 · 已加载 ${loaded.size}/72${failed.length?' · 加载失败 '+failed.join(','):''} · 时间采样，非等角度`;}
function show(n){wanted=Math.max(0,Math.min(71,Math.round(n)));if(loaded.has(wanted)&&wanted!==displayed){
 index=displayed=wanted;const image=cache[index];scope.src=image.src;
 if(matte)try{matte(image);photo.classList.add('matte-ready');}catch{useOriginal();}
 range.value=index;range.style.setProperty('--fill',`${index/71*100}%`);$('#r360-frame-number').textContent=`${String(index+1).padStart(2,'0')} / 72`;optics.setFrame(index);
 if(index===0)onReady?.();
}status()}
function setPlaying(value){playing=value;const button=$('#r360-play');button.dataset.playing=value;button.title=value?'暂停':'自动播放';button.setAttribute('aria-label',button.title);}
function pause(){setPlaying(false);}
function load(i){if(tasks[i])return tasks[i];tasks[i]=new Promise(resolve=>{const im=new Image;cache[i]=im;im.onload=async()=>{if(disposed){resolve();return;}try{await im.decode()}catch{}if(disposed){resolve();return;}loaded.add(i);if(i===wanted)show(i);else status();resolve()};im.onerror=()=>{if(disposed){resolve();return;}failed.push(i+1);$('#r360-message').textContent='部分图片加载失败，请检查解压是否完整并重新启动。';if(i===0)onReady?.();status();resolve()};im.src=frames[i];});return tasks[i]}
async function preload(){await load(0);let next=1;await Promise.all(Array.from({length:4},async()=>{while(!disposed&&next<count){const i=next++;await load(i)}}))}preload();
scope.onpointerdown=e=>{if(e.button!==0)return;pause();down=true;lastX=e.clientX;remainder=0;scope.setPointerCapture(e.pointerId)};
scope.onpointermove=e=>{if(!down)return;const dir=$('#r360-reverse').checked?-1:1;remainder+=(e.clientX-lastX)*dir*(+$('#r360-sensitivity').value)/50;lastX=e.clientX;const steps=Math.trunc(remainder);if(steps){show(wanted+steps);remainder-=steps}};
scope.onpointerup=scope.onpointercancel=scope.onlostpointercapture=()=>{down=false;remainder=0};scope.ondragstart=()=>false;
range.oninput=()=>{pause();show(+range.value)};
$('#r360-reset').onclick=()=>{pause();show(0)};
$('#r360-play').onclick=()=>{if(!loaded.size)return;if(playing)pause();else{if(index===71)show(0);setPlaying(true);lastTime=0;budget=0;}};
root.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.key.toLowerCase()==='l')optics.toggle();if(e.key.toLowerCase()==='r'){$('#r360-reset').click();}});
function tick(t){if(disposed)return;if(playing){if(!lastTime)lastTime=t;budget+=(t-lastTime)/1000*(+$('#r360-speed').value);if(budget>=1){const step=Math.floor(budget);budget-=step;if(index>=71)pause();else show(index+step)}}lastTime=t;optics.paint(t);raf=requestAnimationFrame(tick)}raf=requestAnimationFrame(tick);
return ()=>{disposed=true;pause();cancelAnimationFrame(raf);optics.dispose();for(const image of cache){image.removeAttribute("src");}cache.length=0;};
};
})();

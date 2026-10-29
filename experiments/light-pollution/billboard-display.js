/* Local artwork and original effect implementation; no runtime dependencies.
 * Replace slides below with local assets. Coordinates use the 2172 × 724 scene. */
(() => {
  const config={slides:['assets/billboard-demo/orbit.svg','assets/billboard-demo/city.svg','assets/billboard-demo/future.svg'],
    corners:window.BillboardSurface.getCorners(),hold:6000,duration:800};
  const original=document.querySelector('.billboard-light'),world=document.querySelector('.world');
  const brightness=document.querySelector('#billboard-brightness');
  const next=document.querySelector('#billboard-next'),pause=document.querySelector('#billboard-pause');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const overlay=document.createElement('div');overlay.className='billboard-display';overlay.setAttribute('aria-hidden','true');
  const plane=document.createElement('div'),canvas=document.createElement('canvas');
  canvas.width=640;canvas.height=384;plane.append(canvas);overlay.append(plane);original.after(overlay);
  const ctx=canvas.getContext('2d');
  // Extract only bright artwork pixels, then spread them in two independent glow layers.
  const blooms=['near','far'].map(kind=>{const layer=document.createElement('canvas');layer.width=160;layer.height=96;
    layer.className=`billboard-bloom billboard-bloom-${kind}`;plane.append(layer);return layer;});
  const bloomContext=blooms[0].getContext('2d',{willReadFrequently:true});
  function paintBloom(){bloomContext.clearRect(0,0,160,96);bloomContext.drawImage(canvas,0,0,160,96);
    const pixels=bloomContext.getImageData(0,0,160,96),data=pixels.data;
    for(let i=0;i<data.length;i+=4){const luminance=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255;
      data[i+3]=Math.round(255*Math.max(0,(luminance-.3)/.7));}
    bloomContext.putImageData(pixels,0,0);const far=blooms[1].getContext('2d');far.clearRect(0,0,160,96);far.drawImage(blooms[0],0,0);
  }
  // Solve the eight homography coefficients; CSS performs perspective-correct compositing.
  function project(){
  const src=[[0,0],[640,0],[640,384],[0,384]],m=[];
  src.forEach(([u,v],i)=>{const [x,y]=config.corners[i];m.push([u,v,1,0,0,0,-x*u,-x*v,x],[0,0,0,u,v,1,-y*u,-y*v,y]);});
  for(let c=0;c<8;c++){let pivot=c;for(let r=c+1;r<8;r++)if(Math.abs(m[r][c])>Math.abs(m[pivot][c]))pivot=r;
    [m[c],m[pivot]]=[m[pivot],m[c]];const d=m[c][c];for(let k=c;k<9;k++)m[c][k]/=d;
    for(let r=0;r<8;r++)if(r!==c){const f=m[r][c];for(let k=c;k<9;k++)m[r][k]-=f*m[c][k];}}
  const [a,b,c,d,e,f,g,h]=m.map(row=>row[8]);
  // Homogeneous scaling retains precision in browser matrix serialization.
  canvas.style.transform=`matrix3d(${[a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1].map(v=>v*1000).join(',')})`;
  blooms.forEach(layer=>{layer.style.transform=canvas.style.transform;});
  }
  project();
  const resize=()=>{plane.style.transform=`scale(${world.clientWidth/2172})`;};
  new ResizeObserver(resize).observe(world);resize();
  const zoomButton=document.createElement('button');zoomButton.type='button';zoomButton.textContent='放大预览';zoomButton.id='billboard-zoom';next.parentElement.append(zoomButton);
  const zoom=document.createElement('dialog');zoom.className='billboard-zoom';zoom.setAttribute('aria-label','广告屏放大预览');
  zoom.innerHTML='<div class="billboard-zoom-heading"><strong>广告屏 · 局部放大</strong><button type="button" class="billboard-zoom-close">关闭</button></div><div class="billboard-zoom-view"><div class="billboard-display"><div></div></div></div><div class="billboard-zoom-controls"><button type="button" class="billboard-zoom-next">下一张</button><label>亮度 <input type="range" min="0" max="100" value="100" aria-label="放大预览亮度"><output>100%</output></label></div><p>与场景实时同步 · 暂停轮播时刷新带仍持续流动</p>';
  document.body.append(zoom);
  for(const type of ['pointerdown','click'])zoom.addEventListener(type,event=>event.stopPropagation());
  const zoomView=zoom.querySelector('.billboard-zoom-view'),zoomPlane=zoom.querySelector('.billboard-display>div');
  const mirrors=[canvas,...blooms].map(source=>{const copy=source.cloneNode();zoomPlane.append(copy);return copy;});
  function paintZoom(){if(!zoom.open)return;[canvas,...blooms].forEach((source,i)=>{const context=mirrors[i].getContext('2d');context.clearRect(0,0,mirrors[i].width,mirrors[i].height);context.drawImage(source,0,0);mirrors[i].style.opacity=source.style.opacity;mirrors[i].style.transform=source.style.transform;});
    zoom.querySelector('.billboard-display').style.opacity=overlay.style.opacity;}
  function fitZoom(){const bounds=window.BillboardSurface.bounds(),width=bounds.w+36,height=bounds.h+38;
    const scale=Math.min(zoomView.clientWidth/width,zoomView.clientHeight/height);zoomPlane.style.transform=`translate(${(zoomView.clientWidth-scale*width)/2}px,${(zoomView.clientHeight-scale*height)/2}px) scale(${scale}) translate(${-bounds.x+18}px,${-bounds.y+19}px)`;}
  new ResizeObserver(fitZoom).observe(zoomView);
  window.BillboardSurface.subscribe(corners=>{config.corners=corners;project();fitZoom();paintZoom();});
  zoomButton.addEventListener('click',()=>{zoom.showModal();paintZoom();});
  zoom.querySelector('.billboard-zoom-close').addEventListener('click',()=>zoom.close());
  zoom.addEventListener('close',()=>zoomButton.focus());
  zoom.querySelector('.billboard-zoom-next').addEventListener('click',()=>next.click());
  const zoomBrightness=zoom.querySelector('input');zoomBrightness.addEventListener('input',()=>{brightness.value=zoomBrightness.value;brightness.dispatchEvent(new Event('input',{bubbles:true}));});
  let images=[],index=0,started=null,frame=0,timer=0,paused=false,ready=false;
  function drawImage(img,alpha=1){ctx.globalAlpha=alpha;const scale=Math.max(640/img.naturalWidth,384/img.naturalHeight);
    const w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,(640-w)/2,(384-h)/2,w,h);ctx.globalAlpha=1;}
  function paint(progress=0,now=performance.now()){ctx.clearRect(0,0,640,384);drawImage(images[index]);
    if(started!==null)drawImage(images[(index+1)%images.length],progress);
    // A short, bounded signal disturbance, never an ongoing flicker.
    if(!motion.matches&&progress>.08&&progress<.42){const shift=Math.sin(progress*190)*11;
      ctx.drawImage(canvas,0,104,640,15,shift,104,640,15);ctx.drawImage(canvas,0,242,640,10,-shift,242,640,10);
      ctx.fillStyle='rgba(100,230,255,.19)';ctx.fillRect(0,104,640,2);}
    ctx.fillStyle='rgba(0,0,0,.055)';for(let y=0;y<384;y+=12)ctx.fillRect(0,y,640,1);
    // A broad, soft refresh band moves from top to bottom every 2.8 seconds.
    const scan=motion.matches?180:((now%2800)/2800)*480-48;
    const band=ctx.createLinearGradient(0,scan-32,0,scan+32);band.addColorStop(0,'rgba(160,225,255,0)');band.addColorStop(.65,'rgba(160,225,255,.13)');band.addColorStop(1,'rgba(160,225,255,0)');
    ctx.fillStyle=band;ctx.fillRect(0,scan-32,640,64);overlay.dataset.scan=String(scan);
    paintBloom();paintZoom();
    overlay.dataset.slide=String(index);overlay.dataset.transition=String(started!==null);
  }
  function schedule(){clearTimeout(timer);if(ready&&!paused&&!motion.matches&&!document.hidden&&Number(brightness.value)>0)timer=setTimeout(advance,config.hold);}
  function tick(now){frame=0;if(!ready||document.hidden||Number(brightness.value)===0||motion.matches)return;
    const t=started===null?0:Math.min(1,(now-started)/config.duration);paint(t*t*(3-2*t),now);
    if(started!==null&&t===1){started=null;index=(index+1)%images.length;paint(0,now);schedule();}
    frame=requestAnimationFrame(tick);}
  function animate(){if(!frame&&ready&&!motion.matches&&!document.hidden&&Number(brightness.value)>0)frame=requestAnimationFrame(tick);}
  function advance(){if(!ready||started!==null)return;clearTimeout(timer);
    if(motion.matches){index=(index+1)%images.length;paint();schedule();return;}
    started=performance.now();animate();}
  function settle(){if(started!==null){started=null;index=(index+1)%images.length;if(ready)paint();}}
  function sync(){const gain=Number(brightness.value)/100;overlay.style.opacity=String(gain);blooms.forEach(layer=>{layer.style.opacity=String(Math.pow(gain,1.3));});
    zoomBrightness.value=brightness.value;zoom.querySelector('output').value=`${brightness.value}%`;
    if(document.hidden||gain===0||motion.matches){cancelAnimationFrame(frame);frame=0;settle();if(ready)paint();}else animate();paintZoom();schedule();}
  next.disabled=true;pause.disabled=true;
  next.addEventListener('click',advance);pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'继续轮播':'暂停轮播';pause.setAttribute('aria-pressed',String(paused));if(paused)settle();schedule();});
  brightness.addEventListener('input',sync);document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
  Promise.all(config.slides.map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;}))).then(loaded=>{
    images=loaded;ready=true;original.style.visibility='hidden';paint();sync();next.disabled=false;pause.disabled=false;
  }).catch(()=>{overlay.remove();next.textContent='图片加载失败';});
})();

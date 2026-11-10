/* Independent visual prototype. All light coefficients are artistic, not photometric. */
(() => {
 'use strict';
 const W=2172,H=724,canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d');
 const names=['前景水体','背景水体','远山','远景楼群','近景建筑','住宅室内与灯光','公共建筑室内与灯光','广告屏','窗框候选（对照）','树木与灌木','岸边设施','水面倒影'];
 const files=['01-foreground-water','02-background-water','03-mountains','04-distant-city','05-near-buildings','06-residential-interiors','07-public-interiors','08-billboard','09-window-frames','10-vegetation','11-shore-structures','12-water-reflections'];
 const bounds=[[0,591,2172,133],[1418,417,754,98],[89,237,2083,183],[202,282,1956,189],[0,165,1481,396],[20,184,2124,263],[542,320,888,109],[1149,244,269,175],[17,219,2134,329],[0,264,2172,243],[0,409,2172,117],[115,528,1720,93]];
 const visible=files.map((_,i)=>i!==8),images=[];
 const defaults=()=>({residential:{brightness:80,temperature:3000,cover:0},public:{brightness:75,temperature:3000,portion:100},billboard:{brightness:65,on:true},lamps:{brightness:65,temperature:3000,shade:'half'}});
 let state=defaults(),selected='residential',paused=matchMedia('(prefers-reduced-motion: reduce)').matches,time=0,last=0,dirty=true,ready=false;
 const make=(w=W,h=H)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const architecture=make(),windows=make(),curtains=make(),mask=make(),mountain=make();
 let apertures=[],maskImage;
 const color=k=>{const t=(k-2200)/4300;return [255-70*t,177+38*t,95+150*t].map(Math.round);};
 const rgb=k=>color(k).join(',');
 const gain=key=>{const s=state[key];return s.brightness/100*(key==='residential'?1-s.cover/100:key==='public'?s.portion/100:key==='billboard'?(s.on?1:0):1);};
 function sprite(c,i,x,y,w,h){if(visible[i])c.drawImage(images[i],...bounds[i],x,y,w,h);}
 function glow(c,x,y,rx,ry,tint,alpha){if(alpha<=0)return;c.save();c.translate(x,y);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${tint},${alpha})`);g.addColorStop(1,`rgba(${tint},0)`);c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();}
 function findApertures(){
  const m=mask.getContext('2d');m.drawImage(maskImage,0,0);const d=m.getImageData(0,0,W,H).data,seen=new Uint8Array(W*H),queue=new Int32Array(W*H);
  for(let p=0;p<W*H;p++){if(seen[p]||d[p*4+3]<128)continue;let head=0,tail=1;queue[0]=p;seen[p]=1;let x0=W,y0=H,x1=0,y1=0,count=0;
   while(head<tail){const n=queue[head++],x=n%W,y=Math.floor(n/W);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;
    for(const q of [n-W,n+W,x>0?n-1:-1,x<W-1?n+1:-1])if(q>=0&&q<W*H&&!seen[q]&&d[q*4+3]>=128){seen[q]=1;queue[tail++]=q;}}
   if(count>25)apertures.push({x:x0,y:y0,w:x1-x0+1,h:y1-y0+1});
  }
 }
 function buildArchitecture(){
  const c=architecture.getContext('2d');c.clearRect(0,0,W,H);
  c.fillStyle='#17283f';c.fillRect(0,552,W,66);
  if(visible[4]){c.save();c.filter='brightness(.64) saturate(.82)';c.drawImage(images[4],0,10);c.restore();}
  const wc=windows.getContext('2d');wc.clearRect(0,0,W,H);
  for(const a of apertures){
   if(a.x>1250&&a.y<450&&a.w>100)continue;
   const key=a.x<410?'residential':'public',s=state[key],enabled=visible[key==='residential'?5:6];
   const on=key==='public'?((Math.floor(a.x/27)+Math.floor(a.y/19))%4)<s.portion/25:true;
   wc.fillStyle='#152038';wc.fillRect(a.x,a.y,a.w,a.h);
   if(enabled&&on){wc.fillStyle=`rgba(${rgb(s.temperature)},${s.brightness/100})`;wc.fillRect(a.x,a.y,a.w,a.h);wc.save();wc.beginPath();wc.rect(a.x,a.y,a.w,a.h);wc.clip();wc.globalAlpha=s.brightness/100*.38;wc.drawImage(images[key==='residential'?5:6],0,0);wc.restore();}
  }
  // Original generated interior textures are secondary, clipped to actual shell openings.
  wc.globalCompositeOperation='destination-in';wc.drawImage(maskImage,0,0);wc.globalCompositeOperation='source-over';
  if(visible[4])c.drawImage(windows,0,10);
  const cc=curtains.getContext('2d');cc.clearRect(0,0,W,H);
  for(const a of apertures.filter(a=>a.x<410)){
   const width=a.w*state.residential.cover/100,left=a.x+a.w-width;
   cc.fillStyle='#30374b';cc.fillRect(left,a.y,width,a.h);
   for(let x=left;x<a.x+a.w;x+=5){const grad=cc.createLinearGradient(x,0,x+5,0);grad.addColorStop(0,'#202b40');grad.addColorStop(.5,'#44506a');grad.addColorStop(1,'#273249');cc.fillStyle=grad;cc.fillRect(x,a.y,Math.min(5,a.x+a.w-x),a.h);}
  }
  cc.globalCompositeOperation='destination-in';cc.drawImage(maskImage,0,0);cc.globalCompositeOperation='source-over';
  if(visible[4]&&visible[5])c.drawImage(curtains,0,10);
  // Billboard uses the actual opening of the extracted shell, not the drifting generated coordinates.
  c.save();c.beginPath();c.moveTo(1305,347);c.lineTo(1469,362);c.lineTo(1469,458);c.lineTo(1305,448);c.closePath();c.clip();c.fillStyle='#162038';c.fillRect(1290,330,190,140);
  if(visible[7]){c.globalAlpha=gain('billboard');c.drawImage(images[7],...bounds[7],1305,347,164,111);}c.restore();
  // The extra generated frame candidate is optional because its registration is imperfect.
  if(visible[8]){c.globalAlpha=.7;c.drawImage(images[8],0,10);c.globalAlpha=1;}
  if(visible[9])sprite(c,9,0,417,W,175);
  sprite(c,10,0,570,W,60);
  const lamps=state.lamps;
  for(const x of [180,420,700,990,1250,1550,1830,2050]){
   c.strokeStyle='#1a2a44';c.lineWidth=5;c.beginPath();c.moveTo(x,605);c.lineTo(x,535);c.stroke();
   glow(c,x,535,lamps.shade==='open'?48:28,38,rgb(lamps.temperature),gain('lamps')*.35);
   c.fillStyle=`rgb(${color(lamps.temperature).map((v,i)=>Math.round([30,39,57][i]*(1-gain('lamps'))+v*gain('lamps'))).join(',')})`;c.beginPath();c.ellipse(x,535,10,6,0,0,Math.PI*2);c.fill();
   c.fillStyle='#263953';c.beginPath();c.ellipse(x,531,lamps.shade==='full'?15:12,5,0,Math.PI,Math.PI*2);c.fill();
  }
  dirty=false;
 }
 let seed=917;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const stars=Array.from({length:300},()=>({x:random()*1600,y:20+random()*360,r:.4+random()*.9,a:.2+random()*.7}));
 function water(c,i,x,y,w,h,t){if(!visible[i])return;const b=bounds[i];for(let row=0;row<h;row+=4){const offset=Math.sin(row*.08+t*.7)*2.6+Math.sin(row*.033-t*.5)*1.7;c.drawImage(images[i],b[0],b[1]+row/h*b[3],b[2],Math.min(4,h-row)/h*b[3],x+offset-5,y+row,w+10,Math.min(4,h-row));}}
 function draw(now){
  if(!ready)return;if(!paused)time+=Math.min(50,last?now-last:0)/1000;last=now;
  if(dirty)buildArchitecture();
  const total=(gain('residential')+gain('public')+gain('billboard')+gain('lamps')*({open:1,half:.5,full:.1})[state.lamps.shade])/4;
  const sky=ctx.createLinearGradient(0,0,0,900);sky.addColorStop(0,'#070e20');sky.addColorStop(.52,'#192740');sky.addColorStop(1,'#0b1831');ctx.fillStyle=sky;ctx.fillRect(0,0,1600,900);
  for(const star of stars){ctx.fillStyle=`rgba(229,237,255,${star.a*(1-total*.8)})`;ctx.beginPath();ctx.arc(star.x,star.y,star.r,0,Math.PI*2);ctx.fill();}
  glow(ctx,750,430,900,260,'200,145,109',total*.24);
  ctx.save();ctx.translate(0,110);ctx.scale(1600/W,1600/W);
  if(visible[2])ctx.drawImage(mountain,0,0);sprite(ctx,3,360,345,1812,175);
  water(ctx,1,1450,490,722,102,time*.4);
  water(ctx,0,0,628,W,460,time);
  if(visible[11]){const b=bounds[11];for(let j=0;j<11;j++){
   const key=j<2?'residential':j<6?'public':j<8?'billboard':'lamps';ctx.globalAlpha=gain(key)*.7;
   for(let row=0;row<100;row+=4){const shift=Math.sin(row*.12+time*1.5+j)*4;ctx.drawImage(images[11],b[0]+b[2]*j/11,b[1]+row/100*b[3],b[2]/11,4/100*b[3],110+j*178+shift,646+row,160,4);}
  }ctx.globalAlpha=1;}
  ctx.drawImage(architecture,0,0);ctx.restore();
  const fade=ctx.createLinearGradient(0,680,0,900);fade.addColorStop(0,'#07112500');fade.addColorStop(1,'#071125b0');ctx.fillStyle=fade;ctx.fillRect(0,680,1600,220);
  if(!paused)requestAnimationFrame(draw);
 }
 function invalidate(){dirty=true;if(paused&&ready)draw(performance.now());}
 function sync(){const s=state[selected];document.querySelectorAll('[data-source]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.source===selected)));
  document.querySelector('#brightness').value=s.brightness;document.querySelector('#brightness-value').value=s.brightness+'%';
  document.querySelector('#temperature-control').hidden=selected==='billboard';
  if(s.temperature){document.querySelector('#temperature').value=s.temperature;document.querySelector('#temperature-value').value=s.temperature+' K';}
  document.querySelector('#curtain-control').hidden=selected!=='residential';document.querySelector('#other-control').hidden=selected==='residential';
  document.querySelector('#curtain-value').value=state.residential.cover+'%';document.querySelectorAll('[data-cover]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.cover===state.residential.cover)));
  const options=document.querySelector('#other-options');options.replaceChildren();
  const choices=selected==='public'?[0,25,50,75,100]:selected==='billboard'?['on','off']:['open','half','full'];
  document.querySelector('#other-title').textContent=selected==='public'?'点亮窗格比例':selected==='billboard'?'屏幕开关':'灯罩';
  document.querySelector('#other-caption').textContent=selected==='public'?'试拼窗格单元 · 演示分组':selected==='billboard'?'关屏后保留建筑结构':'灯罩与上射光联动';
  if(selected!=='residential')for(const value of choices){const b=document.createElement('button');b.textContent=selected==='public'?value+'%':({on:'开启',off:'关闭',open:'无遮光',half:'半遮光',full:'全遮光'})[value];const active=selected==='public'?s.portion===value:selected==='billboard'?s.on===(value==='on'):s.shade===value;b.setAttribute('aria-pressed',String(active));b.onclick=()=>{if(selected==='public')s.portion=value;else if(selected==='billboard')s.on=value==='on';else s.shade=value;sync();invalidate();};options.append(b);}
 }
 document.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>{selected=b.dataset.source;sync();});
 document.querySelector('#brightness').oninput=e=>{state[selected].brightness=+e.target.value;sync();invalidate();};
 document.querySelector('#temperature').oninput=e=>{state[selected].temperature=+e.target.value;sync();invalidate();};
 document.querySelectorAll('[data-cover]').forEach(b=>b.onclick=()=>{state.residential.cover=+b.dataset.cover;sync();invalidate();});
 const motion=document.querySelector('#motion');function motionLabel(){motion.textContent=paused?'播放水面':'暂停水面';motion.setAttribute('aria-pressed',String(paused));}
 motion.onclick=()=>{paused=!paused;last=0;motionLabel();if(!paused)requestAnimationFrame(draw);};motionLabel();
 document.querySelector('#reset').onclick=()=>{state=defaults();sync();invalidate();};
 const panel=document.querySelector('#layer-panel'),toggle=document.querySelector('#layers-toggle');function setPanel(open){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));}toggle.onclick=()=>setPanel(panel.hidden);document.querySelector('#layers-close').onclick=()=>setPanel(false);document.addEventListener('keydown',e=>{if(e.key==='Escape')setPanel(false);});
 names.forEach((name,i)=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=visible[i];input.onchange=()=>{visible[i]=input.checked;invalidate();};label.append(input,document.createTextNode(String(i+1).padStart(2,'0')+'  '+name));document.querySelector('#layer-list').append(label);});
 const load=path=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法加载素材：'+path));im.src=window.DEMO_ASSETS?.[path]||path;});
 Promise.all([...files.map(f=>load('assets/'+f+'.png')),load('assets/window-apertures.png')]).then(loaded=>{
  images.push(...loaded.slice(0,12));maskImage=loaded[12];findApertures();
  // Extend the separated mountain's lower edge behind the city to avoid floating cutout bands.
  const mc=mountain.getContext('2d');mc.drawImage(images[2],...bounds[2],250,270,1922,155);
  const pixels=mc.getImageData(0,0,W,H);
  for(let x=250;x<W;x++){let bottom=-1;for(let y=424;y>=270;y--)if(pixels.data[(y*W+x)*4+3]>200){bottom=y;break;}if(bottom<0)continue;for(let y=bottom-30;y<555;y++){const index=(y*W+x)*4,mix=Math.min(1,(y-bottom+30)/30);if(y<=bottom&&pixels.data[index+3]<200)continue;const base=[48,57,101];for(let k=0;k<3;k++)pixels.data[index+k]=Math.round(pixels.data[index+k]*(1-mix)+base[k]*mix);pixels.data[index+3]=255;}}
  mc.putImageData(pixels,0,0);ready=true;document.querySelector('#loading').hidden=true;sync();draw(performance.now());document.documentElement.dataset.ready='true';
 }).catch(error=>{document.querySelector('#loading').textContent=error.message;console.error(error);});
})();

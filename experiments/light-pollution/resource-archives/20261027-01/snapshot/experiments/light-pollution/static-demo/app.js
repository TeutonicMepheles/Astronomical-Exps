/* Static registration proof. No independent layer transforms or color filters. */
(() => {
 'use strict';
 const W=2171,H=724,files=['00-sky','01-scenery','02-foreground-water','03-background-water','04-residential-emission','05-public-emission','06-billboard','07-warm-reflections'];
 const titles=['天空底色','建筑 · 山体 · 植被底景','前景水体','背景水体','住宅窗灯','公共建筑窗灯','广告屏','暖色倒影'];
 const enabled=files.map(()=>true),canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 const make=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;},composite=make(),reference=make(),difference=make();
 const cc=composite.getContext('2d',{willReadFrequently:true}),rc=reference.getContext('2d',{willReadFrequently:true}),dc=difference.getContext('2d');
 let images=[],mode='composite',view='all',ready=false;
 const modeNames={composite:'分层合成',reference:'原图参考',difference:'差异 · 黑色表示一致'},viewNames={all:'全景',homes:'住宅细节',public:'公共建筑',water:'滨河区域'};
 const views={all:{scale:1,x:W/2,y:H/2},homes:{scale:2.1,x:430,y:400},public:{scale:2.1,x:960,y:440},water:{scale:2.1,x:1670,y:500}};
 function paint(){if(!ready)return;const v=views[view],sw=W/v.scale,sh=H/v.scale,sx=Math.max(0,Math.min(W-sw,v.x-sw/2)),sy=Math.max(0,Math.min(H-sh,v.y-sh/2));ctx.clearRect(0,0,W,H);ctx.drawImage(({composite,reference,difference})[mode],sx,sy,sw,sh,0,0,W,H);document.querySelector('#view-label').textContent=modeNames[mode]+' / '+viewNames[view];document.documentElement.dataset.mode=mode;document.documentElement.dataset.view=view;}
 function rebuild(){if(!ready)return;cc.clearRect(0,0,W,H);images.slice(0,8).forEach((im,i)=>{if(enabled[i])cc.drawImage(im,0,0);});
  const a=cc.getImageData(0,0,W,H),b=rc.getImageData(0,0,W,H),delta=dc.createImageData(W,H);let count=0,max=0;
  for(let p=0;p<a.data.length;p+=4){let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(a.data[p+k]-b.data[p+k]));if(d){count++;max=Math.max(max,d);}delta.data[p]=Math.min(255,d*8);delta.data[p+1]=d?Math.min(90,d):0;delta.data[p+3]=255;}
  dc.putImageData(delta,0,0);const all=enabled.every(Boolean);document.querySelector('#status').textContent=all?'完整静态合成':'图层检查中';document.querySelector('#measurement').textContent=all?`最大通道差 ${max} / 255 · ${count.toLocaleString()} 个差异像素`:`已显示 ${enabled.filter(Boolean).length} / 8 层`;
  document.documentElement.dataset.maxDifference=String(max);document.documentElement.dataset.differentPixels=String(count);paint();
 }
 document.querySelectorAll('button[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('button[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint();});
 document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('button[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint();});
 titles.forEach((title,i)=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.onchange=()=>{enabled[i]=input.checked;rebuild();};label.append(input,document.createTextNode(title));document.querySelector('#layers').append(label);});
 document.querySelector('#restore').onclick=()=>{enabled.fill(true);document.querySelectorAll('#layers input').forEach(x=>x.checked=true);rebuild();};
 const load=file=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法加载 '+file));im.src=window.STATIC_ASSETS?.[file]||file;});
 Promise.all([...files.map(f=>load('assets/'+f+'.png')),load('assets/source.png')]).then(result=>{images=result;rc.drawImage(images[0],0,0);rc.drawImage(images[8],0,0);ready=true;rebuild();document.querySelector('#loading').hidden=true;document.documentElement.dataset.ready='true';}).catch(error=>{document.querySelector('#loading').textContent=error.message;console.error(error);});
})();


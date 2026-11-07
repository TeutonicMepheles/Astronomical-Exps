import {lighting,defaultLighting,grid,defaultGrid,pedestal,defaultPedestal,background,defaultBackground} from './lighting.js';
export function mountDebug(onChange){
 const button=document.querySelector('#debugButton'),panel=document.querySelector('#debugPanel');
 const backgroundFields=[['brightness','backgroundBrightness',.5,1.6],['contrast','backgroundContrast',.5,1.5]];
 const backgroundStorageKey='foucault-background-v1';
 let savedBackground;
 try{savedBackground=JSON.parse(localStorage.getItem(backgroundStorageKey));}catch{}
 for(const [key,id,min,max] of backgroundFields){
   const value=savedBackground?.[key];
   if(Number.isFinite(value))background[key]=Math.max(min,Math.min(max,value));
 }
 const syncBackground=()=>{
   for(const [key,id] of backgroundFields){
     const input=document.getElementById(id);
     input.value=background[key];
     input.nextElementSibling.value=Number(background[key]).toFixed(2);
   }
 };
 const saveBackground=()=>{try{localStorage.setItem(backgroundStorageKey,JSON.stringify(background));}catch{}};
 for(const [key,id] of backgroundFields){
   const input=document.getElementById(id);
   input.addEventListener('input',()=>{background[key]=Number(input.value);syncBackground();onChange();});
   input.addEventListener('change',saveBackground);
 }
 syncBackground();
 document.querySelector('#backgroundReset').addEventListener('click',()=>{
   Object.assign(background,defaultBackground);syncBackground();saveBackground();onChange();
 });
 const fields=[['highlightColor','高光颜色','color'],['highlightStrength','高光强度','range',0,2,.01],['highlightRange','高光范围','range',.25,2,.01],['highlightGrain','高光颗粒强度','range',0,4,.05],['highlightGrainScale','颗粒尺寸','range',1.2,5,.05],['rimColor','阴面反光颜色','color'],['rimStrength','阴面反光强度','range',0,2,.01],['ambientColor','环境光颜色','color'],['ambientStrength','环境光强度','range',0,1,.01]];
 try{const saved=JSON.parse(localStorage.getItem('foucault-lighting-v1'));for(const [key,,type,min,max] of fields){let v=saved?.[key];if(key==='highlightGrain'&&v===1.1)v=2;if(key==='highlightGrainScale'&&v===2.6)v=3;if(type==='color'&&/^#[0-9a-f]{6}$/i.test(v))lighting[key]=v;else if(type==='range'&&Number.isFinite(v))lighting[key]=Math.max(min,Math.min(max,v));}}catch{}
 for(const [key,label,type,min,max,step] of fields){const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.type=type;input.name=key;if(type==='range'){input.min=min;input.max=max;input.step=step;}input.value=lighting[key];input.addEventListener('input',()=>{lighting[key]=type==='color'?input.value:Number(input.value);save();onChange();});row.append(input);panel.append(row);}
 const gridFields=[['dashLen','虚线长度(°)','range',4,40,.5],['dashGap','虚线间隔(°)','range',2,40,.5]];
 for(const [key,label,type,min,max,step] of gridFields){const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.type=type;input.name=key;input.min=min;input.max=max;input.step=step;input.value=grid[key];input.addEventListener('input',()=>{grid[key]=Number(input.value);save();onChange();});row.append(input);panel.append(row);}
 const pedFields=[['x','底座中心X','range',200,600,1],['y','底座中心Y','range',200,600,1],['scale','底座缩放','range',0.2,0.6,.005],['baseShadow','落地阴影','range',0,1,.02],['ballShadow','球座阴影','range',0,1,.02]];
 for(const [key,label,type,min,max,step] of pedFields){const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.type=type;input.name=key;input.min=min;input.max=max;input.step=step;input.value=pedestal[key];input.addEventListener('input',()=>{pedestal[key]=Number(input.value);save();onChange();});row.append(input);panel.append(row);}
 const reset=document.createElement('button');reset.textContent='恢复地球与支架默认';reset.type='button';reset.addEventListener('click',()=>{Object.assign(lighting,defaultLighting);Object.assign(grid,defaultGrid);Object.assign(pedestal,defaultPedestal);Object.assign(background,defaultBackground);syncBackground();for(const input of panel.querySelectorAll('input[name]')){if(input.name in background)input.value=background[input.name];else input.value=(input.name in grid)?grid[input.name]:(input.name in pedestal?pedestal[input.name]:lighting[input.name]);}save();saveBackground();onChange();});panel.append(reset);
 function save(){try{localStorage.setItem('foucault-lighting-v1',JSON.stringify(lighting));}catch{}}
 function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
 button.addEventListener('click',()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();button.focus();}});
 onChange();
}

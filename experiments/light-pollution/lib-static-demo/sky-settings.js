(() => {
'use strict';
const storageKey='light-pollution.compositor-starfield-presets.v1';
let saved={},active=0,storageError=false;
try{const data=JSON.parse(localStorage.getItem(storageKey));if(data?.version===1){if(data.presets&&typeof data.presets==='object'&&!Array.isArray(data.presets))saved=data.presets;if(Number.isInteger(data.active)&&data.active>=0&&data.active<4)active=data.active;}}catch{storageError=true;}
const sky=new PollutionStarfield(document.querySelector('#sky-background'),{gradientFrame:[0,11/27,1,16/27]});
window.compositorSky=sky;
const drafts={};
const panel=document.querySelector('#sky-settings'),toggle=document.querySelector('#sky-toggle'),status=document.querySelector('#sky-save-status');
const keys=['count','density','twinkle','speed','topColor','bottomColor','starColor','paused'];
function parameters(value){const result={};if(value&&typeof value==='object')for(const key of keys)if(Object.hasOwn(value,key))result[key]=value[key];return result;}
function load(level){sky.reset();sky.setLevel(level);sky.update(parameters(drafts[level]||saved[level]));drafts[level]=sky.getSettings();}
load(active);
function message(){const s=sky.getSettings(),stored=parameters(saved[s.level]);const equal=keys.every(k=>stored[k]===s[k]);status.textContent=storageError?'浏览器存储不可用或记录损坏，可重试保存。':equal?'本档设置已保存到此浏览器。':'本档尚有未保存设置。';}
function sync(){const s=sky.getSettings();for(const key of ['topColor','bottomColor']){const input=document.getElementById('sky-'+key);input.disabled=!!s.gradient;input.title=s.gradient?'请在素材编辑 → 天空渐变中修改颜色':'';}document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.level)===s.level)));for(const key of keys.filter(k=>k!=='paused'))document.getElementById('sky-'+key).value=s[key];document.querySelector('#sky-count-value').value=s.count;document.querySelector('#sky-density-value').value=s.density.toFixed(2)+'×';document.querySelector('#sky-twinkle-value').value=Math.round(s.twinkle*100)+'%';document.querySelector('#sky-speed-value').value=s.speed.toFixed(1)+'×';document.querySelector('#sky-pause').textContent=s.paused?'播放动态':'暂停动态';document.querySelector('#sky-pause').setAttribute('aria-pressed',String(s.paused));message();}
function open(value){panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));toggle.setAttribute('aria-label',value?'收起星空调节':'打开星空调节');if(value)panel.querySelector('[data-level]').focus();else toggle.focus();}
toggle.addEventListener('click',()=>open(panel.hidden));document.querySelector('#sky-close').addEventListener('click',()=>open(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.stopImmediatePropagation();open(false);} },true);
document.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>{const s=sky.getSettings();drafts[s.level]=s;load(Number(b.dataset.level));sync();}));
for(const key of keys.filter(k=>k!=='paused'))document.getElementById('sky-'+key).addEventListener('input',e=>{sky.update({[key]:e.target.type==='color'?e.target.value:Number(e.target.value)});sync();});
document.querySelector('#sky-pause').addEventListener('click',()=>{sky.update({paused:!sky.getSettings().paused});sync();});
document.querySelector('#sky-reset').addEventListener('click',()=>{const level=sky.getSettings().level;sky.reset();sky.setLevel(level);drafts[level]=sky.getSettings();sync();});
document.querySelector('#sky-save').addEventListener('click',()=>{const s=sky.getSettings(),next={...saved,[s.level]:parameters(s)};try{localStorage.setItem(storageKey,JSON.stringify({version:1,active:s.level,presets:next}));saved=next;storageError=false;message();}catch{storageError=true;status.textContent='保存失败：浏览器存储不可用，请允许本地存储后重试。';}});
addEventListener('pagehide',e=>{if(!e.persisted)sky.destroy();});
document.querySelector('#sky-background').addEventListener('starfieldchange',sync);sync();
})();

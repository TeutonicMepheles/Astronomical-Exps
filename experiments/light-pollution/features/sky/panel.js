(() => {
'use strict';
const storageKey='light-pollution.compositor-starfield-presets.v1';
let saved={},active=0,storageError=false;
try{const data=JSON.parse(localStorage.getItem(storageKey));if(data?.version===1){if(data.presets&&typeof data.presets==='object'&&!Array.isArray(data.presets))saved=data.presets;if(Number.isInteger(data.active)&&data.active>=0&&data.active<4)active=data.active;}}catch{storageError=true;}
const sky=new PollutionStarfield(document.querySelector('#sky-background'),{gradientFrame:[0,11/27,1,16/27]});
window.compositorSky=sky;sky.useScheduler(LightPollution.scheduler);LightPollution.disposers.push(()=>sky.destroy());
const drafts={};
const panel=document.querySelector('#sky-settings'),toggle=document.querySelector('#sky-toggle'),status=document.querySelector('#sky-save-status');
const keys=['count','density','twinkle','speed','topColor','bottomColor','starColor','paused'];
function parameters(value){const result={};if(value&&typeof value==='object')for(const key of keys)if(Object.hasOwn(value,key))result[key]=value[key];return result;}
function load(level){sky.reset();sky.setLevel(level);sky.update(parameters(drafts[level]||saved[level]));drafts[level]=sky.getSettings();}
load(active);
function message(){const s=sky.getSettings(),stored=parameters(saved[s.level]);const equal=keys.every(k=>stored[k]===s[k]);status.textContent=storageError?'浏览器存储不可用或记录损坏，可重试保存。':equal?'本档设置已保存到此浏览器。':'本档尚有未保存设置。';}
function sync(){const s=sky.getSettings();for(const key of ['topColor','bottomColor']){const input=document.getElementById('sky-'+key);input.disabled=false;input.title=s.gradient?(key==='topColor'?'修改自定义渐变的首端色标':'修改自定义渐变的末端色标'):'';}document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.level)===s.level)));for(const key of keys.filter(k=>k!=='paused'))document.getElementById('sky-'+key).value=s.gradient&&['topColor','bottomColor'].includes(key)?s.gradient.stops[key==='topColor'?0:s.gradient.stops.length-1].color:s[key];document.querySelector('#sky-count-value').value=s.count;document.querySelector('#sky-density-value').value=s.density.toFixed(2)+'×';document.querySelector('#sky-twinkle-value').value=Math.round(s.twinkle*100)+'%';document.querySelector('#sky-speed-value').value=s.speed.toFixed(1)+'×';document.querySelector('#sky-pause').textContent=s.paused?'播放动态':'暂停动态';document.querySelector('#sky-pause').setAttribute('aria-pressed',String(s.paused));message();}
function show(value){panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));toggle.setAttribute('aria-label',value?'收起星空调节':'打开星空调节');if(value)panel.querySelector('[data-level]').focus();else toggle.focus();}
LightPollution.panels.register('sky',()=>show(true),()=>show(false));function open(value){if(value)LightPollution.panels.open('sky');else LightPollution.panels.close('sky');}
LightPollution.on(toggle,'click',()=>open(panel.hidden));LightPollution.on(document.querySelector('#sky-close'),'click',()=>open(false));LightPollution.on(document,'keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.stopImmediatePropagation();open(false);} },true);
document.querySelectorAll('[data-level]').forEach(b=>LightPollution.on(b,'click',()=>{const s=sky.getSettings();drafts[s.level]=s;load(Number(b.dataset.level));sync();}));
for(const key of keys.filter(k=>k!=='paused'))LightPollution.on(document.getElementById('sky-'+key),'input',e=>{if(sky.getSettings().gradient&&['topColor','bottomColor'].includes(key))document.dispatchEvent(new CustomEvent('compositor-gradient-color',{detail:{key,color:e.target.value,phase:'input'}}));else sky.update({[key]:e.target.type==='color'?e.target.value:Number(e.target.value)});sync();});
for(const key of ['topColor','bottomColor'])for(const type of ['change','blur'])LightPollution.on(document.getElementById('sky-'+key),type,()=>document.dispatchEvent(new CustomEvent('compositor-gradient-color',{detail:{key,phase:'commit'}})));
const gradientButton=document.createElement('button');gradientButton.id='sky-edit-gradient';gradientButton.textContent='过渡线 / 曲线';const colorActions=document.createElement('div');colorActions.className='sky-save-actions';panel.querySelector('.colors').after(colorActions);colorActions.append(gradientButton,document.querySelector('#sky-save'));gradientButton.onclick=()=>document.dispatchEvent(new CustomEvent('compositor-open-gradient'));
LightPollution.on(document.querySelector('#sky-pause'),'click',()=>{sky.update({paused:!sky.getSettings().paused});sync();});
LightPollution.on(document.querySelector('#sky-reset'),'click',()=>{const level=sky.getSettings().level;sky.reset();sky.setLevel(level);drafts[level]=sky.getSettings();sync();});
LightPollution.on(document.querySelector('#sky-save'),'click',()=>{const s=sky.getSettings(),next={...saved,[s.level]:parameters(s)};try{localStorage.setItem(storageKey,JSON.stringify({version:1,active:s.level,presets:next}));saved=next;storageError=false;message();}catch{storageError=true;status.textContent='保存失败：浏览器存储不可用，请允许本地存储后重试。';}});
LightPollution.on(window,'pagehide',e=>{if(!e.persisted)sky.destroy();});
LightPollution.on(document.querySelector('#sky-background'),'starfieldchange',sync);sync();
})();

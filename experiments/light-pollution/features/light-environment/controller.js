/* Demonstration-only light budget; no calibrated lux, SQM or Bortle readings. */
window.createLightEnvironment=function({sky,getObjects,getSession,getLamps,getDistant,sourceVisible,compose}){
 const weights={residential:.3,public:.3,billboard:.2,lamps:.2,distant:.15};
 const area=q=>Math.abs(q.reduce((sum,p,i)=>{const n=q[(i+1)%q.length];return sum+p[0]*n[1]-n[0]*p[1];},0))/2;
 const temperature=k=>.7+.6*Math.max(0,Math.min(1,(k-2200)/4300));
 const panel=document.createElement('section');panel.className='light-budget';panel.innerHTML=`<label><input id="light-auto" type="checkbox" checked> 光源联动天空</label><p id="light-summary"></p><div id="light-contributions"></div><button id="light-export">导出光配置</button><small>视觉演示指数，非实测光污染等级。窗帘降低逸出光，冷光及无遮光灯罩贡献更高。</small>`;document.querySelector('#sky-settings').prepend(panel);
 let enabled=true,last=-1,report=null,lastPanel='';
 panel.querySelector('input').onchange=e=>{const value=e.target.checked;getSession().changeExternal(()=>setData({version:1,enabled:value}));};
 function validate(v){if(v==null)return {version:1,enabled:true};if(v.version!==1||typeof v.enabled!=='boolean')throw Error('光照联动配置无效');return {version:1,enabled:v.enabled};}
 function setData(v){enabled=validate(v).enabled;panel.querySelector('input').checked=enabled;last=-1;}
 let halo=null,haloKey='',haloSource=null;
 panel.querySelector('#light-export').onclick=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify({...report,skyBase:sky.getSettings(),mapping:{normalization:{residential:48000,public:110000,billboard:40000},budgetScale:1.35,curtainTransmission:.04,shade:{open:1,half:.46,full:.08}},note:'视觉演示配置，非科学标定；场景恢复请使用素材编辑中的布局 JSON。'},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='light-configuration.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function update(){
  const data=getObjects()?.getData(),layers=getSession()?.layers;if(!data||!layers)return;
  const {totals,contributions,amount,lamp,distant}=LightPollution.deriveLightEnvironment({data,layers,lampInput:getLamps(),distantInput:getDistant(),sourceVisible});
  report={version:1,enabled,amount,weights,totals,contributions,objects:data.items.map(o=>({id:o.id,parent:o.parent,brightness:o.brightness,temperature:o.temperature,coverage:o.coverage,visible:o.visible,corners:o.corners})),lamps:lamp,distant,layers:layers.map(l=>({...l})),model:'visual-demo-v1'};
  if(amount!==last){last=amount;sky.setPollution(enabled?amount:null);}
  const panelKey=JSON.stringify([enabled,amount,contributions]);if(panelKey===lastPanel)return;lastPanel=panelKey;
  const label=amount<.2?'低':amount<.45?'中低':amount<.7?'中高':'高';
  panel.querySelector('#light-summary').textContent=enabled?`演示光污染指数 ${Math.round(amount*100)} / 100 · ${label}`:'手动天空预览';
  panel.querySelector('#light-contributions').textContent=Object.entries(contributions).map(([k,v])=>`${({residential:'住宅',public:'公共建筑',billboard:'广告屏',lamps:'路灯',distant:'远景'})[k]} ${Math.round(v/1.35*100)}`).join(' · ');
  document.querySelectorAll('[data-level]').forEach(b=>b.disabled=enabled);
 }
 return {update,validate,setData,getData:()=>({version:1,enabled}),getReport:()=>report,reset(){setData(null);},drawRidge(c,source){const p=enabled?(report?.amount||0):0;if(!p)return;const settings=sky.getSettings(),color=settings.gradient?.stops.at(-1).color||settings.bottomColor;
 const tint=[1,3,5].map(i=>Math.round(125+parseInt(color.slice(i,i+2),16)*.45));const key=`${p.toFixed(3)}:${color}`;
 if(haloSource!==source||haloKey!==key){haloSource=source;haloKey=key;halo=document.createElement('canvas');halo.width=source.width;halo.height=source.height;const g=halo.getContext('2d');g.shadowColor=`rgb(${tint})`;g.shadowBlur=20+p*80;g.shadowOffsetY=-4-p*12;g.drawImage(source,0,0);g.shadowColor='transparent';g.globalCompositeOperation='destination-out';g.drawImage(source,0,0);}
 c.save();c.globalAlpha*=Math.min(.85,p);c.drawImage(halo,0,0);c.restore();}};
};

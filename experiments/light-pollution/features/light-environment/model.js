window.LightPollution.deriveLightEnvironment=function({data,layers,lampInput,distantInput,sourceVisible}){
 const weights={residential:.3,public:.3,billboard:.2,lamps:.2,distant:.15};
 const area=q=>Math.abs(q.reduce((sum,p,i)=>{const n=q[(i+1)%q.length];return sum+p[0]*n[1]-n[0]*p[1];},0))/2;
 const temperature=k=>.7+.6*Math.max(0,Math.min(1,(k-2200)/4300));
  const totals={residential:0,public:0,billboard:0,lamps:0,distant:0};
  for(const o of data.items){const id=o.parent||'buildings',layer=layers.find(l=>l.id===id);if(!o.visible||!layer?.visible||!sourceVisible(o))continue;
   const key=o.type==='billboard'?'billboard':['public','ad-building'].includes(id)?'public':'residential';
   const normalization={residential:48000,public:110000,billboard:40000}[key];
   totals[key]+=area(o.corners)*layer.scale**2/normalization*layer.opacity*(o.brightness/100)*temperature(o.temperature)*(o.type==='window'?1-.96*o.coverage/100:1);
  }
  const lamp=lampInput;totals.lamps=lamp.brightness/100*temperature(lamp.temperature)*({open:1,half:.46,full:.08}[lamp.shade]);
  const distant=distantInput,dl=distant.layer;totals.distant=dl?.visible&&distant.visible?distant.brightness/100*temperature(distant.temperature)*dl.opacity*dl.scale**2:0;
  const contributions=Object.fromEntries(Object.keys(weights).map(k=>[k,Math.min(2,totals[k])*weights[k]]));
  const amount=Math.min(1,Object.values(contributions).reduce((a,b)=>a+b,0)/1.35);
return {totals,contributions,amount,lamp,distant,weights};
};

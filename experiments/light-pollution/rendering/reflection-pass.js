/* Cache contiguous window emitters without changing layer/object blend order. */
const reflectionCaches=new WeakMap();
window.LightPollution.renderReflections=function({reflectionScene,screenLight,session,visible,specs,bounds,objects,candidate,W,H}){
 let cache=reflectionCaches.get(reflectionScene);if(!cache){cache=new Map();reflectionCaches.set(reflectionScene,cache);}const used=new Set(),data=objects?.getData().items||[];
 const rc=reflectionScene.getContext('2d');rc.clearRect(0,0,W,H);
 for(const layer of session.layers){if(!['residential','public','ad-building','buildings'].includes(layer.id)||!layer.visible||!visible[specs.find(s=>s[0]===layer.id)[2]])continue;
  const b=bounds[layer.id],items=data.filter(o=>o.visible&&(!candidate||o.parent===layer.id));let pending=[],segment=0;
  function flush(){if(!pending.length)return;const id=layer.id+':'+segment++,key=JSON.stringify([layer,pending.map(o=>[o.corners,o.brightness,o.temperature,o.coverage])]);used.add(id);let entry=cache.get(id);
   if(!entry||entry.key!==key){const image=entry?.image||document.createElement('canvas');if(image.width!==W)image.width=W;if(image.height!==H)image.height=H;const c=image.getContext('2d');c.clearRect(0,0,W,H);c.save();c.translate(b.x+layer.x,b.y+layer.y);c.scale(layer.scale,layer.scale);c.translate(-b.x,-b.y);
    for(const o of pending){const xs=o.corners.map(p=>p[0]),ys=o.corners.map(p=>p[1]),x=(Math.min(...xs)+Math.max(...xs))/2,rx=Math.max(26,(Math.max(...xs)-Math.min(...xs))*.95),warmth=Math.max(0,Math.min(1,(o.temperature-2200)/4300)),color=[255-65*warmth,155+70*warmth,65+190*warmth].map(Math.round),gain=Math.min(1,o.brightness/100)*(1-.96*o.coverage/100);if(gain<=0)continue;
     c.save();c.translate(x,560);c.scale(rx,H);c.globalAlpha=layer.opacity*gain;const glow=c.createRadialGradient(0,0,0,0,0,1);glow.addColorStop(0,`rgba(${color},.85)`);glow.addColorStop(.4,`rgba(${color},.5)`);glow.addColorStop(1,`rgba(${color},0)`);c.fillStyle=glow;c.fillRect(-1,-1,2,2);c.restore();}
    c.restore();entry={key,image};cache.set(id,entry);
   }rc.drawImage(entry.image,0,0);pending=[];
  }
  for(const o of items){if(o.type!=='billboard'){pending.push(o);continue;}flush();rc.save();rc.globalAlpha=layer.opacity;rc.translate(b.x+layer.x,b.y+layer.y);rc.scale(layer.scale,layer.scale);rc.translate(-b.x,-b.y);
   const sc=screenLight.getContext('2d');sc.clearRect(0,0,W,H);objects.render(sc,'billboard',candidate?layer.id:undefined);
   const xs=o.corners.map(p=>p[0]),ys=o.corners.map(p=>p[1]),sx=Math.min(...xs),sy=Math.min(...ys),sw=Math.max(...xs)-sx,sh=Math.max(...ys)-sy;
   if(sw>0&&sh>0){rc.filter='blur(18px)';rc.drawImage(screenLight,sx,sy,sw,sh,sx-sw*.12,0,sw*1.24,H);}rc.restore();
  }flush();
 }
 for(const id of cache.keys())if(!used.has(id))cache.delete(id);
};

/* Cached atmospheric beams and road illumination. Original surfaces are never darkened here. */
window.createPanoramaLighting=function({W,H,registrations,mergedStadium=false}){
 const make=(width=W,height=H)=>Object.assign(document.createElement('canvas'),{width,height}),cache=new Map();
 LightPollution.disposers.push(()=>{for(const r of cache.values()){r.canvas.width=1;r.canvas.height=1;}cache.clear();});
 const color=t=>{const k=Math.max(0,Math.min(1,(t-2200)/4300));return [255-35*k,181+61*k,98+157*k].map(Math.round);};
 const rgba=(rgb,a)=>`rgba(${rgb.join(',')},${a})`;
 function draw(context,id,{items,layers,bounds,source,roadShade='open',drawFixture}){
  if(mergedStadium){const stadium=layers.find(l=>l.id==='stadium');if(stadium){layers=[...layers,...[1,2,3,4].map(i=>({...stadium,id:'floodlight-'+i,opacity:1}))];bounds={...bounds,...Object.fromEntries([1,2,3,4].map(i=>['floodlight-'+i,bounds.stadium]))};}}
  const headOnly=id.startsWith('floodlight-'),roadHead=id.startsWith('roadlamp-');if(id!=='stadium'&&id!=='highway'&&!headOnly&&!roadHead)return;
  const receiver=layers.find(l=>l.id===id),r=registrations[id];if(!receiver||!r)return;
  const sources=roadHead?items.filter(o=>o.parent===id):id!=='highway'?items.filter(o=>o.parent==='stadium'):items.filter(o=>o.parent.startsWith('roadlamp-'));
  const relevant=roadHead?[id]:[id,'stadium',...(id!=='highway'?['floodlight-1','floodlight-2','floodlight-3','floodlight-4']:sources.map(o=>o.parent))];
  const key=JSON.stringify([roadShade,sources.map(o=>[o.id,o.brightness,o.temperature,o.visible]),layers.filter(l=>relevant.includes(l.id)).map(l=>[l.id,l.x,l.y,l.scale,l.visible,l.opacity])]);
  let record=cache.get(id);if(!record){record=roadHead?{canvas:make(Math.ceil(r.w*4.5)+4,Math.ceil(r.h*1.2+r.w)+4),x:Math.floor(r.x-r.w*.5)-2,y:Math.floor(r.y-r.h*.2-r.w)-2}:{canvas:make()};cache.set(id,record);}
  if(record.key!==key||record.source!==source){record.key=key;record.source=source;const g=record.canvas.getContext('2d');g.clearRect(0,0,record.canvas.width,record.canvas.height);g.save();g.translate(-(record.x||0),-(record.y||0));
   const project=(point,layerId)=>{const l=layers.find(l=>l.id===layerId),b=bounds[layerId],b0=bounds[id];return [(b.x+l.x+(point[0]-b.x)*l.scale-b0.x-receiver.x)/receiver.scale+b0.x,(b.y+l.y+(point[1]-b.y)*l.scale-b0.y-receiver.y)/receiver.scale+b0.y];};
   if(roadHead){
    const light=sources[0],variant=LightPollution.lampVariants[roadShade];drawFixture?.(g,{x:r.x+r.w*.5,y:r.y+r.h,height:r.h*1.15,shade:roadShade,brightness:light?.visible?light.brightness:0});if(light?.visible&&light.brightness>0&&roadShade!=='sensor'){const rgb=color(light.temperature),strength=Math.min(2,light.brightness/100)*1.6,hx=r.x+r.w*.5,hy=r.y-r.h*.08,foot=[r.x+r.w*(r.lightFoot?.[0]??1.65),r.y+r.h*(r.lightFoot?.[1]??.94)];
     g.save();g.globalCompositeOperation='screen';
     // Same layered head halo, downward beam and ground-pool model as the former lamp row.
     g.save();g.translate(hx,hy);g.scale(r.w*1.05,r.w*.8);g.globalAlpha*=variant.spill;const halo=g.createRadialGradient(0,0,0,0,0,1);halo.addColorStop(0,rgba([255,249,224],.78*strength));halo.addColorStop(.22,rgba(rgb,.5*strength));halo.addColorStop(1,rgba(rgb,0));g.fillStyle=halo;g.fillRect(-1,-1,2,2);g.restore();
     for(let band=0;band<7;band++){const half=r.w*(2.1-band*.18),beam=g.createLinearGradient(hx,hy,...foot);beam.addColorStop(0,rgba(rgb,.032*strength));beam.addColorStop(.4,rgba(rgb,.026*strength));beam.addColorStop(1,rgba(rgb,0));g.fillStyle=beam;g.beginPath();g.moveTo(hx-r.w*.16,hy);g.lineTo(hx+r.w*.16,hy);g.lineTo(foot[0]+half,foot[1]);g.lineTo(foot[0]-half,foot[1]);g.closePath();g.fill();}g.restore();
    }
   }else if(headOnly){
    const light=sources[0],stadium=layers.find(l=>l.id==='stadium');if(light?.visible&&light.brightness>0&&stadium?.visible){const rgb=color(light.temperature),strength=Math.min(2,light.brightness/100)*(mergedStadium?1:stadium.opacity);
     const face=[[.025,.055],[.89,.012],[.96,.315],[.075,.36]].map(([x,y])=>[r.x+x*r.w,r.y+y*r.h]);
     const shape=()=>{g.beginPath();face.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();};
     // Glow is composited after each actual lamp face, including the foreground bank.
     g.save();g.globalCompositeOperation='screen';for(const [blur,alpha] of [[r.w*.22,.55],[r.w*.095,.68],[r.w*.035,.42]]){g.filter=`blur(${blur}px)`;g.fillStyle=rgba(rgb,alpha*strength);shape();g.fill();}g.filter='none';g.fillStyle=rgba([255,244,207],.15*strength);shape();g.fill();g.restore();
    }
   }else if(id==='stadium'){
    const light=sources[0];if(light?.visible&&light.brightness>0){const rgb=color(light.temperature),strength=Math.min(2,light.brightness/100);
     for(let i=1;i<=4;i++){const lampId='floodlight-'+i,l=layers.find(l=>l.id===lampId),a=registrations[lampId];if(!l?.visible||l.opacity<=0)continue;
      const start=project([a.x+a.w*.48,a.y+a.h*.18],lampId),target=[r.x+r.w*[.68,.40,.34,.28][i-1],r.y+r.h*[.35,.36,.33,.35][i-1]],dx=target[0]-start[0],dy=target[1]-start[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
      const face=[[.025,.055],[.89,.012],[.96,.315],[.075,.36]].map(([x,y])=>project([a.x+x*a.w,a.y+y*a.h],lampId));
      // Convex envelope starts at the whole tilted bank, never a point-sized emitter.
      const hull=points=>{points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const side=ps=>{const out=[];for(const p of ps){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};return [...side(points).slice(0,-1),...side([...points].reverse()).slice(0,-1)];};
      for(let band=0;band<12;band++){const f=1-band/18,half=r.w*.065*f,points=hull([...face.map(p=>[start[0]+(p[0]-start[0])*f,start[1]+(p[1]-start[1])*f]),[target[0]+nx*half,target[1]+ny*half],[target[0]-nx*half,target[1]-ny*half]]),gradient=g.createLinearGradient(...start,...target);gradient.addColorStop(0,rgba(rgb,.085*strength*l.opacity));gradient.addColorStop(.35,rgba(rgb,.10*strength*l.opacity));gradient.addColorStop(.88,rgba(rgb,.048*strength*l.opacity));gradient.addColorStop(1,rgba(rgb,0));g.fillStyle=gradient;g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();}

     }
    }
   }else{
    g.save();g.beginPath();[[0,1],[1,0],[1,.365],[.70,1]].forEach(([x,y],i)=>i?g.lineTo(r.x+x*r.w,r.y+y*r.h):g.moveTo(r.x+x*r.w,r.y+y*r.h));g.closePath();g.clip();
    for(const light of sources){const l=layers.find(l=>l.id===light.parent),a=registrations[light.parent];if(roadShade==='sensor'||!light.visible||light.brightness<=0||!l?.visible||l.opacity<=0)continue;const point=project([a.x+a.w*1.65,a.y+a.h*.94],light.parent),rgb=color(light.temperature),strength=Math.min(2,light.brightness/100)*1.6*l.opacity;
     g.save();g.translate(...point);g.rotate(-.40);g.scale(a.w*3.2*l.scale/receiver.scale,a.w*.75*l.scale/receiver.scale);const glow=g.createRadialGradient(0,0,0,0,0,1);glow.addColorStop(0,rgba(rgb,.45*strength));glow.addColorStop(.4,rgba(rgb,.22*strength));glow.addColorStop(1,rgba(rgb,0));g.fillStyle=glow;g.fillRect(-1,-1,2,2);g.restore();
    }g.restore();g.globalCompositeOperation='destination-in';g.drawImage(source,0,0);g.globalCompositeOperation='source-over';
   }
   g.restore();
  }
  context.drawImage(record.canvas,record.x||0,record.y||0);if(mergedStadium&&id==='stadium'){for(let i=1;i<=4;i++)draw(context,'floodlight-'+i,{items,layers:layers.filter(l=>!l.id.startsWith('floodlight-')),bounds,source});}
 }
 return {draw};
};

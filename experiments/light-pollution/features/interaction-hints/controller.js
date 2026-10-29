/* Host adapter: shared AffordanceHint, independent completion per source category. */
window.createStreetHints=function({getSession,getObjects,getLamps,getView,bounds,W,H,canvas,getOccluders,getHoverTarget,getActiveTarget}){
 const host=document.createElement('div');host.className='street-hints';host.setAttribute('aria-hidden','true');document.querySelector('.viewer').append(host);
 let hovered=null;const viewer=document.querySelector('.viewer');
 function emphasis(){const active=getActiveTarget();for(const [id,e]of entries){const group=id.startsWith('lamp-')?'lamps':id;const on=group===hovered||group===active;e.root.style.setProperty('--hint-outline-width',on?'4px':'2px');e.root.style.setProperty('--hint-glow-width',on?'24px':'10px');e.root.style.setProperty('--hint-glow-strength',on?'1.5':'.55');e.root.style.filter=on?'blur(.45px)':'none';}}
 LightPollution.on(viewer,'pointermove',e=>{hovered=!getSession()?.active&&e.pointerType!=='touch'?getHoverTarget(e):null;emphasis();});LightPollution.on(viewer,'pointerleave',()=>{hovered=null;emphasis();});
 const finished=new Set(),previous={},entries=new Map();
 function dispose(id){const e=entries.get(id);if(e){e.hint.destroy();e.wrapper.remove();entries.delete(id);}}
 function outline(id,geometry,style){const key=JSON.stringify([geometry,style]);let e=entries.get(id);if(e?.key===key)return;if(e)dispose(id);const root=document.createElement('div');root.className='street-hint-shape';root.dataset.hintSource=id;Object.assign(root.style,style);const wrapper=document.createElement('div');wrapper.className='street-hint-occlusion';wrapper.style.cssText='position:absolute;inset:0;pointer-events:none;mask-size:100% 100%;mask-repeat:no-repeat;mask-mode:alpha';wrapper.append(root);host.append(wrapper);const hint=LightPollution.createAffordance(root,geometry);hint.setEnabled(true);entries.set(id,{root,wrapper,hint,key});}
 let previousOccluders=[],maskURLs=new Map();
 function masks(){const layers=getOccluders();if(layers.length===previousOccluders.length&&layers.every((l,i)=>l.id===previousOccluders[i].id&&l.key===previousOccluders[i].key&&l.source===previousOccluders[i].source))return;
  previousOccluders=layers;maskURLs.clear();
  const cumulative=Object.assign(document.createElement('canvas'),{width:W,height:H}),g=cumulative.getContext('2d');
  // Walk front to back: each object's mask contains only the layers above it.
  for(let i=layers.length-1;i>=0;i--){const layer=layers[i];if(['residential','public','ad-building'].includes(layer.id)){const mask=Object.assign(document.createElement('canvas'),{width:W,height:H}),m=mask.getContext('2d');m.fillStyle='#fff';m.fillRect(0,0,W,H);m.globalCompositeOperation='destination-out';m.drawImage(cumulative,0,0);maskURLs.set(layer.id,`url("${mask.toDataURL()}")`);}
   layer.draw(g);
  }
 }
 let lastState='';
 function sync(){const editor=getSession(),objects=getObjects();if(!editor||!objects)return;const lamp=getLamps().getData(),signature=JSON.stringify([objects.revision,editor.active,editor.layers,lamp,getView(),canvas.clientWidth,canvas.clientHeight,canvas.offsetTop,canvas.style.transform]);if(signature===lastState){emphasis();return;}lastState=signature;const data=objects.getData();
  const signatures={lamps:JSON.stringify(lamp)};for(const group of ['residential','public','ad-building','billboard'])signatures[group]=JSON.stringify(data.items.filter(o=>group==='billboard'?o.type==='billboard':o.type==='window'&&o.parent===group).map(o=>[o.id,o.brightness,o.temperature,o.coverage,o.visible,o.images,o.playing]));
  for(const [id,value]of Object.entries(signatures)){if(previous[id]!==undefined&&previous[id]!==value)finished.add(id);previous[id]=value;}
  host.hidden=editor.active;const v=getView(),x=Math.max(0,Math.min(W-W/v.z,v.x-W/v.z/2)),y=Math.max(0,Math.min(H-H/v.z,v.y-H/v.z/2));host.style.width=canvas.clientWidth+'px';host.style.height=canvas.clientHeight+'px';host.style.top=canvas.offsetTop+'px';host.style.transform=editor.active?`translate(${-x/W*100*v.z}%,${-y/H*100*v.z}%) scale(${v.z})`:canvas.style.transform;
  masks();const used=new Set();
  for(const id of ['residential','public','ad-building','billboard']){const layer=editor.layers.find(l=>l.id===(id==='billboard'?'ad-building':id));if(finished.has(id)||!layer?.visible||!layer.opacity)continue;let geometry=STREET_HINT_CONTOURS[id];if(id==='billboard'){const o=data.items.find(o=>o.type==='billboard');if(!o?.visible)continue;geometry={viewBox:`0 0 ${W} ${H}`,path:'M'+o.corners.map(p=>p.join(',')).join(' L')+' Z'};}if(!geometry)continue;const b=bounds[layer.id];outline(id,geometry,{left:'0',top:'0',width:'100%',height:'100%',transformOrigin:`${b.x/W*100}% ${b.y/H*100}%`,transform:`translate(${layer.x/W*100}%,${layer.y/H*100}%) scale(${layer.scale})`,opacity:String(.65*layer.opacity)});used.add(id);}
  if(!finished.has('lamps'))getLamps().getHintGeometry().forEach((g,i)=>{const id='lamp-'+i;outline(id,{viewBox:'0 0 1536 1024',path:g.path},{left:g.x/W*100+'%',top:g.y/H*100+'%',width:1536*g.scale/W*100+'%',height:1024*g.scale/H*100+'%',opacity:'.65'});used.add(id);});
  for(const id of entries.keys())if(!used.has(id))dispose(id);else{const entry=entries.get(id);entry.wrapper.style.maskImage=maskURLs.get(id==='billboard'?'ad-building':id)||'none';}emphasis();
 }
 LightPollution.on(canvas,'streetnavigationchange',sync);
 LightPollution.on(window,'pagehide',e=>{if(!e.persisted){for(const id of entries.keys())dispose(id);host.remove();}});
 return {sync};
};

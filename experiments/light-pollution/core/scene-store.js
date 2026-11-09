/* Feature ports own typed values; this store owns document transactions and layer state. */
window.LightPollution.createSceneStore = function ({ W,H,specs,sceneId,storageKey,slices,compose }) {
  const LP=window.LightPollution, clone=v=>JSON.parse(JSON.stringify(v));
  const placed={environment:{x:0,y:-10,scale:1},trees:{x:8.5,y:-191.27,scale:1},'city-ground':{x:10.3,y:66.36,scale:1,visible:false},residential:{x:-30.08,y:-181.94,scale:1.5},public:{x:-190.5,y:15.41,scale:1},'ad-building':{x:-343.49,y:-211.2,scale:2.5},ground:{x:-1.06,y:40,scale:1}};
  const order=['environment','trees','city-ground','residential','public','ad-building','stadium','viaduct','ground','front-water','lamps'];
  const defaults=()=>{const layer=id=>{const p=placed[id]||{};return {id,x:0,y:0,scale:1,opacity:1,visible:true,locked:false,...p};};const known=new Set(specs.map(s=>s[0]));return order.filter(id=>known.has(id)).map(layer).concat(specs.map(s=>s[0]).filter(id=>!order.includes(id)).map(layer));};
  let layers=defaults(), revision=0, message=''; const listeners=new Set();
  const drafts=LP.createDraftStorage(storageKey);
  const codec=LP.createSceneCodec({W,H,sceneId,specs,slices});
  function withCityGround(doc){if(!specs.some(s=>s[0]==='city-ground')||!doc||!Array.isArray(doc.layers)||doc.layers.some(l=>l&&l.id==='city-ground'))return doc;const next=doc.layers.slice(),p=placed['city-ground'],before=order[order.indexOf('city-ground')-1],i=next.findIndex(l=>l.id===before);next.splice(i<0?0:i+1,0,{id:'city-ground',x:p.x,y:p.y,scale:p.scale,opacity:1,visible:false,locked:false});return Object.assign({},doc,{layers:next});}
  function withStadium(doc){if(!specs.some(s=>s[0]==='stadium')||!doc||!Array.isArray(doc.layers)||doc.layers.some(l=>l&&l.id==='stadium'))return doc;const next=doc.layers.slice(),ai=next.findIndex(l=>l.id==='ad-building'),gi=next.findIndex(l=>l.id==='ground'),at=ai>=0&&gi>ai?gi:ai>=0?ai+1:gi>=0?gi:next.length;next.splice(at,0,{id:'stadium',x:0,y:0,scale:1,opacity:1,visible:true,locked:false});return Object.assign({},doc,{layers:next});}
  function withViaduct(doc){if(!specs.some(s=>s[0]==='viaduct')||!doc||!Array.isArray(doc.layers)||doc.layers.some(l=>l&&l.id==='viaduct'))return doc;const next=doc.layers.slice(),si=next.findIndex(l=>l.id==='stadium'),gi=next.findIndex(l=>l.id==='ground'),at=si>=0&&gi>si?gi:si>=0?si+1:gi>=0?gi:next.length;next.splice(at,0,{id:'viaduct',x:0,y:0,scale:1,opacity:1,visible:true,locked:false});return Object.assign({},doc,{layers:next});}
  function withLamps(doc){if(!specs.some(s=>s[0]==='lamps')||!doc||!Array.isArray(doc.layers)||doc.layers.some(l=>l&&l.id==='lamps'))return doc;const next=doc.layers.concat([{id:'lamps',x:0,y:0,scale:1,opacity:1,visible:true,locked:false}]);return Object.assign({},doc,{layers:next});}
  function openDocument(doc){return withLamps(withViaduct(withStadium(withCityGround(doc))));}
  function snapshot() { return {layers:clone(layers),...Object.fromEntries(Object.entries(slices).map(([k,p])=>[k,p.getData()]))}; }
  function apply(value) { layers=clone(value.layers); for(const [k,p] of Object.entries(slices))p.setData(value[k]); }
  function notify() { revision++; for(const fn of listeners)fn(); compose(); }
  function save() { try { drafts.write(JSON.stringify(codec.encode(snapshot()))); message='草稿已保存到此浏览器 · 导出 JSON 可备份'; } catch { message='浏览器无法保存草稿，请导出 JSON 备份'; } }
  const history=LP.createHistory({snapshot,apply,assets:LP.createAssetRegistry(),changed(){save();notify();}});
  const store={get layers(){return layers;},get revision(){return revision;},get message(){return message;},history,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},snapshot,documentData:()=>codec.encode(snapshot()),
    changeExternal:history.change,beginExternal:history.begin,commitExternal:history.commit,cancelExternal:history.cancel,
    reset(){history.change(()=>{layers=defaults();Object.values(slices).forEach(p=>p.reset());});},
    async importDocument(doc){const next=await codec.prepare(openDocument(doc));history.change(()=>apply(next));},
    async restore(){try{const raw=drafts.read();if(raw){const next=await codec.prepare(openDocument(JSON.parse(raw)));apply(next);message='已恢复此浏览器的布局草稿';}}catch{message='草稿不可用，已使用初始构图';}notify();},
    destroy(){listeners.clear();history.destroy();}
  };return store;
};

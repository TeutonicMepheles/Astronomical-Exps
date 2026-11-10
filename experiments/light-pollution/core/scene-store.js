/* Feature ports own typed values; this store owns document transactions and layer state. */
window.LightPollution.createSceneStore = function ({ W,H,specs,sceneId,storageKey,slices,compose }) {
  const LP=window.LightPollution, clone=v=>JSON.parse(JSON.stringify(v));
  const defaults=()=>specs.map(([id])=>({id,x:0,y:0,scale:1,opacity:1,visible:true,locked:false}));
  let layers=defaults(), revision=0, message=''; const listeners=new Set();
  const drafts=LP.createDraftStorage(storageKey);
  const codec=LP.createSceneCodec({W,H,sceneId,specs,slices});
  function snapshot() { return {layers:clone(layers),...Object.fromEntries(Object.entries(slices).map(([k,p])=>[k,p.getData()]))}; }
  function apply(value) { layers=clone(value.layers); for(const [k,p] of Object.entries(slices))p.setData(value[k]); }
  function notify() { revision++; for(const fn of listeners)fn(); compose(); }
  function save() { try { drafts.write(JSON.stringify(codec.encode(snapshot()))); message='草稿已保存到此浏览器 · 导出 JSON 可备份'; } catch { message='浏览器无法保存草稿，请导出 JSON 备份'; } }
  const history=LP.createHistory({snapshot,apply,assets:LP.createAssetRegistry(),changed(){save();notify();}});
  const store={get layers(){return layers;},get revision(){return revision;},get message(){return message;},history,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},snapshot,documentData:()=>codec.encode(snapshot()),
    changeExternal:history.change,beginExternal:history.begin,commitExternal:history.commit,cancelExternal:history.cancel,
    reset(){history.change(()=>{layers=defaults();Object.values(slices).forEach(p=>p.reset());});},
    async importDocument(doc){const next=await codec.prepare(doc);history.change(()=>apply(next));},
    async restore(){try{const raw=drafts.read();if(raw){const next=await codec.prepare(JSON.parse(raw));apply(next);message='已恢复此浏览器的布局草稿';}}catch{message='草稿不可用，已使用初始构图';}notify();},
    destroy(){listeners.clear();history.destroy();}
  };return store;
};

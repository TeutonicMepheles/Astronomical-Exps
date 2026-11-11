window.LightPollution.createSceneCodec = function ({ W, H, sceneId, specs, slices }) {
  function validate(doc) {
    if(sceneId==='panorama-20261111'&&doc?.sceneId===sceneId&&Array.isArray(doc.layers)&&specs.some(s=>s[0]==='front-water')&&!doc.layers.some(l=>l.id==='front-water'))doc={...doc,layers:[...doc.layers,{id:'front-water',x:0,y:0,scale:1,opacity:1,visible:true,locked:false}]};
    if(sceneId==='panorama-20261111'&&doc?.sceneId===sceneId&&Array.isArray(doc.layers)&&specs.some(s=>s[0]==='promenade-rail')&&!doc.layers.some(l=>l.id==='promenade-rail')){
      const layers=[...doc.layers],index=layers.findIndex(l=>l.id==='trees-07');layers.splice(index<0?layers.length:index+1,0,{id:'promenade-rail',x:0,y:0,scale:1,opacity:1,visible:true,locked:false});doc={...doc,layers};
    }
    const farIds=['distant-mountains','distant-buildings','distant-viaduct'];
    if(sceneId==='panorama-20261111'&&doc?.sceneId===sceneId&&Array.isArray(doc.layers)&&farIds.every(id=>specs.some(s=>s[0]===id)&&!doc.layers.some(l=>l.id===id))){
      const environment=doc.layers.find(l=>l.id==='environment');
      if(environment){const layers=[...doc.layers],index=layers.findIndex(l=>l.id==='environment')+1;layers.splice(index,0,...farIds.map(id=>({...environment,id})));doc={...doc,layers};}
    }
    if(sceneId==='panorama-20261111'&&specs.some(s=>s[0]==='stadium')&&!specs.some(s=>s[0]==='floodlight-1')&&Array.isArray(doc?.layers)&&doc.layers.length===specs.length+4&&[1,2,3,4].every(i=>doc.layers.some(l=>l.id==='floodlight-'+i))){doc={...doc,layers:doc.layers.filter(l=>!/^floodlight-[1-4]$/.test(l.id)).map(l=>l.id==='stadium'?{...l,y:l.y+42*(1-l.scale)}:l)};}

    if (!doc || (doc.sceneId || 'legacy') !== sceneId || doc.format !== 'lib-static-layout' || ![1,2].includes(doc.version) || doc.width !== W || doc.height !== H || !Array.isArray(doc.layers) || doc.layers.length !== specs.length) throw Error('布局格式、版本或画布尺寸不匹配');
    const ids = new Set();
    const layers = doc.layers.map(l => {
      if (!l || !specs.some(s => s[0] === l.id) || ids.has(l.id)) throw Error('图层缺失、重复或未知'); ids.add(l.id);
      for (const [k,min,max] of [['x',-W*2,W*2],['y',-H*2,H*2],['scale',.1,4],['opacity',0,1]]) if (!Number.isFinite(l[k]) || l[k]<min || l[k]>max) throw Error('属性超出允许范围');
      if (typeof l.visible !== 'boolean' || typeof l.locked !== 'boolean' || (['front-water','back-water'].includes(l.id) && l.scale!==1)) throw Error('图层状态无效，水体必须保持原尺寸');
      const color={brightness:100,saturation:100,hue:0,...l.color};
      for(const [key,min,max] of [['brightness',0,200],['saturation',0,200],['hue',-180,180]])if(!Number.isFinite(color[key])||color[key]<min||color[key]>max)throw Error('调色参数超出允许范围');
      return {...Object.fromEntries(['id','x','y','scale','opacity','visible','locked'].map(k=>[k,l[k]])),...(l.color?{color:Object.fromEntries(['brightness','saturation','hue'].map(k=>[k,color[k]]))}:{})};
    });
    return { layers, ...Object.fromEntries(Object.entries(slices).map(([key,port])=>[key,port.validate(doc[key])])) };
  }
  return { validate, encode: state => ({format:'lib-static-layout',version:2,sceneId,width:W,height:H,...state}), async prepare(doc) { const next=validate(doc); await Promise.all(Object.entries(slices).map(([key,port])=>port.preload?.(next[key]))); return next; } };
};

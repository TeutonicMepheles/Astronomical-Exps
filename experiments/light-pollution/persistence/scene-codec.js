window.LightPollution.createSceneCodec = function ({ W, H, sceneId, specs, slices }) {
  function validate(doc) {
    if (!doc || (doc.sceneId || 'legacy') !== sceneId || doc.format !== 'lib-static-layout' || ![1,2].includes(doc.version) || doc.width !== W || doc.height !== H || !Array.isArray(doc.layers) || doc.layers.length !== specs.length) throw Error('布局格式、版本或画布尺寸不匹配');
    const ids = new Set();
    const layers = doc.layers.map(l => {
      if (!l || !specs.some(s => s[0] === l.id) || ids.has(l.id)) throw Error('图层缺失、重复或未知'); ids.add(l.id);
      for (const [k,min,max] of [['x',-W*2,W*2],['y',-H*2,H*2],['scale',.1,4],['opacity',0,1]]) if (!Number.isFinite(l[k]) || l[k]<min || l[k]>max) throw Error('属性超出允许范围');
      if (typeof l.visible !== 'boolean' || typeof l.locked !== 'boolean' || (['front-water','back-water'].includes(l.id) && l.scale!==1)) throw Error('图层状态无效，水体必须保持原尺寸');
      return Object.fromEntries(['id','x','y','scale','opacity','visible','locked'].map(k=>[k,l[k]]));
    });
    return { layers, ...Object.fromEntries(Object.entries(slices).map(([key,port])=>[key,port.validate(doc[key])])) };
  }
  return { validate, encode: state => ({format:'lib-static-layout',version:2,sceneId,width:W,height:H,...state}), async prepare(doc) { const next=validate(doc); await Promise.all(Object.entries(slices).map(([key,port])=>port.preload?.(next[key]))); return next; } };
};

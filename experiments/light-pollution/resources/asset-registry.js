/* Intern image payloads in historical snapshots; payloads remain at codec boundaries. */
window.LightPollution.createAssetRegistry = function () {
  const byValue = new Map(), byId = new Map(); let next = 0;
  function pack(value) {
    if (typeof value === 'string' && /^data:image\//.test(value)) {
      let id = byValue.get(value); if (!id) { id = `image-${++next}`; byValue.set(value, id); byId.set(id, value); }
      return { $asset: id };
    }
    if (Array.isArray(value)) return value.map(pack);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,pack(v)]));
    return value;
  }
  function unpack(value) {
    if (value && typeof value === 'object' && Object.keys(value).length === 1 && value.$asset) {
      if (!byId.has(value.$asset)) throw Error('Missing historical image'); return byId.get(value.$asset);
    }
    if (Array.isArray(value)) return value.map(unpack);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,unpack(v)]));
    return value;
  }
  function collect(roots) {
    const used = new Set();
    function visit(v) { if (!v || typeof v !== 'object') return; if (v.$asset) used.add(v.$asset); else Object.values(v).forEach(visit); }
    roots.forEach(visit);
    for (const [id, value] of byId) if (!used.has(id)) { byId.delete(id); byValue.delete(value); }
  }
  return { pack, unpack, collect, get size() { return byId.size; }, destroy() { byId.clear(); byValue.clear(); } };
};

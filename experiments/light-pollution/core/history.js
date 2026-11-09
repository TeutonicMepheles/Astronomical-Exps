window.LightPollution.createHistory = function ({ snapshot, apply, changed, assets, limit = 100 }) {
  const undo = [], redo = []; const pending = new Set();
  function begin() { const token = assets.pack(snapshot()); pending.add(token); return token; }
  function collect() { assets.collect([...undo, ...redo, ...pending, assets.pack(snapshot())]); }
  function commit(before) {
    pending.delete(before);
    if (JSON.stringify(before) !== JSON.stringify(assets.pack(snapshot()))) { undo.push(before); if (undo.length > limit) undo.shift(); redo.length = 0; }
    collect(); changed();
  }
  function cancel(before) { pending.delete(before); apply(assets.unpack(before)); collect(); changed(); }
  function travel(from, to) { if (!from.length || pending.size) return; to.push(assets.pack(snapshot())); apply(assets.unpack(from.pop())); collect(); changed(); }
  return { begin, commit, cancel, change(fn) { const before = begin(); try { fn(); commit(before); } catch (error) { cancel(before); throw error; } }, undo: () => travel(undo, redo), redo: () => travel(redo, undo), get canUndo() { return !!undo.length; }, get canRedo() { return !!redo.length; }, get busy() { return pending.size > 0; }, destroy() { undo.length=redo.length=0; pending.clear(); assets.destroy(); } };
};

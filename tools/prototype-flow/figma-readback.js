// Read only. Run after build in the SAME Figma file through the verified tool.
(async () => {
  const spec = __SPEC_JSON__;
  const digest = __DIGEST_JSON__;
  const pages = figma.root.children.filter(p => {
    const raw = p.getPluginData("astronomical-prototype-v1");
    if (!raw) return false;
    try { return JSON.parse(raw).digest === digest; } catch (_) { return false; }
  });
  if (pages.length !== 1) throw new Error("Expected exactly one page for this digest; found " + pages.length);
  const page = pages[0];
  if (typeof page.loadAsync === "function") await page.loadAsync();
  function descendants(node) {
    return [node, ...("children" in node ? node.children.flatMap(descendants) : [])];
  }
  function label(node, name) {
    const found = descendants(node).find(n => n.type === "TEXT" && n.name === name);
    return found ? found.characters : null;
  }
  function effective(node, property, fallback) {
    let value = fallback;
    for (let n = node; n && n.type !== "DOCUMENT"; n = n.parent) {
      if (property === "visible" && n.visible === false) return false;
      if (property === "opacity" && typeof n.opacity === "number") value *= n.opacity;
    }
    return value;
  }
  function texts(frame) {
    return descendants(frame).filter(n => n.type === "TEXT").map(t => ({
      key: t.name === "label" ? t.parent.getPluginData("control_id") : t.name,
      characters: t.characters, effective_visible: effective(t, "visible", true),
      effective_opacity: effective(t, "opacity", 1),
      within_parent: t.x >= 0 && t.y >= 0 && t.x + t.width <= t.parent.width + 1 && t.y + t.height <= t.parent.height + 1
    }));
  }
  function paints(node) {
    return descendants(node).flatMap(n => ["fills", "strokes"].flatMap(k => Array.isArray(n[k]) ? n[k].filter(p => p.visible !== false).map(p => ({ type: p.type, color: p.color || null })) : []));
  }
  const frames = page.children.filter(n => n.getPluginData("state_id")).map(f => ({
    state_id: f.getPluginData("state_id"), node_id: f.id, width: f.width, height: f.height, visible: effective(f, "visible", true), effective_opacity: effective(f, "opacity", 1),
    title: label(f, "title"), body: label(f, "body"), scene: label(f, "scene"), paints: paints(f), texts: texts(f),
    controls: f.children.filter(n => n.getPluginData("control_id")).map(c => ({
      control_id: c.getPluginData("control_id"), node_id: c.id, label: label(c, "label"),
      visible: effective(c, "visible", true), effective_opacity: effective(c, "opacity", 1), x: c.x, y: c.y, width: c.width, height: c.height,
      reactions: JSON.parse(JSON.stringify(c.reactions || []))
    }))
  }));
  return JSON.stringify({ schema_version: 1, kind: "figma-live-readback", artifact_digest: digest,
    prototype_version: spec.version, file_key: figma.fileKey || null, page_id: page.id,
    captured_at: new Date().toISOString(), flow_starting_points: page.flowStartingPoints, frames });
})()

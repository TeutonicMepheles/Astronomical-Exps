// Local API contract simulation only. Never produces live Figma evidence.
const fs = require('node:fs');
const vm = require('node:vm');
let sequence = 0;
const all = [];
class Node {
  constructor(type) {
    this.type = type; this.id = String(++sequence); this.name = ''; this.children = [];
    this.data = {}; this.visible = true; this.fills = []; this.strokes = [];
    this.reactions = []; this.x = 0; this.y = 0; all.push(this);
  }
  appendChild(node) {
    if (node.parent) node.parent.children = node.parent.children.filter(n => n !== node);
    node.parent = this; this.children.push(node);
  }
  resize(width, height) { this.width = width; this.height = height; }
  setPluginData(k, v) { this.data[k] = v; }
  getPluginData(k) { return this.data[k] || ''; }
  async setReactionsAsync(reactions) { this.reactions = JSON.parse(JSON.stringify(reactions)); }
  async loadAsync() {}
}
const root = new Node('DOCUMENT');
const figma = {
  root, fileKey: 'MOCK-NOT-A-REAL-FIGMA-FILE',
  createPage() { const p = new Node('PAGE'); root.appendChild(p); return p; },
  createFrame() { const n = new Node('FRAME'); if (this.currentPage) this.currentPage.appendChild(n); return n; },
  createText() { const n = new Node('TEXT'); if (this.currentPage) this.currentPage.appendChild(n); return n; },
  async setCurrentPageAsync(p) { this.currentPage = p; },
  async listAvailableFontsAsync() { return [{fontName: {family: 'Inter', style: 'Regular'}}]; },
  async loadFontAsync() {},
  viewport: {scrollAndZoomIntoView() {}}
};
(async () => {
  const [buildPath, readPath, outPath, mode] = process.argv.slice(2);
  const build = fs.readFileSync(buildPath, 'utf8');
  const readback = fs.readFileSync(readPath, 'utf8');
  const context = vm.createContext({figma});
  const result = JSON.parse(await vm.runInContext(build, context));
  if (result.status !== 'built_not_evaluated') throw Error('Build must not claim evaluation');
  if (mode === 'duplicate') {
    let failed = false;
    try { await vm.runInContext(build, context); } catch (e) { failed = e.message.includes('already exists'); }
    if (!failed || root.children.length !== 1) throw Error('Duplicate page protection failed');
  }
  if (mode === 'broken-link') all.find(n => n.getPluginData('control_id')).reactions = [];
  if (mode === 'hidden-text') all.find(n => n.type === 'TEXT').visible = false;
  if (mode === 'opacity') all.find(n => n.getPluginData('control_id')).opacity = 0;
  if (mode === 'color') all.find(n => n.getPluginData('state_id')).fills = [{type: 'SOLID', color: {r: 1, g: 0, b: 0}}];
  const evidence = JSON.parse(await vm.runInContext(readback, context));
  evidence.kind = 'mock-figma-readback';
  fs.writeFileSync(outPath, JSON.stringify(evidence), 'utf8');
})().catch(e => { console.error(e); process.exit(1); });

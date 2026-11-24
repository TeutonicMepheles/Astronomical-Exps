const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {shadows,candidates}=require('../src/rim-measurement.js');
const synthetic={size:320,segments:400,contains:(x,z)=>Math.abs(x)<159&&Math.abs(z)<159,
  heightAt:x=>Math.max(0,24-Math.abs(x-55)*3,24-Math.abs(x+55)*3)};
const flat={...synthetic,heightAt:()=>0};
assert.deepEqual(shadows(flat,0,35),[],'Flat lit ground cannot produce candidates');
const pair=shadows(synthetic,0,35);
assert.equal(pair.length,2,'Both left and right ridges cast independent shadows');
for(const p of pair){
  assert(p.a.x>p.b.x,'B is down-sun, never on the lit side');
  assert(Math.abs(p.length-(p.a.x-p.b.x))<1e-9);
  assert(Math.abs(p.a.y-p.b.y-p.length*Math.tan(35*Math.PI/180))<.001);
}
const clipped={...synthetic,contains:x=>x>-60&&x<159};
assert.equal(shadows(clipped,0,35).length,1,'Do not invent a B outside measured terrain');
const context={window:{},atob};vm.createContext(context);
for(const file of ['assets/reference-terrain.js','src/reference-terrain.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const terrain=context.window.LunarReferenceTerrain;
const actual=candidates(terrain,110,35);
assert(actual.length>0&&actual.every(p=>p.side==='right'),'Only the right rim offers measurement candidates');
assert(actual.length<=24,'Finite, spaced candidates');
for(const p of actual){
  assert(Math.abs(Math.hypot(p.a.x,p.a.z)-110)<=12);
  assert(terrain.contains(p.a.x,p.a.z)&&terrain.contains(p.b.x,p.b.z));
  assert(p.length>=8);
  const slope=Math.tan(35*Math.PI/180);
  assert(Math.abs(p.a.y-p.b.y-p.length*slope)<.002,'B must meet the ray from this A');
  for(let x=p.a.x+.8;x<160;x+=.8){
    assert(terrain.heightAt(x,p.a.z)<=p.a.y+slope*(x-p.a.x)+.03,'A must see the sun');
  }
  for(let x=p.b.x+.8;x<p.a.x-.8;x+=.8){
    assert(terrain.heightAt(x,p.a.z)<p.a.y+slope*(x-p.a.x)+.03,'The A-B interval is shadowed by A');
  }
}
assert.equal(candidates(terrain,110,70).length,0,'No forced choices at a no-shadow angle');
assert.equal(candidates(terrain,70,35).length,0,'A misplaced outline cannot select interior terrain');
console.log('PASS bilateral ridge shadows, sun visibility, first ray contact, outline band, clear-shadow filtering and finite source bounds.',{candidates:actual.length});

const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{const {TAU,annualAngle,calendarLabel,upcoming,moonBasis,eventContacts}=await import('./js/overview-state.mjs');
const context={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/js/eclipse-model.js','utf8'),context);const M=context.window.EclipseModel;
assert.equal(calendarLabel(0),'1月1日');assert.equal(calendarLabel(364),'12月31日');assert.equal(calendarLabel(59),'3月1日');
M.setNodeAngle(0);assert.equal(upcoming(M,170*M.DEG,0).mode,'solar');assert.equal(upcoming(M,350*M.DEG,0).mode,'lunar');
for(const angle of [90,181,270,20])assert.equal(upcoming(M,angle*M.DEG,0),null);
M.setNodeAngle(-Math.PI/2);for(const angle of [170,180,350,360])assert.equal(upcoming(M,angle*M.DEG,Math.PI/2),null,'off-node syzygies must not prompt');
const identity=p=>[p.x,p.y,p.z],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(const day of [0,40,91,182,364]){const y=annualAngle(day);M.setNodeAngle(-y);for(const phi of [0,.5,Math.PI,5.7]){
 const b=moonBasis(phi+y,M.INCLINATION,identity),m=M.moonAt(phi),world=[m.x*Math.cos(y)-m.y*Math.sin(y),m.x*Math.sin(y)+m.y*Math.cos(y),m.z];
 assert.ok(b.e2.reduce((sum,v,i)=>sum+v*world[i]/M.ORBIT,0)<-.999999,'same lunar meridian must face Earth');
 cross(b.e2,b.e3).forEach((v,i)=>assert.ok(Math.abs(v-b.axis[i])<1e-9,'right handed sphere basis'));
}}
for(const mode of ['solar','lunar']){M.setNodeAngle(0);const nodes=eventContacts(M,mode);assert.deepEqual(nodes.map(n=>n.name),['初亏','食既','食甚','生光','复圆']);for(let i=1;i<nodes.length;i++)assert.ok(nodes[i].phi>nodes[i-1].phi);const preset=M.nodes(mode);nodes.forEach((n,i)=>assert.ok(Math.abs(n.phi-preset[i].phi)<1e-6,'restored nodes match existing aligned geometry'));}
M.setNodeAngle(-.13);for(const mode of ['solar','lunar']){const nodes=eventContacts(M,mode);for(const n of nodes.filter(n=>['初亏','复圆'].includes(n.name))){const s=M.solarSky(n.phi);const gap=mode==='solar'?s.sep-s.moonR-s.sunR:M.lunarGap(n.phi,false);assert.ok(Math.abs(gap)<1e-8,'contacts use current orientation');}}
console.log('PASS calendar bounds, forward-only solar/lunar tips, off-node exclusion, synchronous lunar basis and handedness.');})();

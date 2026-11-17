const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const context={window:{},atob};vm.createContext(context);
for(const file of ['assets/reference-terrain.js','src/reference-terrain.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const terrain=context.window.LunarReferenceTerrain;
const source=fs.readFileSync(path.join(root,terrain.metadata.source));
assert.equal(crypto.createHash('sha256').update(source).digest('hex'),terrain.metadata.sha256,'Regenerate terrain after replacing the source GLB');
const length=source.readUInt32LE(12),gltf=JSON.parse(source.subarray(20,20+length));
const accessor=gltf.accessors[0],view=gltf.bufferViews[accessor.bufferView];
const offset=28+length+(view.byteOffset||0)+(accessor.byteOffset||0),errors=[];
// Independent barycentric centroid on original source triangles, including irregular
// rim, floor and small craters. Compare only measured surface, not the visual apron.
for(let k=0;k<accessor.count;k+=3*137){
  const points=Array.from({length:9},(_,j)=>source.readFloatLE(offset+(k*3+j)*4));
  const [ax,ay,az,bx,by,bz,cx,cy,cz]=points;
  if((bx-ax)*(cy-ay)-(by-ay)*(cx-ax)<=1e-9)continue;
  const scale=terrain.metadata.uniformScale,x=(ax+bx+cx)/3*scale,z=-(ay+by+cy)/3*scale;
  if(!terrain.contains(x,z))continue;
  const expected=((az+bz+cz)/3-terrain.metadata.sourceDatum)*scale;
  errors.push(Math.abs(terrain.heightAt(x,z)-expected));
}
assert(errors.length>1500);
// Conversion regression bound in MODEL units, not a scientific accuracy claim.
assert(Math.max(...errors)<.2,'Surface conversion changed the source shape');
assert.equal(terrain.contains(0,0),true);
assert.equal(terrain.contains(159,159),false,'Visual apron cannot be measured');
assert.equal(terrain.contains(161,0),false);
for(const x of [-160,-100,0,100,160])for(const z of [-160,-100,0,100,160])assert(Number.isFinite(terrain.heightAt(x,z)));
console.log('PASS source identity, upper-surface shape, coordinate mapping, finite apron and measurement mask',{
  samples:errors.length,maxHeightError:Math.max(...errors),rmsHeightError:Math.sqrt(errors.reduce((sum,x)=>sum+x*x,0)/errors.length)
});

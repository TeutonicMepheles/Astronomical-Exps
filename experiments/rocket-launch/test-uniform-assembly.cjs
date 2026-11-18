const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage(),errors=[],results=[],out=path.join(__dirname,'docs/review/assembly-uniform-20261117');fs.mkdirSync(out,{recursive:true});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.setViewportSize({width:1920,height:1080});await p.goto(((process.env.TEST_ORIGIN||'http://127.0.0.1:9041')+'/experiments/rocket-launch/'));await p.getByRole('button',{name:'结构与组装'}).click();await p.waitForFunction(()=>RocketChapter3.adapter.blueprint?.images.assembly);await p.locator('#next').click();await p.waitForFunction(()=>!RocketChapter3.adapter.assemblyMotion);
 for(const [width,height]of [[1920,1080],[1600,900],[1024,768]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(150);
  const state=await p.evaluate(async()=>{
   const T=await import('./vendor/three/three.module.js'),a=RocketChapter3.adapter,names=['Stage1','Stage2','Boosters','Payload','Fairing'],rows=names.map(n=>({name:n,scale:a.nodes[n].getWorldScale(new T.Vector3()).toArray()}));
   for(const [n,o]of a.assemblyParts.nodes)rows.push({name:n,scale:o.getWorldScale(new T.Vector3()).toArray()});
   const left=a.blueprint.project(200,200),right=a.blueprint.project(1800,200),horizontal=Math.abs(left.y-right.y),axes=names.map(n=>{const o=a.nodes[n],p=o.localToWorld(new T.Vector3(0,0,0)).project(a.camera),q=o.localToWorld(new T.Vector3(0,1,0)).project(a.camera);return Math.abs(q.y-p.y);});
   return {rows,horizontal,axes,expected:a.assemblyDisplayScale(),groups:a.nodes.Boosters.children.filter(o=>/^Booster0[1-4]$/.test(o.name)).length};
  });
  assert.equal(state.rows.length,15);assert.equal(state.groups,4);assert(state.horizontal<1e-6);assert(state.axes.every(v=>v<1e-6));assert(state.rows.every(r=>r.scale.every(v=>Math.abs(v-state.expected)<1e-6)),JSON.stringify(state));
  results.push({width,height,...state});await p.screenshot({path:path.join(out,'uniform-'+width+'.png')});
 }
 await p.getByRole('button',{name:'蓝图：二级芯级箭体',exact:true}).click();await p.getByRole('button',{name:'安装二级芯级箭体',exact:true}).click();
 assert(await p.evaluate(()=>RocketChapter3.adapter.nodes.Stage2.scale.toArray().every(v=>Math.abs(v-1)<1e-6)),'installed module restores source scale');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'uniform-layout.json'),JSON.stringify({results,errors},null,2));console.log('PASS 15 pieces at one scale after live resizing, five horizontal module axes, horizontal paper rows, four boosters and source scale restored on install');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});

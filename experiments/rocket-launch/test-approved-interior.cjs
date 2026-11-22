const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'assets/cz7-kiu-20261116/rocket-manifest.json'))),out=path.join(__dirname,'docs/review',manifest.blueprintRevision||manifest.modelRevision);fs.mkdirSync(out,{recursive:true});
 assert.equal(manifest.modelRevision,manifest.approvedInterior.modelRevision||'approved-interior-20261117');
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const p=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],responses=[],modelHashes=[];
  // Retain the bytes actually fulfilled to the page: large GLBs may be evicted from
  // Chrome's inspector response cache before the assembly interactions finish.
  await p.route('**/*.glb*',async route=>{const response=await route.fetch(),body=await response.body();modelHashes.push(crypto.createHash('sha256').update(body).digest('hex'));await route.fulfill({response,body});});
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(new URL(r.url()).pathname.endsWith('.glb'))responses.push(r);});
  await p.goto(((process.env.TEST_ORIGIN||'http://127.0.0.1:9041')+'/experiments/rocket-launch/?v=approved-interior-20261117'));
  await p.getByRole('button',{name:'结构与组装'}).click();await p.locator('#steps').getByRole('button',{name:'认识与组装火箭',exact:true}).click();await p.waitForFunction(()=>RocketChapter3.adapter.ready&&RocketChapter3.adapter.blueprint.images.assembly);
  await p.evaluate(()=>{const a=RocketChapter3.adapter;window.approvedIntegrationSource=a.model;window.approvedIntegrationNodes=Object.fromEntries(['Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank','Payload'].map(n=>[n,a.nodes[n]]));});
  await p.getByRole('button',{name:'蓝图：一级液氧贮箱',exact:true}).click();
  assert(await p.evaluate(()=>RocketChapter3.adapter.xraySaved.size>0));await p.screenshot({path:path.join(out,'recognition.png')});
  await p.getByRole('button',{name:'关闭部件详情',exact:true}).click();
  await p.locator('#next').click();await p.waitForFunction(()=>RocketChapter3.adapter.mode==='assembly'&&!RocketChapter3.adapter.assemblyMotion);
  const shared=await p.evaluate(()=>{
   const a=RocketChapter3.adapter,rows=[];
   for(const [name,copy]of a.assemblyParts.nodes){
    const meshes=node=>{const result=[];node.traverse(o=>{if(o.isMesh&&!o.userData.scan&&!a.effects.some(e=>e.group===o.parent))result.push(o);});return result;};
    const original=meshes(a.nodes[name]),cloned=meshes(copy);
    rows.push({name,shared:original.length===cloned.length&&original.every((m,i)=>m.geometry===cloned[i].geometry&&m.material===cloned[i].material)});
   }
   return {sameModel:a.model===window.approvedIntegrationSource,sameNodes:Object.entries(window.approvedIntegrationNodes).every(([n,o])=>a.nodes[n]===o),rows};
  });
  assert(shared.sameModel&&shared.sameNodes);assert.equal(shared.rows.length,10);assert(shared.rows.every(r=>r.shared),JSON.stringify(shared));
  await p.screenshot({path:path.join(out,'assembly.png')});
  await p.getByRole('button',{name:'蓝图：二级芯级箭体',exact:true}).click();await p.getByRole('button',{name:'安装二级芯级箭体',exact:true}).click();
  await p.getByRole('button',{name:'蓝图：二级煤油贮箱',exact:true}).click();assert(await p.evaluate(()=>RocketChapter3.adapter.xraySaved.size>0));
  await p.screenshot({path:path.join(out,'assembly-installed-inspection.png')});
  await p.getByRole('button',{name:'关闭部件详情',exact:true}).click();
  await p.getByRole('button',{name:'重新组装',exact:true}).click();await p.waitForFunction(()=>!RocketChapter3.adapter.assemblyMotion);
  assert(await p.evaluate(()=>RocketChapter3.adapter.model===window.approvedIntegrationSource));assert.deepEqual(await p.evaluate(()=>RocketChapter3.assembled),[]);
  assert.equal(responses.length,1,'recognition and assembly reuse a single GLB load');
  const modelResponse=responses[0];assert.equal(new URL(modelResponse.url()).searchParams.get('v'),manifest.modelRevision);
  assert.deepEqual(modelHashes,[manifest.approvedInterior.sha256]);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'integration.json'),JSON.stringify({revision:manifest.modelRevision,sha256:manifest.approvedInterior.sha256,modelRequests:responses.length,shared,errors},null,2));
  console.log('PASS approved GLB response hash/revision, one load across recognition/assembly/reset, ten shared geometry/material copies, installed-stage cutaway and zero errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

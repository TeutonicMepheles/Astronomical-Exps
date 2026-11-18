const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage(),root=path.join(__dirname,'assets'),policy=JSON.parse(fs.readFileSync(path.join(root,'cz7-kiu-20261116/interior-layout-policy.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'cz7-kiu-20261116/rocket-manifest.json')));
 for(const file of ['01-recognition','02-assembly']){
  await p.goto(((process.env.TEST_ORIGIN||'http://127.0.0.1:9041')+'/experiments/rocket-launch/assets/blueprint-flat/')+file+'-ink.svg?v='+manifest.blueprintRevision);
  const rows=await p.evaluate(()=>[...document.querySelectorAll('use[data-ring-count]')].map(use=>{const href=use.getAttributeNS('http://www.w3.org/1999/xlink','href'),name=href.slice(3),path=document.querySelector(href),shape=[...document.querySelectorAll('use.part')].find(o=>o.getAttributeNS('http://www.w3.org/1999/xlink','href')==='#p-'+name);return{name,count:Number(use.dataset.ringCount),d:path.getAttribute('d'),clip:use.getAttribute('clip-path'),fill:shape.style.fill,stroke:shape.style.stroke};}));
  assert.equal(rows.length,4);
  for(const row of rows){assert.equal(row.count,policy.tanks[row.name].ringCentres.length);assert(row.d.length>40);assert(!/NaN|Infinity/.test(row.d));assert(row.clip.includes(row.name));}
  assert.notEqual(rows.find(r=>r.name.includes('LOX')).fill,rows.find(r=>r.name.includes('Fuel')).fill);
 }
 const fills=JSON.parse(fs.readFileSync(path.join(root,'blueprint-flat/fill-contours.json')));assert.equal(fills.phases.assembly.length,15,'five grouped modules and ten internal pieces; clip definitions are not placements');assert.equal(fills.phases.recognition.length,26);
 await p.goto(((process.env.TEST_ORIGIN||'http://127.0.0.1:9041')+'/experiments/rocket-launch/?v=')+manifest.blueprintRevision);await p.getByRole('button',{name:'结构与组装'}).click();await p.waitForFunction(()=>RocketChapter3.adapter.blueprint?.images.assembly);
 const versions=await p.evaluate(()=>['recognition','assembly'].map(phase=>new URL(RocketChapter3.adapter.blueprint.images[phase].src).searchParams.get('v')));assert.deepEqual(versions,[manifest.blueprintRevision,manifest.blueprintRevision]);
 console.log('PASS both blueprint palettes, 10/7/4/2 ring detail paths/clips, no phantom hit fills and current runtime image revisions');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});

const {chromium}=require('playwright'),assert=require('node:assert/strict');
const BASE=process.env.ROCKET_BASE||'http://127.0.0.1:9036/experiments/rocket-launch/';
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const records=[{thrust:2,mass:1,load:1,distance:70},{thrust:1,mass:2,load:3,metric:'flight-distance',distance:42},{thrust:3,mass:2,load:1,metric:'flight-height',height:65},...Array.from({length:5},(_,i)=>({thrust:1,mass:1,load:1,metric:'flight-height',height:80+i}))];
 const p=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(records=>localStorage.setItem('rocket-records-v1',JSON.stringify(records)),records);
 await p.goto(BASE);await p.locator('#next').click();await p.getByRole('button',{name:'查看发射记录'}).click();
 assert.equal(await p.locator('#recordList tbody tr').count(),2);await p.getByRole('button',{name:'上一页',exact:true}).click();
 assert.deepEqual(await p.locator('#recordList th').allTextContents(),['次数','推力','自重','载荷','高度（示意格）','历史距离（示意格）','旧版高度（示意）']);
 const rows=await p.locator('#recordList tbody tr').evaluateAll(rows=>rows.map(r=>[...r.cells].map(c=>c.textContent)));
 assert.deepEqual(rows[0].slice(4),['—','—','70']);assert.deepEqual(rows[1].slice(4),['—','42','—']);assert.deepEqual(rows[2].slice(4),['65','—','—']);
 await p.getByRole('button',{name:'下一页',exact:true}).click();assert.equal(await p.locator('#recordList tbody tr').count(),2);
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('rocket-records-v1'))),records,'viewing/paging never relabels or rewrites saved metrics');
 assert.deepEqual(errors,[]);console.log('PASS legacy untyped height, typed distance/current height, pagination and unchanged stored records');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

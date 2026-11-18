const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.TEST_ORIGIN||'http://127.0.0.1:9041')+'/experiments/rocket-launch/');
  await page.waitForFunction(()=>Boolean(window.RocketChapter3));await page.evaluate(()=>document.fonts.ready);
  const destinations=[['推力与起飞','气球反作用力'],['推力与起飞','推力与载荷'],['速度与轨道','高山大炮'],['速度与轨道','垂直发射'],['结构与组装','认识与组装火箭'],['结构与组装','分级分离'],['结构与组装','为什么要分级']];
  for(const [width,height]of [[1920,1080],[1600,900],[1024,768]]){
   await page.setViewportSize({width,height});
   for(const [chapter,step]of destinations){
    await page.locator('#chapters > button').nth(['推力与起飞','速度与轨道','结构与组装'].indexOf(chapter)).click();
    await page.locator('#steps').getByRole('button',{name:step,exact:true}).click();
    await page.waitForFunction(()=>![2,6,8,9].includes(RocketChapter3.step)||RocketChapter3.adapter.ready);
    const report=await page.evaluate(async()=>{
     const {auditControls}=await import('./interaction-contract.js');
     const buttons=[...document.querySelectorAll('#controls button,#scene-controls button')].filter(e=>e.checkVisibility());
     const boxes=buttons.map(b=>({label:b.textContent,...b.getBoundingClientRect().toJSON()})),overlaps=[];
     for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1)overlaps.push([a.label,b.label]);}
     return{audit:auditControls(document.querySelector('#app')),overlaps,outside:boxes.filter(b=>b.x<0||b.y<0||b.right>innerWidth+1||b.bottom>innerHeight+1),scroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};
    });
    assert.deepEqual(report,{audit:[],overlaps:[],outside:[],scroll:false},step+' '+width);
   }
  }
  const negative=await page.evaluate(async()=>{const {createControlGroup,markSwitch,auditControls}=await import('./interaction-contract.js');const root=document.createElement('div'),group=createControlGroup(root,{label:'fixture',kind:'action'}),button=document.createElement('button');group.append(button);markSwitch(button,false);return auditControls(root);});
  assert(negative.some(s=>s.includes('Mixed controls')));assert.deepEqual(errors,[]);
  console.log('PASS 21 current page/viewport control layouts, semantic groups, no overlap/overflow and negative semantic fixture');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

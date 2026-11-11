/* Newton task cards and the header check feedback. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),evidence=path.resolve(__dirname,'../review/task-progress-20261110');
(async()=>{let server,browser;try{
  fs.mkdirSync(evidence,{recursive:true});
  let url=process.env.EXPERIMENT_URL;
  if(!url){
    server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
    url=await new Promise((resolve,reject)=>{
      let output='';const timer=setTimeout(()=>reject(Error('server timeout')),15000);
      server.on('error',reject);server.stdout.on('data',chunk=>{
        output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);
        if(match){clearTimeout(timer);resolve(match[0]);}
      });
    });
  }
  browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>errors.push(request.url()));
  await page.goto(url);await page.waitForSelector('.newton-task-progress__toggle');
  await page.locator('.newton-task-progress__toggle').click();
  const cards=page.locator('.newton-task-progress__tab');
  assert.equal(await cards.count(),3);
  assert.deepEqual(await cards.locator('strong').allTextContents(),['认识五种镜片','组装牛顿望远镜','完成三档目镜观测']);
  assert.deepEqual(await cards.locator('.newton-task-progress__count').allTextContents(),['0 / 5','0 / 2','0 / 3']);
  const styles=await cards.evaluateAll(nodes=>nodes.map(node=>({
    title:parseFloat(getComputedStyle(node.querySelector('strong')).fontSize),
    count:parseFloat(getComputedStyle(node.querySelector('.newton-task-progress__count')).fontSize),
    border:getComputedStyle(node).borderColor
  })));
  assert(styles.every(style=>style.title>=26&&style.count>=26),'stage goals and counts use large text');
  assert.equal(styles[0].border,'rgb(74, 157, 224)','active card uses the blue emphasis');
  const popup=await page.locator('.newton-task-progress__popup').boundingBox();
  assert(popup.x>=0&&popup.y>=0&&popup.x+popup.width<=1600&&popup.y+popup.height<=900,'menu stays inside the 16:9 stage');
  await page.locator('[data-step=assembly]').click({force:true});
  assert.match(await page.locator('.newton-task-progress__message').innerText(),/先认识五类镜片/);
  await page.screenshot({path:path.join(evidence,'menu.png')});

  const progress=page.locator('.newton-task-progress');
  await page.evaluate(()=>Newton.courseInteractions.progress.setState({
    activeId:'mirrors',
    steps:[
      {id:'mirrors',label:'认识五种镜片',current:4,total:5,completed:false},
      {id:'assembly',label:'组装牛顿望远镜',current:0,total:2,completed:false,locked:true},
      {id:'observation',label:'完成三档目镜观测',current:0,total:3,completed:false,locked:true}
    ]
  }));
  await page.evaluate(()=>Newton.courseInteractions.progress.setState({
    activeId:'mirrors',
    steps:[
      {id:'mirrors',label:'认识五种镜片',current:5,total:5,completed:true},
      {id:'assembly',label:'组装牛顿望远镜',current:0,total:2,completed:false,locked:true},
      {id:'observation',label:'完成三档目镜观测',current:0,total:3,completed:false,locked:true}
    ]
  }));
  const toggle=page.locator('.newton-task-progress__toggle');
  assert(await toggle.evaluate(node=>node.classList.contains('is-complete')&&node.classList.contains('is-checking')));
  assert.equal(await page.locator('[data-step=mirrors]').evaluate(node=>node.classList.contains('is-newly-complete')),true);
  assert.notEqual(await toggle.evaluate(node=>getComputedStyle(node.querySelector('.newton-task-progress__check')).animationName),'none');
  await page.screenshot({path:path.join(evidence,'completion-check.png')});
  await page.waitForTimeout(1150);
  assert.equal(await toggle.evaluate(node=>node.classList.contains('is-checking')),false);
  assert.equal(await toggle.evaluate(node=>getComputedStyle(node.querySelector('.newton-task-progress__check')).opacity),'1');

  await page.evaluate(()=>Newton.courseInteractions.progress.setState({
    activeId:'mirrors',
    steps:[
      {id:'mirrors',label:'认识五种镜片',current:4,total:5,completed:false},
      {id:'assembly',label:'组装牛顿望远镜',current:0,total:2,completed:false,locked:true},
      {id:'observation',label:'完成三档目镜观测',current:0,total:3,completed:false,locked:true}
    ]
  }));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>Newton.courseInteractions.progress.setState({
    activeId:'mirrors',
    steps:[
      {id:'mirrors',label:'认识五种镜片',current:5,total:5,completed:true},
      {id:'assembly',label:'组装牛顿望远镜',current:0,total:2,completed:false,locked:true},
      {id:'observation',label:'完成三档目镜观测',current:0,total:3,completed:false,locked:true}
    ]
  }));
  assert.equal(await toggle.evaluate(node=>getComputedStyle(node.querySelector('.newton-task-progress__check')).animationName),'none');
  assert.equal(await toggle.evaluate(node=>getComputedStyle(node.querySelector('.newton-task-progress__check')).opacity),'1');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({pass:true,viewport:'1600x900',labels:['认识五种镜片','组装牛顿望远镜','完成三档目镜观测'],checks:['large labels/counts','active border','locked reason','header completion animation','reduced motion'],errors},null,2));
  console.log('PASS: large task cards, aligned counts, locked reason, header completion animation and reduced motion.');
}finally{await browser?.close();server?.kill();}})().catch(error=>{console.error(error);process.exitCode=1;});

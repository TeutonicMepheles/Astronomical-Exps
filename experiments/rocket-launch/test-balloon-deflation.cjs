const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 await page.goto(process.env.ROCKET_BASE||'http://127.0.0.1:9013/experiments/rocket-launch/');
 const sample=()=>page.locator('#scene').evaluate(c=>{
  const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const mask=new Uint8Array(c.width*c.height),stack=new Int32Array(mask.length);
  for(let n=0;n<mask.length;n++){const i=n*4,r=data[i],g=data[i+1],b=data[i+2];mask[n]=data[i+3]>100&&b>140&&b>r*1.15&&b>g*1.05&&g>r*1.08?1:0;}
  let best={count:0};
  for(let seed=0;seed<mask.length;seed++){if(!mask[seed])continue;let count=0,sumX=0,minX=c.width,maxX=0,minY=c.height,maxY=0,top=0;stack[top++]=seed;mask[seed]=0;
   while(top){const n=stack[--top],x=n%c.width,y=Math.floor(n/c.width);count++;sumX+=x;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    for(const next of [x>0?n-1:-1,x<c.width-1?n+1:-1,n-c.width,n+c.width])if(next>=0&&next<mask.length&&mask[next]){mask[next]=0;stack[top++]=next;}
   }
   if(count>best.count)best={count,x:sumX/count,width:maxX-minX,height:maxY-minY,minX,maxX};
  }
  return best;
 });
 assert.equal(await page.getByRole('button',{name:'↕ 调整方向'}).count(),0);const pump=page.locator('.pump-control'),box=await pump.boundingBox();
 assert.ok(box.x<500,'pump sits next to left stand');
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await page.waitForTimeout(4400);const full=await sample();assert.ok(full.minX>=115&&full.maxX<=1080,'fully inflated balloon clears left stand as well as canvas edge');await page.screenshot({path:'experiments/rocket-launch/docs/review/balloon-layout-20261113/inflated.png'});await page.mouse.up();
 await page.waitForTimeout(7500);const middle=await sample();
 await page.waitForTimeout(8700);const empty=await sample();assert.ok(empty.maxX<=910,'deflated endpoint clears right stand');
 assert.ok(middle.x>full.x+100&&empty.x>middle.x+100,'balloon moves forward');
 assert.ok(middle.count<full.count*.8&&empty.count<middle.count*.8,'painted balloon area decreases');
 assert.ok(empty.height<full.height*.8,'deflated silhouette gets narrower');
 await page.screenshot({path:'experiments/rocket-launch/docs/review/balloon-layout-20261113/end.png'});
 const frozen=await page.locator('#scene').evaluate(c=>c.toDataURL());
 await page.waitForTimeout(600);assert.equal(await page.locator('#scene').evaluate(c=>c.toDataURL()),frozen,'end position does not jump back');
 await page.getByRole('button',{name:'重新开始',exact:true}).click();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const reset=await sample();assert.ok(reset.x<empty.x-180);assert.equal(await page.locator('#pump-count').textContent(),'打气 0 次');
 assert.equal(await page.getByRole('switch',{name:'慢动作'}).count(),0);assert.equal(await page.evaluate(()=>RocketBalloon.layout.playbackRate),.25);await pump.focus();
 await page.keyboard.down('Space');await page.waitForTimeout(4400);await page.keyboard.up('Space');
 await page.waitForTimeout(1900);const slow=await sample();
 assert.ok(slow.x<middle.x-100&&slow.count>middle.count,'default slow motion preserves slower deflation and travel');
 await browser.close();console.log('PASS rendered balloon pixels: left pump, forward travel, shrinking silhouette, stable endpoint, reset, slow motion',{full,middle,empty,slow});
})();

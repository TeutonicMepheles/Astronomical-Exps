const assert = require('node:assert/strict');
const {chromium} = require('playwright');

(async () => {
 const browser = await chromium.launch();
 try {
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:9041';
  await page.goto(origin + '/experiments/rocket-launch/');
  await page.locator('#chapters > button').filter({hasText:'结构与组装'}).click();
  const fire = page.locator('#launch-fire');
    const ruler = page.getByRole('group',{name:'高度记录',exact:true});
  const records = ruler.locator('button');
  const detail = page.locator('#launch-altitude-detail');
  const ground = () => page.locator('#scene').evaluate(canvas => {
   const ctx=canvas.getContext('2d');
   return [...ctx.getImageData(610,688,40,4).data];
  });
  assert.equal(await ruler.isVisible(),false);
  assert((await ground()).every(value => value === 0),'ruler is absent before the first launch');
  await fire.click();
  await page.waitForFunction(() => document.querySelector('#app').dataset.launchFlight === 'true');
  const originPixels = await ground();
  assert(originPixels.some(Boolean),'the zero baseline is visible during the first launch');
  assert.equal(await records.count(),0);
  await page.waitForFunction(() => {
   const canvas=document.querySelector('#scene'), ctx=canvas.getContext('2d');
   const [r,g,b] = ctx.getImageData(780,640,1,1).data;
   return g>180 && b>180 && r<185;
  });
  assert.deepEqual(await ground(),originPixels,'zero baseline stays fixed while the marker rises');
  await page.waitForFunction(() => RocketChapter3.records[0]?.status === 'complete');
  assert.deepEqual(await ground(),originPixels);
  const silhouette = await page.locator('#scene').evaluate(canvas => {
   const ctx = canvas.getContext('2d');
   const row = y => {
    const pixels = ctx.getImageData(767,y,26,1).data;
    let width = 0;
    for (let i=0;i<pixels.length;i+=4) {
     if (pixels[i]===153 && pixels[i+1]===226 && pixels[i+2]===227 && pixels[i+3]>200) width++;
    }
    return width;
   };
   return {nose:row(365),boosters:Math.max(row(402),row(408),row(413))};
  });
  assert(silhouette.nose>0 && silhouette.boosters>silhouette.nose+5,'small marker has a nose and a wider booster silhouette');
  assert.deepEqual(await records.allTextContents(),['1']);
  assert.equal(await detail.isVisible(),false);
  await records.first().press('Enter');
  assert.equal(await detail.textContent(),'70 示意格');
  assert(await detail.isVisible());
  await records.first().press('Escape');
  assert.equal(await detail.isVisible(),false);

  await page.locator('#controls fieldset').first().getByRole('button',{name:'低',exact:true}).click();
  await fire.click();
  await page.waitForFunction(() => RocketChapter3.records[1]?.status === 'complete');
  assert.deepEqual(await records.allTextContents(),['1','2']);
  await records.last().click();
  assert.match(await detail.textContent(),/未起飞 · 0 示意格/);
  for (const [width,height] of [[1920,1080],[1024,768]]) {
   await page.setViewportSize({width,height});
   for (const marker of await records.all()) await marker.click({trial:true});
  }

  await page.getByRole('button',{name:'速度与轨道'}).click();
  assert.equal(await ruler.count(),0);
  await page.locator('#chapters > button').filter({hasText:'结构与组装'}).click();
  assert.deepEqual(await records.allTextContents(),['1','2']);
  await page.reload();
  await page.locator('#chapters > button').filter({hasText:'结构与组装'}).click();
  assert.equal(await ruler.isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('PASS hidden until launch, fixed zero, live ascent, successful/failed records, accessible numbering and repeat visits');
 } finally {
  await browser.close();
 }
})().catch(error => {console.error(error);process.exitCode=1;});

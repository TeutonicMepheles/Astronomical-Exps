const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const url = process.env.FOUCAULT_URL || 'http://127.0.0.1:8795/experiments/foucault-pendulum/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll('.hall-screen-fx').length === 2);
    const screen = page.locator('.hall-screen-fx').nth(1);
    const image = page.locator('.hall-displays > g').nth(1).locator('image');

    const initialState = await screen.evaluate(canvas => ({
      city: canvas.dataset.city,
      target: canvas.dataset.cityTarget,
      transition: canvas.dataset.transitionActive,
    }));
    assert.deepEqual(initialState, { city: '', target: undefined, transition: undefined });

    await page.locator('.city[data-id="paris"]').click({ force: true });
    await page.waitForTimeout(60);
    const peak = await screen.evaluate(canvas => ({
      city: canvas.dataset.city,
      target: canvas.dataset.cityTarget,
      transition: canvas.dataset.transitionActive,
      glitchBoost: Number(canvas.dataset.glitchBoost),
    }));
    assert.equal(peak.city, '');
    assert.equal(peak.target, 'paris');
    assert.equal(peak.transition, 'true');
    assert.ok(peak.glitchBoost >= .9);

    await page.waitForTimeout(300);
    const switched = await screen.evaluate(canvas => ({
      city: canvas.dataset.city,
      target: canvas.dataset.cityTarget,
      glitchBoost: Number(canvas.dataset.glitchBoost),
    }));
    assert.equal(switched.city, 'paris');
    assert.equal(switched.target, 'paris');
    assert.ok(switched.glitchBoost > 0);
    assert.match(await image.getAttribute('href'), /hall-screen-paris\.webp$/);
    await page.screenshot({ path: path.join(root, 'tests/city-screen-paris.png') });

    await page.waitForTimeout(650);
    const settled = await screen.evaluate(canvas => ({
      city: canvas.dataset.city,
      target: canvas.dataset.cityTarget,
      transition: canvas.dataset.transitionActive,
      glitchBoost: Number(canvas.dataset.glitchBoost),
    }));
    assert.deepEqual(settled, { city: 'paris', target: undefined, transition: undefined, glitchBoost: 0 });

    await page.locator('.city[data-id="shanghai"]').dispatchEvent('click');
    await page.waitForTimeout(330);
    assert.equal(await screen.evaluate(canvas => canvas.dataset.city), 'shanghai');
    assert.match(await image.getAttribute('href'), /hall-screen-shanghai\.webp$/);
    assert.deepEqual(errors, []);

    const addedCities=['north','sydney','singapore','south'];
    const leftImage=await page.locator('.hall-displays > g').nth(0).locator('image').getAttribute('href');
    for(const city of addedCities){
      const response=await page.request.get(url+`assets/hall-screen-${city}.webp`);
      assert.equal(response.ok(),true,city+' asset exists');
      await page.locator(`.city[data-id="${city}"]`).dispatchEvent('click');
      await page.waitForFunction(city=>{
        const c=document.querySelectorAll('.hall-screen-fx')[1];
        return c.dataset.cityTarget===city&&Number(c.dataset.glitchBoost)>.5;
      },city);
      await page.waitForFunction(city=>{
        const c=document.querySelectorAll('.hall-screen-fx')[1];
        return c.dataset.city===city&&!c.dataset.transitionActive;
      },city);
      assert.equal(await image.getAttribute('href'),`assets/hall-screen-${city}.webp`);
      assert.equal(await page.locator('.hall-displays > g').nth(0).locator('image').getAttribute('href'),leftImage);
      await page.screenshot({path:path.join(root,`tests/city-screen-${city}.png`)});
    }
    // New selections supersede the previous transition, including pre-swap input.
    for(const city of ['north','sydney','singapore','south','north']){
      await page.locator(`.city[data-id="${city}"]`).dispatchEvent('click');
      await page.waitForTimeout(70);
    }
    await page.waitForFunction(()=>{
      const c=document.querySelectorAll('.hall-screen-fx')[1];return c.dataset.city==='north'&&!c.dataset.transitionActive;
    });
    assert.equal(await image.getAttribute('href'),'assets/hall-screen-north.webp');
    const performanceSample=await page.evaluate(()=>new Promise(resolve=>{
      const intervals=[],longTasks=[];let last=performance.now(),start=last,index=0;
      const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});
      const cities=['sydney','singapore','south','north'];
      const switcher=setInterval(()=>document.querySelector(`.city[data-id="${cities[index++%4]}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true})),350);
      function frame(now){intervals.push(now-last);last=now;if(now-start<3000)requestAnimationFrame(frame);else{
        clearInterval(switcher);observer.disconnect();intervals.sort((a,b)=>a-b);
        resolve({frames:intervals.length,p95:intervals[Math.floor(intervals.length*.95)],max:intervals.at(-1),longTasks});
      }}requestAnimationFrame(frame);
    }));

    const reducedPage = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
    await reducedPage.goto(url);
    await reducedPage.waitForFunction(() => document.querySelectorAll('.hall-screen-fx').length === 2);
    const reducedScreen = reducedPage.locator('.hall-screen-fx').nth(1);
    await reducedPage.locator('.city[data-id="paris"]').dispatchEvent('click');
    await reducedPage.waitForFunction(() => document.querySelectorAll('.hall-screen-fx')[1].dataset.city === 'paris');
    assert.equal(await reducedScreen.evaluate(canvas => Number(canvas.dataset.glitchBoost)), 0);

    for(const city of addedCities){
      await reducedPage.locator(`.city[data-id="${city}"]`).dispatchEvent('click');
      await reducedPage.waitForFunction(city=>document.querySelectorAll('.hall-screen-fx')[1].dataset.city===city,city);
      assert.equal(await reducedScreen.evaluate(canvas=>Number(canvas.dataset.glitchBoost)),0);
    }
    assert.deepEqual(errors,[]);
    const assetResponse = await page.request.get(url + 'assets/hall-screen-paris.webp');
    assert.equal(assetResponse.ok(), true);
    const report = {
      browser: browser.version(),
      url,
      effect: 'right city screen raises Glitch before swapping the city image',
      addedCities,
      rapidSelectionVerified:true,
      performanceSample,
      parisSwapVerified: true,
      shanghaiRestoreVerified: true,
      reducedMotion: 'switches immediately without Glitch animation',
      errors,
    };
    fs.writeFileSync(path.join(root, 'tests/city-screen-browser-results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

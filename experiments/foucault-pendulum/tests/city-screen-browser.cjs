const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const url = process.env.FOUCAULT_URL || 'http://127.0.0.1:8795/experiments/foucault-pendulum/';

(async () => {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll('.hall-screen-fx').length === 2);
    const screen = page.locator('.hall-screen-fx').nth(1);
    const image = page.locator('.hall-displays > g').nth(1).locator('image');

    await page.waitForFunction(() => document.querySelectorAll('.hall-screen-fx[data-drawn]').length === 2);
    assert.equal(await screen.getAttribute('data-city'), '');
    assert.equal(await page.getByText('Glitch', { exact: true }).count(), 0);

    const choose = city => page.locator(`.city[data-id="${city}"]`).dispatchEvent('click');
    const waitForCity = city => page.waitForFunction(
      city => document.querySelectorAll('.hall-screen-fx')[1].dataset.city === city, city);
    await choose('paris');
    await page.waitForFunction(() => {
      const canvas = document.querySelectorAll('.hall-screen-fx')[1];
      return canvas.dataset.city === 'paris' && canvas.dataset.switching === 'true';
    });
    assert.equal(await page.locator('.hall-screen-fx').first().getAttribute('data-switching'), null);
    await page.locator('.hall-screen-fx[data-switching]').waitFor({ state: 'detached' });
    assert.match(await image.getAttribute('href'), /hall-screen-paris\.webp$/);
    const clips = [
      {x: 825, y: 320, width: 60, height: 30},
      {x: 1180, y: 322, width: 60, height: 30},
    ];
    const captureScreens = async () => {
      const captures = [];
      for (const clip of clips) captures.push(await page.screenshot({clip}));
      return captures;
    };
    const before = await captureScreens();
    await page.waitForTimeout(500);
    const after = await captureScreens();
    for (let i = 0; i < clips.length; i++) assert(after[i].equals(before[i]), 'screen artwork must remain steady');
    await page.screenshot({ path: path.join(root, 'tests/city-screen-paris.png') });

    await choose('shanghai');
    await waitForCity('shanghai');
    assert.match(await image.getAttribute('href'), /hall-screen-shanghai\.webp$/);
    assert.deepEqual(errors, []);

    const addedCities=['north','sydney','singapore','south'];
    const leftImage=await page.locator('.hall-displays > g').nth(0).locator('image').getAttribute('href');
    for(const city of addedCities){
      const response=await page.request.get(url+`assets/hall-screen-${city}.webp`);
      assert.equal(response.ok(),true,city+' asset exists');
      await choose(city);
      await waitForCity(city);
      assert.equal(await image.getAttribute('href'),`assets/hall-screen-${city}.webp`);
      assert.equal(await page.locator('.hall-displays > g').nth(0).locator('image').getAttribute('href'),leftImage);
      await page.screenshot({path:path.join(root,`tests/city-screen-${city}.png`)});
    }
    // The latest selection wins when cities are changed rapidly.
    for(const city of ['north','sydney','singapore','south','north']){
      await page.locator(`.city[data-id="${city}"]`).dispatchEvent('click');
      await page.waitForTimeout(70);
    }
    await page.waitForFunction(()=>{
      const c=document.querySelectorAll('.hall-screen-fx')[1];return c.dataset.city==='north';
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

    const reducedPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    await reducedPage.goto(url);
    await reducedPage.waitForFunction(() => document.querySelectorAll('.hall-screen-fx').length === 2);
    await reducedPage.locator('.city[data-id="paris"]').dispatchEvent('click');
    await reducedPage.waitForFunction(() => document.querySelectorAll('.hall-screen-fx')[1].dataset.city === 'paris');
    assert.equal(await reducedPage.locator('.hall-screen-fx').nth(1).getAttribute('data-switching'), null);

    for(const city of addedCities){
      await reducedPage.locator(`.city[data-id="${city}"]`).dispatchEvent('click');
      await reducedPage.waitForFunction(city=>document.querySelectorAll('.hall-screen-fx')[1].dataset.city===city,city);
    }
    assert.deepEqual(errors,[]);
    const assetResponse = await page.request.get(url + 'assets/hall-screen-paris.webp');
    assert.equal(assetResponse.ok(), true);
    const report = {
      browser: browser.version(),
      url,
      effect: 'right screen briefly shifts during swaps; both screens settle to static bloom',
      addedCities,
      rapidSelectionVerified:true,
      performanceSample,
      parisSwapVerified: true,
      shanghaiRestoreVerified: true,
      reducedMotion: 'same static artwork and city swaps',
      errors,
    };
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

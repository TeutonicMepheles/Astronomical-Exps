const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const lights = [[724, 514], [1718, 484], [2122, 549]];
const searchlights = [[1146, 392], [1554, 403], [1582, 403]];
const protectedPoints = [[1700, 710], [1800, 800], [2000, 830], [2330, 1250], [1000, 1250]];
const output = path.resolve(process.env.CITY_OUT || 'artifacts/city-night-distant-c');
const online = process.env.CITY_URL || 'http://127.0.0.1:8643/experiments/light-pollution/';
const offline = pathToFileURL(path.resolve('dist/light-pollution/index.html')).href;

async function verify(browser, url, disconnected) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (disconnected) await page.route(/^https?:/, route => route.abort());
  try {
    await page.goto(url);
    await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 90000 });
    await page.evaluate(() => {
      scenePreview.setTrafficOptions({ paused: true });
      scenePreview.setMediaOptions({ paused: true });
      lightingUI.select('distant');
    });
    for (const [width, height] of [[1920, 1080], [1280, 720], [1024, 768]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const scene = await page.locator('.layout').boundingBox();
      const panel = await page.getByRole('complementary', { name: '光源调节面板' }).boundingBox();
      assert(panel.y >= scene.y + scene.height * .55, 'distant panel clears the city and sky');
      assert(panel.y + panel.height <= scene.y + scene.height, 'distant panel fits the stage');
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    const control = page.getByRole('combobox', { name: '远景城市照明' });
    const settle = () => page.evaluate(() => new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const pixels = () => page.evaluate(points => points.map(point => scenePreview.pixel(...point)),
      [...lights, ...searchlights, ...protectedPoints]);
    const stats = () => page.evaluate(() => scenePreview.stats());
    const prefix = disconnected ? 'offline' : 'http';

    assert.equal(await control.inputValue(), '2');
    await settle();
    const initial = await stats();
    const firstOn = await pixels();
    const haloSample = () => page.evaluate(() => scenePreview.pixel(1370, 215).slice(0, 3));
    await page.screenshot({ path: path.join(output, prefix + '-full.png') });

    const beams = page.getByRole('switch', { name: '集束光柱' });
    const presetSamples = () => page.evaluate(() =>
      [[1610,476],[1795,466],[2370,490],[1349,565],[1880,510],[1800,800]]
        .map(point => scenePreview.pixel(...point)));
    const allLights = await presetSamples();
    await control.selectOption('1');
    await settle();
    assert.equal(await beams.isDisabled(), true);
    assert.equal(await beams.isChecked(), false);
    const essential = await presetSamples();
    const essentialStars = await page.evaluate(() => scenePreview.sky().visibleStars);
    await page.screenshot({ path: path.join(output, prefix + '-essential.png') });
    await control.selectOption('2');
    await settle();
    assert.equal(await beams.isChecked(), true);
    assert.equal(await beams.isEnabled(), true);

    await beams.uncheck();
    await settle();
    const cityOnly = await pixels();
    await page.screenshot({ path: path.join(output, prefix + '-city-only.png') });
    const fullHalo = await haloSample();
    assert.equal(await control.inputValue(), '2');
    await control.selectOption('0');
    assert.equal(await beams.isChecked(), false);
    await settle();
    const off = await pixels();
    const noLights = await presetSamples();
    const sum = rgb => rgb.slice(0, 3).reduce((a,b) => a+b,0);
    for (let i = 0; i < 3; i++) {
      assert.deepEqual(essential[i], noLights[i], 'distant ad screen is dark');
      assert(sum(allLights[i]) > sum(essential[i]) + 50);
    }
    for (let i = 3; i < 5; i++) {
      assert(sum(essential[i]) > sum(noLights[i]) + 50, 'necessary light remains lit');
    }
    assert.deepEqual(essential[5], allLights[5], 'nearby mall lighting remains independent');
    assert(await page.evaluate(() => scenePreview.sky().visibleStars) > essentialStars);

    assert((await haloSample()).reduce((a,b) => a+b,0) < fullHalo.reduce((a,b) => a+b,0)-20,
      'distant switch visibly reduces diffuse sky halo');
    await page.screenshot({ path: path.join(output, prefix + '-off.png') });
    for (const [i, pixel] of off.entries()) {
      if (i < lights.length + searchlights.length) {
        const energy = rgb => rgb.slice(0, 3).reduce((sum, channel) => sum + channel, 0);
        assert(energy(firstOn[i]) > energy(pixel) + 50, 'C light sample ' + i + ' responds');
      } else {
        assert.deepEqual(firstOn[i], pixel, 'protected foreground sample ' + i);
      }
    }

    await beams.check();
    await settle();
    const beamsOnly = await pixels();
    assert.equal(await control.inputValue(), '0');
    const energy = pixel => pixel.slice(0, 3).reduce((sum, channel) => sum + channel, 0);
    for (let i = lights.length; i < lights.length + searchlights.length; i++) {
      assert(energy(firstOn[i]) > energy(cityOnly[i]) + 20);
      assert(energy(beamsOnly[i]) > energy(off[i]) + 20);
    }
    await beams.uncheck();
    for (let i = 0; i < 12; i++) await control.selectOption(i % 2 ? '0' : '2');
    await settle();
    assert.deepEqual(await pixels(), off);
    await control.selectOption('2');
    await beams.check();
    await settle();
    assert.deepEqual(await pixels(), firstOn);
    const end = await stats();
    assert.equal(end.uploads, initial.uploads);
    assert.equal(end.textureCount, initial.textureCount);
    await page.evaluate(() => lightingUI.select('commercial-windows'));
    await page.locator('#gain-commercial-screens').fill('0');
    await page.evaluate(() => lightingUI.select('billboard'));
    await page.locator('#gain-billboard').fill('0');
    await page.evaluate(() => {
      lightingUI.select('distant');
      scenePreview.setMediaOptions({ paused: false });
    });
    await settle();
    const waitFrames = () => page.evaluate(async () => {
      for (let i = 0; i < 40; i++) await new Promise(resolve => requestAnimationFrame(resolve));
    });
    const movingStripe = () => page.evaluate(() => [1605, 1611, 1617, 1623].map(x =>
      scenePreview.pixel(x, 376)));
    const movingStart = await pixels();
    const stripeStart = await movingStripe();
    const beforeMotion = await stats();
    await waitFrames();
    const movingEnd = await pixels();
    const afterMotion = await stats();
    assert.deepEqual(movingEnd[lights.length], movingStart[lights.length], 'fixed beam stays still');
    assert.notDeepEqual(await movingStripe(), stripeStart, 'selected beam sweeps');
    assert.equal(afterMotion.staticDraws, beforeMotion.staticDraws);
    assert.equal(afterMotion.uploads, beforeMotion.uploads);
    await beams.uncheck();
    await settle();
    const starPixels = () => page.evaluate(() => scenePreview.stars().slice(0, 20)
      .map(([x,y]) => scenePreview.pixel(Math.floor(x), Math.floor(y))));
    const firstStars = await starPixels();
    const firstCount = await page.evaluate(() => scenePreview.sky().visibleStars);
    const starStats = await stats();
    await waitFrames();
    assert.notDeepEqual(await starPixels(), firstStars, 'programmatic stars twinkle with searchlights off');
    assert.equal(await page.evaluate(() => scenePreview.sky().visibleStars), firstCount);
    assert.equal((await stats()).staticDraws, starStats.staticDraws);
    await page.evaluate(() => scenePreview.setMediaOptions({ paused: true }));
    await settle();
    const idle = await stats();
    await waitFrames();
    assert.equal((await stats()).frames, idle.frames, 'paused sky and disabled lights stop idle redraw');
    assert.equal(end.errors, 0);
    assert.deepEqual(errors, []);
    return { disconnected, textureCount: end.textureCount, uploads: end.uploads - initial.uploads, firstOn, off };
  } finally {
    await page.close();
  }
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  try {
    const result = [await verify(browser, online, false), await verify(browser, offline, true)];
    assert.deepEqual(result[0].firstOn, result[1].firstOn);
    assert.deepEqual(result[0].off, result[1].off);
    fs.writeFileSync(path.join(output, 'distant-c.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

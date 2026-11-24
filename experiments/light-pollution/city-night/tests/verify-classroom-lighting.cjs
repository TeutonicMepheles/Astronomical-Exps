const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const urls = [
  process.env.CITY_URL || 'http://127.0.0.1:11460/experiments/light-pollution/city-night/index.html',
  pathToFileURL(path.resolve(process.env.CITY_OFFLINE || 'dist/light-pollution/index.html')).href
];

async function verify(page, url) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (url.startsWith('file:')) await page.route(/^https?:/, route => route.abort());
  await page.goto(url);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  await page.evaluate(() => {
    scenePreview.setTrafficOptions({paused: true});
    scenePreview.setMediaOptions({paused: true});
  });
  const settle = () => page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  ));
  await settle();
  const snapshot = () => page.evaluate(() => ({
    sky: scenePreview.sky(), state: scenePreview.state(),
    uploads: scenePreview.stats().uploads, stars: scenePreview.stars()
  }));
  const occlusion = await page.evaluate(async () => {
    scenePreview.setTime(0);
    const lamp = scenePreview.fixtures().find(fixture => fixture.id === 'road-9');
    const point = [Math.round(lamp.foot[0]), Math.round((lamp.foot[1] + lamp.emitter[1]) / 2)];
    const crossing = scenePreview.poses().some(car => {
      const [left, top, right, bottom] = car.bodyBounds;
      return car.y < lamp.foot[1] && left < point[0] && point[0] < right &&
        top < point[1] && point[1] < bottom && car.opacity > .99;
    });
    const sample = async layers => {
      scenePreview.setTrafficLayers(layers);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return scenePreview.pixel(...point);
    };
    const withoutTraffic = await sample({body: false, ground: false, shadows: false, lamps: false});
    const withTraffic = await sample({});
    return {crossing, withoutTraffic, withTraffic, errors: scenePreview.stats().errors};
  });
  assert(occlusion.crossing, 'a vehicle passes behind the lamp at the sample pixel');
  assert.deepEqual(occlusion.withTraffic, occlusion.withoutTraffic, 'the lamp keeps its rendered color');
  assert.equal(occlusion.errors, 0);
  const full = await snapshot();

  await page.getByRole('button', {name: '全局调光', exact: true}).click();
  await page.getByRole('radio', {name: '必要照明', exact: true}).check();
  await settle();
  const middle = await snapshot();
  assert.equal(middle.state.gains.distant, 1);
  assert.equal(middle.state.gains.billboard, 0);
  assert.equal(middle.state.groups.road.gain, 1);
  await page.getByRole('radio', {name: '全暗', exact: true}).check();
  await settle();
  const dark = await snapshot();
  assert(Object.values(dark.state.gains).every(value => value === 0));
  assert.equal(dark.state.groups.road.gain, 0);
  assert.equal(dark.state.traffic.gain, 0);
  assert.equal(dark.sky.pollution, 0);
  assert(full.sky.visibleStars < middle.sky.visibleStars);
  assert(middle.sky.visibleStars < dark.sky.visibleStars);
  assert.deepEqual(dark.stars, full.stars);
  await page.getByRole('radio', {name: '极亮', exact: true}).check();
  await settle();
  assert.deepEqual((await snapshot()).sky, full.sky);
  assert.deepEqual(await page.evaluate(() => lightingUI.completed()), []);
  await page.keyboard.press('Escape');

  await page.locator('.marker[data-id="road"]').click();
  assert.equal(await page.evaluate(() => scenePreview.state().view), 'scene');
  await page.getByRole('button',{name:'查看局部',exact:true}).click();
  assert.equal(await page.evaluate(() => scenePreview.state().view), 'detail');
  assert.equal(await page.locator('#detail').innerText(), '返回全景');
  assert.equal(await page.locator('#panel-body input[type=range]:visible').count(), 0);
  const fixtures = () => page.evaluate(() => scenePreview.fixtures());
  const original = await fixtures();
  await page.locator('#panel-body [data-shade="full"]').click();
  await page.getByRole('radio', {name: '较亮', exact: true}).check();
  await settle();
  const modified = await fixtures();
  assert.deepEqual(modified.filter((lamp, index) =>
    JSON.stringify(lamp) !== JSON.stringify(original[index])).map(lamp => lamp.id), ['road-3']);
  await page.locator('#detail').click();
  await settle();
  const after = await snapshot();
  assert.deepEqual(after.state.groups, full.state.groups);
  assert.deepEqual(after.sky, full.sky);
  assert.equal(after.uploads, full.uploads);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({url, stars: [full, middle, dark].map(item => item.sky.visibleStars)}));
}

(async () => {
  const browser = await chromium.launch({channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  try {
    for (const url of urls) {
      const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
      try { await verify(page, url); } finally { await page.close(); }
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

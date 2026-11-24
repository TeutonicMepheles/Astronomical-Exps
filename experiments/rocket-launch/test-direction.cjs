const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:11459';
const entry = '/experiments/rocket-launch/';
const output = process.env.DIRECTION_REVIEW_DIR;

async function checkGeometry(page) {
  const samples = await page.evaluate(async () => {
    const { directionState: state, directionDuration: duration } = await import('./velocity.js');
    const early = [.05, .5, 1.299].map(t => [state(t, 'straight'), state(t, 'turn')]);
    const straight = Array.from({ length: 400 }, (_, i) => state(duration('straight') * i / 399, 'straight'));
    return {
      early, straight,
      turn: state(1.301, 'turn'), beforeOrbit: state(4 - 1e-5, 'turn'),
      insertion: state(4, 'turn'), end: state(duration('turn'), 'turn'),
      nextLap: state(duration('turn')+.5, 'turn'),
      straightBeforeCutoff: state(4 - 1e-5, 'straight'), straightAtCutoff: state(4, 'straight'),
    };
  });
  for (const [straight, turn] of samples.early) assert.deepEqual(straight, turn);
  assert(samples.straight.some(sample => sample.phase === 'coast' && sample.vy < 0 && !sample.powered));
  assert(samples.straight.some(sample => sample.phase === 'fall' && sample.vy > 0 && !sample.powered));
  assert.deepEqual(samples.straight.at(-1), { x: 0, y: -1, vx: 0, vy: 0, phase: 'landed', powered: false });
  assert.equal(samples.turn.phase, 'turn');
  assert(samples.turn.powered && samples.turn.vy < 0);
  const { beforeOrbit, insertion, end } = samples;
  assert(beforeOrbit.powered && !insertion.powered);
  assert(samples.straightBeforeCutoff.powered && !samples.straightAtCutoff.powered);
  assert(Math.abs(samples.straightBeforeCutoff.y - samples.straightAtCutoff.y) < 1e-5);
  assert(Math.abs(samples.straightBeforeCutoff.vy - samples.straightAtCutoff.vy) < 1e-5);
  assert(Math.hypot(beforeOrbit.x - insertion.x, beforeOrbit.y - insertion.y) < 1e-4);
  assert(Math.hypot(beforeOrbit.vx - insertion.vx, beforeOrbit.vy - insertion.vy) < 1e-4);
  assert(Math.abs(insertion.x * insertion.vx + insertion.y * insertion.vy) < 1e-10);
  assert(Math.hypot(insertion.x - end.x, insertion.y - end.y) < 1e-10);
  assert.equal(end.phase, 'orbited');
  assert.equal(samples.nextLap.phase, 'orbited');
  assert(Math.hypot(samples.nextLap.x-end.x,samples.nextLap.y-end.y)>.1);
  assert(Math.abs(Math.hypot(samples.nextLap.x,samples.nextLap.y)-Math.hypot(end.x,end.y))<1e-10);
  assert(Math.abs(Math.hypot(samples.nextLap.vx,samples.nextLap.vy)-Math.hypot(end.vx,end.vy))<1e-10);
}

async function run(browser, viewport, first, offline = false) {
  const record = output && !offline && viewport.width === 1920;
  const context = await browser.newContext({
    viewport,
    ...(record ? { recordVideo: { dir: output, size: { width: 1280, height: 720 } } } : {}),
    ...(offline ? { offline: true, reducedMotion: 'reduce' } : {}),
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype;
    const { clearRect, fillText } = proto;
    proto.clearRect = function (...args) {
      if (this.canvas.id === 'velocity-backdrop') window.flightLabels = [];
      return clearRect.apply(this, args);
    };
    proto.fillText = function (text, ...args) {
      if (this.canvas.id === 'velocity-backdrop') window.flightLabels?.push(text);
      return fillText.call(this, text, ...args);
    };
  });
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(error.message));
  if (offline) page.on('request', request => {
    if (/^https?:/.test(request.url())) external.push(request.url());
  });
  const shot = name => record && page.screenshot({ path: path.join(output, name + '.png') });
  const state = () => page.evaluate(() => {
    const { age, direction } = RocketModel.scene.state;
    return { age, phase: direction.flight.phase, completed: [...direction.completed] };
  });
  const phase = name => page.waitForFunction(name => RocketModel.scene.state.direction.flight.phase === name, name);
  const feedback = () => page.locator('#feedback').innerText();
  const cannon = () => page.locator('#steps').getByRole('button', { name: '高山大炮' }).click();
  const vertical = () => page.locator('#steps').getByRole('button', { name: '垂直发射' }).click();
  try {
    await page.goto(offline ? pathToFileURL(process.env.DIRECTION_OFFLINE_HTML).href : origin + entry);
    await page.waitForFunction(() => Boolean(window.RocketModel));
    if (!offline && viewport.width === 1920) await checkGeometry(page);
    await page.locator('#chapters > button').filter({ hasText: '速度与轨道' }).click();
    if (!offline && viewport.width === 1920) {
      await page.locator('#velocity-speed').fill('1');
      await page.locator('#velocity-fire').click();
      await page.waitForFunction(() => RocketModel.scene.state.presentation?.rangeProgress === 1);
      await page.locator('#velocity-fire').click();
      await page.waitForFunction(() => RocketModel.scene.state.presentation?.launched);
      assert.equal(await page.evaluate(() => RocketModel.scene.state.presentation.rangeProgress), undefined);
      await page.waitForFunction(() => RocketModel.scene.state.presentation?.rangeProgress === 1);
    }
    assert.match(await page.locator('#next').innerText(), /垂直发射/);
    await page.locator('#next').click();
    assert.match(await page.locator('#next').innerText(), /推力与载荷/);
    if (offline) {
      assert.equal(await page.locator('.stage').evaluate(el => getComputedStyle(el).animationName), 'none');
    }
    assert.equal(await page.locator('#velocity-speed,#velocity-compare,#velocity-adjust').count(), 0);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-direction=straight]').getAttribute('aria-pressed'), 'true');
    await shot('01-待发');
    const readyRocket = () => page.locator('#velocity-backdrop').evaluate(canvas => {
      const {width,height} = canvas;
      return Array.from(canvas.getContext('2d').getImageData(
        Math.floor(width*.67), Math.floor(height*.34), Math.ceil(width*.06), Math.ceil(height*.37)
      ).data);
    });
    const straightRocket = await readyRocket();
    await page.locator('[data-direction=turn]').click();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.deepEqual(await readyRocket(), straightRocket, 'Selecting a flight condition keeps the ready rocket upright');
    await page.locator('[data-direction=straight]').click();

    for (const [index, condition] of [first, first === 'straight' ? 'turn' : 'straight'].entries()) {
      const choice = page.locator('[data-direction=' + condition + ']');
      await choice.focus();
      await page.keyboard.press('Space');
      assert.equal(await choice.getAttribute('aria-pressed'), 'true');
      await page.locator('#direction-fire').click();
      assert.equal(await page.locator('#next').isDisabled(),true);
      assert.equal(await choice.isDisabled(),true);
      if (!offline && viewport.width === 1920) {
        await phase('ascent');
        await page.waitForFunction(() => RocketModel.scene.state.age > .6);
        await page.locator('#direction-pause').click();
        const frozen = await state();
        await page.waitForTimeout(180);
        assert.deepEqual(await state(), frozen);
        await page.locator('#direction-pause').click();
        await phase(condition === 'straight' ? 'fall' : 'turn');
        if (condition === 'turn') {
          assert.equal(await feedback(), '载荷离箭，进入转向航段');
          assert.deepEqual(await page.evaluate(() => window.flightLabels.filter(text =>
            ['引力', '推进加速度', '箭头 · 速度'].includes(text))), ['引力', '推进加速度']);
          await page.waitForFunction(() => RocketModel.scene.state.age >= 1.6);
          await page.locator('#direction-pause').click();
          assert((await state()).age < 2.3);
          await shot('04-转向点释放载荷');
          await page.locator('#direction-pause').click();
        }
        await page.waitForFunction(() => RocketModel.scene.state.age > 3);
        const pause = page.locator('#direction-pause');
        await pause.click();
        const frozenAfterSplit = await state();
        await page.waitForTimeout(180);
        assert.deepEqual(await state(), frozenAfterSplit);
        await shot(condition === 'straight' ? '02-关机回落' : '04-升空中转向');
        await pause.click();
      }
      if (condition === 'turn') {
        await phase('orbit');
        assert.equal(await feedback(), '天舟开始绕地飞行');
        assert.deepEqual(await page.evaluate(() => window.flightLabels.filter(text =>
          ['引力', '推进加速度', '箭头 · 速度'].includes(text))), ['引力']);
      }
      await phase(condition === 'straight' ? 'landed' : 'orbited');
      assert.equal(await feedback(), condition === 'straight' ? '落回地面' : '');
      assert.equal(await page.locator('#next').isEnabled(),true);
      assert.equal(await choice.isEnabled(),true);
      if(condition==='turn'){
        const firstLap=await state();
        await page.waitForFunction(age=>RocketModel.scene.state.age>age+.25,firstLap.age);
        assert.equal((await state()).phase,'orbited');
        assert.equal(await page.locator('#direction-pause').isVisible(),true);
      }
      assert.equal(await page.locator('#direction-conclusion').isVisible(), index === 1);
      await shot(condition === 'straight' ? '03-落回地面' : '05-绕地结果');
      if (!index&&condition==='straight') await page.locator('#direction-adjust').click();
    }

    const bounds = await page.locator('#app').evaluate(app => {
      const outer = app.getBoundingClientRect();
      const buttons = [...app.querySelectorAll('#controls button,#next')].filter(button => !button.hidden);
      return buttons.every(button => {
        const rect = button.getBoundingClientRect();
        return rect.left >= outer.left && rect.right <= outer.right && rect.bottom <= outer.bottom && rect.height >= 40;
      });
    });
    assert(bounds);
    await page.locator('#direction-fire').click();
    await phase('ascent');
    await cannon();
    await vertical();
    assert.deepEqual(await state(), { age: 0, phase: 'ready', completed: [first, first === 'straight' ? 'turn' : 'straight'] });
    await page.locator('#next').click();
    await page.waitForFunction(() => RocketChapter3.step === 2 && RocketChapter3.adapter.ready);
    await page.locator('#launch-fire').click();
    await page.waitForFunction(() => !document.querySelector('#launch-fire').disabled);
    if (!offline) {
      await page.reload();
      await page.locator('#chapters > button').filter({ hasText: '速度与轨道' }).click();
      await vertical();
      assert.deepEqual(await state(), { age: 0, phase: 'ready', completed: [] });
    } else {
      assert.deepEqual(external, []);
    }
    assert.deepEqual(errors, []);
    console.log('PASS', viewport, first, offline ? 'offline with reduced motion' : 'online');
  } finally {
    const video = page.video();
    await context.close();
    if (record && video) await video.saveAs(path.join(output, '垂直发射两档复试.webm'));
    if (record && video) await video.delete();
  }
}

(async () => {
  if (output) fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    await run(browser, { width: 1920, height: 1080 }, 'straight');
    await run(browser, { width: 1280, height: 720 }, 'turn');
    if (process.env.DIRECTION_OFFLINE_HTML) {
      await run(browser, { width: 1280, height: 720 }, 'straight', true);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

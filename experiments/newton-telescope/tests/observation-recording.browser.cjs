const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../..');
const offline = process.env.EXPERIMENT_URL === 'offline';

async function aimAtSelectedTarget(page, offsetAt25 = 0) {
  // Use the actual scope and projected marker. Set up the precise pose so the
  // test can focus on the capture gate, rather than on manual search timing.
  await page.evaluate(offsetAt25 => {
    const model = Newton.app.observationModel;
    const aspect = model.container.clientWidth / model.container.clientHeight;
    const radiusAt25 = Newton.store.metrics({ ...Newton.store.get(), eyepiece: 25 }).field * Math.PI / 360;
    for (let i = 0; i < 65; i++) {
      model.section.update(Newton.store.get());
      model.applyPose(model.section.pose(model.yaw, aspect));
      const { horizontalError, verticalError } = model.measurePointing();
      const yawError = horizontalError - radiusAt25 * offsetAt25;
      if (Math.hypot(yawError, verticalError) < 1e-6) break;
      model.yaw += yawError * .75;
      const { angle } = Newton.store.get();
      Newton.store.set({ angle: THREE.MathUtils.clamp(angle - verticalError * 180 / Math.PI / .4 * .75, 0, 90) });
    }
    model.setAngle(Newton.store.get().angle);
    model.render();
  }, offsetAt25);
  await page.waitForFunction(() => Newton.app.preview.aim?.recordingCentered);
}

(async () => {
  let browser, server;
  try {
    let url = process.env.EXPERIMENT_URL;
    if (offline) url = pathToFileURL(path.join(root, 'dist/newton-telescope/index.html')).href;
    if (!url) {
      server = spawn('python', ['tools/serve.py', '--port', '0'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
      url = await new Promise((resolve, reject) => {
        let output = '';
        const timer = setTimeout(() => reject(Error('Server startup timeout')), 15000);
        server.on('error', reject);
        server.stdout.on('data', chunk => {
          output += chunk;
          const address = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
          if (address) { clearTimeout(timer); resolve(address + '/experiments/newton-telescope/'); }
        });
      });
    }
    browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
    const context = await browser.newContext({
      viewport: offline ? { width: 1024, height: 700 } : { width: 1600, height: 900 },
      reducedMotion: offline ? 'reduce' : 'no-preference', offline
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => Newton?.app?.observationModel?.resourcesReady);
    if (offline) await page.evaluate(() => Newton.developer.setEnabled(true));
    await page.evaluate(() => {
      const course = Newton.course;
      for (const mirror of ['plane', 'concave', 'convex']) course.mountMirror(mirror);
      course.enter('assembly');
      course.install('primary', 'primary');
      course.install('secondary', 'secondary');
      course.enter('observation');
      Newton.observationFlow.openObservation();
      Newton.store.set({ eyepiece: 38 });
    });
    const draw = page.locator('.observation-draw');
    const notebook = page.locator('.observation-record-book-button');
    const book = page.locator('.observation-record-book');
    const target = offline ? 'moon' : 'saturn';
    const other = offline ? 'saturn' : 'moon';
    const name = offline ? '月球' : '土星';
    const select = id => page.locator(`[data-observation-target=${id}]`).click();
    const count = n => page.waitForFunction(n => Newton.course.get().records.length === n, n);
    const watchView = () => page.evaluate(() => {
      const preview = Newton.app.preview;
      const before = preview.aim;
      const frames = [];
      const stop = preview.subscribeDraw(aim => {
        frames.push({ acquired: aim?.acquired, x: aim?.x, y: aim?.y });
      });
      window.finishWatchingView = () => {
        stop();
        return { before, frames, after: preview.aim };
      };
    });
    const checkView = async n => {
      await count(n);
      const { before, frames, after } = await page.evaluate(async () => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return window.finishWatchingView();
      });
      assert(before?.acquired && after?.acquired, `Record ${n} must keep the target acquired: ${JSON.stringify({ before, after })}`);
      for (const frame of [...frames, after]) {
        assert(frame.acquired && Math.hypot(frame.x - before.x, frame.y - before.y) < .002,
          `Record ${n} must preserve the target throughout the redraw: ${JSON.stringify({ before, frame })}`);
      }
    };
    await notebook.waitFor();
    assert.equal(await draw.isVisible(), false);
    assert.equal(await page.locator('.live-control').isVisible(), false);
    assert.equal(await page.locator('.preview-assumption').isVisible(), false);
    await select(target);
    await aimAtSelectedTarget(page);
    const focalGuide = page.locator('.observation-draw-slider-hint');
    assert.match(await focalGuide.innerText(), /25 mm/);

    async function moveSlider(from, beyond, goal) {
      const box = await page.locator('.observation-slider:has(#eyepiece)').boundingBox();
      const x = box.x + box.width * 66.5 / 133;
      const y = value => box.y + box.height * (23 + 177 * (50 - value) / 45) / 285;
      await page.mouse.move(x, y(from));
      await page.mouse.down();
      await page.mouse.move(x, y(beyond));
      await page.mouse.up();
      assert.equal(Number(await page.locator('#eyepiece').inputValue()), goal);
    }
    await moveSlider(38, 7, 25);
    await draw.waitFor();
    await page.evaluate(() => Newton.store.set({ live: false }));
    assert.equal(await draw.isVisible(), false);
    await page.evaluate(() => Newton.store.set({ live: true }));
    const firstImage = await page.locator('#planet').evaluate(source => {
      const snapshot = document.createElement('canvas');
      snapshot.width = snapshot.height = 320;
      snapshot.getContext('2d').drawImage(source, 0, 0, 320, 320);
      return snapshot.toDataURL('image/png');
    });
    await watchView();
    await draw.click();
    if (!offline) {
      await page.locator('.observation-record-flight').waitFor();
      const frames = await page.evaluate(async () => {
        const image = document.querySelector('.observation-record-flight');
        const bookButton = document.querySelector('.observation-record-book-button');
        const animation = image.getAnimations()[0];
        animation.pause();
        await animation.ready;
        const duration = animation.effect.getTiming().duration;
        const center = element => {
          const r = element.getBoundingClientRect();
          return [r.x + r.width / 2, r.y + r.height / 2];
        };
        const points = [.65, .85, .95].map(progress => {
          animation.currentTime = progress * duration;
          const [x, y] = center(image), [bx, by] = center(bookButton);
          return [Math.hypot(x - bx, y - by), Number(getComputedStyle(image).opacity)];
        });
        animation.play();
        return points;
      });
      assert(frames[0][0] > 5 && frames[0][1] === 1);
      assert(frames[1][0] < 1 && frames[1][1] === 1);
      assert(frames[2][0] < 1 && frames[2][1] > 0 && frames[2][1] < 1);
    }
    await checkView(1);
    assert.equal(await page.evaluate(image => Newton.course.get().records[0].image === image, firstImage), true);
    if (offline) await page.evaluate(() => Newton.developer.setEnabled(false));
    await select(other);
    assert.equal(await draw.isVisible(), false);
    assert.match(await page.locator('.observation-aim-hint').innerText(), new RegExp('返回'+name+'继续记录'));
    await notebook.click();
    assert.match(await book.locator('.observation-record-subtitle').innerText(), new RegExp(name+' · 1/3'));
    assert.equal(await book.locator('img').count(), 1);
    await page.keyboard.press('Escape');
    await select(target);
    await aimAtSelectedTarget(page, .096);
    await page.evaluate(() => Newton.store.set({ focal: 810 }));
    assert.match(await page.locator('.observation-aim-hint').innerText(), /恢复主镜焦距 800 mm/);
    await page.evaluate(() => Newton.store.set({ focal: 800 }));
    await moveSlider(25, 5, 10);
    await page.waitForFunction(() => {
      const aim = Newton.app.preview.aim;
      return aim?.distance > .22 && aim.distance < .28 && aim.recordingCentered;
    });
    assert.equal(await draw.isVisible(), true, 'The pictured near-center Saturn at 10 mm can be recorded');
    const yaw = await page.evaluate(() => {
      const model = Newton.app.observationModel;
      const original = model.yaw;
      model.yaw += Newton.store.metrics({ ...Newton.store.get(), eyepiece: 25 }).field * Math.PI / 360 * .30;
      model.render();
      return original;
    });
    await page.waitForFunction(() => !Newton.app.preview.aim?.recordingCentered);
    assert.equal(await draw.isVisible(), false, 'A real turn away blocks drawing');
    await page.evaluate(yaw => {
      Newton.app.observationModel.yaw = yaw;
      Newton.app.observationModel.render();
    }, yaw);
    await draw.waitFor();
    assert.match(await page.locator('.observation-aim-hint').innerText(), /绘制记录/);
    await watchView();
    await draw.click();
    await checkView(2);
    assert.equal(await page.evaluate(() => Newton.course.get().complete), false);
    await moveSlider(10, 5, 5);
    try {
      await page.waitForFunction(() => Newton.app.preview.aim?.distance > .05 && Newton.app.preview.aim.recordingCentered, null, { timeout: 4000 });
    } catch (error) {
      console.error('Pointing after the 5 mm change:', await page.evaluate(() => Newton.app.preview.aim));
      throw error;
    }
    await watchView();
    await draw.click();
    await checkView(3);
    await page.locator('.completion-dialog[open] .completion-confirm').click();
    await book.waitFor();
    const cards = book.locator('.observation-record-card');
    assert.equal(await cards.count(), 3);
    assert.deepEqual(await cards.locator('h3').allTextContents(), ['1 · 25 mm', '2 · 10 mm', '3 · 5 mm']);
    assert.deepEqual(await cards.locator('dd').allTextContents(),
      ['25 mm','800 mm','32×','1.88°','10 mm','800 mm','80×','0.75°','5 mm','800 mm','160×','0.38°']);
    assert.equal(await book.locator('button').count(), 1);
    assert(await cards.locator('img').evaluateAll(images => images.every(i => i.complete && i.naturalWidth === 320)));
    if (process.env.RECORD_SCREENSHOT) await page.screenshot({ path: process.env.RECORD_SCREENSHOT });
    await book.locator('.observation-record-close').click();
    await page.evaluate(() => Newton.store.set({ eyepiece: 27 }));
    for (const [id, label] of [[other, offline ? '土星' : '月球'], ['jupiter', '木星'], ['pleiades', '昴星团']]) {
      await select(id);
      await aimAtSelectedTarget(page);
      await page.waitForFunction(label =>
        document.querySelector('.observation-aim-hint').textContent === label + '观测完成', label);
      assert.equal(await page.locator(`[data-observation-target=${id}]`).getAttribute('data-observed'), 'true');
      assert.equal(await draw.isVisible(), false);
      assert.equal(await notebook.locator('b').innerText(), '3/3');
    }
    await notebook.click();
    assert.match(await book.locator('.observation-record-subtitle').innerText(), new RegExp(name+' · 3/3'));
    await page.evaluate(() => Newton.course.resetStage());
    assert.equal(await book.isVisible(), false);
    await count(0);
    assert.deepEqual(errors, []);
    console.log('PASS guided single-target recording, actual eyepiece snapshots, one-page notebook, and reset ('+(offline?'offline':'HTTP')+').');
  } finally {
    await browser?.close();
    server?.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

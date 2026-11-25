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
    const { directionState: state, directionDuration: duration, directionCamera: camera, directionOpeningVelocity: openingVelocity } = await import('./velocity.js');
    const early = [.05, .5, 1.299].map(t => [state(t, 'straight'), state(t, 'turn')]);
    const straight = Array.from({ length: 400 }, (_, i) => state(duration('straight') * i / 399, 'straight'));
    return {
      early, straight,
      vectors: [0,2,4,7].map(t=>[openingVelocity(t,'straight'),openingVelocity(t,'turn')]),
      turnBefore: camera(1.299, 'turn'), turnAtStart: camera(1.3, 'turn'),
      straightAtTurn: camera(1.3, 'straight'), straightCameraAtCutoff: camera(4, 'straight'),
      reducedTurnAtStart: camera(1.3, 'turn', true),
      turn: state(1.301, 'turn'), beforeOrbit: state(4 - 1e-5, 'turn'),
      insertion: state(4, 'turn'), end: state(duration('turn'), 'turn'),
      nextLap: state(duration('turn')+.5, 'turn'),
      straightBeforeCutoff: state(4 - 1e-5, 'straight'), straightAtCutoff: state(4, 'straight'),
    };
  });
  for (const [straight, turn] of samples.early) assert.deepEqual(straight, turn);
  for (const [i,[straight,turn]] of samples.vectors.entries()) {
    assert.equal(straight.tilt,0);
    assert.equal(straight.horizontal,0);
    if(i===0)assert.deepEqual(straight,turn);
    else{
      assert(straight.vertical<samples.vectors[i-1][0].vertical);
      assert(turn.horizontal>samples.vectors[i-1][1].horizontal);
      assert(turn.tilt>samples.vectors[i-1][1].tilt);
    }
  }
  assert.deepEqual(samples.turnBefore, { wide: 0, pullingBack: false });
  assert.deepEqual(samples.turnAtStart, { wide: 0, pullingBack: true });
  assert.deepEqual(samples.straightAtTurn, samples.turnBefore);
  assert.deepEqual(samples.straightCameraAtCutoff, samples.turnBefore);
  assert.deepEqual(samples.reducedTurnAtStart, { wide: 1, pullingBack: false });
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

async function run(browser, viewport, offline = false) {
  const record = output && !offline && viewport.width === 1920;
  const context = await browser.newContext({
    viewport,
    ...(record ? { recordVideo: { dir: output, size: { width: 1280, height: 720 } } } : {}),
    ...(offline ? { offline: true, reducedMotion: 'reduce' } : {}),
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype;
    const { clearRect, drawImage, fillText } = proto;
    proto.clearRect = function (...args) {
      if (this.canvas.id === 'scene') { window.flightLabels = []; window.flightLabelSizes = []; window.flightLabelAnchors = []; window.starLayer = null; }
      return clearRect.apply(this, args);
    };
    proto.drawImage = function (source, ...args) {
      if (this.canvas.id === 'scene' && source instanceof HTMLCanvasElement
          && source.width === 1920 && source.height === 1080 && args.length === 4 && args[1] >= 0) {
        window.starLayer = { shift: args[1], opacity: this.globalAlpha };
      }
      return drawImage.call(this, source, ...args);
    };
    proto.fillText = function (text, ...args) {
      if (this.canvas.id === 'scene') {
        window.flightLabels?.push(text);
        if(['引力','竖直速度','水平速度','推进加速度'].includes(text)){
          window.flightLabelAnchors?.push({x:args[0],y:args[1],align:this.textAlign});
          const matrix=this.getTransform();
          window.flightLabelSizes?.push(Number(this.font.match(/([\d.]+)px/)[1])*Math.hypot(matrix.a,matrix.b));
        }
      }
      return fillText.call(this, text, ...args);
    };
  });
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(error.message));
  if (offline) page.on('request', request => {
    if (/^https?:/.test(request.url())) external.push(request.url());
  });
  const shot = name => record && page.screenshot({ animations: 'disabled', path: path.join(output, name + '.png') });
  const state = () => page.evaluate(() => {
    const { age, direction } = RocketModel.scene.state;
    return { age, straight: direction.straight.phase, turn: direction.turn.phase };
  });
  const phase = (condition, name) => page.waitForFunction(
    ([condition, name]) => RocketModel.scene.state.direction[condition].phase === name,
    [condition, name]
  );
  const forceLabels = () => page.evaluate(() => window.flightLabels.filter(text =>
    ['引力', '推进加速度', '箭头 · 速度'].includes(text)));
  const cannon = () => page.locator('#steps').getByRole('button', { name: '高山大炮' }).click();
  const showComparison = async () => {
    const intro = page.locator('.direction-orbit-intro[data-orbit-state="ready"]');
    await intro.waitFor();
    assert.equal(await intro.locator('canvas').count(), 2);
    assert.equal(await page.getByText('卫星如何进入近地轨道？', { exact: true }).isVisible(), true);
    assert.equal(await page.locator('.direction-panels').count(), 0);
    await page.getByRole('button', { name: '查看演示', exact: true }).click();
    await page.locator('.direction-orbit-intro').waitFor({ state: 'detached' });
    assert.equal(await page.getByText('卫星如何进入近地轨道？', { exact: true }).count(), 0);
    assert.equal(await page.locator('#direction-fire').evaluate(el => el === document.activeElement), true);
  };
  const vertical = async () => {
    await page.locator('#steps').getByRole('button', { name: '垂直发射' }).click();
    await showComparison();
  };
  try {
    await page.goto(offline ? pathToFileURL(process.env.DIRECTION_OFFLINE_HTML).href : origin + entry);
    await page.waitForFunction(() => Boolean(window.RocketModel));
    if (!offline && viewport.width === 1920) await checkGeometry(page);
    await page.locator('#chapters > button').filter({ hasText: '速度与轨道' }).click();
    if (!offline && viewport.width === 1920) {
      await page.locator('#velocity-speed').fill('2.8');
      await page.locator('#velocity-fire').click();
      await page.waitForFunction(() => RocketModel.scene.state.presentation?.rangeProgress === 1);
      // A rejected background clip must not strand replay before launch.
      await page.evaluate(() => {
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          if (this.getAttribute('src')?.endsWith('/fast-ground.mp4')) {
            HTMLMediaElement.prototype.play = play;
            return Promise.reject(new DOMException('Blocked by regression test', 'NotAllowedError'));
          }
          return play.call(this);
        };
      });
      await page.locator('#velocity-fire').click();
      await page.waitForFunction(() => RocketModel.scene.state.presentation?.launched);
      assert.equal(await page.evaluate(() => RocketModel.scene.state.transition.error), true);
      const gravityArrow = await page.evaluate(() => RocketForces.lastDraws.find(({id}) => id === 'gravity'));
      assert(gravityArrow?.tipLength > 0, 'Cannon gravity uses the shared force arrow');
      assert.equal(gravityArrow.angle, Math.PI / 2);
      assert.equal(await page.evaluate(() => RocketModel.scene.state.presentation.rangeProgress), undefined);
      await page.waitForFunction(() => RocketModel.scene.state.presentation?.rangeProgress === 1);
    }
    assert.match(await page.locator('#next').innerText(), /垂直发射/);
    await page.locator('#next').click();
    assert.match(await page.locator('#next').innerText(), /推力与载荷/);
    await showComparison();
    if (offline) {
      assert.equal(await page.locator('.stage').evaluate(el => getComputedStyle(el).animationName), 'none');
    }
    assert.equal(await page.locator('#velocity-speed,#velocity-compare,#velocity-adjust').count(), 0);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-direction],#direction-adjust').count(), 0);
    const left = page.getByRole('region', { name: '无水平推力', exact: true });
    const right = page.getByRole('region', { name: '有水平推力', exact: true });
    assert.equal(await page.locator('.direction-panels section > :not(h3)').count(), 0);
    const leftRect = await left.boundingBox(), rightRect = await right.boundingBox();
    assert(leftRect.x + leftRect.width < rightRect.x);
    assert.equal(leftRect.y, rightRect.y);
    assert(Math.abs(leftRect.width - rightRect.width) < .1);
    assert.deepEqual(await state(), { age: 0, straight: 'ready', turn: 'ready' });
    assert.equal(await page.locator('#direction-fire').isEnabled(), true);
    assert.match(await page.locator('#direction-conclusion').innerText(), /哪一种发射方式/);
    await page.waitForFunction(() => {
      const canvas=document.querySelector('#scene');
      return canvas.getContext('2d').getImageData(294,290,24,86).data
        .some((value,index,pixels)=>index%4===0&&value===164&&pixels[index+1]===220&&pixels[index+2]===227);
    });
    const openingPixels = await page.locator('#scene').evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      const rocketPixels = x => {
        const pixels = ctx.getImageData(x,290,24,86).data;
        let count = 0;
        for(let i=0;i<pixels.length;i+=4){
          if(pixels[i]===164&&pixels[i+1]===220&&pixels[i+2]===227)count++;
        }
        return count;
      };
      return [rocketPixels(294),rocketPixels(930)];
    });
    assert(openingPixels.every(count=>count>100));
    assert(Math.abs(openingPixels[0]-openingPixels[1])<6);
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#scene');
      const pixels = canvas.getContext('2d').getImageData(120, 440, 100, 80).data;
      const colors = new Set();
      for(let i=0;i<pixels.length;i+=4){
        if(pixels[i+3]===255)colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);
      }
      return colors.size>16;
    });
    assert.deepEqual(await forceLabels(), []);
    await shot('01-双屏待发');
    const openingShot = (phase, index = 0, local = 0) => page.waitForFunction(
      ([phase, index, local]) => {
        const shot = RocketModel.directionOpening;
        return shot.phase === phase && shot.index === index && shot.local >= local;
      },
      [phase, index, local]
    );
    await page.locator('#direction-fire').click();
    assert.equal(await page.locator('#next').isDisabled(), true);
    await openingShot('ascent');
    await page.waitForFunction(() => window.flightLabels?.filter(text=>text==='引力').length===2);
    assert.deepEqual(await forceLabels(), ['引力', '引力']);
    const pause = page.locator('#direction-pause');
    await pause.click();
    const image = () => page.locator('#scene').evaluate(canvas => canvas.toDataURL());
    const frozen = await image();
    await page.waitForTimeout(180);
    assert.equal(await image(), frozen);
    await pause.click();

    await openingShot('ascent', 0, .49);
    await shot('02a-穿越云层');
    await openingShot('ascent', 0, .8);
    const earlyStars = await page.evaluate(() => window.starLayer);
    assert(earlyStars && earlyStars.opacity > .1 && earlyStars.opacity < 1);
    await openingShot('ascent', 0, .97);
    const lateStars = await page.evaluate(() => window.starLayer);
    assert(lateStars.opacity > earlyStars.opacity);
    if (offline) assert.equal(lateStars.shift, 0);
    else assert(lateStars.shift > earlyStars.shift);
    await shot('02b-飞出大气层');
    await openingShot('animation', 0);
    await openingShot('animation', 1);
    const skyPatches = () => page.locator('#scene').evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      return [100, 736].map(x => String.fromCharCode(...ctx.getImageData(x, 160, 64, 64).data));
    });
    const skyBefore = await skyPatches();
    await page.waitForTimeout(140);
    const skyDuring = await skyPatches();
    for (const [index, patch] of skyDuring.entries()) {
      if (offline) assert.equal(patch, skyBefore[index], 'reduced motion holds the sky still');
      else assert.notEqual(patch, skyBefore[index], 'the sky keeps moving after the image has faded out');
    }
    await pause.click();
    const skyPaused = await skyPatches();
    await page.waitForTimeout(140);
    assert.deepEqual(await skyPatches(), skyPaused);
    await pause.click();
    const componentArrows=await page.evaluate(()=>RocketForces.lastDraws.map(({id,angle})=>[id,angle]));
    assert.deepEqual(componentArrows,[
      ['direction-straight-vertical',-Math.PI/2],
      ['direction-straight-gravity',Math.PI/2],
      ['direction-turn-vertical',-Math.PI/2],
      ['direction-turn-horizontal',0],
      ['direction-turn-gravity',Math.PI/2],
    ]);
    const annotationSizes=await page.evaluate(()=>window.flightLabelSizes);
    assert.equal(annotationSizes.length,5);
    assert(annotationSizes.every(size=>Math.abs(size-20)<.01));
    const anchoredAtTips=await page.evaluate(()=>{
      return RocketForces.lastDraws.every(({id,x,y,angle,length,tipLength},i)=>{
        const anchor=window.flightLabelAnchors[i];
        const tipX=x+Math.cos(angle)*tipLength,tipY=y+Math.sin(angle)*tipLength;
        if(id==='direction-turn-horizontal'){
          return anchor?.align==='left'&&Math.abs(anchor.x-tipX-26)<.01&&Math.abs(anchor.y-tipY)<.01;
        }
        return tipLength<length&&anchor?.align==='center'&&Math.abs(anchor.x-tipX)<.01
          &&Math.abs(Math.abs(anchor.y-tipY)-22)<.01;
      });
    });
    assert(anchoredAtTips);
    await shot('02-分级分离');
    await openingShot('animation', 2);
    await openingShot('animation', 3);
    assert.deepEqual(await forceLabels(), ['引力', '引力']);
    assert.equal(await page.evaluate(() => RocketChapter3.adapter.mode), null);
    await shot('03-释放载荷');
    if (!offline) {
      await page.waitForFunction(() => RocketModel.scene.directionPullingBack('turn'));
      assert.equal(await page.evaluate(() => RocketModel.scene.directionPullingBack('straight')), false);
      await page.waitForFunction(() => !RocketModel.scene.directionPullingBack('turn'));
    }
    await phase('turn', 'turn');
    assert.deepEqual(await forceLabels(), ['引力', '引力', '推进加速度']);

    await phase('turn', 'orbit');
    const globeColors = await page.locator('#scene').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(906, 240, 72, 72).data;
      const colors = new Set();
      for (let i = 0; i < pixels.length; i += 4) {
        colors.add((pixels[i] << 16) | (pixels[i+1] << 8) | pixels[i+2]);
      }
      return colors.size;
    });
    assert(globeColors > 16, 'the orbital shot uses the textured globe');
    assert.deepEqual(await forceLabels(), ['引力', '引力']);
    assert.equal(await page.locator('#next').isDisabled(), true);
    assert.equal(await page.locator('#direction-conclusion').isHidden(), true);
    await phase('straight', 'fall');
    if(!offline){
      assert.deepEqual(await page.evaluate(() => ['straight', 'turn'].map(RocketModel.scene.directionPullingBack)), [true, false]);
    }
    await shot('04-回落与环绕');
    await page.waitForFunction(() => {
      const { direction } = RocketModel.scene.state;
      return direction.straight.phase === 'landed' && direction.turn.phase === 'orbited';
    });
    assert.equal(await page.locator('#next').isEnabled(), true);
    assert.match(await page.locator('#direction-conclusion').innerText(), /转向的一侧成功入轨/);
    const completed = await state();
    await page.waitForFunction(age => RocketModel.scene.state.age > age + .25, completed.age);
    assert.equal((await state()).turn, 'orbited');
    await shot('05-双屏结果');

    const bounds = await page.locator('#app').evaluate(app => {
      const outer = app.getBoundingClientRect();
      const buttons = [...app.querySelectorAll('#controls button,#page-actions button,#next')].filter(button => !button.hidden);
      return buttons.every(button => {
        const rect = button.getBoundingClientRect();
        return rect.left >= outer.left && rect.right <= outer.right && rect.bottom <= outer.bottom && rect.height >= 40;
      });
    });
    assert(bounds);
    await page.locator('#direction-fire').click();
    await openingShot('ascent');
    await cannon();
    await vertical();
    assert.deepEqual(await state(), { age: 0, straight: 'ready', turn: 'ready' });
    await page.locator('#next').click();
    await page.waitForFunction(() => RocketChapter3.step === 2 && RocketChapter3.adapter.ready);
    await page.locator('#launch-fire').click();
    await page.waitForFunction(() => !document.querySelector('#launch-fire').disabled);
    if (!offline) {
      await page.reload();
      await page.locator('#chapters > button').filter({ hasText: '速度与轨道' }).click();
      await vertical();
      assert.deepEqual(await state(), { age: 0, straight: 'ready', turn: 'ready' });
    } else {
      assert.deepEqual(external, []);
    }
    assert.deepEqual(errors, []);
    console.log('PASS', viewport, offline ? 'offline with reduced motion' : 'online');
  } finally {
    const video = page.video();
    await context.close();
    if (record && video) await video.saveAs(path.join(output, '垂直发射双屏对照.webm'));
    if (record && video) await video.delete();
  }
}

(async () => {
  if (output) fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    await run(browser, { width: 1920, height: 1080 });
    await run(browser, { width: 1280, height: 720 });
    if (process.env.DIRECTION_OFFLINE_HTML) {
      await run(browser, { width: 1280, height: 720 }, true);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

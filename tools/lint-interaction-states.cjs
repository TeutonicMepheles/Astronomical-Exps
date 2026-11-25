const assert = require('node:assert/strict');
const { checkRecovery, inspectPageRules } = require('./lint-page-rules.cjs');
const boxDimensions = ['x', 'y', 'width', 'height'];

function coordinate(box, dimension) {
  if (dimension === 'right') return box.x + box.width;
  if (dimension === 'bottom') return box.y + box.height;
  return box[dimension];
}

// Register the controls and observable endpoints here. The runner owns the
// sequence, geometry comparison, and reporting for every experiment.
const scenarios = {
  'foucault-pendulum': async page => {
    const trigger = page.locator('#paramButton');
    const dialog = page.locator('#parameterDialog');
    await page.locator('.city[data-id=shanghai]').click();
    return {
      name: '单摆参数开合', anchors: [trigger],
      forward: () => trigger.click(), back: () => page.keyboard.press('Escape'),
      a: () => dialog.waitFor({ state: 'hidden' }),
      b: () => dialog.waitFor({ state: 'visible' })
    };
  },
  'lunar-crater-height': async page => {
    const forward = page.locator('#confirmLight');
    const back = page.locator('#previousStep');
    await page.locator('#lightPanel [data-nudge="5"]').click();
    return {
      name: '光照与辅助轮廓往返',
      anchors: ['light', 'start', 'measure', 'height'].map(step =>
        page.locator(`.measurement-steps [data-step="${step}"]`)),
      forward: () => forward.click(), back: () => back.click(),
      a: () => forward.waitFor({ state: 'visible' }),
      b: () => page.locator('#start').waitFor({ state: 'visible' })
    };
  },
  'meteor-impact': async page => {
    await page.locator('#start').click({ timeout: 30000 });
    for (const name of ['陨石大小', '实验 1', '小 20 m', '实验 2', '大 300 m']) {
      await page.getByRole('button', { name, exact: true }).click();
    }
    const nodes = page.locator('.story-stage-progress li');
    const steps = ['factors', 'settings', 'observe'].map(step =>
      nodes.and(page.locator(`[data-step="${step}"]`)));
    return {
      name: '实验进度节点与阶段返回',
      anchors: steps.flatMap(step => [step, step.locator('b')]),
      forward: () => page.locator('#fire').click(),
      back: () => nodes.and(page.locator('[data-step="settings"]')).click(),
      a: () => page.locator('#story[data-stage="settings"] #fire:enabled').waitFor(),
      b: () => page.locator('#story[data-stage="observe"] #result-views').waitFor()
    };
  },
  'earth-circumference': async page => {
    const tabs = page.getByRole('tablist', { name: '主视图模式' });
    const orbit = tabs.getByRole('tab', { name: '公转观测', exact: true });
    const earth = tabs.getByRole('tab', { name: '自转观测', exact: true });
    await orbit.click();
    return {
      name: '公转与自转观测往返', anchors: [orbit, earth],
      forward: () => earth.click(), back: () => orbit.click(),
      a: () => page.locator('#stage[data-view-mode="orbit"]').waitFor(),
      b: () => page.locator('#stage[data-view-mode="earth"]').waitFor()
    };
  },
  'light-pollution': async page => {
    await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 90000 });
    const trigger = page.getByRole('button', { name: '调光', exact: true });
    const panel = page.locator('#global-dimming-panel');
    return {
      name: '全局调光开合', anchors: [trigger],
      forward: () => trigger.click(), back: () => trigger.click(),
      a: () => panel.waitFor({ state: 'hidden' }),
      b: () => panel.getByRole('group', { name: '照明档位' }).waitFor()
    };
  },
  'solar-lunar-eclipses': async page => {
    await page.locator('[data-event=lunar]').click();
    const oblique = page.locator('#observationOblique');
    const level = page.locator('#observationSide');
    const settled = camera => page.locator(
      `#scene[data-observation-camera="${camera}"][data-camera-transition="false"]`).waitFor();
    await oblique.click();
    await settled('oblique');
    return {
      name: '月食侧视与正视往返', anchors: [oblique, level],
      forward: () => level.click(), back: () => oblique.click(),
      a: () => settled('oblique'), b: () => settled('level'),
      inFlight: () => page.locator('#scene[data-camera-transition="true"]').waitFor(),
      verifyNoLateReturn: () => page.waitForFunction(async () => {
        const scene = document.querySelector('#scene');
        const end = performance.now() + 1600;
        while (performance.now() < end) {
          if (scene.dataset.observationCamera !== 'oblique' || scene.dataset.cameraTransition !== 'false') {
            throw Error('旧镜头转场在返回后重新生效');
          }
          await new Promise(requestAnimationFrame);
        }
        return true;
      })
    };
  },
  'newton-telescope': async page => {
    await page.locator('.newton-objective__confirm').click();
    await page.locator('.newton-objective[open]').waitFor({ state: 'hidden' });
    // The objective folds into the progress button and pulses it once.
    await page.locator('#course-progress').evaluate(async node => {
      await Promise.all(node.getAnimations().map(animation => animation.finished));
    });
    const trigger = page.locator('.newton-task-progress__toggle');
    const popup = page.locator('.newton-task-progress__popup');
    return {
      name: '实验进度开合', anchors: [trigger],
      forward: () => trigger.click(), back: () => trigger.click(),
      a: () => popup.waitFor({ state: 'hidden' }),
      b: () => popup.getByRole('tablist').waitFor()
    };
  },
  'rocket-launch': async page => {
    await page.locator('#chapters > button').filter({ hasText: '速度与轨道' }).click();
    const steps = page.locator('#steps');
    const cannon = steps.locator('button').filter({ hasText: '高山大炮' });
    const vertical = steps.locator('button').filter({ hasText: '垂直发射' });
    return {
      name: '速度与轨道子页往返', anchors: [cannon, vertical],
      forward: () => vertical.click(), back: () => cannon.click(),
      a: () => cannon.and(steps.locator('[aria-current=step]')).waitFor(),
      b: () => vertical.and(steps.locator('[aria-current=step]')).waitFor()
    };
  }
};

const additionalScenarios = {
  'solar-lunar-eclipses': async page => {
    const solar = page.locator('#solarCategory');
    const lunar = page.locator('[data-event=lunar]');
    const disclosure = page.locator('.eclipse-event-disclosure');
    const settled = expanded => async () => {
      await solar.and(page.locator(`[aria-expanded="${expanded}"]`)).waitFor();
      await disclosure.evaluate(async node => {
        await Promise.all(node.getAnimations().map(animation => animation.finished));
      });
    };
    await solar.click();
    return {
      name: '食象类别折叠锚点',
      anchors: [page.locator('#observationModes'), lunar],
      fixedAnchors: [['right', 'y']],
      forward: () => lunar.click(), back: () => solar.click(),
      a: settled(true), b: settled(false)
    };
  },
  'rocket-launch': async (page, record) => {
    const cannon = page.locator('#steps button').filter({ hasText: '高山大炮' });
    await cannon.click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const fire = page.locator('#velocity-fire');
    const pause = page.locator('#velocity-pause');
    const adjust = page.locator('#velocity-adjust');
    const speed = page.locator('#velocity-speed');
    const initialSpeed = await speed.inputValue();
    const playback = page.locator('#app.orbit-playing');
    const playing = () => playback.waitFor();
    return {
      name: '高山大炮暂停锚点与播放往返', anchors: [pause],
      forward: async confirm => {
        await fire.click();
        await playing();
        await pause.click();
        await confirm('paused', () => pause.getByText('继续', { exact: true }).waitFor(), 'B / paused');
        await pause.click();
      },
      back: async confirm => {
        await confirm('complete', () => adjust.waitFor({ timeout: 45000 }), 'B / complete');
        await adjust.click();
        await checkRecovery(record, {
          state: '高山大炮 / 返回调速',
          expected: { speed: initialSpeed, speedVisible: true, speedEnabled: true, canStart: true,
            startLabel: '开始', pauseEnabled: false, adjustVisible: false, playing: false },
          read: async () => ({
            speed: await speed.inputValue(), speedVisible: await speed.isVisible(),
            speedEnabled: await speed.isEnabled(), canStart: await fire.isEnabled() && await fire.isVisible(),
            startLabel: await fire.innerText(), pauseEnabled: await pause.isEnabled(),
            adjustVisible: await adjust.isVisible(), playing: await playback.isVisible()
          })
        });
      },
      a: () => page.locator('#velocity-speed').waitFor(),
      b: playing
    };
  }
};

async function measure(anchors) {
  return Promise.all(anchors.map(async locator => {
    const box = await locator.boundingBox();
    assert(box?.width > 0 && box.height > 0, `固定控件缺失或不可见: ${locator}`);
    return box;
  }));
}

async function inspectScenario(prepare, page, experiment, viewport, tolerance, report, record) {
  const run = { experiment, viewport, phases: [], violations: [] };
  report.push(run);
  const scenario = await prepare(page, record);
  run.name = scenario.name;
  let baseline;
  const stateBaselines = new Map();
  async function confirm(state, wait, phase = state) {
    await wait();
    const boxes = await measure(scenario.anchors);
    run.phases.push({ phase, state, boxes });
    baseline ??= boxes;
    const previous = stateBaselines.get(state);
    if (!previous) stateBaselines.set(state, boxes);
    for (const [index, box] of boxes.entries()) {
      const fixed = scenario.fixedAnchors?.[index];
      const comparisons = [{
        scope: 'cross-state', reference: baseline[index], dimensions: fixed ?? boxDimensions
      }];
      if (fixed && previous) {
        comparisons.push({ scope: 'same-state', reference: previous[index], dimensions: boxDimensions });
      }
      for (const { scope, reference, dimensions } of comparisons) {
        for (const dimension of dimensions) {
          const delta = coordinate(box, dimension) - coordinate(reference, dimension);
          if (Math.abs(delta) > tolerance) {
            run.violations.push({ phase, state, scope, anchor: String(scenario.anchors[index]), dimension, delta });
          }
        }
      }
    }
  }
  await confirm('A', scenario.a);
  await scenario.forward(confirm);
  await confirm('B', scenario.b);
  await scenario.back(confirm);
  await confirm('A', scenario.a, 'A / return');
  await scenario.forward(confirm);
  await confirm('B', scenario.b, 'B / reenter');
  if (scenario.inFlight) {
    await scenario.back();
    await scenario.a();
    await scenario.forward();
    await scenario.inFlight();
    await scenario.back();
    await confirm('A', scenario.a, 'A / interrupt');
    await scenario.verifyNoLateReturn();
  }
}

async function inspectInteraction(page, experiment, viewport, tolerance, report, ruleChecks = []) {
  const record = check => ruleChecks.push({ experiment, viewport, ...check });
  await inspectScenario(scenarios[experiment], page, experiment, viewport, tolerance, report, record);
  if (additionalScenarios[experiment]) {
    await inspectScenario(additionalScenarios[experiment], page, experiment, viewport, tolerance, report, record);
  }
  await inspectPageRules(page, experiment, tolerance, record);
}

module.exports = { inspectInteraction };

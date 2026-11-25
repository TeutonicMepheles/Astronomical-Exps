const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { inspectInteraction } = require('./lint-interaction-states.cjs');

const root = resolve(__dirname, '..');
const selectors = '[role=tablist], [role=radiogroup], .lighting-step-bar, .segmented, .segments, [data-segmented-control]';
const tolerance = 1;
const experiments = ['foucault-pendulum', 'lunar-crater-height', 'meteor-impact', 'earth-circumference', 'light-pollution', 'solar-lunar-eclipses', 'newton-telescope', 'rocket-launch'];

async function startServer(server) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Local server startup timeout')), 15000);
    server.once('error', reject);
    server.once('exit', code => reject(new Error('Local server exited: ' + code)));
    server.stdout.on('data', chunk => {
      output += chunk;
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (url) {
        clearTimeout(timer);
        resolve(url[0]);
      }
    });
  });
}

async function measure(page) {
  return page.evaluate(selector => {
    const visible = element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility === 'visible';
    };
    const optionSelector = 'button, label, [role=tab], [role=radio]';
    return [...document.querySelectorAll(selector)].flatMap(group => {
      if (!visible(group)) return [];
      const options = [...group.children].filter(child => child.matches(optionSelector) && visible(child));
      if (options.length < 2) return [];
      const surfaces = options.map(option => option.matches('label')
        ? option.querySelector('input[type=radio] + span') || option : option);
      const rects = surfaces.map(surface => surface.getBoundingClientRect()).sort((a, b) => a.left - b.left);
      const first = rects[0];
      const last = rects.at(-1);
      if (last.left - first.left < 1 ||
        rects.some(rect => rect.top >= first.bottom || rect.bottom <= first.top)) return [];
      const frame = group.getBoundingClientRect();
      const gaps = rects.slice(1).map((rect, i) => rect.left - rects[i].right);
      const name = group.getAttribute('aria-label') ||
        group.closest('fieldset')?.querySelector('legend')?.textContent?.trim() ||
        group.id || group.className;
      return [{
        name, options: options.map(option => option.getAttribute('aria-label') || option.textContent.trim()),
        left: first.left - frame.left, right: frame.right - last.right,
        top: Math.min(...rects.map(rect => rect.top)) - frame.top,
        bottom: frame.bottom - Math.max(...rects.map(rect => rect.bottom)), gaps
      }];
    });
  }, selectors);
}

async function main() {
  let server, browser;
  const samples = [], failures = [], coverage = [], errors = [], interactions = [], ruleChecks = [];
  const preview = process.env.SEGMENTED_LINT_URL;
  try {
    let base = process.env.BASE_URL;
    if (!base && !preview) {
      server = spawn(process.env.PYTHON || 'python', ['tools/serve.py', '--port', '0'],
        { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
      base = await startServer(server);
    }
    browser = await chromium.launch(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {});
    let page;
    async function collect(experiment, viewport, state) {
      const groups = await measure(page);
      coverage.push({ experiment, viewport, state, controls: groups.length });
      for (const group of groups) {
        const row = { experiment, viewport, state, ...group };
        samples.push(row);
        const problems = [];
        if (Math.abs(group.left - group.right) > tolerance) problems.push('asymmetric-inline-inset');
        if (Math.min(group.left, group.right, group.top, group.bottom) < -tolerance) problems.push('surface-outside-frame');
        if (Math.min(...group.gaps) < -tolerance) problems.push('overlapping-options');
        if (Math.max(...group.gaps) - Math.min(...group.gaps) > tolerance) problems.push('uneven-option-gaps');
        if (problems.length) failures.push({ ...row, problems });
      }
    }
    async function inspectLights(experiment, viewport) {
      await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 90000 });
      const dimming = page.getByRole('button', { name: '调光', exact: true });
      await dimming.click();
      const dimmingPanel = page.locator('#global-dimming-panel');
      await dimmingPanel.waitFor({ state: 'visible' });
      await collect(experiment, viewport, '全局调光');
      await dimming.click();
      await dimmingPanel.waitFor({ state: 'hidden' });
      const markerIds = await page.evaluate(() => lightingUI.items().map(item => item.id));
      for (const id of markerIds) {
        await page.evaluate(() => lightingUI.close());
        await page.locator('.marker[data-id="' + id + '"]').click();
        await collect(experiment, viewport, id);
        const endRadios = page.locator('aside .lighting-step-bar input[type=radio]:visible');
        if (await endRadios.count() > 1) {
          await endRadios.first().check();
          await collect(experiment, viewport, id + ' / first');
          await endRadios.last().check();
          await collect(experiment, viewport, id + ' / last');
        }
        const detail = page.locator('#detail');
        if (await detail.isVisible()) {
          await detail.click();
          await collect(experiment, viewport, id + ' / alternate');
        }
      }
    }
    const widthList = preview ? [1920] : [1920, 1280];
    for (const width of widthList) {
      const viewport = { width, height: width * 9 / 16 };

      for (const experiment of preview ? ['light-pollution'] : experiments) {
        page = await browser.newPage({ reducedMotion: 'reduce', viewport });
        page.setDefaultTimeout(12000);
        try {
          await page.goto(preview || base + '/experiments/' + experiment + '/');
          if (!preview && ['lunar-crater-height', 'earth-circumference', 'light-pollution'].includes(experiment)) {
            await page.waitForURL(url => url.pathname !== '/experiments/' + experiment + '/');
          }
          await page.evaluate(async () => { await document.fonts.ready; });
          await collect(experiment, viewport, '入口');
          if (experiment === 'light-pollution') await inspectLights(experiment, viewport);
          if (experiment === 'foucault-pendulum') {
            await page.locator('.city[data-id=shanghai]').click();
            await page.locator('#paramButton').click();
            await collect(experiment, viewport, '参数');
          }
          if (experiment === 'newton-telescope') {
            await page.locator('.newton-objective__confirm').click();
            await collect(experiment, viewport, '镜片认识');
            await page.locator('.newton-task-progress__toggle').click();
            await collect(experiment, viewport, '实验进度');
          }
          if (experiment === 'solar-lunar-eclipses') {
            for (const kind of ['annular', 'lunar']) {
              await page.locator('[data-event=' + kind + ']').click();
              await collect(experiment, viewport, kind);
            }
          }
          if (experiment === 'rocket-launch') {
            await page.locator('#chapters > button').last().click();
            await page.locator('#steps button').last().click();
            await collect(experiment, viewport, '部件认识');
          }
          if (experiment === 'meteor-impact') {
            await page.locator('#start').click({timeout: 30000});
            for (const label of ['陨石大小', '实验 1', '小 20 m', '实验 2', '大 300 m']) {
              await page.getByRole('button', {name: label, exact: true}).click();
            }
            await page.locator('#fire').click();
            await collect(experiment, viewport, '撞击结果');
            await page.locator('#openRecords').click();
            await collect(experiment, viewport, '实验记录');
          }
          if (experiment === 'lunar-crater-height') {
            await page.locator('#lightPanel [data-nudge="5"]').click();
            await page.locator('#confirmLight').click();
            await collect(experiment, viewport, '辅助轮廓');
          }
        } catch (error) {
          errors.push({ experiment, viewport, message: error.message });
        } finally {
          await page.close();
        }
        const interactionPage = await browser.newPage({ viewport });
        interactionPage.setDefaultTimeout(12000);
        try {
          await interactionPage.goto(preview || base + '/experiments/' + experiment + '/');
          if (!preview && ['lunar-crater-height', 'earth-circumference', 'light-pollution'].includes(experiment)) {
            await interactionPage.waitForURL(url => url.pathname !== '/experiments/' + experiment + '/');
          }
          await interactionPage.evaluate(async () => { await document.fonts.ready; });
          await inspectInteraction(interactionPage, experiment, viewport, tolerance, interactions, ruleChecks);
        } catch (error) {
          errors.push({ experiment, viewport, rule: 'interaction-states', message: error.message });
        } finally {
          await interactionPage.close();
        }
      }
    }
  } finally {
    await browser?.close();
    server?.kill();
  }
  const report = { rule: 'segmented-control-geometry', toleranceCssPx: tolerance,
    coverage, samples, failures, interactions, ruleChecks, errors };
  const directory = resolve(root, 'artifacts');
  mkdirSync(directory, { recursive: true });
  const file = resolve(directory, preview ? 'segmented-layout-preview.json' : 'segmented-layout.json');
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  for (const finding of failures) {
    console.error(finding.experiment, finding.viewport.width, finding.state, finding.name,
      finding.problems.join(', '), 'left=' + finding.left.toFixed(2), 'right=' + finding.right.toFixed(2));
  }
  const ruleFailures = ruleChecks.filter(check => check.problems.length);
  for (const check of ruleFailures) {
    console.error(check.experiment, check.viewport.width, check.rule, check.state, check.problems.join('；'));
  }
  let anchorViolations = 0;
  for (const run of interactions) {
    for (const finding of run.violations) {
      anchorViolations++;
      console.error(run.experiment, run.viewport.width, run.name, finding.phase, finding.scope,
        finding.anchor, finding.dimension, finding.delta.toFixed(2) + ' CSS px');
    }
  }
  for (const error of errors) console.error(error.experiment, error.viewport.width, error.message);
  console.log(samples.length + ' controls measured, ' + interactions.length + ' interaction runs, ' +
    failures.length + ' layout violations, ' + anchorViolations + ' anchor violations, ' +
    ruleChecks.length + ' page rule checks, ' + ruleFailures.length + ' failed, ' +
    errors.length + ' errors. ' + file);
  if (failures.length || anchorViolations || ruleFailures.length || errors.length || !samples.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });

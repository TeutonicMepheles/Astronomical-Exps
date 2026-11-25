const assert = require('node:assert/strict');

async function checkRecovery(record, { state, read, expected }) {
  const actual = await read();
  const problems = Object.keys(expected).filter(key => !Object.is(actual[key], expected[key]));
  record({ rule: 'state-recovery', state, actual, expected, problems });
}

const right = box => box.x + box.width;
const bottom = box => box.y + box.height;
const contains = (outer, inner, tolerance) =>
  inner.x >= outer.x - tolerance && inner.y >= outer.y - tolerance &&
  right(inner) <= right(outer) + tolerance && bottom(inner) <= bottom(outer) + tolerance;

function overlap(box, cover, tolerance) {
  if ('radius' in box) {
    const x = Math.max(cover.x - box.cx, box.cx - right(cover), 0);
    const y = Math.max(cover.y - box.cy, box.cy - bottom(cover), 0);
    return Math.hypot(x, y) < box.radius - tolerance;
  }
  return Math.min(right(box), right(cover)) - Math.max(box.x, cover.x) > tolerance &&
    Math.min(bottom(box), bottom(cover)) - Math.max(box.y, cover.y) > tolerance;
}

function checkProtectedContent(record, { state, frame, subjects, covers, tolerance }) {
  const problems = [];
  for (const { name, box } of subjects) {
    if (!contains(frame, box, tolerance)) problems.push(name + ' 超出画面');
    for (const cover of covers) {
      if (overlap(box, cover.box, tolerance)) problems.push(name + ' 被 ' + cover.name + ' 遮挡');
    }
  }
  record({ rule: 'protected-content', state, subjects, covers, problems });
}

function checkAlignedRow(record, { state, expected, group, items, tolerance }) {
  const problems = [];
  const labels = items.map(item => item.label);
  if (labels.join('|') !== expected.join('|')) problems.push('条目缺失、重复或顺序不符');
  for (const [index, item] of items.entries()) {
    if (!item.visible || !item.value || !contains(group, item.box, tolerance) || item.clipped) {
      problems.push(item.label + ' 隐藏、无读数或裁切');
    }
    if (Math.abs(item.box.y - items[0].box.y) > tolerance ||
        Math.abs(item.box.height - items[0].box.height) > tolerance ||
        Math.abs(item.labelBottom - items[0].labelBottom) > tolerance ||
        Math.abs(item.valueBottom - items[0].valueBottom) > tolerance) {
      problems.push(item.label + ' 与同组条目未对齐');
    }
    if (index > 0 && item.box.x < right(items[index - 1].box) - tolerance) {
      problems.push(item.label + ' 与前项重叠');
    }
    if (index > 1 && Math.abs(item.box.x - right(items[index - 1].box) -
        (items[1].box.x - right(items[0].box))) > tolerance) {
      problems.push(item.label + ' 前间距不一致');
    }
  }
  record({ rule: 'aligned-group', state, expected, items, problems });
}

async function checkReachability(record, { state, target, verify }) {
  const box = await target.boundingBox();
  const point = box && { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  let hit;
  const problems = [];
  try {
    await target.click();
    await verify();
  } catch (error) {
    hit = point && await target.page().evaluate(({ x, y }) => {
      const node = document.elementFromPoint(x, y);
      const control = node?.closest('button, [role="button"], [id]') ?? node;
      return control && { tag: control.tagName, id: control.id, classes: control.getAttribute('class') };
    }, point);
    problems.push(error.message);
  }
  record({ rule: 'operation-reachable', state, target: String(target), point, hit, problems });
}

const scenarios = {
  'foucault-pendulum': async (page, tolerance, record) => {
    const readouts = page.locator('#hallReadouts');
    await page.keyboard.press('Escape');
    await readouts.waitFor();
    const data = await readouts.evaluate(node => {
      const box = el => el.getBoundingClientRect().toJSON();
      const items = [...node.querySelectorAll('.metric')].map(metric => {
        const label = metric.querySelector('dt');
        const value = metric.querySelector('output');
        const rect = box(metric);
        return {
          label: label?.textContent.trim(), value: value?.textContent.trim(),
          box: rect, labelBottom: label && box(label).bottom, valueBottom: value && box(value).bottom,
          visible: rect.width > 0 && rect.height > 0 && getComputedStyle(metric).visibility === 'visible',
          clipped: [metric, label, value].some(el => el &&
            /hidden|clip|auto|scroll/.test(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 1)
        };
      });
      return { group: box(node), items };
    });
    checkAlignedRow(record, { state: '上海观测', expected: ['纬度', '偏转周期', '偏转速度', '单摆周期'], ...data, tolerance });
  },
  'solar-lunar-eclipses': async (page, tolerance, record) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#solarCategory').click();
    for (const event of ['total', 'annular', 'lunar']) {
      await page.locator(`[data-event="${event}"]`).click();
      if (event !== 'lunar') await page.locator('#observerCandidates button').nth(1).click();
      await page.locator('#observer').waitFor();
      for (const [id, camera] of [['observationOblique', 'oblique'], ['observationSide', 'level']]) {
        await page.locator('#' + id).click();
        const scene = page.locator(`#scene[data-observation-camera="${camera}"][data-camera-transition="false"]`);
        await scene.waitFor();
        const phases = JSON.parse(await scene.getAttribute('data-contacts'));
        assert(phases.length >= 3, `${event} 缺少可检查的食相阶段`);
        for (const index of [0, Math.floor(phases.length / 2), phases.length - 1]) {
          const { phi, name } = phases[index];
          // Solar observation hides the phase rail. Use its existing angle
          // input to set the same deterministic observation sample.
          await page.locator('#moon').evaluate((input, angle) => {
            input.value = (angle * 180 / Math.PI + 360) % 360;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }, phi);
          await page.waitForFunction(angle => {
            const delta = Number(document.querySelector('#scene').dataset.phi) - angle;
            return Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) < .001;
          }, phi);
          const geometry = await scene.evaluate(canvas => {
            const frame = canvas.getBoundingClientRect().toJSON();
            const sx = frame.width / 1600, sy = frame.height / 900;
            const box = (x, y, w, h) => ({ x: frame.x + x * sx, y: frame.y + y * sy, width: w * sx, height: h * sy });
            const subjects = [['地球', 'earth'], ['月球', 'moon']].map(([name, key]) => {
              const { x, y } = JSON.parse(canvas.dataset[key + 'Center']);
              const radius = Number(canvas.dataset[key + 'Radius']);
              return { name, box: { ...box(x - radius, y - radius, 2 * radius, 2 * radius),
                cx: frame.x + x * sx, cy: frame.y + y * sy, radius: radius * sx } };
            });
            const context = document.createElement('canvas').getContext('2d');
            context.font = '600 24px ' + getComputedStyle(document.querySelector('#stage')).fontFamily;
            for (const { x, y, label } of JSON.parse(canvas.dataset.shadowLabels ?? '[]')) {
              const width = context.measureText(label).width;
              subjects.push({ name: label, box: box(x - width / 2, y - 13, width, 26) });
            }
            const cover = document.querySelector('#observer').getBoundingClientRect().toJSON();
            return { frame, subjects, covers: [{ name: '地面视角窗口', box: cover }] };
          });
          checkProtectedContent(record, { state: `${event} / ${camera} / ${name}`, ...geometry, tolerance });
        }
      }
    }
  },
  'light-pollution': async (page, tolerance, record) => {
    const road = page.locator('.marker[data-id="road"]');
    const detail = page.locator('#detail');
    const panel = page.getByRole('complementary', { name: '光源调节面板' });
    for (const exit of ['返回全景', '关闭面板']) {
      await road.click();
      await detail.click();
      await detail.getByText('返回全景', { exact: true }).waitFor();
      if (exit === '返回全景') await detail.click();
      else await page.locator('#close-panel').click();
      await checkReachability(record, {
        state: `路灯特写 → ${exit} → 重开体育场`,
        target: page.locator('.marker[data-id="stadium"]'),
        verify: () => panel.getByRole('heading', { name: '体育场照明', exact: true }).waitFor()
      });
      if (await panel.isVisible()) await page.locator('#close-panel').click();
    }
  }
};

async function inspectPageRules(page, experiment, tolerance, record) {
  await scenarios[experiment]?.(page, tolerance, record);
}

module.exports = { checkRecovery, inspectPageRules };

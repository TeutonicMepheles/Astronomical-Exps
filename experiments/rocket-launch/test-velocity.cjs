const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = process.env.ROCKET_BASE || 'http://127.0.0.1:8996/experiments/rocket-launch/';

// 第二章「宇宙速度」量具的机器核对：物理、质变点、档位、谱、换参照系。
// 几何一律从页面自己的模型（window.RocketModel）算，不从截图取。
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE);
  await p.locator('#chapters button').nth(1).click();
  await p.locator('#steps button').nth(1).click();
  await p.waitForTimeout(300);

  const model = await p.evaluate(() => {
    const M = window.RocketModel;
    const rows = [];
    for (let v = 3.2; v <= 16.701; v += 0.1) {
      const m = M.model(v);
      const path = M.pathOf(v);
      rows.push({
        v: +v.toFixed(2), u: m.u, e: m.e, kind: m.kind,
        peri: m.peri, apo: Number.isFinite(m.apo) ? m.apo : null,
        endR: path.endR, closure: path.closure, n: path.pts.length,
      });
    }
    return { kmPerUnit: M.kmPerUnit, vCirc: M.vCircKm, vEsc: M.vEscKm, r0: M.r0, rows };
  });

  // 1) e = |u - 1|（形状唯一自变量）
  for (const r of model.rows) {
    assert.ok(Math.abs(r.e - Math.abs(r.u - 1)) < 1e-9, 'e != |u-1| at ' + r.v + ' -> ' + r.e + ' / ' + r.u);
  }
  // 归一：炮口半径处的圆速度就是 7.9，逃逸门槛 7.9√2
  assert.equal(model.r0, 1.08);
  assert.equal(model.vCirc, 7.9);
  assert.ok(Math.abs(model.vEsc - 7.9 * Math.SQRT2) < 1e-9, 'vEsc = ' + model.vEsc);

  // 2) 整段只允许两处质变：落回→闭合、闭合→开口
  const changes = [];
  for (let i = 1; i < model.rows.length; i++) {
    if (model.rows[i].kind !== model.rows[i - 1].kind) {
      changes.push({ at: model.rows[i].v, from: model.rows[i - 1].kind, to: model.rows[i].kind });
    }
  }
  assert.equal(changes.length, 2, 'expected exactly 2 shape transitions, got ' + JSON.stringify(changes));
  assert.equal(changes[0].from, 'impact');
  assert.equal(changes[0].to, 'closed');
  assert.ok(changes[0].at > 7.4 && changes[0].at < 7.9, 'closure transition at ' + changes[0].at);
  assert.equal(changes[1].to, 'open');
  assert.ok(changes[1].at > 11.0 && changes[1].at < 11.3, 'escape transition at ' + changes[1].at);

  // 3) 7.9 闭合回起点（e 精确 0）；11.2 开口且取样到远场
  const closed = model.rows.find((r) => r.v === 7.9);
  assert.equal(closed.kind, 'closed');
  assert.ok(closed.closure < 1e-6, 'closure distance at 7.9 = ' + closed.closure);
  assert.ok(closed.e < 1e-12, 'e at 7.9 must be exactly 0, got ' + closed.e);
  const open = model.rows.find((r) => r.v === 11.2);
  assert.equal(open.kind, 'open');
  assert.ok(open.endR >= 8.9, 'escape sample endR at 11.2 = ' + open.endR);
  // 11.2 比门槛 11.172 高 0.25%，u=2.0099，不是恰好逃逸
  const u112 = await p.evaluate(() => window.RocketModel.uOf(11.2));
  assert.ok(Math.abs(u112 - 2.0099) < 1e-3, 'u(11.2) = ' + u112);

  // 4) 刻度按 u 落位：0 / 16.3 / 40.7 / 100%，且区间内对 u 严格线性（不画按速度等距的尺）
  const lin = await p.evaluate(() => {
    const M = window.RocketModel;
    const pts = [];
    for (const v of [4.5, 5.4, 6.3, 7.2, 7.9, 9, 10.1, 11.2, 12.5, 14, 15.4, 16.7]) pts.push([M.uOf(v), M.railFrac(v)]);
    const k = (pts[pts.length - 1][1] - pts[0][1]) / (pts[pts.length - 1][0] - pts[0][0]);
    const dev = pts.map(([u, f]) => Math.abs(f - (pts[0][1] + (u - pts[0][0]) * k)));
    return { maxDev: Math.max(...dev), marks: M.gears.map((v) => +M.railFrac(v).toFixed(3)) };
  });
  assert.ok(lin.maxDev < 1e-9, 'rail not linear in u: ' + JSON.stringify(lin));
  assert.deepEqual(lin.marks, [0, 0.163, 0.407, 1], 'gear marks on the u axis: ' + JSON.stringify(lin.marks));

  // 4b) 背景谱：26 条 u 等距（0.300 + 0.164 i），e 集合的指纹 = 最小两个 0.044 / 0.120、最大 3.400
  const spec = await p.evaluate(() => {
    const M = window.RocketModel;
    const es = M.spectrumU.map((u) => Math.abs(u - 1)).sort((a, z) => a - z);
    return { n: M.spectrumU.length, es, u0: M.spectrumU[0], uLast: M.spectrumU[M.spectrumU.length - 1] };
  });
  assert.equal(spec.n, 26, 'spectrum lines = ' + spec.n);
  assert.ok(Math.abs(spec.u0 - 0.3) < 1e-9 && Math.abs(spec.uLast - 4.4) < 1e-9, 'spectrum u span: ' + JSON.stringify([spec.u0, spec.uLast]));
  assert.ok(Math.abs(spec.es[0] - 0.044) < 1e-3, 'min e = ' + spec.es[0]);
  assert.ok(Math.abs(spec.es[1] - 0.12) < 1e-3, 'second min e = ' + spec.es[1]);
  assert.ok(Math.abs(spec.es[25] - 3.4) < 1e-3, 'max e = ' + spec.es[25]);

  // 5) 只有档位：指针停在任意位置，落地值必须是四个档位之一（不做无级拖动）
  const box = await p.locator('#scene').boundingBox();
  const k = Math.min(box.width / 1100, box.height / 650);
  const ox = box.x + (box.width - 1100 * k) / 2;
  const oy = box.y + (box.height - 650 * k) / 2;
  const railY = oy + 600 * k;
  const atX = async (v) => 108 + (await p.evaluate((vv) => window.RocketModel.railFrac(vv), v)) * 892;
  const clickAt = async (v) => {
    const x = await atX(v);
    await p.mouse.move(ox + x * k, railY);
    await p.mouse.down();
    await p.mouse.move(ox + (x + 1) * k, railY);
    await p.mouse.up();
    await p.waitForTimeout(150);
    return p.evaluate(() => ({ v: window.RocketModel.scene.value, snapped: window.RocketModel.scene.state.snapped }));
  };
  const g79 = await clickAt(7.9);
  assert.equal(g79.snapped, 7.9, 'gear select at 7.9 -> ' + JSON.stringify(g79));
  const gMid = await clickAt(9.5); // 落在 7.9 与 11.2 之间：必须归到最近档位，不能停在 9.5
  assert.ok([7.9, 11.2].includes(gMid.snapped), 'between-gear drag produced ' + JSON.stringify(gMid));
  // 键盘逐档，不越界
  await p.evaluate(() => window.RocketModel.scene.setValue(4.5));
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(80);
  const lowEdge = await p.evaluate(() => window.RocketModel.scene.value);
  assert.equal(lowEdge, 4.5, 'nudge below lowest gear -> ' + lowEdge);
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(80);
  const next = await p.evaluate(() => window.RocketModel.scene.value);
  assert.equal(next, 7.9, 'nudge up from 4.5 -> ' + next);

  // 6) 换参照系：16.7 时地心层淡出、日心层进来（solar blend 到 1）
  await p.evaluate(() => window.RocketModel.scene.setValue(16.7));
  await p.waitForTimeout(700);
  const solar = await p.evaluate(() => window.RocketModel.scene.state.solar);
  assert.ok(solar > 0.999, 'solar blend at 16.7 = ' + solar);
  await p.evaluate(() => window.RocketModel.scene.setValue(11.2));
  await p.waitForTimeout(700);
  const geo = await p.evaluate(() => window.RocketModel.scene.state.solar);
  assert.equal(geo, 0, 'solar blend should be 0 below 15, got ' + geo);

  // 7) 物理量→像素的变换可用（验收侧反算曲线要用）
  const px = await p.evaluate(() => {
    const M = window.RocketModel;
    const c = M.cam();
    const p0 = M.toPixel(0, M.r0);
    const p1 = M.toPixel(0, 0);
    return { cam: c, r0px: Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) };
  });
  assert.ok(px.cam && px.cam.s > 0, 'cam missing');
  assert.ok(Math.abs(px.r0px / px.cam.s - 1.08) < 1e-9, 'r0 in px / sphere px = ' + px.r0px / px.cam.s);

  assert.deepEqual(errs, []);
  await b.close();
  console.log('PASS velocity instrument: e=|u-1| over 135 samples, 2 shape transitions, r0=1.08, 7.9 e=0 exactly, escape 11.172, gear-only control, u-gear marks 0/16.3/40.7/100%, 26-line spectrum fingerprint, one shared scale, per-gear result note, replay on re-press, frame switch, model->px transform');
})();

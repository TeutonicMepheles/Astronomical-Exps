const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport:{width:1920,height:1080}});
    const errors = [];
    const remote = [];
    const base = process.env.TEST_ORIGIN || 'http://127.0.0.1:9048';
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== new URL(base).origin && url.protocol !== 'data:') remote.push(url.href);
    });
    const screenshot = async name => {
      if (process.env.ROCKET_REVIEW_OUT) await page.screenshot({path:path.join(process.env.ROCKET_REVIEW_OUT,name + '.png')});
    };
    const button = name => page.getByRole('button',{name,exact:true});
    const step = async value => page.waitForFunction(value => window.RocketChapter3?.step === value,value);
    await page.goto(base + '/experiments/rocket-launch/');
    await page.locator('#next').click();
    await step(4);
    await button('垂直发射').click();
    assert.equal(await page.evaluate(() => RocketModel.scene.state.mode),'vertical');
    await button('高山大炮').click();

    await button('7.9 · 绕地').click();
    await page.locator('#velocity-fire').click();
    await page.waitForFunction(() => RocketModel.scene.state.shot === 'earth');
    await screenshot('mountain');
    await page.locator('#velocity-adjust').click();

    for (const [preset,view] of [['11.2 · 逃离地球','lunar'],['16.7 · 日心逃逸','solar']]) {
      await button(preset).click();
      await page.locator('#velocity-fire').click();
      await page.waitForFunction(() => RocketModel.scene.state.age > 1);
      await page.locator('#velocity-pause').click();
      const age = await page.evaluate(() => RocketModel.scene.state.age);
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => RocketModel.scene.state.age),age);
      await page.locator('#velocity-pause').click();
      await page.waitForFunction(view => {
        const {state} = RocketModel.scene;
        return state.escapeView === view && state.escapeProgress >= 1 && state.paused;
      },view);
      await screenshot(view);
      await page.locator('#velocity-fire').click();
      await page.waitForFunction(() => RocketModel.scene.state.age < 1 && RocketModel.scene.state.escapeView === null);
      await page.locator('#velocity-adjust').click();
    }

    await page.locator('#next').click();
    await step(2);
    assert.deepEqual(await page.locator('#steps button').allTextContents(),[
      '推力与载荷','为什么要分级','分级分离','认识与组装火箭'
    ]);
    await button('发射').click();
    await page.waitForFunction(() => RocketChapter3.records[0]?.status === 'complete');
    await page.getByRole('button',{name:/实验记录 · 1/}).click();
    const capture = await page.locator('.rocket-record-card img').evaluate(async image => {
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image,0,0);
      const pixels = ctx.getImageData(330,371,30,70).data;
      let visible = 0;
      for (let i=0;i<pixels.length;i+=4) {
        if (pixels[i]>150 && pixels[i+1]>120 && pixels[i+2]<180) visible++;
      }
      return {visible,forces:RocketChapter3.records[0].forces};
    });
    assert(capture.visible > 40,'total-weight arrow is visible in the saved image');
    assert.equal(capture.forces.weight.strength,capture.forces.selfWeight.strength+capture.forces.payloadWeight.strength);
    await screenshot('record');
    await button('关闭 ×').click();

    await page.locator('#next').click();
    await step(9);
    const readRuler = () => page.locator('#scene').evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      return [180,615,1050].map(x => {
        const pixels = ctx.getImageData(x,114,1,438).data;
        const color = [...ctx.getImageData(x,540,1,1).data];
        let count = 0;
        for (let offset=0;offset<pixels.length;offset+=4) {
          if (color.every((value,j) => pixels[offset+j] === value)) count++;
        }
        return count;
      });
    });
    await page.waitForFunction(() => RocketChapter3.adapter.stagingRig);
    assert.equal(await page.locator('#dv-play').getAttribute('aria-label'),'发射');
    const gridPixel = () => page.locator('#scene').evaluate(canvas => canvas.getContext('2d').getImageData(110,552,1,1).data[3]);
    assert.equal(await gridPixel(),0);
    await page.locator('#dv-play').click();
    await page.waitForFunction(() => document.querySelector('#scene').getContext('2d').getImageData(110,552,1,1).data[3] > 0);
    await page.evaluate(() => {
      const lesson = RocketStaging.lesson;
      for (let i=0;i<1500 && !lesson.complete;i++) lesson.advance(1/60);
      document.dispatchEvent(new Event('change'));
    });
    await page.waitForFunction(() => document.querySelector('#dv-metrics')?.textContent.includes('最终高度'));
    const metrics = await page.locator('#dv-metrics').textContent();
    assert.match(metrics,/单级小火箭，自重 10 t · 燃料 100 t，最终高度 \d+ 示意格/);
    assert.match(metrics,/单级大火箭，自重 30 t · 燃料 300 t，最终高度 \d+ 示意格/);
    assert.match(metrics,/三级火箭，自重 30 t · 燃料 300 t，最终高度 100 示意格/);
    const finalRuler = await readRuler();
    assert(finalRuler[0]>95 && finalRuler[0]<130 && finalRuler[2]>335 && finalRuler[2]<370,JSON.stringify(finalRuler));
    assert(finalRuler[0]<finalRuler[1] && finalRuler[1]<finalRuler[2]);
    await screenshot('comparison');
    await page.locator('#next').click();
    await step(8);
    await button('开始发射').click();
    await page.waitForFunction(() => RocketChapter3.separation.phase !== 'ready');
    await page.locator('#next').click();
    await step(6);
    await page.locator('#next').click();
    await page.waitForFunction(() => RocketChapter3.step === 7 && !RocketChapter3.adapter.assemblyMotion);
    for (const part of ['一级芯级箭体','二级芯级箭体','助推器','有效载荷','有效载荷整流罩']) {
      await button('蓝图：'+part).click();
      await button('安装'+part).click();
    }
    await page.waitForTimeout(3100);
    assert.equal(await page.evaluate(() => RocketChapter3.step),7);
    assert.equal(await page.evaluate(() => RocketChapter3.assembled.length),5);
    assert.match(await page.locator('#prompt').textContent(),/组装完成/);

    assert.deepEqual(errors,[]);
    assert.deepEqual(remote,[]);
    console.log('PASS meeting flow, both escape animations, pause/replay, saved weight arrow, comparison values, assembly completion and local assets');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});

const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(process.env.LIGHT_REVIEW_URL || 'http://127.0.0.1:8795/experiments/light-pollution/asset-review.html');
    await page.locator('#base').evaluate(async image => {
      await Promise.all([...document.querySelectorAll('.scene img')].map(img => img.decode()));
    });
    const pixels = await page.evaluate(async () => {
      const W = 2172, H = 724;
      const read = id => {
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.getContext('2d').drawImage(document.getElementById(id), 0, 0, W, H);
        return canvas.getContext('2d').getImageData(0, 0, W, H).data;
      };
      // Use the same SVG rasterization path as the extracted layers so source
      // alpha premultiplication is compared consistently at translucent pixels.
      const raw=await (await fetch(document.getElementById('original').src)).blob();
      const uri=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(raw);});
      const reference=new Image();reference.src='data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="2172" height="724"><image href="${uri}" width="2172" height="724" preserveAspectRatio="none"/></svg>`);
      await reference.decode();
      const referenceCanvas=document.createElement('canvas');referenceCanvas.width=W;referenceCanvas.height=H;
      referenceCanvas.getContext('2d').drawImage(reference,0,0,W,H);
      const source=referenceCanvas.getContext('2d').getImageData(0,0,W,H).data, base = read('base');
      const layers = ['residential', 'public', 'billboard'].map(read);
      const reports = layers.map((data, group) => {
        let solid = 0, maxDifference = 0, skyLeaks = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 250) {
            solid++;
            for (let channel = 0; channel < 3; channel++)
              maxDifference = Math.max(maxDifference, Math.abs(data[i + channel] - source[i + channel]));
          }
          if (i / 4 < W * 225 && data[i + 3] > 1) skyLeaks++;
        }
        return { group, solid, maxDifference, skyLeaks };
      });
      let overlaps = 0;
      for (let i = 3; i < source.length; i += 4) {
        if (layers.filter(data => data[i] > 128).length > 1) overlaps++;
      }
      const pixel = (data, x, y) => [...data.slice((y * W + x) * 4, (y * W + x) * 4 + 4)];
      return {
        reports, overlaps,
        residentialOn: pixel(layers[0], 40, 280),
        residentialTree: pixel(layers[0], 201, 450),
        publicOn: pixel(layers[1], 685, 500),
        publicTree: pixel(layers[1], 1160, 490),
        unlitWindow: pixel(base, 40, 280),
        sourceWindow: pixel(source, 40, 280),
        benchSource: pixel(source, 1770, 560),
        benchUnlit: pixel(base, 1770, 560),
        distantResidential: [pixel(layers[0],951,445),pixel(layers[0],1118,380)],
        distantPublic: [pixel(layers[1],951,445),pixel(layers[1],1118,380)],
        billboardRim: [[1221,400],[1290,368],[1363,410],[1290,451]].map(([x,y])=>({on:pixel(layers[2],x,y),off:pixel(base,x,y)})),
      };
    });
    for (const report of pixels.reports) {
      assert(report.solid > 200, 'Each source layer contains visible artwork');
      assert(report.maxDifference <= 2, 'Opaque source pixels retain original colors and coordinates: ' + JSON.stringify(report));
      assert.equal(report.skyLeaks, 0, 'Transparent layers must contain no sky speckles');
    }
    assert.equal(pixels.overlaps, 0, 'Source groups must not double-count windows');
    for(const rim of pixels.billboardRim){
      assert(rim.on[3]>250,'Screen rim belongs to the adjustable billboard layer');
      const luminance=.2126*rim.off[0]+.7152*rim.off[1]+.0722*rim.off[2];
      assert(luminance<100,'Off-state rim has no baked bright pixels: '+JSON.stringify(rim));
    }
    assert(pixels.distantResidential.every(pixel=>pixel[3]>200),'Both reported skyline window groups belong to residential emission');
    assert(pixels.distantPublic.every(pixel=>pixel[3]===0),'Foreground public masks must not capture the skyline windows');
    assert(pixels.residentialOn[3] > 200 && pixels.publicOn[3] > 200, 'Known lit windows belong to their groups');
    assert.equal(pixels.residentialTree[3], 0, 'Residential layer preserves tree occlusion');
    assert.equal(pixels.publicTree[3], 0, 'Public layer preserves tree occlusion');
    assert(pixels.unlitWindow[0] < pixels.sourceWindow[0] / 2, 'Off-state removes baked window light');
    assert.deepEqual(pixels.benchUnlit, pixels.benchSource, 'Wood bench must not be treated as a light source');
    await page.getByRole('button', { name: '全部关闭', exact: true }).click();
    assert(await page.locator('#residential').isHidden());
    await page.getByLabel('住宅窗灯', { exact: true }).uncheck();
    assert(await page.locator('#public').isVisible());
    assert(await page.locator('#residential').isHidden());
    await page.getByLabel('公共建筑灯光', { exact: true }).uncheck();
    assert(await page.locator('#public').isHidden());
    assert(await page.locator('#billboard').isVisible());
    await page.getByLabel('广告屏', { exact: true }).uncheck();
    assert(await page.locator('#billboard').isHidden());
    await page.getByRole('button', { name: '分层叠加', exact: true }).click();
    await page.getByRole('button', { name: '放大检查', exact: true }).click();
    assert(await page.locator('.scene').evaluate(el => el.scrollWidth > el.clientWidth * 1.9));
    console.log('PASS source-coordinate colors, alpha, exclusive groups, tree occlusion, unlit windows, bench preservation and independent toggles.');
    console.log(JSON.stringify(pixels));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  try {
    for (const fallback of [false, true]) {
      const page = await browser.newPage();
      if (fallback) {
        await page.route('**/components/eclipse-globe/gl.js', async route => {
          const response = await route.fetch();
          const body = (await response.text()).replace("gl.getExtension('EXT_shader_texture_lod')", 'null');
          await route.fulfill({ response, body });
        });
      }

      const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:11455';
      await page.goto(origin + '/experiments/solar-lunar-eclipses/?event=annular');
      const darkest = await page.evaluate(async () => {
        const { createEclipseGlobeRenderer } = await import('./components/eclipse-globe/renderer.js');
        const texture = document.createElement('canvas');
        texture.width = 1024;
        texture.height = 512;
        const tex = texture.getContext('2d');
        tex.fillStyle = '#252525';
        tex.fillRect(0, 0, 1024, 512);
        tex.fillStyle = '#ddd';
        tex.fillRect(0, 0, 64, 512);
        tex.fillRect(960, 0, 64, 512);

        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const event = 'eclipse-seam-test-texture';
        const ready = new Promise(resolve => addEventListener(event, resolve, { once: true }));
        const renderer = createEclipseGlobeRenderer({
          textureReadyEvent: event,
          textureUrl: texture.toDataURL(),
          material: { paperGrain: 0 },
          grid: { latitude: false, longitude: false, alpha: 0 },
          lighting: { highlightStrength: 0, ambientStrength: 1, rimStrength: 0 },
        });
        if (!renderer.init(canvas)) throw new Error('Globe renderer failed to initialize');
        await ready;
        renderer.resize(256, 256);
        // Place the bright texture band around the antimeridian across the center pixels.
        renderer.draw({
          sizePx: 256, radius: 112, pxPerLogical: 1,
          center: { x: 128, y: 128 }, focus: { x: 127, y: 128 },
          basis: { axis: [0, 1, 0], e2: [0, 0, -1], e3: [-1, 0, 0] },
          sun: [0, 0, 1],
        });
        const readback = document.createElement('canvas').getContext('2d');
        readback.drawImage(canvas, 0, 0);
        const pixels = readback.getImageData(123, 124, 12, 8).data;
        renderer.dispose();
        return Math.min(...pixels.filter((_, index) => index % 4 === 0));
      });
      assert(darkest >= 220, `longitude seam stays bright with fallback=${fallback}, got ${darkest}`);
      await page.close();
    }
    console.log('PASS longitude seam sampling with explicit gradients and linear filtering fallback');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

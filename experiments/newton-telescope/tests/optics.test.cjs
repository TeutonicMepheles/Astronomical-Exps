// Run from the project directory: node tests/optics.test.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = { window: { Newton: {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/optics.js'), 'utf8'), context);
const calculate = context.window.Newton.optics.calculate;
let configurations = 0;
for (const mode of ['parallel', 'point']) {
  for (const focal of [400, 800, 1600]) {
    for (const eyepiece of [5, 25, 50]) {
      const result = calculate({ mode, focal, eyepiece });
      assert.equal(result.magnification, focal / eyepiece);
      const expectedImageDistance = mode === 'parallel' ? focal / 100 : 1 / (100 / focal - 1 / 20);
      assert(Math.abs(result.imageDistance - expectedImageDistance) < 1e-10);
      for (const points of result.paths) {
        assert(points.flat().every(Number.isFinite), 'ray coordinates remain finite');
        assert(Math.abs(points[2][0] + points[2][1] + 1.9) < 1e-10, 'ray hits the diagonal secondary plane');
        const incoming = [points[2][0] - points[1][0], points[2][1] - points[1][1]];
        const outgoing = [points[3][0] - points[2][0], points[3][1] - points[2][1]];
        const a = Math.hypot(...incoming), b = Math.hypot(...outgoing);
        assert(Math.abs(outgoing[0] / b + incoming[1] / a) < 1e-10, 'reflection law: outgoing X');
        assert(Math.abs(outgoing[1] / b + incoming[0] / a) < 1e-10, 'reflection law: outgoing Y');
      }
      configurations++;
    }
  }
}
console.log(`Passed ${configurations} optical configurations: magnification, image distance, mirror intersection and reflection direction.`);

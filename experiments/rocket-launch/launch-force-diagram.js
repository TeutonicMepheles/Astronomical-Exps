export const LAUNCH_PREVIEW_X = 960;
const THRUST = '#b5eced';
const SELF_WEIGHT = '#ffc68e';
const PAYLOAD_WEIGHT = '#d7c4fa';
const TOTAL_WEIGHT = '#f5d28b';
const WEIGHT_PER_LEVEL = 64;
const THRUST_PER_LEVEL = 2 * WEIGHT_PER_LEVEL;
const ARROW_TOP = 10;
const ARROW_BOTTOM = 785;

function label(c, text, x, y, color) {
 c.strokeText(text, x, y);
 c.fillStyle = color;
 c.fillText(text, x, y);
}

/** Draws display-only force arrows using the launch playback progress. */
export class LaunchForceDiagram {
 constructor({arrows, getState}) {
  this.arrows = arrows;
  this.getState = getState;
 }

 draw(c, progress = 0, {base = 395, showZeroThrust = true} = {}) {
  const {thrust, mass, load} = this.getState();
  const thrustLength = thrust * THRUST_PER_LEVEL * (1 - progress);
  const weightLength = (mass + load) * WEIGHT_PER_LEVEL;
  const scale = Math.min(1, thrustLength ? (base - ARROW_TOP) / thrustLength : 1, (ARROW_BOTTOM - base) / weightLength);
  const up = thrustLength * scale;
  const self = mass * WEIGHT_PER_LEVEL * scale;
  const payload = load * WEIGHT_PER_LEVEL * scale;
  const total = self + payload;
  const x = LAUNCH_PREVIEW_X, totalX = x - 130, upBase = base, downBase = base;
  const upAngle = -Math.PI / 2, downAngle = Math.PI / 2;
  this.arrows.draw(c, {id:'launch-thrust', x, y:upBase, angle:upAngle,
   maxLength:up, strength:up > 0 ? 1 : 0, height:Math.min(54 * scale, up * .55), color:THRUST});
  this.arrows.draw(c, {id:'launch-self-weight', x, y:downBase, angle:downAngle,
   maxLength:self, height:37 * scale, color:SELF_WEIGHT});
  this.arrows.draw(c, {id:'launch-payload-weight', x, y:downBase + self, angle:downAngle,
   maxLength:payload, height:37 * scale, color:PAYLOAD_WEIGHT});
  this.arrows.draw(c, {id:'launch-weight', x:totalX, y:downBase, angle:downAngle,
   maxLength:total, height:49 * scale, color:TOTAL_WEIGHT});

  c.save();
  c.font = '20px "Alibaba PuHuiTi 3", sans-serif';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = 5;
  c.strokeStyle = '#0c1827';
  if (up > 0 || showZeroThrust) {
   label(c, up > 0 ? '推力' : '推力为 0', x + 35, upBase - Math.max(24, up / 2), THRUST);
  }
  label(c, '箭体自重', x + 30, downBase + self / 2, SELF_WEIGHT);
  label(c, '载荷重力', x + 30, downBase + self + payload / 2, PAYLOAD_WEIGHT);
  label(c, '总重力', totalX - 26, downBase - 24, TOTAL_WEIGHT);
  c.restore();
  this.geometry = {up, self, load:payload, total, upBase, downBase, x, partsX:x, totalX, progress};
 }
}

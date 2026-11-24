import { MeteorVelocityArrow } from './components/velocity-arrow/index.js';

const sizeScales = { small: .55, medium: .8, large: 1.18 };
export const entrySpeeds = { low: 10, medium: 20, high: 40 };
const meteorCenterY = 24;

export class MeteorConditionPreview {
  constructor(diagram, color) {
    this.diagram = diagram;
    this.color = color;
    this.velocity = new MeteorVelocityArrow(() => this.draw());
  }

  set(factor, value) {
    this.factor = factor;
    this.value = value;
    this.diagram.style.translate = '';
    this.scale = factor === 'size' ? sizeScales[value] || 1 : 1;
    this.draw();
  }

  alignAngle(offsetY) {
    if (this.factor === 'angle' && this.value) this.diagram.style.translate = `0 ${offsetY}px`;
  }

  draw() {
    this.diagram.hidden = !this.value || !['speed', 'angle'].includes(this.factor);
    if (this.diagram.hidden) return;
    const ctx = this.diagram.getContext('2d');
    ctx.clearRect(0, 0, this.diagram.width, this.diagram.height);
    ctx.fillStyle = ctx.strokeStyle = this.color;
    ctx.font = '500 30px "Alibaba PuHuiTi 3", sans-serif';
    ctx.textAlign = 'center';
    if (this.factor === 'speed') {
      const speed = entrySpeeds[this.value];
      const x = this.diagram.width / 2;
      const start = meteorCenterY + 156;
      const length = 48 + speed * 1.8;
      this.velocity.draw(ctx, x, start, length, this.color);
      ctx.fillText(speed + ' km/s', x, start + length + 35);
    } else {
      this.drawAngle(ctx, Number(this.value));
    }
  }

  drawAngle(ctx, degrees) {
    const angle = degrees * Math.PI / 180;
    const originX = this.diagram.width / 2;
    const originY = meteorCenterY;
    const distance = 245;
    const x = originX + distance * Math.cos(angle);
    const y = originY + distance * Math.sin(angle);
    const radius = 84;
    const start = Math.PI;
    const end = Math.PI + angle;
    ctx.lineWidth = 2;
    ctx.globalAlpha = .55;
    ctx.beginPath();
    ctx.moveTo(x - 178, y);
    ctx.lineTo(x + 42, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    this.velocity.draw(ctx, originX, originY, distance, this.color, angle);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, start, end);
    ctx.stroke();
    const tipX = x + radius * Math.cos(end);
    const tipY = y + radius * Math.sin(end);
    this.drawArrowhead(ctx, tipX, tipY, end + Math.PI / 2);
    const bisector = start + angle / 2;
    const labelRadius = 135;
    const labelX = degrees <= 30 ? x - 12 : x + labelRadius * Math.cos(bisector);
    ctx.fillText(degrees + '°', labelX, y + 36);
  }

  drawArrowhead(ctx, x, y, heading) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (const offset of [-.46, .46]) {
      const wing = heading + offset;
      ctx.lineTo(x - 13 * Math.cos(wing), y - 13 * Math.sin(wing));
    }
    ctx.closePath();
    ctx.fill();
  }

  dispose() {
    this.velocity.dispose();
  }
}

const SOURCE_WIDTH = 256;
const SOURCE_HEIGHT = 40;
const TAIL = 28;
const HEAD = 40;

export class MeteorVelocityArrow {
  constructor(redraw) {
    this.colors = new Map();
    this.image = new Image();
    this.image.onload = () => {
      const source = document.createElement('canvas');
      source.width = SOURCE_WIDTH;
      source.height = SOURCE_HEIGHT;
      const ctx = source.getContext('2d');
      ctx.translate(12, 20);
      ctx.rotate(-Math.atan2(115, -200));
      ctx.translate(-203, -3);
      ctx.drawImage(this.image, 0, 0);
      this.source = source;
      redraw();
    };
    this.image.src = new URL('./shaft-source.png', import.meta.url).href;
  }

  draw(ctx, x, y, length, color, heading = Math.PI / 2) {
    const height = 36;
    const tail = TAIL * height / SOURCE_HEIGHT;
    const head = HEAD * height / SOURCE_HEIGHT;
    const body = length - tail - head;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    if (this.source) {
      if (!this.colors.has(color)) {
        const sprite = document.createElement('canvas');
        sprite.width = SOURCE_WIDTH;
        sprite.height = SOURCE_HEIGHT;
        const tint = sprite.getContext('2d');
        tint.drawImage(this.source, 0, 0);
        tint.globalCompositeOperation = 'source-in';
        tint.fillStyle = color;
        tint.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
        this.colors.set(color, sprite);
      }
      const sprite = this.colors.get(color);
      ctx.drawImage(sprite, 0, 0, TAIL, SOURCE_HEIGHT, 0, -height / 2, tail, height);
      ctx.drawImage(sprite, TAIL, 0, SOURCE_WIDTH - TAIL - HEAD, SOURCE_HEIGHT, tail, -height / 2, body, height);
      ctx.drawImage(sprite, SOURCE_WIDTH - HEAD, 0, HEAD, SOURCE_HEIGHT, tail + body, -height / 2, head, height);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(length - head, -4);
      ctx.lineTo(length - head, -13);
      ctx.lineTo(length, 0);
      ctx.lineTo(length - head, 13);
      ctx.lineTo(length - head, 4);
      ctx.lineTo(0, 4);
      ctx.fill();
    }
    ctx.restore();
  }

  dispose() {
    this.image.onload = null;
    this.colors.clear();
    this.source = null;
  }
}

import { createRocketStarfield } from './starfield.js';

const WIDTH = 1600;
const HEIGHT = 900;

export class RocketFlightSky {
  constructor(host, onChange) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'rocket-flight-sky';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    host.prepend(this.canvas);
    this.context = this.canvas.getContext('2d');
    this.backdrop = document.createElement('canvas');
    this.backdrop.width = WIDTH;
    this.backdrop.height = HEIGHT;
    this.stars = createRocketStarfield();
    const nebula = new Image();
    const compose = () => {
      const context = this.backdrop.getContext('2d');
      context.fillStyle = '#050916';
      context.fillRect(0, 0, WIDTH, HEIGHT);
      if (nebula.naturalWidth) {
        const scale = Math.max(WIDTH / nebula.naturalWidth, HEIGHT / nebula.naturalHeight);
        const width = nebula.naturalWidth * scale;
        const height = nebula.naturalHeight * scale;
        context.drawImage(nebula, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      }
      this.lastShift = null;
      onChange();
    };
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.motion.addEventListener('change', onChange);
    nebula.onload = compose;
    nebula.src = 'assets/meteor-nebula.webp';
    compose();
  }

  draw(offset = 0, speed = 0) {
    const travel = this.motion.matches ? 0 : offset * 3.8;
    this.sample = { offset: travel, speed: this.motion.matches ? 0 : speed };
    const shift = Math.round(travel) % HEIGHT;
    const firstTile = Math.floor(Math.round(travel) / HEIGHT) % 2;
    const key = firstTile * HEIGHT + shift;
    if (key === this.lastShift) return;
    this.lastShift = key;
    this.context.drawImage(this.backdrop, 0, 0);
    for (let tile = shift ? -1 : 0; tile <= 0; tile++) {
      this.context.save();
      this.context.translate(0, shift + tile * HEIGHT);
      // Reflect alternate copies so the top and bottom edges never meet abruptly.
      if ((tile - firstTile) % 2) {
        this.context.translate(0, HEIGHT);
        this.context.scale(1, -1);
      }
      this.context.drawImage(this.stars, 0, 0, WIDTH, HEIGHT);
      this.context.restore();
    }
  }

  drawBackdrop(context) {
    context.drawImage(this.backdrop, 0, 0);
    context.drawImage(this.stars, 0, 0, WIDTH, HEIGHT);
  }
}

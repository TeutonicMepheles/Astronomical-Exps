// Coordinates share the floating meteor's 260, 515 center before rotation.
const filaments = [
  { root: 86, y: 500, shoulder: 137, tip: 55, reach: 323, width: 3.4 },
  { root: 113, y: 530, shoulder: 171, tip: 96, reach: 298, width: 2.1 },
  { root: 137, y: 554, shoulder: 203, tip: 125, reach: 271, width: 1.7 },
  { root: 68, y: 647, shoulder: 190, tip: 148, reach: 262, width: 2.4 },
  { root: 115, y: 625, shoulder: 224, tip: 178, reach: 239, width: 1.7 },
];

export function createMeteorWake(host, offset = 0) {
  const canvas = document.createElement('canvas');
  canvas.className = 'meteor-wake';
  canvas.width = canvas.height = 1000;
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // Stagger emission and lifetime so the streams do not pulse together.
  const streams = Array.from({ length: 60 }, (_, i) => ({
    side: i < 36 ? 0 : i % 2 ? 1 : -1,
    phase: ((i * 47 + offset) % 101) / 101,
    lifetime: .36 + (i * 29 % 19) * .024,
    origin: (i * 31 % 103) - 51,
    length: 26 + i * 17 % 68,
    drift: (i * 23 % 41) - 20,
    bright: i % 5 === 0,
  }));
  const glow = ctx.createRadialGradient(260, 488, 3, 260, 488, 90);
  glow.addColorStop(0, 'rgba(227, 238, 255, .41)');
  glow.addColorStop(1, 'rgba(199, 220, 255, 0)');

  return (time, lift, scale, surge, angle = 90) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 - lift * 520 / 3);
    ctx.rotate((angle - 90) * Math.PI / 180);
    ctx.scale(scale, scale);
    ctx.translate(-260, -515);
    ctx.fillStyle = glow;
    ctx.fillRect(170, 398, 180, 180);
    ctx.lineCap = 'round';

    filaments.forEach(({ root, y, shoulder, tip, reach, width }, index) => {
      for (const side of [-1, 1]) {
        const baseY = y - side * 8;
        const tipY = baseY - reach - side * 14 - surge * 50;
        const phase = (time * 1.55 + offset / 101 + index * .17 + (side === 1 ? .52 : .08)) % 1;
        const crest = .14 + .72 * phase;
        const light = .22 + .44 * Math.sin(phase * Math.PI);
        const ribbon = ctx.createLinearGradient(0, baseY, 0, tipY);
        ribbon.addColorStop(0, 'rgba(205, 224, 250, .10)');
        ribbon.addColorStop(crest - .12, 'rgba(205, 224, 250, .22)');
        ribbon.addColorStop(crest, `rgba(230, 241, 255, ${light})`);
        ribbon.addColorStop(crest + .12, 'rgba(205, 224, 250, .19)');
        ribbon.addColorStop(1, 'rgba(205, 224, 250, 0)');

        const sway = Math.sin(time * 4 + side + offset + index) * 7;
        ctx.beginPath();
        ctx.moveTo(260 + side * root, baseY);
        ctx.bezierCurveTo(260 + side * shoulder, baseY - 40,
          260 + side * (shoulder + 15) + sway, tipY + 108, 260 + side * tip + sway, tipY);
        ctx.strokeStyle = ribbon;
        ctx.globalAlpha = .23;
        ctx.lineWidth = width * 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    });

    for (const stream of streams) {
      const age = (time / stream.lifetime + stream.phase) % 1;
      const { side, origin, drift, bright } = stream;
      const spread = Math.sin(age * Math.PI);
      const travel = side ? 220 + stream.length + surge * 65 : 285 + stream.length * 2 + surge * 112;
      const x = side
        ? 260 + side * ((124 + Math.abs(origin) * .75) * (1 - age * .72) + 55 * spread)
        : 260 + origin + drift * spread * 1.6;
      const y = (side ? 530 + origin * .8 : 491) - age * travel;
      const length = side
        ? (8 + stream.length * .42) * (.65 + age)
        : (stream.length + surge * 34) * (.64 + age);
      const alpha = Math.min(1, age * 10) * (1 - age) ** .9;
      const color = bright ? '255, 247, 232' : '182, 214, 249';
      const stroke = ctx.createLinearGradient(x, y, x, y + length);
      stroke.addColorStop(0, `rgba(${color}, ${alpha * (side ? .8 : .98)})`);
      stroke.addColorStop(1, `rgba(${color}, 0)`);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = bright ? 2.8 : 1.55;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const bend = side ? side * length * (.65 * age - .20) : -drift * .35;
      ctx.quadraticCurveTo(x + bend * .45, y + length * .6, x + bend, y + length);
      ctx.stroke();
    }
    ctx.restore();
  };
}

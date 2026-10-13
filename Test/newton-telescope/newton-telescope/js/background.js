/* Local adaptation of Krzysztof Adamczak's starry sky:
 * https://codepen.io/krzysztofadamczak/pen/vYQNrKW
 * Adds responsive sizing, elapsed-time animation and reduced-motion support.
 */
(function () {
  'use strict';
  const canvas = document.getElementById('sky'), ctx = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!ctx) return;
  let settings = window.NightSkyControls.getSettings();
  let w = 0, h = 0, background, stars = [], meteors = [];
  let frame = 0, previous = 0, rotation = 0, meteorClock = 0, skyTime = 0;
  let meteorInterval = settings.meteorInterval;
  const random = (min, max) => min + Math.random() * (max - min);
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    background = ctx.createRadialGradient(w / 2, h * 2.5, h, w / 2, h * 2.5, h * 4);
    background.addColorStop(0, '#3e6db3');
    background.addColorStop(.4, '#0d1b3b');
    background.addColorStop(.6, '#030314');
    stars = Array.from({ length: 2000 }, () => {
      const x = random(0, w) - w / 2, y = random(0, h) - h / 3;
      return { distance: Math.hypot(x, y), angle: Math.atan2(y, x), size: random(.2, 1.7),
        phase: random(0, Math.PI * 2), frequency: random(1.1, 2.4), glow: Math.random() < .018 };
    });
    meteors = []; draw();
  }
  function spawnMeteor() {
    const x = random(w * .1, w * .9), y = random(h * .04, h * .34);
    const angle = random(30, 55) * Math.PI / 180, speed = random(240, 360) * settings.meteorSpeed;
    meteors.push({ x, y, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed,
      age: 0, delay: 0, duration: random(1.1, 1.7), tail: settings.meteorTail });
  }
  function draw() {
    if (!background) return;
    ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
    for (const star of stars) {
      const x = w / 2 + Math.cos(star.angle + rotation) * star.distance;
      const y = h / 3 + Math.sin(star.angle + rotation) * star.distance;
      if (x < 0 || x > w || y < 0 || y > h) continue;
      const twinkle = motion.matches ? .75 : .65 + .35 * settings.twinkle * Math.sin(skyTime * star.frequency + star.phase);
      ctx.fillStyle = `rgba(210,230,255,${.3 + twinkle * .7})`;
      ctx.fillRect(x, y, star.size, star.size);
      if (star.glow) {
        ctx.fillStyle = `rgba(135,190,255,${.06 + twinkle * .14})`;
        ctx.beginPath(); ctx.arc(x, y, 3 + twinkle * 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(220,239,255,${twinkle * .65})`;
        ctx.fillRect(x - 3, y, 6, .6); ctx.fillRect(x, y - 3, .6, 6);
      }
    }
    for (const meteor of meteors) {
      const age = meteor.age - meteor.delay;
      if (age < 0) continue;
      const alpha = Math.max(0, Math.min(age / .15, (meteor.duration - age) / .5, 1));
      const length = Math.min(meteor.tail, age * Math.hypot(meteor.dx, meteor.dy));
      const direction = Math.atan2(meteor.dy, meteor.dx);
      const tailX = meteor.x - Math.cos(direction) * length, tailY = meteor.y - Math.sin(direction) * length;
      const trail = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
      trail.addColorStop(0, 'rgba(255,255,255,0)');
      trail.addColorStop(1, `rgba(255,255,255,${alpha})`);
      ctx.strokeStyle = trail; ctx.lineWidth = 1.6;
      ctx.shadowColor = `rgba(132,191,255,${alpha})`; ctx.shadowBlur = 7; ctx.beginPath();
      ctx.moveTo(tailX, tailY); ctx.lineTo(meteor.x, meteor.y); ctx.stroke();
      ctx.fillStyle = `rgba(235,247,255,${alpha})`;
      ctx.beginPath(); ctx.arc(meteor.x, meteor.y, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  function animate(time) {
    const dt = previous ? Math.min((time - previous) / 1000, .1) : 0;
    previous = time; skyTime += dt; rotation += dt * .0048 * settings.rotationSpeed; meteorClock += dt;
    if (meteorClock >= meteorInterval) { meteorClock = 0; meteorInterval = settings.meteorInterval * random(.85, 1.15); spawnMeteor(); }
    for (const meteor of meteors) {
      meteor.age += dt;
      if (meteor.age >= meteor.delay) { meteor.x += meteor.dx * dt; meteor.y += meteor.dy * dt; }
    }
    meteors = meteors.filter(m => m.age < m.delay + m.duration);
    draw(); frame = requestAnimationFrame(animate);
  }
  function syncMotion() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    if (motion.matches) { meteors = []; draw(); }
    if (!motion.matches && !document.hidden) frame = requestAnimationFrame(animate);
  }
  new ResizeObserver(resize).observe(canvas);
  motion.addEventListener('change', syncMotion);
  window.addEventListener('night-sky-settings', event => {
    settings = event.detail; meteorInterval = settings.meteorInterval; draw();
  });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pagehide', () => cancelAnimationFrame(frame));
  window.addEventListener('pageshow', syncMotion);
  resize(); syncMotion();
})();

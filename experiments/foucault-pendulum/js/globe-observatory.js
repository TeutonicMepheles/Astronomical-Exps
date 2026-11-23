const WIDTH = 680;
const CENTER = WIDTH / 2;
const RADIUS = 250;
const HEIGHT = 80;
const ARM = 29;
const LENGTH = 43;
const AMPLITUDE = .68;
const SWING_PERIOD = 1.8;
const PRECESSION_RATE = 1.15;
const SAMPLE_INTERVAL = .025;
const TRAIL_LIMIT = 480;
const TRAIL_COLOR = '#7af2df';
const COLOR = '#c6b5ff';

const ring = Array.from({length: 33}, (_, i) => {
  const angle = i * Math.PI / 16;
  // Keep the base on the curved surface at the edge of the globe.
  return [ARM * Math.cos(angle), Math.sqrt(RADIUS ** 2 - ARM ** 2) - RADIUS, ARM * Math.sin(angle)];
});
const arch = Array.from({length: 33}, (_, i) => {
  const angle = i * Math.PI / 32;
  const tangent = ARM * Math.cos(angle) * Math.SQRT1_2;
  return [tangent, ring[0][1] + (HEIGHT - ring[0][1]) * Math.sin(angle), tangent];
});
const arcAngles = Array.from({length: 25}, (_, i) => AMPLITUDE * (i / 12 - 1));

export function mountGlobeObservatory(canvas) {
  const ctx = canvas.getContext('2d');
  let city, basis, projection;
  const samples = [];
  let trailPath, trailConnected = false;
  let elapsed = 0, sampleTime = 0, rotationRate = 0;

  function motionAt(time) {
    const rotation = time * rotationRate;
    const swing = AMPLITUDE * Math.sin(time * 2 * Math.PI / SWING_PERIOD);
    const reach = LENGTH * Math.sin(swing);
    return {rotation, swing, x: reach * Math.cos(rotation), z: reach * Math.sin(rotation)};
  }

  function advance(dt) {
    if (!city) return;
    elapsed += dt;
    while (sampleTime + SAMPLE_INTERVAL <= elapsed) {
      sampleTime += SAMPLE_INTERVAL;
      const {x, z} = motionAt(sampleTime);
      samples.push({x, z});
      if (trailPath) appendSample({x, z});
    }
    if (samples.length > TRAIL_LIMIT) {
      samples.splice(0, 40);
      trailPath = null;
    }
  }

  function project(x, y, z) {
    const {normal, east, south} = projection;
    return normal.map((value, i) => value * (RADIUS + y) + east[i] * x + south[i] * z);
  }

  function visible([x, y, z]) {
    const depthSquared = RADIUS ** 2 - x * x - y * y;
    return depthSquared <= 1e-6 || z >= Math.sqrt(depthSquared) - 1e-4;
  }

  function appendSample({x, z}) {
    const vertex = project(x, 4, z);
    if (!visible(vertex)) {
      trailConnected = false;
      return;
    }
    const [screenX, screenY] = vertex;
    const operation = trailConnected ? 'lineTo' : 'moveTo';
    trailPath[operation](CENTER + screenX, CENTER - screenY);
    trailConnected = true;
  }

  function setView(nextCity, nextBasis) {
    if (city === nextCity && basis === nextBasis) return;
    if (city !== nextCity) clearTrail();
    city = nextCity;
    trailPath = null;
    basis = nextBasis;
    if (!city) return;
    const lat = city.lat * Math.PI / 180;
    // Presentation clock. Latitude controls relative rate and hemisphere direction.
    rotationRate = PRECESSION_RATE * Math.sin(lat);
    const lon = city.lon * Math.PI / 180;
    const { axis, e2, e3 } = basis;
    const meridian = e2.map((value, i) => value * Math.cos(lon) + e3[i] * Math.sin(lon));
    const normal = meridian.map((value, i) => value * Math.cos(lat) + axis[i] * Math.sin(lat));
    const east = e2.map((value, i) => -value * Math.sin(lon) + e3[i] * Math.cos(lon));
    const south = meridian.map((value, i) => value * Math.sin(lat) - axis[i] * Math.cos(lat));
    projection = {normal, east, south};
  }

  function resize(pixelRatio) {
    const pixels = Math.max(1, Math.round(WIDTH * pixelRatio));
    if (canvas.width !== pixels || canvas.height !== pixels) {
      canvas.width = canvas.height = pixels;
    }
    ctx.setTransform(pixels / WIDTH, 0, 0, pixels / WIDTH, 0, 0);
  }

  function draw() {
    canvas.hidden = !city;
    if (!city) return;
    ctx.clearRect(0, 0, WIDTH, WIDTH);
    const motion = motionAt(elapsed);
    function point([x, y], connect) {
      if (connect) ctx.lineTo(CENTER + x, CENTER - y);
      else ctx.moveTo(CENTER + x, CENTER - y);
    }
    function path(points) {
      ctx.beginPath();
      let connected = false;
      for (const vertex of points) {
        if (visible(vertex)) {
          point(vertex, connected);
          connected = true;
        } else connected = false;
      }
    }
    function stroke(color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    ctx.lineCap = ctx.lineJoin = 'round';

    // The bob and arc use the same miniature demonstration phase.
    const pivot = project(0, HEIGHT, 0);
    const cos = Math.cos(motion.rotation);
    const sin = Math.sin(motion.rotation);
    const arc = arcAngles.map(angle => {
      const reach = LENGTH * Math.sin(angle);
      return project(reach * cos, HEIGHT - LENGTH * Math.cos(angle), reach * sin);
    });

    if (!trailPath) {
      trailPath = new Path2D();
      trailConnected = false;
      samples.forEach(appendSample);
    }
    ctx.strokeStyle = '#06273be8';
    ctx.lineWidth = 4.5;
    ctx.stroke(trailPath);
    ctx.strokeStyle = TRAIL_COLOR;
    ctx.lineWidth = 2.5;
    ctx.stroke(trailPath);

    const sector = [pivot, ...arc, pivot];
    path(sector);
    if (sector.every(visible)) {
      ctx.fillStyle = '#c6b5ff70';
      ctx.fill();
    }
    stroke('#c6b5ffba', 1.5);
    path(arc);
    stroke(COLOR, 2);

    for (const structure of [ring, arch]) {
      path(structure.map(vertex => project(...vertex)));
      stroke('#0b1422', 3);
      stroke('#c6b5ffc7', 1.6);
    }

    const trailCenter = project(0, 4, 0);
    if (visible(trailCenter)) {
      ctx.beginPath();
      ctx.arc(CENTER + trailCenter[0], CENTER - trailCenter[1], 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      stroke('#18334b', 1);
    }

    const bob = project(motion.x, HEIGHT - LENGTH * Math.cos(motion.swing), motion.z);
    path([pivot, bob]);
    stroke('#19344c', 4.2);
    stroke('#fff3bc', 2.2);
    if (visible(bob)) {
      const x = CENTER + bob[0];
      const y = CENTER - bob[1];
      const metal = ctx.createRadialGradient(x - 1.5, y - 2, .5, x, y, 5);
      metal.addColorStop(0, '#fff');
      metal.addColorStop(.4, COLOR);
      metal.addColorStop(1, '#62548a');
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = metal;
      ctx.fill();
    }
  }
  function clearTrail() {
    samples.length = 0;
    trailPath = null;
    elapsed = sampleTime = 0;
  }
  return {setView, resize, advance, draw, clearTrail};
}

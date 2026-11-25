// Adapted from solar-lunar-eclipses/js/sun-rays.mjs at 5814098 to match its edge-light treatment.
// Local host adapter uses the public OpticalBeam API and the Earth scene frame event.
let renderer, scene, camera, beam, renderedAngle;

function incomingGradient(ctx,width,height,[dx,dy],distance){
 const norm=Math.hypot(dx,dy);
 const x=dx/norm,y=dy/norm;
 const halfSpan=(Math.abs(x)*width+Math.abs(y)*height)/2;
 const startX=width/2-x*halfSpan,startY=height/2-y*halfSpan;
 return ctx.createLinearGradient(startX,startY,startX+x*distance,startY+y*distance);
}

function drawSunEdgeGlow(ctx,width,height,direction,opacity){
 if(Math.hypot(direction[0],direction[1])<1e-8)return;
 const gradient=incomingGradient(ctx,width,height,direction,height*.32);
 gradient.addColorStop(0,'#ffd27e68');
 gradient.addColorStop(.35,'#e9ad4630');
 gradient.addColorStop(1,'#e9ad4600');
 ctx.save();
 ctx.globalAlpha*=opacity;
 ctx.fillStyle=gradient;
 ctx.fillRect(0,0,width,height);
 ctx.restore();
}

function drawSunRays(ctx, width, height, angle) {
  if (!renderer) {
    const T = window.THREE;
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0, 0);
    scene = new T.Scene();
    camera = new T.OrthographicCamera(0, width, 0, height, .1, 20);
    camera.position.z = 5;
    beam = new window.SharedComponents.OpticalBeam({ THREE: T, parent: scene, width: 3, zOffset: 0 });
    const extent = Math.hypot(width, height);
    for (let offset = -extent; offset <= extent; offset += 68) {
      beam.addSegment([-extent, offset, 0], [extent, offset, 0], { color: 0xffd395 });
    }
    beam.setOpacity(.8);
    beam.group.position.set(width / 2, height / 2, 0);
  }
  if (angle !== renderedAngle) {
    renderedAngle = angle;
    beam.group.rotation.z = angle;
    renderer.render(scene, camera);
  }
  ctx.drawImage(renderer.domElement, 0, 0, width, height);
}

function maskGlobeShadow(ctx, centre, radius, angle, length) {
  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = 'destination-out';
  // Erase both the projected globe and the shadow extending away from the Sun.
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.rect(0, -radius, length, radius * 2);
  ctx.fill();
  ctx.restore();
}

function disposeSunRays() {
  beam?.dispose();
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer = scene = camera = beam = renderedAngle = undefined;
}

export function mountEarthSunlight(earthScene) {
  if (!earthScene.ready()) return;

  const canvas = document.getElementById('earth-sunlight');
  const width = 1600;
  const height = 900;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(canvas.width / width, canvas.height / height);
  let previousFrame;

  function renderSunlight() {
    const { centre, subsolar, radius } = earthScene.camera();
    // The eclipse adapter takes the incoming direction, from the Sun towards Earth.
    const dx = centre.x - subsolar.x;
    const dy = centre.y - subsolar.y;
    const angle = Math.hypot(dx, dy) >= radius * .08 ? Math.atan2(dy, dx) : null;
    const frame = angle === null ? null : [angle, centre.x, centre.y, radius].join("|");
    if (frame === previousFrame) return;
    previousFrame = frame;
    ctx.clearRect(0, 0, width, height);
    if (angle === null) return;
    const direction = [Math.cos(angle), Math.sin(angle)];
    drawSunEdgeGlow(ctx, width, height, direction, 1);
    drawSunRays(ctx, width, height, angle);
    maskGlobeShadow(ctx, centre, radius, angle, Math.hypot(width, height));
  }

  try {
    renderSunlight();
  } catch (error) {
    disposeSunRays();
    console.warn('无法初始化太阳平行光层', error);
    return;
  }
  window.addEventListener('globe-frame', renderSunlight);
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    window.removeEventListener('globe-frame', renderSunlight);
    disposeSunRays();
  });
}

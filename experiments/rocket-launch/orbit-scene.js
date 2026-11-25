import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/loaders/GLTFLoader.js';

import { createOrbitGlobe } from './orbit-globe.js';
import { applyRocketPaint } from './rocket-paint-material.js';

const aspect = 16 / 9;
const viewHeight = 3.1;
const startAngle = .24;
const orbitRadius = 1.29;
const globeRadius = 286;
const globeSize = 800;
const globeCenter = { x: globeSize / 2, y: globeSize / 2 };
const globeReadyEvent = 'orbit-preview-globe-ready';
const sunDirection = [.94, .30, .16];

export async function mountOrbitScene(host, signal) {
  const gltf = await new GLTFLoader().loadAsync('assets/tianzhou-solar/tianzhou-solar.glb');
  function disposeModel() {
    const resources = new Set();
    gltf.scene.traverse(node => {
      if (!node.isMesh) return;
      resources.add(node.geometry);
      for (const material of [].concat(node.material)) {
        resources.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
      }
    });
    for (const resource of resources) resource.dispose();
  }
  if (signal.aborted) {
    disposeModel();
    return;
  }
  const globeCanvas = document.createElement('canvas');
  globeCanvas.className = 'orbit-earth';
  globeCanvas.width = globeCanvas.height = globeSize;
  const canvas = document.createElement('canvas');
  canvas.className = 'orbit-foreground';
  host.append(globeCanvas, canvas);
  signal.addEventListener('abort', () => {
    disposeModel();
    globeCanvas.remove();
    canvas.remove();
  }, { once: true });
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -viewHeight * aspect / 2, viewHeight * aspect / 2, viewHeight / 2, -viewHeight / 2, .1, 25
  );
  camera.position.z = 8;
  scene.add(new THREE.HemisphereLight(0xc6dcf8, 0x3b4b64, 1.4));
  const sun = new THREE.DirectionalLight(0xffe7c9, 2.6);
  sun.position.set(...sunDirection);
  scene.add(sun);

  const globe = createOrbitGlobe(globeReadyEvent);
  signal.addEventListener('abort', () => {
    renderer.dispose();
    renderer.forceContextLoss();
    const gl = globe.gl();
    globe.dispose();
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }, { once: true });
  if (!globe.init(globeCanvas)) throw new Error('GlobeShaderRenderer could not initialize');
  globe.grainMode = 1;
  globe.resize(globeSize, globeSize);

  const planet = new THREE.Group();
  planet.position.set(.49, -.05, 0);
  scene.add(planet);
  // The shared renderer owns color. This aligned sphere only masks stars, the orbit and the spacecraft.
  const globeDepth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64), new THREE.MeshBasicMaterial({ colorWrite: false })
  );
  globeDepth.renderOrder = -1;
  planet.add(globeDepth);

  const orbit = new THREE.Group();
  orbit.rotation.set(-1.13, 0, .42, 'ZYX');
  planet.add(orbit);
  const orbitBeam = new SharedComponents.OpticalBeam({
    THREE, parent: planet, width: .039, zOffset: 0,
  });
  const count = 72;
  const interval = Math.PI * 2 / count;
  const pointAt = angle => new THREE.Vector3(
    orbitRadius * Math.cos(angle), orbitRadius * Math.sin(angle), 0
  ).applyQuaternion(orbit.quaternion);
  const segmentBasis = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    // Overlap the component's soft end caps to keep the circular glow continuous.
    const start = pointAt((i - .0125) * interval);
    const end = pointAt((i + 1.0125) * interval);
    const forward = end.clone().sub(start).normalize();
    const lateral = new THREE.Vector3(-forward.y, forward.x, 0).normalize();
    const facing = new THREE.Vector3().crossVectors(forward, lateral);
    const segment = orbitBeam.addSegment(start, end, { color: 0xaccbff });
    segment.quaternion.setFromRotationMatrix(segmentBasis.makeBasis(forward, lateral, facing));
  }
  orbitBeam.setOpacity(.78);

  const ship = new THREE.Group();
  orbit.add(ship);
  const model = gltf.scene;
  model.traverse(node => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach(applyRocketPaint);
  });
  const mixer = new THREE.AnimationMixer(model);
  const deployment = mixer.clipAction(gltf.animations[0]);
  deployment.setLoop(THREE.LoopOnce, 1);
  deployment.clampWhenFinished = true;
  deployment.play();
  mixer.setTime(gltf.animations[0].duration);
  const bounds = new THREE.Box3().setFromObject(model);
  model.position.sub(bounds.getCenter(new THREE.Vector3()));
  const scale = .78 / bounds.getSize(new THREE.Vector3()).length();
  model.position.multiplyScalar(scale);
  model.scale.setScalar(scale);
  ship.add(model);

  // Fixed star positions keep the paused frame stable across refreshes.
  let seed = 8025;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (const [count, size, opacity] of [[220, .8, .27], [65, 1.5, .52]]) {
    const stars = Array.from({ length: count }, () => new THREE.Vector3(
      (random() - .5) * viewHeight * aspect, (random() - .5) * viewHeight, -3
    ));
    scene.add(new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(stars),
      new THREE.PointsMaterial({ color: 0xd3e3ff, size, transparent: true, opacity })
    ));
  }

  const tangent = new THREE.Vector3();
  const across = new THREE.Vector3();
  const normal = new THREE.Vector3(0, 0, 1);
  const attitude = new THREE.Matrix4();
  let angle = startAngle;
  const tilt = THREE.MathUtils.degToRad(23.5);
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);
  function drawGlobe() {
    const spin = -.72 + (angle - startAngle) * .13;
    const c = Math.cos(spin);
    const s = Math.sin(spin);
    globe.draw({
      sizePx: globeSize,
      pxPerLogical: 1,
      zoom: 1,
      focus: globeCenter,
      center: globeCenter,
      radius: globeRadius,
      basis: {
        axis: [-sinTilt, cosTilt, 0],
        e2: [-cosTilt * c, -sinTilt * c, s],
        e3: [cosTilt * s, sinTilt * s, c],
      },
      sun: sunDirection,
      atmosphere: true,
      dayNight: true,
    });
  }
  window.addEventListener(globeReadyEvent, drawGlobe, { signal });
  function draw() {
    ship.position.set(orbitRadius * Math.cos(angle), orbitRadius * Math.sin(angle), 0);
    tangent.set(-Math.sin(angle), Math.cos(angle), 0);
    across.crossVectors(normal, tangent).normalize();
    attitude.makeBasis(across, normal, tangent);
    ship.quaternion.setFromRotationMatrix(attitude);
    ship.rotateZ(-.62);
    drawGlobe();
    renderer.render(scene, camera);
  }
  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio * host.getBoundingClientRect().width / width, 2));
    const scale = height / viewHeight;
    const size = scale * globeSize / globeRadius;
    globeCanvas.style.width = globeCanvas.style.height = size + 'px';
    globeCanvas.style.left = (width / 2 + planet.position.x * scale) + 'px';
    globeCanvas.style.top = (height / 2 - planet.position.y * scale) + 'px';
    renderer.setSize(width, height, false);
    draw();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  signal.addEventListener('abort', () => {
    observer.disconnect();
    orbitBeam.dispose();
    globeDepth.geometry.dispose();
    globeDepth.material.dispose();
    for (const object of scene.children) {
      if (!object.isPoints) continue;
      object.geometry.dispose();
      object.material.dispose();
    }
  }, { once: true });
  resize();
  host.dataset.orbitState = 'ready';
  return {
    advance(dt) {
      angle += dt * .26;
      draw();
    },
  };
}

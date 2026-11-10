import { createTexturedRenderer } from './renderer.js';

const INITIAL_BASIS = {
  axis: [0, 1, 0],
  e2: [1, 0, 0],
  e3: [0, 0, 1],
};

const SUN = (() => {
  const direction = [Math.cos((27 * Math.PI) / 180), Math.sin((27 * Math.PI) / 180), 0.34];
  const length = Math.hypot(...direction);
  return direction.map((component) => component / length);
})();

function rotateBasis(basis, horizontal, vertical) {
  const y = horizontal * Math.PI;
  const x = vertical * Math.PI;
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cx = Math.cos(x);
  const sx = Math.sin(x);

  // Rotate all three axes by the same screen-space gesture. This is equivalent
  // to moving the camera around the globe and has no polar clamp, so the user
  // can inspect every point on the sphere.
  for (const key of ['axis', 'e2', 'e3']) {
    const [vx, vy, vz] = basis[key];
    const yawX = cy * vx + sy * vz;
    const yawZ = -sy * vx + cy * vz;
    basis[key] = [yawX, cx * vy - sx * yawZ, sx * vy + cx * yawZ];
  }
}

function copyBasis(source) {
  return {
    axis: [...source.axis],
    e2: [...source.e2],
    e3: [...source.e3],
  };
}

function replaceBasis(target, source) {
  for (const key of ['axis', 'e2', 'e3']) target[key] = [...source[key]];
}

/**
 * Mount an isolated, centered 3D Earth into `host`.
 *
 * The component deliberately owns no experiment DOM or scene state. It uses
 * the same textured WebGL renderer and assets as the EXP-04 observation page.
 *
 * Controls:
 * - drag: orbit horizontally and vertically without limits
 * - Ctrl + drag: lock to the dominant screen axis and snap to fixed angle steps
 * - wheel / pinch: zoom
 * - arrow keys: orbit; + / -: zoom
 */
export function createEarthGlobe(
  host,
  {
    assetBase = new URL('../../assets/', import.meta.url),
    minZoom = 0.35,
    maxZoom = 2.5,
    snapDegrees = 15,
  } = {},
) {
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('createEarthGlobe requires an HTMLElement host.');
  }
  if (!Number.isFinite(snapDegrees) || snapDegrees <= 0) {
    throw new RangeError('snapDegrees must be a positive number.');
  }

  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    `拖动环绕地球，按住 Ctrl 拖动按 ${snapDegrees} 度吸附旋转；滚轮或双指缩放，方向键旋转`,
  );
  host.append(canvas);

  const assetUrl = (name) => new URL(name, assetBase).href;
  const textureUrls = {
    handdrawn: assetUrl('earth-eq-redraw-1152x576.png'),
    original: assetUrl('earth-eq-2048.png'),
  };
  const renderer = createTexturedRenderer({
    textureUrl: textureUrls.handdrawn,
    grainUrl: assetUrl('grain-ref-512.png'),
    grainBrushUrl: assetUrl('grain-brush-512.png'),
    reliefUrl: assetUrl('land-relief-1024x512.png'),
  });
  const ready = renderer.init(canvas);
  const controller = new AbortController();
  const { signal } = controller;
  const pointers = new Map();

  const basis = {
    axis: [...INITIAL_BASIS.axis],
    e2: [...INITIAL_BASIS.e2],
    e3: [...INITIAL_BASIS.e3],
  };
  let rotateGesture = null;
  let zoomGesture = null;
  let constrainedAxis = null;
  let constrainedAngle = 0;
  let projection = 'orthographic';
  let textureStyle = 'handdrawn';
  let brushEnabled = true;
  let lightingMode = 'sunlit';
  let polarOuterLatitude = 60;
  let projectionRotation = 0;
  let zoom = 1;
  let size = 1;
  let cssSize = 1;
  let frame = 0;
  let destroyed = false;

  function draw() {
    frame = 0;
    if (destroyed || !ready) return;
    renderer.draw({
      sizePx: size,
      pxPerLogical: (size * 0.36) / 202,
      zoom,
      focus: { x: 781, y: 324 },
      basis,
      sun: SUN,
      projection,
      projectionRotation,
      polarSpan: ((90 - polarOuterLatitude) * Math.PI) / 180,
      surfaceDetail: brushEnabled ? 1 : 0,
      lighting: lightingMode === 'unlit' ? 0 : 1,
      sunHighlight: lightingMode === 'sunlit' ? 1 : 0,
    });
  }

  function invalidate() {
    if (!frame && !destroyed) frame = requestAnimationFrame(draw);
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    cssSize = Math.max(1, Math.min(rect.width, rect.height));
    size = Math.round(cssSize * Math.min(window.devicePixelRatio || 1, 2));
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    canvas.width = size;
    canvas.height = size;
    renderer.resize(size, size);
    invalidate();
  }

  function rotate(dx, dy) {
    if (projection === 'north-polar') {
      projectionRotation += (dx / cssSize) * Math.PI;
      invalidate();
      return;
    }
    rotateBasis(basis, dx / cssSize, dy / cssSize);
    invalidate();
  }

  function updateAriaLabel() {
    const modeInstruction =
      projection === 'north-polar'
        ? `当前为北极极坐标投影，外缘为北纬 ${polarOuterLatitude.toFixed(2)} 度，左右拖动旋转经度`
        : '拖动环绕地球，方向键旋转';
    const textureInstruction = textureStyle === 'original' ? '当前为原始纹理模式' : '当前为手绘纹理模式';
    const brushInstruction = brushEnabled ? '笔刷开启' : '笔刷关闭';
    const lightingInstruction = {
      sunlit: '太阳高光开启',
      diffuse: '太阳高光关闭，保留基础光照',
      unlit: '光照关闭',
    }[lightingMode];
    canvas.setAttribute(
      'aria-label',
      `${modeInstruction}；${textureInstruction}；${brushInstruction}；${lightingInstruction}；按住 Ctrl 拖动按 ${snapDegrees} 度吸附旋转，滚轮或双指缩放`,
    );
  }

  function setProjection(nextProjection) {
    if (!['orthographic', 'north-polar'].includes(nextProjection)) {
      throw new RangeError(`Unsupported projection: ${nextProjection}`);
    }
    if (projection === nextProjection) return;
    projection = nextProjection;
    canvas.dataset.projection = projection;
    clearConstraint();
    updateAriaLabel();
    canvas.dispatchEvent(
      new CustomEvent('earth-globe-projection', {
        bubbles: true,
        detail: { projection },
      }),
    );
    invalidate();
  }

  function setPolarOuterLatitude(latitude) {
    const numericLatitude = Number(latitude);
    if (!Number.isFinite(numericLatitude)) {
      throw new RangeError('Polar outer latitude must be a finite number.');
    }
    const nextLatitude = Math.max(0, Math.min(89, numericLatitude));
    if (polarOuterLatitude === nextLatitude) return;
    polarOuterLatitude = nextLatitude;
    canvas.dataset.polarOuterLatitude = nextLatitude.toFixed(2);
    updateAriaLabel();
    canvas.dispatchEvent(
      new CustomEvent('earth-globe-polar-edge', {
        bubbles: true,
        detail: { latitude: polarOuterLatitude },
      }),
    );
    invalidate();
  }

  function setTextureStyle(nextTextureStyle) {
    if (!['handdrawn', 'original'].includes(nextTextureStyle)) {
      throw new RangeError(`Unsupported texture style: ${nextTextureStyle}`);
    }
    if (textureStyle === nextTextureStyle) return;
    textureStyle = nextTextureStyle;
    canvas.dataset.textureStyle = textureStyle;
    renderer.setTextureUrl(textureUrls[textureStyle]);
    setBrushEnabled(textureStyle === 'handdrawn');
    updateAriaLabel();
    canvas.dispatchEvent(
      new CustomEvent('earth-globe-texture', {
        bubbles: true,
        detail: { textureStyle },
      }),
    );
    invalidate();
  }

  function setBrushEnabled(enabled) {
    const nextValue = Boolean(enabled);
    if (brushEnabled === nextValue) return;
    brushEnabled = nextValue;
    canvas.dataset.brush = brushEnabled ? 'on' : 'off';
    updateAriaLabel();
    canvas.dispatchEvent(
      new CustomEvent('earth-globe-brush', {
        bubbles: true,
        detail: { enabled: brushEnabled },
      }),
    );
    invalidate();
  }

  function setLightingMode(mode) {
    if (!['sunlit', 'diffuse', 'unlit'].includes(mode)) {
      throw new RangeError(`Unsupported lighting mode: ${mode}`);
    }
    if (lightingMode === mode) return;
    lightingMode = mode;
    canvas.dataset.lighting = lightingMode;
    updateAriaLabel();
    canvas.dispatchEvent(
      new CustomEvent('earth-globe-lighting', {
        bubbles: true,
        detail: { mode: lightingMode },
      }),
    );
    invalidate();
  }

  function setSunHighlight(enabled) {
    setLightingMode(enabled ? 'sunlit' : 'diffuse');
  }

  function setZoom(nextZoom) {
    if (!Number.isFinite(nextZoom)) return;
    zoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));
    invalidate();
  }

  function pointerDistance() {
    const active = [...pointers.values()];
    return Math.hypot(active[1].x - active[0].x, active[1].y - active[0].y);
  }

  function emitConstraint(active, axis = null, angle = 0) {
    canvas.dispatchEvent(
      new CustomEvent('earth-globe-constraint', {
        bubbles: true,
        detail: { active, axis, angle, step: snapDegrees },
      }),
    );
  }

  function clearConstraint() {
    if (constrainedAxis !== null) emitConstraint(false);
    constrainedAxis = null;
    constrainedAngle = 0;
    delete canvas.dataset.orbitAxis;
  }

  function beginRotation(pointerId, point, constrained) {
    rotateGesture = {
      pointerId,
      previousX: point.x,
      previousY: point.y,
      startX: point.x,
      startY: point.y,
      startBasis: copyBasis(basis),
      startProjectionRotation: projectionRotation,
      constrained,
      axis: null,
    };
    clearConstraint();
    if (constrained) canvas.dataset.orbitAxis = 'pending';
  }

  function rotateConstrained(event) {
    const dx = event.clientX - rotateGesture.startX;
    const dy = event.clientY - rotateGesture.startY;
    if (!rotateGesture.axis && Math.hypot(dx, dy) >= 4) {
      // Horizontal drags rotate around screen Y; vertical drags rotate around
      // screen X. Once selected, the axis remains fixed for this gesture.
      rotateGesture.axis =
        projection === 'north-polar' || Math.abs(dx) >= Math.abs(dy) ? 'y' : 'x';
      canvas.dataset.orbitAxis = rotateGesture.axis;
    }
    if (!rotateGesture.axis) return;

    const distance = rotateGesture.axis === 'y' ? dx : dy;
    const rawDegrees = (distance / cssSize) * 180;
    const angle = Math.round(rawDegrees / snapDegrees) * snapDegrees;
    if (angle === constrainedAngle) return;

    if (projection === 'north-polar') {
      projectionRotation = rotateGesture.startProjectionRotation + (angle * Math.PI) / 180;
      constrainedAxis = rotateGesture.axis;
      constrainedAngle = angle;
      emitConstraint(true, constrainedAxis, constrainedAngle);
      invalidate();
      return;
    }

    replaceBasis(basis, rotateGesture.startBasis);
    const turns = angle / 180;
    rotateBasis(
      basis,
      rotateGesture.axis === 'y' ? turns : 0,
      rotateGesture.axis === 'x' ? turns : 0,
    );
    constrainedAxis = rotateGesture.axis;
    constrainedAngle = angle;
    emitConstraint(true, constrainedAxis, constrainedAngle);
    invalidate();
  }

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0) return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      const point = { x: event.clientX, y: event.clientY };
      pointers.set(event.pointerId, point);

      if (pointers.size === 1) {
        beginRotation(event.pointerId, point, event.ctrlKey);
      } else {
        rotateGesture = null;
        zoomGesture = { distance: pointerDistance(), zoom };
        clearConstraint();
      }
    },
    { signal },
  );

  canvas.addEventListener(
    'pointermove',
    (event) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size >= 2) {
        const distance = pointerDistance();
        if (!zoomGesture) zoomGesture = { distance, zoom };
        if (zoomGesture.distance > 0) setZoom(zoomGesture.zoom * (distance / zoomGesture.distance));
        return;
      }

      if (!rotateGesture || rotateGesture.pointerId !== event.pointerId) {
        beginRotation(event.pointerId, previous, event.ctrlKey);
      }

      if (event.ctrlKey) {
        if (!rotateGesture.constrained) {
          rotateGesture = {
            ...rotateGesture,
            startX: previous.x,
            startY: previous.y,
            startBasis: copyBasis(basis),
            constrained: true,
            axis: null,
          };
          clearConstraint();
          canvas.dataset.orbitAxis = 'pending';
        }
        rotateConstrained(event);
        rotateGesture.previousX = event.clientX;
        rotateGesture.previousY = event.clientY;
        return;
      }

      if (rotateGesture.constrained) {
        rotateGesture.constrained = false;
        clearConstraint();
      }
      rotate(event.clientX - previous.x, event.clientY - previous.y);
      rotateGesture.previousX = event.clientX;
      rotateGesture.previousY = event.clientY;
    },
    { signal },
  );

  const endPointer = (event) => {
    pointers.delete(event.pointerId);
    zoomGesture = null;
    clearConstraint();

    if (pointers.size === 1 && event.type !== 'pointercancel') {
      const [pointerId, point] = pointers.entries().next().value;
      beginRotation(pointerId, point, event.ctrlKey);
    } else if (pointers.size === 0) {
      rotateGesture = null;
    }
  };
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(eventName, endPointer, { signal });
  }

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const delta = event.deltaMode === 1 ? event.deltaY * 0.03 : event.deltaY * 0.0015;
      setZoom(zoom * Math.exp(-delta));
    },
    { passive: false, signal },
  );
  canvas.addEventListener(
    'keydown',
    (event) => {
      const rotationKeys = {
        ArrowLeft: [-35, 0],
        ArrowRight: [35, 0],
        ArrowUp: [0, -35],
        ArrowDown: [0, 35],
      };
      if (rotationKeys[event.key]) {
        event.preventDefault();
        if (projection === 'north-polar' && !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        rotate(...rotationKeys[event.key]);
      } else if (event.key === '+' || event.key === '=' || event.key === '-') {
        event.preventDefault();
        setZoom(zoom * (event.key === '-' ? 0.9 : 1.1));
      }
    },
    { signal },
  );

  window.addEventListener('globe-texture-ready', invalidate, { signal });
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  canvas.dataset.projection = projection;
  canvas.dataset.textureStyle = textureStyle;
  canvas.dataset.brush = brushEnabled ? 'on' : 'off';
  canvas.dataset.lighting = lightingMode;
  canvas.dataset.polarOuterLatitude = polarOuterLatitude.toFixed(2);
  updateAriaLabel();
  resize();

  if (!ready) {
    const message = document.createElement('p');
    message.textContent = '当前浏览器不支持 WebGL，地球无法渲染。';
    message.setAttribute('role', 'alert');
    host.append(message);
  }

  return {
    get state() {
      return {
        zoom,
        projection,
        textureStyle,
        brushEnabled,
        lightingMode,
        sunHighlight: lightingMode === 'sunlit',
        polarOuterLatitude,
        projectionRotation,
        basis: structuredClone(basis),
        center: [host.clientWidth / 2, host.clientHeight / 2],
        constraint:
          rotateGesture?.constrained && constrainedAxis
            ? { axis: constrainedAxis, angle: constrainedAngle, step: snapDegrees }
            : null,
      };
    },
    setZoom,
    setProjection,
    setPolarOuterLatitude,
    setTextureStyle,
    setBrushEnabled,
    setLightingMode,
    setSunHighlight,
    rotate,
    destroy() {
      destroyed = true;
      controller.abort();
      observer.disconnect();
      cancelAnimationFrame(frame);
      renderer.dispose();
      canvas.remove();
      pointers.clear();
      clearConstraint();
      rotateGesture = null;
      zoomGesture = null;
    },
  };
}

/*
 * Bloom adapted from EXP-05 features/billboard/renderer.js at e262302.
 * EXP-01 uses static illustrations, with no atlas, LED mask or runtime EXP-05 dependency.
 */
const switchDuration = 280;

const vertexSource = `
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position * vec2(.5, -.5) + .5;
    gl_Position = vec4(position, 0., 1.);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform sampler2D artwork;
  uniform float brightness;
  uniform float switchStrength;
  uniform float switchFrame;
  uniform float bloom;
  varying vec2 uv;

  vec3 sampleFrame(vec2 at) {
    return texture2D(artwork, clamp(at, 0., 1.)).rgb;
  }

  void main() {
    vec2 q = uv;
    vec3 color;
    if (switchStrength > 0.) {
      float band = floor(uv.y * 24.);
      float noise = fract(sin(band * 127.1 + switchFrame * 311.7) * 43758.5453);
      q.x += (noise - .5) * .065 * switchStrength;
      float split = .007 * switchStrength;
      color = sampleFrame(q);
      color.r = sampleFrame(q + vec2(split, 0.)).r;
      color.b = sampleFrame(q - vec2(split, 0.)).b;
    } else {
      color = sampleFrame(q);
    }
    vec3 glow = vec3(0.);
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec3 tap = sampleFrame(q + vec2(float(x), float(y)) * .009);
        glow += max(tap - vec3(.43), vec3(0.));
      }
    }
    gl_FragColor = vec4(color * brightness + glow * (bloom / 9.) * 1.7, 1.);
  }
`;

function createScreenRenderer(canvas, image) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return null;

  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  const brightnessUniform = gl.getUniformLocation(program, 'brightness');
  const bloomUniform = gl.getUniformLocation(program, 'bloom');
  const strengthUniform = gl.getUniformLocation(program, 'switchStrength');
  const frameUniform = gl.getUniformLocation(program, 'switchFrame');
  gl.viewport(0, 0, canvas.width, canvas.height);

  return {
    draw(brightness, bloom, strength, frame) {
      gl.uniform1f(strengthUniform, strength);
      gl.uniform1f(frameUniform, frame);
      gl.uniform1f(brightnessUniform, brightness);
      gl.uniform1f(bloomUniform, bloom);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      canvas.dataset.drawn = '';
    },
    setImage(nextImage) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nextImage);
    },
  };
}

export function mountHallScreens(layer, controls, wake, options = {}) {
  const { cityScreenIndex = 1, cityImages = {}, cityImageTone = {} } = options;
  const fields = [
    ['brightness', '亮度', .5, 2, 2],
    ['bloom', 'Bloom', 0, 2, 2],
  ];
  const settings = {};
  const storageKey = 'foucault-hall-screen-v1';
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  let revision = 0;
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch {}
  };
  const update = (key, input, output) => {
    settings[key] = Number(input.value);
    output.value = settings[key].toFixed(2);
    revision++;
    wake();
  };
  const resetFields = fields.map(([key, label, min, max, defaultValue]) => {
    const row = document.createElement('label');
    const input = document.createElement('input');
    const output = document.createElement('output');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = .01;
    input.value = Number.isFinite(saved?.[key]) ? saved[key] : defaultValue;
    settings[key] = Number(input.value);
    output.value = settings[key].toFixed(2);
    input.addEventListener('input', () => update(key, input, output));
    input.addEventListener('change', save);
    row.append(label, input, output);
    controls.append(row);
    return () => {
      input.value = defaultValue;
      update(key, input, output);
    };
  });
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = '恢复屏幕默认';
  reset.addEventListener('click', () => {
    resetFields.forEach(resetField => resetField());
    save();
  });
  controls.append(reset);

  const imageCache = new Map();
  const loadImage = source => {
    if (imageCache.has(source)) return imageCache.get(source);
    const state = { image: new Image(), loaded: false };
    state.image.addEventListener('load', () => {
      state.loaded = true;
      wake();
    }, { once: true });
    state.image.src = source;
    imageCache.set(source, state);
    return state;
  };
  for (const source of new Set(Object.values(cityImages))) loadImage(source);

  const screens = Array.from(layer.querySelectorAll('.hall-screen-fx'), canvas => {
    const image = new Image();
    const svgImage = canvas.closest('g').querySelector('image');
    const screen = { canvas, draw: null, revision: -1, svgImage, currentImage: null, cityId: svgImage.dataset.city || '' };
    canvas.dataset.city = screen.cityId;
    const initialize = () => {
      screen.draw = createScreenRenderer(canvas, screen.currentImage || image);
      screen.revision = -1;
      wake();
    };
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      screen.draw = null;
      delete canvas.dataset.drawn;
    });
    canvas.addEventListener('webglcontextrestored', initialize);
    image.addEventListener('load', () => {
      screen.currentImage ??= image;
      initialize();
    }, { once: true });
    image.src = svgImage.href.baseVal;
    return screen;
  });

  const cityScreen = screens[cityScreenIndex];
  let pendingCity = null;
  let switchStarted = null;
  function selectCity(cityId) {
    if (!cityImages[cityId] || !cityScreen) return false;
    pendingCity = cityScreen.cityId === cityId ? null : cityId;
    wake();
    return true;
  }

  function draw(now, reducedMotion) {
    const imageState = pendingCity ? imageCache.get(cityImages[pendingCity]) : null;
    if (imageState?.loaded) {
      cityScreen.draw?.setImage(imageState.image);
      cityScreen.currentImage = imageState.image;
      cityScreen.cityId = pendingCity;
      cityScreen.canvas.dataset.city = pendingCity;
      cityScreen.svgImage.setAttribute('href', cityImages[pendingCity]);
      cityScreen.revision = -1;
      if (!reducedMotion && cityScreen.draw) {
        switchStarted = now;
        cityScreen.canvas.dataset.switching = 'true';
      }
      pendingCity = null;
    }
    const elapsed = switchStarted === null ? 0 : now - switchStarted;
    if (switchStarted !== null && (reducedMotion || elapsed >= switchDuration)) {
      switchStarted = null;
      delete cityScreen.canvas.dataset.switching;
      cityScreen.revision = -1;
    }
    for (const screen of screens) {
      const switching = screen === cityScreen && switchStarted !== null;
      if (!screen.draw || (!switching && screen.revision === revision)) continue;
      const tone = screen === cityScreen ? cityImageTone[screen.cityId] : null;
      const strength = switching ? 1 - elapsed / switchDuration : 0;
      screen.draw.draw(settings.brightness * (tone?.brightness ?? 1), settings.bloom * (tone?.bloom ?? 1),
        strength, Math.floor(elapsed / 35));
      screen.revision = revision;
    }
  }

  return { draw, selectCity };
}

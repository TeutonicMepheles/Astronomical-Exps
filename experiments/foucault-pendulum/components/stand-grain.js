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
  uniform sampler2D stand;
  uniform vec3 grainSettings;
  varying vec2 uv;

  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * .1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3. - 2. * f);
    return mix(mix(hash(cell), hash(cell + vec2(1., 0.)), f.x),
               mix(hash(cell + vec2(0., 1.)), hash(cell + 1.), f.x), f.y);
  }

  void main() {
    vec4 base = texture2D(stand, uv);
    // Two grain scales anchored to the artwork, independent of stage zoom.
    float brush = noise(uv * vec2(138., 240.) / grainSettings.z) - .5;
    float grain = noise(uv * 790. / grainSettings.z) - .5;
    gl_FragColor = vec4(base.rgb * (1. + grainSettings.x * brush + grainSettings.y * grain), base.a);
  }
`;

function createStandRenderer(gl, image) {
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
  const uniform = gl.getUniformLocation(program, 'grainSettings');
  return ({ brush, grain, size }) => {
    gl.uniform3f(uniform, brush, grain, size);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return !gl.isContextLost() && gl.getError() === gl.NO_ERROR;
  };
}

export function mountStandGrain(stage, controls, wake) {
  const storageKey = 'foucault-stand-grain-v1';
  const settings = {};
  let saved;
  let revision = 0;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch {}
  };
  const inputs = Array.from(controls.querySelectorAll('input'), input => {
    const key = input.dataset.standParam;
    const output = input.parentElement.querySelector('output');
    const update = () => {
      settings[key] = Number(input.value);
      output.value = settings[key].toFixed(2);
    };
    if (Number.isFinite(saved?.[key])) input.value = saved[key];
    update();
    input.addEventListener('input', () => {
      update();
      revision++;
      wake();
    });
    input.addEventListener('change', save);
    return { input, update };
  });
  controls.querySelector('button').addEventListener('click', () => {
    for (const { input, update } of inputs) {
      input.value = input.defaultValue;
      update();
    }
    revision++;
    save();
    wake();
  });

  const layers = Array.from(stage.querySelectorAll('.meridian-base, .meridian-stem'), layer => {
    const image = layer.querySelector('img');
    const canvas = layer.querySelector('canvas');
    const state = { layer, draw: null, revision: -1 };
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) return state;
    const initialize = () => {
      state.draw = createStandRenderer(gl, image);
      state.revision = -1;
      wake();
    };
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      state.draw = null;
      layer.removeAttribute('data-grain');
    });
    canvas.addEventListener('webglcontextrestored', initialize);
    if (image.complete && image.naturalWidth) initialize();
    else image.addEventListener('load', initialize, { once: true });
    return state;
  });

  return () => {
    for (const state of layers) {
      if (!state.draw || state.revision === revision) continue;
      state.layer.toggleAttribute('data-grain', state.draw(settings));
      state.revision = revision;
    }
  };
}

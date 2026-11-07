import { createGL, disposeGL } from './gl.js';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform vec2      u_res;
uniform vec2      u_center;
uniform float     u_radius;
uniform vec3      u_axis;
uniform vec3      u_e2;
uniform vec3      u_e3;
uniform vec3      u_sun;
uniform sampler2D u_tex;
uniform sampler2D u_grain;
uniform sampler2D u_grainBrush;
uniform sampler2D u_relief;
uniform float     u_hasTex;
uniform float     u_debug;
uniform float     u_observation;
uniform float     u_gridOnly;
uniform float     u_grainMode;
uniform float     u_step;
uniform float     u_showLatitude;
uniform float     u_showLongitude;
uniform float     u_dashedLatitude;
uniform float     u_dashLen;
uniform float     u_dashGap;
uniform float     u_gridAlpha;
uniform float     u_gridOverlay;
uniform float     u_paperGrain;
uniform float     u_contactAO;
uniform vec3      u_gridColor;
uniform vec3      u_highColor;
uniform vec3      u_rimColor;
uniform vec3      u_ambientColor;
uniform float     u_highStrength;
uniform float     u_highRange;
uniform float     u_rimStrength;
uniform float     u_ambientStrength;
uniform float     u_highGrain;
uniform float     u_highGrainScale;

const float PI = 3.14159265359;

// ---- Hand-painted pigment noise ----
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
}

// Two octaves are sufficient at the supplied globe sizes.
float fbm3(vec3 p) {
  return 0.68 * vnoise3(p) + 0.32 * vnoise3(p * 2.13);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// Highlight-local RGB halftone, adapted from ShaderGradient's MIT HalftonePass.
// Keeping it in this shader avoids a full-screen render target on whiteboard GPUs.
float halftoneDot(vec2 pixel, float angle, float cellSize, float seed) {
  vec2 q = rotate2d(angle) * pixel / max(cellSize, 1.0);
  vec2 id = floor(q);
  vec2 f = fract(q) - 0.5;
  float scatterAngle = hash21(id + vec2(seed, 17.0 + seed)) * 6.28318531;
  float scatterAmount = (hash21(id + vec2(31.0 + seed, seed)) - 0.5) * 0.22;
  f -= vec2(cos(scatterAngle), sin(scatterAngle)) * scatterAmount;
  float dist = length(f);
  float aa = max(fwidth(dist), 0.018);
  return 1.0 - smoothstep(0.26 - aa, 0.26 + aa, dist);
}

vec3 placeholder(vec2 uv) {
  // Texture-free fallback keeps longitude/latitude alignment testable.
  float lon = uv.x * 360.0 - 180.0;
  float lat = 90.0 - uv.y * 180.0;
  vec3 ocean = vec3(0.106, 0.165, 0.369);
  vec3 color = ocean;
  color += vec3(0.05, 0.07, 0.12) * step(abs(mod(lon, 30.0) - 15.0), 13.5);
  return color;
}

void main() {
  vec2 p = (gl_FragCoord.xy - u_center) / u_radius;
  float r2 = dot(p, p);

  // Analytic antialiasing across the silhouette, in physical pixels.
  float radial = sqrt(r2);
  float edgeAA = max(fwidth(radial), 1.0 / u_radius);
  float cover = 1.0 - smoothstep(1.0 - edgeAA, 1.0 + edgeAA, radial);
  if (cover <= 0.002) discard;

  float z = sqrt(max(0.0, 1.0 - r2));
  vec3 n = vec3(p, z);

  float qa = dot(n, u_axis);
  float qx = dot(n, u_e2);
  float qz = dot(n, u_e3);

  float lat = asin(clamp(qa, -1.0, 1.0));
  float lon = atan(qz, qx);
  float cosLat = length(vec2(qx, qz));
  float pxAng = 1.0 / (u_radius * max(z, 0.06));

  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
  vec3 albedo = (u_hasTex > 0.5) ? texture2D(u_tex, uv).rgb : placeholder(uv);

  // ---- Grain: procedural brush, alpha grain, or dual-frequency brush ----
  vec3 localP = vec3(qx, qa, qz);
  if (u_grainMode > 1.5) {
    vec3 w = pow(abs(localP), vec3(4.0));
    w /= max(w.x + w.y + w.z, 1e-4);
    vec3 gp = localP * 3.0;
    float g = texture2D(u_grainBrush, gp.yz).r * w.x
            + texture2D(u_grainBrush, gp.zx).r * w.y
            + texture2D(u_grainBrush, gp.xy).r * w.z;
    albedo *= 0.65 + 0.70 * g;
  } else if (u_grainMode < 0.5) {
    float brush = fbm3(localP * vec3(7.0, 21.0, 7.0));
    albedo *= 0.895 + 0.210 * brush;
  } else {
    vec3 w = pow(abs(localP), vec3(4.0));
    w /= max(w.x + w.y + w.z, 1e-4);
    vec3 gp = localP * 11.0;
    float g = texture2D(u_grain, gp.yz).a * w.x
            + texture2D(u_grain, gp.zx).a * w.y
            + texture2D(u_grain, gp.xy).a * w.z;
    albedo *= 1.0 + (g - 0.50) * 0.60;
  }

  float paper = hash21(gl_FragCoord.xy) - 0.5;
  albedo += paper * u_paperGrain;

  // A channel is land coverage; the relief must not modulate ocean pixels.
  vec4 relief = texture2D(u_relief, uv);
  albedo *= 1.0 + (relief.r - 0.5) * 0.55 * relief.a;

  // ---- Directional sun lighting ----
  float ndl = dot(normalize(n), u_sun);
  float day = smoothstep(-0.055, 0.055, ndl);
  float diffuse = max(ndl, 0.0);
  vec3 col = albedo * (u_ambientColor * u_ambientStrength + 0.82 * diffuse);

  float stepAngle = max(u_step, 0.01);
  float la = lat / stepAngle;
  float lb = abs(fract(la + 0.5) - 0.5);
  float latW = clamp(pxAng / stepAngle, 1e-4, 0.45);
  float latLine = 1.0 - smoothstep(latW * 0.45, latW, lb);

  if (u_dashedLatitude > 0.5) {
    // Dashes follow geographic longitude because projected latitude chords
    // have a constant screen angle.
    float dashPeriod = max(u_dashLen + u_dashGap, 1e-4);
    float dashOn = u_dashLen / dashPeriod;
    float dashCoord = fract(lon / dashPeriod);
    float dashEdge = clamp(fwidth(dashCoord) * 1.5, 0.004, 0.12);
    latLine *= smoothstep(0.0, dashEdge, dashCoord)
             - smoothstep(dashOn - dashEdge, dashOn, dashCoord);
  }

  float lo = lon / stepAngle;
  float lob = abs(fract(lo + 0.5) - 0.5);
  float lonW = clamp(pxAng / (stepAngle * max(cosLat, 0.10)), 1e-4, 0.45);
  float lonLine = 1.0 - smoothstep(lonW * 0.45, lonW, lob);
  lonLine *= smoothstep(0.045, 0.22, cosLat);

  float grid = max(
    latLine * clamp(u_showLatitude, 0.0, 1.0),
    lonLine * clamp(u_showLongitude, 0.0, 1.0)
  );

  // Inline grid mode belongs before highlights; overlay mode is applied after
  // all light and material passes so annotations cannot be dimmed.
  if (u_gridOverlay < 0.5) {
    vec3 inlineGrid = mix(vec3(0.55, 0.68, 0.90), vec3(0.80, 0.88, 1.0), day);
    col = mix(col, inlineGrid, grid * u_gridAlpha);
  }

  // ---- Rough sun highlight ----
  vec3 N = normalize(n);
  vec3 H = normalize(u_sun + vec3(0.0, 0.0, 1.0));
  float NoV = max(N.z, 0.001);
  float NoL = max(ndl, 0.0);
  float NoH = max(dot(N, H), 0.0);
  float VoH = max(H.z, 0.0);
  float pigment = fbm3(localP * vec3(24.0, 48.0, 24.0));
  float roughness = 0.48 + 0.20 * pigment;
  float a2 = pow(roughness, 4.0);
  float denom = NoH * NoH * (a2 - 1.0) + 1.0;
  float D = a2 / (PI * denom * denom);
  float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
  float Gv = NoV / (NoV * (1.0 - k) + k);
  float Gl = NoL / (NoL * (1.0 - k) + k);
  float F = 0.04 + 0.96 * pow(1.0 - VoH, 5.0);
  float spec = D * Gv * Gl * F / max(4.0 * NoV * NoL, 0.001);
  float chalk = 0.84 + 0.28 * pigment + paper * 0.20;

  float broadBrush = fbm3(localP * vec3(5.0, 12.0, 5.0));
  float grazing = pow(1.0 - NoV, 0.70);
  float sunSide = smoothstep(0.05, clamp(0.85 / u_highRange, 0.1, 1.0), NoL);
  float variation = 0.82 + 0.30 * broadBrush + 0.12 * pigment;
  float softWash = pow(NoL, 2.0 / u_highRange) * 0.18;
  float edgeWash = grazing * sunSide * 1.20;
  float warmth = clamp((softWash + edgeWash) * variation, 0.0, 0.91);
  vec3 warmPigment = u_highColor * (0.94 + 0.06 * pigment);
  warmPigment *= 0.82 + 0.18 * clamp(albedo * 1.25, 0.0, 1.0);
  col = mix(col, warmPigment, clamp(warmth * u_highStrength, 0.0, 1.0));
  col += u_highColor * u_highStrength * spec * NoL * 2.0 * chalk;

  // Optional highlight-local RGB halftone.
  float highlightAmount = clamp(
    warmth * u_highStrength + spec * NoL * u_highStrength * 2.0 * chalk,
    0.0,
    1.0
  );
  float highlightGrainMask = smoothstep(0.08, 0.62, highlightAmount) * cover;
  float gradeFlow = clamp(
    0.5 + (broadBrush - 0.5) * 1.15 + 0.16 * sin(lat * 3.0 + lon * 1.4),
    0.0,
    1.0
  );
  vec3 gradeColor = mix(
    mix(vec3(1.0, 0.314, 0.020), vec3(0.859, 0.729, 0.584), gradeFlow),
    vec3(0.816, 0.737, 0.882),
    smoothstep(0.48, 0.92, gradeFlow)
  );
  gradeColor -= vec3(dot(gradeColor, vec3(0.2126, 0.7152, 0.0722)));
  float dotR = halftoneDot(gl_FragCoord.xy, PI / 12.0, u_highGrainScale, 1.0);
  float dotG = halftoneDot(gl_FragCoord.xy, PI / 6.0, u_highGrainScale, 2.0);
  float dotB = halftoneDot(gl_FragCoord.xy, PI / 4.0, u_highGrainScale, 3.0);
  vec3 rgbDots = vec3(dotR, dotG, dotB) - vec3(0.25);
  float grainLuma = (dotR + dotG + dotB) / 3.0;
  float grainStrength = highlightGrainMask * u_highGrain;
  col *= 1.0 - smoothstep(0.0, 0.58, 1.0 - grainLuma) *
         clamp(grainStrength * 0.07, 0.0, 0.25);
  col += gradeColor * rgbDots * grainStrength * 0.55;
  col += vec3(grainLuma - 0.25) * grainStrength * 0.22;
  col += gradeColor * highlightGrainMask * u_highGrain * 0.10 *
         (broadBrush * 2.0 - 1.0);

  float rim = pow(1.0 - NoV, 4.0);
  float coolSide = 1.0 - smoothstep(-0.3, 0.75, ndl);
  col += u_rimColor * rim * coolSide * chalk * u_rimStrength;

  // Optional darkening where the sphere meets a physical base.
  float bottomContact = 1.0 - smoothstep(-0.95, -0.35, p.y);
  float groundRim = 1.0 - smoothstep(0.0, 0.32, z);
  float contactAO = bottomContact * groundRim * cover;
  col *= 1.0 - contactAO * 0.18 * u_contactAO;

  if (u_gridOverlay > 0.5) {
    col = mix(col, u_gridColor, grid * u_gridAlpha);
  }

  if (u_debug > 1.5 && u_debug < 2.5) { gl_FragColor = vec4(vec3(lat / PI + 0.5), 1.0); return; }
  if (u_debug > 2.5 && u_debug < 3.5) { gl_FragColor = vec4(vec3(lon / PI * 0.5 + 0.5), 1.0); return; }
  if (u_debug > 4.5) { gl_FragColor = vec4(vec3(day), 1.0); return; }
  if (u_debug > 0.5) { gl_FragColor = vec4(uv, 0.0, 1.0); return; }

  float gridAlpha = 0.38 + grid * 0.28;
  vec3 wireColor = mix(col, vec3(0.68, 0.81, 1.0), grid * 0.55);
  vec4 solid = vec4(col * cover, cover);
  vec4 wire = vec4(wireColor * gridAlpha * cover, gridAlpha * cover);
  vec4 textured = mix(solid, wire, u_observation);
  float pureAlpha = (0.025 + grid * 0.68) * cover;
  vec4 pureGrid = vec4(vec3(0.66, 0.81, 1.0) * pureAlpha, pureAlpha);
  gl_FragColor = mix(textured, pureGrid, u_gridOnly);
}
`;

const DEFAULT_STYLE = {
  projection: {
    center: { x: 781, y: 324 },
    radius: 202,
  },
  grid: {
    stepDegrees: 10,
    latitude: true,
    longitude: true,
    dashedLatitude: true,
    dashLength: 0.25,
    dashGap: 0.25,
    alpha: 0.92,
    color: [0.90, 0.94, 1.0],
    overlay: true,
  },
  lighting: {
    highlightColor: '#e9e9f7',
    highlightStrength: 0.51,
    highlightRange: 1.53,
    highlightGrain: 4,
    highlightGrainScale: 3.35,
    rimColor: '#a5aec0',
    rimStrength: 1.18,
    ambientColor: '#7f7de8',
    ambientStrength: 0.75,
  },
  material: {
    paperGrain: 0.14,
    contactAO: 1,
  },
};

function cloneStyle(style) {
  return {
    projection: { ...style.projection, center: { ...style.projection.center } },
    grid: { ...style.grid, color: [...style.grid.color] },
    lighting: { ...style.lighting },
    material: { ...style.material },
  };
}

function colorToArray(color) {
  if (Array.isArray(color) || ArrayBuffer.isView(color)) {
    return [Number(color[0]) || 0, Number(color[1]) || 0, Number(color[2]) || 0];
  }
  if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) {
    return [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255);
  }
  return [0, 0, 0];
}

function copyColor(color) {
  return Array.isArray(color) || ArrayBuffer.isView(color) ? [...color] : color;
}

function degreesToRadians(value) {
  return Number(value) * Math.PI / 180;
}

function hasCompleteLighting(lighting) {
  return lighting && Object.keys(DEFAULT_STYLE.lighting).every((key) => key in lighting);
}

/**
 * Create a textured, illustrated globe renderer.
 *
 * The component owns WebGL resources and texture loading. The host owns camera
 * state, globe basis, scientific calculations, overlays and experiment assets.
 */
export function createGlobeShaderRenderer(options = {}) {
  const style = cloneStyle(DEFAULT_STYLE);
  if (options.projection) Object.assign(style.projection, options.projection);
  if (options.projection?.center) {
    style.projection.center = {
      ...DEFAULT_STYLE.projection.center,
      ...options.projection.center,
    };
  }
  if (options.grid) {
    Object.assign(style.grid, options.grid);
    if (options.grid.color) style.grid.color = copyColor(options.grid.color);
  }
  if (options.material) Object.assign(style.material, options.material);

  // A complete lighting object is retained by reference so an experiment's
  // existing debug controls still update the renderer live.
  style.lighting = hasCompleteLighting(options.lighting)
    ? options.lighting
    : { ...DEFAULT_STYLE.lighting, ...(options.lighting || {}) };

  const textureReadyEvent = options.textureReadyEvent || 'globe-texture-ready';
  let context = null;
  let gl = null;
  let program = null;
  let uniforms = {};
  let texture = null;
  let hasTexture = false;
  let grainTexture = null;
  let grainBrushTexture = null;
  let reliefTexture = null;
  let grainMode = 0;
  let alive = true;
  let surfaceGeneration = 0;
  let textTextureUrl = options.textureUrl || '';

  const dispatchReady = (kind, url) => {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
    window.dispatchEvent(new CustomEvent(textureReadyEvent, { detail: { kind, url } }));
  };

  function uploadTexture(image, {
    wrapS,
    wrapT,
    flipY = false,
    anisotropy = true,
  }) {
    const next = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, next);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    if (anisotropy) {
      const extension = gl.getExtension('EXT_texture_filter_anisotropic');
      if (extension) {
        const maximum = gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(
          gl.TEXTURE_2D,
          extension.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(8, maximum),
        );
      }
    }
    return next;
  }

  function loadAuxiliary(url, assign, wrapRepeat = true) {
    if (!url || !gl) return;
    const image = new Image();
    image.onload = () => {
      if (!alive || !gl) return;
      const next = uploadTexture(image, {
        wrapS: wrapRepeat ? gl.REPEAT : gl.CLAMP_TO_EDGE,
        wrapT: wrapRepeat ? gl.REPEAT : gl.CLAMP_TO_EDGE,
      });
      const previous = assign(next);
      if (previous) gl.deleteTexture(previous);
      dispatchReady('material', url);
    };
    image.onerror = () => console.warn('Globe material image failed to load', url);
    image.src = url;
  }

  const isPowerOfTwo = (value) => (value & (value - 1)) === 0;

  function loadSurfaceTexture(url) {
    if (!url || !gl) return;
    const generation = surfaceGeneration;
    const image = new Image();
    image.onload = () => {
      if (!alive || generation !== surfaceGeneration || !gl) return;
      let source = image;
      if (!isPowerOfTwo(image.width) || !isPowerOfTwo(image.height)) {
        const width = 2 ** Math.floor(Math.log2(image.width));
        const height = 2 ** Math.floor(Math.log2(image.height));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context2d = canvas.getContext('2d');
        context2d.imageSmoothingQuality = 'high';
        context2d.drawImage(image, 0, 0, width, height);
        source = canvas;
      }
      const next = uploadTexture(source, {
        wrapS: gl.REPEAT,
        wrapT: gl.CLAMP_TO_EDGE,
      });
      if (texture) gl.deleteTexture(texture);
      texture = next;
      hasTexture = true;
      dispatchReady('surface', url);
    };
    image.onerror = () => console.warn('Globe surface image failed to load; using fallback', url);
    image.src = url;
  }

  function resolvedColor(value) {
    return colorToArray(value);
  }

  return {
    init(canvas) {
      if (context) return true;
      try {
        context = createGL(canvas, FRAG, VERT);
        if (!context) return false;
        ({ gl, program } = context);
        for (const name of [
          'u_res', 'u_center', 'u_radius', 'u_axis', 'u_e2', 'u_e3',
          'u_sun', 'u_tex', 'u_hasTex', 'u_debug', 'u_grain', 'u_grainMode',
          'u_grainBrush', 'u_relief', 'u_observation', 'u_gridOnly',
          'u_step', 'u_showLatitude', 'u_showLongitude', 'u_dashedLatitude',
          'u_dashLen', 'u_dashGap', 'u_gridAlpha', 'u_gridOverlay',
          'u_paperGrain', 'u_contactAO', 'u_gridColor',
          'u_highColor', 'u_rimColor', 'u_ambientColor',
          'u_highStrength', 'u_highRange', 'u_rimStrength',
          'u_ambientStrength', 'u_highGrain', 'u_highGrainScale',
        ]) {
          uniforms[name] = gl.getUniformLocation(program, name);
        }
        loadAuxiliary(options.grainUrl, (next) => {
          const previous = grainTexture;
          grainTexture = next;
          return previous;
        });
        loadAuxiliary(options.grainBrushUrl, (next) => {
          const previous = grainBrushTexture;
          grainBrushTexture = next;
          return previous;
        });
        loadAuxiliary(options.reliefUrl, (next) => {
          const previous = reliefTexture;
          reliefTexture = next;
          return previous;
        }, false);
        loadSurfaceTexture(textTextureUrl);
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },

    gl: () => gl,

    get grainMode() {
      return grainMode;
    },

    set grainMode(value) {
      grainMode = Number(value) || 0;
    },

    setStyle(next = {}) {
      if (next.projection) {
        Object.assign(style.projection, next.projection);
        if (next.projection.center) {
          Object.assign(style.projection.center, next.projection.center);
        }
      }
      if (next.grid) {
        Object.assign(style.grid, next.grid);
        if (next.grid.color) style.grid.color = copyColor(next.grid.color);
      }
      if (next.lighting) {
        style.lighting = hasCompleteLighting(next.lighting)
          ? next.lighting
          : { ...style.lighting, ...next.lighting };
      }
      if (next.material) Object.assign(style.material, next.material);
    },

    setTextureUrl(url) {
      textTextureUrl = url || '';
      surfaceGeneration += 1;
      loadSurfaceTexture(textTextureUrl);
    },

    resize(width, height) {
      if (gl) gl.viewport(0, 0, width, height);
    },

    draw(scene) {
      if (!gl || !scene?.basis?.axis || !scene.sun) return;
      const size = Number(scene.sizePx) || 1;
      const { axis, e2, e3 } = scene.basis;
      gl.uniform2f(uniforms.u_res, size, size);

      const zoom = scene.zoom || 1;
      const focus = scene.focus || style.projection.center;
      const center = scene.center || style.projection.center;
      const radius = Number(scene.radius) || style.projection.radius;
      const pixelsPerLogical = scene.pxPerLogical
        || size / (radius * 2 * 1.42);
      const dx = (focus.x - center.x) * zoom * pixelsPerLogical;
      const dy = (focus.y - center.y) * zoom * pixelsPerLogical;

      gl.uniform2f(uniforms.u_center, size / 2 - dx, size / 2 + dy);
      gl.uniform1f(uniforms.u_radius, radius * zoom * pixelsPerLogical);
      gl.uniform3f(uniforms.u_axis, axis[0], axis[1], axis[2]);
      gl.uniform3f(uniforms.u_e2, e2[0], e2[1], e2[2]);
      gl.uniform3f(uniforms.u_e3, e3[0], e3[1], e3[2]);
      gl.uniform3f(uniforms.u_sun, scene.sun[0], scene.sun[1], scene.sun[2]);
      gl.uniform1f(uniforms.u_hasTex, hasTexture ? 1 : 0);
      gl.uniform1f(uniforms.u_debug, scene.debug || 0);
      gl.uniform1f(uniforms.u_grainMode, grainMode);
      gl.uniform1f(uniforms.u_observation, scene.observation || 0);
      gl.uniform1f(uniforms.u_gridOnly, scene.gridOnly || 0);

      const grid = style.grid;
      gl.uniform1f(uniforms.u_step, degreesToRadians(grid.stepDegrees));
      gl.uniform1f(uniforms.u_showLatitude, grid.latitude ? 1 : 0);
      gl.uniform1f(uniforms.u_showLongitude, grid.longitude ? 1 : 0);
      gl.uniform1f(uniforms.u_dashedLatitude, grid.dashedLatitude ? 1 : 0);
      gl.uniform1f(
        uniforms.u_dashLen,
        scene.dashLen ?? grid.dashLength ?? DEFAULT_STYLE.grid.dashLength,
      );
      gl.uniform1f(
        uniforms.u_dashGap,
        scene.dashGap ?? grid.dashGap ?? DEFAULT_STYLE.grid.dashGap,
      );
      gl.uniform1f(uniforms.u_gridAlpha, Number(grid.alpha) || 0);
      gl.uniform1f(uniforms.u_gridOverlay, grid.overlay ? 1 : 0);
      gl.uniform3fv(uniforms.u_gridColor, resolvedColor(grid.color));

      const { lighting, material } = style;
      gl.uniform1f(uniforms.u_paperGrain, Number(material.paperGrain) || 0);
      gl.uniform1f(uniforms.u_contactAO, Number(material.contactAO) || 0);
      gl.uniform3fv(uniforms.u_highColor, resolvedColor(lighting.highlightColor));
      gl.uniform3fv(uniforms.u_rimColor, resolvedColor(lighting.rimColor));
      gl.uniform3fv(uniforms.u_ambientColor, resolvedColor(lighting.ambientColor));
      gl.uniform1f(uniforms.u_highStrength, Number(lighting.highlightStrength) || 0);
      gl.uniform1f(uniforms.u_highRange, Number(lighting.highlightRange) || 1);
      gl.uniform1f(uniforms.u_rimStrength, Number(lighting.rimStrength) || 0);
      gl.uniform1f(uniforms.u_ambientStrength, Number(lighting.ambientStrength) || 0);
      gl.uniform1f(uniforms.u_highGrain, Number(lighting.highlightGrain) || 0);
      gl.uniform1f(uniforms.u_highGrainScale, Number(lighting.highlightGrainScale) || 1);

      if (texture && hasTexture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uniforms.u_tex, 0);
      }
      if (grainTexture) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, grainTexture);
        gl.uniform1i(uniforms.u_grain, 1);
      }
      if (grainBrushTexture) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, grainBrushTexture);
        gl.uniform1i(uniforms.u_grainBrush, 2);
      }
      if (reliefTexture) {
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, reliefTexture);
        gl.uniform1i(uniforms.u_relief, 3);
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    dispose() {
      alive = false;
      surfaceGeneration += 1;
      if (gl) {
        for (const item of [texture, grainTexture, grainBrushTexture, reliefTexture]) {
          if (item) gl.deleteTexture(item);
        }
        disposeGL(context);
      }
      texture = null;
      grainTexture = null;
      grainBrushTexture = null;
      reliefTexture = null;
      context = null;
      gl = null;
      program = null;
      uniforms = {};
      hasTexture = false;
    },
  };
}

export { DEFAULT_STYLE };

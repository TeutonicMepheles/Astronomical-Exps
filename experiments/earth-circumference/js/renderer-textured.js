/* 纹理版渲染器：equirectangular 贴图 + 晨昏线 + 大气边缘暖光 + 经纬网叠加。
 *
 * 贴图约定（与 @Golajah-Assets-Creator 对齐，逐字一致）：
 *   lon(x) = -180 + (x + 0.5) / W * 360     像素中心约定
 *   lat(y) =   90 - (y + 0.5) / H * 180
 * 因此 shader 里：
 *   u = (lon + PI) / 2PI       （-180° → 0，+180° → 1）
 *   v = (PI/2 - lat) / PI      （北极端 → 0，南极端 → 1）
 * 纹理横向用 REPEAT 消除接缝；纵向 CLAMP_TO_EDGE。
 */

import { createGL } from './globe-core.js';

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
uniform float u_gridOnly;
uniform float     u_grainMode;   // 0 = 程序化 3D 笔触，1 = 复用 grain-white-256 三平面纸纹

const float PI = 3.14159265359;
const float STEP = 0.26179938779;   // 15 度

// ---- 手绘质感用的噪声 ----
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

// 两段足够：第三段在缩略尺寸下看不见，却要多 8 次 3D 噪声查表
float fbm3(vec3 p) {
  return 0.68 * vnoise3(p) + 0.32 * vnoise3(p * 2.13);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 placeholder(vec2 uv) {
  // 没有贴图时的兜底：按经纬度画分区，仍能验证对齐与光照
  float lon = uv.x * 360.0 - 180.0;
  float lat = 90.0 - uv.y * 180.0;
  vec3 ocean = vec3(0.106, 0.165, 0.369);
  float band = step(abs(mod(lat, 30.0) - 15.0), 13.0) * 0.0;
  vec3 c = ocean + band;
  c += vec3(0.05, 0.07, 0.12) * step(abs(mod(lon, 30.0) - 15.0), 13.5);
  return c;
}

void main() {
  vec2 p = (gl_FragCoord.xy - u_center) / u_radius;
  float r2 = dot(p, p);

  // ---------- 大气外辉光：球体之外一圈 ----------
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
  float pxAng  = 1.0 / (u_radius * max(z, 0.06));

  // ---------- 贴图采样 ----------
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
  vec3 albedo = (u_hasTex > 0.5) ? texture2D(u_tex, uv).rgb : placeholder(uv);

  // ---------- 手绘质感 ----------
  vec3 localP = vec3(qx, qa, qz);
  if (u_grainMode > 1.5) {
    // C：双频笔刷（细齿 + 中频笔刷团），三平面取样
    vec3 w = pow(abs(localP), vec3(4.0));
    w /= max(w.x + w.y + w.z, 1e-4);
    vec3 gp = localP * 3.0;
    float g = texture2D(u_grainBrush, gp.yz).r * w.x
            + texture2D(u_grainBrush, gp.zx).r * w.y
            + texture2D(u_grainBrush, gp.xy).r * w.z;
    albedo *= 0.65 + 0.70 * g;
  } else if (u_grainMode < 0.5) {
    // A：程序化 3D 笔触。在物体空间取噪声 → 随地球旋转、天然无接缝、极点不拉伸
    // 各向异性 1:3（原来 1:9.2 会在球面上被曲率放大成刷痕/放射状条纹）
    float brush = fbm3(localP * vec3(7.0, 21.0, 7.0));
    albedo *= 0.895 + 0.210 * brush;             // ±7% 的起伏：方向性弱化后幅度也要收一点，否则会成噪点
  } else {
    // B：复用既有 grain-white-256（白色 RGB + alpha）。必须用物体空间三平面取样，
    //    否则 UV 取样会在极点压成条纹。
    vec3 w = pow(abs(localP), vec3(4.0));
    w /= max(w.x + w.y + w.z, 1e-4);
    vec3 gp = localP * 11.0;                     // 频率：让颗粒在屏幕上是 1–2px
    float g = texture2D(u_grain, gp.yz).a * w.x
            + texture2D(u_grain, gp.zx).a * w.y
            + texture2D(u_grain, gp.xy).a * w.z;
    albedo *= 1.0 + (g - 0.50) * 0.60;            // 参考频谱贴图，灰度 128 居中，双向
  }

  // 屏幕空间纸感颗粒：钉在像素上，不随球体缩放，也不会在极点被拉长
  float paper = hash21(gl_FragCoord.xy) - 0.5;
  albedo += paper * 0.075;

  // ---------- 陆地起伏（手绘感）：A 通道为陆地覆盖，不作用于海洋 ----------
  {
    vec4 rel = texture2D(u_relief, uv);
    albedo *= 1.0 + (rel.r - 0.5) * 0.55 * rel.a;
  }

  // ---------- 光照：固定太阳 ----------
  float ndl = dot(normalize(n), u_sun);
  float day = smoothstep(-0.055, 0.055, ndl);
  float diffuse = max(ndl, 0.0);
  vec3 col = albedo * (0.18 + 0.82 * diffuse);

  float la = lat / STEP;
  float lb = abs(fract(la + 0.5) - 0.5);
  float latW = clamp(pxAng / STEP, 1e-4, 0.45);
  float latLine = 1.0 - smoothstep(latW * 0.45, latW, lb);

  float lo = lon / STEP;
  float lob = abs(fract(lo + 0.5) - 0.5);
  float lonW = clamp(pxAng / (STEP * max(cosLat, 0.10)), 1e-4, 0.45);
  float lonLine = 1.0 - smoothstep(lonW * 0.45, lonW, lob);
  lonLine *= smoothstep(0.045, 0.22, cosLat);

  float grid = max(latLine, lonLine);
  vec3 gridCol = mix(vec3(0.55, 0.68, 0.90), vec3(0.80, 0.88, 1.0), day);
  col = mix(col, gridCol, grid * 0.20);

  // ---------- 向光面高光 ----------
  vec3 N = normalize(n);
  // Rough microfacet sun reflection (GGX); pigment varies roughness and coverage.
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
  // Artistic pigment wash supplements the rough BRDF for the supplied illustration.
  // Layered grazing light: continuous falloffs, no cut-out crescent boundary.
  float broadBrush = fbm3(localP * vec3(5.0, 12.0, 5.0));
  float grazing = pow(1.0 - NoV, 0.70);
  float sunSide = smoothstep(0.05, 0.85, NoL);
  float variation = 0.82 + 0.30 * broadBrush + 0.12 * pigment;
  float softWash = pow(NoL, 2.0) * 0.18;
  float edgeWash = grazing * sunSide * 1.20;
  float warmth = clamp((softWash + edgeWash) * variation, 0.0, 0.91);
  vec3 warmPigment = vec3(1.0, 0.91, 0.74) * (0.94 + 0.06 * pigment);
  // Retain local land/ocean contrast inside the light instead of flattening to yellow.
  warmPigment *= 0.82 + 0.18 * clamp(albedo * 1.25, 0.0, 1.0);
  col = mix(col, warmPigment, warmth);
  col += vec3(1.0, 0.90, 0.74) * spec * NoL * 2.0 * chalk;
  float rim = pow(1.0 - NoV, 4.0);
  float coolSide = 1.0 - smoothstep(-0.3, 0.75, ndl);
  col += vec3(0.18, 0.34, 0.63) * rim * coolSide * chalk * 0.55;

  if (u_debug > 1.5 && u_debug < 2.5) { gl_FragColor = vec4(vec3(lat / PI + 0.5), 1.0); return; }
  if (u_debug > 2.5 && u_debug < 3.5) { gl_FragColor = vec4(vec3(lon / PI * 0.5 + 0.5), 1.0); return; }
  if (u_debug > 4.5) { gl_FragColor = vec4(vec3(day), 1.0); return; }   // debug 5：光照因子（两版共用口径）
  if (u_debug > 0.5) { gl_FragColor = vec4(uv, 0.0, 1.0); return; }

  float gridAlpha = 0.38 + grid * 0.28;
  vec3 wireColor = mix(col, vec3(0.68, 0.81, 1.0), grid * 0.55);
  vec4 solid = vec4(col * cover, cover);
  vec4 wire = vec4(wireColor * gridAlpha * cover, gridAlpha * cover);
  vec4 textured = mix(solid, wire, u_observation);
  float pureAlpha=(0.025+grid*0.68)*cover;
  vec4 pureGrid=vec4(vec3(0.66,0.81,1.0)*pureAlpha,pureAlpha);
  gl_FragColor = mix(textured,pureGrid,u_gridOnly);
}
`;

export function createTexturedRenderer({ textureUrl, grainUrl, grainBrushUrl, reliefUrl } = {}) {
  let gl = null;
  let program = null;
  let u = {};
  let texture = null;
  let hasTex = false;
  let grainTex = null;
  let grainBrushTex = null;
  let reliefTex = null;
  let grainMode = 0;

  function loadGrain(url) {
    if (!url || !gl) return;
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      grainTex = tex;
      window.dispatchEvent(new CustomEvent('globe-texture-ready'));
    };
    img.onerror = () => console.warn('颗粒贴图加载失败，保持程序化笔触', url);
    img.src = url;
  }

  function loadExtra(url, assign, wrapRepeat = true) {
    if (!url || !gl) return;
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapRepeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapRepeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      assign(tex);
      window.dispatchEvent(new CustomEvent('globe-texture-ready'));
    };
    img.onerror = () => console.warn('贴图加载失败', url);
    img.src = url;
  }

  const isPOT = (n) => (n & (n - 1)) === 0;

  function loadTexture(url) {
    if (!url || !gl) return;
    const img = new Image();
    img.onload = () => {
      // WebGL1 下非 2 的幂贴图无法 REPEAT + mipmap（采样会变黑）。
      // 遇到非 POT 的素材（例如 1152×576），先重采样到不超过原尺寸的 POT 再上传。
      if (!isPOT(img.width) || !isPOT(img.height)) {
        const tw = 2 ** Math.floor(Math.log2(img.width));
        const th = 2 ** Math.floor(Math.log2(img.height));
        const c = document.createElement('canvas');
        c.width = tw;
        c.height = th;
        const cx = c.getContext('2d');
        cx.imageSmoothingQuality = 'high';
        cx.drawImage(img, 0, 0, tw, th);
        return uploadFrom(c, url);
      }
      uploadFrom(img, url);
    };
    img.onerror = () => { console.warn('贴图加载失败，回退到程序化占位', url); };
    img.src = url;
  }

  function uploadFrom(img, url) {
    {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);         // 横向接缝
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);  // 纵向极点
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso) {
        const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
      }
      if (texture) gl.deleteTexture(texture);
      texture = tex;
      hasTex = true;
      window.dispatchEvent(new CustomEvent('globe-texture-ready'));
    }
  }

  return {
    init(canvas) {
      try {
        const r = createGL(canvas, FRAG, VERT);
        if (!r) return false;
        gl = r.gl;
        program = r.program;
        for (const name of ['u_res', 'u_center', 'u_radius', 'u_axis', 'u_e2', 'u_e3',
                            'u_sun', 'u_tex', 'u_hasTex', 'u_debug', 'u_grain', 'u_grainMode',
                            'u_grainBrush', 'u_relief', 'u_observation', 'u_gridOnly']) {
          u[name] = gl.getUniformLocation(program, name);
        }
        loadGrain(grainUrl);
        loadExtra(grainBrushUrl, (tex) => { grainBrushTex = tex; });
        loadExtra(reliefUrl, (tex) => { reliefTex = tex; }, false);
        loadTexture(textureUrl);
        return true;
      } catch (err) {
        console.error(err);
        return false;
      }
    },
    gl: () => gl,
    get grainMode() { return grainMode; },
    set grainMode(v) { grainMode = Number(v) || 0; },
    /** 换 uv 贴图（对比用地表图）。加载完成前保留旧贴图，避免闪一帧占位色。 */
    setTextureUrl(url) { loadTexture(url); },
    resize(w, h) { if (gl) gl.viewport(0, 0, w, h); },
    draw(scene) {
      if (!gl) return;
      const size = scene.sizePx;
      const { axis, e2, e3 } = scene.basis;
      gl.uniform2f(u.u_res, size, size);
      const zoom = scene.zoom || 1;
      const f = scene.focus;
      const ppl = scene.pxPerLogical || (size / (202 * 2 * 1.42));
      const dx = (f.x - 781) * zoom * ppl;
      const dy = (f.y - 324) * zoom * ppl;
      gl.uniform2f(u.u_center, size / 2 - dx, size / 2 + dy);
      gl.uniform1f(u.u_radius, 202 * zoom * ppl);
      gl.uniform3f(u.u_axis, axis[0], axis[1], axis[2]);
      gl.uniform3f(u.u_e2, e2[0], e2[1], e2[2]);
      gl.uniform3f(u.u_e3, e3[0], e3[1], e3[2]);
      gl.uniform3f(u.u_sun, scene.sun[0], scene.sun[1], scene.sun[2]);
      gl.uniform1f(u.u_hasTex, hasTex ? 1 : 0);
      gl.uniform1f(u.u_debug, scene.debug || 0);
      gl.uniform1f(u.u_grainMode, grainMode);
      gl.uniform1f(u.u_observation, scene.observation || 0);
      gl.uniform1f(u.u_gridOnly, scene.gridOnly || 0);
      if (texture && hasTex) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(u.u_tex, 0);
      }
      if (grainTex) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, grainTex);
        gl.uniform1i(u.u_grain, 1);
      }
      if (grainBrushTex) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, grainBrushTex);
        gl.uniform1i(u.u_grainBrush, 2);
      }
      if (reliefTex) {
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, reliefTex);
        gl.uniform1i(u.u_relief, 3);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

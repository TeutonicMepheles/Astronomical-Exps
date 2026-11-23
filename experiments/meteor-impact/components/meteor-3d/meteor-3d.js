/* Local 3D adaptation of the EXP-02 crater prototype. See SOURCE.md. */
(() => {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smooth = (a, b, value) => {
    const t = clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const fract = value => value - Math.floor(value);
  const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  // Visual sizing: the previous small meteor is now the largest tier.
  const meteorScaleFactor = 2.05 / 3.85;
  const sizeScale = { small: 2.05 * meteorScaleFactor, medium: 2.85 * meteorScaleFactor, large: 2.05 };
  const sizeRadius = { small: 4.8, medium: 6.8, large: 9.2 };
  const sizeDepth = { small: 2.1, medium: 3.0, large: 4.0 };
  const speedFactor = { low: .84, medium: 1, high: 1.2 };
  const speedSpread = { low: .72, medium: 1, high: 1.3 };
  // The flat mesh is identical in both environments and copied on application.
  let flatTerrain;

  class MeteorScene3D {
    constructor(canvas, appearance = {}) {
      if (!window.THREE) throw new Error('Three.js 未加载');
      this.canvas = canvas;
      this.fixedViewport = appearance.viewport;
      this.THREE = window.THREE;
      const initial = appearance.initialRotation || [.2, .4, -.3];
      this.initialMeteorRotation = new this.THREE.Quaternion().setFromEuler(new this.THREE.Euler(...initial));
      this.meteorSpinAxis = new this.THREE.Vector3(...(appearance.angularVelocity || [1.8, 2.4, .9]));
      this.meteorSpinSpeed = this.meteorSpinAxis.length();
      this.meteorSpinAxis.normalize();
      this.meteorSpinDelta = new this.THREE.Quaternion();
      this.scene = new this.THREE.Scene();
      this.camera = new this.THREE.PerspectiveCamera(44, 1, .1, 500);
      this.camera.position.set(0, 31, 46);
      this.camera.lookAt(0, -1.4, 0);
      this.topCamera = new this.THREE.OrthographicCamera(-24, 24, 16, -16, .1, 250);
      this.topCamera.position.set(0, 90, 0);
      this.topCamera.up.set(0, 0, -1);
      this.topCamera.lookAt(0, 0, 0);
      this.renderer = new this.THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
      this.renderer.outputColorSpace = this.THREE.SRGBColorSpace;
      this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = .82;
      this.renderer.localClippingEnabled = true;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = false;
      this.sceneMode = 'moon';
      this.params = { size: 'medium', speed: 'medium', angle: '90', scene: 'moon' };
      this.terrainImpacted = false;
      this.animationFrame = 0;
      this.motion = null;
      this.onPhase = null;
      this.onComplete = null;
      this._buildTextures();
      this._buildLights();
      this._buildTerrain();
      this._buildMeteor();
      this._buildImpactEffects();
      this._buildPreviewGuide();
      this.resize();
      this.setScene('moon');
    }

    _buildTextures() {
      const T = this.THREE;
      let seed = 0xa34f97c1;
      const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      const size = 1024;
      const lunarCanvas = document.createElement('canvas');
      lunarCanvas.width = lunarCanvas.height = size;
      const lunar = lunarCanvas.getContext('2d');
      const pixels = lunar.createImageData(size, size);
      for (let i = 0; i < size * size; i++) {
        const shade = 238 + Math.floor(random() * 12);
        pixels.data[i * 4] = shade;
        pixels.data[i * 4 + 1] = shade - 3;
        pixels.data[i * 4 + 2] = shade - 9;
        pixels.data[i * 4 + 3] = 255;
      }
      lunar.putImageData(pixels, 0, 0);
      for (let i = 0; i < 280; i++) {
        const x = random() * size;
        const y = random() * size;
        const rx = 18 + random() * 100;
        const ry = 9 + random() * 50;
        lunar.fillStyle = i % 3 === 0 ? 'rgba(139,118,95,.025)' : 'rgba(255,251,237,.045)';
        lunar.beginPath();
        lunar.ellipse(x, y, rx, ry, random() * Math.PI, 0, Math.PI * 2);
        lunar.fill();
      }
      for (let i = 0; i < 13000; i++) {
        const x = random() * size;
        const y = random() * size;
        const radius = .7 + random() * 3.2;
        lunar.fillStyle = i % 4 === 0 ? 'rgba(255,255,246,.20)' : 'rgba(126,107,89,.13)';
        const rotation = random() * Math.PI * 2;
        lunar.beginPath();
        for (let j = 0; j < 5; j++) {
          const angle = rotation + j * Math.PI * 2 / 5;
          const r = radius * (.55 + random() * .45);
          const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
          if (j === 0) lunar.moveTo(px, py); else lunar.lineTo(px, py);
        }
        lunar.closePath(); lunar.fill();
      }
      lunar.fillStyle = 'rgba(121,106,90,.16)';
      for (let i = 0; i < 55000; i++) {
        lunar.fillRect(random() * size, random() * size, .5 + random() * 1.5, .5 + random() * 1.2);
      }
      // Match the current EXP-02 surface recipe; provenance and UV scale in SOURCE.md.
      for (let i = 0; i < 90; i++) {
        const x = 30 + random() * (size - 60), y = 30 + random() * (size - 60);
        const radius = i < 14 ? 12 + random() * 13 : 2 + random() * 8;
        lunar.fillStyle = 'rgba(125,109,93,.12)';
        lunar.beginPath(); lunar.ellipse(x + 1, y + 1, radius, radius * .72, random() * Math.PI, 0, Math.PI * 2); lunar.fill();
        lunar.strokeStyle = 'rgba(255,251,239,.46)'; lunar.lineWidth = 1 + random() * 2;
        lunar.beginPath(); lunar.arc(x, y, radius, Math.PI * .78, Math.PI * 1.8); lunar.stroke();
      }
      this.lunarTexture = new T.CanvasTexture(lunarCanvas);
      this.lunarTexture.colorSpace = T.SRGBColorSpace;
      this.lunarTexture.anisotropy = 4;
      // One texture across the central 64-unit patch; mirror its outer apron,
      // as EXP-02 does, rather than stretching border pixels over the wide terrain.
      this.lunarTexture.wrapS = this.lunarTexture.wrapT = T.MirroredRepeatWrapping;
      this.lunarTexture.repeat.set(5, 5);
      this.lunarTexture.offset.set(-2, -2);

      // Preserve the old Earth texture stream independently of the lunar recipe.
      // Original LCG seed after 1024² + 260*5 + 10500*9 + 48000*4 + 90*5 draws.
      seed = 0x905fa793;

      const soilCanvas = document.createElement('canvas');
      soilCanvas.width = soilCanvas.height = size;
      const soil = soilCanvas.getContext('2d');
      const soilPixels = soil.createImageData(size, size);
      for (let i = 0; i < size * size; i++) {
        const detail = pixels.data[i * 4] - 238;
        const grain = (random() - .5) * 18;
        const shade = clamp(233 + detail + grain, 0, 255);
        soilPixels.data[i * 4] = shade;
        soilPixels.data[i * 4 + 1] = shade;
        soilPixels.data[i * 4 + 2] = shade;
        soilPixels.data[i * 4 + 3] = 255;
      }
      soil.putImageData(soilPixels, 0, 0);
      // Dry aggregate texture, not a universal Earth soil. Same neutral albedo family.
      for (let i = 0; i < 4200; i++) {
        const x = random() * size, y = random() * size, radius = 1.5 + random() * 5;
        soil.fillStyle = i % 3 ? 'rgba(110,110,110,.12)' : 'rgba(255,255,255,.24)';
        soil.beginPath();
        soil.ellipse(x, y, radius, radius * (.45 + random() * .4), random() * Math.PI, 0, Math.PI * 2);
        soil.fill();
      }
      this.soilTexture = new T.CanvasTexture(soilCanvas);
      this.soilTexture.colorSpace = T.SRGBColorSpace;
      this.soilTexture.anisotropy = 4;
      this.soilTexture.wrapS = this.soilTexture.wrapT = T.RepeatWrapping;
      this.soilTexture.repeat.set(3.2, 3.2);

      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = glowCanvas.height = 128;
      const glow = glowCanvas.getContext('2d');
      const gradient = glow.createRadialGradient(64, 64, 2, 64, 64, 63);
      gradient.addColorStop(0, 'rgba(255,243,199,1)');
      gradient.addColorStop(.28, 'rgba(255,167,88,.58)');
      gradient.addColorStop(1, 'rgba(255,115,58,0)');
      glow.fillStyle = gradient;
      glow.fillRect(0, 0, 128, 128);
      this.flameTexture = new T.CanvasTexture(glowCanvas);

      const dustCanvas = document.createElement('canvas');
      dustCanvas.width = dustCanvas.height = 128;
      const dust = dustCanvas.getContext('2d');
      const dustGradient = dust.createRadialGradient(64, 64, 3, 64, 64, 64);
      dustGradient.addColorStop(0, 'rgba(238,226,207,.92)');
      dustGradient.addColorStop(.48, 'rgba(205,192,171,.65)');
      dustGradient.addColorStop(1, 'rgba(184,169,146,0)');
      dust.fillStyle = dustGradient;
      dust.fillRect(0, 0, 128, 128);
      this.dustTexture = new T.CanvasTexture(dustCanvas);

      const trailCanvas = document.createElement('canvas');
      trailCanvas.width = 64;
      trailCanvas.height = 192;
      const trail = trailCanvas.getContext('2d');
      trail.scale(1, 3);
      const trailGradient = trail.createRadialGradient(32, 32, 1, 32, 32, 32);
      trailGradient.addColorStop(0, 'rgba(255,239,207,.9)');
      trailGradient.addColorStop(.4, 'rgba(242,197,144,.48)');
      trailGradient.addColorStop(1, 'rgba(160,177,194,0)');
      trail.fillStyle = trailGradient;
      trail.fillRect(0, 0, 64, 64);
      this.trailTexture = new T.CanvasTexture(trailCanvas);
    }

    _buildLights() {
      const T = this.THREE;
      const sun = new T.DirectionalLight(0xfff1e5, 1.35);
      sun.position.set(-38, 28, 18);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 120 });
      // Prevent terrain self-shadow bands while retaining meteor and crater shadows.
      sun.shadow.bias = -.0005;
      sun.shadow.normalBias = .25;
      this.scene.add(sun);
      this.sun = sun;
      this.hemisphere = new T.HemisphereLight(0xb9c8dc, 0x49433d, .65);
      this.scene.add(this.hemisphere);
    }

    _buildTerrain() {
      const T = this.THREE;
      this.material = new T.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: .95,
        metalness: 0,
        map: this.lunarTexture,
        bumpMap: this.lunarTexture,
        bumpScale: .006,
        side: T.DoubleSide
      });
      this.impactMaterialRegion = { value: new T.Vector4() };
      this.material.onBeforeCompile = shader => {
        shader.uniforms.impactMaterialRegion = this.impactMaterialRegion;
        shader.vertexShader = 'varying vec2 vCraterTerrain;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>', '#include <begin_vertex>\nvCraterTerrain = position.xy;');
        shader.fragmentShader = 'varying vec2 vCraterTerrain;\nuniform vec4 impactMaterialRegion;\n'
          + shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            float wallDistance = length(vCraterTerrain * impactMaterialRegion.xy);
            float wallMaterial = 1.0 - smoothstep(impactMaterialRegion.z, impactMaterialRegion.w, wallDistance);
            #ifdef USE_ROUGHNESSMAP
              roughnessFactor = mix(roughness, roughnessFactor, wallMaterial);
            #endif`).replace('#include <normal_fragment_maps>', `
            #ifdef USE_NORMALMAP_TANGENTSPACE
              vec3 groundNormal = normal;
            #endif
            #include <normal_fragment_maps>
            #ifdef USE_NORMALMAP_TANGENTSPACE
              normal = normalize(mix(groundNormal, normal, wallMaterial));
            #endif`);
      };
      // The teaching camera stays fixed. A much larger plane prevents the terrain
      // boundary from entering frame and making the surface look like a square world.
      this.geometry = new T.PlaneGeometry(320, 320, 384, 384);
      this.geometry.setAttribute('color', new T.BufferAttribute(new Float32Array(this.geometry.attributes.position.count * 3), 3));
      this.mesh = new T.Mesh(this.geometry, this.material);
      this.mesh.rotation.x = -Math.PI / 2;
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      this.scene.add(this.mesh);
      this._rebuildTerrain(false);
    }

    _noise(x, y) {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      let fx = x - ix;
      let fy = y - iy;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      return (hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx) * (1 - fy)
        + (hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx) * fy;
    }

    _fbm(x, y) {
      return (this._noise(x, y) - .5) * .58
        + (this._noise(x * 2.03 + 19, y * 2.03) - .5) * .28
        + (this._noise(x * 4.11, y * 4.11 + 73) - .5) * .14;
    }

    _crater(x, y, radius, depth, seed, complex, rough) {
      const distance = Math.hypot(x, y);
      // The normalized radius cannot exceed 1 + .14 * .5 + .025.
      if (distance > radius * 3.6 * 1.095) return 0;
      const angle = Math.atan2(y, x);
      const cs = Math.cos(angle);
      const sn = Math.sin(angle);
      const warp = this._fbm(cs * 2.3 + seed, sn * 2.3 + seed);
      const rr = radius * (1 + .14 * warp + .025 * Math.sin(angle * 7 + seed));
      const u = distance / rr;
      if (u > 3.6) return 0;
      const radial = this._fbm(cs * 5 + seed, sn * 5 + seed);
      const rimVariation = clamp(.85 + radial * 1.8, .3, 1.35);
      const bowl = complex ? -depth * (1 - smooth(.32, 1.02, u)) : -depth * Math.pow(Math.max(0, 1 - u * u), 1.65);
      const rim = radius * .065 * rimVariation * Math.exp(-Math.pow((u - 1.025) / .15, 2));
      const apron = radius * .026 * Math.exp(-Math.max(0, u - 1) / .5) * smooth(.85, 1.12, u) * (1 - smooth(2.8, 3.6, u));
      const wall = smooth(.35, .6, u) * (1 - smooth(.96, 1.18, u));
      const shelves = complex ? depth * .055 * wall * Math.sin(u * 32 + radial * 4) : 0;
      const gullies = -radius * .025 * wall * Math.pow(this._noise(cs * 19 + seed + u * .6, sn * 19 + seed), 4);
      const slump = radius * .10 * Math.exp(-Math.pow((u - .7) / .16, 2)) * Math.pow(Math.max(0, Math.sin(angle * 5 + seed)), 4);
      const relief = radius * rough * (.05 * this._fbm(x * .6 + seed, y * .6) + .075 * this._fbm(x * .17 + seed, y * .17));
      const floor = depth * .04 * this._fbm(x * .25 + seed, y * .25) * (1 - smooth(.45, .8, u));
      const peak = complex ? depth * .32 * Math.exp(-Math.pow(u / .19, 2)) * (1 + this._fbm(x * .6, y * .6)) : 0;
      return bowl + rim + apron + shelves + gullies + slump + relief * (1 - smooth(1.5, 3.6, u)) + floor + peak;
    }

    _earthCraterProfile(x, y, visual, loose, groundHeight) {
      const nx = x / visual.radius;
      const ny = y / visual.radius;
      const bearing = Math.atan2(ny, nx);
      const distance = Math.hypot(nx, ny);
      const side = Math.sin(bearing);
      // Keep the measured centre-section diameter while breaking up the rest of the rim.
      const irregularity = loose
        ? .09 * Math.sin(3 * bearing + .7) + .045 * Math.cos(5 * bearing - .5)
        : .10 * Math.cos(4 * bearing + .42) + .055 * Math.sin(7 * bearing - .6);
      const rimDistance = distance / (1 + Math.abs(side) * irregularity);
      const rimBand = Math.exp(-(((rimDistance - 1) / (loose ? .43 : .10)) ** 2));
      const rimHeight = loose
        ? .29 + .025 * Math.sin(3 * bearing + .9)
        : .08 + .018 * Math.sin(6 * bearing + .8);

      // Short fissures cross the rim at uneven intervals and merge back into the terrain.
      const fractureSignal = Math.sin((loose ? 9 : 13) * bearing + 1.2 * Math.sin(3 * bearing) + 2.5 * (rimDistance - 1));
      const fissure = smooth(.77, .98, fractureSignal) * smooth(.74, .92, rimDistance)
        * (1 - smooth(1.05, loose ? 1.36 : 1.27, rimDistance));
      const grain = this._fbm(nx * 7 + 29, ny * 7);
      let profile;
      let detail;
      if (loose) {
        // A rounded entrance rolls quickly into a steep, offset shaft.
        const floorShift = .16 * (1 - smooth(.3, .97, rimDistance));
        const shaftDistance = Math.hypot(nx - floorShift, ny) / (1 + Math.abs(side) * irregularity);
        profile = 1 - smooth(.12, 1, shaftDistance) ** 3.4;
        const clod = Math.max(0, grain + .08) * smooth(.76, .94, rimDistance) * (1 - smooth(1.02, 1.27, rimDistance));
        detail = visual.radius * (.09 * clod + rimBand * rimHeight * smooth(.36, .85, rimDistance) - .022 * fissure);
      } else {
        profile = .38 * (1 - smooth(.24, .91, rimDistance))
          + .62 * (1 - smooth(.57, 1, rimDistance));
        const apron = .035 * smooth(.97, 1.12, rimDistance) * (1 - smooth(1.25, 1.72, rimDistance));
        // Shallow cuts in the actual mesh converge toward the basin. Widths are
        // limited by the terrain sampling so the narrower cuts stay continuous.
        const count = 44;
        const pitch = (bearing + Math.PI + .04 * Math.sin(5 * bearing)) * count / (2 * Math.PI);
        const nearest = Math.round(pitch);
        const channel = (nearest + count) % count;
        const offset = Math.abs(pitch - nearest);
        const width = .27 + .17 * hash(channel, 7.3);
        const start = .20 + .19 * hash(channel, 2.7);
        const fade = smooth(start, start + .24, rimDistance) * (1 - smooth(.94, 1.02, rimDistance));
        const cut = (.012 + .013 * hash(channel, 4.9)) * (1 - smooth(0, width, offset)) * fade;
        detail = visual.radius * (rimBand * rimHeight + apron - .038 * fissure - cut);
      }
      return {
        height: -visual.depth * profile + detail + groundHeight * smooth(1.05, loose ? 1.46 : 1.78, rimDistance),
        distance: rimDistance,
        fissure,
        grain,
        shade: loose ? .69 * smooth(.04, .55, profile) : 0
      };
    }

    _visualParams(params) {
      if (params.estimate) {
        const { diameter, depth, ejecta } = params.estimate;
        const { metersPerUnit } = params;
        const radius = diameter / (2 * metersPerUnit);
        const ejectaRadius = ejecta / metersPerUnit;
        return {
          radius, depth: depth / metersPerUnit, ejectaRadius, metersPerUnit,
          round: params.angle === '90' ? 1 : params.angle === '45' ? 1.08 : 1.65,
          ejectaAmount: params.ground === 'loose' ? .25 : 1.4,
          spread: Math.max(.1, ejectaRadius / radius - 1.3), seed: 29
        };
      }
      // Presentation dimensions only; no physical units or calibrated prediction.
      const atmosphere = params.scene === 'earth' ? .78 : 1;
      const loose = params.ground === 'loose';
      // Qualitative ground comparison, not calibrated soil or impact physics.
      const radius = sizeRadius[params.size] * speedFactor[params.speed] * atmosphere * (loose ? .65 : 1);
      const depth = sizeDepth[params.size] * (params.speed === 'high' ? 1.42 : params.speed === 'low' ? .65 : 1) * atmosphere * (loose ? 1.5 : .85);
      const strain = Number(params.angle);
      return {
        radius,
        depth,
        round: strain === 90 ? 1 : strain === 45 ? 1.08 : 1.65,
        ejectaAmount: loose ? .25 : 1.4,
        spread: (loose ? .55 : 1.3) * speedSpread[params.speed] * (params.size === 'large' ? 1.18 : params.size === 'small' ? .82 : 1),
        seed: 29
      };
    }

    _ejectaStructure(x, y, angle, visual, scene) {
      // Irregular aggregate patches versus broken radial streaks; visual presets only.
      const patch = clamp(.5 + this._fbm(x * .8 + visual.seed, y * .8) * 2, 0, 1);
      const direction = angle * 19 + 1.8 * Math.sin(angle * 5 + .8);
      const ray = Math.pow(Math.max(0, Math.cos(direction)), 8);
      return scene === 'earth' ? patch * patch * .75 + ray * .25 : ray * (.35 + patch * .65);
    }

    _terrainKey(impacted, params = { ...this.params, scene: this.sceneMode }) {
      return JSON.stringify(impacted ? [params.scene, params.size, params.speed, params.angle, params.ground || 'compact', params.estimate, params.metersPerUnit] : [params.scene, 'flat']);
    }

    *_terrainSteps(impacted, params = { ...this.params, scene: this.sceneMode }) {
      const T = this.THREE;
      this.terrainCache ||= new Map();
      const key = this._terrainKey(impacted, params);
      if (this.terrainCache.has(key)) return this.terrainCache.get(key);
      if (!impacted && flatTerrain) return flatTerrain;
      // Work in separate CPU arrays. The visible mesh remains intact until ready.
      const geometry = new T.BufferGeometry();
      geometry.setIndex(this.geometry.index);
      const position = new T.BufferAttribute((flatTerrain?.position || this.geometry.attributes.position.array).slice(), 3);
      const colors = new T.BufferAttribute(new Float32Array(position.count * 3), 3);
      geometry.setAttribute('position', position); geometry.setAttribute('color', colors);
      const visual = this._visualParams(params);
      const fieldColor = new T.Color(0x989b9f);
      const floorColor = new T.Color(0x929599);
      const outerColor = new T.Color(0xa6a8ab);
      const wallColor = new T.Color(0x727578);
      const rimColor = new T.Color(0xb4b7ba);
      const color = new T.Color();
      const scaled = impacted && Boolean(visual.metersPerUnit);
      const backgroundCraters = impacted && !scaled ? Array.from({ length: 4 }, (_, i) => {
        const angle = hash(i + visual.seed, 1.7) * Math.PI * 2;
        const distance = visual.radius + 9 + hash(i + visual.seed, 9.3) * 18;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          radius: 1.4 + Math.pow(hash(i + visual.seed, 7.7), 2) * 3.4
        };
      }) : [];
      const flat = impacted && flatTerrain;
      // Reuse the terrain mesh resolution, concentrating samples around small craters.
      const core = visual.radius * 1.32;
      const coreSamples = params.scene === 'earth' && params.ground === 'compact' ? 21 : 16;
      const sampleScale = (x, y) => {
        if (Math.abs(x) >= 25 || Math.abs(y) >= 25) return 1;
        const distance = Math.hypot(x, y);
        if (distance >= 25 || distance === 0) return 1;
        const coreSlope = core / coreSamples;
        if (distance <= coreSamples) return coreSlope;
        const span = 25 - coreSamples;
        const t = (distance - coreSamples) / span;
        // Match the inner and outer grid slopes so the transition has no hard ring.
        const blend = t * t * (3 - 2 * t);
        const innerTangent = t * (1 - t) ** 2 * coreSlope;
        const outerTangent = -t * t * (1 - t);
        const offset = core + (25 - core) * blend + span * (innerTangent + outerTangent);
        return offset / distance;
      };
      const ejectaLimit = scaled ? visual.ejectaRadius / visual.radius : 1.3 + visual.spread;
      const ejectaStart = scaled ? 1.15 : 1.3;
      const reliefRadius = Math.max(
        visual.radius * visual.round * Math.max(3.6 * 1.095, 1.3 + visual.spread),
        ...backgroundCraters.map(crater => Math.hypot(crater.x, crater.y) + crater.radius * 3.6 * 1.095)
      );
      if (flat) {
        position.array.set(flat.position);
        colors.array.set(flat.color);
      }

      for (let i = 0; i < position.count; i++) {
        const originalX = position.getX(i);
        const originalY = position.getY(i);
        const localScale = scaled ? sampleScale(originalX, originalY) : 1;
        const x = originalX * localScale;
        const y = originalY * localScale;
        if (localScale !== 1) { position.setX(i, x); position.setY(i, y); }
        if (flat && x === originalX && y === originalY && (Math.abs(x) > reliefRadius || Math.abs(y) > reliefRadius)) {
          if (i % 128 === 127) yield;
          continue;
        }
        let height = .43 * this._fbm(x * .16 + visual.seed, y * .16) + .11 * this._fbm(x * .85, y * .85);
        const craterX = scaled ? x : x / visual.round;
        const craterY = scaled ? y * visual.round : y;
        let craterDistance = impacted ? Math.hypot(craterX, craterY) / visual.radius : 0;
        const ejectaDistance = scaled ? Math.hypot(x, y) / visual.radius : craterDistance;
        let profile;
        if (impacted) {
          if (scaled && params.scene === 'earth' && craterDistance < 1.85) {
            profile = this._earthCraterProfile(craterX, craterY, visual, params.ground === 'loose', height);
            height = profile.height;
            craterDistance = profile.distance;
          } else if (scaled) {
            const bowl = -visual.depth * Math.max(0, 1 - craterDistance ** 2) ** 1.65;
            const rimOffset = (craterDistance - 1) / .16;
            const rim = visual.radius * .04 * Math.exp(-(rimOffset ** 2)) * smooth(.65, 1, craterDistance);
            height = height * smooth(1, 1.5, craterDistance) + bowl + rim;
          } else {
            height += this._crater(craterX, craterY, visual.radius, visual.depth, visual.seed, false, .82);
          }
          const bearing = Math.atan2(y, x);
          if (ejectaDistance > 1.1 && ejectaDistance < ejectaLimit) {
            const ray = this._ejectaStructure(x, y, bearing, visual, params.scene);
            height += .12 * visual.ejectaAmount * ray * smooth(1.1, ejectaStart, ejectaDistance) * (1 - smooth(ejectaStart, ejectaLimit, ejectaDistance));
          }
          for (const background of backgroundCraters) {
            height += this._crater(x - background.x, y - background.y, background.radius, background.radius * .23, visual.seed, false, .45);
          }
        }
        position.setZ(i, height);
        const angle = impacted ? Math.atan2(craterY, craterX) : 0;
        let d = 100;
        if (impacted) {
          const rr = visual.radius * (1 + .14 * this._fbm(Math.cos(angle) * 2.3 + visual.seed, Math.sin(angle) * 2.3 + visual.seed) + .025 * Math.sin(angle * 7 + visual.seed));
          d = ((scaled ? craterDistance : Math.hypot(craterX, craterY) / rr) - 1) * 100;
        }
        const floorTint = 1 - smooth(-68, -38, d);
        const wallTint = smooth(-78, -48, d) * (1 - smooth(-7, 5, d));
        const outerTint = smooth(9, 25, d) * (1 - smooth(40, 62, d));
        const rimTint = Math.exp(-Math.pow(d / 15, 2)) * .9;
        color.copy(fieldColor).lerp(floorColor, floorTint).lerp(outerColor, outerTint * .48)
          .lerp(wallColor, wallTint).lerp(rimColor, rimTint);
        color.multiplyScalar(.96 + .06 * this._noise(x * .075 + 12, y * .075 - 7));
        if (profile) {
          const roughness = params.ground === 'loose' ? .58 : .26;
          color.multiplyScalar(1 + profile.grain * roughness - profile.fissure * .19 - profile.shade);
        }
        if (impacted) {
          const radial = ejectaDistance;
          if (radial > 1.1 && radial < ejectaLimit) {
            const rays = this._ejectaStructure(x, y, angle, visual, params.scene);
            const ejecta = rays * smooth(1.1, ejectaStart, radial) * (1 - smooth(ejectaStart, ejectaLimit, radial));
            color.lerp(rimColor, Math.min(1, ejecta * .65 * visual.ejectaAmount));
          }
        }
        colors.setXYZ(i, color.r, color.g, color.b);
        if (i % 128 === 127) yield;
      }
      geometry.computeVertexNormals();
      const data = Object.fromEntries(['position','color','normal'].map(name => [name, geometry.attributes[name].array]));
      geometry.dispose();
      if (!impacted) {
        flatTerrain = data;
      } else {
        this.terrainCache.set(key, data);
        if (this.terrainCache.size > 2) this.terrainCache.delete(this.terrainCache.keys().next().value);
      }
      return data;
    }

    _rebuildTerrain(impacted, render = true) {
      const steps = this._terrainSteps(impacted);
      let result = steps.next();
      while (!result.done) result = steps.next();
      for (const name of ['position','color','normal']) {
        this.geometry.attributes[name].array.set(result.value[name]);
        this.geometry.attributes[name].needsUpdate = true;
      }
      const position = this.geometry.attributes.position;
      const uv = this.geometry.attributes.uv;
      // Project the ground texture from world-space coordinates after grid redistribution.
      for (let i = 0; i < position.count; i++) {
        uv.setXY(i, position.getX(i) / this.geometry.parameters.width + .5,
          position.getY(i) / this.geometry.parameters.height + .5);
      }
      uv.needsUpdate = true;
      const earthImpact = impacted && this.params.estimate && this.sceneMode === 'earth';
      const loose = this.params.ground === 'loose';
      const normals = earthImpact ? (loose ? this.mudNormal : this.rockNormal) || null : null;
      const roughnessMap = normals && loose ? this.mudRoughness : null;
      if (normals) {
        const visual = this._visualParams(this.params);
        this.impactMaterialRegion.value.set(1 / visual.radius, visual.round / visual.radius,
          loose ? 1.15 : .85, loose ? 1.65 : 1.08);
        this.material.normalScale.setScalar(loose ? .88 : 1.05);
      }
      if (this.material.normalMap !== normals || this.material.roughnessMap !== roughnessMap) {
        this.material.normalMap = normals;
        this.material.roughnessMap = roughnessMap;
        this.material.needsUpdate = true;
      }
      this.terrainImpacted = impacted;
      // The denser crater mesh needs a larger depth offset to avoid self-shadow speckling.
      this.sun.shadow.bias = impacted && this.params.estimate ? -.0024 : -.0005;
      this.geometry.computeBoundingSphere();
      this.renderer.shadowMap.needsUpdate = true;
      if (render) this._render();
    }

    _prepareImpact(token) {
      return this._prepareTerrain(true, { ...this.params, scene: this.sceneMode }, token);
    }

    prepareImpact(params) {
      return this._prepareTerrain(true, params, this.preparationToken);
    }

    async _prepareTerrain(impacted, params, token) {
      const steps = this._terrainSteps(impacted, params);
      while (token === this.preparationToken) {
        const deadline = performance.now() + 3;
        let result;
        do { result = steps.next(); } while (!result.done && performance.now() < deadline);
        if (result.done) return true;
        if (globalThis.scheduler?.yield) await scheduler.yield();
        else await new Promise(resolve => setTimeout(resolve, 0));
      }
      steps.return();
      return false;
    }

    _buildMeteor() {
      const T = this.THREE;
      this.impactGroup = new T.Group();
      this.impactGroup.visible = false;
      this.scene.add(this.impactGroup);
      this.meteorGeometry = new T.BufferGeometry();
      this.meteorMaterial = new T.MeshStandardMaterial();
      this.meteor = new T.Mesh(this.meteorGeometry, this.meteorMaterial);
      this.meteor.castShadow = true;
      this.impactGroup.add(this.meteor);
    }

    async _loadMeteor() {
      if (this.meteorLoaded) return;
      const T = this.THREE;
      // Asset-specific GLB reader: this bundled file is one uncompressed triangle mesh.
      // Preserve original normals, UVs and embedded base-color image.
      const response = await fetch(new URL('assets/porous-meteor.glb', document.baseURI));
      if (!response.ok) throw new Error('Meteor GLB load failed');
      const buffer = await response.arrayBuffer();
      const header = new DataView(buffer);
      if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) throw new Error('Unsupported meteor GLB');
      let asset, binary;
      for (let offset = 12; offset < buffer.byteLength;) {
        const length = header.getUint32(offset, true), type = header.getUint32(offset + 4, true);
        if (type === 0x4e4f534a) asset = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset + 8, length)));
        if (type === 0x004e4942) binary = buffer.slice(offset + 8, offset + 8 + length);
        offset += 8 + length;
      }
      const primitive = asset.meshes[0].primitives[0];
      if (primitive.mode !== 4 || asset.extensionsRequired?.length || asset.nodes.some(n => n.matrix || n.translation || n.rotation || n.scale)) throw new Error('Meteor asset format changed');
      const attribute = index => {
        const accessor = asset.accessors[index], view = asset.bufferViews[accessor.bufferView];
        const ArrayType = {5126: Float32Array, 5125: Uint32Array}[accessor.componentType];
        const count = {SCALAR: 1, VEC2: 2, VEC3: 3}[accessor.type];
        if (!ArrayType || !count || view.byteStride || accessor.sparse) throw new Error('Unsupported meteor attribute');
        return new T.BufferAttribute(new ArrayType(binary, (view.byteOffset || 0) + (accessor.byteOffset || 0), accessor.count * count).slice(), count);
      };
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', attribute(primitive.attributes.POSITION));
      geometry.setAttribute('normal', attribute(primitive.attributes.NORMAL));
      geometry.setAttribute('uv', attribute(primitive.attributes.TEXCOORD_0));
      geometry.setIndex(attribute(primitive.indices));
      geometry.center(); geometry.computeBoundingSphere();
      const normalization = 1 / geometry.boundingSphere.radius;
      geometry.scale(normalization, normalization, normalization);
      const pbr = asset.materials[primitive.material].pbrMetallicRoughness;
      const image = asset.images[asset.textures[pbr.baseColorTexture.index].source];
      const view = asset.bufferViews[image.bufferView];
      const url = URL.createObjectURL(new Blob([binary.slice(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)], {type: image.mimeType}));
      let texture;
      try { texture = await new T.TextureLoader().loadAsync(url); }
      catch (error) { geometry.dispose(); throw error; }
      finally { URL.revokeObjectURL(url); }
      texture.flipY = false;
      texture.colorSpace = T.SRGBColorSpace;
      if (this.disposed) { geometry.dispose(); texture.dispose(); return; }
      const material = new T.MeshStandardMaterial({map: texture, metalness: pbr.metallicFactor ?? 1, roughness: pbr.roughnessFactor ?? 1});
      this.meteorGeometry.dispose(); this.meteorMaterial.dispose();
      this.meteor.geometry = this.meteorGeometry = geometry;
      this.meteor.material = this.meteorMaterial = material;
      this.meteorLoaded = true;
      this._render();
    }

    _buildImpactEffects() {
      const T = this.THREE;
      this.trails = [];
      this.projectedHead = new T.Vector3();
      this.projectedTail = new T.Vector3();
      for (let i = 0; i < 18; i++) {
        const sprite = new T.Sprite(new T.SpriteMaterial({
          map: this.trailTexture,
          color: i % 3 === 0 ? 0xf6dfbd : 0xd9bda5,
          transparent: true,
          depthWrite: false,
          opacity: 0
        }));
        this.impactGroup.add(sprite);
        this.trails.push(sprite);
      }
      this.entryGlow = new T.Sprite(new T.SpriteMaterial({
        map: this.flameTexture,
        color: 0xffac55,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        opacity: 0
      }));
      this.impactGroup.add(this.entryGlow);
      this.flash = new T.Sprite(new T.SpriteMaterial({
        map: this.flameTexture,
        color: 0xffd899,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        opacity: 0
      }));
      this.flash.position.set(0, .8, 0);
      this.impactGroup.add(this.flash);
      this.shock = new T.Mesh(
        new T.RingGeometry(.72, .94, 64),
        new T.MeshBasicMaterial({ color: 0xe6d6bc, side: T.DoubleSide, transparent: true, opacity: 0, depthWrite: false })
      );
      this.shock.rotation.x = -Math.PI / 2;
      this.shock.position.y = .18;
      this.impactGroup.add(this.shock);

      let seed = 4137;
      const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      this.dustVolumeGeometry = new T.SphereGeometry(1, 16, 12);
      this.dust = [];
      for (let i = 0; i < 24; i++) {
        const sprite = this._createDustVolume(i);
        sprite.userData = {
          angle: random() * Math.PI * 2,
          distance: .15 + random() * .88,
          size: .17 + random() * .24,
          lift: .05 + random() * .35,
          delay: random() * .16
        };
        this.impactGroup.add(sprite);
        this.dust.push(sprite);
      }
      this.plume = [];
      for (let i = 0; i < 12; i++) {
        const sprite = this._createDustVolume(i + 24);
        sprite.userData = {
          angle: random() * Math.PI * 2,
          height: .18 + random() * .58,
          size: .12 + random() * .2
        };
        this.impactGroup.add(sprite);
        this.plume.push(sprite);
      }
      const sandPositions = new Float32Array(360 * 3);
      this.sandGeometry = new T.BufferGeometry();
      this.sandGeometry.setAttribute('position', new T.BufferAttribute(sandPositions, 3));
      this.sand = new T.Points(this.sandGeometry, new T.PointsMaterial({
        color: 0xf0eeea,
        size: .19,
        transparent: true,
        opacity: 0,
        depthWrite: false
      }));
      this.sand.frustumCulled = false;
      this.impactGroup.add(this.sand);
      this.sandSpecs = Array.from({ length: 360 }, () => ({
        angle: random() * Math.PI * 2,
        speed: .35 + random() * 1.15,
        lift: .3 + random() * 1.3,
        delay: random() * .38
      }));
      this.debris = [];
      const debrisGeometry = new T.IcosahedronGeometry(1, 0);
      for (let i = 0; i < 24; i++) {
        const debris = new T.Mesh(debrisGeometry, new T.MeshStandardMaterial({
          color: i % 3 === 0 ? 0xc3c5c7 : 0x55595e,
          roughness: 1,
          flatShading: true
        }));
        debris.visible = false;
        debris.userData = {
          angle: random() * Math.PI * 2,
          speed: .4 + random() * .85,
          lift: .55 + random() * .9,
          rotation: random() * 2
        };
        this.impactGroup.add(debris);
        this.debris.push(debris);
      }
      this.entryLight = new T.PointLight(0xffad65, 0, 14, 2);
      this.impactGroup.add(this.entryLight);
    }

    _createDustVolume(index) {
      const T = this.THREE;
      const tint = new T.Color(0xc9c9c9);
      const material = new T.ShaderMaterial({
        vertexShader: "varying vec3 localPoint;void main(){localPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: "\n    precision highp float;\n    varying vec3 localPoint;\n    uniform vec3 eye,tint;\n    uniform float strength,phase,offset;\n    float textureField(vec3 p){\n      p+=vec3(offset,offset*.7,offset*.3);\n      return .52+.24*sin(p.x*4.+sin(p.z*3.))*cos(p.y*4.5-p.z*2.)\n        +.13*sin(p.z*9.3+p.y*5.2)*cos(p.x*8.1-p.y*6.7);\n    }\n    void main(){\n      vec3 ray=normalize(localPoint-eye),p=localPoint+ray*.025;\n      vec3 result=vec3(0.);float alpha=0.;\n      for(int i=0;i<20;i++){\n        float n=textureField(p+vec3(phase*.09,-phase*.12,phase*.06));\n        float radial=1.-smoothstep(.42,1.,length(p));\n        float density=radial*smoothstep(.15,.72,n)*.28*strength;\n        float shade=.79+.13*p.y-.065*p.x+.12*n;\n        shade=mix(shade,floor(shade*14.)/14.,.45);\n        vec3 pigment=sqrt(tint)*vec3(1.)*shade;\n        result+=(1.-alpha)*density*pigment;alpha+=(1.-alpha)*density;\n        p+=ray*.10;\n      }\n      if(alpha<.012)discard;\n      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);\n      gl_FragColor=vec4(result/max(alpha,.001)*( .98+.035*grain),alpha);\n    }",
        transparent: true, depthWrite: false,
        uniforms: { eye: { value: new T.Vector3() }, tint: { value: tint }, strength: { value: 0 }, phase: { value: 0 }, offset: { value: index * .731 } }
      });
      material.color = tint; material.opacity = 0;
      return new T.Mesh(this.dustVolumeGeometry, material);
    }

    _syncDustVolumes(time) {
      for (const group of [this.dust, this.plume]) for (const puff of group) {
        puff.visible = puff.material.opacity > .005 && puff.scale.x > .001;
        const uniforms = puff.material.uniforms;
        uniforms.strength.value = puff.visible ? puff.material.opacity * 1.45 : 0;
        if (!puff.visible) continue;
        puff.scale.z = puff.scale.x * .88;
        puff.scale.multiplyScalar(.5);
        puff.updateMatrixWorld(true);
        uniforms.eye.value.copy(this.camera.position);
        puff.worldToLocal(uniforms.eye.value);
        uniforms.phase.value = time;
      }
    }

    _buildPreviewGuide() {
      const T = this.THREE;
      this.guideMaterial = new T.LineDashedMaterial({ color: 0xecba7d, dashSize: .7, gapSize: 1.2, transparent: true, opacity: .44 });
      this.guide = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), this.guideMaterial);
      this.scene.add(this.guide);
      this.targetRing = new T.Mesh(
        new T.RingGeometry(2.05, 2.32, 64),
        new T.MeshBasicMaterial({ color: 0xf1ae65, side: T.DoubleSide, transparent: true, opacity: .6, depthWrite: false })
      );
      this.targetRing.rotation.x = -Math.PI / 2;
      this.targetRing.position.y = .14;
      this.scene.add(this.targetRing);
    }

    _startForAngle(angle, inFrame = false) {
      const T = this.THREE;
      const end = this._groundPoint();
      const point = end.clone();
      if (Number(angle) === 90) {
        point.y += 13;
      } else {
        const horizontalOffset = Number(angle) === 45 ? new T.Vector3(-18, 0, -4) : new T.Vector3(-26, 0, -2);
        point.add(horizontalOffset);
        point.y += horizontalOffset.length() * Math.tan(T.MathUtils.degToRad(Number(angle)));
      }
      this.camera.updateMatrixWorld(true);
      if (inFrame) {
        const projected = point.clone().project(this.camera);
        for (let i = 0; i < 20 && (Math.abs(projected.x) > .75 || Math.abs(projected.y) > .7); i++) {
          point.lerp(end, .1);
          projected.copy(point).project(this.camera);
        }
        return point;
      }
      const direction = point.clone().sub(end);
      const frustum = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
      // Use the largest size for every grade so size comparisons share one path.
      const bounds = new T.Sphere(point, sizeScale.large * 1.3);
      let extension = 1;
      while (frustum.intersectsSphere(bounds) && extension < 10) {
        extension += .15;
        point.copy(end).addScaledVector(direction, extension);
      }
      return point;
    }

    _groundPoint() {
      return new this.THREE.Vector3(0, .8, 0);
    }

    _render() {
      if (!this.renderer || (!this.fixedViewport && (!this.canvas.clientWidth || !this.canvas.clientHeight))) return;
      this.renderer.render(this.scene, this.camera);
    }

    resize() {
      const width = this.fixedViewport?.[0] || this.canvas.clientWidth || 1150;
      const height = this.fixedViewport?.[1] || this.canvas.clientHeight || 740;
      const ratio = Math.min(devicePixelRatio || 1, 1.75);
      if (this.renderer.domElement.width === Math.floor(width * ratio) && this.renderer.domElement.height === Math.floor(height * ratio)) return;
      this.renderer.setPixelRatio(ratio);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this._render();
    }

    setScene(scene) {
      if (!['earth', 'moon'].includes(scene)) return;
      const changed = scene !== this.sceneMode;
      this.sceneMode = scene;
      this.params.scene = scene;
      this.material.map = scene === 'earth' ? this.soilTexture : this.lunarTexture;
      this.material.bumpMap = this.material.map;
      this.material.bumpScale = scene === 'earth' ? .018 : .006;
      // Match EXP-02's lunar material illumination; keep the Earth preset intact.
      const moon = scene === 'moon';
      this.renderer.toneMappingExposure = moon ? 1.08 : .82;
      this.sun.color.setHex(moon ? 0xfff4e4 : 0xfff1e5);
      this.sun.intensity = moon ? 3.2 : 1.35;
      this.hemisphere.color.setHex(moon ? 0xf9f1e7 : 0xb9c8dc);
      this.hemisphere.groundColor.setHex(moon ? 0x77716f : 0x49433d);
      this.hemisphere.intensity = moon ? .72 : .65;
      if (changed) this.material.needsUpdate = true;
      if (changed || this.terrainImpacted) this._rebuildTerrain(false, false);
    }

    _setMeteorRotation(elapsed) {
      this.meteorSpinDelta.setFromAxisAngle(this.meteorSpinAxis, this.meteorSpinSpeed * elapsed);
      this.meteor.quaternion.copy(this.initialMeteorRotation).premultiply(this.meteorSpinDelta);
    }

    async loadMeteor() {
      await this._loadMeteor();
    }

    drawFloatingMeteor(elapsed) {
      const T = this.THREE;
      if (!this.floatingScene) {
        this.floatingScene = new T.Scene();
        this.floatingCamera = new T.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, .1, 20);
        this.floatingCamera.position.z = 5;
        this.floatingRock = new T.Mesh(this.meteorGeometry, this.meteorMaterial);
        this.meteorGeometry.computeBoundingSphere();
        this.floatingRock.scale.setScalar(1 / this.meteorGeometry.boundingSphere.radius);
        const light = new T.DirectionalLight(0xffe4ce, 2.8);
        light.position.set(-3, 4, 3);
        this.floatingScene.add(light, new T.HemisphereLight(0xbad8ff, 0x5a3829, 1.45), this.floatingRock);
      }
      this.floatingRock.rotation.set(.35, .45 + elapsed * .34, -.25);
      this.floatingRock.position.y = Math.sin(elapsed * .65) * .08;
      this.renderer.render(this.floatingScene, this.floatingCamera);
    }

    preview(params) {
      this.cancel(false, false);
      this.params = { ...this.params, ...params };
      this.setScene(params.scene || this.sceneMode);
      if (this.terrainImpacted) this._rebuildTerrain(false, false);
      const start = this._startForAngle(params.angle);
      const end = this._groundPoint();
      this.meteor.visible = true;
      this.impactGroup.visible = true;
      this.meteor.position.copy(start);
      this.meteor.scale.setScalar(sizeScale[params.size]);
      this._setMeteorRotation(0);
      this.entryGlow.visible = false;
      this.flash.material.opacity = 0;
      this.shock.material.opacity = 0;
      this.dust.forEach(sprite => { sprite.material.opacity = 0; });
      this.plume.forEach(sprite => { sprite.material.opacity = 0; });
      this._syncDustVolumes(0);
      this.debris.forEach(item => { item.visible = false; });
      this.trails.forEach(sprite => { sprite.visible = false; });
      this.guide.geometry.dispose();
      this.guide.geometry = new this.THREE.BufferGeometry().setFromPoints([start, end]);
      this.guide.computeLineDistances();
      this.guide.visible = true;
      this.targetRing.visible = true;
      this.renderer.shadowMap.needsUpdate = true;
      this._render();
    }

    run(params, callbacks = {}, options = {}) {
      this.cancel(false, false);
      this.params = { ...this.params, ...params };
      this.setScene(params.scene || this.sceneMode);
      if (this.terrainImpacted) this._rebuildTerrain(false, false);
      this.previewSuppressed = true;
      this.guide.visible = false;
      this.targetRing.visible = false;
      const start = this._startForAngle(params.angle, options.inFrame);
      const end = this._groundPoint();
      this.onPhase = callbacks.onPhase || null;
      this.onComplete = callbacks.onComplete || null;
      this.lastPhase = '';
      this._setPhase('fall');
      this.meteor.visible = true;
      this.impactGroup.visible = true;
      this.meteor.position.copy(start);
      this.meteor.scale.setScalar(sizeScale[params.size]);
      this._resetEffects();
      this._setMeteorRotation(0);
      const prepared = this._prepareImpact(this.preparationToken);
      const activeToken = this.preparationToken;
      // Scene units/second are visual teaching presets, not physical velocities.
      const fallDuration = start.distanceTo(end) / ({ low: 13, medium: 22, high: 36 }[params.speed] || 22);
      const reduced = Boolean(options.reduced);
      if (reduced) {
        this.motion = { start: performance.now(), reduced: true, startPoint: start, endPoint: end, fallDuration, duration: fallDuration + 2.58, visual: this._visualParams(params) };
        prepared.then(ready => { if (ready && activeToken === this.preparationToken && this.motion) this._finishMotion(); });
        return;
      }
      this.motion = {
        start: options.startTime || performance.now(),
        reduced: false,
        startPoint: start,
        endPoint: end,
        fallDuration,
        duration: fallDuration + 2.58,
        visual: this._visualParams(params)
      };
      const tick = now => {
        if (!this.motion) return;
        this._updateMotion((now - this.motion.start) / 1000);
        if (this.motion) this.animationFrame = requestAnimationFrame(tick);
      };
      this.animationFrame = requestAnimationFrame(tick);
    }

    _resetEffects() {
      this.flash.material.opacity = 0;
      this.shock.material.opacity = 0;
      this.sand.material.opacity = 0;
      this.entryLight.intensity = 0;
      this.entryGlow.material.opacity = 0;
      this.trails.forEach(sprite => { sprite.visible = false; sprite.material.opacity = 0; });
      this.dust.forEach(sprite => { sprite.material.opacity = 0; });
      this.plume.forEach(sprite => { sprite.material.opacity = 0; });
      this._syncDustVolumes(0);
      this.debris.forEach(item => { item.visible = false; });
    }

    _setPhase(phase) {
      if (phase === this.lastPhase) return;
      this.lastPhase = phase;
      this.onPhase?.(phase);
    }

    _updateMotion(elapsed) {
      if (!this.motion) return;
      const fallEnd = this.motion.fallDuration;
      const contactEnd = fallEnd + .31;
      const duration = this.motion.duration;
      if (elapsed < fallEnd) {
        this.renderer.shadowMap.needsUpdate = true;
        this._setPhase('fall');
        const progress = clamp(elapsed / fallEnd, 0, 1);
        this.meteor.visible = true;
        this.meteor.position.copy(this.motion.startPoint).lerp(this.motion.endPoint, progress);
        this._setMeteorRotation(elapsed);
        const earth = this.sceneMode === 'earth';
        const meteorSize = sizeScale[this.params.size];
        this.projectedHead.copy(this.meteor.position).project(this.camera);
        this.projectedTail.copy(this.motion.startPoint).project(this.camera);
        const flowRotation = -Math.atan2(
          (this.projectedTail.x - this.projectedHead.x) * this.camera.aspect,
          this.projectedTail.y - this.projectedHead.y
        );
        this.entryGlow.visible = earth;
        this.entryGlow.material.opacity = earth ? .26 : 0;
        this.entryGlow.scale.setScalar(sizeScale[this.params.size] * 2.5);
        this.entryGlow.position.copy(this.meteor.position);
        this.entryLight.intensity = earth ? 3.2 : 0;
        this.entryLight.position.copy(this.meteor.position);
        this.trails.forEach((sprite, index) => {
          // Reuse the fixed pool: hot wake near the rock, cool airflow behind it.
          const smoke = index >= 12;
          const offset = smoke ? .12 + (index - 12) * .035 : index * .016;
          const previous = clamp(progress - offset, 0, 1);
          sprite.visible = earth && progress > offset;
          sprite.position.copy(this.motion.startPoint).lerp(this.motion.endPoint, previous);
          sprite.position.x += Math.sin(index * 1.7 + elapsed * 3) * (.06 + index * .025) * meteorSize;
          sprite.position.z += Math.cos(index * 1.3 + elapsed * 2) * index * .012 * meteorSize;
          sprite.material.rotation = flowRotation + Math.sin(index * 1.8 + elapsed) * .11;
          sprite.material.color.setHex(smoke ? (index % 3 ? 0xb5c3d0 : 0x839bb7) : [0xf6dfbd, 0xe9c6a7, 0xf0d4b5][index % 3]);
          sprite.material.opacity = sprite.visible ? (smoke ? .32 : .55) * Math.pow(1 - index / this.trails.length, .75) : 0;
          sprite.scale.set(meteorSize * (smoke ? 1.7 : 1.15 + index * .025), meteorSize * (smoke ? 2.7 : 2.5 + (index % 4) * .15), 1);
        });
      } else {
        if (this.meteor.visible) this.renderer.shadowMap.needsUpdate = true;
        this.meteor.visible = false;
        this.entryGlow.visible = false;
        this.trails.forEach(sprite => { sprite.visible = false; });
        this.entryLight.intensity = 0;
        const local = clamp((elapsed - fallEnd) / .42, 0, 1);
        this.flash.material.opacity = Math.max(0, 1 - local) * .88;
        this.flash.scale.setScalar(2.2 + local * 8.5);
        this.shock.material.opacity = 0;
        this.shock.scale.setScalar(1 + local * 15 * this.motion.visual.spread);
        if (elapsed < contactEnd) this._setPhase('contact');
      }

      if (elapsed >= fallEnd) {
        // Dust clears quickly; solid ejecta retain their original independent timing.
        const dustProgress = clamp((elapsed - fallEnd) / 1.29, 0, 1);
        const ejectaProgress = clamp((elapsed - fallEnd) / 2.58, 0, 1);
        if (elapsed >= contactEnd) this._setPhase(ejectaProgress > .86 ? 'result' : 'dust');
        const extent = this.motion.visual.radius;
        this.dust.forEach((puff, i) => {
          const data = puff.userData;
          const local = clamp((dustProgress - data.delay) / (1 - data.delay), 0, 1);
          const grow = smooth(0, .22, local);
          const angle = data.angle + Math.sin(local * 3 + i) * .08;
          const reach = extent * (.18 + data.distance * .55 + local * (.65 + data.distance * .5));
          const width = extent * (.40 + data.size) * grow * (1 + local * .65);
          puff.position.set(Math.cos(angle) * reach * this.motion.visual.round, extent * (.04 + Math.sin(local * Math.PI) * (.10 + data.lift * .3)), Math.sin(angle) * reach);
          puff.scale.set(width, width * (.38 + data.lift * .5), 1);
          puff.rotation.y = angle + local * .25;
          puff.material.opacity = grow * (1 - smooth(.35, 1, local)) * (.30 + data.size * .3);
        });
        this.plume.forEach((puff, i) => {
          const data = puff.userData;
          const delay = (i % 5) * .035;
          const local = clamp((dustProgress - delay) / (1 - delay), 0, 1);
          const grow = smooth(0, .24, local);
          const angle = data.angle + Math.sin(i + local * 4) * .12;
          const reach = extent * (.35 + data.height * .45 + local * (1 + data.size));
          const width = extent * (.26 + data.size * 1.2) * grow * (1 + local);
          puff.position.set(Math.cos(angle) * reach * this.motion.visual.round, extent * (.06 + Math.sin(local * Math.PI) * (.18 + data.height * .3)), Math.sin(angle) * reach);
          puff.scale.set(width, width * (.6 + data.height * .3), 1);
          puff.rotation.y = angle;
          puff.material.opacity = grow * (1 - smooth(.28, 1, local)) * .36;
        });
        this._syncDustVolumes(dustProgress * 3);
        const positions = this.sandGeometry.attributes.position.array;
        const age = elapsed - fallEnd;
        this.sandSpecs.forEach((spec, index) => {
          const local = clamp((age - spec.delay) / 1.5, 0, 1);
          const distance = extent * spec.speed * local * this.motion.visual.spread;
          positions[index * 3] = Math.cos(spec.angle) * distance * this.motion.visual.round;
          positions[index * 3 + 1] = Math.sin(Math.PI * local) * spec.lift * 2.4;
          positions[index * 3 + 2] = Math.sin(spec.angle) * distance;
        });
        this.sandGeometry.attributes.position.needsUpdate = true;
        this.sand.material.opacity = (1 - smooth(.7, 1, ejectaProgress)) * .9;
        this.debris.forEach((item, index) => {
          const data = item.userData;
          const local = clamp((age - .1) / 1.7, 0, 1);
          item.visible = ejectaProgress < .94;
          const distance = extent * data.speed * local * this.motion.visual.spread * 1.2;
          item.position.set(
            Math.cos(data.angle) * distance * this.motion.visual.round,
            Math.max(.16, Math.sin(Math.PI * local) * data.lift * 2.1),
            Math.sin(data.angle) * distance
          );
          item.scale.setScalar((.15 + (index % 4) * .055) * (1 - smooth(.82, 1, local)));
          item.rotation.set(local * data.rotation * 5, local * data.rotation * 3, data.angle);
        });
        if (dustProgress > .32 && !this.terrainImpacted && this.terrainCache.has(this._terrainKey(true))) this._rebuildTerrain(true, false);
      }
      if (elapsed >= duration && this.terrainCache.has(this._terrainKey(true))) this._finishMotion();
      else this._render();
    }

    _finishMotion() {
      if (!this.motion) return;
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
      if (!this.terrainImpacted) this._rebuildTerrain(true, false);
      this._setPhase('result');
      if (this.meteor.visible) this.renderer.shadowMap.needsUpdate = true;
      this.impactGroup.visible = false;
      this.guide.visible = false;
      this.targetRing.visible = false;
      this.motion = null;
      this._render();
      this.onComplete?.();
    }

    cancel(reset = true, render = true) {
      this.preparationToken = (this.preparationToken || 0) + 1;
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
      this.motion = null;
      this.onPhase = null;
      this.onComplete = null;
      if (this.impactGroup) {
        if (this.impactGroup.visible) this.renderer.shadowMap.needsUpdate = true;
        this.impactGroup.visible = false;
        this._resetEffects();
      }
      if (reset && this.terrainImpacted) this._rebuildTerrain(false, false);
      if (render) this._render();
    }

    sectionSamples() {
      // Read the actual triangulated terrain along its centre row, not a second bowl formula.
      const position = this.geometry.attributes.position;
      const segments = this.geometry.parameters.widthSegments;
      const row = segments / 2;
      return Array.from({ length: segments + 1 }, (_, column) => {
        const index = row * (segments + 1) + column;
        return { x: position.getX(index), height: position.getZ(index) };
      }).filter(point => Math.abs(point.x) <= 26);
    }

    resultData() {
      return { section: this.sectionSamples(), visual: { ...this._visualParams(this.params) }, annotations: JSON.parse(JSON.stringify(this.annotationViews || {})) };
    }

    framingFor(combos) {
      if (combos[0].metersPerUnit) {
        const deepest = Math.max(...combos.map(combo => combo.estimate.depth / combo.metersPerUnit));
        return { halfWidth: 23.5, centerY: -deepest / 2, baseY: -Math.max(9, deepest + 2), metersPerUnit: combos[0].metersPerUnit };
      }
      const extent = Math.max(...combos.map(combo => { const visual = this._visualParams(combo); return visual.radius * visual.round; }));
      return { halfWidth: Math.ceil((extent * 1.18 + 3) * 2) / 2, centerY: -3 };
    }

    stats() {
      const gl = this.renderer.getContext();
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return { active: Boolean(this.motion), geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures, terrainCacheEntries: this.terrainCache?.size || 0, captures: this.captureTimings || [], cutCamera: this.lastCutCamera || null, gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
    }

    async warmCapture() {
      await this._loadMeteor();
      if (this.disposed) return;
      // Warm both environments while the scene is loading, not on a parameter click.
      const token = this.preparationToken;
      for (const scene of ['moon','earth']) {
        if (!await this._prepareTerrain(false, { ...this.params, scene }, token)) return;
      }
      const original = { ...this.params, scene: this.sceneMode };
      const visible = [this.impactGroup.visible, this.guide.visible, this.targetRing.visible];
      this.impactGroup.visible = this.guide.visible = this.targetRing.visible = false;
      try {
        for (const scene of ['moon','earth']) {
          this.setScene(scene);
          await this.captureResult(true, true);
        }
      } finally {
        this.params = original;
        this.setScene(original.scene);
        this._rebuildTerrain(false, false);
        [this.impactGroup.visible, this.guide.visible, this.targetRing.visible] = visible;
        this._render();
      }
    }

    async warmStoryboard() {
      const loader = new this.THREE.TextureLoader();
      const textures = await Promise.all([
        loader.loadAsync('assets/quarry_wall_02_nor_gl_1k.jpg'),
        loader.loadAsync('assets/brown_mud_03_nor_gl_1k.jpg'),
        loader.loadAsync('assets/brown_mud_03_rough_1k.jpg')
      ]);
      if (this.disposed) { textures.forEach(texture => texture.dispose()); return; }
      [this.rockNormal, this.mudNormal, this.mudRoughness] = textures;
      for (const texture of textures) {
        texture.wrapS = texture.wrapT = this.THREE.RepeatWrapping;
        texture.repeat.set(165, 165);
        texture.anisotropy = 4;
      }
      // Pack rock striations more tightly across the grain than along it.
      this.rockNormal.repeat.set(174, 232);
      await this.warmCapture();
      if (this.disposed) return;
      const original = { ...this.params };
      const start = this._startForAngle(original.angle, true);
      const end = this._groundPoint();
      try {
        for (const scene of ['moon', 'earth']) {
          this.setScene(scene);
          this.impactGroup.visible = true;
          this.motion = {
            startPoint: start, endPoint: end, fallDuration: 1, duration: 3.58,
            visual: this._visualParams({ ...original, scene })
          };
          this.meteor.scale.setScalar(sizeScale[original.size]);
          this._updateMotion(.35);
          this._updateMotion(1.24);
          await new Promise(resolve => setTimeout(resolve, 0));
          if (this.disposed) return;
        }
      } finally {
        if (!this.disposed) {
          this.cancel(false, false);
          this.setScene(original.scene);
        }
      }
    }

    async captureResult(cutaway = false, warmOnly = false, framing = { halfWidth: 14, centerY: -3 }) {
      const started = performance.now();
      const width = this.renderer.domElement.width;
      const height = this.renderer.domElement.height;
      const captureWidth = 800;
      const aspect = framing.captureAspect || this.canvas.clientWidth / this.canvas.clientHeight || 800 / 700;
      const captureHeight = Math.round(captureWidth / aspect);
      const camera = new this.THREE.OrthographicCamera(-23.5, 23.5, 23.5 * captureHeight / captureWidth, -23.5 * captureHeight / captureWidth, .1, 500);
      camera.position.copy(this.camera.position); camera.quaternion.copy(this.camera.quaternion);
      if (cutaway) {
        const halfHeight = framing.halfWidth * captureHeight / captureWidth;
        camera.left = -framing.halfWidth; camera.right = framing.halfWidth;
        camera.top = halfHeight; camera.bottom = -halfHeight;
        camera.updateProjectionMatrix();
        // The cut face is z=0. View exactly along its normal, with no pitch or yaw.
        camera.position.set(0, framing.centerY, 44); camera.lookAt(0, framing.centerY, 0);
        this.lastCutCamera = {
          position: camera.position.toArray(),
          direction: camera.getWorldDirection(new this.THREE.Vector3()).toArray(),
          frustum: [camera.left, camera.right, camera.top, camera.bottom],
          aspect: captureWidth / captureHeight
        };
      }
      this.renderer.setSize(captureWidth, captureHeight, false);
      const T = this.THREE;
      const overlay = new T.Group();
      const samples = this.sectionSamples();
      const baseY = framing.baseY ?? -9;
      if (cutaway) {
        this.material.clippingPlanes = [new T.Plane(new T.Vector3(0, 0, -1), 0), new T.Plane(new T.Vector3(0, 0, 1), 20), new T.Plane(new T.Vector3(-1, 0, 0), 25.833333), new T.Plane(new T.Vector3(1, 0, 0), 25.833333)];
        // Close the clipped terrain with a real vertical face whose top vertices
        // are the very same centre-row vertices as the rendered surface.
        const vertices = [], indices = [];
        samples.forEach((point, i) => {
          vertices.push(point.x, point.height, 0, point.x, baseY, 0);
          if (i < samples.length - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        });
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices); geometry.computeVertexNormals();
        const material = new T.MeshStandardMaterial({ color: 0x7d8084, roughness: 1, side: T.DoubleSide });
        overlay.add(new T.Mesh(geometry, material));
        // Same mesh-strip technique as the lunar section edge: reliable thickness
        // on WebGL implementations where native line widths are limited to 1px.
        const edgeVertices = [];
        const half = framing.halfWidth * 2.5 / 800;
        for (let i = 1; i < samples.length; i++) {
          const a = samples[i - 1], b = samples[i];
          edgeVertices.push(a.x,a.height-half,.055, b.x,b.height-half,.055, b.x,b.height+half,.055,
            a.x,a.height-half,.055, b.x,b.height+half,.055, a.x,a.height+half,.055);
        }
        const edge = new T.Mesh(
          new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(edgeVertices, 3)),
          new T.MeshBasicMaterial({ color: framing.outlineColor ?? 0x53c7eb, side: T.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false })
        );
        edge.renderOrder = 20;
        overlay.add(edge);
        // A bounded slab and its side faces make the section a solid 3D cutaway.
        const position = this.geometry.attributes.position;
        const count = this.geometry.parameters.widthSegments + 1;
        for (const column of [161, 223]) {
          const sideVertices = [], sideIndices = [];
          for (let row = 168; row <= 192; row++) {
            const index = row * count + column;
            sideVertices.push(position.getX(index), position.getZ(index), -position.getY(index), position.getX(index), baseY, -position.getY(index));
            const i = row - 168;
            if (row < 192) sideIndices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
          }
          const sideGeometry = new T.BufferGeometry();
          sideGeometry.setAttribute('position', new T.Float32BufferAttribute(sideVertices, 3));
          sideGeometry.setIndex(sideIndices); sideGeometry.computeVertexNormals();
          overlay.add(new T.Mesh(sideGeometry, material.clone()));
        }
        for (const level of [-2, -4, -6, -8]) {
          const points = samples.filter(point => point.height > level).map(point => new T.Vector3(point.x, level, .025));
          if (points.length > 1) {
            // Independent segments avoid drawing across the open crater bowl.
            const segments = [];
            for (let i = 1; i < samples.length; i++) {
              if (samples[i - 1].height > level && samples[i].height > level) segments.push(new T.Vector3(samples[i - 1].x, level, .025), new T.Vector3(samples[i].x, level, .025));
            }
            overlay.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(segments), new T.LineBasicMaterial({ color: 0x4d5965 })));
          }
        }
      }
      const visual = this._visualParams(this.params);
      camera.updateMatrixWorld(true);
      const project = (x, y, z) => {
        const point = new T.Vector3(x, y, z).project(camera);
        return { x: (point.x + 1) / 2, y: (1 - point.y) / 2 };
      };
      const rimX = visual.metersPerUnit ? visual.radius : visual.radius * visual.round;
      const nearest = x => samples.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best);
      const leftRim = nearest(-rimX), rightRim = nearest(rimX);
      const floor = samples.filter(point => Math.abs(point.x) <= rimX).reduce((best, point) => point.height < best.height ? point : best);
      const extent = visual.ejectaRadius ?? visual.radius * (1.3 + visual.spread);
      const ejectaStretch = visual.metersPerUnit ? 1 : Math.sqrt(visual.round);
      this.annotationViews ||= {};
      this.annotationViews[cutaway ? 'cutaway' : 'whole'] = {
        viewportHeight: captureHeight,
        baseline: project(0, 0, 0),
        left: project(leftRim.x, leftRim.height, 0), right: project(rightRim.x, rightRim.height, 0),
        floor: project(floor.x, floor.height, 0),
        ejecta: project(extent * Math.SQRT1_2 * ejectaStretch, .28, -extent * Math.SQRT1_2),
        shape: project(visual.radius * visual.round * Math.cos(Math.PI / 6), .15, visual.radius * .5),
        widthMeters: framing.metersPerUnit ? framing.halfWidth * 2 * framing.metersPerUnit : null,
        framing: cutaway ? { ...this.lastCutCamera } : null
      };
      const points = [];
      for (let i = 0; i <= 160; i++) {
        const a = i / 160 * Math.PI * 2;
        const x = Math.cos(a) * extent * ejectaStretch;
        const z = Math.sin(a) * extent;
        if (!cutaway || z <= 0) points.push(new T.Vector3(x, .28, z));
      }
      const boundary = new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineDashedMaterial({ color: framing.outlineColor ?? 0x53c7eb, dashSize: .65, gapSize: .48, transparent: true, opacity: .95, toneMapped: false }));
      boundary.visible = !cutaway; // In a strict front view it collapses onto the neutral ground datum.
      boundary.computeLineDistances(); overlay.add(boundary);
      this.scene.add(overlay);
      const built = performance.now();
      this._renderWithCamera(camera);
      const rendered = performance.now();
      // toBlob snapshots now, but PNG encoding completes off the interaction task.
      const image = warmOnly ? null : new Promise((resolve, reject) => this.renderer.domElement.toBlob(blob => blob ? resolve(blob) : reject(new Error('结果图生成失败')), 'image/png'));
      const queued = performance.now();
      this.scene.remove(overlay);
      overlay.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
      this.material.clippingPlanes = [];
      this.renderer.setSize(width / this.renderer.getPixelRatio(), height / this.renderer.getPixelRatio(), false);
      this._render();
      const restored = performance.now();
      if (warmOnly) return null;
      const blob = await image;
      this.captureTimings ||= [];
      this.captureTimings.push({ cutaway, build: built - started, render: rendered - built, snapshot: queued - rendered, restore: restored - queued, sync: restored - started, total: performance.now() - started });
      if (this.captureTimings.length > 8) this.captureTimings.shift();
      return URL.createObjectURL(blob);
    }

    renderTopView(context, width, height) {
      if (!this.terrainImpacted) return false;
      this.impactGroup.visible = false;
      this.guide.visible = false;
      this._renderWithCamera(this.topCamera);
      context.clearRect(0, 0, width, height);
      context.drawImage(this.renderer.domElement, 0, 0, width, height);
      this._render();
      return true;
    }

    _renderWithCamera(camera) {
      this.renderer.render(this.scene, camera);
    }

    cameraPose() {
      return {
        position: this.camera.position.toArray(),
        quaternion: this.camera.quaternion.toArray()
      };
    }

    dispose() {
      this.disposed = true;
      this.cancel(false, false);
      this.dustVolumeGeometry.dispose();
      [...this.dust, ...this.plume].forEach(puff => puff.material.dispose());
      this.geometry.dispose();
      this.rockNormal?.dispose();
      this.mudNormal?.dispose();
      this.mudRoughness?.dispose();
      this.material.dispose();
      this.meteorGeometry.dispose();
      this.meteorMaterial.map?.dispose();
      this.meteorMaterial.dispose();
      this.terrainCache?.clear();
      this.renderer.dispose();
    }
  }

  window.MeteorScene3D = MeteorScene3D;
})();

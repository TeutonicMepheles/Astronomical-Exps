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
  const sizeScale = { small: 2.05, medium: 2.85, large: 3.85 };
  const sizeRadius = { small: 4.8, medium: 6.8, large: 9.2 };
  const sizeDepth = { small: 2.1, medium: 3.0, large: 4.0 };
  const speedFactor = { low: .84, medium: 1, high: 1.2 };
  const speedSpread = { low: .72, medium: 1, high: 1.3 };

  class MeteorScene3D {
    constructor(canvas) {
      if (!window.THREE) throw new Error('Three.js 未加载');
      this.canvas = canvas;
      this.THREE = window.THREE;
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
      for (let i = 0; i < 260; i++) {
        const x = random() * size;
        const y = random() * size;
        const rx = 18 + random() * 100;
        const ry = 9 + random() * 50;
        lunar.fillStyle = i % 3 === 0 ? 'rgba(139,118,95,.025)' : 'rgba(255,251,237,.045)';
        lunar.beginPath();
        lunar.ellipse(x, y, rx, ry, random() * Math.PI, 0, Math.PI * 2);
        lunar.fill();
      }
      for (let i = 0; i < 10500; i++) {
        const x = random() * size;
        const y = random() * size;
        const radius = .7 + random() * 3.2;
        lunar.fillStyle = i % 4 === 0 ? 'rgba(255,255,246,.2)' : 'rgba(126,107,89,.13)';
        lunar.fillRect(x, y, radius, radius * .7);
      }
      lunar.fillStyle = 'rgba(121,106,90,.16)';
      for (let i = 0; i < 48000; i++) {
        lunar.fillRect(random() * size, random() * size, .5 + random() * 1.5, .5 + random() * 1.2);
      }
      this.lunarTexture = new T.CanvasTexture(lunarCanvas);
      this.lunarTexture.colorSpace = T.SRGBColorSpace;
      this.lunarTexture.anisotropy = 4;
      this.lunarTexture.wrapS = this.lunarTexture.wrapT = T.RepeatWrapping;
      this.lunarTexture.repeat.set(3.2, 3.2);

      const soilCanvas = document.createElement('canvas');
      soilCanvas.width = soilCanvas.height = size;
      const soil = soilCanvas.getContext('2d');
      const soilPixels = soil.createImageData(size, size);
      for (let i = 0; i < size * size; i++) {
        const detail = pixels.data[i * 4] - 238;
        const grain = (random() - .5) * 18;
        soilPixels.data[i * 4] = clamp(137 + detail * 1.7 + grain, 0, 255);
        soilPixels.data[i * 4 + 1] = clamp(99 + detail * 1.25 + grain * .8, 0, 255);
        soilPixels.data[i * 4 + 2] = clamp(65 + detail + grain * .6, 0, 255);
        soilPixels.data[i * 4 + 3] = 255;
      }
      soil.putImageData(soilPixels, 0, 0);
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
      const trailGradient = trail.createLinearGradient(0, 192, 0, 0);
      trailGradient.addColorStop(0, 'rgba(248,224,191,.72)');
      trailGradient.addColorStop(.55, 'rgba(222,190,158,.32)');
      trailGradient.addColorStop(1, 'rgba(160,177,194,0)');
      trail.fillStyle = trailGradient;
      trail.fillRect(0, 0, 64, 192);
      this.trailTexture = new T.CanvasTexture(trailCanvas);
    }

    _buildLights() {
      const T = this.THREE;
      const sun = new T.DirectionalLight(0xfff1e5, 1.35);
      sun.position.set(-38, 28, 18);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 120 });
      sun.shadow.bias = -.00015;
      sun.shadow.normalBias = .06;
      this.scene.add(sun);
      this.scene.add(new T.HemisphereLight(0xb9c8dc, 0x49433d, .65));
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
      const angle = Math.atan2(y, x);
      const cs = Math.cos(angle);
      const sn = Math.sin(angle);
      const warp = this._fbm(cs * 2.3 + seed, sn * 2.3 + seed);
      const rr = radius * (1 + .14 * warp + .025 * Math.sin(angle * 7 + seed));
      const u = Math.hypot(x, y) / rr;
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

    _visualParams(params) {
      // Presentation dimensions only; no physical units or calibrated prediction.
      const atmosphere = params.scene === 'earth' ? .78 : 1;
      const radius = sizeRadius[params.size] * speedFactor[params.speed] * atmosphere;
      const depth = sizeDepth[params.size] * (params.speed === 'high' ? 1.42 : params.speed === 'low' ? .65 : 1) * atmosphere;
      const strain = Number(params.angle);
      return {
        radius,
        depth,
        round: strain === 90 ? 1 : strain === 45 ? 1.08 : 1.65,
        spread: speedSpread[params.speed] * (params.size === 'large' ? 1.18 : params.size === 'small' ? .82 : 1),
        seed: 29
      };
    }

    _terrainKey(impacted, params = { ...this.params, scene: this.sceneMode }) {
      return JSON.stringify(impacted ? [params.scene, params.size, params.speed, params.angle] : [params.scene, 'flat']);
    }

    *_terrainSteps(impacted, params = { ...this.params, scene: this.sceneMode }) {
      const T = this.THREE;
      this.terrainCache ||= new Map();
      const key = this._terrainKey(impacted, params);
      if (this.terrainCache.has(key)) return this.terrainCache.get(key);
      // Work in separate CPU arrays. The visible mesh remains intact until ready.
      const geometry = new T.BufferGeometry();
      geometry.setIndex(this.geometry.index);
      const position = new T.BufferAttribute(this.geometry.attributes.position.array.slice(), 3);
      const colors = new T.BufferAttribute(new Float32Array(position.count * 3), 3);
      geometry.setAttribute('position', position); geometry.setAttribute('color', colors);
      const visual = this._visualParams(params);
      const fieldColor = new T.Color(params.scene === 'earth' ? 0xa78c71 : 0x969ba1);
      const floorColor = new T.Color(params.scene === 'earth' ? 0x9f7654 : 0x9a9287);
      const outerColor = new T.Color(params.scene === 'earth' ? 0x927459 : 0xb8aa95);
      const wallColor = new T.Color(params.scene === 'earth' ? 0x5f4633 : 0x77736e);
      const rimColor = new T.Color(params.scene === 'earth' ? 0xb29a7b : 0xb4b8bb);
      const color = new T.Color();
      const backgroundCraters = impacted ? Array.from({ length: 4 }, (_, i) => {
        const angle = hash(i + visual.seed, 1.7) * Math.PI * 2;
        const distance = visual.radius + 9 + hash(i + visual.seed, 9.3) * 18;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          radius: 1.4 + Math.pow(hash(i + visual.seed, 7.7), 2) * 3.4
        };
      }) : [];

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        let height = .43 * this._fbm(x * .16 + visual.seed, y * .16) + .11 * this._fbm(x * .85, y * .85);
        if (impacted) {
          height += this._crater(x / visual.round, y, visual.radius, visual.depth, visual.seed, false, .82);
          const distance = Math.hypot(x / visual.round, y) / visual.radius;
          const bearing = Math.atan2(y, x);
          const ray = Math.pow(Math.max(0, Math.cos(bearing * 19 + .8)), 12);
          height += .12 * ray * smooth(1.1, 1.3, distance) * (1 - smooth(1.3, 1.3 + visual.spread, distance));
          for (const background of backgroundCraters) {
            height += this._crater(x - background.x, y - background.y, background.radius, background.radius * .23, visual.seed, false, .45);
          }
        }
        position.setZ(i, height);
        const angle = Math.atan2(y, x / visual.round);
        const rr = visual.radius * (1 + .14 * this._fbm(Math.cos(angle) * 2.3 + visual.seed, Math.sin(angle) * 2.3 + visual.seed) + .025 * Math.sin(angle * 7 + visual.seed));
        const d = impacted ? (Math.hypot(x / visual.round, y) / rr - 1) * 100 : 100;
        const floorTint = 1 - smooth(-68, -38, d);
        const wallTint = smooth(-78, -48, d) * (1 - smooth(-7, 5, d));
        const outerTint = smooth(9, 25, d) * (1 - smooth(40, 62, d));
        const rimTint = Math.exp(-Math.pow(d / 15, 2)) * .9;
        color.copy(fieldColor).lerp(floorColor, floorTint).lerp(outerColor, outerTint * .48)
          .lerp(wallColor, wallTint).lerp(rimColor, rimTint);
        color.multiplyScalar(.96 + .06 * this._noise(x * .075 + 12, y * .075 - 7));
        if (impacted) {
          const radial = Math.hypot(x / visual.round, y) / visual.radius;
          const rays = Math.pow(Math.max(0, Math.cos(angle * 19 + .8)), 12);
          const ejecta = rays * smooth(1.1, 1.3, radial) * (1 - smooth(1.3, 1.3 + visual.spread, radial));
          color.lerp(rimColor, ejecta * .65);
        }
        colors.setXYZ(i, color.r, color.g, color.b);
        if (i % 128 === 127) yield;
      }
      geometry.computeVertexNormals();
      const data = Object.fromEntries(['position','color','normal'].map(name => [name, geometry.attributes[name].array]));
      geometry.dispose();
      this.terrainCache.set(key, data);
      if (this.terrainCache.size > 4) {
        // Keep both flat scenes ready for every reset and environment switch.
        const oldestImpact = [...this.terrainCache.keys()].find(item => !item.endsWith('"flat"]'));
        this.terrainCache.delete(oldestImpact);
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
      this.terrainImpacted = impacted;
      this.geometry.computeBoundingSphere();
      if (render) this._render();
    }

    _prepareImpact(token) {
      return this._prepareTerrain(true, { ...this.params, scene: this.sceneMode }, token);
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
      this.meteorGeometry = new T.IcosahedronGeometry(1, 3);
      const positions = this.meteorGeometry.attributes.position;
      const colors = [];
      const dark = new T.Color(0x252d49);
      const light = new T.Color(0xa3adc1);
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const ridge = Math.sin(x * 13 + y * 7) * Math.cos(z * 11 - y * 5);
        const grain = Math.sin(x * 37 + z * 23) * Math.sin(y * 29 - z * 17);
        const radius = 1 + ridge * .115 + grain * .045;
        positions.setXYZ(i, x * radius, y * radius, z * radius);
        const tint = clamp(.52 + ridge * .3 + grain * .19, 0, 1);
        const color = dark.clone().lerp(light, tint);
        colors.push(color.r, color.g, color.b);
      }
      this.meteorGeometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      this.meteorGeometry.computeVertexNormals();
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = textureCanvas.height = 256;
      const textureContext = textureCanvas.getContext('2d');
      textureContext.fillStyle = '#ced3df';
      textureContext.fillRect(0, 0, 256, 256);
      let seed = 0x5141a7;
      const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 7000; i++) {
        const shade = Math.floor(55 + random() * 150);
        textureContext.fillStyle = `rgba(${Math.floor(shade * .86)},${Math.floor(shade * .92)},${shade},${.08 + random() * .32})`;
        textureContext.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 3);
      }
      const texture = new T.CanvasTexture(textureCanvas);
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.colorSpace = T.SRGBColorSpace;
      this.meteorMaterial = new T.MeshStandardMaterial({
        map: texture,
        bumpMap: texture,
        bumpScale: .14,
        vertexColors: true,
        roughness: .94,
        metalness: .06,
        flatShading: true
      });
      this.meteor = new T.Mesh(this.meteorGeometry, this.meteorMaterial);
      this.meteor.castShadow = true;
      this.impactGroup.add(this.meteor);
    }

    _buildImpactEffects() {
      const T = this.THREE;
      this.trails = [];
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
      this.dust = [];
      for (let i = 0; i < 64; i++) {
        const sprite = new T.Sprite(new T.SpriteMaterial({
          map: this.dustTexture,
          color: i % 3 === 0 ? 0xcabba6 : 0xeee5d6,
          transparent: true,
          depthWrite: false,
          opacity: 0
        }));
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
      for (let i = 0; i < 20; i++) {
        const sprite = new T.Sprite(new T.SpriteMaterial({
          map: this.dustTexture,
          color: 0xf1e8d9,
          transparent: true,
          depthWrite: false,
          opacity: 0
        }));
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
        color: 0xe4d4ba,
        size: .12,
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
          color: 0xbda98f,
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

    _startForAngle(angle) {
      if (angle === '90') return new this.THREE.Vector3(0, 13, -5);
      if (angle === '45') return new this.THREE.Vector3(-18, 12, -9);
      return new this.THREE.Vector3(-26, 9, -7);
    }

    _groundPoint() {
      return new this.THREE.Vector3(0, .8, 0);
    }

    _render() {
      if (!this.renderer || !this.canvas.clientWidth || !this.canvas.clientHeight) return;
      this.renderer.render(this.scene, this.camera);
    }

    resize() {
      const width = this.canvas.clientWidth || 1150;
      const height = this.canvas.clientHeight || 740;
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
      this.material.needsUpdate = true;
      if (changed || this.terrainImpacted) this._rebuildTerrain(false, false);
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
      this.meteor.rotation.set(.2, .4, -.3);
      this.entryGlow.visible = false;
      this.flash.material.opacity = 0;
      this.shock.material.opacity = 0;
      this.dust.forEach(sprite => { sprite.material.opacity = 0; });
      this.plume.forEach(sprite => { sprite.material.opacity = 0; });
      this.debris.forEach(item => { item.visible = false; });
      this.trails.forEach(sprite => { sprite.visible = false; });
      this.guide.geometry.dispose();
      this.guide.geometry = new this.THREE.BufferGeometry().setFromPoints([start, end]);
      this.guide.computeLineDistances();
      this.guide.visible = true;
      this.targetRing.visible = true;
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
      const start = this._startForAngle(params.angle);
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
      const prepared = this._prepareImpact(this.preparationToken);
      const activeToken = this.preparationToken;
      const reduced = Boolean(options.reduced);
      if (reduced) {
        this.motion = { start: performance.now(), reduced: true, startPoint: start, endPoint: end, duration: 3.7, visual: this._visualParams(params) };
        prepared.then(ready => { if (ready && activeToken === this.preparationToken && this.motion) this._finishMotion(); });
        return;
      }
      this.motion = {
        start: options.startTime || performance.now(),
        reduced: false,
        startPoint: start,
        endPoint: end,
        duration: 3.7,
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
      this.debris.forEach(item => { item.visible = false; });
    }

    _setPhase(phase) {
      if (phase === this.lastPhase) return;
      this.lastPhase = phase;
      this.onPhase?.(phase);
    }

    _updateMotion(elapsed) {
      if (!this.motion) return;
      const fallEnd = 1.12;
      const contactEnd = 1.43;
      const duration = this.motion.duration;
      if (elapsed < fallEnd) {
        this._setPhase('fall');
        const progress = elapsed / fallEnd;
        this.meteor.visible = true;
        this.meteor.position.copy(this.motion.startPoint).lerp(this.motion.endPoint, progress * progress);
        this.meteor.rotation.set(elapsed * 1.8, elapsed * 2.4, elapsed * .9);
        const earth = this.sceneMode === 'earth';
        this.entryGlow.visible = earth;
        this.entryGlow.material.opacity = earth ? .5 : 0;
        this.entryGlow.scale.setScalar(sizeScale[this.params.size] * 2.5);
        this.entryGlow.position.copy(this.meteor.position);
        this.entryLight.intensity = earth ? 3.2 : 0;
        this.entryLight.position.copy(this.meteor.position);
        this.trails.forEach((sprite, index) => {
          const previous = clamp(progress - index * .022, 0, 1);
          sprite.visible = earth && previous > 0;
          sprite.position.copy(this.motion.startPoint).lerp(this.motion.endPoint, previous * previous);
          sprite.position.x += Math.sin(index * 1.7 + elapsed * 3) * (.06 + index * .02);
          sprite.material.opacity = earth ? .48 * Math.pow(1 - index / this.trails.length, .8) : 0;
          sprite.scale.set(.28 + index * .012, 1.7 + index * .035, 1);
        });
      } else {
        this.meteor.visible = false;
        this.entryGlow.visible = false;
        this.trails.forEach(sprite => { sprite.visible = false; });
        this.entryLight.intensity = 0;
        const local = clamp((elapsed - fallEnd) / .42, 0, 1);
        this.flash.material.opacity = Math.max(0, 1 - local) * .88;
        this.flash.scale.setScalar(2.2 + local * 8.5);
        this.shock.material.opacity = elapsed < contactEnd ? (1 - local) * .38 : 0;
        this.shock.scale.setScalar(1 + local * 15 * this.motion.visual.spread);
        if (elapsed < contactEnd) this._setPhase('contact');
      }

      if (elapsed >= fallEnd) {
        const dustProgress = clamp((elapsed - fallEnd) / (duration - fallEnd), 0, 1);
        if (elapsed >= contactEnd) this._setPhase(dustProgress > .86 ? 'result' : 'dust');
        const fade = dustProgress < .7 ? 1 : 1 - smooth(.7, 1, dustProgress);
        const expansion = smooth(0, .16, dustProgress);
        const extent = this.motion.visual.radius;
        this.dust.forEach((sprite, index) => {
          const data = sprite.userData;
          const local = clamp((dustProgress - data.delay) / (1 - data.delay), 0, 1);
          const distance = extent * data.distance * (1 + local * .7) * this.motion.visual.spread;
          sprite.position.set(
            Math.cos(data.angle) * distance * this.motion.visual.round,
            .3 + data.lift * local,
            Math.sin(data.angle) * distance
          );
          sprite.scale.setScalar(extent * data.size * (.5 + local * 1.4));
          sprite.material.color.setHex(index % 4 === 0 ? 0xb8a995 : this.sceneMode === 'moon' ? 0xe9e2d6 : 0xf0dfca);
          sprite.material.opacity = expansion * fade * (.3 + (index % 5) * .06);
        });
        this.plume.forEach((sprite, index) => {
          const data = sprite.userData;
          sprite.position.set(
            Math.cos(data.angle) * extent * .16 * this.motion.visual.round,
            .2 + data.height * extent * dustProgress * .48,
            Math.sin(data.angle) * extent * .16
          );
          sprite.scale.setScalar(extent * data.size * (1 + dustProgress * 1.5));
          sprite.material.opacity = expansion * fade * .19;
        });
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
        this.sand.material.opacity = fade * .72;
        this.debris.forEach((item, index) => {
          const data = item.userData;
          const local = clamp((age - .1) / 1.7, 0, 1);
          item.visible = dustProgress < .94;
          const distance = extent * data.speed * local * this.motion.visual.spread * 1.2;
          item.position.set(
            Math.cos(data.angle) * distance * this.motion.visual.round,
            Math.max(.16, Math.sin(Math.PI * local) * data.lift * 2.1),
            Math.sin(data.angle) * distance
          );
          item.scale.setScalar((.08 + (index % 4) * .035) * (1 - smooth(.82, 1, local)));
          item.rotation.set(local * data.rotation * 5, local * data.rotation * 3, data.angle);
        });
        if (dustProgress > .32 && !this.terrainImpacted && this.terrainCache.has(this._terrainKey(true))) this._rebuildTerrain(true);
      }
      this._render();
      if (elapsed >= duration && this.terrainCache.has(this._terrainKey(true))) this._finishMotion();
    }

    _finishMotion() {
      if (!this.motion) return;
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
      if (!this.terrainImpacted) this._rebuildTerrain(true);
      this._setPhase('result');
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
      const extent = Math.max(...combos.map(combo => { const visual = this._visualParams(combo); return visual.radius * visual.round; }));
      return { halfWidth: Math.ceil((extent * 1.18 + 3) * 2) / 2, centerY: -3 };
    }

    stats() {
      const gl = this.renderer.getContext();
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return { active: Boolean(this.motion), geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures, terrainCacheEntries: this.terrainCache?.size || 0, captures: this.captureTimings || [], cutCamera: this.lastCutCamera || null, gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
    }

    async warmCapture() {
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

    async captureResult(cutaway = false, warmOnly = false, framing = { halfWidth: 14, centerY: -3 }) {
      const started = performance.now();
      const width = this.renderer.domElement.width;
      const height = this.renderer.domElement.height;
      const camera = new this.THREE.OrthographicCamera(-23.5, 23.5, 20.5625, -20.5625, .1, 500);
      camera.position.copy(this.camera.position); camera.quaternion.copy(this.camera.quaternion);
      if (cutaway) {
        const halfHeight = framing.halfWidth * 700 / 800;
        camera.left = -framing.halfWidth; camera.right = framing.halfWidth;
        camera.top = halfHeight; camera.bottom = -halfHeight;
        camera.updateProjectionMatrix();
        // The cut face is z=0. View exactly along its normal, with no pitch or yaw.
        camera.position.set(0, framing.centerY, 44); camera.lookAt(0, framing.centerY, 0);
        this.lastCutCamera = {
          position: camera.position.toArray(),
          direction: camera.getWorldDirection(new this.THREE.Vector3()).toArray(),
          frustum: [camera.left, camera.right, camera.top, camera.bottom],
          aspect: 800 / 700
        };
      }
      this.renderer.setSize(800, 700, false);
      const T = this.THREE;
      const overlay = new T.Group();
      const samples = this.sectionSamples();
      if (cutaway) {
        this.material.clippingPlanes = [new T.Plane(new T.Vector3(0, 0, -1), 0), new T.Plane(new T.Vector3(0, 0, 1), 20), new T.Plane(new T.Vector3(-1, 0, 0), 25.833333), new T.Plane(new T.Vector3(1, 0, 0), 25.833333)];
        // Close the clipped terrain with a real vertical face whose top vertices
        // are the very same centre-row vertices as the rendered surface.
        const vertices = [], indices = [];
        samples.forEach((point, i) => {
          vertices.push(point.x, point.height, 0, point.x, -9, 0);
          if (i < samples.length - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        });
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices); geometry.computeVertexNormals();
        const material = new T.MeshStandardMaterial({ color: this.sceneMode === 'earth' ? 0x8c6a49 : 0x77828d, roughness: 1, side: T.DoubleSide });
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
            sideVertices.push(position.getX(index), position.getZ(index), -position.getY(index), position.getX(index), -9, -position.getY(index));
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
      const rimX = visual.radius * visual.round;
      const nearest = x => samples.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best);
      const leftRim = nearest(-rimX), rightRim = nearest(rimX);
      const floor = samples.filter(point => Math.abs(point.x) <= rimX).reduce((best, point) => point.height < best.height ? point : best);
      const extent = visual.radius * (1.3 + visual.spread);
      this.annotationViews ||= {};
      this.annotationViews[cutaway ? 'cutaway' : 'whole'] = {
        baseline: project(0, 0, 0),
        left: project(leftRim.x, leftRim.height, 0), right: project(rightRim.x, rightRim.height, 0),
        floor: project(floor.x, floor.height, 0),
        ejecta: project(extent * Math.SQRT1_2 * Math.sqrt(visual.round), .28, -extent * Math.SQRT1_2),
        shape: project(visual.radius * visual.round * Math.cos(Math.PI / 6), .15, visual.radius * .5),
        framing: cutaway ? { ...this.lastCutCamera } : null
      };
      const points = [];
      for (let i = 0; i <= 160; i++) {
        const a = i / 160 * Math.PI * 2;
        const x = Math.cos(a) * extent * Math.sqrt(visual.round);
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
      this.cancel(false, false);
      this.geometry.dispose();
      this.material.dispose();
      this.meteorGeometry.dispose();
      this.meteorMaterial.dispose();
      this.terrainCache?.clear();
      this.renderer.dispose();
    }
  }

  window.MeteorScene3D = MeteorScene3D;
})();

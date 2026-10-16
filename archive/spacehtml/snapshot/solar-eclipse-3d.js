(() => {
  "use strict";

  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;
  const R_SUN = 696340;
  const R_MOON = 1737.4;
  const R_EARTH = 6371.0;
  const EARTH_AREA = 4 * Math.PI * R_EARTH * R_EARTH;
  const MAP_W = 960;
  const MAP_H = 480;

  const defaults = Object.freeze({
    sunDistance: 149600000,
    moonDistance: 363300,
    moonPhase: 0,
    lunarInclination: 5.145,
    nodeLongitude: 0,
    timeScale: 3,
    animateMoon: false,
    rotateEarth: false,
    showObserver: true,
    showEcliptic: true,
    showOrbit: true,
    solarLongitude: 120,
    solarLatitude: 15,
    view: "system"
  });

  const presets = {
    total: { sunDistance: 152100000, moonDistance: 356800, moonPhase: 0, lunarInclination: 5.145, nodeLongitude: 0 },
    annular: { sunDistance: 147100000, moonDistance: 406500, moonPhase: 0, lunarInclination: 5.145, nodeLongitude: 0 },
    partial: { sunDistance: 149600000, moonDistance: 384400, moonPhase: 1.08, lunarInclination: 5.145, nodeLongitude: 0 },
    lunar: { sunDistance: 149600000, moonDistance: 384400, moonPhase: 180, lunarInclination: 5.145, nodeLongitude: 180 },
    miss: { sunDistance: 149600000, moonDistance: 384400, moonPhase: 4.2, lunarInclination: 5.145, nodeLongitude: 90 }
  };

  const state = { ...defaults };
  const $ = id => document.getElementById(id);
  const controls = ["sunDistance", "moonDistance", "moonPhase", "lunarInclination", "nodeLongitude", "timeScale", "solarLongitude", "solarLatitude"];
  const offscreen = document.createElement("canvas");
  offscreen.width = MAP_W;
  offscreen.height = MAP_H;
  const offCtx = offscreen.getContext("2d", { alpha: false });
  const mapCanvas = $("footprintCanvas");
  const mapCtx = mapCanvas.getContext("2d", { alpha: false });
  const observerCanvas = $("observerCanvas");
  const observerCtx = observerCanvas.getContext("2d", { alpha: false });
  let geometry = null;
  let bestPoint = null;
  let mapTimer = 0;
  let toastTimer = 0;
  let lastSimulationRefresh = 0;
  let lastMetricRefresh = 0;
  let lastMapRefresh = 0;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, scalar) { return [a[0] * scalar, a[1] * scalar, a[2] * scalar]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function length(a) { return Math.hypot(a[0], a[1], a[2]); }
  function normalize(a) { const n = length(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; }
  function rotateAroundAxis(vector, axis, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return add(add(mul(vector, c), mul(cross(axis, vector), s)), mul(axis, dot(axis, vector) * (1 - c)));
  }
  function formatKm(value, digits = 0) {
    return `${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits })} km`;
  }
  function formatDeg(value, digits = 1) {
    const hemi = value < 0 ? "−" : "";
    return `${hemi}${Math.abs(value).toFixed(digits)}°`;
  }
  function formatArcAngle(radians) {
    const totalMinutes = Math.abs(radians * DEG) * 60;
    const degrees = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes - degrees * 60;
    return `${degrees}° ${minutes.toFixed(2)}′`;
  }
  function formatAltAz(direction, up, north, east) {
    const altitude = Math.asin(clamp(dot(direction, up), -1, 1)) * DEG;
    let azimuth = Math.atan2(dot(direction, east), dot(direction, north)) * DEG;
    if (azimuth < 0) azimuth += 360;
    return `高度 ${altitude.toFixed(2)}° · 方位 ${azimuth.toFixed(2)}°`;
  }
  function formatArea(value) {
    if (value < 1) return "< 1 km²";
    return `${Math.round(value).toLocaleString("zh-CN")} km²`;
  }

  function basisFromSubsolar(latDeg, lonDeg) {
    const lat = latDeg * RAD;
    const lon = lonDeg * RAD;
    const cosLat = Math.cos(lat);
    const radial = [cosLat * Math.cos(lon), Math.sin(lat), cosLat * Math.sin(lon)];
    const east = [-Math.sin(lon), 0, Math.cos(lon)];
    const north = [-Math.sin(lat) * Math.cos(lon), Math.cos(lat), -Math.sin(lat) * Math.sin(lon)];
    return { radial, east, north };
  }

  function computeGeometry(source = state) {
    const basis = basisFromSubsolar(source.solarLatitude, source.solarLongitude);
    const S = mul(basis.radial, source.sunDistance);
    const phase = source.moonPhase * RAD;
    const node = source.nodeLongitude * RAD;
    const inclination = source.lunarInclination * RAD;
    const orbitVector = add(mul(basis.radial, Math.cos(phase)), mul(basis.east, Math.sin(phase)));
    const nodeAxis = normalize(add(mul(basis.radial, Math.cos(node)), mul(basis.east, Math.sin(node))));
    const moonDirection = normalize(rotateAroundAxis(orbitVector, nodeAxis, inclination));
    const M = mul(moonDirection, source.moonDistance);
    const solarSide = dot(M, basis.radial) >= 0;
    const kind = solarSide ? "solar" : "lunar";
    const shadowOrigin = solarSide ? M : [0, 0, 0];
    const targetCenter = solarSide ? [0, 0, 0] : M;
    const occluderRadius = solarSide ? R_MOON : R_EARTH;
    const targetRadius = solarSide ? R_EARTH : R_MOON;
    const sunOccluder = sub(shadowOrigin, S);
    const dSO = length(sunOccluder);
    const u = normalize(sunOccluder);
    const toTarget = sub(targetCenter, shadowOrigin);
    const x = dot(toTarget, u);
    const closest = add(shadowOrigin, mul(u, x));
    const b = length(sub(targetCenter, closest));
    const alphaU = Math.asin((R_SUN - occluderRadius) / dSO);
    const alphaP = Math.asin((R_SUN + occluderRadius) / dSO);
    const umbraLength = occluderRadius / Math.sin(alphaU);
    const penumbraVertex = occluderRadius / Math.sin(alphaP);
    const rUmbra = (umbraLength - x) * Math.tan(alphaU);
    const rPenumbra = (penumbraVertex + x) * Math.tan(alphaP);
    return { ...basis, S, M, moonDirection, orbitVector, nodeAxis, kind, shadowOrigin, targetCenter, occluderRadius, targetRadius, dSM: length(sub(M, S)), dSO, u, x, b, closest, alphaU, alphaP, umbraLength, penumbraVertex, rUmbra, rPenumbra };
  }

  function discOverlap(rSun, rMoon, separation) {
    if (separation >= rSun + rMoon) return 0;
    if (separation <= Math.abs(rSun - rMoon)) {
      const smaller = Math.min(rSun, rMoon);
      return Math.min(1, (smaller * smaller) / (rSun * rSun));
    }
    const d = Math.max(separation, 1e-15);
    const a1 = Math.acos(clamp((d * d + rSun * rSun - rMoon * rMoon) / (2 * d * rSun), -1, 1));
    const a2 = Math.acos(clamp((d * d + rMoon * rMoon - rSun * rSun) / (2 * d * rMoon), -1, 1));
    const radical = Math.max(0, (-d + rSun + rMoon) * (d + rSun - rMoon) * (d - rSun + rMoon) * (d + rSun + rMoon));
    const overlap = rSun * rSun * a1 + rMoon * rMoon * a2 - 0.5 * Math.sqrt(radical);
    return clamp(overlap / (Math.PI * rSun * rSun), 0, 1);
  }

  function evaluateNormal(nx, ny, nz, g = geometry) {
    const px = nx * R_EARTH;
    const py = ny * R_EARTH;
    const pz = nz * R_EARTH;
    const sx = g.S[0] - px;
    const sy = g.S[1] - py;
    const sz = g.S[2] - pz;
    const mx = g.M[0] - px;
    const my = g.M[1] - py;
    const mz = g.M[2] - pz;
    const ds = Math.hypot(sx, sy, sz);
    const dm = Math.hypot(mx, my, mz);
    const sunAltitudeSine = (nx * sx + ny * sy + nz * sz) / ds;
    if (sunAltitudeSine <= 0) return { type: 0, obscuration: 0, delta: Math.PI, aSun: 0, aMoon: 0 };
    const aSun = Math.asin(R_SUN / ds);
    const aMoon = Math.asin(R_MOON / dm);
    const cosine = clamp((sx * mx + sy * my + sz * mz) / (ds * dm), -1, 1);
    const delta = Math.acos(cosine);
    let type = 0;
    if (delta <= aSun + aMoon) {
      if (delta <= Math.abs(aMoon - aSun)) type = aMoon >= aSun ? 2 : 3;
      else type = 1;
    }
    return { type, obscuration: type ? discOverlap(aSun, aMoon, delta) : 0, delta, aSun, aMoon };
  }

  function evaluateLatLon(latDeg, lonDeg, g = geometry) {
    const lat = latDeg * RAD;
    const lon = lonDeg * RAD;
    const c = Math.cos(lat);
    return evaluateNormal(c * Math.cos(lon), Math.sin(lat), c * Math.sin(lon), g);
  }

  function findMaximum(g = geometry) {
    let best = { obscuration: -1, lat: 0, lon: 0, type: 0 };
    for (let lat = -87.5; lat <= 87.5; lat += 5) {
      const latR = lat * RAD;
      const c = Math.cos(latR);
      const ny = Math.sin(latR);
      for (let lon = -177.5; lon <= 177.5; lon += 5) {
        const lonR = lon * RAD;
        const result = evaluateNormal(c * Math.cos(lonR), ny, c * Math.sin(lonR), g);
        if (result.obscuration > best.obscuration) best = { ...result, lat, lon };
      }
    }
    let step = 2.5;
    while (step > 0.0005) {
      let improved = false;
      for (const dLat of [-step, 0, step]) {
        for (const dLon of [-step, 0, step]) {
          if (!dLat && !dLon) continue;
          const lat = clamp(best.lat + dLat, -89.9999, 89.9999);
          let lon = best.lon + dLon;
          if (lon > 180) lon -= 360;
          if (lon < -180) lon += 360;
          const result = evaluateLatLon(lat, lon, g);
          if (result.obscuration > best.obscuration + 1e-12) {
            best = { ...result, lat, lon };
            improved = true;
          }
        }
      }
      if (!improved) step *= 0.5;
    }
    return best;
  }

  function typeName(type) {
    return ["无日食", "日偏食", "日全食", "日环食"][type] || "无日食";
  }

  function classifyLunar(g = geometry) {
    if (g.kind !== "lunar" || g.x <= 0) return { code: 0, name: "无月食", coverage: 0 };
    const umbraRadius = Math.max(0, g.rUmbra);
    if (g.b + R_MOON <= umbraRadius) {
      return { code: 3, name: "月全食", coverage: 1 };
    }
    if (g.b < umbraRadius + R_MOON) {
      return { code: 2, name: "月偏食", coverage: discOverlap(R_MOON, umbraRadius, g.b) };
    }
    if (g.b < g.rPenumbra + R_MOON) {
      return { code: 1, name: "半影月食", coverage: 0 };
    }
    return { code: 0, name: "无月食", coverage: 0 };
  }

  function phaseName(degrees) {
    const d = ((degrees % 360) + 360) % 360;
    if (d < 11.25 || d >= 348.75) return "新月";
    if (d < 78.75) return "娥眉月";
    if (d < 101.25) return "上弦月";
    if (d < 168.75) return "盈凸月";
    if (d < 191.25) return "满月";
    if (d < 258.75) return "亏凸月";
    if (d < 281.25) return "下弦月";
    return "残月";
  }

  function updateReadouts() {
    $("sunDistanceValue").textContent = formatKm(state.sunDistance);
    $("moonDistanceValue").textContent = formatKm(state.moonDistance);
    $("moonPhaseValue").textContent = `${state.moonPhase.toFixed(2)}° · ${phaseName(state.moonPhase)}`;
    $("lunarInclinationValue").textContent = `${state.lunarInclination.toFixed(3)}°`;
    $("nodeLongitudeValue").textContent = `${state.nodeLongitude.toFixed(1)}°${Math.min(state.nodeLongitude % 180, 180 - state.nodeLongitude % 180) < 1 ? " · 食季中心" : ""}`;
    $("timeScaleValue").textContent = `${state.timeScale.toFixed(1)}° / 秒`;
    $("solarLongitudeValue").textContent = formatDeg(state.solarLongitude);
    $("solarLatitudeValue").textContent = formatDeg(state.solarLatitude);
    $("playButton").classList.toggle("playing", state.animateMoon);
    $("playButton").setAttribute("aria-pressed", String(state.animateMoon));
    $("playButton").querySelector("span").textContent = state.animateMoon ? "暂停月球公转" : "播放月球公转";
  }

  function updateMetrics() {
    const eventBadge = $("eventBadge");
    eventBadge.textContent = geometry.kind === "solar" ? "日食侧 · 月球朝日半周" : "月食侧 · 月球背日半周";
    eventBadge.className = `event-badge ${geometry.kind}`;
    if (geometry.kind === "lunar") {
      const lunar = classifyLunar(geometry);
      bestPoint = null;
      $("eclipseType").textContent = lunar.name;
      $("eclipseNote").textContent = lunar.code === 3 ? "月球完全进入地球本影" : lunar.code === 2 ? "地球本影仅覆盖部分月面" : lunar.code === 1 ? "月球只穿过地球半影" : "月球未进入地球影区";
      $("umbraMetricLabel").textContent = "月球截面本影";
      $("penumbraMetricLabel").textContent = "月球截面半影";
      $("umbraRadius").textContent = formatKm(Math.max(0, geometry.rUmbra), 1);
      $("umbraDetail").textContent = `地球本影锥长 ${formatKm(geometry.umbraLength)}`;
      $("penumbraRadius").textContent = formatKm(geometry.rPenumbra, 1);
      $("axisOffset").textContent = `月心距影轴 ${formatKm(geometry.b, 1)}`;
      $("maxObscuration").textContent = lunar.code === 1 ? "仅半影" : `${(lunar.coverage * 100).toFixed(3)}%`;
      $("maxLocation").textContent = `月面本影覆盖 · 月地距离 ${formatKm(state.moonDistance)}`;
      $("mapEyebrow").textContent = "LUNAR ECLIPSE VISIBILITY";
      $("mapTitle").textContent = "月食地面可见范围";
      return;
    }
    bestPoint = findMaximum(geometry);
    const type = bestPoint.obscuration > 1e-8 ? bestPoint.type : 0;
    $("eclipseType").textContent = typeName(type);
    const notes = {
      0: "月球视圆未与地表可见太阳视圆相交",
      1: "仅半影与地球相交",
      2: "月球视直径大于太阳，存在本影",
      3: "本影尖端在地球前方，地球进入反本影"
    };
    $("eclipseNote").textContent = notes[type];
    $("umbraMetricLabel").textContent = "地心截面本影";
    $("penumbraMetricLabel").textContent = "地心截面半影";
    $("mapEyebrow").textContent = "EXACT SURFACE SOLUTION";
    $("mapTitle").textContent = "地表影区投影";
    if (geometry.rUmbra >= 0) {
      $("umbraRadius").textContent = formatKm(geometry.rUmbra, 1);
      $("umbraDetail").textContent = `本影锥长 ${formatKm(geometry.umbraLength)}`;
    } else {
      $("umbraRadius").textContent = `${formatKm(-geometry.rUmbra, 1)} 反本影`;
      $("umbraDetail").textContent = `锥尖已越过 ${formatKm(geometry.x - geometry.umbraLength)}`;
    }
    $("penumbraRadius").textContent = formatKm(geometry.rPenumbra, 1);
    $("axisOffset").textContent = `影轴距地心 ${formatKm(geometry.b, 1)}`;
    $("maxObscuration").textContent = `${(bestPoint.obscuration * 100).toFixed(3)}%`;
    $("maxLocation").textContent = type ? `${formatDeg(bestPoint.lat, 3)} 纬度 · ${formatDeg(bestPoint.lon, 3)} 经度` : "地表无可见交叠";
  }

  function mixColor(base, overlay, alpha) {
    return [
      Math.round(base[0] * (1 - alpha) + overlay[0] * alpha),
      Math.round(base[1] * (1 - alpha) + overlay[1] * alpha),
      Math.round(base[2] * (1 - alpha) + overlay[2] * alpha)
    ];
  }

  function renderFootprint() {
    $("mapBusy").classList.add("show");
    const g = geometry;
    const image = offCtx.createImageData(MAP_W, MAP_H);
    const data = image.data;
    const weights = [0, 0, 0, 0];
    let totalWeight = 0;
    let index = 0;
    for (let y = 0; y < MAP_H; y++) {
      const lat = Math.PI / 2 - (y + 0.5) / MAP_H * Math.PI;
      const cLat = Math.cos(lat);
      const ny = Math.sin(lat);
      for (let x = 0; x < MAP_W; x++) {
        const lon = -Math.PI + (x + 0.5) / MAP_W * Math.PI * 2;
        const nx = cLat * Math.cos(lon);
        const nz = cLat * Math.sin(lon);
        let result;
        if (g.kind === "lunar") {
          const px = nx * R_EARTH;
          const py = ny * R_EARTH;
          const pz = nz * R_EARTH;
          const mx = g.M[0] - px;
          const my = g.M[1] - py;
          const mz = g.M[2] - pz;
          const dm = Math.hypot(mx, my, mz);
          const visible = (nx * mx + ny * my + nz * mz) / dm > 0;
          result = { type: visible ? 1 : 0, obscuration: visible ? 1 : 0 };
        } else {
          result = evaluateNormal(nx, ny, nz, g);
        }
        const daylight = clamp(dot([nx, ny, nz], g.radial), 0, 1);
        const texture = 2.5 * Math.sin(lon * 7 + lat * 4) + 1.5 * Math.sin(lon * 19 - lat * 11);
        let color = [8 + daylight * 15 + texture, 22 + daylight * 32 + texture, 34 + daylight * 47 + texture];
        if (g.kind === "lunar" && result.type === 1) color = mixColor(color, [132, 111, 214], .72);
        if (g.kind === "solar" && result.type === 1) color = mixColor(color, [248, 184, 76], .76);
        if (g.kind === "solar" && result.type === 2) color = mixColor(color, [238, 70, 86], .92);
        if (g.kind === "solar" && result.type === 3) color = mixColor(color, [158, 111, 255], .9);
        data[index++] = clamp(color[0], 0, 255);
        data[index++] = clamp(color[1], 0, 255);
        data[index++] = clamp(color[2], 0, 255);
        data[index++] = 255;
        weights[result.type] += cLat;
        totalWeight += cLat;
      }
    }
    offCtx.putImageData(image, 0, 0);
    drawGraticule(offCtx, MAP_W, MAP_H, false);
    mapCtx.clearRect(0, 0, MAP_W, MAP_H);
    mapCtx.drawImage(offscreen, 0, 0);
    drawMapLabels();
    if (earthTexture) earthTexture.needsUpdate = true;
    if (g.kind === "lunar") {
      const visibleArea = EARTH_AREA * weights[1] / totalWeight;
      $("partialAreaLabel").textContent = "月球位于地平线上方";
      $("totalAreaLabel").textContent = "月球不可见面积";
      $("annularAreaLabel").textContent = "当前月食";
      $("partialArea").textContent = formatArea(visibleArea);
      $("totalArea").textContent = formatArea(EARTH_AREA - visibleArea);
      $("annularArea").textContent = classifyLunar(g).name;
    } else {
      $("partialAreaLabel").textContent = "仅偏食面积";
      $("totalAreaLabel").textContent = "全食面积";
      $("annularAreaLabel").textContent = "环食面积";
      $("partialArea").textContent = formatArea(EARTH_AREA * weights[1] / totalWeight);
      $("totalArea").textContent = formatArea(EARTH_AREA * weights[2] / totalWeight);
      $("annularArea").textContent = formatArea(EARTH_AREA * weights[3] / totalWeight);
    }
    $("mapBusy").classList.remove("show");
  }

  function drawGraticule(ctx, width, height) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(192,225,235,.16)";
    for (let lon = -150; lon <= 150; lon += 30) {
      const x = (lon + 180) / 360 * width;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = (90 - lat) / 180 * height;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(99,230,221,.28)";
    ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
    ctx.restore();
  }

  function drawMapLabels() {
    mapCtx.save();
    mapCtx.font = "11px Segoe UI, Microsoft YaHei, sans-serif";
    mapCtx.fillStyle = "rgba(231,246,251,.68)";
    mapCtx.textBaseline = "top";
    for (const lon of [-180, -120, -60, 0, 60, 120, 180]) {
      const x = (lon + 180) / 360 * MAP_W;
      mapCtx.textAlign = lon === -180 ? "left" : lon === 180 ? "right" : "center";
      mapCtx.fillText(`${lon}°`, x, 6);
    }
    mapCtx.textAlign = "left";
    for (const lat of [60, 30, 0, -30, -60]) {
      const y = (90 - lat) / 180 * MAP_H;
      mapCtx.fillText(`${lat}°`, 6, y + 4);
    }
    if (bestPoint && bestPoint.obscuration > 0) {
      const x = (bestPoint.lon + 180) / 360 * MAP_W;
      const y = (90 - bestPoint.lat) / 180 * MAP_H;
      mapCtx.strokeStyle = "#ffffff";
      mapCtx.fillStyle = "rgba(4,13,21,.75)";
      mapCtx.lineWidth = 2;
      mapCtx.beginPath(); mapCtx.arc(x, y, 7, 0, Math.PI * 2); mapCtx.fill(); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(x - 11, y); mapCtx.lineTo(x + 11, y); mapCtx.moveTo(x, y - 11); mapCtx.lineTo(x, y + 11); mapCtx.stroke();
    }
    mapCtx.restore();
  }

  function scheduleMap(immediate = false) {
    clearTimeout(mapTimer);
    $("mapBusy").classList.add("show");
    mapTimer = setTimeout(renderFootprint, immediate ? 0 : 120);
  }

  let renderer, scene, camera, earthMesh, moonMesh, sunMesh, earthTexture, spaceFog;
  let celestialGroup, coneGroup, markerMesh, stars;
  const labelTargets = {};
  const orbit = { target: null, radius: 28, theta: 0.85, phi: 1.12, drag: null };

  function initThree() {
    if (!window.THREE) {
      $("kernelStatus").textContent = "Three.js 加载失败";
      $("kernelStatus").className = "status-pill error";
      $("sceneCanvas").replaceWith(Object.assign(document.createElement("div"), { className: "three-error", textContent: "无法载入 Three.js，请检查网络连接。" }));
      return false;
    }
    const canvas = $("sceneCanvas");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    scene = new THREE.Scene();
    spaceFog = new THREE.FogExp2(0x071019, .0021);
    scene.fog = spaceFog;
    camera = new THREE.PerspectiveCamera(42, 1, .02, 400000);
    orbit.target = new THREE.Vector3();

    earthTexture = new THREE.CanvasTexture(offscreen);
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.wrapS = THREE.RepeatWrapping;
    earthTexture.repeat.x = -1;
    earthTexture.offset.x = 1;
    earthTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    celestialGroup = new THREE.Group();
    coneGroup = new THREE.Group();
    scene.add(celestialGroup, coneGroup);
    createStars();

    const ambient = new THREE.AmbientLight(0x8ba7b8, .27);
    scene.add(ambient);
    const sunLight = new THREE.DirectionalLight(0xfff3d7, 3.2);
    sunLight.name = "sunLight";
    scene.add(sunLight);

    bindOrbitControls(canvas);
    const resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(canvas.parentElement);
    resizeRenderer();
    requestAnimationFrame(renderLoop);
    return true;
  }

  function createStars() {
    const positions = [];
    let seed = 1987;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 1100; i++) {
      const r = 1200 + random() * 1800;
      const z = random() * 2 - 1;
      const a = random() * Math.PI * 2;
      const s = Math.sqrt(1 - z * z);
      positions.push(r * s * Math.cos(a), r * z, r * s * Math.sin(a));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfd8e5, size: 1.2, sizeAttenuation: false, transparent: true, opacity: .72 }));
    scene.add(stars);
  }

  function disposeGroup(group) {
    const geometries = new Set();
    const materials = new Set();
    group.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => materials.add(material));
    });
    geometries.forEach(item => item.dispose());
    materials.forEach(material => {
      if (material.map && material.map !== earthTexture) material.map.dispose();
      material.dispose();
    });
    group.clear();
  }

  function sphere(radius, material) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), material);
  }

  function createEarthGrid(radius) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color: 0x93ced5, transparent: true, opacity: .18 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const points = [];
      const latR = lat * RAD;
      for (let lon = -180; lon <= 180; lon += 3) {
        const lonR = lon * RAD;
        points.push(new THREE.Vector3(radius * Math.cos(latR) * Math.cos(lonR), radius * Math.sin(latR), radius * Math.cos(latR) * Math.sin(lonR)));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }
    for (let lon = -150; lon <= 180; lon += 30) {
      const points = [];
      const lonR = lon * RAD;
      for (let lat = -90; lat <= 90; lat += 3) {
        const latR = lat * RAD;
        points.push(new THREE.Vector3(radius * Math.cos(latR) * Math.cos(lonR), radius * Math.sin(latR), radius * Math.cos(latR) * Math.sin(lonR)));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }
    return group;
  }

  function createAtmosphere(radius) {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vNormal; varying vec3 vView; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vNormal=normalize(normalMatrix*normal); vView=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vNormal; varying vec3 vView; void main(){ float rim=pow(1.0-max(0.0,dot(vNormal,vView)),2.15); gl_FragColor=vec4(0.18,0.72,1.0,rim*0.42); }`
    });
    return sphere(radius * 1.055, material);
  }

  function createOrbitalGuides(radius) {
    const group = new THREE.Group();
    if (state.showOrbit) {
      const points = [];
      const inclination = state.lunarInclination * RAD;
      for (let i = 0; i <= 256; i++) {
        const phase = i / 256 * Math.PI * 2;
        const base = add(mul(geometry.radial, Math.cos(phase)), mul(geometry.east, Math.sin(phase)));
        const direction = normalize(rotateAroundAxis(base, geometry.nodeAxis, inclination));
        points.push(new THREE.Vector3(...direction).multiplyScalar(radius));
      }
      const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xbfe9ee, transparent: true, opacity: .52 });
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), orbitMaterial));
      const moonPhaseArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.slice(0, Math.max(2, Math.round(state.moonPhase / 360 * 256) + 1))), new THREE.LineBasicMaterial({ color: 0x63e6dd, transparent: true, opacity: .95 }));
      group.add(moonPhaseArc);
    }
    if (state.showEcliptic) {
      const plane = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 1.18, 96),
        new THREE.MeshBasicMaterial({ color: 0x397a8c, transparent: true, opacity: .075, side: THREE.DoubleSide, depthWrite: false })
      );
      const normal = normalize(cross(geometry.radial, geometry.east));
      plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal));
      group.add(plane);
      const nodePoints = [new THREE.Vector3(...geometry.nodeAxis).multiplyScalar(-radius * 1.22), new THREE.Vector3(...geometry.nodeAxis).multiplyScalar(radius * 1.22)];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(nodePoints), new THREE.LineDashedMaterial({ color: 0xffd166, dashSize: radius * .04, gapSize: radius * .025, transparent: true, opacity: .78 })));
      group.children[group.children.length - 1].computeLineDistances();
    }
    return group;
  }

  function addFrustum(group, start, direction, lengthKm, startRadiusKm, endRadiusKm, scale, color, opacity) {
    if (lengthKm <= 0 || startRadiusKm < 0 || endRadiusKm < 0) return;
    const h = lengthKm / scale;
    const geometry3d = new THREE.CylinderGeometry(endRadiusKm / scale, startRadiusKm / scale, h, 80, 1, true);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geometry3d, material);
    const dir = new THREE.Vector3(direction[0], direction[1], direction[2]).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mesh.position.set(start[0] / scale, start[1] / scale, start[2] / scale).addScaledVector(dir, h / 2);
    group.add(mesh);
  }

  function exactUmbraRadius(t) { return Math.max(0, (geometry.umbraLength - t) * Math.tan(geometry.alphaU)); }
  function exactAntumbraRadius(t) { return Math.max(0, (t - geometry.umbraLength) * Math.tan(geometry.alphaU)); }
  function exactPenumbraRadius(t) { return (geometry.penumbraVertex + t) * Math.tan(geometry.alphaP); }

  function buildExactCones(scale, t0, t1) {
    const startP = add(geometry.shadowOrigin, mul(geometry.u, t0));
    addFrustum(coneGroup, startP, geometry.u, t1 - t0, exactPenumbraRadius(t0), exactPenumbraRadius(t1), scale, 0xffc95f, .095);
    const umbraEnd = Math.min(t1, geometry.umbraLength);
    if (umbraEnd > t0) {
      addFrustum(coneGroup, startP, geometry.u, umbraEnd - t0, exactUmbraRadius(t0), exactUmbraRadius(umbraEnd), scale, 0xff6174, .24);
    }
    const antumbraStart = Math.max(t0, geometry.umbraLength);
    if (t1 > antumbraStart) {
      const p = add(geometry.shadowOrigin, mul(geometry.u, antumbraStart));
      addFrustum(coneGroup, p, geometry.u, t1 - antumbraStart, exactAntumbraRadius(antumbraStart), exactAntumbraRadius(t1), scale, 0xaa86ff, .22);
    }
  }

  function buildSystemCones(originPosition, targetPosition, originRadius) {
    const direction = targetPosition.clone().sub(originPosition).normalize();
    const distance = originPosition.distanceTo(targetPosition) + 8;
    const start = [originPosition.x, originPosition.y, originPosition.z];
    addFrustum(coneGroup, start, [direction.x, direction.y, direction.z], distance, originRadius, originRadius * 2.8, 1, 0xffc95f, .1);
    addFrustum(coneGroup, start, [direction.x, direction.y, direction.z], distance, originRadius * .92, .05, 1, geometry.kind === "solar" ? 0xff6174 : 0x8f78d9, .24);
  }

  function observerSnapshot(g = geometry) {
    let lonDeg = state.solarLongitude + (g.kind === "lunar" ? 180 : 0);
    if (lonDeg > 180) lonDeg -= 360;
    const lon = lonDeg * RAD;
    const up = [Math.cos(lon), 0, Math.sin(lon)];
    const east = [-Math.sin(lon), 0, Math.cos(lon)];
    const north = [0, 1, 0];
    const position = mul(up, R_EARTH);
    const toSun = sub(g.S, position);
    const toMoon = sub(g.M, position);
    const dSun = normalize(toSun);
    const dMoon = normalize(toMoon);
    const aSun = Math.asin(R_SUN / length(toSun));
    const aMoon = Math.asin(R_MOON / length(toMoon));
    const moonVisible = dot(up, dMoon) > 0;
    if (g.kind === "solar") {
      const result = evaluateNormal(up[0], up[1], up[2], g);
      return { kind: "solar", lonDeg, up, east, north, position, dSun, dMoon, aSun, aMoon, focus: dSun, separation: Math.acos(clamp(dot(dSun, dMoon), -1, 1)), resultName: typeName(result.type), coverage: result.obscuration, visible: dot(up, dSun) > 0 };
    }
    const lunar = classifyLunar(g);
    const shadowCenter = add(g.shadowOrigin, mul(g.u, g.x));
    const toShadow = sub(shadowCenter, position);
    const dShadow = normalize(toShadow);
    const aUmbra = Math.atan2(Math.max(0, g.rUmbra), length(toShadow));
    const aPenumbra = Math.atan2(g.rPenumbra, length(toShadow));
    return { kind: "lunar", lonDeg, up, east, north, position, dSun, dMoon, dShadow, aSun, aMoon, aUmbra, aPenumbra, focus: dMoon, separation: Math.acos(clamp(dot(dMoon, dShadow), -1, 1)), resultName: moonVisible ? lunar.name : "月球不可见", coverage: moonVisible ? lunar.coverage : 0, visible: moonVisible };
  }

  function buildSkyView() {
    const obs = observerSnapshot();
    camera.near = .01;
    camera.far = 300;
    camera.position.set(0, 0, 0);
    const screenUp = normalize(sub(obs.north, mul(obs.focus, dot(obs.north, obs.focus))));
    camera.up.set(...screenUp);
    camera.lookAt(new THREE.Vector3(...obs.focus).multiplyScalar(100));

    if (obs.kind === "solar") {
      const sunRenderDistance = 100;
      const moonRenderDistance = 90;
      sunMesh = sphere(Math.tan(obs.aSun) * sunRenderDistance, new THREE.MeshBasicMaterial({ color: 0xfff6cf }));
      sunMesh.position.set(...obs.dSun).multiplyScalar(sunRenderDistance);
      const corona = sphere(Math.tan(obs.aSun) * sunRenderDistance * 1.5, new THREE.MeshBasicMaterial({ color: 0xffd47b, transparent: true, opacity: .24, blending: THREE.AdditiveBlending, depthWrite: false }));
      corona.position.copy(sunMesh.position);
      moonMesh = sphere(Math.tan(obs.aMoon) * moonRenderDistance, new THREE.MeshBasicMaterial({ color: 0x05090d }));
      moonMesh.position.set(...obs.dMoon).multiplyScalar(moonRenderDistance);
      celestialGroup.add(corona, sunMesh, moonMesh);
      camera.fov = clamp((obs.separation * DEG + 1.35) * 1.55, 2.6, 13);
      scene.background = new THREE.Color(0x5e9fc9);
    } else {
      const moonDistance = 92;
      const moonDiameter = Math.tan(obs.aMoon) * moonDistance * 2;
      const lunarTexture = createLunarEclipseTexture(obs);
      moonMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: lunarTexture, transparent: true, depthWrite: false }));
      moonMesh.scale.set(moonDiameter, moonDiameter, 1);
      moonMesh.position.set(...obs.dMoon).multiplyScalar(moonDistance);
      celestialGroup.add(moonMesh);
      camera.fov = clamp((Math.max(obs.separation, obs.aPenumbra) * DEG * 2.5 + 1.4), 3.2, 12);
      scene.background = new THREE.Color(0x071321);
    }
    camera.updateProjectionMatrix();
    labelTargets.sun = labelTargets.moon = null;

    $("observerLocation").textContent = `赤道 · ${formatDeg(obs.lonDeg)} 经度 · ${obs.kind === "solar" ? "地方正午" : "地方午夜"}`;
    $("observerEclipse").textContent = `${obs.resultName} · ${(obs.coverage * 100).toFixed(2)}%`;
    $("sunAltAz").textContent = formatAltAz(obs.dSun, obs.up, obs.north, obs.east);
    $("moonAltAz").textContent = formatAltAz(obs.dMoon, obs.up, obs.north, obs.east);
    $("skySeparation").textContent = formatArcAngle(obs.separation);
    $("apparentDiameters").textContent = obs.kind === "solar" ? `${formatArcAngle(obs.aSun * 2)} / ${formatArcAngle(obs.aMoon * 2)}` : `${formatArcAngle(obs.aMoon * 2)} / 本影 ${formatArcAngle(obs.aUmbra * 2)}`;
    $("scaleBadge").textContent = `真实角尺度 · 赤道地方${obs.kind === "solar" ? "正午" : "午夜"}`;
    $("viewportHelp").textContent = "固定地表视点 · 滚轮调节视场 · 参数变化实时重算";
  }

  function drawDisc(ctx, x, y, radius, colors) {
    const gradient = ctx.createRadialGradient(x - radius * .28, y - radius * .3, radius * .08, x, y, radius);
    colors.forEach(([stop, color]) => gradient.addColorStop(stop, color));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function createLunarEclipseTexture(obs) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const center = 256;
    const moonRadius = 218;
    drawDisc(ctx, center, center, moonRadius, [[0, "#eee8d7"], [.72, "#bdb7a8"], [1, "#77736b"]]);
    ctx.save();
    ctx.globalAlpha = .13;
    ctx.fillStyle = "#514d47";
    for (let i = 0; i < 34; i++) {
      const angle = i * 2.399;
      const radial = moonRadius * (.12 + ((i * 37) % 79) / 100);
      const radius = 4 + (i * 11) % 17;
      ctx.beginPath();
      ctx.arc(center + Math.cos(angle) * radial, center + Math.sin(angle) * radial, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const focus = obs.dMoon;
    const screenUp = normalize(sub(obs.north, mul(focus, dot(obs.north, focus))));
    const screenRight = normalize(cross(screenUp, focus));
    const shadowX = Math.atan2(dot(obs.dShadow, screenRight), dot(obs.dShadow, focus)) / obs.aMoon * moonRadius;
    const shadowY = -Math.atan2(dot(obs.dShadow, screenUp), dot(obs.dShadow, focus)) / obs.aMoon * moonRadius;
    ctx.save();
    ctx.beginPath(); ctx.arc(center, center, moonRadius, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = .18;
    ctx.fillStyle = "#503e62";
    ctx.beginPath(); ctx.arc(center + shadowX, center + shadowY, obs.aPenumbra / obs.aMoon * moonRadius, 0, Math.PI * 2); ctx.fill();
    const umbraGradient = ctx.createRadialGradient(center + shadowX, center + shadowY, 0, center + shadowX, center + shadowY, obs.aUmbra / obs.aMoon * moonRadius);
    umbraGradient.addColorStop(0, "rgba(72,13,10,.86)");
    umbraGradient.addColorStop(.72, "rgba(103,27,18,.78)");
    umbraGradient.addColorStop(1, "rgba(44,13,25,.64)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = umbraGradient;
    ctx.beginPath(); ctx.arc(center + shadowX, center + shadowY, obs.aUmbra / obs.aMoon * moonRadius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function renderObserverPreview() {
    const obs = observerSnapshot();
    const width = observerCanvas.width;
    const height = observerCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const focus = obs.focus;
    const screenUp = normalize(sub(obs.north, mul(focus, dot(obs.north, focus))));
    const screenRight = normalize(cross(screenUp, focus));
    const project = direction => ({
      x: Math.atan2(dot(direction, screenRight), dot(direction, focus)),
      y: Math.atan2(dot(direction, screenUp), dot(direction, focus))
    });
    const targetOffset = obs.kind === "solar" ? project(obs.dMoon) : project(obs.dShadow);
    const largestRadius = obs.kind === "solar" ? Math.max(obs.aSun, obs.aMoon) : Math.max(obs.aMoon, obs.aPenumbra);
    const halfFov = Math.max(1.15 * RAD, Math.abs(targetOffset.x) + largestRadius * 1.8, Math.abs(targetOffset.y) + largestRadius * 1.8);
    const pixelsPerRad = Math.min(width, height) * .43 / halfFov;

    const sky = observerCtx.createLinearGradient(0, 0, 0, height);
    if (obs.kind === "solar") {
      sky.addColorStop(0, "#4d91c3"); sky.addColorStop(1, "#9fd2ea");
    } else {
      sky.addColorStop(0, "#020711"); sky.addColorStop(1, "#10243a");
    }
    observerCtx.fillStyle = sky;
    observerCtx.fillRect(0, 0, width, height);

    if (obs.kind === "lunar") {
      observerCtx.fillStyle = "rgba(214,232,246,.7)";
      for (let i = 0; i < 70; i++) {
        const x = (i * 149 + 31) % width;
        const y = (i * 83 + 17) % height;
        const r = i % 9 === 0 ? 1.35 : .65;
        observerCtx.beginPath(); observerCtx.arc(x, y, r, 0, Math.PI * 2); observerCtx.fill();
      }
    }

    if (obs.kind === "solar") {
      const sunRadius = obs.aSun * pixelsPerRad;
      const moonRadius = obs.aMoon * pixelsPerRad;
      observerCtx.shadowBlur = sunRadius * 1.25;
      observerCtx.shadowColor = "rgba(255,226,142,.95)";
      drawDisc(observerCtx, centerX, centerY, sunRadius, [[0, "#fffdf1"], [.75, "#fff4b8"], [1, "#ffd572"]]);
      observerCtx.shadowBlur = 0;
      drawDisc(observerCtx, centerX + targetOffset.x * pixelsPerRad, centerY - targetOffset.y * pixelsPerRad, moonRadius, [[0, "#0a1015"], [.82, "#05080b"], [1, "#010203"]]);
    } else {
      const moonRadius = obs.aMoon * pixelsPerRad;
      drawDisc(observerCtx, centerX, centerY, moonRadius, [[0, "#f4f0df"], [.68, "#c9c4b5"], [1, "#7c7a75"]]);
      observerCtx.save();
      observerCtx.beginPath(); observerCtx.arc(centerX, centerY, moonRadius, 0, Math.PI * 2); observerCtx.clip();
      observerCtx.globalAlpha = .2;
      observerCtx.fillStyle = "#694c72";
      observerCtx.beginPath();
      observerCtx.arc(centerX + targetOffset.x * pixelsPerRad, centerY - targetOffset.y * pixelsPerRad, obs.aPenumbra * pixelsPerRad, 0, Math.PI * 2);
      observerCtx.fill();
      observerCtx.globalAlpha = .82;
      observerCtx.fillStyle = "#651b12";
      observerCtx.beginPath();
      observerCtx.arc(centerX + targetOffset.x * pixelsPerRad, centerY - targetOffset.y * pixelsPerRad, obs.aUmbra * pixelsPerRad, 0, Math.PI * 2);
      observerCtx.fill();
      observerCtx.restore();
    }

    observerCtx.strokeStyle = "rgba(255,255,255,.32)";
    observerCtx.lineWidth = 1;
    observerCtx.beginPath();
    observerCtx.moveTo(centerX - 8, centerY); observerCtx.lineTo(centerX + 8, centerY);
    observerCtx.moveTo(centerX, centerY - 8); observerCtx.lineTo(centerX, centerY + 8);
    observerCtx.stroke();

    $("observerEyebrow").textContent = obs.kind === "solar" ? "EQUATOR · LOCAL NOON" : "EQUATOR · LOCAL MIDNIGHT";
    $("observerPreviewTitle").textContent = obs.kind === "solar" ? "赤道正午观测" : "赤道午夜观测";
    $("observerPreviewResult").textContent = `${obs.resultName} · ${(obs.coverage * 100).toFixed(1)}%`;
    $("observerPreviewAngles").textContent = obs.kind === "solar" ? `日月角距 ${formatArcAngle(obs.separation)}` : `月心—影轴 ${formatArcAngle(obs.separation)}`;
    $("observerPreview").hidden = !state.showObserver || state.view === "sky";
  }

  function updateScene() {
    if (!renderer) return;
    disposeGroup(celestialGroup);
    disposeGroup(coneGroup);
    labelTargets.sun = labelTargets.moon = labelTargets.earth = null;
    const mode = state.view;
    const viewportCard = document.querySelector(".viewport-card");
    viewportCard.classList.toggle("sky-mode", mode === "sky");
    $("skyHud").hidden = mode !== "sky";
    scene.background = mode === "sky" ? new THREE.Color(0x5e9fc9) : null;
    scene.fog = mode === "sky" ? null : spaceFog;
    const sunLight = scene.getObjectByName("sunLight");
    sunLight.visible = mode !== "sky";
    if (mode === "sky") {
      buildSkyView();
      renderObserverPreview();
      return;
    }
    camera.near = .02;
    camera.far = 400000;
    camera.fov = 42;
    camera.up.set(0, 1, 0);
    camera.updateProjectionMatrix();
    $("viewportHelp").textContent = "拖动旋转 · 滚轮缩放 · 双击复位视角";
    const exactScale = 1000;
    const earthRadius = mode === "system" ? 2.5 : R_EARTH / exactScale;
    earthMesh = sphere(earthRadius, new THREE.MeshStandardMaterial({ map: earthTexture, roughness: .88, metalness: 0, emissive: 0x06101a, emissiveIntensity: .3 }));
    earthMesh.add(createEarthGrid(earthRadius * 1.002));
    celestialGroup.add(earthMesh, createAtmosphere(earthRadius));
    labelTargets.earth = earthMesh;

    markerMesh = sphere(earthRadius * .018, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    if (bestPoint && bestPoint.obscuration > 0) {
      const lat = bestPoint.lat * RAD;
      const lon = bestPoint.lon * RAD;
      markerMesh.position.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).multiplyScalar(earthRadius * 1.012);
      earthMesh.add(markerMesh);
    }

    sunLight.position.set(geometry.radial[0] * 100, geometry.radial[1] * 100, geometry.radial[2] * 100);
    sunLight.target = earthMesh;

    if (mode === "earth") {
      const t0 = geometry.kind === "solar" ? Math.max(0, geometry.x - R_EARTH * 3.2) : 0;
      const t1 = geometry.kind === "solar" ? geometry.x + R_EARTH * 3.2 : R_EARTH * 7;
      buildExactCones(exactScale, t0, t1);
      orbit.target.set(0, 0, 0);
      orbit.radius = 27;
      $("scaleBadge").textContent = "真实比例 · 1 单位 = 1000 km";
    } else if (mode === "earthmoon") {
      moonMesh = sphere(R_MOON / exactScale, new THREE.MeshStandardMaterial({ color: 0x9ca6aa, roughness: 1, metalness: 0 }));
      moonMesh.position.set(geometry.M[0] / exactScale, geometry.M[1] / exactScale, geometry.M[2] / exactScale);
      celestialGroup.add(moonMesh);
      labelTargets.moon = moonMesh;
      celestialGroup.add(createOrbitalGuides(state.moonDistance / exactScale));
      buildExactCones(exactScale, 0, geometry.x + geometry.targetRadius * 2.2);
      orbit.target.copy(moonMesh.position).multiplyScalar(.42);
      orbit.radius = Math.max(300, moonMesh.position.length() * .82);
      $("scaleBadge").textContent = "真实比例 · 天体半径与距离同尺度";
    } else {
      const q = new THREE.Vector3(...geometry.radial);
      const mDir = new THREE.Vector3(...normalize(geometry.M));
      sunMesh = sphere(6.2, new THREE.MeshBasicMaterial({ color: 0xffcc66 }));
      sunMesh.position.copy(q).multiplyScalar(54);
      const sunGlow = sphere(8.4, new THREE.MeshBasicMaterial({ color: 0xffb64f, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }));
      sunGlow.position.copy(sunMesh.position);
      moonMesh = sphere(.9, new THREE.MeshStandardMaterial({ color: 0xa7afb3, roughness: 1 }));
      moonMesh.position.copy(mDir).multiplyScalar(15);
      celestialGroup.add(sunGlow, sunMesh, moonMesh, createOrbitalGuides(15));
      labelTargets.sun = sunMesh;
      labelTargets.moon = moonMesh;
      const originDisplay = geometry.kind === "solar" ? moonMesh.position : earthMesh.position;
      const targetDisplay = geometry.kind === "solar" ? earthMesh.position : moonMesh.position;
      buildSystemCones(originDisplay, targetDisplay, geometry.kind === "solar" ? .9 : earthRadius);
      orbit.target.copy(q).multiplyScalar(10);
      orbit.radius = 96;
      $("scaleBadge").textContent = "距离压缩示意 · 计算仍使用真实数值";
    }
    updateCamera();
    renderObserverPreview();
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
    if (view === "earth") { orbit.theta = .82; orbit.phi = 1.1; }
    if (view === "earthmoon") { orbit.theta = 1.0; orbit.phi = 1.12; }
    if (view === "system") { orbit.theta = .72; orbit.phi = 1.0; }
    if (view === "sky") { orbit.theta = 0; orbit.phi = Math.PI / 2; }
    updateScene();
  }

  function updateCamera() {
    if (!camera || !orbit.target) return;
    if (state.view === "sky") return;
    const sinPhi = Math.sin(orbit.phi);
    camera.position.set(
      orbit.target.x + orbit.radius * sinPhi * Math.cos(orbit.theta),
      orbit.target.y + orbit.radius * Math.cos(orbit.phi),
      orbit.target.z + orbit.radius * sinPhi * Math.sin(orbit.theta)
    );
    camera.lookAt(orbit.target);
  }

  function bindOrbitControls(canvas) {
    canvas.addEventListener("pointerdown", event => {
      canvas.setPointerCapture(event.pointerId);
      orbit.drag = { x: event.clientX, y: event.clientY, theta: orbit.theta, phi: orbit.phi };
    });
    canvas.addEventListener("pointermove", event => {
      if (!orbit.drag) return;
      orbit.theta = orbit.drag.theta - (event.clientX - orbit.drag.x) * .006;
      orbit.phi = clamp(orbit.drag.phi + (event.clientY - orbit.drag.y) * .006, .08, Math.PI - .08);
      updateCamera();
    });
    const end = () => { orbit.drag = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", event => {
      event.preventDefault();
      if (state.view === "sky") {
        camera.fov = clamp(camera.fov * Math.exp(event.deltaY * .001), 1.4, 15);
        camera.updateProjectionMatrix();
        return;
      }
      orbit.radius *= Math.exp(event.deltaY * .001);
      const limits = state.view === "earth" ? [10, 90] : state.view === "earthmoon" ? [80, 1200] : [30, 220];
      orbit.radius = clamp(orbit.radius, limits[0], limits[1]);
      updateCamera();
    }, { passive: false });
    canvas.addEventListener("dblclick", () => setView(state.view));
  }

  function resizeRenderer() {
    if (!renderer) return;
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }

  function updateLabels() {
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    for (const [name, target] of Object.entries(labelTargets)) {
      const element = document.querySelector(`[data-label="${name}"]`);
      if (!element || !target || !target.visible) { if (element) element.style.display = "none"; continue; }
      const p = new THREE.Vector3();
      target.getWorldPosition(p);
      p.project(camera);
      const visible = p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.2 && Math.abs(p.y) < 1.2;
      element.style.display = visible ? "block" : "none";
      if (visible) {
        element.style.left = `${(p.x * .5 + .5) * rect.width}px`;
        element.style.top = `${(-p.y * .5 + .5) * rect.height - 18}px`;
      }
    }
  }

  function renderLoop(time) {
    if (stars) stars.rotation.y = time * .0000025;
    if ((state.animateMoon || state.rotateEarth) && time - lastSimulationRefresh > 90) {
      const elapsed = lastSimulationRefresh ? (time - lastSimulationRefresh) / 1000 : 0;
      lastSimulationRefresh = time;
      if (state.animateMoon) state.moonPhase = (state.moonPhase + state.timeScale * elapsed) % 360;
      if (state.rotateEarth) {
        state.solarLongitude += 6 * elapsed;
        if (state.solarLongitude > 180) state.solarLongitude -= 360;
      }
      $("moonPhase").value = state.moonPhase;
      $("solarLongitude").value = state.solarLongitude;
      geometry = computeGeometry();
      updateReadouts();
      if (time - lastMetricRefresh > 240) {
        updateMetrics();
        lastMetricRefresh = time;
      }
      updateScene();
      if (time - lastMapRefresh > 900) {
        scheduleMap(false);
        lastMapRefresh = time;
      }
    }
    updateLabels();
    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  }

  function updateAll(mapImmediate = false) {
    updateReadouts();
    geometry = computeGeometry();
    updateMetrics();
    updateScene();
    scheduleMap(mapImmediate);
  }

  function applyPreset(name) {
    Object.assign(state, presets[name]);
    state.animateMoon = false;
    controls.forEach(id => { $(id).value = state[id]; });
    updateAll(true);
    showToast({ total: "已载入中心全食几何", annular: "已载入中心环食几何", partial: "已载入半影掠过几何", lunar: "已载入月全食几何", miss: "已载入完全错过几何" }[name]);
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function exportParameters() {
    const payload = {
      generatedAt: new Date().toISOString(),
      units: { position: "km", angle: "degree" },
      constants: { sunRadius: R_SUN, moonRadius: R_MOON, earthRadius: R_EARTH },
      inputs: controls.reduce((result, key) => ({ ...result, [key]: state[key] }), {}),
      cartesianEarthCentered: { sun: geometry.S, moon: geometry.M },
      derived: {
        eventKind: geometry.kind,
        sunMoonDistance: geometry.dSM,
        axisDistanceFromTargetCenter: geometry.b,
        umbraLength: geometry.umbraLength,
        targetPlaneUmbraRadius: geometry.rUmbra,
        targetPlanePenumbraRadius: geometry.rPenumbra,
        maximumObscuration: geometry.kind === "solar" ? bestPoint?.obscuration ?? 0 : classifyLunar(geometry).coverage,
        maximumPoint: geometry.kind === "solar" && bestPoint ? { latitude: bestPoint.lat, longitude: bestPoint.lon, type: typeName(bestPoint.type) } : null,
        lunarType: geometry.kind === "lunar" ? classifyLunar(geometry).name : null
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "eclipse-geometry.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    showToast("参数与计算结果已导出");
  }

  function bindUI() {
    controls.forEach(id => {
      $(id).addEventListener("input", event => {
        state[id] = Number(event.target.value);
        updateAll(false);
      });
    });
    $("moonPhase").addEventListener("pointerdown", () => { state.animateMoon = false; updateReadouts(); });
    document.querySelectorAll("[data-preset]").forEach(button => button.addEventListener("click", () => applyPreset(button.dataset.preset)));
    document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
    $("playButton").addEventListener("click", () => {
      state.animateMoon = !state.animateMoon;
      lastSimulationRefresh = performance.now();
      updateReadouts();
    });
    $("earthRotationToggle").addEventListener("change", event => {
      state.rotateEarth = event.target.checked;
      lastSimulationRefresh = performance.now();
    });
    $("observerToggle").addEventListener("change", event => {
      state.showObserver = event.target.checked;
      renderObserverPreview();
    });
    $("eclipticToggle").addEventListener("change", event => {
      state.showEcliptic = event.target.checked;
      updateScene();
    });
    $("orbitToggle").addEventListener("change", event => {
      state.showOrbit = event.target.checked;
      updateScene();
    });
    $("resetButton").addEventListener("click", () => {
      Object.assign(state, defaults);
      controls.forEach(id => { $(id).value = state[id]; });
      $("earthRotationToggle").checked = state.rotateEarth;
      $("observerToggle").checked = state.showObserver;
      $("eclipticToggle").checked = state.showEcliptic;
      $("orbitToggle").checked = state.showOrbit;
      setView(defaults.view);
      updateAll(true);
      showToast("已恢复默认参数");
    });
    $("exportButton").addEventListener("click", exportParameters);
    mapCanvas.addEventListener("pointermove", event => {
      const rect = mapCanvas.getBoundingClientRect();
      const lon = (event.clientX - rect.left) / rect.width * 360 - 180;
      const lat = 90 - (event.clientY - rect.top) / rect.height * 180;
      if (geometry.kind === "solar") {
        const result = evaluateLatLon(lat, lon);
        $("mapReadout").textContent = `${formatDeg(lat, 2)} 纬度 · ${formatDeg(lon, 2)} 经度 · ${typeName(result.type)} · 遮挡 ${(result.obscuration * 100).toFixed(2)}%`;
      } else {
        const latR = lat * RAD;
        const lonR = lon * RAD;
        const n = [Math.cos(latR) * Math.cos(lonR), Math.sin(latR), Math.cos(latR) * Math.sin(lonR)];
        const p = mul(n, R_EARTH);
        const visible = dot(n, normalize(sub(geometry.M, p))) > 0;
        $("mapReadout").textContent = `${formatDeg(lat, 2)} 纬度 · ${formatDeg(lon, 2)} 经度 · ${visible ? `可见${classifyLunar(geometry).name}` : "月球在地平线下"}`;
      }
    });
    mapCanvas.addEventListener("pointerleave", () => { $("mapReadout").textContent = "移动指针读取经纬度"; });
  }

  function runSelfTests() {
    try {
      const base = { ...defaults, solarLatitude: 0, solarLongitude: 0, moonPhase: 0, lunarInclination: 5.145, nodeLongitude: 0 };
      const totalG = computeGeometry({ ...base, sunDistance: 152100000, moonDistance: 356800 });
      const totalAtCenter = evaluateNormal(1, 0, 0, totalG);
      const annularG = computeGeometry({ ...base, sunDistance: 147100000, moonDistance: 406500 });
      const annularAtCenter = evaluateNormal(1, 0, 0, annularG);
      const lunarG = computeGeometry({ ...base, moonPhase: 180, nodeLongitude: 180, moonDistance: 384400 });
      if (totalAtCenter.type !== 2) throw new Error("全食基准未通过");
      if (annularAtCenter.type !== 3) throw new Error("环食基准未通过");
      if (classifyLunar(lunarG).code !== 3) throw new Error("月全食基准未通过");
      if (!(totalG.umbraLength > totalG.x && annularG.umbraLength < annularG.x)) throw new Error("影锥长度基准未通过");
      $("kernelStatus").textContent = "几何内核自检通过";
      $("kernelStatus").className = "status-pill ok";
    } catch (error) {
      $("kernelStatus").textContent = `自检失败：${error.message}`;
      $("kernelStatus").className = "status-pill error";
    }
  }

  bindUI();
  $("earthRotationToggle").checked = state.rotateEarth;
  $("observerToggle").checked = state.showObserver;
  $("eclipticToggle").checked = state.showEcliptic;
  $("orbitToggle").checked = state.showOrbit;
  geometry = computeGeometry();
  runSelfTests();
  const threeReady = initThree();
  updateReadouts();
  updateMetrics();
  if (threeReady) updateScene();
  scheduleMap(true);
})();

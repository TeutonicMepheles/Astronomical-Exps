// City markers + latitude annotation on the globe.
// lat/lon -> sphere direction -> screen position. Front-facing markers show;
// selected/default states are expressed in CSS classes. A selected city also
// highlights its latitude with a ring, and latitude degree labels follow the
// visible latitude arcs.
const NS = 'http://www.w3.org/2000/svg';

export const CITIES = [
  { id: 'shanghai', name: '上海', lat: 31.23, lon: 121.47, coord: '31.2°N 121.5°E' },
  { id: 'paris', name: '巴黎', lat: 48.86, lon: 2.35, coord: '48.9°N 2.4°E' },
  { id: 'singapore', name: '新加坡', lat: 1.35, lon: 103.82, coord: '1.3°N 103.8°E' },
  { id: 'sydney', name: '悉尼', lat: -33.87, lon: 151.21, coord: '33.9°S 151.2°E' },
  { id: 'south', name: '南极', lat: -90, lon: 0, coord: '90.0°S' },
  { id: 'north', name: '北极', lat: 90, lon: 0, coord: '90.0°N' },
];

// Globe projection constants: stage coords, centre (370,415), radius 250.
const CX = 370, CY = 415, R = 250;
// Equatorial direction in the screen plane, perpendicular to the rolled axis.
const TILT = 23.5 * Math.PI / 180;
const U = [Math.cos(TILT), Math.sin(TILT)];
const DEFAULT_AXIS = [-U[1], U[0], 0];

function latitudeArc(phi, axis) {
  const sp = Math.sin(phi), cp = Math.cos(phi);
  const centerDepth = sp * axis[2];
  const depthRadius = cp * Math.hypot(axis[0], axis[1]);
  if (centerDepth + depthRadius < 0) return null;
  const half = centerDepth >= depthRadius ? Math.PI : Math.acos(-centerDepth / depthRadius);
  return {
    half,
    point(angle) {
      const u = Math.sin(angle) * cp, v = Math.cos(angle) * cp * axis[2];
      return {
        nx: sp * axis[0] + u * U[0] - v * U[1],
        ny: sp * axis[1] + u * U[1] + v * U[0],
      };
    },
  };
}

// Skip ±90°: the pole city markers (北极/南极) already show those coordinates.
const LAT_LABELS = [80, 70, 60, 50, 40, 30, 20, 10, 0, -10, -20, -30, -40, -50, -60, -70, -80];

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

export function createCityMarkers(svg) {
  // Latitude overlay sits below the city points so a point stays on top.
  const latGroup = el('g', { class: 'latitude-overlay' });
  svg.append(latGroup);
  const ringPath = el('path', { class: 'latitude-ring' });
  latGroup.append(ringPath);

  const labelRadius = R + 10;
  for (const lat of LAT_LABELS) {
    const arc = latitudeArc(lat * Math.PI / 180, DEFAULT_AXIS);
    const { nx, ny } = arc.point(arc.half);
    const t = el('text', {
      class: 'lat-label',
      x: CX + nx * labelRadius,
      y: CY - ny * labelRadius,
      'text-anchor': nx >= 0 ? 'start' : 'end',
      'dominant-baseline': 'central',
    });
    t.textContent = lat === 0 ? '0°' : (lat > 0 ? `${lat}°N` : `${-lat}°S`);
    latGroup.append(t);
  }

  const PAD = 4;
  const labelOnRight = (item) => item.c.id !== 'north' && item.x < CX;
  const items = CITIES.map((c) => {
    const g = el('g', { class: 'city', 'data-id': c.id, role:'button', tabindex:0, 'aria-label':c.name });
    const hit = el('circle', { class: 'hit', r: 24 });
    const ring = el('circle', { class: 'ring', r: 14 });
    const dot = el('circle', { class: 'dot', r: 4.5 });
    const name = el('text', { class: 'name' });
    name.textContent = c.name;
    const coord = el('text', { class: 'coord' });
    coord.textContent = c.coord;
    g.append(hit, ring, dot, name, coord);
    svg.append(g);
    return { c, g, dot, ring, name, coord,
      nameW: name.getComputedTextLength(), coordW: coord.getComputedTextLength() };
  });

  // Screen extent of each visible city's name + coord rows. The north pole label sits left of its marker to clear the latitude scale.
  function cityBlocks() {
    const blocks = [];
    for (const it of items) {
      if (!it.front || it.selected) continue;
      if (it.labelDy === undefined) it.labelDy = 0;
      const left = labelOnRight(it);
      const ax = left ? it.x + 14 : it.x - 14;
      const w = Math.max(it.nameW, it.coordW) + 3;
      blocks.push({
        it, left, ax, w,
        x1: left ? ax : ax - w, x2: left ? ax + w : ax,
        y1: it.y - 4 + it.labelDy - 15, y2: it.y + 13 + it.labelDy + 3,
      });
    }
    return blocks;
  }

  // Two city labels can still collide with each other (a rotating city label
  // reaching the pole marker). Two city labels have no freedom in anchor, so
  // nudge the lower one down by whole rows until the pair clears.
  function resolveCityLabels() {
    const blocks = cityBlocks().sort((a, b) => a.y1 - b.y1);
    for (let i = 0; i < blocks.length; i++) {
      for (let j = 0; j < i; j++) {
        const A = blocks[j], B = blocks[i];
        if (B.x1 < A.x2 + PAD && B.x2 > A.x1 - PAD &&
            B.y1 < A.y2 + PAD && B.y2 > A.y1 - PAD) {
          const shift = A.y2 + PAD - B.y1;
          B.it.labelDy += shift;
          B.y1 += shift; B.y2 += shift;
        }
      }
    }
    for (const it of items) {
      if (!it.front || it.selected) continue;
      if (it.labelDy === undefined) it.labelDy = 0;
      const left = labelOnRight(it);
      const dx = left ? 14 : -14;
      it.name.setAttribute('x', dx);
      it.coord.setAttribute('x', dx);
      it.name.setAttribute('y', -4 + it.labelDy);
      it.coord.setAttribute('y', 13 + it.labelDy);
    }
  }

  // Front arc of the latitude circle at the given latitude (radians).
  function updateRing(selLatRad, axis) {
    const arc = Math.abs(selLatRad) > 1.55 ? null : latitudeArc(selLatRad, axis);
    const parts = [];
    if (arc) {
      const steps = 72;
      for (let i = 0; i <= steps; i++) {
        const { nx, ny } = arc.point(arc.half * (2 * i / steps - 1));
        parts.push((i === 0 ? 'M' : 'L') + (CX + nx * R).toFixed(2) + ' ' + (CY - ny * R).toFixed(2));
      }
    }
    ringPath.setAttribute('d', parts.join(''));
  }

  function update(basis, selectedId) {
    const { axis, e2, e3 } = basis;
    for (const it of items) {
      const p = it.c.lat * Math.PI / 180, l = it.c.lon * Math.PI / 180;
      const sp = Math.sin(p), cp = Math.cos(p), cl = Math.cos(l), sl = Math.sin(l);
      const nx = sp * axis[0] + cp * cl * e2[0] + cp * sl * e3[0];
      const ny = sp * axis[1] + cp * cl * e2[1] + cp * sl * e3[1];
      const nz = sp * axis[2] + cp * cl * e2[2] + cp * sl * e3[2];
      // Tolerance so points on the silhouette stay visible
      // despite cos(±90°) ≈ 6e-17 float error flipping their tiny nz sign.
      const front = nz > -1e-6;
      const x = CX + nx * R, y = CY - ny * R;
      it.g.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`);
      it.x = x; it.y = y; it.front = front;
      const sel = it.c.id === selectedId;
      it.selected = sel;
      it.g.classList.toggle('hidden', !front);
      it.g.classList.toggle('selected', sel);
      it.g.setAttribute('aria-pressed',String(sel));
      it.g.setAttribute('tabindex',front?'0':'-1');
      const left = labelOnRight(it);
      it.name.setAttribute('text-anchor', left ? 'start' : 'end');
      it.coord.setAttribute('text-anchor', left ? 'start' : 'end');
      const dx = left ? 14 : -14;
      it.name.setAttribute('x', dx); it.name.setAttribute('y', -4);
      it.coord.setAttribute('x', dx); it.coord.setAttribute('y', 13);
      it.labelDy = 0;
    }
    resolveCityLabels();
    const selected = items.find((item) => item.selected);
    if(selected)updateRing(selected.c.lat * Math.PI / 180, axis);
    else ringPath.setAttribute('d','');
    return selected;
  }

  function onClick(handler) {
    for (const it of items) {
      it.g.addEventListener('click', () => handler(it.c.id));
      it.g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(it.c.id); }
      });
    }
  }

  return { update, onClick };
}

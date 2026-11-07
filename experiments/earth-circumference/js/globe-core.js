import { SOLAR_MODEL_VERSION, daysInYear, calendarDay, declination, dateFromDay } from './solar-calendar.js';
/* EXP-04 地球：共用交互层。
 *
 * 白底线框版（index.html）与纹理版（textured.html）共用这一份状态机与手势/键盘逻辑，
 * 只有渲染器不同。这样「两版交互一致」是结构上保证的，不靠人工对齐两处代码。
 *
 * 渲染器接口（renderer）：
 *   init(canvas) -> boolean      初始化 WebGL，返回是否成功
 *   resize(sizePx)               画布像素尺寸变化
 *   draw(scene)                  绘制一帧；scene 提供 basis / 状态 / 舞台参数
 */

export const STAGE_W = 1600;
export const STAGE_H = 900;

export const GLOBE_CENTER = { x: 781, y: 324 };   // 逻辑坐标（CSS y 向下）
export const GLOBE_RADIUS = 202;                  // 逻辑像素

/* Legacy pose constants remain for old callers; the active date model derives
 * orientation from Cooper N+284 declination with fixed sunlight. */
export const AXIAL_TILT_DEG = 23.44;
/** 年相位驱动的地轴摆幅（度）。以 23.5° 为中心、±12.5°，正好落在参考图量出的 11°–36° 扇形内。 */
export const PHASE_TILT_SWING = 12.5;

/** 由季节算出太阳方向：保持在同一平面内，与地轴夹角 90°−δ。
 *  δ>0 表示直射北半球。地轴固定 ⇒ 太阳在画面上随季节上下移动，这与地球固定、太阳赤纬变化的实际关系一致。 */
export function sunForPhase(phase, axis) {
  const delta = (subsolarLatFromPhase(phase) * Math.PI) / 180;
  const a = axis;
  const dot = SUN[0] * a[0] + SUN[1] * a[1] + SUN[2] * a[2];
  let u = [SUN[0] - dot * a[0], SUN[1] - dot * a[1], SUN[2] - dot * a[2]];
  const ul = Math.hypot(u[0], u[1], u[2]) || 1;
  u = u.map((c) => c / ul);
  const c = Math.cos(Math.PI / 2 - delta);   // = sin δ
  const sn = Math.sin(Math.PI / 2 - delta);  // = cos δ
  return [c * a[0] + sn * u[0], c * a[1] + sn * u[1], c * a[2] + sn * u[2]];
}

export function subsolarLatFromPhase(phase, year=new Date().getFullYear()) {
  const n=1+Math.round(Math.min(1,Math.max(0,phase))*(daysInYear(year)-1));
  return declination(year,n);
}

export function tiltFromSubsolarLat(deltaDeg, sun) {
  const A = -sun[0];
  const B = sun[1];
  const R = Math.hypot(A, B);
  const C = Math.sin((deltaDeg * Math.PI) / 180);
  const ratio = Math.min(1, Math.max(-1, C / R));
  const psi = Math.atan2(B, A);
  const t1 = Math.asin(ratio) - psi;
  // 取落在 [−20°, 70°] 区间的那个解（另一半在另一侧，不是我们要的姿态）
  const cands = [t1, Math.PI - Math.asin(ratio) - psi].map((t) => {
    let d = (t * 180) / Math.PI;
    d = ((d + 540) % 360) - 180;
    return d;
  });
  const ok = cands.filter((d) => d > -20 && d < 70);
  return ok.length ? ok[0] : cands[0];
}

export const TILT_MIN = 11;
export const TILT_MAX = 36;
export const TILT_INIT = 23.5;
/** 初始自转角：让 (0°,0°) 的直射点落在可见的光照侧，与参考图一致 */
export const SPIN_INIT = -33;

/** 画布相对球体的放大系数：必须 >1，否则大气辉光会被画布边缘切出一条直线 */
export const GLOW_PAD = 1.42;

/** 固定太阳方向：光线自右上射向左下，与水平约 27°，略朝观察者给出体积感。
 *  screen 坐标：x 右、y 上、z 朝观察者。 */
export const SUN = (() => {
  const a = (27 * Math.PI) / 180;
  const v = [Math.cos(a), Math.sin(a), 0.34];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
})();

/** 由朝向角和自转角求一组正交基（屏幕坐标，y 向上）。
 *  axis 为地轴（北），e2/e3 是赤道平面内的两个轴，已按自转角旋转。 */
export function basisVectors(tiltDeg, spinDeg) {
  const t = (tiltDeg * Math.PI) / 180;
  const s = (spinDeg * Math.PI) / 180;

  const axis = [-Math.sin(t), Math.cos(t), 0];   // 北极偏左上，与参考图一致
  const e2 = [Math.cos(t), Math.sin(t), 0];
  const e3 = [
    axis[1] * e2[2] - axis[2] * e2[1],
    axis[2] * e2[0] - axis[0] * e2[2],
    axis[0] * e2[1] - axis[1] * e2[0],
  ];

  const cs = Math.cos(s);
  const sn = Math.sin(s);
  const r2 = e2.map((v, i) => cs * v + sn * e3[i]);
  // 注意：r3 = -sin(s)*e2 + cos(s)*e3；这里映射的是 e3，e2 分量必须按下标取
  const r3 = e3.map((v, i) => -sn * e2[i] + cs * v);
  return { axis, e2: r2, e3: r3 };
}

/** 经纬度 → 屏幕逻辑坐标（CSS y 向下）。
 *  返回 { x, y, visible }，visible=false 表示在球背面。 */
export function projectLatLon(latDeg, lonDeg, basis) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const q = [
    Math.cos(lat) * Math.cos(lon),   // 沿 e2
    Math.sin(lat),                   // 沿地轴
    Math.cos(lat) * Math.sin(lon),   // 沿 e3
  ];
  const x = q[0] * basis.e2[0] + q[1] * basis.axis[0] + q[2] * basis.e3[0];
  const y = q[0] * basis.e2[1] + q[1] * basis.axis[1] + q[2] * basis.e3[1];
  const z = q[0] * basis.e2[2] + q[1] * basis.axis[2] + q[2] * basis.e3[2];
  return {
    x: GLOBE_CENTER.x + x * GLOBE_RADIUS,
    y: GLOBE_CENTER.y - y * GLOBE_RADIUS,   // 屏幕 y 向下
    visible: z > 0.02,
    normal: [x, y, z],
  };
}

/** 固定太阳方向 → 地球局部经纬度（直射点）。
 *  直射点不是固定在地表的地理点：它是"太阳正上方那一点"，随地球姿态改变而改变经度/纬度，
 *  但在屏幕上的位置恒定（始终朝向太阳）。 */
export function subsolarLatLon(basis, sun) {
  const local = [
    sun[0] * basis.e2[0] + sun[1] * basis.e2[1] + sun[2] * basis.e2[2],
    sun[0] * basis.axis[0] + sun[1] * basis.axis[1] + sun[2] * basis.axis[2],
    sun[0] * basis.e3[0] + sun[1] * basis.e3[1] + sun[2] * basis.e3[2],
  ];
  const len = Math.hypot(local[0], local[1], local[2]) || 1;
  const lat = (Math.asin(local[1] / len) * 180) / Math.PI;
  const lon = (Math.atan2(local[2], local[0]) * 180) / Math.PI;
  return { lat, lon };
}

const fmtLat = (v) => `${Math.abs(v).toFixed(1)}° ${v >= 0 ? 'N' : 'S'}`;
const fmtLon = (v) => `${Math.abs(v).toFixed(1)}° ${v >= 0 ? 'E' : 'W'}`;

/** 屏幕点 → 球面经纬度。供"拖动选择位置"使用；只在前半球有效，超出轮廓贴到边缘。 */
export function screenToLatLon(px, py, basis) {
  // px/py 为相对球心、以球半径为 1 的归一化坐标（y 向上）
  const len = Math.hypot(px, py);
  let nx = px;
  let ny = py;
  if (len > 0.999) { nx = (px / len) * 0.999; ny = (py / len) * 0.999; }
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const local = [
    nx * basis.e2[0] + ny * basis.axis[0] + nz * basis.e3[0],
    nx * basis.e2[1] + ny * basis.axis[1] + nz * basis.e3[1],
    nx * basis.e2[2] + ny * basis.axis[2] + nz * basis.e3[2],
  ];
  const l = Math.hypot(local[0], local[1], local[2]) || 1;
  return {
    lat: (Math.asin(local[1] / l) * 180) / Math.PI,
    lon: (Math.atan2(local[2], local[0]) * 180) / Math.PI,
  };
}

export function createScene(sceneRenderer) {
  const today=new Date(),year=today.getFullYear(),day=calendarDay(year,today.getMonth()+1,today.getDate());
  const state = {
  year,day,
  spin: SPIN_INIT,
  phase: (day-1)/(daysInYear(year)-1), // Calendar position, inclusive endpoints.
  sun: SUN.slice(),              // 当前太阳方向（随季节变化，自转/选点不变）
  tilt: TILT_INIT,
  zoom: 1,                       // 相机缩放（测量视角用）
  focus: { x: GLOBE_CENTER.x, y: GLOBE_CENTER.y },   // 相机对准的逻辑坐标
  measuring: false,
};

  /* ---------- 投影：逻辑坐标 <-> 舞台坐标（唯一真源） ----------
     画布恒以 GLOBE_CENTER 为中心（CSS left/top + translate(-50%,-50%)），
     shader 在画布内按 (p − focus)·zoom 绘制。因此：
       stage = (p − focus)·zoom + GLOBE_CENTER
     之前标记层用的是「+ 舞台中心 (800,450)」，与画布中心 (781,324) 差 (19,126)，
     导致标记、测量弧、直射点全部偏移 126px；反向换算又没这个偏移，往返不自洽。 */
  const rotateView = (n) => {
    const c=Math.cos(state.roll||0),s=Math.sin(state.roll||0);
    return [c*n[0]-s*n[1],s*n[0]+c*n[1],n[2]];
  };
  const rotatePoint = p => {
    const n=rotateView([p.x-GLOBE_CENTER.x,GLOBE_CENTER.y-p.y,0]);
    return {...p,x:GLOBE_CENTER.x+n[0],y:GLOBE_CENTER.y-n[1]};
  };
  const toStage = p => {const q=rotatePoint(p);return {
    x:(q.x-state.focus.x)*state.zoom+GLOBE_CENTER.x,
    y:(q.y-state.focus.y)*state.zoom+GLOBE_CENTER.y,visible:p.visible};};
  const fromStage = (sx,sy) => {
    const x=(sx-GLOBE_CENTER.x)/state.zoom+state.focus.x-GLOBE_CENTER.x;
    const y=GLOBE_CENTER.y-((sy-GLOBE_CENTER.y)/state.zoom+state.focus.y);
    const c=Math.cos(state.roll||0),s=Math.sin(state.roll||0);
    return {x:GLOBE_CENTER.x+c*x+s*y,y:GLOBE_CENTER.y-(-s*x+c*y)};
  };
  const viewBasis = b => ({axis:rotateView(b.axis),e2:rotateView(b.e2),e3:rotateView(b.e3)});

  let dirty = true;
  let pixelScale = 1;
  let debugMode = 0;

  const stage = document.getElementById('stage');
  const overviewZoom = Number(stage.dataset.overviewZoom) || 1;
  const overviewFocus = { x: GLOBE_CENTER.x,
    y: GLOBE_CENTER.y - (Number(stage.dataset.overviewOffsetY) || 0) / overviewZoom };
  state.zoom = overviewZoom;
  state.focus = { ...overviewFocus };
  const canvas = document.getElementById('globe');
  const axisLine = document.getElementById('axisLine');
  const axisGrip = document.getElementById('axisGrip');
  const timeline = document.getElementById('timeline');
  const ticks = document.getElementById('ticks');
  const caret = document.getElementById('caret');
  const spinValue = document.getElementById('spinValue');
  const tiltValue = document.getElementById('tiltValue');
  const seasons = [...document.querySelectorAll('.season')];
  const markers = [...document.querySelectorAll('[data-latlon], [data-subsolar]')];

  /* ---------- 舞台缩放 ---------- */
  function layout() {
    const viewScale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    document.documentElement.style.setProperty('--stage-scale', String(viewScale));

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    // 测量视角下画布要足够大以容纳放大后的球体与平移，且不跟随 dpr（软件光栅器下过慢）
    const cssSize = 1600;
    pixelScale = viewScale * dpr;
    const size = Math.max(64, Math.round(cssSize * pixelScale));
    canvas.width = size;
    canvas.height = size;
    // 两种入口的历史定位方式不同；统一把画布中心锚到球体逻辑中心。
    canvas.style.left = `${GLOBE_CENTER.x}px`;
    canvas.style.top = `${GLOBE_CENTER.y}px`;
    canvas.style.transform = 'translate(-50%, -50%)';
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    sceneRenderer.resize(size, size);
    dirty = true;
  }

  /* ---------- UI ---------- */
  function updateUI() {
    const basis = basisVectors(state.tilt, state.spin);

    const t = (state.tilt * Math.PI) / 180;
    const dir = { x: -Math.sin(t), y: -Math.cos(t) };   // 北极方向（CSS y 向下）
    const out = GLOBE_RADIUS * 1.10;
    const inn = GLOBE_RADIUS * 1.06;
    axisLine.setAttribute('x1', String(GLOBE_CENTER.x - dir.x * inn));
    axisLine.setAttribute('y1', String(GLOBE_CENTER.y - dir.y * inn));
    axisLine.setAttribute('x2', String(GLOBE_CENTER.x + dir.x * out));
    axisLine.setAttribute('y2', String(GLOBE_CENTER.y + dir.y * out));

    axisGrip.style.left = GLOBE_CENTER.x + dir.x * out + 'px';
    axisGrip.style.top = GLOBE_CENTER.y + dir.y * out + 'px';
    axisGrip.setAttribute('aria-valuenow', state.tilt.toFixed(1));

    // 标记：直射点由固定太阳方向换算；其余是固定地理点，随地球自转、转到背面自动隐藏
    for (const el of markers) {
      if (el.dataset.subsolar !== undefined) {
        const { lat, lon } = subsolarLatLon(basis, SUN);
        const p = projectLatLon(lat, lon, basis);
        const st = toStage(p);
        el.style.left = st.x + 'px';
        el.style.top = st.y + 'px';
        el.hidden = false;                       // 太阳方向固定 ⇒ 直射点始终朝向观察者
        const latEl = el.querySelector('[data-lat]');
        const lonEl = el.querySelector('[data-lon]');
        if (latEl) latEl.textContent = fmtLat(lat);
        if (lonEl) lonEl.textContent = fmtLon(lon);
        continue;
      }
      const lat = Number(el.dataset.latlon.split(',')[0]);
      const lon = Number(el.dataset.latlon.split(',')[1]);
      const p = projectLatLon(lat, lon, basis);
      const st = toStage(p);
      el.style.left = st.x + 'px';
      el.style.top = st.y + 'px';
      el.hidden = !p.visible;
    }

    const frac = state.phase;
    // 四季分段：以节气为中心取最近的一季
    const modelPhase=((state.day+284)/daysInYear(state.year))%1;
    const idx=Math.floor(((modelPhase+.125)%1)*4);
    seasons.forEach((el,i)=>{el.setAttribute('data-active',String(i===idx));const anchor=(1+i*.25)*daysInYear(state.year)-284;el.style.left=((anchor-1)/(daysInYear(state.year)-1)*100)+'%';});
    const selectedDate=document.getElementById('selectedDate');
    if(selectedDate){const parts=dateFromDay(state.year,state.day).split('-');selectedDate.textContent=Number(parts[1])+'\u6708'+Number(parts[2])+'\u65e5';}
    timeline.setAttribute('aria-valuetext',dateFromDay(state.year,state.day));
    timeline.dataset.model=SOLAR_MODEL_VERSION;

    const px = Math.min(1, Math.max(0, frac)) * 100;
    caret.style.left = px + '%';
    timeline.setAttribute('aria-valuenow', String(Math.round(px)));

    spinValue.textContent = Math.round(((state.spin % 360) + 360) % 360) + '°';
    const delta = subsolarNow(basis).lat;      // 实际呈现的直射纬度
    tiltValue.textContent = `${delta >= 0 ? 'N' : 'S'}${Math.abs(delta).toFixed(1)}°`;
    return basis;
  }

  /** 当前姿态下太阳直射点的经纬度 */
  function subsolarNow(basis, sun = state.sun) {
    const local = [
      sun[0] * basis.e2[0] + sun[1] * basis.e2[1] + sun[2] * basis.e2[2],
      sun[0] * basis.axis[0] + sun[1] * basis.axis[1] + sun[2] * basis.axis[2],
      sun[0] * basis.e3[0] + sun[1] * basis.e3[1] + sun[2] * basis.e3[2],
    ];
    const l = Math.hypot(local[0], local[1], local[2]) || 1;
    return {
      lat: (Math.asin(local[1] / l) * 180) / Math.PI,
      lon: (Math.atan2(local[2], local[0]) * 180) / Math.PI,
    };
  }

  /** 让所选点与太阳直射点落在同一条经线上：把直射点经度对齐到所选点经度。
   *  自转角增加 s 会使局部经度整体减少 s，故 s = lon_sub(0) − lon_selected。 */
  function alignToSelected() {
    if (!picker) return;
    const [latP, lonP] = picker.dataset.latlon.split(',').map(Number);
    const lonSub0 = subsolarNow(basisVectors(state.tilt, 0)).lon;
    let s = lonSub0 - lonP;
    s = ((s + 540) % 360) - 180;            // 取最短转向
    state.spin = s;
    dirty = true;
  }

  /** 设置年相位：同步更新地轴倾角（地轴姿态是派生量，不是用户直接控制的物理量） */
  function setPhase(phase) {
    if (state.measuring) return;
    camAnim = null;stage.classList.remove('aligning-point');
    const d=daysInYear(state.year);
    state.day=1+Math.round(Math.min(1,Math.max(0,phase))*(d-1));
    state.phase=(state.day-1)/(d-1);
    state.sun=SUN;
    state.tilt=tiltFromSubsolarLat(declination(state.year,state.day),SUN);

    alignToSelected();          // 换季后仍与所选点同经线
    dirty = true;
  }

  /** 直接设定地轴倾角（拖手柄用）：反解出最接近当前相位的年相位 */
  function setTiltFromPose(tiltDeg) {
    if (state.measuring) return;
    const target=subsolarLatLon(basisVectors(tiltDeg,0),SUN).lat;
    let best=state.day,error=Infinity;
    for(let n=1;n<=daysInYear(state.year);n++){
      const diff=Math.abs(declination(state.year,n)-target)+Math.abs(n-state.day)*1e-8;
      if(diff<error){best=n;error=diff;}
    }
    setPhase((best-1)/(daysInYear(state.year)-1));
  }

  function setSpin(value) {
    if (state.measuring) return;
    state.spin = value;
    dirty = true;
  }

  /* ---------- 自转：球面拖动 ---------- */
  canvas.tabIndex = 0;
  axisGrip.tabIndex = -1;
  axisGrip.setAttribute('aria-hidden', 'true');
  let clickStart = null;
  canvas.addEventListener('pointerdown', (ev) => {
    if (state.measuring) return;
    clickStart = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointerup', (ev) => {
    const start = clickStart; clickStart = null;
    if (state.measuring || !start || Math.hypot(ev.clientX-start.x, ev.clientY-start.y)>6) return;
    const rect = stage.getBoundingClientRect();
    const scale = rect.width / STAGE_W;
    const point = fromStage((ev.clientX-rect.left)/scale, (ev.clientY-rect.top)/scale);
    const nx = (point.x-GLOBE_CENTER.x)/GLOBE_RADIUS;
    const ny = (GLOBE_CENTER.y-point.y)/GLOBE_RADIUS;
    if (nx*nx+ny*ny>1 || !picker) return;
    const {lat,lon} = screenToLatLon(nx,ny,basisVectors(state.tilt,state.spin));
    picker.dataset.latlon = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const before = state.spin;
    alignToSelected();
    const targetSpin = state.spin; state.spin = before;
    stage.classList.add('aligning-point','has-selection');
    picker.querySelector('.geo-ring')?.animate([{scale:'1'},{scale:'1.5'},{scale:'1'}],{duration:400});
    animateCamera({zoom:state.zoom,fx:state.focus.x,fy:state.focus.y,spin:targetSpin,observation:0},1400);
    paintPicker(); updateUI();
  });
  canvas.addEventListener('pointercancel',()=>{clickStart=null;});

  let dragTimeline = false;
  function tiltFromClientX(clientX) {
    const rect = timeline.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setPhase(frac);          // 年轴 = 季节控制
    updateUI();
  }
  timeline.addEventListener('pointerdown', (ev) => {
    if (state.measuring) return;      // 测量镜头内不响应
    dragTimeline = true;
    timeline.setPointerCapture(ev.pointerId);
    tiltFromClientX(ev.clientX);
  });
  timeline.addEventListener('pointermove', (ev) => { if (dragTimeline && !state.measuring) tiltFromClientX(ev.clientX); });
  const endTimeline = () => { dragTimeline = false; };
  timeline.addEventListener('pointerup', endTimeline);
  timeline.addEventListener('pointercancel', endTimeline);
  timeline.addEventListener('keydown', (ev) => {
    if (state.measuring) return;      // 测量镜头内不响应
    const step = ev.shiftKey ? 5 : 1;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { setPhase(state.phase + step / (daysInYear(state.year)-1)); updateUI(); ev.preventDefault(); }
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { setPhase(state.phase - step / (daysInYear(state.year)-1)); updateUI(); ev.preventDefault(); }
  });

  /* ---------- 选择位置：拖动白色圆环（两版共用） ---------- */
  const picker = document.querySelector('[data-selectable]');
  const latOut = document.getElementById('selectedLat');
  const lonOut = document.getElementById('selectedLon');
  let picking = false;

  function paintPicker() {
    if (!picker || !latOut || !lonOut) return;
    const [lat, lon] = picker.dataset.latlon.split(',').map(Number);
    latOut.textContent = fmtLat(lat);
    lonOut.textContent = fmtLon(lon);
    const label = picker.querySelector('.geo-label i');
    if (label) label.textContent = `${fmtLat(lat)}, ${fmtLon(lon)}`;
  }

  if (picker) { picker.style.pointerEvents = 'none'; paintPicker(); }

  const R_EARTH_KM = 6371;
  function measureArc() {
    if (!picker) return null;
    const basis = basisVectors(state.tilt, state.spin);
    const sub = subsolarNow(basis);
    const [latP, lonP] = picker.dataset.latlon.split(',').map(Number);
    const map = toStage;
    const pts = [];
    const N = 28;
    for (let i = 0; i <= N; i += 1) {
      pts.push(map(projectLatLon(sub.lat + ((latP - sub.lat) * i) / N, lonP, basis)));
    }
    const deltaDeg = Math.abs(latP - sub.lat);
    return {
      pts,
      deltaDeg,
      km: (deltaDeg * Math.PI / 180) * R_EARTH_KM,
      radiusKm: R_EARTH_KM,
      subLat: sub.lat,
      selLat: latP,
      selLon: lonP,
      sub: map(projectLatLon(sub.lat, lonP, basis)),
      sel: map(projectLatLon(latP, lonP, basis)),
    };
  }

  function centreOnTwoPoints() {   // 供旧调用方保留
    const basis = basisVectors(state.tilt, state.spin);
    const sub = subsolarNow(basis);
    const [latP, lonP] = picker.dataset.latlon.split(',').map(Number);
    const a = projectLatLon(sub.lat, lonP, basis);
    const b = projectLatLon(latP, lonP, basis);
    // 把两点中点对到舞台中心偏上一点，确保两点都完整在画面内
    state.focus = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  /* 运镜过渡：缩放与焦点用缓动插值，避免硬切 */
  let camAnim = null;
  function animateCamera(to, ms = 1600) {
    const from = { zoom: state.zoom, fx: state.focus.x, fy: state.focus.y, spin: state.spin, observation: state.observation || 0, roll:state.roll||0, gridOnly:state.gridOnly||0 };
    camAnim = { from, to, t0: performance.now(), ms };
  }
  function stepCamera(now) {
    if (!camAnim) return false;
    const k = Math.min(1, (now - camAnim.t0) / camAnim.ms);
    const e = k * k * k * (k * (k * 6 - 15) + 10);   // smootherstep: zero velocity and acceleration at both ends
    state.observation = camAnim.from.observation + ((camAnim.to.observation ?? camAnim.from.observation) - camAnim.from.observation) * e;
    for(const key of ['roll','gridOnly']) state[key]=camAnim.from[key]+((camAnim.to[key]??camAnim.from[key])-camAnim.from[key])*e;
    state.zoom = camAnim.from.zoom + (camAnim.to.zoom - camAnim.from.zoom) * e;
    if (camAnim.to.spin !== undefined) {
      // 朝向也一起平滑过渡（走最短角度）
      let d = camAnim.to.spin - camAnim.from.spin;
      d = ((d + 540) % 360) - 180;
      state.spin = camAnim.from.spin + d * e;
    }
    state.focus = {
      x: camAnim.from.fx + (camAnim.to.fx - camAnim.from.fx) * e,
      y: camAnim.from.fy + (camAnim.to.fy - camAnim.from.fy) * e,
    };
    dirty = true;
    updateUI();
    if (k >= 1) { camAnim = null; stage.classList.remove('aligning-point'); }
    return true;
  }

  function enterMeasure() {
    state.measuring = true;
    stage.classList.add('is-measuring');
    window.dispatchEvent(new Event('globe-mode-change'));
    const spinBefore = state.spin;
    alignToSelected();
    const spinAligned = state.spin;
    state.spin = spinBefore;            // 先还原，让运镜把朝向一起过渡过去
    // 按两点实际间距决定缩放：固定 1.75× 在高纬/跨赤道等情况下会把某一点裁掉
    const basis = basisVectors(state.tilt, spinAligned);
    const sub = subsolarNow(basis);
    const [latP, lonP] = picker ? picker.dataset.latlon.split(',').map(Number) : [0, 0];
    const a = projectLatLon(sub.lat, lonP, basis);
    const b = projectLatLon(latP, lonP, basis);
    const targetZoom = Math.min(1.65, 560 / Math.max(Math.abs(a.y - b.y), 1));
    const dy = (a.y - b.y) * targetZoom;
    const dx = (a.x - b.x) * targetZoom;
    const targetX = Math.max(150 - Math.min(0, dx), Math.min(780 - Math.max(0, dx), 650));
    const targetY = Math.max(150 - Math.min(0, dy), Math.min(700 - Math.max(0, dy), 540));
    const targetFocus = { x: b.x - (targetX - GLOBE_CENTER.x) / targetZoom,
      y: b.y - (targetY - GLOBE_CENTER.y) / targetZoom };
    // Preserve the complete globe within the left viewing region while prioritizing the selected point.
    const cx = (GLOBE_CENTER.x - targetFocus.x) * targetZoom + GLOBE_CENTER.x;
    const cy = (GLOBE_CENTER.y - targetFocus.y) * targetZoom + GLOBE_CENTER.y;
    targetFocus.x += (cx - Math.max(350, Math.min(430, cx))) / targetZoom;
    targetFocus.y += (cy - Math.max(410, Math.min(460, cy))) / targetZoom;
    animateCamera({ zoom: targetZoom, fx: targetFocus.x, fy: targetFocus.y, spin: spinAligned, observation: 1 });
    updateUI();
    dirty = true;
  }
  function exitMeasure() {
    state.measuring = false;
    stage.classList.remove('is-measuring');
    window.dispatchEvent(new Event('globe-mode-change'));
    animateCamera({ zoom: overviewZoom, fx: overviewFocus.x, fy: overviewFocus.y, observation: 0 });
    updateUI();
    dirty = true;
  }

  /* ---------- 年轴刻度 ---------- */
  (function buildTicks() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 97; i += 1) {
      const el = document.createElement('i');
      if (i % 8 === 0) el.className = 'major';
      frag.append(el);
    }
    ticks.replaceChildren(frag);
  })();

  /* ---------- 渲染循环 ---------- */
  function frame() {
    stepCamera(performance.now());
    if (dirty) {
      const basis = basisVectors(state.tilt, state.spin);
      sceneRenderer.draw({
        basis: viewBasis(basis),
        sun: rotateView(state.sun),
        tilt: state.tilt,
        spin: state.spin,
        center: GLOBE_CENTER,
        radius: GLOBE_RADIUS,
        radiusPx: GLOBE_RADIUS * pixelScale,
        pxPerLogical: pixelScale,
        sizePx: canvas.width,
        debug: debugMode,
        zoom: state.zoom,
        focus: state.focus,
        observation: state.observation || 0,
        gridOnly: state.gridOnly || 0,
      });
      window.dispatchEvent(new Event('globe-frame'));
      dirty = false;
    }
    requestAnimationFrame(frame);
  }

  // 异步资源（贴图等）到达后必须重绘一次，否则会一直停在首帧的兜底画面
  window.addEventListener('globe-texture-ready', () => { dirty = true; });

  setPhase(state.phase);
  const ok = sceneRenderer.init(canvas);
  layout();
  updateUI();
  window.addEventListener('resize', layout);
  requestAnimationFrame(frame);

  return {
    ok,
    canvas,
    stage,
    get spin() { return state.spin; },
    get tilt() { return state.tilt; },
    set spin(v) { setSpin(v); updateUI(); },
    set tilt(v) { setTiltFromPose(v); updateUI(); },
    set debugMode(v) { debugMode = Number(v); dirty = true; },
    redraw() { dirty = true; },
    basis() { return basisVectors(state.tilt, state.spin); },
    refresh() { updateUI(); dirty = true; },
    enterMeasure,
    exitMeasure,
    get calculating() { return Boolean(state.calculating); },
    enterCalculation() {
      if (!state.measuring || state.calculating) return;
      state.observationCamera = { zoom:state.zoom, fx:state.focus.x, fy:state.focus.y, observation:1,roll:state.roll||0,gridOnly:0 };
      state.calculating = true;
      stage.classList.add('is-calculating');
      animateCamera({zoom:2.8,fx:GLOBE_CENTER.x+(GLOBE_CENTER.x-280)/2.8,
        fy:GLOBE_CENTER.y+(GLOBE_CENTER.y-800)/2.8,observation:1,gridOnly:1,roll:Math.atan2(state.sun[0],state.sun[1])},2000);
      window.dispatchEvent(new Event('globe-mode-change'));
    },
    exitCalculation() {
      if (!state.calculating) return;
      state.calculating = false;
      stage.classList.remove('is-calculating');
      animateCamera(state.observationCamera,1800);
      window.dispatchEvent(new Event('globe-mode-change'));
    },
    measureArc,
    centralAngle() {
      const basis = basisVectors(state.tilt, state.spin);
      const sub = subsolarNow(basis);
      const [lat, lon] = picker.dataset.latlon.split(',').map(Number);
      const a = projectLatLon(sub.lat, sub.lon, basis);
      const b = projectLatLon(lat, lon, basis);
      const dot = a.normal.reduce((sum, v, i) => sum + v * b.normal[i], 0);
      const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
      const sin = Math.sin(theta);
      const project = (normal, radius) => toStage({
        x: GLOBE_CENTER.x + normal[0] * GLOBE_RADIUS * radius,
        y: GLOBE_CENTER.y - normal[1] * GLOBE_RADIUS * radius,
      });
      const interpolate = (t) => {
        if (theta < 1e-7) return a.normal;
        const wa = Math.sin((1 - t) * theta) / sin;
        const wb = Math.sin(t * theta) / sin;
        return a.normal.map((v, i) => wa * v + wb * b.normal[i]);
      };
      return {
        center: toStage(GLOBE_CENTER), from: toStage(a), to: toStage(b),
        degrees: theta * 180 / Math.PI,
        arc: Array.from({ length: 33 }, (_, i) => project(interpolate(i / 32), .30)),
        label: project(interpolate(.5), .43),
      };
    },
    get measuring() { return state.measuring; },
    get observationDate(){return dateFromDay(state.year,state.day);},
    set observationDate(value){
      if(state.measuring)return;
      const [year,month,day]=String(value).split('-').map(Number);
      const n=calendarDay(year,month,day);state.year=year;
      setPhase((n-1)/(daysInYear(year)-1));updateUI();
    },
    get solarModel(){return {version:SOLAR_MODEL_VERSION,year:state.year,day:state.day,days:daysInYear(state.year),declination:declination(state.year,state.day)};},
    get phase() { return state.phase; },
    set phase(v) { setPhase(v); updateUI(); },
    get subsolarLat() { return subsolarNow(basisVectors(state.tilt, state.spin)).lat; },
    get axisTilt() { return state.tilt; },
    R_EARTH_KM,
    limits: { tiltMin: TILT_MIN, tiltMax: TILT_MAX },
    get sun() { return rotateView(state.sun); },
    ready: () => Boolean(ok),
    /** 同步渲染一帧并读回像素（自动化用，避免开 preserveDrawingBuffer） */
    sample(x, y) {
      frameDraw();
      const gl = sceneRenderer.gl();
      if (!gl) return null;
      const px = new Uint8Array(4);
      gl.readPixels(Math.round(x), Math.round(canvas.height - y), 1, 1,
                    gl.RGBA, gl.UNSIGNED_BYTE, px);
      return [px[0], px[1], px[2], px[3]];
    },
    size: () => [canvas.width, canvas.height],
    projectLatLon: (lat, lon) => {const p=projectLatLon(lat,lon,basisVectors(state.tilt,state.spin));return {...rotatePoint(p),normal:rotateView(p.normal)};},
    /** 相机投影参数（逻辑坐标）：光束等装饰层需要与真实渲染的球心、半径、直射点同源，
     *  避免把参考图里的角度写死，也保证运镜过程中自动跟随。 */
    /** 相机投影（舞台逻辑坐标）：装饰层必须按**画布实际位置**换算，
     *  否则会和标记层里那套 (p−focus)·zoom + 舞台中心的写法差出 (19,126) 像素——
     *  球心明明在 (781,324)，按舞台中心算会得到 (800,450)，光束就会绕错点。 */
    camera: () => {
      const sr = stage.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      const scale = sr.width / STAGE_W || 1;
      const cc = {
        x: (cr.left + cr.width / 2 - sr.left) / scale,
        y: (cr.top + cr.height / 2 - sr.top) / scale,
      };
      const b = basisVectors(state.tilt, state.spin);
      const sub = subsolarNow(b);
      const sp = toStage(projectLatLon(sub.lat, sub.lon, b));
      return {
        roll:state.roll||0,gridOnly:state.gridOnly||0,
        zoom: state.zoom,
        focus: { x: state.focus.x, y: state.focus.y },
        centre: toStage(GLOBE_CENTER),
        // 画布 CSS 尺寸与舞台逻辑单位 1:1（球体在画布内半径恰为 GLOBE_RADIUS），
        // 所以屏幕半径只随 zoom 变化，不要再乘画布/逻辑的比值。
        radius: GLOBE_RADIUS * state.zoom,
        subsolar: { lat: sub.lat, lon: sub.lon, x: sp.x, y: sp.y },
      };
    },
  };

  function frameDraw() {
    sceneRenderer.draw({
      basis: viewBasis(basisVectors(state.tilt, state.spin)),
      sun: rotateView(state.sun),
      tilt: state.tilt,
      spin: state.spin,
      center: GLOBE_CENTER,
      radius: GLOBE_RADIUS,
      radiusPx: GLOBE_RADIUS * pixelScale,
      pxPerLogical: pixelScale,
      sizePx: canvas.width,
      debug: debugMode,
      zoom: state.zoom,
      focus: state.focus,
      observation: state.observation || 0,
        gridOnly: state.gridOnly || 0,
    });
  }
}

/** 通用 WebGL 立四边形 + 编译着色器的小工具，两个渲染器共用。 */
export function createGL(canvas, fragSrc, vertSrc) {
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: true, premultipliedAlpha: true, depth: false,
  });
  if (!gl) return null;
  gl.getExtension('OES_standard_derivatives');

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
    }
    return sh;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'link failed');
  }
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return { gl, program };
}

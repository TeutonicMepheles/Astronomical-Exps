(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const steps = ["设置条件", "开始实验", "观察现象", "记录数据", "核对规律"];
  const legacyIds = new Set(["impact", "eclipse"]);
  const experiments = [
    { id: "foucault", icon: "◌", color: "#dff4ff", name: "傅科摆模拟", short: "从摆动平面的偏转发现地球自转", objective: "先在地球上选择地点，再设置摆长、摆锤质量和观测速度，比较偏转规律。", action: "开始模拟" },
    { id: "crater", icon: "◒", color: "#fde293", name: "环形山高度测量", short: "用影长和太阳高度角完成三角测量", objective: "拖动标尺测量影长，再用 h = s × tan(α) 反推山高。", action: "开始测量" },
    { id: "impact", icon: "✦", color: "#ffae9d", name: "陨石撞击模拟", short: "比较质量、速度和角度如何改变陨石坑", objective: "保留原版 Three.js 撞击与成坑过程。", action: "进入 3D 实验" },
    { id: "eclipse", icon: "◐", color: "#bbb1ff", name: "日月食原理演示", short: "同步观察天体位置、影锥与地面视角", objective: "保留原版 Three.js 多视角日食时间轴。", action: "进入 3D 实验" },
    { id: "eratosthenes", icon: "◍", color: "#b2ffb1", name: "地球周长测量", short: "复现埃拉托色尼的影子测地法", objective: "由两地纬度差和地表弧长，估算地球周长。", action: "观察影子" },
    { id: "pollution", icon: "✧", color: "#8acaff", name: "光污染与星空", short: "寻找兼顾照明与暗夜保护的方案", objective: "比较波特尔等级、灯罩和色温对可见星数的影响。", action: "记录观察" },
    { id: "telescope", icon: "⌁", color: "#dff4ff", name: "牛顿反射望远镜", short: "沿光路理解焦距、倍率与视场", objective: "让平行光走过主镜、副镜和目镜，并观察目标缩放。", action: "播放光路" },
    { id: "rocket", icon: "↟", color: "#ffa47a", name: "火箭发射实验", short: "用推重比和燃料解释火箭飞行", objective: "先判断能否起飞，再从曲线读取燃料耗尽与最高点。", action: "发射火箭" }
  ];

  const cities = [
    ["赤道", 0, 0], ["新加坡", 1.3, 103.8], ["广州", 23.1, 113.3], ["开罗", 30, 31.2], ["南京", 32.1, 118.8],
    ["北京", 39.9, 116.4], ["巴黎", 48.9, 2.4], ["莫斯科", 55.8, 37.6], ["摩尔曼斯克", 69, 33.1], ["北极点", 90, 0]
  ];
  const earthCities = [["亚历山大", 31.2], ["北京", 39.9], ["莫斯科", 55.8], ["新加坡", 1.3], ["自定义", 25]];
  const bortle = [
    [1, "极佳暗空", 6000], [2, "典型暗空", 4500], [3, "乡村天空", 3000], [4, "乡村 / 郊区", 2000], [5, "郊区", 1200],
    [6, "明亮郊区", 600], [7, "郊区 / 城市", 200], [8, "城市天空", 80], [9, "市中心", 20]
  ];
  const targetInfo = {
    "月球": { size: .5, base: 54, kind: "moon" }, "土星": { size: .011, base: 10, kind: "saturn" },
    "木星": { size: .0125, base: 12, kind: "jupiter" }, "猎户座星云": { size: 1.08, base: 44, kind: "nebula" },
    "仙女座星系": { size: 3.17, base: 68, kind: "galaxy" }
  };

  const root = document.getElementById("root");
  const progressKey = "astral-lab-progress-v2";
  const progress = loadProgress();
  let current = null;
  let values = {};
  let phase = 0;
  let running = false;
  let answerOpen = false;
  let knowledgeOpen = false;
  let raf = 0;
  let lastFrame = 0;
  let simTime = 0;
  let toastTimer = 0;
  let measure = null;
  let rocket = null;
  let rocketHistory = [];
  let foucaultTrail = [];
  let foucaultView = newFoucaultView();

  function newFoucaultView() { return { mode: "globe", yaw: -1.35, pitch: .28, drag: null, transition: null }; }

  function loadProgress() { try { return JSON.parse(localStorage.getItem(progressKey)) || {}; } catch { return {}; } }
  function saveProgress() { localStorage.setItem(progressKey, JSON.stringify(progress)); }
  function complete(id = current.id) { progress[id] = "complete"; saveProgress(); }
  function completedCount() { return experiments.filter(e => progress[e.id] === "complete").length; }
  function esc(value) { return String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
  function fmt(value, digits = 1) { return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits }); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function defaults(id) {
    const map = {
      foucault: { city: 5, length: 30, mass: 28, speedMode: "earth", speed: 3600 },
      crater: { angle: 45, model: "A" },
      eratosthenes: { day: 172, city: 0, customLat: 25 },
      pollution: { level: 4, shield: "全截罩", temp: 3000 },
      telescope: { focal: 800, eyepiece: 10, target: "月球" },
      rocket: { body: 20, thrust: 1500, payload: 2, fuel: 50 }
    };
    return { ...(map[id] || {}) };
  }

  function shell(content) {
    return `<div class="app-shell"><div class="stage">${content}<div id="toast" class="toast" role="status" aria-live="polite"></div></div></div>
      <div class="low-screen" role="alert"><div><i aria-hidden="true">▣</i><h1>请使用更大的屏幕</h1><p>互动实验需要至少 1024 × 600 的显示区域，适合教室大屏或电脑浏览器。</p></div></div>`;
  }

  function topbar(showProgress = true) {
    return `<header class="topbar"><button class="brand brand-button" data-home aria-label="返回实验地图"><span class="brand-mark" aria-hidden="true">✦</span><span>星图实验室</span></button>
      <div class="top-actions">${showProgress ? `<div class="progress-chip"><span>探索进度</span><b>${completedCount()} / 8</b></div>` : ""}<button class="icon-button" id="soundButton" aria-label="切换提示音" title="切换提示音">♬</button></div></header>`;
  }

  function renderHome() {
    stopLoop(); current = null;
    const cards = experiments.map((e, i) => {
      const state = progress[e.id] === "complete" ? "complete" : progress[e.id] === "progress" ? "progress" : "new";
      const label = state === "complete" ? "已完成" : state === "progress" ? "继续实验" : legacyIds.has(e.id) ? "原版 3D" : "开始探索";
      return `<button class="exp-card" data-open="${e.id}" style="--card-color:${e.color}" aria-label="进入实验 ${i + 1}：${e.name}">
        <span class="card-number">实验 ${String(i + 1).padStart(2, "0")}</span><span class="card-icon" aria-hidden="true">${e.icon}</span><h2>${e.name}</h2>
        <p>${e.short}</p><span class="card-status ${state}">${label}</span></button>`;
    }).join("");
    root.innerHTML = shell(`<section class="screen home-screen">${topbar()}<div class="home-intro"><div><p class="eyebrow">ASTRONOMY · INTERACTIVE LAB</p><h1>把八个天文问题，变成亲手完成的实验。</h1></div><p>先预测，再操作、记录与核对。所有实验离线可用，适合 5—9 年级课堂大屏。</p></div><nav class="home-grid" aria-label="八个实验导航">${cards}</nav></section>`);
    root.querySelectorAll("[data-open]").forEach(button => button.addEventListener("click", () => openExperiment(button.dataset.open)));
    bindCommon();
  }

  function openExperiment(id) {
    current = experiments.find(e => e.id === id);
    if (!current) return;
    progress[id] = progress[id] || "progress"; saveProgress();
    if (legacyIds.has(id)) { renderLegacy(); return; }
    values = defaults(id); phase = 0; running = false; answerOpen = false; knowledgeOpen = false; simTime = 0; measure = null; rocket = null; foucaultTrail = [];
    if (id === "foucault") foucaultView = newFoucaultView();
    renderExperiment();
  }

  function renderLegacy() {
    stopLoop();
    const index = experiments.indexOf(current) + 1;
    root.innerHTML = shell(`<section class="screen legacy-screen">${topbar()}<div class="experiment-heading"><button class="button white compact" data-home>← 实验地图</button><div><p class="eyebrow">实验 ${String(index).padStart(2, "0")} · 原版 THREE.JS</p><h1>${current.name}</h1></div><p>${current.short}</p></div>
      <div class="legacy-frame-wrap"><iframe src="./legacy-three/index.html#${current.id}" title="${current.name} Three.js 互动实验" allow="fullscreen"></iframe></div></section>`);
    complete(current.id); bindCommon();
  }

  function renderExperiment() {
    stopLoop();
    const index = experiments.indexOf(current) + 1;
    const stepHtml = steps.map((label, i) => `<div class="step ${i < phase ? "done" : i === phase ? "active" : ""}"><i>${i + 1}</i><span>${label}</span></div>`).join("");
    root.innerHTML = shell(`<section class="screen experiment-screen">${topbar()}<div class="experiment-heading"><button class="button white compact" data-home>← 实验地图</button><div><p class="eyebrow">实验 ${String(index).padStart(2, "0")}</p><h1>${current.name}</h1></div><p>${current.short}</p></div>
      <div class="steps" aria-label="实验步骤">${stepHtml}</div><div class="lab-grid"><aside class="control-panel" aria-label="实验条件"><div><p class="panel-kicker">实验条件</p><h2>${current.objective}</h2></div>${controlsHtml()}
      <div class="knowledge"><button id="knowledgeButton" aria-expanded="${knowledgeOpen}"><span>知识卡片</span><b>${knowledgeOpen ? "收起 −" : "展开 +"}</b></button><div ${knowledgeOpen ? "" : "hidden"}>${knowledgeHtml()}</div></div>
      <div class="action-row"><button class="button purple wide" id="runButton">${primaryActionLabel()}</button><button class="button yellow" id="resetButton" aria-label="重置实验">↺</button>${hasAnswer() ? `<button class="button white" id="answerButton" aria-expanded="${answerOpen}">查看答案</button>` : ""}</div></aside>
      <section class="simulation-panel" aria-label="${current.name}模拟区域"><div class="sim-toolbar"><span><i></i>${simStatus()}</span><strong>${simPrompt()}</strong></div><div class="canvas-wrap"><canvas id="simulationCanvas" aria-label="${current.name}可交互画布"></canvas>${current.id === "foucault" ? `<button class="viewport-button" id="globeViewButton" ${foucaultView.mode === "globe" ? "hidden" : ""}>← 地球总览</button>` : ""}${answerOpen ? `<div class="answer-card" role="region" aria-label="实验答案"><button id="closeAnswer" aria-label="关闭答案">×</button>${answerHtml()}</div>` : ""}</div><div class="readout" id="readout"></div>${observationHtml()}</section></div></section>`);
    bindCommon(); bindExperiment(); resizeCanvas(); updateReadout(); draw(performance.now());
    if (running && ["foucault", "telescope", "rocket"].includes(current.id)) startLoop();
  }

  function chipGroup(label, key, options, formatter = String, wide = false) {
    return `<fieldset class="control-group"><legend>${label}</legend><div class="chip-row ${wide ? "wide-options" : ""}">${options.map((option, i) => {
      const raw = Array.isArray(option) ? option[0] : option;
      return `<button type="button" class="chip" data-key="${key}" data-index="${i}" data-raw="${esc(raw)}" aria-pressed="${String(values[key]) === String(raw)}">${formatter(option)}</button>`;
    }).join("")}</div></fieldset>`;
  }

  function controlsHtml() {
    if (current.id === "foucault") { const speeds = values.speedMode === "all" ? [1, 10, 60] : [60, 600, 3600]; return `${chipGroup("预设地点", "city", cities.map((c, i) => [i, c]), o => `<span>${o[1][0]}</span><small>${o[1][1]}°N</small>`, true)}<fieldset class="control-group"><legend>摆长</legend><div class="range-wrap"><input id="foucaultLength" type="range" min="5" max="100" step="1" value="${values.length}" aria-label="摆长"><output>${values.length} m</output></div></fieldset><fieldset class="control-group"><legend>摆锤质量</legend><div class="range-wrap"><input id="foucaultMass" type="range" min="1" max="100" step="1" value="${values.mass}" aria-label="摆锤质量"><output>${values.mass} kg</output></div></fieldset>${chipGroup("加速方式", "speedMode", [["earth", "仅地球自转"], ["all", "整体时间"]], o => o[1], true)}${chipGroup("观测速度", "speed", speeds, v => `${v}×`)}`; }
    if (current.id === "crater") return `<fieldset class="control-group"><legend>太阳高度角</legend><div class="range-wrap"><input id="angleRange" type="range" min="0" max="90" value="${values.angle}" aria-label="太阳高度角"><output>${values.angle}°</output></div><div class="chip-row quick-row">${[[5,"日出"],[30,"上午"],[60,"正午"],[45,"下午"]].map(([v,l]) => `<button class="chip" data-angle="${v}" aria-pressed="${values.angle === v}">${l} ${v}°</button>`).join("")}</div></fieldset>${chipGroup("环形山模型", "model", ["A", "B", "C"], v => `模型 ${v}`)}`;
    if (current.id === "eratosthenes") return `<fieldset class="control-group"><legend>日期</legend><div class="range-wrap"><input id="dayRange" type="range" min="1" max="365" value="${values.day}" aria-label="一年中的日期"><output>${dateLabel(values.day)}</output></div><div class="chip-row quick-row">${[[79,"春分"],[172,"夏至"],[265,"秋分"],[355,"冬至"]].map(([v,l]) => `<button class="chip" data-day="${v}" aria-pressed="${values.day === v}">${l}</button>`).join("")}</div></fieldset>${chipGroup("城市 B", "city", earthCities.map((c,i)=>[i,c]), o => `<span>${o[1][0]}</span><small>${o[1][1]}°N</small>`, true)}${values.city === 4 ? `<fieldset class="control-group"><legend>自定义纬度</legend><div class="range-wrap"><input id="customLat" type="range" min="-60" max="70" step=".1" value="${values.customLat}"><output>${values.customLat}°</output></div></fieldset>` : ""}`;
    if (current.id === "pollution") return `${chipGroup("波特尔暗空等级", "level", bortle.map(x => x[0]), v => `<span>${v} 级</span><small>${bortle[v - 1][1]}</small>`, true)}${chipGroup("灯罩类型", "shield", ["无灯罩", "全截罩", "半截罩", "球形罩"], String, true)}${chipGroup("灯光色温", "temp", [2200, 3000, 4000, 6500], v => `${v} K`)}`;
    if (current.id === "telescope") return `${chipGroup("主镜焦距", "focal", [400, 800, 1200, 2000], v => `${v} mm`)}${chipGroup("目镜焦距", "eyepiece", [25, 10, 5], v => `${v} mm`)}${chipGroup("观测目标", "target", Object.keys(targetInfo), String, true)}`;
    return `${chipGroup("箭体自重", "body", [2, 20, 50], v => `${v} t`)}${chipGroup("推进动力", "thrust", [300, 1500, 3000], v => `${v} kN`)}${chipGroup("载荷质量", "payload", [.1, 2, 10], v => `${v} t`)}${chipGroup("燃料质量", "fuel", [3, 50, 200], v => `${v} t`)}<div class="live-warning ${rocketTwr() > 1 ? "good" : "bad"}"><span>实时推重比</span><strong>${fmt(rocketTwr(), 2)}</strong><small>${rocketTwr() > 1 ? "可以起飞" : "小于 1，无法起飞"}</small></div>`;
  }

  function knowledgeHtml() {
    const content = {
      foucault: "摆动平面会尽量保持方向不变。整体时间加速会同时加快摆动和偏转；仅加速地球自转便于观察缓慢偏转。摆锤质量不会改变周期。",
      crater: "无法直接靠近的天体地形，也能通过光、影与相似三角形间接测量。角度越低，同一山体的影子越长。",
      eratosthenes: "太阳光近似平行。两地立杆的角度差等于地心夹角，这是把地面测量与整个地球连接起来的关键。",
      pollution: "蓝光波长短，在大气中散射更强。全截光灯罩把光送向需要照明的地面，而不是送向天空。",
      telescope: "牛顿式望远镜先由凹面主镜聚光，再由 45° 副镜把光转向侧面的目镜。倍率并非越大越好。",
      rocket: "推力先要战胜总重。燃料燃烧后火箭变轻，加速度会改变；燃料耗尽后仍会依靠惯性继续上升。"
    };
    return `<p>${content[current.id]}</p>`;
  }

  function hasAnswer() { return current.id !== "pollution"; }
  function primaryActionLabel() { if (current?.id === "foucault") { if (foucaultView.mode === "globe") return `前往${cities[values.city][0]}`; if (foucaultView.mode === "transition") return "镜头移动中…"; } return running ? "实验进行中…" : current.action; }
  function simStatus() { if (current.id === "rocket" && rocket?.done) return "飞行结束"; if (current.id === "foucault") { if (foucaultView.mode === "globe") return "地球总览"; if (foucaultView.mode === "transition") return "正在前往观测点"; } return running ? "正在观察" : "实验待命"; }
  function simPrompt() {
    if (current.id === "crater") return measure?.end ? "已测量，可纸笔计算" : "在阴影上拖动标尺";
    if (current.id === "pollution") return bestLighting() ? "找到推荐暗夜方案" : "一次只改变一个条件";
    if (current.id === "rocket") return rocketTwr() > 1 ? "推重比足够" : "请提高推力或减轻质量";
    if (current.id === "foucault") { if (foucaultView.mode === "globe") return "拖动地球，或从左侧选择地点"; if (foucaultView.mode === "transition") return `镜头正在飞近${cities[values.city][0]}`; return running ? `${values.speedMode === "all" ? "整体时间" : "仅地球自转"} ${values.speed}×` : "填写摆参数后开始模拟"; }
    return phase < 2 ? "设置条件后开始" : "观察并记录变化";
  }

  function observationHtml() {
    const prompts = {
      foucault: ["我记录的摆动周期", "我记录的偏转周期"], crater: ["我测得的影长", "我计算的山高"],
      eratosthenes: ["我记录的圆心角", "我估算的地球周长"], pollution: ["我记录的可见星数", "我的最佳照明方案"],
      telescope: ["我记录的倍率", "我观察到的视场变化"], rocket: ["我记录的最高高度", "本次能否起飞"]
    };
    const p = prompts[current.id];
    return `<div class="observation-bar"><div><span>实验记录</span><strong>${recordPrompt()}</strong></div><label>${p[0]}<input data-record placeholder="填写观察值"></label><label>${p[1]}<input data-record placeholder="写下发现"></label></div>`;
  }

  function recordPrompt() {
    const p = { foucault: "换一个城市重做，规律仍成立吗？", crater: "换一个角度重测，山高应保持不变。", eratosthenes: "把结果与 40,075 km 比较。", pollution: "能否既照亮地面又看见更多星？", telescope: "提高倍率后，视场发生了什么？", rocket: "再次发射会叠加一条对比曲线。" };
    return p[current.id];
  }

  function bindCommon() {
    root.querySelectorAll("[data-home]").forEach(b => b.addEventListener("click", renderHome));
    const sound = root.querySelector("#soundButton");
    if (sound) sound.addEventListener("click", () => { sound.classList.toggle("muted"); sound.textContent = sound.classList.contains("muted") ? "×" : "♬"; showToast(sound.classList.contains("muted") ? "提示音已关闭" : "提示音已开启"); });
  }

  function bindExperiment() {
    root.querySelectorAll("[data-key]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.key;
      if (current.id === "foucault" && key === "city") { values.city = Number(button.dataset.raw); resetRuntime(); renderExperiment(); focusFoucaultCity(); return; }
      if (current.id === "foucault" && key === "speedMode") { values.speedMode = button.dataset.raw; values.speed = values.speedMode === "all" ? 10 : 3600; resetRuntime(); renderExperiment(); return; }
      if (current.id === "eratosthenes" && key === "city") values[key] = Number(button.dataset.raw);
      else if (["length", "mass", "speed", "level", "temp", "focal", "eyepiece", "body", "thrust", "payload", "fuel"].includes(key)) values[key] = Number(button.dataset.raw);
      else values[key] = button.dataset.raw;
      resetRuntime(); renderExperiment();
    }));
    root.querySelectorAll("[data-angle]").forEach(b => b.addEventListener("click", () => { values.angle = Number(b.dataset.angle); measure = null; phase = 0; renderExperiment(); }));
    root.querySelectorAll("[data-day]").forEach(b => b.addEventListener("click", () => { values.day = Number(b.dataset.day); phase = 0; renderExperiment(); }));
    const angle = root.querySelector("#angleRange"); if (angle) angle.addEventListener("input", e => { values.angle = Number(e.target.value); measure = null; phase = 0; e.target.nextElementSibling.value = `${values.angle}°`; draw(performance.now()); updateReadout(); });
    const day = root.querySelector("#dayRange"); if (day) day.addEventListener("input", e => { values.day = Number(e.target.value); phase = 0; e.target.nextElementSibling.value = dateLabel(values.day); draw(performance.now()); updateReadout(); });
    const custom = root.querySelector("#customLat"); if (custom) custom.addEventListener("input", e => { values.customLat = Number(e.target.value); e.target.nextElementSibling.value = `${values.customLat}°`; draw(performance.now()); updateReadout(); });
    const bindFoucaultRange = (id, key, unit) => { const input = root.querySelector(id); if (!input) return; input.addEventListener("input", e => { resetRuntime(); values[key] = Number(e.target.value); e.target.nextElementSibling.value = `${values[key]} ${unit}`; phase = Math.min(phase, 1); draw(performance.now()); updateReadout(); }); };
    bindFoucaultRange("#foucaultLength", "length", "m"); bindFoucaultRange("#foucaultMass", "mass", "kg");
    root.querySelector("#runButton").addEventListener("click", runExperiment);
    root.querySelector("#resetButton").addEventListener("click", () => { resetRuntime(); phase = 0; answerOpen = false; renderExperiment(); });
    root.querySelector("#knowledgeButton").addEventListener("click", () => { knowledgeOpen = !knowledgeOpen; renderExperiment(); });
    const answer = root.querySelector("#answerButton"); if (answer) answer.addEventListener("click", () => { answerOpen = true; phase = 4; complete(); renderExperiment(); });
    const close = root.querySelector("#closeAnswer"); if (close) close.addEventListener("click", () => { answerOpen = false; renderExperiment(); });
    root.querySelectorAll("[data-record]").forEach(input => input.addEventListener("change", () => { phase = Math.max(phase, 3); updateSteps(); complete(); }));
    if (current.id === "crater") bindMeasure();
    if (current.id === "foucault") bindFoucaultGlobe();
    const globeButton = root.querySelector("#globeViewButton"); if (globeButton) globeButton.addEventListener("click", () => { resetRuntime(); foucaultView.mode = "globe"; foucaultView.transition = null; phase = 0; answerOpen = false; renderExperiment(); });
  }

  function resetRuntime() {
    stopLoop(); running = false; simTime = 0; measure = null; foucaultTrail = [];
    if (current?.id === "rocket" && rocket?.points?.length > 2) rocketHistory = [...rocketHistory.slice(-2), { points: rocket.points.slice(), max: rocket.maxAltitude }];
    rocket = null;
  }
  function runExperiment() {
    if (current.id === "rocket") { launchRocket(); return; }
    if (current.id === "foucault" && foucaultView.mode !== "pendulum") { focusFoucaultCity(); return; }
    phase = current.id === "pollution" ? 3 : 2; running = true; simTime = 0; lastFrame = 0;
    if (current.id === "foucault") foucaultTrail = [];
    if (current.id === "pollution") { complete(); running = false; showToast(bestLighting() ? "已记录：这是更友好的暗夜照明方案" : "已记录本次天空条件"); }
    else showToast(current.id === "crater" ? "请在阴影上拖动标尺" : "实验开始，注意观察变化");
    updateSteps(); updateReadout(); draw(performance.now());
    if (["foucault", "telescope"].includes(current.id)) startLoop();
  }

  function updateSteps() { root.querySelectorAll(".step").forEach((e, i) => { e.classList.toggle("done", i < phase); e.classList.toggle("active", i === phase); }); }
  function showToast(message) { const toast = root.querySelector("#toast"); if (!toast) return; toast.textContent = message; toast.classList.add("visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400); }

  function startLoop() { cancelAnimationFrame(raf); lastFrame = performance.now(); raf = requestAnimationFrame(loop); }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
  function loop(now) {
    const movingCamera = current?.id === "foucault" && foucaultView.mode === "transition";
    if (!current || (!running && !movingCamera)) return;
    const elapsed = (now - lastFrame) / 1000 || 0, dt = current.id === "foucault" ? Math.min(.5, elapsed) : Math.min(.05, elapsed); lastFrame = now; if (running) simTime += dt;
    if (current.id === "rocket" && running) stepRocket(dt * 28);
    draw(now); updateReadout();
    if (running || foucaultView.mode === "transition") raf = requestAnimationFrame(loop);
  }

  function resizeCanvas() {
    const canvas = root.querySelector("#simulationCanvas"); if (!canvas) return;
    const rect = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio)); canvas.height = Math.max(1, Math.round(rect.height * ratio));
  }
  function context() {
    const canvas = root.querySelector("#simulationCanvas"); if (!canvas) return null;
    const ratio = Math.min(devicePixelRatio || 1, 2), ctx = canvas.getContext("2d"); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { canvas, ctx, w: canvas.width / ratio, h: canvas.height / ratio };
  }
  function draw(now = 0) {
    const info = context(); if (!info || !current) return;
    info.ctx.clearRect(0, 0, info.w, info.h);
    ({ foucault: drawFoucault, crater: drawCrater, eratosthenes: drawEarth, pollution: drawPollution, telescope: drawTelescope, rocket: drawRocket }[current.id])(info.ctx, info.w, info.h, now);
  }

  function stars(ctx, w, h, count, alpha = 1) {
    for (let i = 0; i < count; i++) { const x = ((i * 7919) % 1543) / 1543 * w, y = ((i * 3571) % 1297) / 1297 * h; const a = (.2 + (i % 7) / 8) * alpha; ctx.fillStyle = `rgba(255,255,255,${a})`; const r = i % 41 === 0 ? 2 : i % 9 === 0 ? 1.3 : .7; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  }

  function shortestTurn(from, to) { return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)); }
  function focusFoucaultCity() {
    const [, lat, lon] = cities[values.city], now = performance.now();
    running = false; simTime = 0; foucaultTrail = []; phase = 1;
    foucaultView.transition = { start: now, fromYaw: foucaultView.yaw, fromPitch: foucaultView.pitch, toYaw: shortestTurn(foucaultView.yaw, -lon * Math.PI / 180), toPitch: lat * Math.PI / 180 };
    foucaultView.mode = "transition"; const canvas = root.querySelector("#simulationCanvas"), globeButton = root.querySelector("#globeViewButton"); if (canvas) canvas.style.cursor = "default"; if (globeButton) globeButton.hidden = false; updateSteps(); updateReadout(); startLoop();
  }

  function bindFoucaultGlobe() {
    const canvas = root.querySelector("#simulationCanvas"); if (!canvas) return;
    canvas.style.cursor = foucaultView.mode === "globe" ? "grab" : "default";
    canvas.addEventListener("pointerdown", e => { if (foucaultView.mode !== "globe") return; canvas.setPointerCapture(e.pointerId); foucaultView.drag = { x: e.clientX, y: e.clientY, yaw: foucaultView.yaw, pitch: foucaultView.pitch }; canvas.classList.add("dragging"); });
    canvas.addEventListener("pointermove", e => { if (!foucaultView.drag || !canvas.hasPointerCapture(e.pointerId)) return; foucaultView.yaw = foucaultView.drag.yaw + (e.clientX - foucaultView.drag.x) * .008; foucaultView.pitch = clamp(foucaultView.drag.pitch + (e.clientY - foucaultView.drag.y) * .006, -1.25, 1.25); draw(performance.now()); });
    const release = e => { if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); foucaultView.drag = null; canvas.classList.remove("dragging"); };
    canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release);
  }

  function globePoint(lat, lon, yaw, pitch) {
    const a = lat * Math.PI / 180, o = lon * Math.PI / 180 + yaw, ca = Math.cos(a), x = ca * Math.sin(o), y = Math.sin(a), z = ca * Math.cos(o), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return { x, y: y * cp - z * sp, z: y * sp + z * cp };
  }

  function drawGlobeLine(ctx, points, cx, cy, radius, yaw, pitch) {
    let drawing = false; ctx.beginPath();
    points.forEach(([lat, lon]) => { const p = globePoint(lat, lon, yaw, pitch); if (p.z <= 0) { drawing = false; return; } const x = cx + p.x * radius, y = cy - p.y * radius; drawing ? ctx.lineTo(x, y) : ctx.moveTo(x, y); drawing = true; }); ctx.stroke();
  }

  function drawGlobeLand(ctx, polygon, cx, cy, radius, yaw, pitch) {
    const points = polygon.map(([lat, lon]) => globePoint(lat, lon, yaw, pitch)).filter(p => p.z > -.04); if (points.length < 3) return;
    ctx.beginPath(); points.forEach((p, i) => { const x = cx + p.x * radius, y = cy - p.y * radius; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  function drawFoucaultGlobe(ctx, w, h, now) {
    let zoom = 1;
    if (foucaultView.mode === "transition" && foucaultView.transition) {
      const tr = foucaultView.transition, raw = clamp((now - tr.start) / 1450, 0, 1), ease = 1 - Math.pow(1 - raw, 3);
      foucaultView.yaw = tr.fromYaw + (tr.toYaw - tr.fromYaw) * ease; foucaultView.pitch = tr.fromPitch + (tr.toPitch - tr.fromPitch) * ease; zoom = 1 + ease * 4.1;
      if (raw >= 1) { foucaultView.mode = "pendulum"; foucaultView.transition = null; drawFoucaultPendulum(ctx, w, h); return; }
    }
    const cx = w * .5, cy = h * .52, radius = Math.min(w, h) * .31 * zoom, yaw = foucaultView.yaw, pitch = foucaultView.pitch;
    const sky = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .7); sky.addColorStop(0, "#0c2636"); sky.addColorStop(1, "#030810"); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h); stars(ctx, w, h, 95, .58);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.clip();
    const ocean = ctx.createRadialGradient(cx - radius * .32, cy - radius * .38, radius * .08, cx, cy, radius * 1.15); ocean.addColorStop(0, "#65c6e8"); ocean.addColorStop(.45, "#1977a4"); ocean.addColorStop(1, "#06314e"); ctx.fillStyle = ocean; ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = "rgba(178,255,177,.62)"; ctx.strokeStyle = "rgba(223,244,255,.28)"; ctx.lineWidth = Math.max(1, radius / 210);
    const lands = [
      [[12,-82],[28,-100],[51,-126],[70,-150],[73,-105],[52,-60],[20,-70]], [[12,-80],[-5,-78],[-25,-70],[-55,-68],[-40,-48],[-10,-35],[8,-60]],
      [[35,-10],[45,2],[58,18],[72,55],[60,105],[48,140],[24,120],[8,80],[22,48]], [[32,-17],[10,-17],[-34,18],[-36,33],[10,46],[30,32]], [[-12,112],[-40,115],[-45,150],[-14,155]]
    ];
    lands.forEach(poly => drawGlobeLand(ctx, poly, cx, cy, radius, yaw, pitch));
    ctx.strokeStyle = "rgba(223,244,255,.19)"; ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) drawGlobeLine(ctx, Array.from({ length: 73 }, (_, i) => [lat, -180 + i * 5]), cx, cy, radius, yaw, pitch);
    for (let lon = -180; lon < 180; lon += 30) drawGlobeLine(ctx, Array.from({ length: 37 }, (_, i) => [-90 + i * 5, lon]), cx, cy, radius, yaw, pitch);
    ctx.restore();
    ctx.strokeStyle = "rgba(223,244,255,.72)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.stroke();
    cities.forEach((city, i) => { const p = globePoint(city[1], city[2], yaw, pitch); if (p.z <= 0) return; const x = cx + p.x * radius, y = cy - p.y * radius, selected = i === values.city; ctx.fillStyle = selected ? "#fde293" : "#dff4ff"; ctx.shadowColor = selected ? "#fde293" : "transparent"; ctx.shadowBlur = selected ? 14 : 0; ctx.beginPath(); ctx.arc(x, y, selected ? 6 : 3, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; if (selected && zoom < 2) { ctx.fillStyle = "#fff"; ctx.font = "800 11px system-ui"; ctx.textAlign = "left"; ctx.fillText(city[0], x + 10, y + 4); } });
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.font = "800 12px system-ui"; ctx.fillText("3D EARTH · 傅科摆观测地点", 18, 26); ctx.fillStyle = "#b2ffb1"; ctx.font = "700 11px system-ui"; ctx.fillText(foucaultView.mode === "transition" ? `正在飞近 ${cities[values.city][0]}…` : "拖动旋转地球 · 从左侧选择预设地点", 18, 46);
  }

  function foucaultState(time = simTime) {
    const [, lat] = cities[values.city];
    const period = TAU * Math.sqrt(values.length / 9.81);
    const pendulumTime = time * (values.speedMode === "all" ? values.speed : 1);
    const swing = running ? Math.sin(pendulumTime * TAU / period) * .48 : .32;
    const rotation = running ? time * values.speed * 15 * Math.sin(lat * Math.PI / 180) / 3600 * Math.PI / 180 : 0;
    const reach = Math.sin(swing) / Math.sin(.48);
    return { lat, period, swing, rotation, x: reach * Math.cos(rotation), z: reach * Math.sin(rotation) };
  }

  function drawFoucault(ctx, w, h, now = performance.now()) { if (foucaultView.mode !== "pendulum") { drawFoucaultGlobe(ctx, w, h, now); return; } drawFoucaultPendulum(ctx, w, h); }

  function drawFoucaultPendulum(ctx, w, h) {
    const state = foucaultState();
    if (running) {
      let sampleTime = foucaultTrail.length ? foucaultTrail[foucaultTrail.length - 1].time : -.025, added = 0;
      while (sampleTime + .025 <= simTime && added < 80) { sampleTime += .025; const sample = foucaultState(sampleTime); foucaultTrail.push({ time: sampleTime, x: sample.x, z: sample.z }); added++; }
      if (foucaultTrail.length > 900) foucaultTrail.splice(0, foucaultTrail.length - 900);
    }

    const floorX = w * .5, floorY = h * .77, floorRx = Math.min(w * .43, h * .72), floorRy = floorRx * .31;
    const projectGround = (x, z) => ({ x: floorX + x * floorRx * .72, y: floorY + z * floorRy * .72 });
    const project3d = (x, y, z) => { const p = projectGround(x, z); return { x: p.x, y: p.y - y * h * .51 }; };
    const pivot = project3d(0, 1.02, 0);
    const bobHeight = .28 + (1 - Math.cos(state.swing)) * .8;
    const bob = project3d(state.x * .72, bobHeight, state.z * .72);
    const drop = projectGround(state.x, state.z);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#050b12"); sky.addColorStop(.62, "#0b1b28"); sky.addColorStop(1, "#102f3c");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h); stars(ctx, w, h * .62, 86, .52);

    ctx.fillStyle = "rgba(9,31,40,.94)"; ctx.beginPath(); ctx.ellipse(floorX, floorY, floorRx, floorRy, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(138,202,255,.18)"; ctx.lineWidth = 1;
    for (let ring = .25; ring <= 1; ring += .25) { ctx.beginPath(); ctx.ellipse(floorX, floorY, floorRx * ring, floorRy * ring, 0, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; const edge = projectGround(Math.cos(a) / .72, Math.sin(a) / .72); ctx.beginPath(); ctx.moveTo(floorX, floorY); ctx.lineTo(edge.x, edge.y); ctx.stroke(); }
    ctx.strokeStyle = "rgba(223,244,255,.46)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(floorX, floorY, floorRx, floorRy, 0, 0, TAU); ctx.stroke();

    const north = projectGround(0, -1.18);
    ctx.fillStyle = "#8acaff"; ctx.font = "800 10px system-ui"; ctx.textAlign = "center"; ctx.fillText("N", north.x, north.y - 7);
    ctx.strokeStyle = "rgba(138,202,255,.56)"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(floorX, floorY); ctx.lineTo(north.x, north.y); ctx.stroke(); ctx.setLineDash([]);

    if (foucaultTrail.length > 1) {
      for (let i = 1; i < foucaultTrail.length; i++) {
        const a = projectGround(foucaultTrail[i - 1].x, foucaultTrail[i - 1].z), b = projectGround(foucaultTrail[i].x, foucaultTrail[i].z);
        ctx.strokeStyle = `rgba(187,177,255,${.1 + .8 * i / foucaultTrail.length})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    const direction = projectGround(Math.cos(state.rotation) * 1.05, Math.sin(state.rotation) * 1.05);
    ctx.strokeStyle = "#fde293"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(floorX, floorY); ctx.lineTo(direction.x, direction.y); ctx.stroke();
    const arcRadiusX = floorRx * .2, arcRadiusY = floorRy * .2;
    if (Math.abs(state.rotation) > .006) {
      ctx.strokeStyle = "#b2ffb1"; ctx.lineWidth = 2; ctx.beginPath();
      const steps = Math.min(80, Math.max(8, Math.ceil(Math.abs(state.rotation) * 15)));
      for (let i = 0; i <= steps; i++) { const a = state.rotation * i / steps, p = { x: floorX + Math.cos(a) * arcRadiusX, y: floorY + Math.sin(a) * arcRadiusY }; i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(223,244,255,.38)"; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(bob.x, bob.y); ctx.lineTo(drop.x, drop.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#b2ffb1"; ctx.beginPath(); ctx.arc(drop.x, drop.y, 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#eef8ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pivot.x, pivot.y); ctx.lineTo(bob.x, bob.y); ctx.stroke();
    ctx.fillStyle = "#dff4ff"; ctx.beginPath(); ctx.arc(pivot.x, pivot.y, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fde293"; ctx.shadowColor = "rgba(253,226,147,.55)"; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(bob.x, bob.y, 14 + values.mass / 24, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;

    const angle = ((state.rotation * 180 / Math.PI) % 360 + 360) % 360;
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "800 12px system-ui"; ctx.fillText(`3D VIEWPORT · ${cities[values.city][0]}地面实时轨迹`, 18, 25);
    ctx.fillStyle = "#b2ffb1"; ctx.font = "700 11px system-ui"; ctx.fillText(`偏转 ${fmt(angle, 1)}°`, 18, 44);
    ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.fillText("紫色：历史轨迹  ·  黄色：当前摆动平面", 18, h - 16);
  }

  function craterData() { return values.model === "A" ? { height: 3, peaks: [1] } : values.model === "B" ? { height: 4.5, peaks: [.72, 1] } : { height: 5, peaks: [.48, 1, .7] }; }
  function shadowKm() { if (values.angle === 0) return Infinity; if (values.angle === 90) return 0; return craterData().height / Math.tan(values.angle * Math.PI / 180); }
  function drawCrater(ctx, w, h) {
    const data = craterData(), ground = h * .73, left = w * .3, scale = Math.min(w / 18, 48), peakH = data.height * scale, shadowPx = Math.min(w * .52, shadowKm() * scale);
    const gradient = ctx.createLinearGradient(0, 0, 0, h); gradient.addColorStop(0, "#060b12"); gradient.addColorStop(1, "#23242a"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h); stars(ctx, w, h * .55, 45, .5);
    const rad = values.angle * Math.PI / 180, sx = w * .12 + Math.cos(rad) * w * .13, sy = ground - Math.sin(rad) * h * .55; ctx.fillStyle = "#fde293"; ctx.beginPath(); ctx.arc(sx, sy, 18, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(253,226,147,.38)"; ctx.lineWidth = 2; for (let i = -1; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(sx + i * 36, sy); ctx.lineTo(left + i * 36, ground - peakH); ctx.stroke(); }
    ctx.fillStyle = "#8e877f"; ctx.beginPath(); ctx.moveTo(0, ground); for (let x = 0; x <= w; x += 6) { const n = (x - left) / (scale * 2.8); const mound = Math.exp(-n * n) * peakH * (values.model === "C" ? (.72 + .28 * Math.cos(n * 5)) : 1); ctx.lineTo(x, ground - mound); } ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.54)"; ctx.beginPath(); ctx.moveTo(left, ground - peakH); ctx.lineTo(left + shadowPx, ground); ctx.lineTo(left, ground); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(left, ground); ctx.lineTo(left + shadowPx, ground); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fff"; ctx.font = "700 12px system-ui"; ctx.fillText(`模型 ${values.model} · 阴影区`, left + 12, ground + 24);
    if (measure?.start && measure?.end) { ctx.strokeStyle = "#b2ffb1"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(measure.start.x, measure.start.y); ctx.lineTo(measure.end.x, measure.end.y); ctx.stroke(); [measure.start, measure.end].forEach(p => { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill(); ctx.stroke(); }); ctx.fillStyle = "#b2ffb1"; ctx.fillText(`${fmt(measuredKm(), 2)} km`, (measure.start.x + measure.end.x) / 2, Math.min(measure.start.y, measure.end.y) - 12); }
  }

  function bindMeasure() {
    const canvas = root.querySelector("#simulationCanvas"); if (!canvas) return;
    const point = e => { const r = canvas.getBoundingClientRect(); return { x: clamp(e.clientX - r.left, 0, r.width), y: clamp(e.clientY - r.top, 0, r.height) }; };
    canvas.addEventListener("pointerdown", e => { if (!running) { showToast("请先点击“开始测量”"); return; } canvas.setPointerCapture(e.pointerId); measure = { start: point(e), end: point(e) }; draw(); });
    canvas.addEventListener("pointermove", e => { if (measure?.start && canvas.hasPointerCapture(e.pointerId)) { measure.end = point(e); draw(); updateReadout(); } });
    canvas.addEventListener("pointerup", e => { if (!measure?.start) return; measure.end = point(e); phase = 3; updateSteps(); updateReadout(); complete(); draw(); });
  }
  function measuredKm() { if (!measure?.end) return 0; const canvas = root.querySelector("#simulationCanvas"), scale = Math.min(canvas.clientWidth / 18, 48); return Math.hypot(measure.end.x - measure.start.x, measure.end.y - measure.start.y) / scale; }

  function solarDeclination(day) { return 23.5 * Math.sin((360 / 365) * (284 + day) * Math.PI / 180); }
  function selectedEarthLat() { return values.city === 4 ? values.customLat : earthCities[values.city][1]; }
  function earthCalc() { const decl = solarDeclination(values.day), lat = selectedEarthLat(), theta = Math.abs(lat - decl), arc = theta * 111.2, elevation = 90 - theta; return { decl, lat, theta, arc, elevation, circumference: theta ? arc * 360 / theta : 0 }; }
  function dateLabel(day) { const date = new Date(2025, 0, day); return `${date.getMonth() + 1}月${date.getDate()}日`; }
  function drawEarth(ctx, w, h) {
    const d = earthCalc(); ctx.fillStyle = "#07131c"; ctx.fillRect(0, 0, w, h); stars(ctx, w, h, 55, .45);
    const cx = w * .5, cy = h * 1.08, r = Math.min(w * .47, h * .8); ctx.fillStyle = "#246b91"; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = "#8acaff"; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = "rgba(253,226,147,.75)"; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; for (let x = w * .15; x < w * .86; x += w * .14) { ctx.beginPath(); ctx.moveTo(x, h * .08); ctx.lineTo(x, h * .52); ctx.stroke(); } ctx.setLineDash([]);
    const a1 = -Math.PI / 2 - d.theta * Math.PI / 360, a2 = -Math.PI / 2 + d.theta * Math.PI / 360; const p1 = { x: cx + Math.cos(a1) * r, y: cy + Math.sin(a1) * r }, p2 = { x: cx + Math.cos(a2) * r, y: cy + Math.sin(a2) * r };
    [[p1, "直射点 A"], [p2, values.city === 4 ? "自定义城市 B" : earthCities[values.city][0]]].forEach(([p, label], i) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(i ? d.theta * Math.PI / 360 : -d.theta * Math.PI / 360); ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.stroke(); if (i) { ctx.strokeStyle = "#fde293"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(45 * Math.sin(d.theta * Math.PI / 180), 0); ctx.stroke(); } ctx.restore(); ctx.fillStyle = "#fff"; ctx.font = "700 12px system-ui"; ctx.fillText(label, p.x - 35, p.y - 82); });
    ctx.strokeStyle = "#bbb1ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p1.x, p1.y); ctx.moveTo(cx, cy); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.fillStyle = "#bbb1ff"; ctx.fillText(`θ = ${fmt(d.theta, 1)}°`, cx - 28, cy - r * .5);
  }

  function lightFactor() { const shield = { "无灯罩": 1.22, "全截罩": .62, "半截罩": .92, "球形罩": 1.42 }[values.shield]; return shield * (values.temp / 3000) ** .35; }
  function visibleStars() { const base = bortle[values.level - 1][2]; return Math.max(8, Math.min(base, Math.round(base / lightFactor()))); }
  function bestLighting() { return values.level <= 3 && values.shield === "全截罩" && values.temp <= 3000; }
  function drawPollution(ctx, w, h) {
    const level = values.level, cool = (values.temp - 2200) / 4300, brightness = (level - 1) / 8; const top = `rgb(${Math.round(3 + brightness * (70 - cool * 20))},${Math.round(10 + brightness * 49)},${Math.round(22 + brightness * (34 + cool * 40))})`;
    const grad = ctx.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, top); grad.addColorStop(.72, `rgba(${150 + cool * 25},${82 + cool * 35},${45 + cool * 70},1)`); grad.addColorStop(1, "#111923"); ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    const maxDraw = Math.min(1500, Math.round(70 + visibleStars() / 4)); stars(ctx, w, h * .72, maxDraw, clamp(1.08 - brightness, .12, 1));
    ctx.fillStyle = "#101a23"; ctx.fillRect(0, h * .76, w, h * .24); for (let i = 0; i < 13; i++) { const bh = 25 + (i * 37) % 58; ctx.fillStyle = i % 3 ? "#182634" : "#223445"; ctx.fillRect(i * w / 12 - 8, h * .76 - bh, w / 13, bh); }
    const lx = w * .68, ly = h * .74; ctx.strokeStyle = "#d7dde2"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - 112); ctx.lineTo(lx + 24, ly - 112); ctx.stroke(); ctx.fillStyle = values.temp <= 3000 ? "#fde293" : "#dff4ff"; ctx.beginPath(); ctx.arc(lx + 27, ly - 108, 10, 0, TAU); ctx.fill();
    const upward = { "无灯罩": .3, "全截罩": .02, "半截罩": .15, "球形罩": .5 }[values.shield]; ctx.fillStyle = values.temp <= 3000 ? "rgba(253,226,147,.18)" : "rgba(174,203,250,.22)"; ctx.beginPath(); ctx.moveTo(lx + 27, ly - 104); ctx.lineTo(lx - 70, ly); ctx.lineTo(lx + 120, ly); ctx.closePath(); ctx.fill(); if (upward > .05) { ctx.fillStyle = `rgba(174,203,250,${upward * .28})`; ctx.beginPath(); ctx.moveTo(lx + 27, ly - 112); ctx.lineTo(lx - 80 * upward, ly - 240); ctx.lineTo(lx + 135 * upward, ly - 240); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "#fff"; ctx.font = "700 13px system-ui"; ctx.fillText(`波特尔 ${level} 级 · ${bortle[level - 1][1]}`, 20, 28); ctx.fillText(values.shield, lx - 20, ly + 24);
  }

  function telescopeCalc() { const magnification = values.focal / values.eyepiece, fRatio = values.focal / 200, fov = 50 / magnification; return { magnification, fRatio, fov }; }
  function drawTelescope(ctx, w, h) {
    const c = telescopeCalc(); ctx.fillStyle = "#07131c"; ctx.fillRect(0, 0, w, h); stars(ctx, w, h, 65, .45);
    const split = w * .6, mirrorX = split * .76, top = h * .18, bottom = h * .77, focusX = split * (.34 + values.focal / 5000);
    ctx.strokeStyle = "rgba(223,244,255,.55)"; ctx.lineWidth = 3; ctx.strokeRect(split * .08, top, split * .75, bottom - top);
    ctx.strokeStyle = "#dff4ff"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(mirrorX, top + 25); ctx.quadraticCurveTo(mirrorX + 28 * (800 / values.focal), h * .48, mirrorX, bottom - 25); ctx.stroke();
    const pulse = running ? (simTime * .5) % 1 : .35; for (let i = 0; i < 4; i++) { const y = top + 50 + i * (bottom - top - 100) / 3; ctx.strokeStyle = `rgba(253,226,147,${.5 + i * .08})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(split * .03, y); ctx.lineTo(mirrorX, y); ctx.lineTo(focusX, h * .48); ctx.lineTo(focusX, h * .3); ctx.lineTo(split * .51, h * .3); ctx.stroke(); ctx.fillStyle = "#fde293"; const px = split * .03 + (mirrorX - split * .03) * pulse; ctx.beginPath(); ctx.arc(px, y, 3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#bbb1ff"; ctx.save(); ctx.translate(focusX, h * .48); ctx.rotate(-Math.PI / 4); ctx.fillRect(-23, -3, 46, 6); ctx.restore(); ctx.fillStyle = "#fff"; ctx.font = "700 11px system-ui"; ctx.fillText("主镜", mirrorX - 13, bottom + 18); ctx.fillText("45° 副镜", focusX - 25, h * .53); ctx.fillText("目镜", split * .52, h * .27);
    const fx = split + (w - split) / 2, fy = h * .5, fr = Math.min(w - split, h) * .34; ctx.save(); ctx.beginPath(); ctx.arc(fx, fy, fr, 0, TAU); ctx.clip(); const vg = ctx.createRadialGradient(fx, fy, fr * .25, fx, fy, fr); vg.addColorStop(0, "#11253a"); vg.addColorStop(.75, "#030911"); vg.addColorStop(1, "#000"); ctx.fillStyle = vg; ctx.fillRect(split, 0, w - split, h); stars(ctx, w - split, h, 40, .7);
    const target = targetInfo[values.target], size = clamp(target.base * Math.sqrt(c.magnification / 32), 8, fr * 1.8); drawTarget(ctx, fx, fy, size, target.kind); ctx.restore(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, TAU); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillText(`${values.target} · 目镜视场`, split + 16, 27);
  }
  function drawTarget(ctx, x, y, r, kind) {
    if (kind === "moon") { ctx.fillStyle = "#d8d3c8"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(72,67,64,.28)"; [[-.3,-.2,.18],[.3,.25,.13],[.1,-.4,.09]].forEach(a => { ctx.beginPath(); ctx.arc(x+a[0]*r,y+a[1]*r,r*a[2],0,TAU);ctx.fill(); }); }
    else if (kind === "saturn") { ctx.strokeStyle = "#fde293"; ctx.lineWidth = Math.max(3, r*.24); ctx.beginPath(); ctx.ellipse(x,y,r*1.8,r*.55,-.15,0,TAU);ctx.stroke();ctx.fillStyle="#d9bd73";ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill(); }
    else if (kind === "jupiter") { ctx.fillStyle="#d6a477";ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.strokeStyle="#7e4f3d";ctx.lineWidth=Math.max(2,r*.17);[-.35,.05,.42].forEach(n=>{ctx.beginPath();ctx.moveTo(x-r*.85,y+r*n);ctx.lineTo(x+r*.85,y+r*n);ctx.stroke();}); }
    else { const g=ctx.createRadialGradient(x,y,0,x,y,r*1.7);g.addColorStop(0,kind==="nebula"?"rgba(187,177,255,.9)":"rgba(223,244,255,.9)");g.addColorStop(.35,kind==="nebula"?"rgba(119,77,176,.42)":"rgba(138,202,255,.35)");g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.save();ctx.translate(x,y);ctx.rotate(-.3);ctx.scale(1.8,.55);ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.restore(); }
  }

  function rocketTwr() { return values.thrust * 1000 / ((values.body + values.payload + values.fuel) * 1000 * 9.81); }
  function launchRocket() {
    if (rocketTwr() <= 1) { showToast("推力小于总重：火箭无法离开发射台"); phase = 1; updateSteps(); return; }
    if (rocket?.points?.length) rocketHistory = [...rocketHistory.slice(-2), { points: rocket.points.slice(), max: rocket.maxAltitude }];
    const total = values.body + values.payload + values.fuel, burn = clamp(values.fuel / (values.thrust / 480), 12, 150);
    rocket = { altitude: 0, velocity: 0, fuel: values.fuel, initialFuel: values.fuel, dryMass: values.body + values.payload, time: 0, burnTime: burn, maxAltitude: 0, points: [[0,0]], fuelOutAt: null, done: false };
    running = true; phase = 2; simTime = 0; showToast("点火成功：观察燃料、速度与高度曲线"); updateSteps(); startLoop();
  }
  function stepRocket(dt) {
    if (!rocket || rocket.done) return; const sub = .15; let remain = dt;
    while (remain > 0 && !rocket.done) { const step = Math.min(sub, remain); remain -= step; const burning = rocket.fuel > 0; const mass = (rocket.dryMass + rocket.fuel) * 1000; const thrust = burning ? values.thrust * 1000 : 0; const g = 9.81 * (6371000 / (6371000 + rocket.altitude)) ** 2; const rho = 1.225 * Math.exp(-rocket.altitude / 8500); const drag = .5 * rho * .35 * 3.2 * rocket.velocity * Math.abs(rocket.velocity); const accel = (thrust - mass * g - drag) / mass; rocket.velocity += accel * step; rocket.altitude = Math.max(0, rocket.altitude + rocket.velocity * step); rocket.time += step; if (burning) { const burnRate = rocket.initialFuel / rocket.burnTime; rocket.fuel = Math.max(0, rocket.fuel - burnRate * step); if (rocket.fuel === 0 && rocket.fuelOutAt === null) rocket.fuelOutAt = rocket.time; } rocket.maxAltitude = Math.max(rocket.maxAltitude, rocket.altitude); if (rocket.time % .7 < step) rocket.points.push([rocket.time, rocket.altitude]); if ((!burning && rocket.velocity <= 0) || rocket.time > 800) { rocket.done = true; running = false; phase = 3; complete(); showToast("已到达最高点，本次曲线已记录"); updateSteps(); } }
  }
  function drawRocket(ctx, w, h) {
    const flightW = w * .58, alt = rocket?.altitude || 0, scaleAlt = Math.max(120000, rocket?.maxAltitude * 1.2 || 120000); const sky = clamp(alt / 80000, 0, 1); const grad = ctx.createLinearGradient(0,0,0,h); grad.addColorStop(0,`rgb(${Math.round(65*(1-sky))},${Math.round(130*(1-sky))},${Math.round(185*(1-sky))})`);grad.addColorStop(1,"#8acaff");ctx.fillStyle=grad;ctx.fillRect(0,0,flightW,h);stars(ctx,flightW,h,55,sky);
    ctx.fillStyle="#253742";ctx.fillRect(0,h*.86,flightW,h*.14);const y=h*.82-clamp(alt/scaleAlt,0,.85)*h*.72,x=flightW*.53;ctx.save();ctx.translate(x,y);ctx.fillStyle="#eef3f6";ctx.beginPath();ctx.moveTo(0,-36);ctx.lineTo(15,7);ctx.lineTo(-15,7);ctx.closePath();ctx.fill();ctx.fillStyle="#ff8b52";ctx.fillRect(-11,2,22,28);if(running&&rocket?.fuel>0){ctx.fillStyle="#fde293";ctx.beginPath();ctx.moveTo(-8,28);ctx.lineTo(0,58+Math.sin(simTime*30)*8);ctx.lineTo(8,28);ctx.fill();}ctx.restore();ctx.strokeStyle="rgba(255,255,255,.65)";ctx.beginPath();ctx.moveTo(25,h*.82);ctx.lineTo(25,h*.12);ctx.stroke();for(let i=0;i<6;i++){const yy=h*.82-i*h*.14;ctx.fillRect(20,yy,10,1);ctx.fillStyle="#fff";ctx.font="10px system-ui";ctx.fillText(`${Math.round(scaleAlt/1000*i/5)} km`,34,yy+3);}
    ctx.fillStyle="#07131c";ctx.fillRect(flightW,0,w-flightW,h);drawRocketChart(ctx,flightW+18,28,w-flightW-36,h-56);ctx.fillStyle="#fff";ctx.font="700 12px system-ui";ctx.fillText("高度—时间曲线",flightW+22,20);
  }
  function drawRocketChart(ctx,x,y,w,h){const sets=[...rocketHistory.map((r,i)=>({points:r.points,color:["#8acaff","#bbb1ff","#b2ffb1"][i%3]})),...(rocket?[{points:rocket.points,color:"#fde293"}]:[])];const maxT=Math.max(30,...sets.flatMap(s=>s.points.map(p=>p[0]))),maxA=Math.max(1000,...sets.flatMap(s=>s.points.map(p=>p[1])));ctx.strokeStyle="rgba(255,255,255,.22)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+h);ctx.lineTo(x+w,y+h);ctx.stroke();sets.forEach(s=>{ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.beginPath();s.points.forEach((p,i)=>{const px=x+p[0]/maxT*w,py=y+h-p[1]/maxA*h;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke();});if(rocket?.fuelOutAt){const fx=x+rocket.fuelOutAt/maxT*w;ctx.strokeStyle="#ffa47a";ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(fx,y);ctx.lineTo(fx,y+h);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#ffa47a";ctx.font="10px system-ui";ctx.fillText("燃料耗尽",Math.min(fx+4,x+w-48),y+13);}}

  function readoutValues() {
    if (current.id === "foucault") { const city=cities[values.city]; if (foucaultView.mode !== "pendulum") return [["已选地点",city[0]],["纬度",`${city[1]}°N`],["经度",`${city[2]}°E`],["镜头状态",foucaultView.mode === "transition"?"正在移动":"等待选择"]]; const state=foucaultState(), h=city[1] ? 24/Math.sin(city[1]*Math.PI/180) : Infinity, angle=((state.rotation*180/Math.PI)%360+360)%360; return [["实时摆角",`${fmt(state.swing*180/Math.PI,1)}°`],["实时偏转角",`${fmt(angle,1)}°`],["理论摆动周期",`${fmt(state.period,1)} s`],["偏转周期",isFinite(h)?`${fmt(h,1)} h`:"赤道不偏转"]]; }
    if (current.id === "crater") return [["太阳高度角",`${values.angle}°`],["学生测得影长",measure?.end?`${fmt(measuredKm(),2)} km`:"拖动标尺"],["模型",`模型 ${values.model}`],["计算山高",answerOpen?`${fmt(craterData().height,1)} km`:"纸笔计算"]];
    if (current.id === "eratosthenes") {const d=earthCalc();return [["日期",dateLabel(values.day)],["太阳直射纬度",`${fmt(d.decl,1)}°`],["城市 B 高度角",`${fmt(d.elevation,1)}°`],["地球周长",answerOpen?`${Math.round(d.circumference).toLocaleString()} km`:"待核对"]];}
    if (current.id === "pollution") return [["暗空等级",`波特尔 ${values.level} 级`],["可见星约数",`${visibleStars().toLocaleString()} 颗`],["上射控制",values.shield],["方案评价",bestLighting()?"推荐方案":"继续比较"]];
    if (current.id === "telescope") {const c=telescopeCalc();return [["观测目标",values.target],["放大倍率",answerOpen?`${fmt(c.magnification,0)}×`:"先观察"],["视场角",answerOpen?`${fmt(c.fov,2)}°`:"待核对"],["焦比",answerOpen?`f/${fmt(c.fRatio,1)}`:"待核对"]];}
    return [["推重比",fmt(rocketTwr(),2)],["实时高度",`${fmt((rocket?.altitude||0)/1000,2)} km`],["实时速度",`${fmt((rocket?.velocity||0)/1000,2)} km/s`],["剩余燃料",rocket?`${fmt(rocket.fuel/rocket.initialFuel*100,0)}%`:"100%"]];
  }
  function updateReadout(){const area=root.querySelector("#readout");if(!area)return;area.innerHTML=readoutValues().map(([l,v])=>`<div class="readout-item"><span>${l}</span><strong>${v}</strong></div>`).join("");const hint=root.querySelector(".sim-toolbar strong"),status=root.querySelector(".sim-toolbar span"),run=root.querySelector("#runButton");if(hint)hint.textContent=simPrompt();if(status?.lastChild)status.lastChild.textContent=simStatus();if(run)run.textContent=primaryActionLabel();}

  function answerHtml() {
    if (current.id === "foucault") {const city=cities[values.city],omega=15*Math.sin(city[1]*Math.PI/180),period=city[1]?24/Math.sin(city[1]*Math.PI/180):Infinity;return `<p class="answer-kicker">核对结果</p><h3>${city[0]}的偏转规律</h3><p>Ω = 15°/h × sin(${city[1]}°) = <b>${fmt(omega,2)}°/h</b></p><p>偏转周期：<b>${isFinite(period)?`${fmt(period,1)} 小时`:"赤道不偏转"}</b></p><small>切换摆锤质量，结果不变；切换摆长，只改变摆动周期。</small>`;}
    if (current.id === "crater") {const actual=craterData().height;if(values.angle===0||values.angle===90)return `<p class="answer-kicker">极端角度</p><h3>${values.angle===0?"太阳贴近地平线":"太阳位于天顶"}</h3><p>${values.angle===0?"影长趋于无限，有限画布无法完整测量。":"影长趋近 0，影长法失去可测距离。"}</p><p>模型真实高度：<b>${fmt(actual,1)} km</b></p><small>请选择 5°—85° 之间的角度完成三角测量。</small>`;const s=measure?.end?measuredKm():shadowKm(),calc=s*Math.tan(values.angle*Math.PI/180),error=Math.abs(calc-actual)/actual*100;return `<p class="answer-kicker">核对结果</p><h3>h = s × tan(α)</h3><p>${fmt(s,2)} × tan(${values.angle}°) = <b>${fmt(calc,2)} km</b></p><p>模型真实高度：<b>${fmt(actual,1)} km</b> · 测量偏差：<b>${fmt(error,1)}%</b></p><small>测量线越贴近真实影长，计算值越准确。</small>`;}
    if (current.id === "eratosthenes") {const d=earthCalc(),err=Math.abs(d.circumference-40075)/40075*100;return `<p class="answer-kicker">核对结果</p><h3>C = d × 360° ÷ θ</h3><p>${fmt(d.arc,1)} km × 360 ÷ ${fmt(d.theta,1)}° = <b>${Math.round(d.circumference).toLocaleString()} km</b></p><p>与参考值 40,075 km 的偏差：<b>${fmt(err,2)}%</b></p><small>圆心角等于两地太阳高度角之差。</small>`;}
    if (current.id === "telescope") {const c=telescopeCalc();return `<p class="answer-kicker">核对结果</p><h3>M = f ÷ fₑ</h3><p>${values.focal} mm ÷ ${values.eyepiece} mm = <b>${fmt(c.magnification,0)}×</b></p><p>估计视场 <b>${fmt(c.fov,2)}°</b> · 焦比 <b>f/${fmt(c.fRatio,1)}</b></p><small>倍率越高，目标更大，但视场更窄。</small>`;}
    const dry=values.body+values.payload,total=dry+values.fuel,dv=300*9.81*Math.log(total/dry)/1000;return `<p class="answer-kicker">飞行核对</p><h3>本次火箭配置</h3><p>理论 Δv ≈ <b>${fmt(dv,2)} km/s</b> · 推重比 <b>${fmt(rocketTwr(),2)}</b></p><p>最高高度：<b>${rocket?`${fmt(rocket.maxAltitude/1000,2)} km`:"请先发射"}</b> · 燃烧时间：<b>${rocket?`${fmt(rocket.burnTime,1)} s`:"—"}</b></p><small>此为课堂用一维简化模型，不用于真实飞行预测。</small>`;
  }

  addEventListener("resize", () => { if (!current || legacyIds.has(current.id)) return; resizeCanvas(); draw(performance.now()); });
  renderHome();
})();

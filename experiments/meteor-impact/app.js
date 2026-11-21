(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const options = { size: [['small','小'],['medium','中'],['large','大']], speed: [['low','低'],['medium','中'],['high','高']], angle: [['90','90°'],['45','45°'],['30','30°']], ground: [['loose','疏松地面'],['compact','紧致地面']] };
  const names = { size: '陨石大小', speed: '进入速度', angle: '入射角', ground: '地面疏松程度' };
  const label = (key, value) => options[key].find(item => item[0] === value)?.[1] || value;
  const worldName = world => world === 'earth' ? '地球' : '月球';
  const defaults = { size: 'medium', speed: 'medium', angle: '90', ground: 'compact' };
  const course = [
    { key: 'size', title: '大小', hint: '只改变陨石大小，观察坑口与坑深的变化。' },
    { key: 'speed', title: '速度', hint: '只改变进入速度，比较两次撞击形成的坑。' },
    { key: 'angle', title: '入射角', hint: '只改变入射角，观察坑形与溅射分布。' },
    { key: 'ground', title: '地面', hint: '只改变地面疏松程度，比较坑口与坑深。' },
    { key: 'world', title: '地球／月球', hint: '保持输入相同，观察两种环境下的撞击结果。' }
  ];
  let courseStep = 0;
  const stepChoices = course.map(step => step.key === 'world' ? [] : [options[step.key][0][0], options[step.key].at(-1)[0]]);
  const state = { mode: 'factor', factor: 'size', world: 'moon', values: ['small','large'], shared: { ...defaults }, phase: 'setup', view: 'whole', records: [], result: null, token: 0, page: 0 };
  const resultCache = new Map();
  const imageResources = new Set();
  const nextTask = () => new Promise(resolve => setTimeout(resolve, 0));
  function releaseUnusedImages() {
    const retained = new Set([...resultCache.values(), ...state.records.flatMap(record => record.sides)]);
    for (const resource of imageResources) if (!retained.has(resource)) {
      URL.revokeObjectURL(resource.whole); URL.revokeObjectURL(resource.cutaway);
      imageResources.delete(resource);
    }
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let engines = [], error = '', sceneReady = false;
  // Visual variation only: both experiments retain the same launch clock and inputs.
  const spinProfiles = [
    { initialRotation: [.25, .45, -.3], angularVelocity: [1.1, 1.7, .55] },
    { initialRotation: [-.65, 2.1, .8], angularVelocity: [-.8, .7, -1.35] }
  ];
  try { engines = [0,1].map(i => new MeteorScene3D($('#scene' + i), spinProfiles[i])); }
  catch (e) { error = e.message; }
  const fit = () => document.documentElement.style.setProperty('--scale', Math.min(innerWidth / 1600, innerHeight / 900));
  function combos() {
    return state.mode === 'world'
      ? [{ ...state.shared, scene: 'earth' }, { ...state.shared, scene: 'moon' }]
      : state.values.map(value => ({ ...state.shared, [state.factor]: value, scene: state.world }));
  }
  function outcome(combo) {
    const size = ['small','medium','large'].indexOf(combo.size);
    const speed = ['low','medium','high'].indexOf(combo.speed);
    const energy = size + speed - (combo.scene === 'earth' ? 1 : 0);
    const grade = energy <= 1 ? 0 : energy >= 3 ? 2 : 1;
    return { scale: state.mode === 'factor' && state.factor === 'ground' ? (combo.ground === 'loose' ? '较小' : '较大') : ['小','中','大'][grade], depth: state.mode === 'factor' && state.factor === 'ground' ? (combo.ground === 'loose' ? '较深' : '较浅') : ['浅','中等','深'][grade], shape: combo.angle === '90' ? '圆' : combo.angle === '45' ? '近圆' : '不规则', ejecta: state.mode === 'factor' && state.factor === 'ground' ? (combo.ground === 'loose' ? '较少' : '较多') : ['近','中等','远'][grade] };
  }
  function clearRun() {
    state.token++;
    engines.forEach(engine => engine.cancel(false, false));
  }
  function reset(update = null) {
    clearRun(); state.phase = 'setup'; state.result = null; state.view = 'whole';
    if (typeof update === 'function') update();
    render();
  }
  function goToStep(index) {
    if (index < 0 || index >= course.length) return;
    stepChoices[courseStep] = [...state.values];
    reset(() => {
      courseStep = index;
      state.mode = course[index].key === 'world' ? 'world' : 'factor';
      state.factor = state.mode === 'world' ? 'size' : course[index].key;
      state.world = 'moon'; state.shared = { ...defaults };
      state.values = [...stepChoices[index]];
    });
  }
  function renderSettings() {
    const locked = !sceneReady || ['running','preparing'].includes(state.phase);
    const progress = $('#courseProgress'); progress.replaceChildren();
    course.forEach((step, index) => {
      const item = document.createElement('li');
      const done = state.records.some(record => step.key === 'world' ? record.mode === 'world' : record.mode === 'factor' && record.factor === step.key);
      if (index === courseStep) item.setAttribute('aria-current', 'step');
      item.classList.toggle('done', done);
      item.innerHTML = '<b>' + (done ? '✓' : index + 1) + '</b><span>' + step.title + '</span>';
      item.setAttribute('aria-label', '第' + (index + 1) + '步 ' + step.title + (done ? '，已有记录' : '，尚无记录'));
      progress.append(item);
    });
    $('#previousStep').disabled = !sceneReady || Boolean(error) || courseStep === 0;
    $('#nextStep').disabled = !sceneReady || Boolean(error);
    $('#nextStep').textContent = courseStep === course.length - 1 ? '查看记录 →' : '下一步 →';
    $('#courseHint').textContent = course[courseStep].hint;
    combos().forEach((combo, side) => {
      const container = $('#inlineSettings' + side); container.replaceChildren();
      const caption = document.createElement('strong');
      caption.textContent = state.mode === 'world' ? worldName(combo.scene) : names[state.factor]; container.append(caption);
      if (state.mode === 'factor') {
        const choices = document.createElement('div'); choices.className = 'course-options';
        choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', '实验' + (side + 1) + names[state.factor]);
        options[state.factor].forEach(([value, text]) => {
          const button = document.createElement('button'); button.textContent = text;
          button.disabled = locked; button.setAttribute('aria-pressed', String(combo[state.factor] === value));
          button.dataset.side = side; button.dataset.value = value;
          button.onclick = () => reset(() => { state.values[side] = value; }); choices.append(button);
        }); container.append(choices);
      }
    });
    $('#pairTitle').textContent = state.mode === 'factor' ? names[state.factor] + '对照' : '地球与月球对照';
    $('#launch').disabled = !sceneReady || Boolean(error) || ['running','preparing'].includes(state.phase) || (state.mode === 'factor' && state.values[0] === state.values[1]);
    $('#launch').innerHTML = state.phase === 'result' ? '再次发射 <span>↗ ↗</span>' : '同时发射 <span>↗ ↗</span>';
    $('#cancel').hidden = !['running','preparing'].includes(state.phase);
    $('#status').textContent = error ? '3D 初始化失败，请重新加载' : !sceneReady ? '正在准备场景…' : state.phase === 'preparing' ? '整理对照结果…' : state.phase === 'running' ? '接近 → 撞击 → 扬尘 → 成形' : state.mode === 'factor' && state.values[0] === state.values[1] ? '请选择两个不同档位' : state.phase === 'result' ? '已记录一组对照' : '';
  }
  function renderViews() {
    const current = state.result?.combos || combos();
    current.forEach((combo, side) => {
      const image = $('#result' + side); const canvas = $('#scene' + side);
      const callouts = $('#annotations' + side);
      const result = state.phase === 'result' && state.result;
      callouts.toggleAttribute('hidden', !result);
      image.hidden = !result; canvas.style.visibility = result ? 'hidden' : 'visible';
      $('#outcome' + side).hidden = !result;
      if (result) {
        image.src = state.result.sides[side][state.view];
        const data = state.result.sides[side].outcome;
        MeteorResultCallouts.render(callouts, state.result.sides[side].annotations[state.view], data, state.view);
        $('#outcome' + side).innerHTML = [['坑口',data.scale],['坑深',data.depth],['坑形',data.shape],['溅射（定性示意）',data.ejecta]].map(([key,value]) => '<span>' + key + '<b>' + value + '</b></span>').join('');
      }
      if (state.phase !== 'running') $('#phase' + side).textContent = '';
    });
  }
  function render() {
    renderSettings(); renderViews();
    if (state.phase === 'setup') combos().forEach((combo, side) => { engines[side]?.resize(); engines[side]?.preview(combo); });
    $('#recordCount').textContent = state.records.length;
  }
  async function prepareResults(token, input, mode, factor) {
    const results = [];
    try {
      state.phase = 'preparing'; renderSettings();
      // Keep one scale for both sides and all three grades of this research factor.
      const framingCombos = mode === 'factor'
        ? options[factor].map(([value]) => ({ ...state.shared, [factor]: value, scene: 'moon' })) : input;
      const framing = engines[0].framingFor(framingCombos);
      for (const [side, combo] of input.entries()) {
        if (token !== state.token) return;
        const sideFraming = { ...framing, captureAspect: $('#scene' + side).clientWidth / $('#scene' + side).clientHeight, outlineColor: side === 0 ? 0x53c7eb : 0xa5df9c };
        const key = JSON.stringify([combo, sideFraming, mode, factor]);
        let result = resultCache.get(key);
        if (!result) {
          await nextTask();
          if (token !== state.token) return;
          const whole = await engines[side].captureResult(false, false, sideFraming);
          if (token !== state.token) { URL.revokeObjectURL(whole); return; }
          let cutaway;
          try {
            await nextTask();
            if (token !== state.token) { URL.revokeObjectURL(whole); return; }
            cutaway = await engines[side].captureResult(true, false, sideFraming);
          } catch (error) { URL.revokeObjectURL(whole); throw error; }
          if (token !== state.token) { URL.revokeObjectURL(whole); URL.revokeObjectURL(cutaway); return; }
          // Decode before revealing or opening records, outside the click handler.
          try {
            await Promise.all([whole, cutaway].map(async url => { const image = new Image(); image.src = url; await image.decode(); }));
          } catch (error) { URL.revokeObjectURL(whole); URL.revokeObjectURL(cutaway); throw error; }
          if (token !== state.token) { URL.revokeObjectURL(whole); URL.revokeObjectURL(cutaway); return; }
          result = { whole, cutaway, outcome: outcome(combo), ...engines[side].resultData() };
          resultCache.set(key, result); imageResources.add(result);
          if (resultCache.size > 8) resultCache.delete(resultCache.keys().next().value);
        }
        results.push(result);
      }
      if (token !== state.token) return;
      const record = { id: state.records.length + 1, mode, factor, combos: input, sides: results };
      state.records.push(record); state.result = record; state.phase = 'result'; state.view = 'whole';
      releaseUnusedImages(); render();
    } catch (error) {
      releaseUnusedImages();
      if (token === state.token) { reset(); $('#status').textContent = '结果生成失败，可重新发射'; console.error(error); }
    }
  }
  function launch() {
    if ($('#launch').disabled) return;
    clearRun();
    const token = state.token; const input = combos(); const completed = [false, false];
    const mode = state.mode, factor = state.factor;
    state.result = null; state.phase = 'running'; render();
    const startTime = performance.now() + 100;
    const phaseName = { fall:'接近',contact:'撞击',dust:'扬尘',result:'成形' };
    input.forEach((combo, side) => {
      engines[side].run(combo, {
        onPhase: phase => { if (token === state.token) $('#phase' + side).textContent = phaseName[phase] || phase; },
        onComplete: () => {
          if (token !== state.token) return;
          completed[side] = true;
          if (completed.every(Boolean)) void prepareResults(token, input, mode, factor);
        }
      }, { reduced: reduced.matches, startTime });
    });
  }
  let recordView = 'whole';
  function openRecords() { state.page = Math.max(0, state.records.length - 1); recordView = 'whole'; renderRecords(); $('#records').showModal(); }
  function renderRecords() {
    const record = state.records[state.page]; const container = $('#recordBody');
    if (!record) container.textContent = '尚无对照记录';
    else {
      container.replaceChildren();
      const toolbar = document.createElement('div'); toolbar.className = 'record-toolbar';
      const heading = document.createElement('h3'); heading.textContent = '第 ' + record.id + ' 组 · ' + (record.mode === 'factor' ? '只改变' + names[record.factor] : '相同输入 · 地球与月球'); toolbar.append(heading);
      const views = document.createElement('div'); views.className = 'segments'; views.setAttribute('aria-label', '记录对照视角');
      [['whole','3D 坑体'],['cutaway','立体剖面']].forEach(([view,text]) => {
        const button = document.createElement('button'); button.textContent = text; button.setAttribute('aria-pressed', String(recordView === view));
        button.onclick = () => { recordView = view; renderRecords(); }; views.append(button);
      }); toolbar.append(views); container.append(toolbar);
      const gallery = document.createElement('div'); gallery.className = 'record-gallery';
      record.combos.forEach((combo,index) => {
        const data = record.sides[index];
        const card = document.createElement('article'); card.className = 'record-card side-' + index;
        card.innerHTML = '<header><span class="number">' + (index+1) + '</span><h4>实验 ' + (index+1) + '</h4><strong>' + worldName(combo.scene) + '</strong></header>' +
          '<div class="record-conditions">' + Object.keys(options).map(key => '<span' + (record.mode === 'factor' && record.factor === key ? ' class="record-variable"' : '') + '>' + ({size:'大小',speed:'速度',angle:'入射角',ground:'地面'}[key]) + '<b>' + label(key,combo[key]) + '</b></span>').join('') + '</div>' +
          '<div class="record-scene"><img src="' + data[recordView] + '" alt="实验' + (index+1) + (recordView === 'whole' ? '三维坑体' : '立体剖面') + '"><svg class="meteor-annotations" preserveAspectRatio="xMidYMid slice" role="img"></svg></div>' +
          '<footer>' + [['坑口',data.outcome.scale],['坑深',data.outcome.depth],['坑形',data.outcome.shape],['溅射（定性）',data.outcome.ejecta]].map(([key,value]) => '<span>' + key + '<b>' + value + '</b></span>').join('') + '</footer>';
        MeteorResultCallouts.render(card.querySelector('svg'), data.annotations[recordView], data.outcome, recordView);
        gallery.append(card);
      }); container.append(gallery);
    }
    $('#pageNumber').textContent = (state.records.length ? state.page + 1 : 0) + ' / ' + state.records.length;
    $('#previous').disabled = state.page <= 0; $('#next').disabled = state.page >= state.records.length - 1; $('#deleteLast').disabled = !state.records.length;
  }
  $('#previousStep').onclick = () => goToStep(courseStep - 1);
  $('#nextStep').onclick = () => { if (courseStep < course.length - 1) goToStep(courseStep + 1); else openRecords(); };
  $('#launch').onclick = launch;
  $('#cancel').onclick = () => reset();
  $('#openRecords').onclick = openRecords; $('#closeRecords').onclick = () => $('#records').close();
  $('#previous').onclick = () => { state.page--; renderRecords(); }; $('#next').onclick = () => { state.page++; renderRecords(); };
  $('#deleteLast').onclick = () => { const removed = state.records.pop(); if (removed === state.result) reset(); state.page = Math.max(0,state.records.length-1); releaseUnusedImages(); renderRecords(); renderSettings(); $('#recordCount').textContent = state.records.length; };
  window.addEventListener('resize', () => { fit(); if (state.phase === 'setup') render(); });
  window.addEventListener('pagehide', () => { state.token++; engines.forEach(engine => engine.dispose()); resultCache.clear(); state.records.length = 0; releaseUnusedImages(); });
  window.meteorExperiment = Object.freeze({ state: () => ({ step:courseStep, stepKey:course[courseStep].key, mode:state.mode, factor:state.factor, phase:state.phase, view:state.view, combos:combos(), count:state.records.length, error, ready:sceneReady, records:state.records, cachedResults:resultCache.size, imageResources:imageResources.size }), stats: () => engines.map(engine => engine.stats()) });
  fit(); render();
  (async () => {
    try {
      for (const engine of engines) { await nextTask(); await engine.warmCapture(); }
      sceneReady = engines.length === 2;
    } catch (e) { error = e.message; }
    renderSettings();
  })();
})();

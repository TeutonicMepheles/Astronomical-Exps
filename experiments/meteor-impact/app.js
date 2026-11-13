(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const options = { size: [['small','小'],['medium','中'],['large','大']], speed: [['low','低'],['medium','中'],['high','高']], angle: [['90','90°'],['45','45°'],['30','30°']] };
  const names = { size: '陨石大小', speed: '进入速度', angle: '入射角' };
  const label = (key, value) => options[key].find(item => item[0] === value)?.[1] || value;
  const worldName = world => world === 'earth' ? '地球' : '月球';
  const defaults = { size: 'medium', speed: 'medium', angle: '90' };
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
  try { engines = [0,1].map(i => new MeteorScene3D($('#scene' + i))); }
  catch (e) { error = e.message; }
  const fit = () => document.documentElement.style.setProperty('--scale', Math.min(innerWidth / 1600, innerHeight / 900));
  function combos() {
    return state.mode === 'world'
      ? [{ ...state.shared, scene: 'earth' }, { ...state.shared, scene: 'moon' }]
      : state.values.map(value => ({ ...defaults, [state.factor]: value, scene: state.world }));
  }
  function outcome(combo) {
    const size = ['small','medium','large'].indexOf(combo.size);
    const speed = ['low','medium','high'].indexOf(combo.speed);
    const energy = size + speed - (combo.scene === 'earth' ? 1 : 0);
    const grade = energy <= 1 ? 0 : energy >= 3 ? 2 : 1;
    return { scale: ['小','中','大'][grade], depth: ['浅','中等','深'][grade], shape: combo.angle === '90' ? '圆' : combo.angle === '45' ? '近圆' : '不规则', ejecta: ['近','中等','远'][grade] };
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
  function switchMode(mode) {
    reset(() => { state.mode = mode; });
  }
  function optionRow(key, value, side, shared = false) {
    const row = document.createElement('div'); row.className = 'option-row';
    options[key].forEach(([id, text]) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      button.dataset.key = key; button.dataset.value = id; button.dataset.side = shared ? 'shared' : side;
      button.setAttribute('aria-pressed', String(value === id));
      button.disabled = !sceneReady;
      button.setAttribute('aria-label', (shared ? '共同条件' : '实验' + (side + 1)) + names[key] + text);
      button.onclick = () => {
        reset(() => { if (shared) state.shared[key] = id; else state.values[side] = id; });
      };
      row.append(button);
    });
    return row;
  }
  function renderSettings() {
    $$('[data-mode], [data-factor], [data-world]').forEach(button => { button.disabled = !sceneReady; });
    $('#setupTitle').textContent = state.mode === 'factor' ? '选择研究因素' : '相同条件 · 地月对照';
    $('#factors').hidden = state.mode !== 'factor'; $('#worldChoice').hidden = state.mode !== 'factor';
    $('#overview').hidden = state.mode !== 'factor';
    $$('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
    $$('[data-factor]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.factor === state.factor)));
    $$('[data-world]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.world === state.world)));
    const container = $('#choices'); container.replaceChildren();
    if (state.mode === 'factor') {
      [0,1].forEach(side => {
        const block = document.createElement('section'); block.className = 'choice-block side-' + side;
        block.innerHTML = '<header><b class="number">' + (side + 1) + '</b><strong>' + names[state.factor] + '</strong></header>';
        block.append(optionRow(state.factor, state.values[side], side)); container.append(block);
      });
    } else {
      const worldTags = document.createElement('div'); worldTags.className = 'compare-worlds';
      worldTags.innerHTML = '<span>① 地球</span><span>② 月球</span>'; container.append(worldTags);
      Object.keys(options).forEach(key => {
        const row = document.createElement('div'); row.className = 'shared-row';
        const text = document.createElement('span'); text.textContent = names[key];
        row.append(text, optionRow(key, state.shared[key], 0, true)); container.append(row);
      });
    }
    const fixed = $('#fixed'); fixed.replaceChildren();
    if (state.mode === 'factor') Object.keys(defaults).filter(key => key !== state.factor).forEach(key => {
      const tag = document.createElement('span'); tag.textContent = names[key] + ' ' + label(key, defaults[key]) + ' · 固定'; fixed.append(tag);
    });
    else fixed.textContent = '大小、速度、入射角同步锁定';
    $('#fixedSummary').textContent = state.mode === 'factor' ? '仅改变' + names[state.factor] + ' · 其余条件一致' : '仅改变大气环境 · 输入条件一致';
    $('#pairTitle').textContent = state.mode === 'factor' ? names[state.factor] + '对照' : '地球与月球对照';
    $('#launch').disabled = !sceneReady || Boolean(error) || ['running','preparing'].includes(state.phase) || (state.mode === 'factor' && state.values[0] === state.values[1]);
    $('#cancel').hidden = !['running','preparing'].includes(state.phase);
    $('#status').textContent = error ? '3D 初始化失败，请重新加载' : !sceneReady ? '正在准备场景…' : state.phase === 'preparing' ? '整理对照结果…' : state.phase === 'running' ? '接近 → 撞击 → 扬尘 → 成形' : state.mode === 'factor' && state.values[0] === state.values[1] ? '请选择两个不同档位' : state.phase === 'result' ? '已记录一组对照' : '';
  }
  function renderViews() {
    const current = state.result?.combos || combos();
    current.forEach((combo, side) => {
      $('#title' + side).textContent = worldName(combo.scene) + ' · ' + (state.mode === 'factor' ? label(state.factor, combo[state.factor]) : '相同输入');
      $('#environment' + side).textContent = combo.scene === 'earth' ? '有大气' : '无大气';
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
        $('#outcome' + side).innerHTML = [['坑口',data.scale],['坑深',data.depth],['坑形',data.shape],['溅射',data.ejecta]].map(([key,value]) => '<span>' + key + '<b>' + value + '</b></span>').join('');
      }
      if (state.phase !== 'running') $('#phase' + side).textContent = '';
    });
    $('#boundaryNote').hidden = state.phase !== 'result';
    $('#wholeView').setAttribute('aria-pressed', String(state.view === 'whole'));
    $('#cutView').setAttribute('aria-pressed', String(state.view === 'cutaway'));
    $('#wholeView').disabled = $('#cutView').disabled = state.phase !== 'result';
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
        ? options[factor].map(([value]) => ({ ...defaults, [factor]: value, scene: 'moon' })) : input;
      const framing = engines[0].framingFor(framingCombos);
      for (const [side, combo] of input.entries()) {
        if (token !== state.token) return;
        const sideFraming = { ...framing, outlineColor: side === 0 ? 0x53c7eb : 0xa5df9c };
        const key = JSON.stringify([combo, sideFraming]);
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
  function openRecords() { state.page = Math.max(0, state.records.length - 1); renderRecords(); $('#records').showModal(); }
  function renderRecords() {
    const record = state.records[state.page]; const container = $('#recordBody');
    if (!record) container.textContent = '尚无对照记录';
    else {
      container.innerHTML = '<table><thead><tr><th>组 / 实验</th><th>场景</th><th>大小</th><th>速度</th><th>入射角</th><th>坑口</th><th>坑深</th><th>坑形</th><th>溅射</th><th>3D / 立体剖面</th></tr></thead><tbody>' + record.combos.map((combo,side) => {
        const data = record.sides[side];
        return '<tr><td>' + record.id + ' / ' + (side+1) + '</td><td>' + worldName(combo.scene) + '</td><td>' + label('size',combo.size) + '</td><td>' + label('speed',combo.speed) + '</td><td>' + combo.angle + '°</td><td>' + data.outcome.scale + '</td><td>' + data.outcome.depth + '</td><td>' + data.outcome.shape + '</td><td>' + data.outcome.ejecta + '</td><td class="images"><img src="' + data.whole + '" alt="本轮3D"><img src="' + data.cutaway + '" alt="本轮立体剖面"></td></tr>';
      }).join('') + '</tbody></table>';
      const heading = document.createElement('h3'); heading.textContent = record.mode === 'factor' ? '只改变' + names[record.factor] : '相同输入 · 地球与月球'; container.prepend(heading);
      const gallery = document.createElement('div'); gallery.className = 'record-gallery';
      gallery.innerHTML = record.sides.map((side,index) => '<figure><figcaption>实验 ' + (index+1) + '</figcaption><img src="' + side.whole + '" alt="三维结果"><img src="' + side.cutaway + '" alt="立体剖面"></figure>').join(''); container.append(gallery);
    }
    $('#pageNumber').textContent = (state.records.length ? state.page + 1 : 0) + ' / ' + state.records.length;
    $('#previous').disabled = state.page <= 0; $('#next').disabled = state.page >= state.records.length - 1; $('#deleteLast').disabled = !state.records.length;
  }
  function overview() {
    $('#overviewTitle').textContent = worldName(state.world) + ' · ' + names[state.factor] + '三档对照';
    $('#overviewCards').replaceChildren(...options[state.factor].map(([value,text]) => {
      let found;
      for (const record of [...state.records].reverse()) {
        if (record.mode !== 'factor' || record.factor !== state.factor) continue;
        const side = record.combos.findIndex(combo => combo.scene === state.world && combo[state.factor] === value);
        if (side >= 0) { found = record.sides[side]; break; }
      }
      const article = document.createElement('article'); article.className = 'overview-card';
      article.innerHTML = '<h3>' + text + '</h3>' + (found ? '<img src="' + found.whole + '" alt="3D坑体"><img src="' + found.cutaway + '" alt="立体剖面">' : '<div class="empty">尚未试验</div>');
      const button = document.createElement('button'); button.textContent = '选为实验 2';
      button.onclick = () => { $('#overviewDialog').close(); reset(() => { state.values[1] = value; }); }; article.append(button); return article;
    })); $('#overviewDialog').showModal();
  }
  $$('[data-mode]').forEach(button => button.onclick = () => switchMode(button.dataset.mode));
  $$('[data-factor]').forEach(button => button.onclick = () => { reset(() => { state.factor = button.dataset.factor; state.values = [options[state.factor][0][0],options[state.factor][2][0]]; }); });
  $$('[data-world]').forEach(button => button.onclick = () => { reset(() => { state.world = button.dataset.world; }); });
  $('#launch').onclick = launch; $('#cancel').onclick = $('#reset').onclick = reset;
  $('#wholeView').onclick = () => { state.view = 'whole'; renderViews(); };
  $('#cutView').onclick = () => { state.view = 'cutaway'; renderViews(); };
  $('#overview').onclick = overview; $('#closeOverview').onclick = () => $('#overviewDialog').close();
  $('#openRecords').onclick = openRecords; $('#closeRecords').onclick = () => $('#records').close();
  $('#previous').onclick = () => { state.page--; renderRecords(); }; $('#next').onclick = () => { state.page++; renderRecords(); };
  $('#deleteLast').onclick = () => { const removed = state.records.pop(); if (removed === state.result) reset(); state.page = Math.max(0,state.records.length-1); releaseUnusedImages(); renderRecords(); $('#recordCount').textContent = state.records.length; };
  window.addEventListener('resize', () => { fit(); if (state.phase === 'setup') render(); });
  window.addEventListener('pagehide', () => { state.token++; engines.forEach(engine => engine.dispose()); resultCache.clear(); state.records.length = 0; releaseUnusedImages(); });
  window.meteorExperiment = Object.freeze({ state: () => ({ mode:state.mode, factor:state.factor, phase:state.phase, view:state.view, combos:combos(), count:state.records.length, error, ready:sceneReady, records:state.records, cachedResults:resultCache.size, imageResources:imageResources.size }), stats: () => engines.map(engine => engine.stats()) });
  fit(); render();
  (async () => {
    try {
      for (const engine of engines) { await nextTask(); await engine.warmCapture(); }
      sceneReady = engines.length === 2;
    } catch (e) { error = e.message; }
    renderSettings();
  })();
})();

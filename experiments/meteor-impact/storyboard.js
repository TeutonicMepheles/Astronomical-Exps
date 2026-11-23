(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const factors = [
    { key: 'size', title: '陨石大小', choices: [['small', '小 20 m'], ['medium', '中 50 m'], ['large', '大 300 m']] },
    { key: 'speed', title: '进入速度', choices: [['low', '10 km/s'], ['medium', '20 km/s'], ['high', '40 km/s']] },
    { key: 'angle', title: '陨石入射角', choices: [['90', '90°'], ['45', '45°'], ['20', '20°']] },
    { key: 'ground', title: '地面类型', choices: [['loose', '疏松地面'], ['compact', '紧致地面']] },
    { key: 'scene', title: '撞击目标类型', choices: [['earth', '地球'], ['moon', '月球']] }
  ];
  const fixed = { size: 'medium', speed: 'medium', angle: '90', ground: 'compact', scene: 'moon' };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const story = $('#story');
  const split = $('#split');
  const spaceSplit = $('#space-split');
  const hero = $('#hero');
  const canvas = $('#first');
  const second = $('#second');
  const sideButtons = [...document.querySelectorAll('#assign [data-side]')];
  const steps = [...document.querySelectorAll('[data-step]')];
  const panels = [$('#left'), $('#right')];
  const phases = { fall: '下落中', contact: '撞击', dust: '扬尘', result: '撞击完成' };
  const viewport = [960, 1080];
  const engines = [];
  const cancel = $('#cancel');
  const showResult = $('#showResult');
  let factor, activeSide, values;
  let frame = 0;
  let ready = false;
  let splitReady = false;
  let unloaded = false;
  let pending;
  let fallTimer;
  let runId = 0;
  let currentRecord;
  const records = window.createMeteorRecords?.(engines, removed => {
    if (removed !== currentRecord) return;
    currentRecord = null;
    showResult.hidden = true;
  });
  const startTime = performance.now();

  function fit() {
    story.style.setProperty('--fit', Math.min(innerWidth / 1920, innerHeight / 1080));
  }

  function animateHero(now) {
    frame = 0;
    if (!ready || document.hidden || (hero.hidden && spaceSplit.hidden)) return;
    const elapsed = motion.matches ? 0 : (now - startTime) / 1000;
    engines[0].drawFloatingMeteor(elapsed);
    if (!spaceSplit.hidden) engines[1].drawFloatingMeteor(elapsed);
    if (!motion.matches) frame = requestAnimationFrame(animateHero);
  }

  function updateHero() {
    cancelAnimationFrame(frame);
    animateHero(performance.now());
  }

  function setStage(stage) {
    story.dataset.stage = stage;
    const current = steps.findIndex(step => step.dataset.step === stage);
    steps.forEach((step, index) => {
      if (index === current) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      step.classList.toggle('done', index < current);
      step.querySelector('b').textContent = index < current ? '✓' : index + 1;
    });
    $('#controls').hidden = stage === 'observe';
    $('#factors').hidden = stage !== 'factors';
    $('#settings').hidden = stage !== 'settings';
    $('#fire').hidden = stage !== 'settings';
  }

  function factorMark(item) {
    const mark = document.createElement('img');
    mark.className = 'factor-icon';
    mark.alt = '';
    mark.width = 60;
    mark.height = 60;
    mark.src = 'assets/storyboard-icons/' + item.key + '.png';
    return mark;
  }

  function showFactors() {
    factor = null;
    setStage('factors');
    $('#task').textContent = '选择这一轮要比较的因素';
    $('#instruction').textContent = '每轮只改变一个因素。';
    $('#task').focus();
  }

  function chooseFactor(item) {
    factor = item;
    values = [null, null];
    activeSide = null;
    $('#factor').replaceChildren(factorMark(factor), factor.title);
    $('#options').replaceChildren(...factor.choices.map(([value, label]) => {
      const button = document.createElement('button');
      button.className = 'option';
      button.dataset.value = value;
      const marker = document.createElement('b');
      marker.className = 'marker';
      marker.setAttribute('aria-hidden', 'true');
      button.append(marker, label);
      button.onclick = () => {
        if (activeSide === null) return;
        const side = activeSide;
        values[side] = value;
        activeSide = null;
        renderSettings();
        const other = sideButtons[1 - side];
        (values.every(Boolean) && !$('#fire').disabled ? $('#fire') : other).focus();
      };
      return button;
    }));
    showSettings();
  }

  function showSettings() {
    setStage('settings');
    $('#task').textContent = '为两个实验分配参数';
    renderSettings();
    $('#task').focus();
  }

  function renderSettings() {
    const assigned = values.every(Boolean);
    $('#instruction').textContent = activeSide !== null
      ? '为实验 ' + (activeSide + 1) + ' 选择一个档位。'
      : assigned ? '两组参数已就绪。' : '先点击实验 1 或实验 2。';
    if (factor.key === 'ground') $('#instruction').textContent += ' 两组均在地球地表，使用 300 m 陨石。';
    sideButtons.forEach((button, side) => {
      button.setAttribute('aria-pressed', String(activeSide === side));
      button.classList.toggle('assigned', Boolean(values[side]));
    });
    for (const button of $('#options').children) {
      const first = values[0] === button.dataset.value;
      const second = values[1] === button.dataset.value;
      const marker = button.querySelector('.marker');
      marker.hidden = !first && !second;
      marker.textContent = first && second ? '1/2' : first ? '1' : second ? '2' : '';
      if (marker.hidden) delete button.dataset.owner;
      else button.dataset.owner = first && second ? 'both' : first ? '0' : '1';
      if (marker.hidden) button.removeAttribute('aria-description');
      else button.setAttribute('aria-description', first && second ? '实验 1 和实验 2 已选' : first ? '实验 1 已选' : '实验 2 已选');
      button.disabled = activeSide === null;
    }
    $('#fire').disabled = !assigned || engines.length < 2 || !splitReady;
  }

  async function prepareSecond() {
    if (unloaded) return;
    if (pending) return pending;
    pending = (async () => {
      try {
        engines.push(new MeteorScene3D($('#second'), { initialRotation: [-.65, 2.1, .8], viewport }));
        if (records) await engines[1].warmStoryboard();
        else await engines[1].loadMeteor();
        if (unloaded) return;
        splitReady = true;
        if (story.dataset.stage === 'settings') renderSettings();
      } catch {
        $('#error').textContent = '第二个撞击场景加载失败，请刷新后重试。';
      }
    })();
    return pending;
  }

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  async function launch() {
    const id = ++runId;
    const conditions = factor.key === 'ground' ? { ...fixed, scene: 'earth', size: 'large' } : fixed;
    const inputs = values.map(value => ({ ...conditions, [factor.key]: value }));
    const estimates = records ? inputs.map(input => {
      const reference = MeteorImpactResultModel.calculate(input);
      if (input.scene !== 'earth' || input.ground !== 'loose') return reference;
      return { ...reference, depth: reference.depth * 1.6, referenceDepth: reference.depth };
    }) : null;
    const metersPerUnit = estimates && Math.max(...estimates.map(result =>
      Math.max(result.ejecta / 19, result.depth / 11)));
    const combos = estimates ? inputs.map((input, side) => ({
      ...input, estimate: estimates[side], metersPerUnit
    })) : inputs;
    setStage('observe');
    hero.hidden = true;
    spaceSplit.hidden = false;
    $('#space-left').append(canvas);
    $('#space-right').append(second);
    engines.forEach(engine => engine.resize());
    updateHero();
    panels.forEach((panel, side) => {
      const label = factor.choices.find(([value]) => value === values[side])[1];
      panel.querySelector('h2').textContent = '实验 ' + (side + 1) + ' · ' + label;
      panel.querySelector('.phase').textContent = '准备撞击';
    });
    $('#observations').hidden = false;
    $('#retry').disabled = $('#another').disabled = true;
    $('#observation').textContent = '观察两颗陨石的下落与撞击。';
    $('#observation').focus();
    if (cancel) cancel.hidden = false;
    if (showResult) showResult.hidden = true;
    currentRecord = null;
    records?.renderObservation(null, panels);
    // Populate the terrain cache while the two rocks are still in space.
    void (async () => {
      for (const [side, combo] of combos.entries()) {
        if (id !== runId || spaceSplit.hidden) return;
        await engines[side].prepareImpact(combo);
      }
    })();
    await nextFrame();
    const transitions = spaceSplit.getAnimations({ subtree: true });
    await Promise.allSettled(transitions.map(animation => animation.finished));
    if (id !== runId) return;
    fallTimer = setTimeout(() => {
      const startTime = performance.now();
      spaceSplit.hidden = true;
      updateHero();
      split.hidden = false;
      panels[0].prepend(canvas);
      panels[1].prepend(second);
      engines.forEach(engine => engine.resize());
      let completed = 0;
      engines.forEach((engine, side) => engine.run(combos[side], {
        onPhase: phase => { panels[side].querySelector('.phase').textContent = phases[phase] || ''; },
        onComplete: async () => {
          if (++completed !== 2) return;
          if (records) {
            $('#observation').textContent = '正在整理坑体和立体剖面…';
            const mode = factor.key === 'scene' ? 'world' : 'factor';
            try {
              const result = await records.capture(combos, mode, factor.key, () => id === runId);
              if (id !== runId) return;
              currentRecord = result;
              showResult.hidden = !currentRecord;
              if (currentRecord) records.renderObservation(currentRecord, panels);
            } catch (error) {
              if (id !== runId) return;
              $('#error').textContent = '结果生成失败，可重新发射。';
              console.error(error);
            }
          }
          if (cancel) cancel.hidden = true;
          $('#observation').textContent = '比较两组的坑径、坑深与溅射范围。左右使用同一比例尺。';
          $('#retry').disabled = $('#another').disabled = false;
        }
      }, { startTime, reduced: motion.matches, inFrame: true }));
    }, 500);
  }

  function leaveSplit(next) {
    ++runId;
    clearTimeout(fallTimer);
    engines.forEach(engine => engine.cancel(false, false));
    spaceSplit.hidden = true;
    hero.append(canvas);
    hero.hidden = false;
    split.hidden = $('#observations').hidden = true;
    engines[0].resize();
    updateHero();
    next();
  }

  for (const item of factors) {
    const button = document.createElement('button');
    button.className = 'factor-button';
    button.append(factorMark(item), item.title);
    button.onclick = () => chooseFactor(item);
    $('#factors').append(button);
  }
  // Sparse fixed stars twinkle without per-frame layout.
  for (let i = 0; i < 24; i++) {
    const star = document.createElement('i');
    star.style.setProperty('--x', ((i * 37 + 11) % 97) + '%');
    star.style.setProperty('--y', ((i * 23 + 8) % 91) + '%');
    star.style.setProperty('--period', (4.6 + i % 7 * .65) + 's');
    star.style.setProperty('--offset', (-i * .71) + 's');
    $('#stars').append(star);
  }
  sideButtons.forEach((button, side) => {
    button.onclick = () => {
      activeSide = side;
      renderSettings();
    };
  });
  $('#start').onclick = () => {
    $('#start').hidden = true;
    $('#story-header').hidden = false;
    showFactors();
    setTimeout(prepareSecond, 200);
  };
  $('#back').onclick = showFactors;
  $('#fire').onclick = launch;
  $('#retry').onclick = () => leaveSplit(showSettings);
  $('#another').onclick = () => leaveSplit(showFactors);
  if (cancel) cancel.onclick = () => leaveSplit(showSettings);
  if (showResult) showResult.onclick = () => records.open(currentRecord);
  window.addEventListener('resize', fit);
  document.addEventListener('visibilitychange', updateHero);
  motion.addEventListener('change', updateHero);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    unloaded = true;
    ++runId;
    ready = false;
    cancelAnimationFrame(frame);
    clearTimeout(fallTimer);
    engines.forEach(engine => engine.dispose());
    records?.dispose();
  });

  fit();
  (async () => {
    try {
      engines.push(new MeteorScene3D(canvas, { viewport }));
      if (records) {
        await engines[0].warmStoryboard();
        await prepareSecond();
        if (!splitReady) return;
      } else await engines[0].loadMeteor();
      if (unloaded) return;
      ready = true;
      story.removeAttribute('data-loading');
      $('#start span').textContent = '点击陨石以开始实验';
      $('#start').disabled = false;
      updateHero();
    } catch {
      $('#error').textContent = '陨石模型加载失败，请刷新后重试。';
    }
  })();
})();

import { createMeteorWake } from './components/meteor-wake.js';
import { createMeteorStarfield } from './components/meteor-starfield.js';
import { MeteorConditionPreview, entrySpeeds } from './condition-preview.js';

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
  const fixed = { size: 'medium', speed: 'medium', angle: '90', ground: 'loose', scene: 'moon' };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const story = $('#story');
  const sky = new URLSearchParams(location.search).get('sky');
  story.dataset.sky = ['galactic-band', 'dust-arc'].includes(sky) ? sky : 'nebula';
  const split = $('#split');
  const spaceSplit = $('#space-split');
  const spacePlanets = $('#space-planets');
  const spaceGround = $('#space-ground');
  const hero = $('#hero');
  const drawHeroWake = createMeteorWake(hero);
  const spaceRocks = [$('#space-left'), $('#space-right')];
  const drawSplitWakes = spaceRocks.map((rock, side) => createMeteorWake(rock, side * 37));
  const splitWakeTimes = [0, 0];
  const colors = getComputedStyle(story);
  const splitPreviews = [...spaceSplit.querySelectorAll('.split-diagram')].map((diagram, side) =>
    new MeteorConditionPreview(diagram, colors.getPropertyValue(side === 0 ? '--blue' : '--violet').trim()));
  const canvas = $('#first');
  const second = $('#second');
  const sideButtons = [...document.querySelectorAll('#assign [data-side]')];
  const steps = [...document.querySelectorAll('[data-step]')];
  const panels = [$('#left'), $('#right')];
  const observationPanels = [...document.querySelectorAll('.observation-panel')];
  const continueExperiment = $('#continue-experiment');
  const another = $('#another');
  const retry = $('#retry');
  const phases = { fall: '下落中', contact: '撞击', dust: '扬尘', result: '撞击完成' };
  const viewport = [960, 1080];
  const engines = [];
  const cancel = $('#cancel');
  const resultViews = $('#result-views');
  const resultViewStatus = $('#result-view-status');
  const resultTabs = [...(resultViews?.querySelectorAll('[role="tab"]') ?? [])];
  const selectionToast = $('#selection-toast');
  const fixedComparison = $('#fixed-comparison');
  const fire = $('#fire');
  const back = $('#back');
  const launchActions = $('#launch-actions');
  let factor, activeSide, values;
  let frame = 0;
  let ready = false;
  let splitReady = false;
  let unloaded = false;
  let pending;
  let fallTimer;
  let toastTimer;
  let runId = 0;
  let currentResult;
  let resultFailed = false;
  let selectedResultTab;
  const results = window.createMeteorResults?.(engines, viewport);
  let heroStartTime;
  let previousFrameTime;

  function fit() {
    story.style.setProperty('--fit', Math.min(innerWidth / 1920, innerHeight / 1080));
  }

  function wakeAngle(side) {
    return factor?.key === 'angle' && values[side] ? Number(values[side]) : Number(fixed.angle);
  }

  function animateHero(now) {
    frame = 0;
    if (!ready || document.hidden || (hero.hidden && spaceSplit.hidden)) return;
    const elapsed = motion.matches ? 0 : (now - heroStartTime) / 1000;
    const delta = previousFrameTime === undefined ? 0 : Math.max(0, now - previousFrameTime) / 1000;
    previousFrameTime = now;
    const lift = Math.sin(elapsed * .65) * .08;
    if (hero.hidden) {
      const targetHeading = spacePlanets && !spacePlanets.hidden ? 120 : null;
      drawSplitWakes.forEach((draw, side) => {
        if (spaceRocks[side].hidden) return;
        const preview = splitPreviews[side];
        const scale = preview?.scale ?? 1;
        const speed = factor.key === 'speed' ? values[side] : fixed.speed;
        splitWakeTimes[side] += delta * entrySpeeds[speed] / entrySpeeds[fixed.speed];
        draw(motion.matches ? 0 : splitWakeTimes[side], lift, scale, motion.matches ? 0 : .55,
          targetHeading ?? wakeAngle(side));
        preview?.alignAngle(-lift * 520 / 3);
        engines[side].drawFloatingMeteor(elapsed, scale, lift);
      });
    } else {
      const surge = !motion.matches && story.dataset.stage === 'intro'
        ? Math.max(0, 1 - elapsed / 1.15) : 0;
      drawHeroWake(elapsed, lift, 1, surge);
      engines[0].drawFloatingMeteor(elapsed, 1, lift);
    }
    if (!motion.matches) frame = requestAnimationFrame(animateHero);
  }

  function updateHero() {
    cancelAnimationFrame(frame);
    previousFrameTime = undefined;
    animateHero(performance.now());
  }

  function clearSelectionToast() {
    clearTimeout(toastTimer);
    selectionToast.textContent = '';
  }

  function showDuplicateToast(side) {
    selectionToast.textContent = '实验 ' + (side + 1) + ' 已选此档，请选择其他档位。';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(clearSelectionToast, 3000);
  }

  function setStage(stage) {
    clearSelectionToast();
    story.dataset.stage = stage;
    if (resultViews) {
      resultViews.hidden = stage !== 'observe';
      $('#observation-panels').hidden = stage !== 'observe';
    }
    if (resultViewStatus) resultViewStatus.hidden = true;
    const current = steps.findIndex(step => step.dataset.step === stage);
    steps.forEach((step, index) => {
      if (index === current) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      const done = index < current && (index === 0 ? Boolean(factor) : Boolean(values?.every(value => value !== null)));
      step.classList.toggle('done', done);
      step.querySelector('b').textContent = done ? '✓' : index + 1;
    });
    $('#controls').hidden = stage === 'observe';
    $('#factors').hidden = stage !== 'factors';
    $('#settings').hidden = stage !== 'settings';
    fire.hidden = stage !== 'settings';
    if (launchActions) launchActions.hidden = stage !== 'settings';
    if (fixedComparison) fixedComparison.hidden = true;
  }

  function selectResultView(selected) {
    if (!selected) return;
    selectedResultTab = selected;
    resultTabs.forEach(tab => {
      tab.setAttribute('aria-selected', String(tab === selected));
      tab.tabIndex = tab === selected ? 0 : -1;
    });
    split.setAttribute('role', 'tabpanel');
    split.setAttribute('aria-labelledby', selected.id);
    const view = selected.dataset.view;
    const waitingForSection = !currentResult && view === 'cutaway';
    resultViewStatus.hidden = !waitingForSection;
    if (waitingForSection) resultViewStatus.textContent = resultFailed ? '剖面生成失败' : '撞击后显示剖面';
    if (currentResult) results.renderObservation(currentResult, panels, observationPanels, view);
    else if (!split.hidden) engines.forEach(engine => engine.setObservationView(view));
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
    $('#instruction').textContent = launchActions ? '' : '每轮只改变一个因素。';
    $('#task').focus();
  }

  function chooseFactor(item) {
    factor = item;
    values = [null, null];
    activeSide = null;
    if (hasFixedPair()) {
      values = item.choices.map(([value]) => value);
      showSettings();
      return;
    }
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
        const otherSide = 1 - activeSide;
        if (values[otherSide] === value) {
          showDuplicateToast(otherSide);
          return;
        }
        clearSelectionToast();
        values[activeSide] = value;
        renderSettings();
      };
      return button;
    }));
    showSettings();
  }

  function hasFixedPair() {
    return Boolean(fixedComparison && factor?.choices.length === 2);
  }

  function comparisonValue(side) {
    return factor.choices.find(([value]) => value === values[side])[1];
  }

  function comparisonLabel(side) {
    return '实验 ' + (side + 1) + ' · ' + comparisonValue(side);
  }

  function showSpaceSplit() {
    if (!spaceSplit.hidden) return;
    hero.hidden = true;
    if (spacePlanets) spacePlanets.hidden = factor.key !== 'scene';
    if (spaceGround) spaceGround.hidden = factor.key !== 'ground';
    spaceSplit.hidden = false;
    $('#space-left').append(canvas);
    $('#space-right').append(second);
    engines.forEach(engine => engine.resize());
    updateHero();
  }

  function showSettings() {
    setStage('settings');
    if (launchActions) fire.querySelector('b').textContent = '开始实验';
    if (hasFixedPair()) {
      $('#controls').hidden = true;
      renderSettings();
      (fire.disabled ? back : fire).focus();
      return;
    }
    $('#task').textContent = launchActions ? '选择' + (factor.key === 'size' ? '陨石直径' : factor.title) : '为两个实验分配参数';
    renderSettings();
    $('#task').focus();
  }

  function renderSettings() {
    fire.disabled = !values.every(Boolean) || !splitReady;
    if (fixedComparison && splitReady && values.some(Boolean)) {
      fixedComparison.hidden = false;
      fixedComparison.querySelectorAll('h2').forEach((heading, side) => {
        heading.hidden = !values[side];
        if (values[side]) heading.textContent = comparisonLabel(side);
        splitPreviews[side].set(factor.key, values[side]);
        spaceRocks[side].hidden = !values[side];
      });
      showSpaceSplit();
      if (motion.matches) updateHero();
    }
    if (hasFixedPair()) return;
    $('#instruction').textContent = activeSide !== null
      ? '为实验 ' + (activeSide + 1) + ' 选择一个档位。'
      : '先点击实验 1 或实验 2。';
    if (factor.key === 'ground') $('#instruction').textContent += ' 两组均按地球条件计算，使用 300 m 陨石。';
    sideButtons.forEach((button, side) => {
      button.setAttribute('aria-pressed', String(activeSide === side));
      button.classList.toggle('assigned', Boolean(values[side]));
    });
    for (const button of $('#options').children) {
      const owner = values.indexOf(button.dataset.value);
      const marker = button.querySelector('.marker');
      marker.hidden = owner === -1;
      marker.textContent = marker.hidden ? '' : String(owner + 1);
      if (marker.hidden) {
        delete button.dataset.owner;
        button.removeAttribute('aria-description');
      } else {
        button.dataset.owner = owner;
        button.setAttribute('aria-description', '实验 ' + (owner + 1) + ' 已选');
      }
      button.disabled = activeSide === null;
      button.setAttribute('aria-pressed', String(values[activeSide] === button.dataset.value));
    }
  }

  async function prepareSecond() {
    if (unloaded) return;
    if (pending) return pending;
    pending = (async () => {
      try {
        engines.push(new MeteorScene3D($('#second'), { initialRotation: [-.65, 2.1, .8], viewport }));
        if (results) await engines[1].warmStoryboard();
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
    const inputs = values.map(value => ({
      ...conditions, [factor.key]: value, stylizedLunar: Boolean(results) && factor.key !== 'scene'
    }));
    const estimates = results ? inputs.map(input => {
      const reference = MeteorImpactResultModel.calculate(input);
      if (factor.key !== 'ground' || input.ground !== 'loose') return reference;
      return { ...reference, depth: reference.depth * 1.6, referenceDepth: reference.depth };
    }) : null;
    const sharedScale = estimates && Math.max(...estimates.map(result => Math.max(result.ejecta / 19, result.depth / 11)));
    const combos = estimates ? inputs.map((input, side) => ({
      ...input, estimate: estimates[side], metersPerUnit: sharedScale
    })) : inputs;
    setStage('observe');
    const angleFlight = Boolean(launchActions) && factor.key === 'angle';
    spaceSplit.toggleAttribute('data-angle-flight', angleFlight);
    if (angleFlight) {
      spaceRocks.forEach((rock, side) => {
        const angle = Number(combos[side].angle) * Math.PI / 180;
        rock.style.setProperty('--flight-x', `${1280 * Math.cos(angle)}px`);
        rock.style.setProperty('--flight-y', `${1280 * Math.sin(angle)}px`);
      });
    }
    showSpaceSplit();
    if (observationPanels.length) {
      $('#comparison-factor').textContent = '比较因素：' + factor.title;
      const symbol = { size: 'D', speed: 'v', angle: 'θ' }[factor.key];
      observationPanels.forEach((panel, side) => {
        const value = comparisonValue(side);
        const label = symbol
          ? symbol + ' = ' + (factor.key === 'size' ? value.slice(2) : value)
          : value;
        panel.querySelector('.trial-value').textContent = label;
        panel.querySelector('h2').setAttribute('aria-label', '实验 ' + (side + 1) + '，' + label);
      });
    }
    panels.forEach((panel, side) => {
      const heading = panel.querySelector('h2');
      if (heading) heading.textContent = comparisonLabel(side);
      panel.querySelector('.phase').textContent = '准备撞击';
    });
    $('#observations').hidden = false;
    if (another) retry.disabled = another.disabled = true;
    $('#observation').textContent = '观察两颗陨石的下落与撞击。';
    $('#error').textContent = '';
    (resultViews ? retry : $('#observation')).focus();
    if (cancel) cancel.hidden = false;
    currentResult = null;
    resultFailed = false;
    split.removeAttribute('role');
    split.removeAttribute('aria-labelledby');
    results?.renderObservation(null, panels, observationPanels);
    selectResultView($('#view-whole'));
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
    if (!motion.matches) spaceSplit.setAttribute('data-dropping', '');
    fallTimer = setTimeout(() => {
      const startTime = performance.now();
      spaceSplit.hidden = true;
      spaceSplit.removeAttribute('data-dropping');
      updateHero();
      split.hidden = false;
      panels[0].prepend(canvas);
      panels[1].prepend(second);
      engines.forEach(engine => engine.resize());
      if (selectedResultTab) engines.forEach(engine => engine.setObservationView(selectedResultTab.dataset.view, false));
      let completed = 0;
      engines.forEach((engine, side) => engine.run(combos[side], {
        onPhase: phase => {
          panels[side].querySelector('.phase').textContent = resultViews && phase === 'result' ? '' : phases[phase] || '';
        },
        onComplete: async () => {
          if (++completed !== 2) return;
          if (results) {
            $('#observation').textContent = '正在整理坑体和立体剖面…';
            const mode = factor.key === 'scene' ? 'world' : 'factor';
            try {
              const result = await results.capture(combos, mode, () => id === runId);
              if (id !== runId) return;
              currentResult = result;
              selectResultView(selectedResultTab);
            } catch (error) {
              if (id !== runId) return;
              resultFailed = true;
              selectResultView(selectedResultTab);
              $('#error').textContent = '结果生成失败，可重新发射。';
              console.error(error);
            }
          }
          if (cancel) cancel.hidden = true;
          $('#observation').textContent = '比较两组的坑径、坑深与溅射范围。' +
            '左右使用同一比例尺。';
          if (another) retry.disabled = another.disabled = false;
        }
      }, { startTime, reduced: motion.matches, inFrame: true }));
    }, 500);
  }

  function leaveSplit(next) {
    ++runId;
    clearTimeout(fallTimer);
    $('#error').textContent = '';
    engines.forEach(engine => {
      engine.cancel(false, false);
      engine.setObservationView('whole', false);
    });
    currentResult = null;
    results?.renderObservation(null, panels, observationPanels);
    spaceSplit.hidden = true;
    spaceSplit.removeAttribute('data-dropping');
    hero.append(canvas);
    hero.hidden = false;
    split.hidden = $('#observations').hidden = true;
    engines[0].resize();
    next();
    updateHero();
  }

  function navigateStage(stage) {
    if (story.dataset.stage === stage) return;
    function showPending() {
      setStage(stage);
      if (resultViews) resultViews.hidden = true;
      $('#observation-panels').hidden = true;
      $('#controls').hidden = false;
      $('#settings').hidden = true;
      fire.hidden = true;
      if (launchActions) launchActions.hidden = true;
      $('#task').textContent = stage === 'settings' ? '设置对比参数' : '观察结果';
      $('#instruction').textContent = '请先完成前置操作';
      $('#task').focus();
    }
    const next = stage === 'factors' ? showFactors : stage === 'settings' && factor ? showSettings : showPending;
    if (!spaceSplit.hidden) leaveSplit(next);
    else next();
  }

  steps.forEach(step => {
    step.setAttribute('role', 'button');
    step.tabIndex = 0;
    step.addEventListener('click', () => navigateStage(step.dataset.step));
    step.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      navigateStage(step.dataset.step);
    });
  });
  for (const item of factors) {
    const button = document.createElement('button');
    button.className = 'factor-button';
    button.append(factorMark(item), item.title);
    button.onclick = () => chooseFactor(item);
    $('#factors').append(button);
  }
  if (story.dataset.sky === 'nebula') $('#stars').append(createMeteorStarfield());
  sideButtons.forEach((button, side) => {
    button.onclick = () => {
      clearSelectionToast();
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
  back.onclick = () => {
    if (!spaceSplit.hidden) leaveSplit(showFactors);
    else showFactors();
  };
  fire.onclick = launch;
  retry.onclick = () => leaveSplit(showSettings);
  const changeFactor = continueExperiment || another;
  if (changeFactor) changeFactor.onclick = () => leaveSplit(showFactors);
  if (cancel) cancel.onclick = () => leaveSplit(showSettings);
  resultTabs.forEach((tab, index) => {
    tab.onclick = () => selectResultView(tab);
    tab.onkeydown = event => {
      const next = { ArrowLeft: (index + 2) % 3, ArrowRight: (index + 1) % 3, Home: 0, End: 2 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      resultTabs[next].focus();
      selectResultView(resultTabs[next]);
    };
  });
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
    clearSelectionToast();
    results?.dispose();
    splitPreviews.forEach(preview => preview.dispose());
  });

  fit();
  (async () => {
    try {
      engines.push(new MeteorScene3D(canvas, { viewport }));
      if (results) {
        await engines[0].warmStoryboard();
        await prepareSecond();
        if (!splitReady) return;
      } else await engines[0].loadMeteor();
      if (unloaded) return;
      heroStartTime = performance.now();
      ready = true;
      updateHero();
      story.removeAttribute('data-loading');
      await Promise.allSettled(hero.getAnimations().map(animation => animation.finished));
      if (unloaded) return;
      $('#start span').textContent = '点击陨石以开始实验';
      $('#start').disabled = false;
    } catch {
      $('#error').textContent = '陨石模型加载失败，请刷新后重试。';
    }
  })();
})();

(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const options = { size: [['small','20 m'],['medium','50 m'],['large','300 m']], speed: [['low','10 km/s'],['medium','20 km/s'],['high','40 km/s']], angle: [['90','90°'],['45','45°'],['20','20°']], ground: [['loose','疏松地面'],['compact','紧致地面']] };
  const names = { size: '陨石大小', speed: '进入速度', angle: '陨石入射角', ground: '地面类型' };
  const label = (key, value) => options[key].find(item => item[0] === value)?.[1] || value;
  const worldName = world => world === 'earth' ? '地球' : '月球';
  const readouts = data => [['坑径', data.scale], [data.depthAdjusted ? '演示坑深' : '坑深', data.depth], ['坑形', data.shape], ['溅射范围', data.ejecta]];
  function observationReadouts(record, side) {
    const metricKeys = ['diameter', 'depth', null, 'ejecta'];
    const otherSide = 1 - side;
    const estimate = record.combos[side].estimate;
    const otherEstimate = record.combos[otherSide].estimate;
    const otherReadouts = readouts(record.sides[otherSide].outcome);
    return readouts(record.sides[side].outcome).map(([name, value], index) => {
      const metric = metricKeys[index];
      let arrow = '';
      if (metric && value !== otherReadouts[index][1]) {
        const greater = estimate[metric] > otherEstimate[metric];
        const direction = greater ? 'up' : 'down';
        const label = greater ? '较高' : '较低';
        arrow = '<span class="readout-direction" data-direction="' + direction +
          '" role="img" aria-label="' + label + '">' + (greater ? '↑' : '↓') + '</span>';
      }
      return '<div><dt>' + name + '</dt><dd>' + arrow + '<b>' + value + '</b></dd></div>';
    }).join('');
  }
  function outcome(combo) {
    const { formatLength } = MeteorImpactResultModel;
    const { diameter, depth, ejecta } = combo.estimate;
    return {
      scale: formatLength(diameter),
      depth: formatLength(depth),
      depthAdjusted: Boolean(combo.estimate.referenceDepth),
      shape: combo.scene === 'earth' ? (combo.ground === 'loose' ? '窄漏斗' : '宽浅碗')
        : combo.angle === '90' ? '圆' : combo.angle === '45' ? '近圆' : '不规则',
      ejecta: formatLength(ejecta)
    };
  }
  const viewAlt = { whole: '三维坑体', top: '俯视坑体', cutaway: '立体剖面' };
  function renderDetail(result, data, view) {
    const detailUrl = data.details[view];
    let detail = result.querySelector('.crater-detail');
    if (!detail && detailUrl) {
      detail = document.createElement('figure');
      detail.className = 'crater-detail';
      const image = new Image();
      const caption = document.createElement('figcaption');
      caption.textContent = '局部放大';
      const scale = document.createElement('span');
      const scaleLength = 10 ** Math.floor(Math.log10(data.detailWidth / 3));
      scale.className = 'detail-scale';
      scale.style.setProperty('--detail-scale-width', (100 * scaleLength / data.detailWidth) + '%');
      scale.textContent = MeteorImpactResultModel.formatLength(scaleLength);
      scale.setAttribute('aria-label', '局部比例尺 ' + scale.textContent);
      caption.append(scale);
      detail.append(image, caption);
      result.append(detail);
    }
    if (detail) {
      detail.hidden = !detailUrl;
      if (detailUrl) {
        const image = detail.querySelector('img');
        image.src = detailUrl;
        image.alt = viewAlt[view] + '局部放大';
      }
    }
  }
  window.createMeteorRecords = (engines, [width, height]) => {
    const captureAspect = width / height;
    const state = { records: [], page: 0 };
    const resultCache = new Map();
    const imageResources = new Set();
    let observation;
    const nextTask = () => new Promise(resolve => setTimeout(resolve, 0));
    function releaseUnusedImages() {
      const retained = new Set([...resultCache.values(), ...state.records.flatMap(record => record.sides)]);
      observation?.sides.forEach(side => retained.add(side));
      for (const resource of imageResources) if (!retained.has(resource)) {
        URL.revokeObjectURL(resource.whole); URL.revokeObjectURL(resource.cutaway); URL.revokeObjectURL(resource.top);
        Object.values(resource.details).forEach(url => URL.revokeObjectURL(url));
        imageResources.delete(resource);
      }
    }
    async function capture(input, mode, factor, current) {
      const results = [];
      try {
        const sharedFraming = engines[0].framingFor(input);
        for (const [side, combo] of input.entries()) {
          if (!current()) return;
          const sideFraming = { ...sharedFraming, captureAspect, outlineColor: side === 0 ? 0x53c7eb : 0xc3a2ff };
          const key = JSON.stringify([combo, sideFraming, mode, factor]);
          let result = resultCache.get(key);
          if (!result) {
            const urls = [];
            const { diameter, depth, ejecta } = combo.estimate;
            const earthInWorldPair = mode === 'world' && combo.scene === 'earth';
            const smallCrater = diameter < sharedFraming.halfWidth * 2 * combo.metersPerUnit * .08;
            const detailWidth = earthInWorldPair || smallCrater
              ? Math.max(diameter * 3, ejecta * 2.4, depth * 2) : 0;
            const views = [[false, sideFraming], [true, sideFraming], [false, { ...sideFraming, top: true }]];
            const detailViews = earthInWorldPair ? ['whole', 'cutaway', 'top'] : detailWidth ? ['whole'] : [];
            for (const detailView of detailViews) {
              views.push([detailView === 'cutaway', {
                ...sideFraming,
                detail: true,
                top: detailView === 'top',
                halfWidth: detailWidth / (2 * combo.metersPerUnit),
                centerY: -depth / (2 * combo.metersPerUnit),
                captureAspect: 1
              }]);
            }
            try {
              for (const [cutaway, framing] of views) {
                await nextTask();
                if (!current()) return;
                urls.push(await engines[side].captureResult(cutaway, false, framing));
              }
              if (!current()) return;
              await Promise.all(urls.map(async url => { const image = new Image(); image.src = url; await image.decode(); }));
              if (!current()) return;
              const [whole, cutaway, top, ...detailUrls] = urls;
              const details = Object.fromEntries(detailViews.map((view, index) => [view, detailUrls[index]]));
              result = { whole, cutaway, top, details, detailWidth, outcome: outcome(combo), ...engines[side].resultData() };
              resultCache.set(key, result); imageResources.add(result);
              if (resultCache.size > 8) resultCache.delete(resultCache.keys().next().value);
            } finally {
              if (!result) urls.forEach(url => URL.revokeObjectURL(url));
            }
          }
          results.push(result);
        }
        if (!current()) return;
        const record = { id: state.records.length + 1, mode, factor, combos: input, sides: results };
        state.records.push(record);
        $('#recordCount').textContent = state.records.length;
        releaseUnusedImages();
        return record;
      } catch (error) {
        releaseUnusedImages();
        throw error;
      }
    }

    let recordView = 'whole';
    let annotationPass = 0;
    function renderObservation(record, panels, labels, view = 'whole') {
      const pass = ++annotationPass;
      const annotationAnimations = [];
      const revealReadouts = record && labels[0].querySelector('.observed-readouts').hidden;
      const previous = observation;
      observation = record;
      if (previous && !record) releaseUnusedImages();
      panels.forEach((panel, side) => {
        let result = panel.querySelector('.observed-result');
        if (!record) {
          result?.remove();
          const metrics = labels[side].querySelector('.observed-readouts');
          metrics.hidden = true;
          metrics.replaceChildren();
          return;
        }
        const data = record.sides[side];
        if (!result) {
          result = document.createElement('div');
          result.className = 'observed-result';
          result.innerHTML = '<img alt=""><svg class="meteor-annotations" preserveAspectRatio="xMidYMid meet" role="img"></svg>';
          panel.append(result);
        }
        const scene = result.querySelector('img');
        scene.src = data[view];
        scene.alt = viewAlt[view];
        const callouts = result.querySelector('svg');
        MeteorResultCallouts.render(callouts, data.annotations[view], data.outcome, view, { scaleAtBottomRight: true });
        if (revealReadouts) annotationAnimations.push(...callouts.getAnimations({ subtree: true }));
        renderDetail(result, data, view);
      });
      if (revealReadouts) {
        void Promise.allSettled(annotationAnimations.map(animation => animation.finished)).then(() => {
          if (pass !== annotationPass) return;
          labels.forEach((label, side) => {
            const metrics = label.querySelector('.observed-readouts');
            metrics.innerHTML = observationReadouts(record, side);
            metrics.hidden = false;
          });
        });
      }
    }
    function openRecords() { state.page = Math.max(0, state.records.length - 1); recordView = 'whole'; renderRecords(); $('#records').showModal(); }
    function renderRecords() {
      const record = state.records[state.page]; const container = $('#recordBody');
      $('#record-comparison').textContent = record
        ? '比较因素：' + (record.mode === 'world' ? '撞击目标类型' : names[record.factor]) : '';
      $('#record-views').hidden = !record;
      recordViewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === recordView)));
      if (!record) container.textContent = '尚无对照记录';
      else {
        container.replaceChildren();
        const gallery = document.createElement('div'); gallery.className = 'record-gallery';
        record.combos.forEach((combo,index) => {
          const data = record.sides[index];
          const card = document.createElement('article'); card.className = 'record-card side-' + index;
          const variable = record.factor === 'scene' ? worldName(combo.scene) : label(record.factor, combo[record.factor]);
          card.innerHTML =
            '<div class="record-scene"><img src="' + data[recordView] + '" alt="实验' + (index+1) + viewAlt[recordView] + '"><svg class="meteor-annotations" preserveAspectRatio="xMidYMid slice" role="img"></svg><svg class="record-scale" viewBox="0 0 800 46"></svg>' +
            '<header class="record-trial"><span class="trial-number" aria-label="实验 ' + (index+1) + '">' + (index+1) + '</span>' +
            '<strong class="trial-value">' + variable + '</strong>' +
            (record.factor === 'scene' ? '' : '<strong class="record-world">' + worldName(combo.scene) + '</strong>') + '</header>' +
            '<footer class="record-readouts"><dl class="observed-readouts">' + observationReadouts(record, index) + '</dl></footer></div>';
          const scene = card.querySelector('.record-scene');
          scene.dataset.view = recordView;
          MeteorResultCallouts.render(scene.querySelector('.meteor-annotations'), data.annotations[recordView], data.outcome, recordView, {
            scaleAtBottomRight: true,
            scaleRoot: scene.querySelector('.record-scale')
          });
          if (record.mode === 'world' && combo.scene === 'earth') renderDetail(scene, data, recordView);
          gallery.append(card);
        }); container.append(gallery);
      }
      renderPagination();
      $('#previous').disabled = state.page <= 0; $('#next').disabled = state.page >= state.records.length - 1;
    }

    function renderPagination() {
      const count = state.records.length;
      const pageList = $('#record-pages');
      $('#record-pagination').hidden = count < 2;
      pageList.replaceChildren();
      if (count < 2) return;
      const first = Math.max(0, Math.min(state.page - 3, count - 7));
      for (let index = first; index < Math.min(first + 7, count); index++) {
        const button = document.createElement('button');
        button.setAttribute('aria-label', '第 ' + (index + 1) + ' 组');
        if (index === state.page) button.setAttribute('aria-current', 'page');
        button.onclick = () => {
          state.page = index;
          renderRecords();
          pageList.querySelector('[aria-current="page"]')?.focus();
        };
        pageList.append(button);
      }
    }

    const recordViewButtons = [...$('#record-views').querySelectorAll('button')];
    recordViewButtons.forEach(button => {
      button.onclick = () => {
        recordView = button.dataset.view;
        renderRecords();
      };
    });
    $('#openRecords').onclick = () => openRecords();
    $('#closeRecords').onclick = () => $('#records').close();
    $('#previous').onclick = () => { state.page--; renderRecords(); };
    $('#next').onclick = () => { state.page++; renderRecords(); };
    return { capture, renderObservation, dispose() {
      resultCache.clear();
      state.records.length = 0;
      observation = null;
      releaseUnusedImages();
    } };
  };
})();

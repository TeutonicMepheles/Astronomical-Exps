(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const options = { size: [['small','20 m'],['medium','50 m'],['large','300 m']], speed: [['low','10 km/s'],['medium','20 km/s'],['high','40 km/s']], angle: [['90','90°'],['45','45°'],['20','20°']], ground: [['loose','疏松地面'],['compact','紧致地面']] };
  const names = { size: '陨石大小', speed: '进入速度', angle: '入射角', ground: '地面疏松程度' };
  const label = (key, value) => options[key].find(item => item[0] === value)?.[1] || value;
  const worldName = world => world === 'earth' ? '地球' : '月球';
  const readouts = data => [['坑径', data.scale], [data.depthAdjusted ? '演示坑深' : '坑深', data.depth], ['坑形', data.shape], ['溅射范围', data.ejecta]];
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
  window.createMeteorRecords = (engines, onDelete) => {
    const state = { records: [], page: 0 };
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
    async function capture(input, mode, factor, current) {
      const results = [];
      try {
        const framing = engines[0].framingFor(input);
        for (const [side, combo] of input.entries()) {
          if (!current()) return;
          const sideFraming = { ...framing, captureAspect: 960 / 1080, outlineColor: side === 0 ? 0x53c7eb : 0xc3a2ff };
          const key = JSON.stringify([combo, sideFraming, mode, factor]);
          let result = resultCache.get(key);
          if (!result) {
            await nextTask();
            if (!current()) return;
            const whole = await engines[side].captureResult(false, false, sideFraming);
            if (!current()) { URL.revokeObjectURL(whole); return; }
            let cutaway;
            try {
              await nextTask();
              if (!current()) { URL.revokeObjectURL(whole); return; }
              cutaway = await engines[side].captureResult(true, false, sideFraming);
            } catch (error) { URL.revokeObjectURL(whole); throw error; }
            if (!current()) { URL.revokeObjectURL(whole); URL.revokeObjectURL(cutaway); return; }
            // Decode before revealing or opening records, outside the click handler.
            try {
              await Promise.all([whole, cutaway].map(async url => { const image = new Image(); image.src = url; await image.decode(); }));
            } catch (error) { URL.revokeObjectURL(whole); URL.revokeObjectURL(cutaway); throw error; }
            if (!current()) { URL.revokeObjectURL(whole); URL.revokeObjectURL(cutaway); return; }
            result = { whole, cutaway, outcome: outcome(combo), ...engines[side].resultData() };
            resultCache.set(key, result); imageResources.add(result);
            if (resultCache.size > 8) resultCache.delete(resultCache.keys().next().value);
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
    function renderObservation(record, panels) {
      panels.forEach((panel, side) => {
        panel.querySelector('.observed-result')?.remove();
        if (!record) return;
        const data = record.sides[side];
        const result = document.createElement('div');
        result.className = 'observed-result';
        result.innerHTML = '<img alt="三维坑体"><svg class="meteor-annotations" preserveAspectRatio="xMidYMid meet" role="img"></svg><div class="observed-readouts"></div>';
        result.querySelector('img').src = data.whole;
        result.querySelector('.observed-readouts').innerHTML = readouts(data.outcome).map(([name, value]) => '<span>' + name + ' <b>' + value + '</b></span>').join('');
        MeteorResultCallouts.render(result.querySelector('svg'), data.annotations.whole, data.outcome, 'whole');
        panel.append(result);
      });
    }
    function openRecords(record) { const index = state.records.indexOf(record); state.page = index >= 0 ? index : Math.max(0, state.records.length - 1); recordView = 'whole'; renderRecords(); $('#records').showModal(); }
    function renderRecords() {
      const record = state.records[state.page]; const container = $('#recordBody');
      if (!record) container.textContent = '尚无对照记录';
      else {
        const deepened = record.combos.find(combo => combo.estimate.referenceDepth);
        $('#records .record-note').textContent = deepened
          ? '左右共用比例尺。疏松坑深为教学演示值，参考模型坑深为 ' + MeteorImpactResultModel.formatLength(deepened.estimate.referenceDepth) + '。'
          : '参考模型估算（固定石陨石）。同组左右共用比例尺，轮次之间会按结果重新取景。';
        container.replaceChildren();
        const toolbar = document.createElement('div'); toolbar.className = 'record-toolbar';
        const heading = document.createElement('h3');
        const [left, right] = record.combos;
        const same = left[record.factor] === right[record.factor];
        const comparison = same ? '相同参数' : record.mode === 'factor' ? '只改变' + names[record.factor] : '相同输入 · 地球与月球';
        heading.textContent = '第 ' + record.id + ' 组 · ' + comparison;
        toolbar.append(heading);
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
            '<div class="record-conditions">' + Object.keys(options).map(key => '<span' + (record.mode === 'factor' && record.factor === key ? ' class="record-variable"' : '') + '>' + ({size:'大小',speed:'速度',angle:'入射角',ground:'地面'}[key]) + '<b>' + (key === 'ground' && MeteorImpactResultModel.targetKey(combo) === 'lunar' ? '月壤' : label(key,combo[key])) + '</b></span>').join('') + '</div>' +
            '<div class="record-scene"><img src="' + data[recordView] + '" alt="实验' + (index+1) + (recordView === 'whole' ? '三维坑体' : '立体剖面') + '"><svg class="meteor-annotations" preserveAspectRatio="xMidYMid slice" role="img"></svg></div>' +
            '<footer>' + readouts(data.outcome).map(([key,value]) => '<span>' + key + '<b>' + value + '</b></span>').join('') + '</footer>';
          MeteorResultCallouts.render(card.querySelector('svg'), data.annotations[recordView], data.outcome, recordView);
          gallery.append(card);
        }); container.append(gallery);
      }
      $('#pageNumber').textContent = (state.records.length ? state.page + 1 : 0) + ' / ' + state.records.length;
      $('#previous').disabled = state.page <= 0; $('#next').disabled = state.page >= state.records.length - 1; $('#deleteLast').disabled = !state.records.length;
    }

    $('#openRecords').onclick = () => openRecords();
    $('#closeRecords').onclick = () => $('#records').close();
    $('#previous').onclick = () => { state.page--; renderRecords(); };
    $('#next').onclick = () => { state.page++; renderRecords(); };
    $('#deleteLast').onclick = () => {
      const removed = state.records.pop();
      state.page = Math.min(state.page, Math.max(0, state.records.length - 1));
      $('#recordCount').textContent = state.records.length;
      releaseUnusedImages();
      renderRecords();
      onDelete(removed);
    };
    return { capture, renderObservation, open: openRecords, dispose() {
      resultCache.clear();
      state.records.length = 0;
      releaseUnusedImages();
    } };
  };
})();

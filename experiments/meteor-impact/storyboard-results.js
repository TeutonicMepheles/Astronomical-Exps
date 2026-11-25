(() => {
  'use strict';
  const readouts = data => [['坑径', data.scale], [data.depthAdjusted ? '演示坑深' : '坑深', data.depth], ['坑形', data.shape], ['溅射范围', data.ejecta]];
  function observationReadouts(resultData, side) {
    const metricKeys = ['diameter', 'depth', null, 'ejecta'];
    const otherSide = 1 - side;
    const estimate = resultData.combos[side].estimate;
    const otherEstimate = resultData.combos[otherSide].estimate;
    const otherReadouts = readouts(resultData.sides[otherSide].outcome);
    return readouts(resultData.sides[side].outcome).map(([name, value], index) => {
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
  window.createMeteorResults = (engines, [width, height]) => {
    const captureAspect = width / height;
    const resultCache = new Map();
    const imageResources = new Set();
    let observation;
    const nextTask = () => new Promise(resolve => setTimeout(resolve, 0));
    function releaseUnusedImages() {
      const retained = new Set(resultCache.values());
      observation?.sides.forEach(side => retained.add(side));
      for (const resource of imageResources) if (!retained.has(resource)) {
        URL.revokeObjectURL(resource.whole); URL.revokeObjectURL(resource.cutaway); URL.revokeObjectURL(resource.top);
        Object.values(resource.details).forEach(url => URL.revokeObjectURL(url));
        imageResources.delete(resource);
      }
    }
    async function capture(input, mode, current) {
      const results = [];
      try {
        const sharedFraming = engines[0].framingFor(input);
        for (const [side, combo] of input.entries()) {
          if (!current()) return;
          const sideFraming = { ...sharedFraming, captureAspect, outlineColor: side === 0 ? 0x53c7eb : 0xc3a2ff };
          const key = JSON.stringify([combo, sideFraming, mode]);
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
              imageResources.add(result);
            } finally {
              if (!result) urls.forEach(url => URL.revokeObjectURL(url));
            }
          }
          resultCache.delete(key);
          resultCache.set(key, result);
          if (resultCache.size > 8) resultCache.delete(resultCache.keys().next().value);
          results.push(result);
        }
        if (!current()) return;
        return { combos: input, sides: results };
      } finally {
        releaseUnusedImages();
      }
    }

    let annotationPass = 0;
    function renderObservation(resultData, panels, labels, view = 'whole') {
      const pass = ++annotationPass;
      const annotationAnimations = [];
      const revealReadouts = resultData && labels[0].querySelector('.observed-readouts').hidden;
      const previous = observation;
      observation = resultData;
      if (previous && !resultData) releaseUnusedImages();
      panels.forEach((panel, side) => {
        let result = panel.querySelector('.observed-result');
        if (!resultData) {
          result?.remove();
          const metrics = labels[side].querySelector('.observed-readouts');
          metrics.hidden = true;
          metrics.replaceChildren();
          return;
        }
        const data = resultData.sides[side];
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
            metrics.innerHTML = observationReadouts(resultData, side);
            metrics.hidden = false;
          });
        });
      }
    }
    return { capture, renderObservation, dispose() {
      resultCache.clear();
      observation = null;
      releaseUnusedImages();
    } };
  };
})();

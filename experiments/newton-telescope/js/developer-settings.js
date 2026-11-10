/* Experiment-owned, browser-local tuning. Imported data never contains selectors or code. */
(function () {
  'use strict';
  const N = window.Newton = window.Newton || {};
  const key = 'newton-telescope.developer.v1';
  const stages = ['mirrors', 'assembly', 'observation'];
  const effects = {
    transitionSpeed: [0, 3, 1], photonSpeed: [0, 3, 1], beamStrength: [0, 2, 1], dragThreshold: [1, 20, 4]
  };
  const parameters = {focal:[400,1600],eyepiece:[5,50],aperture:[80,250],angle:[0,90]};
  const sky = {feather:[0,16],glowWidth:[0,40],glowStrength:[0,1],rotationSpeed:[0,3],twinkle:[0,1],meteorInterval:[.5,15],meteorSpeed:[.3,3],meteorTail:[30,300]};
  const blank = () => ({version:1, layout:{}, text:{}, effects:{}, parameters:{}, sky:{}});
  const number = (v, min, max) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : undefined;
  function validate(value) {
    if (!value || value.version !== 1 || typeof value !== 'object' || Array.isArray(value)) throw Error('请选择版本为 1 的开发者配置 JSON。');
    const result = blank();
    for (const [id, item] of Object.entries(value.layout || {})) {
      if (!/^(mirrors|assembly|observation)\/[a-z][a-z0-9-]{0,79}$/.test(id) || !item || typeof item !== 'object') continue;
      const entry = {};
      for (const [field, min, max] of [['x',-1600,1600],['y',-900,900],['scale',.1,3],['opacity',0,1],['rotation',-180,180]]) {
        const v = number(item[field], min, max); if (v !== undefined) entry[field] = v;
      }
      result.layout[id] = entry;
    }
    for (const [id, valueText] of Object.entries(value.text || {})) {
      if (/^(mirrors|assembly|observation)\/[a-z][a-z0-9-]{0,79}$/.test(id) && typeof valueText === 'string') result.text[id] = valueText.slice(0,1200);
    }
    for (const [group, schema] of Object.entries({effects,parameters,sky})) {
      for (const [id, [min,max]] of Object.entries(schema)) {
        const v = number(value[group]?.[id], min, max); if (v !== undefined) result[group][id] = v;
      }
    }
    return result;
  }
  let config = blank(), enabled = false, storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved) {config = validate(saved.config); enabled = saved.enabled === true;}
  } catch (_) { /* Invalid saved settings never prevent the experiment from starting. */ }
  const requested = new URLSearchParams(location.search).get('dev');
  if (requested === '1') enabled = true;
  if (requested === '0') enabled = false;
  const listeners = new Set();
  function notify() {
    try { localStorage.setItem(key, JSON.stringify({enabled, config})); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    document.documentElement.classList.toggle('developer-active', enabled);
    listeners.forEach(fn => fn());
  }
  N.developer = {
    get enabled() { return enabled; },
    get storageAvailable() { return storageAvailable; },
    snapshot: () => JSON.parse(JSON.stringify(config)),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setEnabled(value) { enabled = value === true; notify(); },
    replace(value) { config = validate(value); notify(); },
    reset() { config = blank(); notify(); },
    update(group, id, value) {
      if (!Object.hasOwn(config,group) || !config[group] || typeof config[group] !== 'object') return;
      const next = this.snapshot();
      if (value === undefined) delete next[group][id]; else next[group][id] = value;
      config = validate(next); notify();
    },
    layout(id, stage = N.course?.get().stage || 'mirrors') { return enabled ? config.layout[stage+'/'+id] || {} : {}; },
    text(id, fallback, stage = N.course?.get().stage || 'mirrors') { return enabled ? config.text[stage+'/'+id] ?? fallback : fallback; },
    effect(id) { return enabled ? config.effects[id] ?? effects[id]?.[2] ?? 1 : effects[id]?.[2] ?? 1; },
    duration(ms) { const speed = this.effect('transitionSpeed'); return speed === 0 ? 0 : ms / speed; },
    get stages() { return [...stages]; }
  };
  document.documentElement.classList.toggle('developer-active',enabled);
})();

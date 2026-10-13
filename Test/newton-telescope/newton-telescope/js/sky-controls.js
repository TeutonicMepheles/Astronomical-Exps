/* Shared, editable night-sky settings. All values stay local to this browser. */
(function () {
  'use strict';
  const storageKey = 'newton-telescope.sky-settings.v1';
  const fields = [
    ['feather', '边缘羽化', 0, 16, .5, 5, 'px'],
    ['glowWidth', '轮廓柔光范围', 0, 40, 1, 18, 'px'],
    ['glowStrength', '轮廓亮度', 0, 1, .05, .55, ''],
    ['rotationSpeed', '星场转速', 0, 3, .1, 1, '×'],
    ['twinkle', '闪烁强度', 0, 1, .05, .8, ''],
    ['meteorInterval', '流星间隔', .5, 15, .5, 2.5, '秒'],
    ['meteorSpeed', '流星速度', .3, 3, .1, 1, '×'],
    ['meteorTail', '流星尾长', 30, 300, 10, 150, 'px'],
  ];
  const development = window.NightSkyDevelopment === true;
  let defaults = { ...window.NightSkyDefaults };
  let values = { ...defaults };
  try {
    const saved = development ? JSON.parse(localStorage.getItem(storageKey) || '{}') : {};
    for (const [key, , min, max] of fields) {
      if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) values[key] = Math.max(min, Math.min(max, saved[key]));
    }
  } catch (_) { /* Storage is optional, including under file://. */ }
  window.NightSkyControls = Object.freeze({ getSettings: () => ({ ...values }) });
  const inputs = new Map();

  // Feather only the alpha silhouette. Mountain and building textures remain sharp.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true'); svg.style.position = 'absolute';
  svg.innerHTML = '<defs><filter id="foreground-feather" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="5" result="softAlpha"/><feComposite in="SourceGraphic" in2="softAlpha" operator="in"/></filter></defs>';
  document.body.appendChild(svg);
  const blur = svg.querySelector('feGaussianBlur');
  if (!development) { apply(); return; }

  const panel = document.createElement('aside');
  panel.id = 'sky-debug-panel'; panel.className = 'sky-debug-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', '夜空调试参数');
  panel.innerHTML = '<div class="sky-debug-heading"><strong>夜空与前景 · 开发调试</strong><button type="button" aria-label="隐藏调试面板">×</button></div><p>Ctrl + Alt + D 切换面板，Esc 隐藏。调节值暂存在此浏览器。</p>';
  for (const [key, label, min, max, step, , unit] of fields) {
    const row = document.createElement('div'); row.className = 'sky-debug-row';
    row.innerHTML = `<label for="sky-${key}">${label}<span>${unit}</span></label><div><input id="sky-${key}" aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}"><input aria-label="${label}数值" type="number" min="${min}" max="${max}" step="${step}"></div>`;
    const pair = Array.from(row.querySelectorAll('input'));
    inputs.set(key, pair);
    for (const input of pair) input.addEventListener('input', () => {
      if (input.value === '') return;
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      values[key] = Math.max(min, Math.min(max, value)); apply();
    });
    panel.appendChild(row);
  }
  const reset = document.createElement('button'); reset.className = 'sky-debug-reset';
  reset.textContent = '恢复夜空默认值';
  reset.addEventListener('click', () => { values = { ...defaults }; apply(); });
  panel.appendChild(reset);
  const save = document.createElement('button'); save.className = 'sky-debug-reset';
  save.textContent = '保存并更新产品默认值';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  save.addEventListener('click', async () => {
    save.disabled = true; status.textContent = '正在保存…';
    const snapshot = { ...values };
    try {
      const response = await fetch('/__dev/sky-defaults', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
      if (!response.ok) throw new Error('保存失败（' + response.status + '）');
      defaults = snapshot;
      status.textContent = '已写入工程默认配置，正式页面也会使用这些数值。';
    } catch (error) { status.textContent = error.message + '，请使用开发服务器。'; }
    finally { save.disabled = false; }
  });
  panel.append(save, status);
  const note = document.createElement('p');
  note.textContent = matchMedia('(prefers-reduced-motion: reduce)').matches
    ? '系统已启用减少动态效果，星空当前静止。羽化与亮度仍可调节。'
    : '流星间隔越小越频繁；调节速度与尾长会影响下一颗流星。';
  panel.appendChild(note);
  document.body.appendChild(panel);
  let returnFocus;
  function show(open) {
    if (open) returnFocus = document.activeElement;
    panel.hidden = !open;
    if (open) panel.querySelector('button').focus(); else returnFocus?.focus();
  }
  document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.altKey && event.code === 'KeyD' && !event.repeat) {
      event.preventDefault(); show(panel.hidden);
    }
  });
  panel.querySelector('button').addEventListener('click', () => show(false));
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') show(false); });
  function apply() {
    for (const [key, pair] of inputs) for (const input of pair) input.value = values[key];
    blur.setAttribute('stdDeviation', values.feather);
    document.documentElement.style.setProperty('--sky-glow-width', values.glowWidth + 'px');
    document.documentElement.style.setProperty('--sky-glow-color', `rgba(110,169,255,${values.glowStrength})`);
    if (development) {
      try { localStorage.setItem(storageKey, JSON.stringify(values)); } catch (_) { /* Optional. */ }
    }
    window.dispatchEvent(new CustomEvent('night-sky-settings', { detail: { ...values } }));
  }
  apply();
})();

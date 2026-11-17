/* Local manual measurement calculator. No geometry or renderer state is changed. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const dialog = byId('lunarManualDialog');
  const length = byId('manualLength');
  const angle = byId('manualAngle');
  const basis = byId('manualAngleBasis');
  const scale = byId('manualScale');
  const format = n => n.toLocaleString('zh-CN', {maximumSignificantDigits: 6});
  let selectionKey = '';
  // A confirmed museum conversion may be supplied in scale-config.js; null means uncalibrated.
  const configuredScale = window.LunarMeasurementScale?.kilometresPerCentimetre;
  if (Number.isFinite(configuredScale) && configuredScale > 0) scale.value = configuredScale;

  function update() {
    const cm = length.valueAsNumber, degrees = angle.valueAsNumber, ratio = scale.valueAsNumber;
    const elevation = basis.value === 'normal' ? 90 - degrees : degrees;
    const validLength = Number.isFinite(cm) && cm > 0;
    const validAngle = Number.isFinite(elevation) && elevation >= 35 && elevation <= 70;
    const validScale = Number.isFinite(ratio) && ratio > 0;
    for (const [input, valid] of [[length, validLength], [angle, validAngle], [scale, validScale]]) {
      input.setAttribute('aria-invalid', String(input.value !== '' && !valid));
    }
    byId('manualActualLength').textContent = '—';
    byId('manualHeight').textContent = '—';
    byId('manualFormula').textContent = 'L = 手量影长 × 比例；Δh = L × tan(α)';
    let message = !validScale ? '请先按天文馆数据设置本次测量的尺度比例。'
      : !validLength ? '请输入大于 0 的手量水平影长。'
      : !validAngle ? (basis.value === 'normal' ? '请输入 20°～55° 的入射角（相对法线）。' : '请输入 35°～70° 的太阳高度角。') : '';
    if (!message) {
      const actual = cm * ratio, height = actual * Math.tan(elevation * Math.PI / 180);
      if (!Number.isFinite(actual) || !Number.isFinite(height) || actual <= 0 || height <= 0) {
        message = '数值超出计算范围，请核对影长与比例。';
      } else {
        byId('manualActualLength').textContent = `${format(actual)} km`;
        byId('manualHeight').textContent = `${format(height)} km`;
        byId('manualFormula').textContent = `L = ${format(cm)} × ${format(ratio)} = ${format(actual)} km；Δh = L × tan(${format(elevation)}°)`;
        message = '已按输入值自动计算；高度差为几何估算值。';
      }
    }
    byId('manualMessage').textContent = message;
  }
  byId('manualCalculation').addEventListener('click', () => {
    const key = [...document.querySelectorAll('[data-point]')].map(p => `${p.dataset.modelX},${p.dataset.modelZ}`).join('|') + ':' + byId('angle').value;
    if (key !== selectionKey) {
      selectionKey = key;
      length.value = '';
      basis.value = 'horizontal';
      angle.min = '35'; angle.max = '70';
      angle.value = byId('angle').value;
      byId('manualAngleHint').textContent = '相对水平面，35°～70°。';
    }
    update();
    dialog.showModal();
    length.focus();
  });
  byId('manualClose').addEventListener('click', () => dialog.close());
  document.addEventListener('lunar-measurement-reset', () => {
    selectionKey = '';
    length.value = '';
    if (dialog.open) dialog.close();
  });
  basis.addEventListener('change', () => {
    if (Number.isFinite(angle.valueAsNumber)) angle.value = String(90 - angle.valueAsNumber);
    const normal = basis.value === 'normal';
    angle.min = normal ? '20' : '35'; angle.max = normal ? '55' : '70';
    byId('manualAngleHint').textContent = normal ? '相对法线，20°～55°；α = 90° − 入射角。' : '相对水平面，35°～70°。';
    update();
  });
  for (const input of [length, angle, scale]) input.addEventListener('input', update);
})();

(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const trigger = byId('manualCalculation');
  const entry = byId('manualEntry');
  const length = byId('manualLength');
  const confirm = byId('manualConfirm');
  const history = byId('manualHistory');
  const dialog = byId('lunarManualDialog');
  const list = byId('manualRecords');
  const scale = byId('manualScaleLength');
  const sectionView = window.LunarManualSection;
  byId('manualScaleKm').textContent = sectionView.scaleKm;
  const previous = byId('manualPreviousPage');
  const next = byId('manualNextPage');
  const pageSize = 3;
  const records = [];
  const format = value => value.toLocaleString('zh-CN', {maximumSignificantDigits: 6});
  const positive = value => Number.isFinite(value) && value > 0;
  let page = 0;
  let returnFocus = trigger;

  function hideEntry() {
    entry.hidden = true;
    entry.reset();
    confirm.disabled = true;
    trigger.setAttribute('aria-expanded', 'false');
  }

  function renderRecords() {
    const start = page * pageSize;
    const scaleCm = scale.valueAsNumber;
    const calibrated = positive(scaleCm);
    scale.setAttribute('aria-invalid', String(!calibrated && (scale.value !== '' || scale.validity.badInput)));
    list.replaceChildren();
    for (const record of records.slice(start, start + pageSize)) {
      const card = document.createElement('article');
      card.className = 'manual-record';
      const header = document.createElement('header');
      const title = document.createElement('h3');
      title.textContent = '实验 ' + record.number;
      const result = document.createElement('strong');
      result.className = 'manual-height';
      const shadowLength = calibrated ? (record.shadowCm / scaleCm) * sectionView.scaleKm : record.shadowCm;
      const height = shadowLength * Math.tan(record.angle * Math.PI / 180);
      const unit = calibrated ? ' km' : ' cm（相对）';
      result.textContent = 'Δh ' + (positive(height) ? format(height) + unit : '超出范围');
      header.append(title, result);
      const image = document.createElement('img');
      image.src = record.image;
      image.alt = '实验 ' + record.number + ' 的右侧剖面影长三角形';
      const details = document.createElement('div');
      details.className = 'manual-details';
      const angle = document.createElement('span');
      angle.textContent = '太阳高度角 ' + format(record.angle) + '°';
      const shadow = document.createElement('span');
      shadow.textContent = '水平影长 ' + (positive(shadowLength) ? format(shadowLength) + unit : '超出范围');
      details.append(angle, shadow);
      card.append(header, image, details);
      list.append(card);
    }
    const pages = Math.ceil(records.length / pageSize);
    previous.parentElement.hidden = pages <= 1;
    previous.disabled = page === 0;
    next.disabled = page >= pages - 1;
    byId('manualEmpty').hidden = records.length > 0;
    byId('manualPage').textContent = (page + 1) + ' / ' + pages;
  }

  function showHistory(opener) {
    returnFocus = opener;
    renderRecords();
    dialog.showModal();
  }

  trigger.addEventListener('click', () => {
    if (trigger.hidden || dialog.open) return;
    entry.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    length.focus({preventScroll:true});
  });
  length.addEventListener('input', () => { confirm.disabled = !positive(length.valueAsNumber); });
  function cancelEntry() {
    hideEntry();
    trigger.focus({preventScroll:true});
  }
  byId('manualCancel').addEventListener('click', cancelEntry);
  entry.addEventListener('keydown', event => {
    if (event.key === 'Escape') cancelEntry();
  });
  entry.addEventListener('submit', event => {
    event.preventDefault();
    if (entry.hidden || trigger.hidden || !positive(length.valueAsNumber)) return;
    const section = sectionView.capture();
    if (!section) return;
    records.push({...section, number: records.length + 1, shadowCm: length.valueAsNumber});
    page = Math.floor((records.length - 1) / pageSize);
    hideEntry();
    showHistory(trigger);
  });
  scale.addEventListener('input', renderRecords);
  history.addEventListener('click', () => { if (!history.hidden && !dialog.open) showHistory(history); });
  previous.addEventListener('click', () => { page--; renderRecords(); });
  next.addEventListener('click', () => { page++; renderRecords(); });
  byId('manualClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => (returnFocus.hidden ? history : returnFocus).focus({preventScroll:true}));
  document.addEventListener('lunar-measurement-reset', hideEntry);
  byId('height').addEventListener('click', hideEntry);
})();

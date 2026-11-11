import { dateFromDay } from './solar-calendar.js';

export function mountObservationDateControl(scene) {
  const overview = scene.stage.querySelector('.orbit-overview');
  if (!overview) return;

  const control = document.createElement('div');
  control.className = 'observation-orbit-date-control';
  control.hidden = true;
  control.innerHTML = `
    <div class="observation-orbit-date">
      <span>日期</span>
      <output aria-live="polite"></output>
    </div>
    <div class="observation-orbit-axis">
      <button type="button" data-date-step="-1" aria-label="前一天">−</button>
      <input type="range" min="1" max="365" step="1" aria-label="调整观测日期">
      <button type="button" data-date-step="1" aria-label="后一天">+</button>
      <i><span>1月</span><span>12月</span></i>
    </div>`;
  overview.append(control);

  const output = control.querySelector('output');
  const range = control.querySelector('input');
  const previous = control.querySelector('[data-date-step="-1"]');
  const next = control.querySelector('[data-date-step="1"]');
  let displayedDate = null;
  const formatDate = (date) => {
    const [, month, day] = date.split('-').map(Number);
    return `${month}月${day}日`;
  };

  function refresh() {
    const visible = scene.measuring && !scene.calculating;
    control.hidden = !visible;
    if (!visible) return;
    if (displayedDate === scene.observationDate) return;
    displayedDate = scene.observationDate;
    const model = scene.solarModel;
    range.max = String(model.days);
    range.value = String(model.day);
    range.setAttribute('aria-valuetext', formatDate(scene.observationDate));
    output.textContent = formatDate(scene.observationDate);
    previous.disabled = model.day <= 1;
    next.disabled = model.day >= model.days;
  }

  control.querySelectorAll('[data-date-step]').forEach(button => {
    button.addEventListener('click', () => {
      const model = scene.solarModel;
      scene.setObservationDateDuringMeasurement(dateFromDay(model.year, Math.max(1, Math.min(model.days, model.day + Number(button.dataset.dateStep)))));
      refresh();
    });
  });

  range.addEventListener('input', () => {
    const model = scene.solarModel;
    const nextDate = dateFromDay(model.year, Number(range.value));
    scene.setObservationDateDuringMeasurement(nextDate);
    refresh();
  });

  for (const event of ['globe-frame', 'globe-mode-change', 'view-mode-change']) {
    window.addEventListener(event, refresh);
  }
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    for (const name of ['globe-frame', 'globe-mode-change', 'view-mode-change']) {
      window.removeEventListener(name, refresh);
    }
  }, { once: true });
  refresh();
}

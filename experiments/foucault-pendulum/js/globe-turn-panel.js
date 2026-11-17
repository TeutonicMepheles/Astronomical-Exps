import { mountTuneCollapse } from './tune-collapse.js';

const STORAGE_KEY = 'foucault-globe-turn-v1';
const DEFAULTS = {
  leftX: 67,
  leftY: 700,
  rightX: 612,
  rightY: 700,
  width: 46,
  height: 97,
  stroke: 12,
  opacity: 1,
  color: '#f5f8fc',
  shadowX: 0,
  shadowY: 2,
  shadowBlur: 2,
  shadowAlpha: 0.8,
  shadowColor: '#06101c',
};

function clamp(input, value) {
  if (input.type === 'color') return /^#[0-9a-f]{6}$/i.test(value) ? value : input.value;
  const number = Number(value);
  if (!Number.isFinite(number)) return Number(input.value);
  return Math.min(Number(input.max), Math.max(Number(input.min), number));
}

function format(input, value) {
  if (input.type === 'color') return String(value).toLowerCase();
  const digits = input.step.includes('.') ? input.step.split('.')[1].length : 0;
  return Number(value).toFixed(digits);
}

function shadow(values) {
  const alpha = Math.round(values.shadowAlpha * 255).toString(16).padStart(2, '0');
  return `${values.shadowX}px ${values.shadowY}px ${values.shadowBlur}px ${values.shadowColor}${alpha}`;
}

export function mountGlobeTurnPanel() {
  const panel = document.querySelector('#globeTurnPanel');
  if (!panel) return;
  const inputs = [...panel.querySelectorAll('[data-turn]')];
  const saved = {};
  try { Object.assign(saved, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); } catch {}
  const values = { ...DEFAULTS };
  for (const input of inputs) {
    const key = input.dataset.turn;
    values[key] = clamp(input, saved[key] ?? DEFAULTS[key]);
    input.value = input.type === 'color' ? values[key] : String(values[key]);
  }

  function apply() {
    const root = document.documentElement;
    root.style.setProperty('--turn-left-x', `${values.leftX}px`);
    root.style.setProperty('--turn-left-y', `${values.leftY}px`);
    root.style.setProperty('--turn-right-x', `${values.rightX}px`);
    root.style.setProperty('--turn-right-y', `${values.rightY}px`);
    root.style.setProperty('--turn-w', `${values.width}px`);
    root.style.setProperty('--turn-h', `${values.height}px`);
    root.style.setProperty('--turn-stroke', String(values.stroke));
    root.style.setProperty('--turn-opacity', String(values.opacity));
    root.style.setProperty('--turn-color', values.color);
    root.style.setProperty('--turn-shadow', shadow(values));
    for (const input of inputs) {
      input.nextElementSibling.textContent = format(input, values[input.dataset.turn]);
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch {}
  }

  for (const input of inputs) {
    input.addEventListener('input', () => {
      values[input.dataset.turn] = clamp(input, input.value);
      apply();
      save();
    });
  }
  panel.querySelector('#globeTurnReset').addEventListener('click', () => {
    Object.assign(values, DEFAULTS);
    for (const input of inputs) input.value = input.type === 'color' ? values[input.dataset.turn] : String(values[input.dataset.turn]);
    apply();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  });
  apply();
  mountTuneCollapse(panel, {
    spaceVar: '--turn-panel-space',
    storageKey: 'foucault-turn-panel-collapsed',
    label: '箭头调节',
  });
}

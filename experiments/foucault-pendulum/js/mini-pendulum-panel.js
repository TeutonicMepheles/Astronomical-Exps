import { mountTuneCollapse } from './tune-collapse.js';

const STORAGE_KEY = 'foucault-mini-pendulum-v1';
const PIVOT_Y = 6;
const DEFAULTS = {
  speed: 3.15,
  amplitude: 20,
  bob: 6.4,
  rope: 30,
  stroke: 1.6,
  color: '#dce9f8',
};

let values = { ...DEFAULTS };
let phase = 0;

function clamp(input, value) {
  if (input.type === 'color') return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : input.value;
  const number = Number(value);
  if (!Number.isFinite(number)) return Number(input.value);
  return Math.min(Number(input.max), Math.max(Number(input.min), number));
}

function format(input, value) {
  if (input.type === 'color') return String(value).toLowerCase();
  const digits = input.step.includes('.') ? input.step.split('.')[1].length : 0;
  return Number(value).toFixed(digits);
}

function mix(hex, target, t) {
  const from = parseInt(hex.slice(1), 16);
  const to = parseInt(target.slice(1), 16);
  const channel = (shift) => Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

function applyGeometry() {
  const line = document.querySelector('#locationPendulumLine');
  const bob = document.querySelector('#locationPendulumBob');
  const mid = document.querySelector('#locationBobMid');
  const edge = document.querySelector('#locationBobEdge');
  if (!line || !bob || !mid || !edge) return;
  const cy = PIVOT_Y + values.rope;
  line.setAttribute('y1', String(PIVOT_Y));
  line.setAttribute('y2', (cy - values.bob * 0.85).toFixed(2));
  line.setAttribute('stroke-width', String(values.stroke));
  line.setAttribute('stroke', mix(values.color, '#ffffff', 0.7));
  bob.setAttribute('cy', cy.toFixed(2));
  bob.setAttribute('r', String(values.bob));
  mid.setAttribute('stop-color', values.color);
  edge.setAttribute('stop-color', mix(values.color, '#10243f', 0.55));
}

export function advanceMiniPendulum(dt, period) {
  if (!(dt > 0)) return;
  phase += dt * values.speed * Math.PI * 2 / Math.max(period, 0.5);
}

export function miniPendulumDegrees(reducedMotion) {
  const swing = reducedMotion ? 0.65 : Math.sin(phase);
  return values.amplitude * swing;
}

export function mountMiniPendulumPanel() {
  const panel = document.querySelector('#miniPendulumPanel');
  if (!panel) return;
  const inputs = [...panel.querySelectorAll('[data-mini]')];
  const saved = {};
  try { Object.assign(saved, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); } catch {}
  values = { ...DEFAULTS };
  for (const input of inputs) {
    const key = input.dataset.mini;
    values[key] = clamp(input, saved[key] ?? DEFAULTS[key]);
    input.value = input.type === 'color' ? values[key] : String(values[key]);
  }

  function paint() {
    applyGeometry();
    for (const input of inputs) {
      input.nextElementSibling.textContent = format(input, values[input.dataset.mini]);
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch {}
  }

  for (const input of inputs) {
    input.addEventListener('input', () => {
      values[input.dataset.mini] = clamp(input, input.value);
      paint();
      save();
    });
  }
  panel.querySelector('#miniPendulumReset').addEventListener('click', () => {
    values = { ...DEFAULTS };
    for (const input of inputs) input.value = input.type === 'color' ? values[input.dataset.mini] : String(values[input.dataset.mini]);
    paint();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  });
  paint();
  mountTuneCollapse(panel, {
    spaceVar: '--mini-panel-space',
    storageKey: 'foucault-mini-panel-collapsed',
    label: '迷你摆调节',
  });
}

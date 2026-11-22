import {loadRocketSilhouette, drawRocketSilhouette} from './rocket-silhouette.js';

const AXIS = 555;
const FLIGHT_X = 780;
const GROUND = 690;
const TOP = 145;
const MAX_HEIGHT = 140;
const RECORD_SPACING = 58;
const CURRENT = '#99e2e3';
const GOLD = '#e3bb79';
const INK = '#a9bdcb';
const yAt = height => GROUND - (GROUND - TOP) * height / MAX_HEIGHT;
export class LaunchAltitudeRuler {
 constructor({host, canvas, invalidate}) {
  this.host = host;
  this.canvas = canvas;
  this.invalidate = invalidate;
  loadRocketSilhouette(invalidate);
  this.root = document.createElement('div');
  this.root.className = 'launch-altitude-records';
  this.root.setAttribute('role', 'group');
  this.root.setAttribute('aria-label', '高度记录');
  this.detail = document.createElement('output');
  this.detail.id = 'launch-altitude-detail';
  this.detail.hidden = true;
  this.root.append(this.detail);
  this.root.addEventListener('keydown', event => {
   if (event.key === 'Escape' && this.selected) {
    this.toggle(this.selected);
    event.stopPropagation();
   }
  });
  host.append(this.root);
  this.markers = [];
 }

 sync(records) {
  this.root.hidden = records.length === 0;
  const existing = new Map(this.markers.map(marker => [marker.record, marker]));
  this.markers = records.flatMap((record, index) => {
   if (record.metric !== 'flight-height' || !Number.isFinite(record.height)) return [];
   let marker = existing.get(record);
   if (!marker) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = index + 1;
    button.setAttribute('aria-label', '第 ' + (index + 1) + ' 次发射');
    button.setAttribute('aria-controls', this.detail.id);
    button.setAttribute('aria-expanded', 'false');
    marker = {record, button};
    button.onclick = () => this.toggle(marker);
    this.root.append(button);
   }
   return [marker];
  }).sort((a, b) => b.record.height - a.record.height);
  if (this.selected) this.toggle(this.selected);
 }

 toggle(marker) {
  this.selected?.button.setAttribute('aria-expanded', 'false');
  this.selected = this.selected === marker ? null : marker;
  this.detail.hidden = !this.selected;
  if (this.selected) {
   const {height, status} = marker.record;
   const qualifier = status === 'interrupted' ? '中断时 ' : height === 0 ? '未起飞 · ' : '';
   this.detail.textContent = qualifier + height + ' 示意格';
   marker.button.setAttribute('aria-expanded', 'true');
  }
  this.invalidate();
 }

 draw(context, {height, target, flying, finished, ignition}) {
  const c = context;
  const line = (x1, y1, x2, y2, color, width = 1) => {
   c.strokeStyle = color;
   c.lineWidth = width;
   c.beginPath();
   c.moveTo(x1, y1);
   c.lineTo(x2, y2);
   c.stroke();
  };
  c.save();
  c.font = '20px "Alibaba PuHuiTi 3", sans-serif';
  c.textBaseline = 'middle';
  c.fillStyle = INK;
  c.fillText('示意格', AXIS + 12, TOP - 26);
  line(AXIS, TOP, AXIS, GROUND, INK);
  for (let value = 0; value <= MAX_HEIGHT; value += 35) {
   const y = yAt(value);
   line(AXIS - 6, y, AXIS + 7, y, INK);
   c.fillText(String(value), AXIS + 13, y);
  }
  line(AXIS, GROUND, 860, GROUND, INK);
  line(FLIGHT_X, TOP, FLIGHT_X, GROUND, '#5e7c9477');

  const y = yAt(height);
  c.setLineDash([7, 6]);
  line(AXIS + 65, yAt(target), 860, yAt(target), GOLD, 2);
  c.setLineDash([]);
  if (flying) {
   if (height > 0) line(FLIGHT_X, GROUND, FLIGHT_X, y, CURRENT, 5);
   drawRocketSilhouette(c, FLIGHT_X, y, 62, CURRENT);
   if (ignition > 0) {
    c.globalAlpha = ignition;
    line(FLIGHT_X, y + 2, FLIGHT_X, y + 19, GOLD, 4);
    c.globalAlpha = 1;
   }
   c.fillStyle = CURRENT;
   c.fillText(String(Math.round(height)), FLIGHT_X + 18, y - 9);
  }
  c.font = '23px "Alibaba PuHuiTi 3", sans-serif';
  c.fillStyle = CURRENT;
  c.fillText((finished ? '最终高度 ' : '当前高度 ') + Math.round(height), AXIS + 65, 63);
  c.fillStyle = GOLD;
  c.fillText('本次可达 ' + target, AXIS + 65, 99);

  const k = Math.min(this.host.clientWidth / this.canvas.width, this.host.clientHeight / this.canvas.height);
  const ox = (this.host.clientWidth - this.canvas.width * k) / 2;
  const oy = (this.host.clientHeight - this.canvas.height * k) / 2;
  const perColumn = Math.floor((GROUND - TOP) / RECORD_SPACING) + 1;
  for (let start = 0; start < this.markers.length; start += perColumn) {
   const column = this.markers.slice(start, start + perColumn);
   const x = AXIS - 48 - start / perColumn * 58;
   let edge = TOP;
   for (const marker of column) {
    marker.anchor = yAt(marker.record.height);
    marker.y = Math.max(marker.anchor, edge);
    edge = marker.y + RECORD_SPACING;
   }
   edge = GROUND;
   for (const marker of [...column].reverse()) {
    marker.y = Math.min(marker.y, edge);
    edge = marker.y - RECORD_SPACING;
    const color = this.selected === marker ? CURRENT : INK;
    line(x + 23, marker.y, AXIS - 5, marker.anchor, color);
    c.fillStyle = color;
    c.beginPath();
    c.arc(AXIS, marker.anchor, 4, 0, Math.PI * 2);
    c.fill();
    marker.button.style.left = ox + x * k + 'px';
    marker.button.style.top = oy + marker.y * k + 'px';
   }
  }
  if (this.selected) {
   this.detail.style.left = ox + (AXIS + 68) * k + 'px';
   this.detail.style.top = oy + this.selected.y * k + 'px';
  }
  c.restore();
 }
}

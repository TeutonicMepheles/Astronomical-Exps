import assert from 'node:assert/strict';
import {
  ORBIT_PITCH_DEG,
  daysInYear,
  declination,
  orbitAngleForDate,
} from '../js/solar-calendar.js';
import {
  AXIAL_TILT_DEG,
  FIXED_AXIS_SCREEN_TILT,
  basisVectors,
  sunForOrbitDate,
} from '../js/globe-core.js';

const year = 2026;
const axis = basisVectors(FIXED_AXIS_SCREEN_TILT, 0).axis;
const pitch = (ORBIT_PITCH_DEG * Math.PI) / 180;
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);

assert.ok(axis[0] > 0 && axis[1] > 0, 'The fixed north axis points up and to the right.');
assert.ok(Math.abs(Math.hypot(...axis) - 1) < 1e-12, 'The fixed axis is a unit vector.');
assert.ok(Math.abs(Math.asin(axis[0]) * 180 / Math.PI - AXIAL_TILT_DEG) < 1e-10);

for (const testYear of [2024, 2026]) {
  for (let day = 1; day <= daysInYear(testYear); day += 1) {
    const sun = sunForOrbitDate(testYear, day);
    assert.ok(Math.abs(Math.hypot(...sun)-1)<1e-12);
    const previous = sunForOrbitDate(testYear, day === 1 ? daysInYear(testYear) : day-1);
    assert.ok(Math.hypot(...sun.map((v,i)=>v-previous[i])) < .02, 'Local sunlight must not jump at seasonal boundaries');
    assert.ok(sun[0]>0, 'Close-up stays on the sunward side');
    const renderedDeclination = (Math.asin(dot(axis, sun)) * 180) / Math.PI;
    assert.ok(Math.abs(renderedDeclination - declination(testYear, day)) < 1e-10, `Declination mismatch on ${testYear}-${day}`);
    assert.ok(sun[2] > 0, `Subsolar point must remain on the visible hemisphere on ${testYear}-${day}`);
  }
}

function orbitPoint(day) {
  const angle = orbitAngleForDate(year, day);
  return { x: Math.cos(angle), y: -Math.sin(angle) * Math.sin(pitch) };
}

const summer = orbitPoint(172);
const autumn = orbitPoint(264);
const winter = orbitPoint(355);
const spring = orbitPoint(81);
assert.ok(summer.x < -0.99, 'Summer solstice is on the left side of the orbit.');
assert.ok(winter.x > 0.99, 'Winter solstice is on the right side of the orbit.');
assert.ok(spring.y < -0.42, 'Spring equinox is on the upper arc of the projected orbit.');
assert.ok(autumn.y > 0.42, 'Autumn equinox is on the lower arc of the projected orbit.');

const consecutive = orbitAngleForDate(year, 2) - orbitAngleForDate(year, 1);
assert.ok(consecutive > 0 && consecutive < 0.02, 'The orbit advances continuously one day at a time.');

console.log('PASS earth-circumference orbit model');

export const SOLAR_MODEL_VERSION='Cooper-N+284-v1';
export const daysInYear=year=>(year%4===0&&(year%100!==0||year%400===0)?366:365);
export const ORBIT_PITCH_DEG=20;
export function calendarDay(year,month,day){
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new RangeError('Invalid calendar date');
 return Math.round((date-Date.UTC(year,0,1))/86400000)+1;
}
export function declination(year,n){
 const d=daysInYear(year);if(!Number.isInteger(n)||n<1||n>d)throw new RangeError('Day outside year');
 return 23.44*Math.sin(2*Math.PI*(n+284)/d);
}
/** Continuous orbit angle in radians. Summer solstice is at the left side of
 * the projected orbit (pi), winter solstice at the right side (0/2pi), and
 * the two equinoxes at the top and bottom. */
export function orbitAngleForDate(year,n){
 const d=daysInYear(year);
 if(!Number.isInteger(n)||n<1||n>d)throw new RangeError('Day outside year');
 // Keep the approved declination approximation, and derive the orbital
 // longitude that produces it with a fixed 23.44-degree axis.
 const nominal=2*Math.PI*(n+284)/d+Math.PI/2;
 const tilt=23.44*Math.PI/180;
 const principal=Math.acos(Math.max(-1,Math.min(1,-Math.sin(declination(year,n)*Math.PI/180)/Math.sin(tilt))));
 const phase=Math.sin(nominal)>=0?principal:2*Math.PI-principal;
 return Math.floor(nominal/(2*Math.PI))*2*Math.PI+phase;
}
export function dateFromDay(year,n){const d=new Date(Date.UTC(year,0,n));return `${year}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}

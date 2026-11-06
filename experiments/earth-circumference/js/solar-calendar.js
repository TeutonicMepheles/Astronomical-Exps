export const SOLAR_MODEL_VERSION='Cooper-N+284-v1';
export const daysInYear=year=>(year%4===0&&(year%100!==0||year%400===0)?366:365);
export function calendarDay(year,month,day){
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new RangeError('Invalid calendar date');
 return Math.round((date-Date.UTC(year,0,1))/86400000)+1;
}
export function declination(year,n){
 const d=daysInYear(year);if(!Number.isInteger(n)||n<1||n>d)throw new RangeError('Day outside year');
 return 23.44*Math.sin(2*Math.PI*(n+284)/d);
}
export function dateFromDay(year,n){const d=new Date(Date.UTC(year,0,n));return `${year}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}

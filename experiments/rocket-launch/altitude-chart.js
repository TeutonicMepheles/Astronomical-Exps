import {drawRocketSilhouette} from './rocket-silhouette.js';

export const ALTITUDE_INK = '#a9bdcb';

export function altitudeLine(context, x1, y1, x2, y2, color, width=1) {
 context.strokeStyle=color;
 context.lineWidth=width;
 context.beginPath();
 context.moveTo(x1,y1);
 context.lineTo(x2,y2);
 context.stroke();
}

export function drawAltitudeGrid(context,{left,right,top,ground,min=0,max,interval,yAt,title}) {
 context.font='20px "Alibaba PuHuiTi 3", sans-serif';
 context.textBaseline='middle';
 context.textAlign='left';
 context.fillStyle=ALTITUDE_INK;
 context.fillText(title,left,top-68);
 altitudeLine(context,left,top,left,ground,ALTITUDE_INK);
 altitudeLine(context,left,ground,right,ground,ALTITUDE_INK);
 context.textAlign='right';
 for(let value=Math.ceil(min/interval)*interval;value<=max;value+=interval){
  const y=yAt(value);
  if(y!==ground)altitudeLine(context,left,y,right,y,'#5e7c9466');
  context.fillText(String(value),left-13,y);
 }
}

export function drawAltitudeFlight(context,x,y,ground,color) {
 altitudeLine(context,x,ground,x,y,color,4);
 drawRocketSilhouette(context,x,y,62,color);
}

export function drawAltitudeGuides(context,left,ground,x,y,color) {
 context.save();
 context.setLineDash([8,7]);
 altitudeLine(context,left,y,x,y,color,2);
 altitudeLine(context,x,y,x,ground,color,2);
 context.restore();
}

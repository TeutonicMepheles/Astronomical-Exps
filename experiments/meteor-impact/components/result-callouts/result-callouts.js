/* Local result annotations. See SOURCE.md for the shared MeasureMode provenance. */
(() => {
 'use strict';

 function render(root, data, outcome, view, { scaleAtBottomRight = false, scaleRoot = null } = {}) {
  if (scaleRoot) scaleRoot.replaceChildren();
  if (!data) { root.replaceChildren(); return; }
  const height = data.viewportHeight || 700;
  root.setAttribute('viewBox', `0 0 800 ${height}`);
  const point = value => ({x:value.x*800,y:value.y*height});
  const path = (d, order=0, extra='') => `<path class="rc-trace ${extra}" pathLength="1" d="${d}" style="--delay:${order*180}ms"/>`;
  const label = (x,y,text,order=0) => `<g class="rc-label" style="--delay:${order*180}ms" transform="translate(${x} ${y})"><rect x="-72" y="-19" width="144" height="38" rx="9"/><text text-anchor="middle" dominant-baseline="middle">${text}</text></g>`;
  let content = '';
  if (view === 'cutaway') {
   const left=point(data.left),right=point(data.right),floor=point(data.floor),base=point(data.baseline);
   const y=Math.max(155,base.y-88),x=710;
   content += `<path class="rc-baseline" d="M 18 ${base.y} H 782"/><text class="rc-baseline-label" x="32" y="${base.y-12}">地表基线</text>`;
   content += path(`M ${left.x} ${left.y} V ${y-10} M ${right.x} ${right.y} V ${y-10}`,0,'rc-extension');
   content += path(`M ${left.x} ${y} H ${right.x} M ${left.x} ${y-8} v 16 M ${right.x} ${y-8} v 16`,0);
   content += label((left.x+right.x)/2,y-24,'坑径 · '+outcome.scale,0);
   content += path(`M ${floor.x} ${base.y} H ${x+10} M ${floor.x} ${floor.y} H ${x+10}`,1,'rc-extension');
   content += path(`M ${x} ${base.y} V ${floor.y} M ${x-8} ${base.y} h 16 M ${x-8} ${floor.y} h 16`,1);
   content += label(x,Math.max(floor.y+32,(base.y+floor.y)/2),'坑深 · '+outcome.depth,1);
   root.setAttribute('aria-label','地表基线、坑径'+outcome.scale+'、坑深'+outcome.depth);
  } else {
   const ejecta=point(data.ejecta),shape=point(data.shape);
   const ejectaLabelY = data.widthMeters ? 285 : height >= 850 ? 250 : 150;
   content += path(`M ${ejecta.x} ${ejecta.y} L 570 ${ejectaLabelY+25} H 640`,0);
   content += `<circle class="rc-pin" cx="${ejecta.x}" cy="${ejecta.y}" r="4"/>`;
   content += label(675,ejectaLabelY,'溅射 · '+outcome.ejecta,0);
   content += path(`M ${shape.x} ${shape.y} L 600 520 H 640`,1);
   content += `<circle class="rc-pin" cx="${shape.x}" cy="${shape.y}" r="4"/>`;
   content += label(675,545,'坑形 · '+outcome.shape,1);
   root.setAttribute('aria-label','溅射范围'+outcome.ejecta+'、坑形'+outcome.shape);
  }
  if (data.widthMeters) {
   const maxLength = data.widthMeters / 4;
   const power = 10 ** Math.floor(Math.log10(maxLength));
   const length = (maxLength >= 5 * power ? 5 : maxLength >= 2 * power ? 2 : 1) * power;
   const barWidth = 800 * length / data.widthMeters;
   const x = scaleAtBottomRight ? 771 - barWidth : 42;
   const y = scaleRoot ? 36 : height * (scaleAtBottomRight ? 5 / 6 : .70);
   const scaleLabel = MeteorImpactResultModel.formatLength(length);
   const scale = `<g class="rc-scale" role="img" aria-label="比例尺 ${scaleLabel}"><path d="M ${x} ${y - 6} v 12 M ${x} ${y} h ${barWidth} m 0 -6 v 12"/><text x="${x + barWidth / 2}" y="${y - 12}" text-anchor="middle">${scaleLabel}</text></g>`;
   if (scaleRoot) scaleRoot.innerHTML = scale;
   else content += scale;
  }
  root.innerHTML=content;
 }
 window.MeteorResultCallouts=Object.freeze({render});
})();

/* Local result annotations. See SOURCE.md for the shared MeasureMode provenance. */
(() => {
 'use strict';
 const point = value => ({x:value.x*800,y:value.y*700});
 function render(root, data, outcome, view) {
  if (!data) { root.replaceChildren(); return; }
  const path = (d, order=0, extra='') => `<path class="rc-trace ${extra}" pathLength="1" d="${d}" style="--delay:${order*180}ms"/>`;
  const label = (x,y,text,order=0) => `<g class="rc-label" style="--delay:${order*180}ms" transform="translate(${x} ${y})"><rect x="-72" y="-19" width="144" height="38" rx="9"/><text text-anchor="middle" dominant-baseline="middle">${text}</text></g>`;
  let content = '';
  if (view === 'cutaway') {
   const left=point(data.left),right=point(data.right),floor=point(data.floor),base=point(data.baseline);
   const y=Math.max(155,base.y-88),x=710;
   content += `<path class="rc-baseline" d="M 18 ${base.y} H 782"/><text class="rc-baseline-label" x="32" y="${base.y-12}">地表基线</text>`;
   content += path(`M ${left.x} ${left.y} V ${y-10} M ${right.x} ${right.y} V ${y-10}`,0,'rc-extension');
   content += path(`M ${left.x} ${y} H ${right.x} M ${left.x} ${y-8} v 16 M ${right.x} ${y-8} v 16`,0);
   content += label((left.x+right.x)/2,y-24,'坑宽 · '+outcome.scale,0);
   content += path(`M ${floor.x} ${base.y} H ${x+10} M ${floor.x} ${floor.y} H ${x+10}`,1,'rc-extension');
   content += path(`M ${x} ${base.y} V ${floor.y} M ${x-8} ${base.y} h 16 M ${x-8} ${floor.y} h 16`,1);
   content += label(x,Math.max(floor.y+32,(base.y+floor.y)/2),'坑深 · '+outcome.depth,1);
   root.setAttribute('aria-label','地表基线、坑宽'+outcome.scale+'、坑深'+outcome.depth);
  } else {
   const ejecta=point(data.ejecta),shape=point(data.shape);
   content += path(`M ${ejecta.x} ${ejecta.y} L 570 175 H 640`,0);
   content += `<circle class="rc-pin" cx="${ejecta.x}" cy="${ejecta.y}" r="4"/>`;
   content += label(675,150,'溅射 · '+outcome.ejecta,0);
   content += path(`M ${shape.x} ${shape.y} L 600 520 H 640`,1);
   content += `<circle class="rc-pin" cx="${shape.x}" cy="${shape.y}" r="4"/>`;
   content += label(675,545,'坑形 · '+outcome.shape,1);
   root.setAttribute('aria-label','溅射范围'+outcome.ejecta+'、坑形'+outcome.shape);
  }
  root.innerHTML=content;
 }
 window.MeteorResultCallouts=Object.freeze({render});
})();

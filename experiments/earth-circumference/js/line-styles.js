/* Native SVG presentation only; no path displacement or randomized geometry. */
export function mountLineStyles(scene) {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.classList.add('line-style-defs');
  defs.setAttribute('aria-hidden', 'true');
  defs.innerHTML = `<defs>
    <pattern id="pencil-ink" patternUnits="userSpaceOnUse" width="127" height="127">
      <rect width="127" height="127" fill="#ffe8bd" opacity=".72"/>
    </pattern>
    <marker id="draft-end" viewBox="-6 -6 12 12" refX="0" refY="0" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M-4 -4L4 4M-4 4L4 -4" stroke="#d8f4ff" stroke-width="1.4" fill="none"/>
    </marker>
    <marker id="draft-tick" viewBox="-5 -7 10 14" refX="0" refY="0" markerWidth="10" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0 -5V5" stroke="#b7e9ff" stroke-width="1.4"/>
    </marker>
  </defs>`;
  let seed = 701;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const ink = defs.querySelector('#pencil-ink');
  // Rasterize the fixed pigment tile once: avoid replaying 800 SVG dabs
  // for every moving measurement path at high display pixel densities.
  const tile = document.createElement('canvas'); tile.width=254; tile.height=254;
  const ctx=tile.getContext('2d'); ctx.scale(2,2);
  ctx.fillStyle='rgba(255,232,189,.72)';ctx.fillRect(0,0,127,127);
  ctx.strokeStyle='#fff3d8';ctx.lineCap='round';
  for(let i=0;i<800;i++) {
    const x=random()*127,y=random()*127,dx=1+random()*6,dy=-random()*2;
    ctx.lineWidth=.5+random()*2;ctx.globalAlpha=.3+random()*.7;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+dy);ctx.stroke();
  }
  ink.innerHTML='';
  const image=document.createElementNS('http://www.w3.org/2000/svg','image');
  image.setAttribute('width','127');image.setAttribute('height','127');
  image.setAttribute('href',tile.toDataURL());ink.append(image);
  scene.stage.append(defs);
  scene.stage.dataset.lineStyle = 'sketch';
}

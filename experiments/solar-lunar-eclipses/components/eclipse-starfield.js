// Fixed-seed procedural stars from EXP-04 globe-textured.js stars(), adapted to
// the existing cached Canvas background. No texture and no animation clock.
export function drawEclipseStarfield(ctx){
 let seed=20261103;
 const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 ctx.save();
 for(let i=0;i<220;i++){
  const x=rnd()*1600,y=rnd()*900,r=.5+rnd()*1.15,alpha=.18+rnd()*.55;
  ctx.globalAlpha=Number(alpha.toFixed(2));ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(Number(x.toFixed(1)),Number(y.toFixed(1)),Number(r.toFixed(2)),0,Math.PI*2);ctx.fill();
 }
 for(let i=0;i<9;i++){
  const x=rnd()*1600,y=rnd()*900,s=4+rnd()*4;
  ctx.globalAlpha=Number((.5+rnd()*.4).toFixed(2));ctx.fillStyle='#dfe8ff';ctx.beginPath();
  [[x,y-s],[x+s*.22,y-s*.22],[x+s,y],[x+s*.22,y+s*.22],[x,y+s],[x-s*.22,y+s*.22],[x-s,y],[x-s*.22,y-s*.22]].forEach(([a,b],j)=>j?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.fill();
 }
 ctx.restore();return {seed:20261103,stars:220,accents:9};
}

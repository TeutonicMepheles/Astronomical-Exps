/* Local visual demonstration only: coefficients are not photometric calibration. */
(() => {
  const W=2172,H=724,canvas=document.querySelector('.sky'),ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),groups=new Map();
  let seed=4703,frame=0,last=0;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const stars=Array.from({length:420},()=>({x:random()*W,y:12+random()*345,b:.18+random()*.82,r:.45+random()*.9}));
  function draw(){
    const emitters=[...groups.values()].flat();
    const gradient=ctx.createLinearGradient(0,0,0,H);
    gradient.addColorStop(0,'#070e26');gradient.addColorStop(.55,'#14203e');gradient.addColorStop(1,'#233251');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    for(const e of emitters){
      if(e.current<.00001)continue;
      ctx.save();ctx.translate(e.x,390);ctx.scale(e.radius,310);
      const glow=ctx.createRadialGradient(0,0,0,0,0,1);
      const alpha=1-Math.exp(-e.current*.65),rgb=e.color.map(Math.round).join(',');
      glow.addColorStop(0,`rgba(${rgb},${alpha})`);glow.addColorStop(.4,`rgba(${rgb},${alpha*.42})`);glow.addColorStop(1,`rgba(${rgb},0)`);
      ctx.fillStyle=glow;ctx.fillRect(-1,-1,2,2);ctx.restore();
    }
    for(const star of stars){
      const haze=emitters.reduce((sum,e)=>sum+e.current*Math.exp(-Math.pow((star.x-e.x)/e.radius,2))*Math.exp(-Math.pow((star.y-390)/360,2)),0);
      const visibility=Math.max(0,star.b-haze*.68);
      ctx.fillStyle=`rgba(228,235,255,${visibility})`;ctx.beginPath();ctx.arc(star.x,star.y,star.r,0,Math.PI*2);ctx.fill();
    }
  }
  function tick(now){
    const mix=reduced.matches?1:1-Math.exp(-Math.min(50,last?now-last:16)/90);last=now;let moving=false;
    for(const e of [...groups.values()].flat()){
      e.current+=(e.strength-e.current)*mix;
      e.color=e.color.map((c,i)=>c+(e.targetColor[i]-c)*mix);
      if(Math.abs(e.strength-e.current)<.0001)e.current=e.strength;else moving=true;
      if(e.color.some((c,i)=>Math.abs(c-e.targetColor[i])>.05))moving=true;else e.color=[...e.targetColor];
    }
    draw();frame=moving?requestAnimationFrame(tick):0;if(!frame)last=0;
  }
  function update(group,sources){
    const old=groups.get(group)||[];
    groups.set(group,sources.map((e,i)=>({...e,current:old[i]?.current??e.strength,color:old[i]?.color??[...e.color],targetColor:[...e.color]})));
    if(!frame)frame=requestAnimationFrame(tick);
  }
  window.SkyScene={update};draw();
})();

/* Glare only, adapted from vehicle-glare-demo/demo.js (2026-11-11). No vehicle artwork. */
window.createPanoramaVehicleGlare=function(){
 const W=1920,H=1080,TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
 const state={glare:.56,glareEnabled:true};let elapsed=0,currentStyle=null,rayIndex=0;
 // Sample once per car per session: variety without per-frame randomness or flicker.
 const styles=new Map();
 function styleFor(seed){if(!styles.has(seed)){const random=Math.random;styles.set(seed,{size:1.55+random()*.55,angle:(random()-.5)*1.1,aspectX:.85+random()*.4,aspectY:.8+random()*.4,power:.85+random()*.4,tone:random()<.45?'cool':'warm',rayLength:.7+random()*1.1,rayWidth:.6+random()*1.2,spread:(random()-.5)*.32,rays:3+Math.floor(random()*3),ghosts:1+Math.floor(random()*4)});}return styles.get(seed);}

  function makeGlowSprite(innerColor, outerColor) {
    const sprite = document.createElement('canvas');
    sprite.width = 256;
    sprite.height = 256;
    const spriteContext = sprite.getContext('2d');
    const gradient = spriteContext.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(0.08, 'rgba(255,255,255,.98)');
    gradient.addColorStop(0.24, outerColor);
    gradient.addColorStop(0.55, outerColor.replace(/[\d.]+\)$/u, '0.12)'));
    gradient.addColorStop(1, outerColor.replace(/[\d.]+\)$/u, '0)'));
    spriteContext.fillStyle = gradient;
    spriteContext.fillRect(0, 0, 256, 256);
    return sprite;
  }


 const glowSprites={cool:makeGlowSprite('rgba(248,253,255,1)','rgba(126,198,255,.95)'),warm:makeGlowSprite('rgba(255,252,228,1)','rgba(255,201,116,.92)'),red:makeGlowSprite('rgba(255,235,213,1)','rgba(255,80,45,.88)')};
  function drawVehicleGlare(c, car, centerX, centerY, carWidth) {
    if (!state.glareEnabled || state.glare <= 0.001) return;
    const proximity = smoothstep(0.13, 0.92, car.z);
    const strength = state.glare * Math.pow(proximity, 1.42) * car.power;
    if (strength < 0.012) return;

    const axisX = W * 0.47 - centerX;
    const axisY = H * 0.56 - centerY;
    const axisLength = Math.hypot(axisX, axisY) || 1;
    const pulse = 0.93 + Math.sin(elapsed * (1.1 + car.seed * 0.01) + car.seed) * 0.07;
    const alpha = clamp(strength * pulse, 0, 1);

    const inheritedAlpha=c.globalAlpha;
    c.save();
    c.globalCompositeOperation = 'screen';

    const veilRadius = 90 + 260 * proximity + carWidth * 1.1;
    c.globalAlpha = inheritedAlpha * clamp(alpha * 0.62, 0, 0.64);
    c.drawImage(
      glowSprites[car.tone],
      centerX - veilRadius,
      centerY - veilRadius,
      veilRadius * 2,
      veilRadius * 2
    );

    const overX = centerX - carWidth * 0.28;
    const overY = centerY;
    const overRadius = 18 + carWidth * 0.34 + 34 * proximity;
    c.globalAlpha = inheritedAlpha * clamp(alpha * 0.95, 0, 1);
    c.drawImage(glowSprites[car.tone], overX - overRadius, overY - overRadius, overRadius * 2, overRadius * 2);

    const rayAlpha = clamp(alpha * 0.94, 0, 1);
    drawRay(c, centerX, centerY, -0.98 + car.seed * 0.002, 540 + 980 * strength, 4 + 15 * strength, rayAlpha);
    drawRay(c, centerX, centerY, -0.92 + car.seed * 0.001, 420 + 620 * strength, 2 + 7 * strength, rayAlpha * 0.7);
    drawRay(c, centerX, centerY, -0.72 + car.seed * 0.001, 320 + 590 * strength, 3 + 9 * strength, rayAlpha * 0.82);
    drawRay(c, centerX, centerY, 1.17, 210 + 620 * strength, 2 + 7 * strength, rayAlpha * 0.68);
    drawRay(c, centerX, centerY, -2.8, 150 + 310 * strength, 1 + 4 * strength, rayAlpha * 0.42);

    const ghostColors = ['rgba(91,179,255,.16)', 'rgba(142,232,224,.1)', 'rgba(255,203,139,.1)', 'rgba(126,172,255,.12)'];
    for (let index = 0; index < currentStyle.ghosts; index += 1) {
      const travel = 0.24 + index * 0.2;
      const ghostX = centerX + axisX / axisLength * (180 + axisLength * travel * 0.62);
      const ghostY = centerY + axisY / axisLength * (180 + axisLength * travel * 0.62);
      const ghostRadius = (8 + index * 7) * (0.8 + proximity * 0.85);
      c.globalAlpha = inheritedAlpha * clamp(alpha * (0.35 - index * 0.045), 0, 0.38);
      c.fillStyle = ghostColors[index];
      c.beginPath();
      c.arc(ghostX, ghostY, ghostRadius, 0, TAU);
      c.fill();
      c.strokeStyle = ghostColors[index].replace(/[\d.]+\)$/u, '0.55)');
      c.lineWidth = 1;
      c.stroke();
    }

    const washRadius = 180 + carWidth * 4.2;
    const wash = c.createRadialGradient(centerX, centerY, 0, centerX, centerY, washRadius);
    wash.addColorStop(0, `rgba(168,219,255,${alpha * 0.12})`);
    wash.addColorStop(0.5, `rgba(109,166,221,${alpha * 0.035})`);
    wash.addColorStop(1, 'rgba(30,55,83,0)');
    c.globalAlpha = inheritedAlpha;
    c.fillStyle = wash;
    c.fillRect(centerX - washRadius, centerY - washRadius, washRadius * 2, washRadius * 2);
    c.restore();
  }

  function drawRay(c, x, y, angle, length, width, alpha) {
    if(++rayIndex>currentStyle.rays)return;
    angle+=currentStyle.spread*Math.sin(angle*3);length*=currentStyle.rayLength;width*=currentStyle.rayWidth;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    const normalX = Math.cos(angle + Math.PI / 2);
    const normalY = Math.sin(angle + Math.PI / 2);
    const gradient = c.createLinearGradient(x, y, endX, endY);
    gradient.addColorStop(0, `rgba(246,253,255,${alpha})`);
    gradient.addColorStop(0.12, `rgba(177,226,255,${alpha * 0.74})`);
    gradient.addColorStop(0.64, `rgba(84,163,233,${alpha * 0.19})`);
    gradient.addColorStop(1, 'rgba(29,88,161,0)');
    c.fillStyle = gradient;
    c.beginPath();
    c.moveTo(x + normalX * width, y + normalY * width);
    c.lineTo(endX + normalX * width * 0.16, endY + normalY * width * 0.16);
    c.lineTo(endX - normalX * width * 0.16, endY - normalY * width * 0.16);
    c.lineTo(x - normalX * width, y - normalY * width);
    c.closePath();
    c.fill();
  }

 return {draw(c,{x,y,width,depth,rear,seed,time}){elapsed=time;currentStyle=styleFor(seed);rayIndex=0;const opacity=c.globalAlpha;c.save();c.translate(x,y);c.rotate(currentStyle.angle);c.scale(width/700*currentStyle.size*currentStyle.aspectX,width/700*currentStyle.size*currentStyle.aspectY);c.translate(-960,-756);c.globalAlpha=opacity;drawVehicleGlare(c,{z:Math.min(1,.3+depth*.7),power:(rear?.2:1)*currentStyle.power,tone:rear?'red':currentStyle.tone,seed},960,756,180);c.restore();},destroy(){styles.clear();Object.values(glowSprites).forEach(c=>{c.width=c.height=1;});}};
};

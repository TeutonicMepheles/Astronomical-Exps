// Direction is a camera-space propagation vector (screen Y points down).
// Main and detail viewports use the same projection, not separate art angles.
export function drawSunRays(ctx,width,height,direction,{spacing=68,phaseY=0,arrowStart=90,arrowSpacing=450}={}){
 const [dx,dy]=direction,n=Math.hypot(dx,dy);if(n<1e-8)return;
 const ux=dx/n,uy=dy/n;ctx.save();ctx.strokeStyle='#decba02c';ctx.lineWidth=1.3;
 if(Math.abs(dx)<1e-6){for(let x=0;x<width;x+=spacing){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}ctx.restore();return;}
 const slope=dy/dx,extent=Math.abs(slope)*width;
 for(let y=Math.floor((-extent-spacing-phaseY)/spacing)*spacing+phaseY;y<height+extent+spacing;y+=spacing){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y+width*slope);ctx.stroke();ctx.strokeStyle='#decba055';for(let x=arrowStart+Math.ceil(-arrowStart/arrowSpacing)*arrowSpacing;x<width;x+=arrowSpacing){const py=y+x*slope;ctx.beginPath();ctx.moveTo(x-8*ux+4*uy,py-8*uy-4*ux);ctx.lineTo(x,py);ctx.lineTo(x-8*ux-4*uy,py-8*uy+4*ux);ctx.stroke();}ctx.strokeStyle='#decba02c';}
 ctx.restore();
}

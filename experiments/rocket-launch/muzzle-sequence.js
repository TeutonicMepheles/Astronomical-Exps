// Seedream atlas: one decoded image, eight cropped frames, driven by scene time.
export const MUZZLE_SEQUENCE={columns:4,rows:2,anchor:[190/704,403/792],durations:[.045,.05,.065,.08,.11,.13,.17,.2]};
export function muzzleFrame(elapsed){
 if(elapsed<0||!Number.isFinite(elapsed))return -1;
 let end=0;for(let i=0;i<MUZZLE_SEQUENCE.durations.length;i++){end+=MUZZLE_SEQUENCE.durations[i];if(elapsed<end)return i;}return -1;
}
export function createMuzzleSequence(onReady=()=>{}){
 const atlas=new Image();atlas.onload=onReady;atlas.src='assets/cannon-transition/muzzle-sequence.png';
 return{
  ready:()=>atlas.complete&&atlas.naturalWidth>0,
  draw(c,elapsed,muzzle,pipeWidth){
   const frame=muzzleFrame(elapsed);if(frame<0||!atlas.naturalWidth)return{frame:-1,visible:false};
   const sw=atlas.naturalWidth/4,sh=atlas.naturalHeight/2,w=Math.max(1,pipeWidth)*1.8,h=w*sh/sw;
   c.save();c.globalCompositeOperation='screen';c.globalAlpha=frame>=6?.75:1;
   c.drawImage(atlas,(frame%4)*sw,Math.floor(frame/4)*sh,sw,sh,muzzle[0]-w*MUZZLE_SEQUENCE.anchor[0],muzzle[1]-h*MUZZLE_SEQUENCE.anchor[1],w,h);c.restore();
   return{frame,visible:true,phase:frame<3?'flash':'smoke',muzzle:[...muzzle]};
  }
 };
}

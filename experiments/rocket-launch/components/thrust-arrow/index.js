const WIDTH=256,HEIGHT=40,TAIL=28,HEAD=40;
export function arrowSlices(maxLength,strength,height=40){
 const q=Math.max(0,Math.min(1,strength)),scale=height/HEIGHT,tail=TAIL*scale,head=HEAD*scale;
 if(q===0)return{length:0,body:0,tail,head,opacity:0};
 const wanted=maxLength*q,length=Math.max(tail+head,wanted);
 return{length,body:length-tail-head,tail,head,opacity:Math.min(1,wanted/(tail+head))};
}

/** Local three-slice presentation sprite; hosts own all force state and clocks. */
export class ThrustArrow {
 constructor(invalidate=()=>{}){
  this.cache=new Map();this.lastDraws=[];this.source=this.fallback();this.ready=false;
  this.image=new Image();this.image.onload=()=>{
   if(this.disposed)return;const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;const x=c.getContext('2d'),angle=Math.atan2(115,-200);
   x.translate(12,20);x.rotate(-angle);x.translate(-203,-3);x.drawImage(this.image,0,0);
   this.source=c;this.cache.clear();this.ready=true;invalidate();
  };
  this.image.onerror=()=>{if(!this.disposed){this.failed=true;invalidate();}};
  this.image.src=new URL('./shaft-source.png',import.meta.url).href;
 }
 fallback(){const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;const x=c.getContext('2d');x.fillStyle='#fff';x.beginPath();x.moveTo(10,16);x.lineTo(218,16);x.lineTo(218,5);x.lineTo(250,20);x.lineTo(218,35);x.lineTo(218,24);x.lineTo(10,24);x.closePath();x.fill();return c;}
 sprite(color){if(!this.cache.has(color)){const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;const x=c.getContext('2d');x.drawImage(this.source,0,0);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,WIDTH,HEIGHT);this.cache.set(color,c);}return this.cache.get(color);}
 beginFrame(){this.lastDraws.length=0;}
 draw(c,{id,x,y,angle=0,maxLength=260,strength=1,height=40,color='#a8c4c6',label='',labelBelow=false,labelMinOffset=0}){
  const slices=arrowSlices(maxLength,strength,height),record={id,x,y,angle,strength,...slices};this.lastDraws.push(record);if(!slices.length)return record;
  const image=this.sprite(color);c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=slices.opacity;
  c.drawImage(image,0,0,TAIL,HEIGHT,0,-height/2,slices.tail,height);
  if(slices.body>0)c.drawImage(image,TAIL,0,WIDTH-TAIL-HEAD,HEIGHT,slices.tail,-height/2,slices.body,height);
  c.drawImage(image,WIDTH-HEAD,0,HEAD,HEIGHT,slices.tail+slices.body,-height/2,slices.head,height);c.restore();
  if(label){c.save();c.globalAlpha*=Math.min(1,slices.opacity*2);c.font='20px "Microsoft YaHei",sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText(label,x+Math.cos(angle)*Math.max(labelMinOffset,slices.length/2),y+Math.sin(angle)*Math.max(labelMinOffset,slices.length/2)+(labelBelow?height*.6+24:-height*.6-9));c.restore();}return record;
 }
 destroy(){this.disposed=true;this.image.onload=this.image.onerror=null;this.cache.clear();this.lastDraws.length=0;}
}

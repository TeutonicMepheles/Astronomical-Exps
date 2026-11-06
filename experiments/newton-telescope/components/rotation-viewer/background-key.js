/* Display-only matte for the uniform backdrop of the original rotation footage. */
(function(N){
 'use strict';
 N.createRotationMatte=function(canvas){
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Rotation matte requires Canvas 2D');
  let mask,queue,distance;
  return function paint(image){
   const w=image.naturalWidth,h=image.naturalHeight,size=w*h;
   if(!mask||canvas.width!==w||canvas.height!==h){
    canvas.width=w;canvas.height=h;mask=new Uint8Array(size);queue=new Int32Array(size);distance=new Uint8Array(size);
   }
   ctx.clearRect(0,0,w,h);ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,w,h),p=pixels.data;
   const br=p[0],bg=p[1],bb=p[2],gr=bg-br,bg2=bb-bg;
   for(let i=0,j=0;i<size;i++,j+=4){
    const r=p[j],g=p[j+1],b=p[j+2];
    mask[i]=Math.abs(g-bg)<=22&&Math.abs(g-r-gr)<=7&&Math.abs(b-g-bg2)<=6?1:0;
   }
   let end=0;
   function push(i){if(mask[i]===1){mask[i]=2;queue[end++]=i;}}
   function walk(){
    for(let head=0;head<end;head++){
     const i=queue[head],x=i%w;
     if(x>0)push(i-1);if(x<w-1)push(i+1);
     if(i>=w)push(i-w);if(i<size-w)push(i+w);
    }
   }
   for(let x=0;x<w;x++){push(x);push(size-w+x);}
   for(let y=1;y<h-1;y++){push(y*w);push(y*w+w-1);}
   walk();
   for(let k=0;k<end;k++)mask[queue[k]]=3;
   // The gaps within the stand can enclose the same flat backdrop.
   // Keep isolated highlights: only key large, near-uniform enclosed regions.
   for(let i=0;i<size;i++)if(mask[i]===1){
    end=0;push(i);walk();
    let flat=0;
    if(end>=500)for(let k=0;k<end;k++){
     const j=queue[k]*4,g=p[j+1];
     if(Math.abs(g-bg)<=9&&Math.abs(p[j]-br)<=10&&Math.abs(p[j+2]-bb)<=10)flat++;
    }
    if(flat>=end*.74)for(let k=0;k<end;k++)mask[queue[k]]=3;
   }
   // Discard isolated compression specks without shrinking the connected instrument.
   for(let i=0;i<size;i++)if(mask[i]!==3)mask[i]=1;
   for(let i=0;i<size;i++)if(mask[i]===1){
    end=0;push(i);walk();
    if(end<280)for(let k=0;k<end;k++)mask[queue[k]]=3;
   }
   // Compression shifts the pale fringe away from the exact key colour.
   // Extend only into nearby bright neutral pixels, never into an isolated highlight.
   for(let pass=0;pass<3;pass++){
    end=0;
    for(let y=1;y<h-1;y++)for(let x=1,i=y*w+1;x<w-1;x++,i++){
     if(mask[i]===3||!(mask[i-1]===3||mask[i+1]===3||mask[i-w]===3||mask[i+w]===3))continue;
     const j=i*4,r=p[j],g=p[j+1],b=p[j+2];
     if(r>=br-42&&g>=bg-39&&b>=bb-39&&Math.abs(g-r-gr)<=16&&Math.abs(b-g-bg2)<=15)queue[end++]=i;
    }
    if(!end)break;
    for(let k=0;k<end;k++)mask[queue[k]]=3;
   }
   // Distance from the background in thirds of a source pixel. A diagonal
   // costs four so the feather stays similar on curves and straight edges.
   for(let y=0,i=0;y<h;y++)for(let x=0;x<w;x++,i++){
    if(mask[i]===3){distance[i]=0;continue;}
    let d=15;
    if(x)d=Math.min(d,distance[i-1]+3);
    if(y){
     d=Math.min(d,distance[i-w]+3);
     if(x)d=Math.min(d,distance[i-w-1]+4);
     if(x+1<w)d=Math.min(d,distance[i-w+1]+4);
    }
    distance[i]=d;
   }
   for(let y=h-1,i=size-1;y>=0;y--)for(let x=w-1;x>=0;x--,i--){
    let d=distance[i];if(!d)continue;
    if(x+1<w)d=Math.min(d,distance[i+1]+3);
    if(y+1<h){
     d=Math.min(d,distance[i+w]+3);
     if(x)d=Math.min(d,distance[i+w-1]+4);
     if(x+1<w)d=Math.min(d,distance[i+w+1]+4);
    }
    distance[i]=d;
   }
   // Trim the bright compressed rim, then feather inward. Sample clean
   // foreground colour for the feather so the old pale backdrop cannot bleed.
   const opacity=[0,0,0,0,19,52,96,144,190,228,255];
   for(let i=0,j=0;i<size;i++,j+=4){
    const d=distance[i];if(d>=10)continue;
    p[j+3]=opacity[d];if(!opacity[d])continue;
    let inner=i;
    for(let step=0;step<4&&distance[inner]<10;step++){
     let best=inner;const x=inner%w,y=Math.floor(inner/w);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(x+dx<0||x+dx>=w||y+dy<0||y+dy>=h)continue;
      const k=inner+dy*w+dx;
      if(distance[k]>distance[best])best=k;
     }
     if(best===inner)break;
     inner=best;
    }
    if(distance[inner]>=10){const k=inner*4;p[j]=p[k];p[j+1]=p[k+1];p[j+2]=p[k+2];}
   }
   ctx.putImageData(pixels,0,0);
  };
 };
})(window.Newton);

// Fixed geographic coverage over one teaching event. Built only on type changes.
export function buildSolarSweep(M,{sun,sunRadius,moonRadius=M.RM,samples,width=384,height=192}){
 const pixels=new Uint8Array(width*height*4);let partial=0,central=0;
 const dot=(p,v)=>p[0]*v[0]+p[1]*v[1]+p[2]*v[2];
 const frames=samples.map(({moon,basis})=>({sun:[dot([sun.x,sun.y,sun.z],basis.e2),dot([sun.x,sun.y,sun.z],basis.e3),dot([sun.x,sun.y,sun.z],basis.axis)],moon:[dot([moon.x,moon.y,moon.z],basis.e2),dot([moon.x,moon.y,moon.z],basis.e3),dot([moon.x,moon.y,moon.z],basis.axis)]}));
 for(let y=0;y<height;y++){const lat=(y+.5)/height*Math.PI-Math.PI/2,cl=Math.cos(lat),p2=Math.sin(lat);
 for(let x=0;x<width;x++){const lon=(x+.5)/width*Math.PI*2-Math.PI,p0=cl*Math.cos(lon),p1=cl*Math.sin(lon);let category=0;
 for(const f of frames){
  const sx=f.sun[0]-p0,sy=f.sun[1]-p1,sz=f.sun[2]-p2;if(p0*sx+p1*sy+p2*sz<=0)continue;
  const mx=f.moon[0]-p0,my=f.moon[1]-p1,mz=f.moon[2]-p2,ds=Math.hypot(sx,sy,sz),dm=Math.hypot(mx,my,mz),a=sunRadius/ds,b=moonRadius/dm,common=Math.sqrt(1-a*a)*Math.sqrt(1-b*b),cos=(sx*mx+sy*my+sz*mz)/(ds*dm);
  // cos(a +/- b) from the angular-radius sines: same disc tests without per-sample arrays or inverse trig.
  if(cos<common-a*b)continue;category=1;if(cos>=common+a*b){category=2;break;}
 }
 const i=(y*width+x)*4;pixels[i]=category?255:0;pixels[i+1]=category===2?255:0;pixels[i+3]=255;if(category)partial++;if(category===2)central++;
 }}return {width,height,pixels,partial,central,sampleCount:samples.length};
}

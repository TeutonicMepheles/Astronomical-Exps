// Fit one fixed camera to every candidate over the whole event, never to the selected site.
export function fitObserverCamera(points,moons,moonRadius,north) {
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 const unit=p=>{const n=Math.hypot(p.x,p.y,p.z);return {x:p.x/n,y:p.y/n,z:p.z/n};};
 const score=p=>{
  let margin=Infinity;
  const latitude=dot(p,north),eyeHeight=8*latitude;
  // Keep the receiving face close to equatorial, even for the southern annular track.
  if(latitude < -Math.sin(Math.PI/18))return -Infinity;
  for(const q of points)margin=Math.min(margin,dot(p,q));
  // The foreground Moon must not cover the receiving globe or its selectable sites.
  for(const q of moons){
   const depth=dot(p,q);
   if(depth<=0||depth+moonRadius>=8||eyeHeight<=dot(q,north))return -Infinity;
   if(dot(q,q)-depth*depth<(1+moonRadius+.01)**2)return -Infinity;
  }
  return margin;
 };
 let front=unit(points.reduce((a,p)=>({x:a.x+p.x,y:a.y+p.y,z:a.z+p.z}),{x:0,y:0,z:0})),margin=score(front);
 for(let i=0;i<1536;i++){
  const z=1-2*(i+.5)/1536,r=Math.sqrt(1-z*z),a=i*Math.PI*(3-Math.sqrt(5)),p={x:r*Math.cos(a),y:r*Math.sin(a),z},s=score(p);
  if(s>margin){front=p;margin=s;}
 }
 for(let step=.04;step>.0001;step/=2){
  const origin=front;
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){
   const p=unit({x:origin.x+x*step,y:origin.y+y*step,z:origin.z+z*step}),s=score(p);
   if(s>margin){front=p;margin=s;}
  }
 }
 return {front,margin};
}

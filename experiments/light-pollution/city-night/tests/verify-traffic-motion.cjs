const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=path.resolve(__dirname,'..'),out=process.env.CITY_OUT||'artifacts/city-night-motion-safety';fs.mkdirSync(out,{recursive:true});
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(dir,'traffic-motion.js'),'utf8'),context);
const api=context.window.CITY_TRAFFIC,manifest=JSON.parse(fs.readFileSync(path.join(dir,'runtime-manifest.json'))),atlas=manifest.runtime.find(r=>r.name==='car-angles');
const result={cycleSeconds:api.cycle,sceneSamplesPerSecond:240,samples:0,activePoses:0,minLaneMargin:Infinity,maxLaneWidthFraction:0,minBodyGap:Infinity,maxCornerStep:0,maxLampStep:0,types:[],checks:[]};
const types=new Set();let previous=new Map();
function gap(A,B){return Math.max(B[0]-A[2],A[0]-B[2],B[1]-A[3],A[1]-B[3])}
for(let index=0;index<=api.cycle*240;index++){
 const time=index/240,cars=api.poses(time,atlas).filter(c=>c.opacity>.001);result.samples++;
 for(const c of cars){result.activePoses++;types.add(c.type);assert.equal(c.viewMode,'continuous-painted-geometry');
  for(const p of c.footprint){const [lo,hi]=api.laneAt(c,c.horizontal?p[0]:p[1]),v=c.horizontal?p[1]:p[0],margin=Math.min(v-lo,hi-v);result.minLaneMargin=Math.min(result.minLaneMargin,margin);assert(margin>0,`${time} ${c.id} leaves its lane`)}
  const lane=api.laneAt(c,c.horizontal?c.x:c.y),width=c.horizontal?c.footBounds[3]-c.footBounds[1]:c.footBounds[2]-c.footBounds[0],fraction=width/(lane[1]-lane[0]);result.maxLaneWidthFraction=Math.max(result.maxLaneWidthFraction,fraction);assert(fraction<1,'vehicle narrower than lane');
  for(const lamp of c.lamps)assert(api.project(c,lamp.local).every((v,i)=>Math.abs(v-lamp.point[i])<1e-9),'lamp shares body projection');
  for(const [x,y] of c.wheelContacts)assert(x>=c.footBounds[0]&&x<=c.footBounds[2]&&y>=c.footBounds[1]&&y<=c.footBounds[3],'wheel shadows stay inside footprint');
  const prior=previous.get(c.id);if(prior){for(let j=0;j<c.bodyCorners.length;j++)result.maxCornerStep=Math.max(result.maxCornerStep,Math.hypot(c.bodyCorners[j][0]-prior.bodyCorners[j][0],c.bodyCorners[j][1]-prior.bodyCorners[j][1]));for(const lamp of c.lamps){const match=prior.lamps.find(l=>l.front===lamp.front&&l.local[0]===lamp.local[0]);if(match)result.maxLampStep=Math.max(result.maxLampStep,Math.hypot(lamp.point[0]-match.point[0],lamp.point[1]-match.point[1]));}}
  // Independently project actual rendered vertices, not only the declared road footprint.
  if(index%240===0){const vertices=manifest.vehicleMeshes.find(m=>m.id===c.type).vertices;for(let n=0;n<vertices.length;n+=8){const [x,y]=api.project(c,vertices.slice(n,n+3)),b=c.bodyBounds;assert(x>=b[0]-.01&&x<=b[2]+.01&&y>=b[1]-.01&&y<=b[3]+.01,'rendered mesh stays inside audited body bounds')}}
 }
 for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const a=cars[i],b=cars[j],distance=gap(a.bodyBounds,b.bodyBounds);result.minBodyGap=Math.min(result.minBodyGap,distance);assert(distance>0,`${time}: visible bodies overlap: ${a.id}/${b.id}`);assert(a.horizontal===b.horizontal,'cross traffic must clear before perpendicular flow')}
 previous=new Map(cars.map(c=>[c.id,c]));
}
assert(result.maxCornerStep<4,'no body corner jumps at 240 samples per scene second');assert(result.maxLampStep<4,'no attachment jumps');assert.deepEqual([...types].sort(),['bus','sedan','suv']);
for(const time of [-.001,0,.001,10,35,63,71.999,72]){const a=api.poses(time,atlas),b=api.poses(time+api.cycle,atlas);for(let i=0;i<a.length;i++){assert.equal(a[i].id,b[i].id);assert(Math.abs(a[i].x-b[i].x)<1e-7&&Math.abs(a[i].y-b[i].y)<1e-7&&Math.abs(a[i].opacity-b[i].opacity)<1e-7,'cycle repeats without drift')}}
result.types=[...types];result.checks=['entire repeating cycle including wrap boundary','all visible rendered body bounds separated','all footprints inside assigned lanes and narrower than lanes','continuous geometry and attachment trajectories','actual mesh vertices contained by audited bounds','wheel shadows and lamps use the body projection'];fs.writeFileSync(path.join(out,'motion-safety.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));

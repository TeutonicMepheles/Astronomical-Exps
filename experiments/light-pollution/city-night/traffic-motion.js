/* Art-calibrated road geometry and deterministic intersection reservations.
 * Both rendering and attachments use this one continuous projection. No view bins.
 */
(()=>{
 const cycle=72,clearance=6;
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
 function project(c,[x,y,z]){const [a,b,d,e]=c.groundBasis;return [c.x+c.worldScale*(a*x+b*z),c.y+c.worldScale*(d*x+e*z+c.heightY*y)]}
 function bounds(points){return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}
 const defaultPaths=()=>({
  southbound:{far:[1305.0676980407557,860],near:[1182.0378894266073,1477.1481723237598]},
  northbound:{far:[1404.2382054809889,878.5372062663189],near:[1447.072,1480]}
 });
 const paths=defaultPaths();
 function copyPaths(source){return {southbound:{far:source.southbound.far.slice(),near:source.southbound.near.slice()},northbound:{far:source.northbound.far.slice(),near:source.northbound.near.slice()}}}
 function slopeOf(line){return (line.near[0]-line.far[0])/((line.near[1]-line.far[1])||1)}
 function lineX(line,y){return line.far[0]+slopeOf(line)*(y-line.far[1])}
 function usableLine(line){return line&&[line.far,line.near].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))&&Math.hypot(line.near[0]-line.far[0],line.near[1]-line.far[1])>=40}
 function laneAt(c,y){if(c.horizontal)return c.right?[1385,1440]:[1320,1385];const line=c.incoming?paths.southbound:paths.northbound,x=lineX(line,y),half=24+.16*Math.abs(y-558);return [x-half,x+half]}
 function view(c,atlas){
  const vehicle=atlas.variants[c.typeIndex],focal=1400,dx=1368-c.x,near=Math.hypot(focal,dx),pitch=Math.atan2(Math.max(0,c.y-558),near);
  const laneSlope=c.horizontal?0:c.laneSlope;
  const yaw=c.horizontal?Math.atan2(c.right?-focal:focal,c.right?dx:-dx):(c.incoming?Math.atan(-laneSlope*Math.sin(pitch)):Math.PI+Math.atan(-laneSlope*Math.sin(pitch)));
  const sa=Math.sin(yaw),ca=Math.cos(yaw),se=Math.sin(pitch),ce=Math.cos(pitch),roadShear=c.horizontal?se*ca/sa:0;
  const groundBasis=[ca,-sa,se*sa+roadShear*ca,se*ca-roadShear*sa],heightY=-ce;
  const baseSize=c.horizontal?.72:1.18*c.s,worldScale=atlas.scale*baseSize;
  const car={...c,type:vehicle.id,typeName:vehicle.name,yaw,pitch,viewYaw:yaw,viewPitch:pitch,viewMode:'continuous-painted-geometry',groundBasis,heightY,worldScale,roadShear,roadLean:0,vehicle};
  car.footprint=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>project(car,[x*vehicle.halfWidth,0,z*vehicle.halfLength]));
  car.bodyCorners=[0,vehicle.height+.02].flatMap(y=>[-1,1].flatMap(x=>[-1,1].map(z=>project(car,[x*(vehicle.halfWidth+.02),y,z*(vehicle.halfLength+.03)]))));
  car.bodyBounds=bounds(car.bodyCorners);car.footBounds=bounds(car.footprint);
  car.w=car.bodyBounds[2]-car.bodyBounds[0];car.h=car.bodyBounds[3]-car.bodyBounds[1];car.shadowDepth=(car.footBounds[3]-car.footBounds[1])*.46;
  const axle=vehicle.id==='bus'?2.65:vehicle.id==='suv'?1.48:1.26;
  car.wheelContacts=[-1,1].flatMap(x=>[-1,1].map(z=>project(car,[x*(vehicle.halfWidth-.08),0,z*axle])));
  car.frontGround=project(car,[0,0,vehicle.frontZ]);const ahead=project(car,[0,0,vehicle.frontZ+1]),length=Math.hypot(ahead[0]-car.frontGround[0],ahead[1]-car.frontGround[1]);car.forward=[(ahead[0]-car.frontGround[0])/length,(ahead[1]-car.frontGround[1])/length];
  car.lamps=[];for(const end of [-1,1]){const visibility=smooth((end*ca+.08)/.30);if(visibility===0)continue;for(const side of [-1,1])car.lamps.push({point:project(car,[side*vehicle.lampSide,vehicle.lampHeight,end>0?vehicle.frontZ:vehicle.rearZ]),local:[side*vehicle.lampSide,vehicle.lampHeight,end>0?vehicle.frontZ:vehicle.rearZ],front:end>0,visibility})}
  return car;
 }
 function poses(time,atlas){
  const t=((time+9)%cycle+cycle)%cycle,cars=[];
  // Horizontal batches clear by t=28; vertical batches run t=36..66.
  // Vertical traffic keeps right: approaching cars use the viewer's left lane. Horizontal lanes stay as calibrated.
  // Vehicles outside their reservation remain beyond the entry, invisible.
  for(let lane=0;lane<2;lane++)for(let i=0;i<4;i++){
   const incoming=lane===0,u=(t-36-i*5)/15,active=u>=0&&u<=1,p=Math.max(0,Math.min(1,u)),phase=incoming?p:1-p,depth=25*Math.pow(54,phase),s=depth/960,y=558+depth,line=incoming?paths.southbound:paths.northbound;
   cars.push(view({id:`v${lane}-${i}`,typeIndex:lane===0?[0,1,0,2][i]:[1,0,2,0][i],x:lineX(line,y),y,s,incoming,horizontal:false,lane:incoming?'southbound':'northbound',laneSlope:slopeOf(line),phase,opacity:active?smooth(p/.07)*smooth((1-p)/.07):0},atlas));
  }
  for(let lane=0;lane<2;lane++)for(let i=0;i<3;i++){
   const right=lane===0,u=(t-i*5)/18,active=u>=0&&u<=1,p=Math.max(0,Math.min(1,u)),phase=right?p:1-p;
   cars.push(view({id:`h${lane}-${i}`,typeIndex:lane===0?[0,2,1][i]:[1,0,2][i],x:600+950*phase,y:right?1422:1348,s:.72,incoming:false,horizontal:true,right,lane:right?'eastbound':'westbound',phase,opacity:active?smooth(p/.06)*smooth((1-p)/.06):0},atlas));
  }
  return cars.sort((a,b)=>a.y-b.y);
 }
 function setPaths(next){for(const id of ['southbound','northbound'])if(usableLine(next?.[id]))paths[id]={far:next[id].far.slice(),near:next[id].near.slice()}}
 window.CITY_TRAFFIC=Object.freeze({poses,project,laneAt,cycle,clearance,paths:()=>copyPaths(paths),defaults:()=>defaultPaths(),setPaths,resetPaths:()=>setPaths(defaultPaths())});
})();

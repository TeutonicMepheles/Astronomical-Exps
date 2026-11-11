/* Existing panoramic cutouts only. Paths extend the original wheel contact points toward the road vanishing point. */
window.createPanoramaTrafficRenderer=function({registrations,surfaces}){
 const incoming=new Set([1,2,4,7,8,10]),vp={x:2395,y:145},sprites=new Map(),glare=createPanoramaVehicleGlare();
 const cars=Object.entries(registrations).filter(([id])=>/^vehicles-\d+$/.test(id)).map(([id,r],index)=>{
  const sprite=Object.assign(document.createElement('canvas'),{width:Math.ceil(r.w),height:Math.ceil(r.h)});
  sprite.getContext('2d').drawImage(surfaces[id],r.x,r.y,r.w,r.h,0,0,sprite.width,sprite.height);sprites.set(id,sprite);
  const n=Number(id.split('-')[1]),depth=(r.y+r.h-vp.y)/400;
  return {id,r,index,n,depth,incoming:incoming.has(n),rank:[7,1,9,4,2,10,0,6,3,8,5][index]};
 });
 const mod=(v,n)=>(v%n+n)%n;
 // Lane membership follows the existing road composition; vehicles never change lanes.
 const laneMembers=[[2,7,10],[1,4,8],[3,6,11],[5,9]],factors=[.90,.955,1.025,1.08].map(v=>v+Math.random()*.02);
 for(let i=factors.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[factors[i],factors[j]]=[factors[j],factors[i]];}
 const lanes=laneMembers.map((members,index)=>{
  const membersData=cars.filter(car=>members.includes(car.n));
  const near=Math.max(...membersData.map(car=>car.depth*(543+20-vp.y)/(car.r.y-vp.y)));
  const far=Math.min(...membersData.map(car=>car.depth*(vp.x-2172-20)/(vp.x-car.r.x)));
  const lane={members:membersData,k:membersData.reduce((sum,car)=>sum+(car.r.x+car.r.w/2-vp.x)/car.depth,0)/membersData.length,baseMin:far,id:index,direction:membersData[0].incoming?1:-1,min:far,max:near,logMin:Math.log(far),period:Math.log(near/far),factor:factors[index],phase:Math.random()*Math.PI*2,frequency:.12+Math.random()*.05,time:NaN,offset:0,speedFactor:0};
  membersData.forEach(car=>{car.lane=lane;car.logDepth=Math.log(car.depth);});return lane;
 });
 function laneOffset(lane,seconds){if(lane.time!==seconds){lane.time=seconds;lane.offset=lane.direction*.095*(seconds*lane.factor+.012*(Math.cos(lane.phase)-Math.cos(lane.phase+seconds*lane.frequency))/lane.frequency);lane.speedFactor=lane.factor+.012*Math.sin(lane.phase+seconds*lane.frequency);}return lane.offset;}

 const clone=value=>JSON.parse(JSON.stringify(value));
 const defaultPaths=lanes.map(lane=>{const farDepth=(2172-32-vp.x)/lane.k,nearDepth=(543-32-vp.y)/400,a=[2172-32,vp.y+400*farDepth],b=[vp.x+lane.k*nearDepth,543-32];return [a,[a[0]+(b[0]-a[0])/3,a[1]+(b[1]-a[1])/3],[a[0]+(b[0]-a[0])*2/3,a[1]+(b[1]-a[1])*2/3],b];});
 function compile(points){const samples=[];for(let i=0;i<=128;i++){const t=i/128,u=1-t;samples.push([u*u*u*points[0][0]+3*u*u*t*points[1][0]+3*u*t*t*points[2][0]+t*t*t*points[3][0],u*u*u*points[0][1]+3*u*u*t*points[1][1]+3*u*t*t*points[2][1]+t*t*t*points[3][1]]);}return {points,samples,startSlope:(points[1][0]-points[0][0])/(points[1][1]-points[0][1]),endSlope:(points[3][0]-points[2][0])/(points[3][1]-points[2][1])};}
 function xAtY(curve,y){const p=curve.points;if(y<=p[0][1])return p[0][0]+(y-p[0][1])*curve.startSlope;if(y>=p[3][1])return p[3][0]+(y-p[3][1])*curve.endSlope;const a=curve.samples;let lo=0,hi=128;while(hi-lo>1){const mid=(lo+hi)>>1;if(a[mid][1]<y)lo=mid;else hi=mid;}return a[lo][0]+(a[hi][0]-a[lo][0])*(y-a[lo][1])/(a[hi][1]-a[lo][1]);}
 function farBound(curve,lane){const p=curve.points[0],intercept=p[0]+curve.startSlope*(vp.y-p[1]);return Math.min(lane.baseMin,...lane.members.map(car=>(2172+20-intercept)/(400*curve.startSlope+(car.r.x-vp.x)/car.depth-lane.k)));}
 function validatePaths(value){const next=value===undefined?clone(defaultPaths):clone(value);if(!Array.isArray(next)||next.length!==4)throw Error('需要四条车道路径');for(const points of next){if(!Array.isArray(points)||points.length!==4||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>2172||p[1]<0||p[1]>543))throw Error('车道控制点无效');if(Math.abs(points[0][0]-(2172-32))>1e-6||Math.abs(points[3][1]-(543-32))>1e-6||points[0][1]<vp.y+35)throw Error('车道端点应位于画面入口和出口');for(let i=1;i<4;i++)if(points[i-1][0]-points[i][0]<6||points[i][1]-points[i-1][1]<6)throw Error('控制点需保持从右上到左下的顺序');}
  const curves=next.map(compile);for(let i=0;i<4;i++){const c=curves[i],p=c.points[0];if(p[0]+c.startSlope*(vp.y-p[1])<2172+60||farBound(c,lanes[i])<.025)throw Error('远端切线需通向画面外');}
  const maxY=vp.y+400*Math.max(...lanes.map(l=>l.max));
  // x(y) is piecewise linear. Check every segment endpoint after viewport clipping,
  // so a sharp edited bend cannot cross between uniform validation samples.
  for(let j=1;j<4;j++){const left=curves[j-1],right=curves[j],ys=[...new Set([190,maxY,...left.samples.map(p=>p[1]),...right.samples.map(p=>p[1])].filter(y=>y>=190&&y<=maxY))].sort((a,b)=>a-b);
   for(let i=1;i<ys.length;i++){const y0=ys[i-1],y1=ys[i],a0=xAtY(left,y0),a1=xAtY(left,y1),b0=xAtY(right,y0),b1=xAtY(right,y1);let lo=0,hi=1,used=true;
    for(const [x0,x1]of [[a0,a1],[b0,b1]]){const delta=x0-x1;if(Math.abs(delta)<1e-9){if(x0< -200||x0>2172+60)used=false;}else{lo=Math.max(lo,(x0-(2172+60))/delta);hi=Math.min(hi,(x0+200)/delta);}}
    if(used&&lo<=hi)for(const t of [lo,hi]){const y=y0+(y1-y0)*t,gap=b0+(b1-b0)*t-a0-(a1-a0)*t;if(gap<90*(y-vp.y)/400-1e-7)throw Error('车道间距过小或发生交叉');}
   }
  }return next;
 }
 let paths,curves,pathSignature='';
 function setPaths(value){const next=validatePaths(value),signature=JSON.stringify(next);if(signature===pathSignature)return;paths=next;curves=next.map(compile);pathSignature=signature;for(const lane of lanes){lane.min=farBound(curves[lane.id],lane);lane.logMin=Math.log(lane.min);lane.period=Math.log(lane.max/lane.min);}}
 setPaths(defaultPaths);

 function pose(car,seconds){const lane=car.lane,depth=Math.exp(lane.logMin+mod(car.logDepth-lane.logMin+laneOffset(lane,seconds),lane.period)),scale=depth/car.depth;
  const width=car.r.w*scale,height=car.r.h*scale,bottom=vp.y+400*depth,cx=vp.x+(car.r.x+car.r.w/2-vp.x)*scale+xAtY(curves[lane.id],bottom)-(vp.x+lane.k*depth);
  return {id:car.id,x:cx-width/2,y:bottom-height,width,height,depth,rear:!car.incoming,seed:car.n*7,rank:car.rank,lane:lane.id,laneSpeed:lane.speedFactor,laneMin:lane.min,laneMax:lane.max};
 }
 return {getDefaultPaths:()=>clone(defaultPaths),getPaths:()=>clone(paths),validatePaths,setPaths,laneCarIds:index=>lanes[index].members.map(car=>car.id),count:cars.length,handles:id=>sprites.has(id),poses:seconds=>cars.map(car=>pose(car,seconds)),
 draw(c,id,seconds,ratio,replacement,glareSize=100,brightness=100,beamMode='legacy'){const car=cars.find(car=>car.id===id),p=pose(car,seconds);c.drawImage(replacement||sprites.get(id),p.x,p.y,p.width,p.height);
  if((beamMode!=='low'||p.rear)&&p.rank<Math.round(cars.length*ratio/100)){const bus=car.n===4,edgeFade=Math.max(0,Math.min(1,(563-p.y)/100,(2192-p.x)/100));c.save();c.globalAlpha*=edgeFade*brightness/100;glare.draw(c,{x:p.x+p.width*(p.rear?.38:bus?.30:.22),y:p.y+p.height*(bus?.86:.75),width:p.width*glareSize/100,depth:p.depth,rear:p.rear,seed:p.seed,time:seconds});c.restore();}
 },destroy(){glare.destroy();sprites.forEach(c=>{c.width=c.height=1});sprites.clear();}};
};

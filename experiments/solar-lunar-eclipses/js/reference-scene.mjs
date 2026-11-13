import {observerSky} from './observer-frame.mjs';
import {createShadowLayout} from './shadow-layout.mjs';

// Explicit teaching presets, derived from the visible spheres. They do not
// replace the astronomical model, change its constants, or move the camera.
const observerCache=new Map();
export function referenceScene(M,{phi,preset,vector,E,er,year=0,observerAt}){
 const pos=angle=>{const q=vector(M.displayPoint(M.moonAt(angle),0));return {x:q[0]*.8,y:q[1],z:q[2]};};
 const earth={x:0,y:0,z:0},moon=pos(phi),ref=pos(Math.PI),light=vector({x:1,y:0,z:0}),axis=M.unit({x:light[0]*.8,y:light[1],z:light[2]}),SUN=M.mul(axis,-M.SUN_DIST);
 const ratio0=Math.asin(M.RM/(M.ORBIT-1))/Math.asin(M.SUN_R/(M.SUN_DIST-1)),ratio=preset==='annular'?1/ratio0:ratio0,near=M.unit(ref),SUN_R=Math.sin(Math.asin(M.RM/(M.len(ref)-1))/ratio)*M.dist(SUN,near),sun={...SUN,r:SUN_R};
 function visibility(p,source=moon,r=M.RM){const as=Math.asin(SUN_R/M.dist(p,SUN)),ao=Math.asin(Math.min(1,r/M.dist(p,source))),sep=Math.acos(M.clamp(M.dot(M.unit(M.sub(SUN,p)),M.unit(M.sub(source,p))),-1,1));return M.clamp(1-M.discOverlap(as,ao,sep)/(Math.PI*as*as),0,1);}
 let observer=near;
 if(preset==='partial'){
  const key=[year,...light,SUN_R].join('|');observer=observerCache.get(key);
  if(!observer){let best=Infinity;const velocity=M.sub(pos(Math.PI+.01),pos(Math.PI-.01)),normal=M.unit({x:near.y*velocity.z-near.z*velocity.y,y:near.z*velocity.x-near.x*velocity.z,z:near.x*velocity.y-near.y*velocity.x});for(const sign of [-1,1])for(let angle=0;angle<1.2;angle+=.002){const p=M.add(M.mul(near,Math.cos(angle)),M.mul(normal,sign*Math.sin(angle)));if(p.z<=0||M.dot(p,M.sub(SUN,p))<=0)continue;const error=Math.abs(visibility(p,ref)-.5)+angle*.0001;if(error<best){best=error;observer=p;}}observer||=near;if(observerCache.size>=8)observerCache.delete(observerCache.keys().next().value);observerCache.set(key,observer);}
 }
 const project=p=>({x:E.x+p.x*er,y:E.y-p.y*er,depth:E.depth+(p.z||0)*er});
 function skyAt(angle){const m=pos(angle),point=observerAt?observerAt(angle,observer):observer;return observerSky(M,{observer:point,moon:m,sun:SUN,sunRadius:SUN_R,visibility:visibility(point,m)});}

 const cone=M.cone(moon,M.RM,sun),sourceScreen=project(moon),layoutInput={origin:moon,cone,receiver:earth,receiverRadius:1,sourceScreen,receiverScreen:E,scale:er,vector:p=>[p.x,p.y,p.z||0],compression:1,horizontalScale:1},layout=createShadowLayout(layoutInput),sky=skyAt(phi),status=sky.sep>=sky.sunR+sky.moonR?'none':sky.sep<=Math.abs(sky.sunR-sky.moonR)?sky.moonR>=sky.sunR?'total':'annular':'partial';
 return {model:{SUN,SUN_R},facade:{...M,solarSky:skyAt},origin:moon,cone,layoutInput,layout,sourceScreen,receiver:earth,sky,status,observer:project(sky.P),baseObserver:observer,length:Math.max(M.len(moon)+2,cone.umbraLength*1.35),project};
}

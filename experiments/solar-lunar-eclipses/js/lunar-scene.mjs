import {createShadowLayout} from './shadow-layout.mjs';

// One rigid teaching space for the actually displayed Earth, Moon and light.
// Screen layout and body radii are inputs; no body is moved to meet a shadow.
export function lunarGeometry(M,vector){
 const origin={x:0,y:0,z:0},position=phi=>{const q=vector(M.displayPoint(M.moonAt(phi),0));return {x:q[0]*.8,y:q[1],z:q[2]};},q=vector({x:1,y:0,z:0}),axis=M.unit({x:q[0]*.8,y:q[1],z:q[2]});
 // Apply the existing distance-display ratio to the Sun as well as the Moon.
 // This is a teaching light, not a newly adopted astronomical distance.
 const distance=M.SUN_DIST*M.len(position(0))/M.ORBIT,SUN=M.mul(axis,-distance),SUN_R=M.SUN_R,au=Math.asin((SUN_R-M.RE)/distance),ap=Math.asin((SUN_R+M.RE)/distance),ru=M.RE/Math.cos(au),rp=M.RE/Math.cos(ap),su=-Math.tan(au),sp=Math.tan(ap),umbraLength=-ru/su;
 const cone={axis,sourceRadius:M.RE,umbraLength,umbraRadiusAt:t=>Math.max(0,ru+su*t),penumbraRadiusAt:t=>rp+sp*t};
 function signedDistance(phi,penumbra=false){const m=position(phi),t=M.dot(m,axis);if(t<=0)return Infinity;const rho=M.len(M.sub(m,M.mul(axis,t))),r=penumbra?rp:ru,s=penumbra?sp:su;return (rho-r-s*t)/Math.sqrt(1+s*s);}
 function gap(phi,inner=false,penumbra=false){return signedDistance(phi,penumbra)+(inner?M.RM:-M.RM);}
 function status(phi){if(gap(phi,false)>1e-10)return gap(phi,false,true)<=1e-10?'penumbra':'none';return gap(phi,true)<=1e-10?'total':'partial';}
 function visibility(p){const os=M.mul(p,-1),ss=M.sub(SUN,p),a=Math.asin(Math.min(1,SUN_R/M.len(ss))),b=Math.asin(Math.min(1,M.RE/M.len(os))),d=Math.acos(M.clamp(M.dot(M.unit(ss),M.unit(os)),-1,1));return M.clamp(1-M.discOverlap(a,b,d)/(Math.PI*a*a),0,1);}
 return {origin,position,axis,cone,model:{SUN,SUN_R},gap,signedDistance,status,visibility};
}

export function lunarContacts(geometry){
 let lo=-Math.PI/3,hi=Math.PI/3;for(let i=0;i<65;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(geometry.signedDistance(a)<geometry.signedDistance(b))hi=b;else lo=a;}
 let mid=(lo+hi)/2;if(Math.abs(mid)<1e-8)mid=0;
 function roots(inner,penumbra=false){const f=phi=>geometry.gap(phi,inner,penumbra);if(f(mid)>0)return null;const solve=(a,b)=>{for(let i=0;i<58;i++){const c=(a+b)/2;if((f(c)<=0)===(f(a)<=0))a=c;else b=c;}return (a+b)/2;};return [solve(-Math.PI/2,mid),solve(mid,Math.PI/2)];}
 const outer=roots(false),inner=roots(true);if(!outer){const pen=roots(false,true);return pen?[{name:'半影食始',phi:pen[0]},{name:'食甚',phi:mid},{name:'半影食终',phi:pen[1]}]:[];}
 return [{name:'初亏',phi:outer[0]},...(inner?[{name:'食既',phi:inner[0]}]:[]),{name:'食甚',phi:mid},...(inner?[{name:'生光',phi:inner[1]}]:[]),{name:'复圆',phi:outer[1]}];
}

export function lunarScene(M,{phi,vector,E,er,geometry=lunarGeometry(M,vector)}){
 const moon=geometry.position(phi),project=p=>({x:E.x+p.x*er,y:E.y-p.y*er,depth:E.depth+(p.z||0)*er}),sourceScreen=E,receiverScreen=project(moon),layoutInput={origin:geometry.origin,cone:geometry.cone,receiver:moon,receiverRadius:M.RM,sourceScreen,receiverScreen,scale:er,vector:p=>[p.x,p.y,p.z||0],compression:1,horizontalScale:1},layout=createShadowLayout(layoutInput);
 return {...geometry,moon,origin:geometry.origin,receiver:{center:moon,radius:M.RM},layoutInput,layout,project,labelProject:project,model:geometry.model,length:Math.max(7,M.len(moon)+2),active:M.dot(moon,geometry.axis)>0,normalForGenerator:layout.normalForGenerator,projectGenerator:layout.projectGenerator,sourceBody:{...E,r:er},clipReceiver:{...receiverScreen,r:er*M.RM}};
}

export function lunarLocalView(M,{scene,observer,width,height}){
 const forward=M.unit(M.sub(scene.moon,observer)),toward=M.mul(forward,-1),cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});let right=cross(forward,M.unit(observer));if(M.len(right)<1e-6)right=cross(forward,{x:0,y:1,z:0});right=M.unit(right);const up=M.unit(cross(right,forward)),vector=p=>[M.dot(p,right),M.dot(p,up),M.dot(p,toward)],radius=height*.34,scale=radius/M.RM,center={x:width/2,y:height/2,depth:0},project=p=>{const q=vector(M.sub(p,scene.moon));return {x:center.x+q[0]*scale,y:center.y-q[1]*scale,depth:q[2]*scale};},layout=createShadowLayout({origin:scene.origin,cone:scene.cone,sourceScreen:project(scene.origin),scale,vector,compression:1,horizontalScale:1});
 return {vector,radius,center,layout,sun:vector(M.unit(M.sub(scene.model.SUN,scene.moon)))};
}

// Pick once on event entry, never while stepping/playing. Keep away from the
// exact geographic poles so a fixed point still visibly travels with rotation.
export function selectLunarGroundPoint(M,{geometry,phases,basisAt,preferred}){
 const samples=phases.map(phi=>{const moon=geometry.position(phi),basis=basisAt(phi),dot=v=>v[0]*moon.x+v[1]*moon.y+v[2]*moon.z;return {a:dot(basis.axis),b:dot(basis.e2),c:dot(basis.e3),d2:M.dot(moon,moon)};});
 const score=anchor=>{const a=Math.sin(anchor.latitude),b=Math.cos(anchor.latitude)*Math.cos(anchor.longitude),c=Math.cos(anchor.latitude)*Math.sin(anchor.longitude);return Math.min(...samples.map(s=>{const dot=s.a*a+s.b*b+s.c*c;return (dot-1)/Math.sqrt(s.d2+1-2*dot);}));};
 let anchor=preferred,minimumAltitude=score(anchor);const latitudes=[-89,...Array.from({length:35},(_,i)=>-85+i*5),89];
 for(const lat of latitudes)for(let lon=-180;lon<180;lon+=15){const candidate={latitude:lat*M.DEG,longitude:lon*M.DEG},value=score(candidate);if(value>minimumAltitude+1e-10){anchor=candidate;minimumAltitude=value;}}
 return {anchor,minimumAltitude};
}

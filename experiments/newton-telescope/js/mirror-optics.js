/* Parallel bundle emitted at the source face. Parabolic surfaces use exact reflection. */
(function(N){
  'use strict';
  // Scene units: 300 mm per unit. The same profile drives the artwork and rays.
  const surface=(type,f,y,offset=0)=>{
    const sign=type==='concave'?-1:1,slope=type==='plane'?1:sign*y/(2*f),length=Math.hypot(1,slope);
    return {x:(type==='plane'?y:sign*y*y/(4*f))+offset/length,y:y-offset*slope/length,normal:[1/length,-slope/length]};
  };
  const focus=s=>{
    const p=N.mirrorParts?.config[s.mirror]?N.mirrorParts.focus(s.mirror,s.mirrorFocal):{x:(s.mirror==='concave'?-1:1)*s.mirrorFocal/300,y:0};
    return [s.mirrorPosition+p.x,p.y,0];
  };
  N.mirrorOptics={surface,focus,calculate(s){
    const f=s.mirrorFocal/300,m=s.mirrorPosition,start=s.mirrorSource+.46;
    return [-.48,-.24,0,.24,.48].map(y=>{
      if(!s.mirrorMounted)return {points:[[start,y,0],[7.5,y,0]],virtual:null};
      const registered=Boolean(N.mirrorParts?.config[s.mirror]);
      const face=registered?N.mirrorParts.surface(s.mirror,s.mirrorFocal,y):surface(s.mirror,f,y),hit=[m+face.x,face.y,0],normal=face.normal;
      const incident=[1,0];
      const dot=incident[0]*normal[0]+incident[1]*normal[1],reflected=[incident[0]-2*dot*normal[0],incident[1]-2*dot*normal[1]];
      const times=[];if(reflected[0]<-1e-8)times.push((Math.min(start,hit[0]-.01)-hit[0])/reflected[0]);if(reflected[0]>1e-8)times.push((7.5-hit[0])/reflected[0]);if(reflected[1]>1e-8)times.push((2.6-y)/reflected[1]);if(reflected[1]<-1e-8)times.push((-2.6-y)/reflected[1]);
      const t=Math.min(...times.filter(v=>v>0)),end=[hit[0]+reflected[0]*t,y+reflected[1]*t,0];
      return {points:[[start,y-(hit[0]-start)*incident[1]/incident[0],0],hit,end],virtual:s.mirror==='convex'?focus(s):null,normal,reflected,incident};
    });
  }};
})(window.Newton);

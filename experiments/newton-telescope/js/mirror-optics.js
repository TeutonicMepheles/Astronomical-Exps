/* Parallel bundle emitted at the source face. Parabolic surfaces use exact reflection. */
(function(N){
  'use strict';
  N.mirrorOptics={calculate(s){
    const f=s.mirrorFocal/300,m=s.mirrorPosition,start=s.mirrorSource+.46;
    return [-.48,-.24,0,.24,.48].map(y=>{
      if(!s.mirrorMounted)return {points:[[start,y,0],[7.5,y,0]],virtual:null};
      let hit,normal;
      if(s.mirror==='plane'){hit=[m+y,y,0];normal=[Math.SQRT1_2,-Math.SQRT1_2];}
      else{const sign=s.mirror==='concave'?-1:1;hit=[m+sign*y*y/(4*f),y,0];const ny=-sign*y/(2*f),length=Math.hypot(1,ny);normal=[1/length,ny/length];}
      const reflected=[1-2*normal[0]*normal[0],-2*normal[0]*normal[1]];
      const times=[];if(reflected[0]<-1e-8)times.push((Math.min(start,hit[0]-.01)-hit[0])/reflected[0]);if(reflected[0]>1e-8)times.push((7.5-hit[0])/reflected[0]);if(reflected[1]>1e-8)times.push((2.6-y)/reflected[1]);if(reflected[1]<-1e-8)times.push((-2.6-y)/reflected[1]);
      const t=Math.min(...times.filter(v=>v>0)),end=[hit[0]+reflected[0]*t,y+reflected[1]*t,0];
      return {points:[[start,y,0],hit,end],virtual:s.mirror==='convex'?[m+f,0,0]:null,normal,reflected};
    });
  }};
})(window.Newton);

/* Local geometry queries; light arrives from +X, shadows extend toward -X. */
(() => {
  'use strict';
  function shadows(terrain,z,angle){
    const size=terrain.size,step=size/terrain.segments,slope=Math.tan(angle*Math.PI/180);
    let horizon=-Infinity,caster=null,active=null;
    const result=[];
    for(let i=terrain.segments;i>=0;i--){
      const x=-size/2+i*step,h=terrain.heightAt(x,z),intercept=h-slope*x;
      const gap=horizon-intercept;
      if(gap>1e-6){
        if(!active&&caster)active={...caster,z};
      }else{
        if(active){
          let low=x,high=x+step;
          // Refine first contact with the surface rather than round B to the sample grid.
          for(let k=0;k<16;k++){
            const mid=(low+high)/2;
            if(terrain.heightAt(mid,z)>=active.y+slope*(mid-active.x))low=mid;else high=mid;
          }
          const bx=(low+high)/2;
          const by=terrain.heightAt(bx,z),length=active.x-bx;
          if(length>=8&&terrain.contains(active.x,z)&&terrain.contains(bx,z)){
            result.push({a:{x:active.x,y:active.y,z},b:{x:bx,y:by,z},length,side:active.x<0?'left':'right'});
          }
          active=null;
        }
        horizon=intercept;caster={x,y:h};
      }
    }
    return result;
  }
  function candidates(terrain,radius,angle){
    const all=[];
    // Fixed, symmetric section samples cover both sides, without searching each frame.
    for(let i=-10;i<=10;i++){
      const z=i*radius/11;
      for(const pair of shadows(terrain,z,angle)){
        if(Math.abs(Math.hypot(pair.a.x,z)-radius)>12)continue;
        // A must be on a ridge near the fitted outline, not a small interior crater.
        const r=Math.hypot(pair.a.x,z),ux=pair.a.x/r,uz=z/r;
        const inner=terrain.heightAt(pair.a.x-ux*12,z-uz*12);
        const outer=terrain.heightAt(pair.a.x+ux*12,z+uz*12);
        if(pair.a.y<Math.max(inner,outer)-3)continue;
        all.push(pair);
      }
    }
    const chosen=[];
    for(const side of ['left','right']){
      const group=all.filter(p=>p.side===side).sort((a,b)=>a.a.z-b.a.z);
      for(const pair of group){
        if(chosen.some(p=>Math.hypot(p.a.x-pair.a.x,p.a.z-pair.a.z)<14))continue;
        chosen.push(pair);
      }
    }
    return chosen.map((pair,id)=>({...pair,id}));
  }
  const api=Object.freeze({shadows,candidates});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.LunarRimMeasurement=api;
})();

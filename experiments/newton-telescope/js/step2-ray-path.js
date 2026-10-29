/* Step2 educational ray overlay.
   Geometry comes from Newton.optics.calculate(). Only its 800 mm parallel-light
   reference configuration is projected onto the fixed Studio cutaway artwork.
   The source calculation and Step3's adjustable optics remain untouched.
   The SVG shows actual paths, never a fabricated complete path for partial assembly. */
(function (N) {
  'use strict';
  const REF = Object.freeze({ focal:800, aperture:130, eyepiece:25, mode:'parallel' });
  const W=1664,H=936, SOURCE_W=2048,SOURCE_H=1143;
  const fmt=n=>Number(n).toFixed(1);
  const point=([x,y])=>fmt(x)+','+fmt(y);
  const path=points=>points.map((p,i)=>(i?'L':'M')+point(p)).join(' ');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function onX(a,b,x) {
    const d=b[0]-a[0],t=d?clamp((x-a[0])/d,0,1):0;
    return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  }
  function onY(a,b,y) {
    const d=b[1]-a[1],t=d?clamp((y-a[1])/d,0,1):0;
    return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  }
  function mappedHit(page,part){
    const f=page.views.cutaway,o=page.slots[part].hit||page.slots[part];
    return {x:f.x+o.x/SOURCE_W*f.w,y:f.y+o.y/SOURCE_H*f.h,
      w:o.w/SOURCE_W*f.w,h:o.h/SOURCE_H*f.h};
  }
  function makeRay(points,style) {
    const d=path(points);
    return '<path class="studio-rays__halo" d="'+d+'"/>'+
      '<path class="'+style+'" d="'+d+'"/>';
  }
  function sparkle(points,delay) {
    const d=path(points);
    return '<circle class="studio-rays__spark" r="3.2">'+
      '<animateMotion path="'+d+'" dur="4.8s" begin="'+delay+'s" repeatCount="indefinite"/>'+
      '</circle>';
  }
  N.step2Rays={
    render(page,course){
      if(!page||!page.views?.cutaway||!page.slots?.primary||!page.slots?.secondary||
         course.stage!=='assembly'||!course.installed.includes('primary'))return '';
      if(!N.optics?.calculate)return '';
      const f=page.views.cutaway,pm=mappedHit(page,'primary'),sm=mappedHit(page,'secondary');
      // The 45-degree flat has a diagonal optical face; the authored hit ellipse
      // defines its centre. Primary x is its LEFT reflecting surface, not back shell.
      const primaryX=pm.x+pm.w*.24,secondaryX=sm.x+sm.w/2;
      const axisY=(pm.y+pm.h/2+sm.y+sm.h/2)/2;
      const pxPerX=(primaryX-secondaryX)/4.9;
      const pxPerY=pm.h/1.32;
      const entranceX=f.x+f.w*.105;
      // End at the eyepiece LOWER glass, not on top of the opaque brass barrel.
      const eyepieceY=axisY-pm.h*.47;
      if(![primaryX,secondaryX,axisY,pxPerX,pxPerY,entranceX,eyepieceY].every(Number.isFinite)||
         pxPerX<=0||pxPerY<=0)return '';
      const screen=p=>[secondaryX+(p[0]+1.9)*pxPerX,axisY-p[1]*pxPerY];
      const model=N.optics.calculate(REF),full=course.installed.includes('secondary');
      if(!model?.paths?.length)return '';
      let shapes='',sparks='';
      for(const [i,ray] of model.paths.entries()){
        if(ray.length<4)continue;
        const [source,primary,secondary,exit]=ray.map(screen);
        const incoming=[onX(source,primary,entranceX),primary];
        const reflectedEnd=full?secondary:onX(primary,screen([3-model.imageDistance,0]),entranceX);
        const reflected=[primary,reflectedEnd];
        shapes+=makeRay(incoming,'studio-rays__incident');
        shapes+=makeRay(reflected,'studio-rays__reflected');
        let whole=[...incoming,reflectedEnd];
        if(full){
          const last=onY(secondary,exit,eyepieceY);
          shapes+=makeRay([secondary,last],'studio-rays__folded');
          whole.push(last);
        }
        sparks+=sparkle(whole,i*.9);
      }
      if(!shapes)return '';
      return '<svg class="studio-rays" viewBox="0 0 '+W+' '+H+
        '" aria-hidden="true" focusable="false">'+shapes+
        (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'':sparks)+'</svg>';
    }
  };
})(window.Newton);

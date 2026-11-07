/* Effective-focal ray diagram on a fixed reference telescope, with finite apertures. */
(function(N){
  'use strict';
  const mm=.00182,primaryX=1.285;
  // Measured Scope_02 model dimensions; these are not physical instrument specifications.
  const model=Object.freeze({referenceFocal:800,incomingReferenceFocal:530,referenceEyepiece:25,lensMorphStrength:.5,outgoingLength:.1075,secondaryRadius:.063323,secondarySides:16,boreRadius:.030,
    eyeBase:.16397,eyeTop:.563147,eyeAxisX:.291875,eyeAxisY:.2252,eyeTilt:.00459,
    primaryRadius:.11441,primaryCenterY:-.0039,primaryFaceX:1.27601,primaryTilt:.00489});
  const unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
  const reflect=(d,n)=>{const dot=d.reduce((sum,x,i)=>sum+x*n[i],0);return d.map((x,i)=>x-2*dot*n[i]);};
  const pupilCache=new Map();
  N.sectionOptics={
    mm,model,reflect,
    calculate(state){
      // Trace in a reference assembly; the view uniformly scales it about its mount.
      const apertureScale=state.aperture/130,displayScale=1+.35*Math.log(apertureScale),ratio=1;
      const focal=state.focal*mm,eyeFocal=state.eyepiece*mm,radius=130*mm/2;
      // Focal-only interaction changes the diagram's effective optical power.
      // Every physical surface and mounting position uses the same 800 mm reference.
      const geometryFocal=model.referenceFocal*mm;
      const referenceEyeFocal=model.referenceEyepiece*mm;
      const outerRadius=.19155*ratio,fold=Math.min(.48*ratio,geometryFocal*.55);
      const secondaryX=primaryX-geometryFocal+fold,front=secondaryX-(model.eyeAxisX-.00454)*ratio;
      const lensY=fold+referenceEyeFocal,eyeBase=model.eyeBase*ratio,eyeTop=lensY+.035*ratio;
      const secondaryRadius=model.secondaryRadius*ratio;
      // Inscribed polygon radius and a conservative bore cover every original focuser step.
      const secondaryClear=secondaryRadius*Math.cos(Math.PI/model.secondarySides),lensRadius=model.boreRadius*ratio;
      // Half the former .215-unit purple segment, measured from the lens plane.
      const envelope=Math.min(.0055,lensRadius*.18),exitY=lensY+model.outgoingLength*ratio;
      const fadeStartY=eyeTop+.01*ratio;
      const objectDistance=2000*mm,sourceX=primaryX-objectDistance;
      const imageDistance=state.mode==='point'?1/(1/focal-1/objectDistance):focal;
      const referenceFocal=model.incomingReferenceFocal*mm;
      const referenceDistance=state.mode==='point'?1/(1/referenceFocal-1/objectDistance):referenceFocal;
      const trace=(h,z,distance=imageDistance,eyepieceFocal=eyeFocal)=>{
        const p=[primaryX-(h*h+z*z)/(4*geometryFocal),h,z];
        const incoming=state.mode==='point'?unit([p[0]-sourceX,h,z]):[1,0,0];
        const startX=front-.22,start=[startX,h+(startX-p[0])*incoming[1]/incoming[0],z+(startX-p[0])*incoming[2]/incoming[0]];
        // An ideal effective-focal construction changes convergence while leaving
        // the displayed mirror unchanged. It is not a physical surface deformation.
        const returned=unit([primaryX-distance-p[0],-h,-z]);
        const normal=unit(incoming.map((x,i)=>x-returned[i]));
        const t=(secondaryX-p[0]-p[1])/(returned[0]+returned[1]);
        const secondary=p.map((x,i)=>x+t*returned[i]);
        const folded=reflect(returned,[Math.SQRT1_2,Math.SQRT1_2,0]);
        const atY=y=>secondary.map((x,i)=>x+(y-secondary[1])/folded[1]*folded[i]);
        const lens=atY(lensY),mouth=atY(eyeBase);
        const slope=folded[0]/folded[1]-(lens[0]-secondaryX)/eyepieceFocal;
        const slopeZ=folded[2]/folded[1]-lens[2]/eyepieceFocal;
        const exit=[lens[0]+slope*(exitY-lensY),exitY,lens[2]+slopeZ*(exitY-lensY)];
        const lip=[lens[0]+slope*(eyeTop-lensY),eyeTop,lens[2]+slopeZ*(eyeTop-lensY)];
        const occulted=[0,.5,1].some(fraction=>{
          const offset=.01038*ratio*fraction/Math.SQRT2;
          const incidentT=(secondaryX-2*offset-start[0]-start[1])/(incoming[0]+incoming[1]);
          const incident=start.map((x,i)=>x+incidentT*incoming[i]);
          return incidentT>0&&incident[0]<p[0]&&Math.hypot(incident[0]-secondaryX+offset,incident[1]+offset,incident[2])<secondaryRadius+envelope;
        });
        const footprint=envelope/Math.max(.05,Math.abs((returned[0]+returned[1])*Math.SQRT1_2));
        const secondaryValid=t>0&&folded[1]>0&&secondary[1]<eyeBase&&
          Math.hypot(secondary[0]-secondaryX,secondary[1],secondary[2])+footprint<secondaryClear;
        const valid=!occulted&&secondaryValid&&
          [mouth,lens,lip].every(q=>Math.hypot(q[0]-secondaryX,q[2])+envelope<lensRadius);
        return {points:[start,p,secondary,lens,exit],incoming,normal,returned,folded,slope,slopeZ,footprint,occulted,valid,secondaryValid};
      };
      // Always sample the 530 mm pupil. Changing focal must never move or replace
      // incident rays to accommodate the selected focal's downstream apertures.
      // A full annular pupil, sampled uniformly around the tube rather than on a
      // single meridional plane. Keep the 530 mm reference independent of sliders.
      const rayCount=4*Math.max(2,Math.min(8,Math.round(3*apertureScale*apertureScale)));
      const angles=Array.from({length:rayCount},(_,i)=>(i+.5)*Math.PI*2/rayCount);
      const cacheKey=state.mode+'/'+rayCount;
      let pupil=pupilCache.get(cacheKey);
      if(!pupil){
        const accepted=[],secondaryAccepted=[],unobstructedSecondary=[],samples=256;
        for(let i=1;i<=samples;i++){
          const r=radius*.94*i/samples;
          const ring=angles.map(a=>trace(r*Math.cos(a),r*Math.sin(a),referenceDistance,referenceEyeFocal));
          if(ring.every(p=>p.valid))accepted.push(r);
          if(ring.every(p=>p.secondaryValid))secondaryAccepted.push(r);
          if(ring.every(p=>p.secondaryValid&&!p.occulted))unobstructedSecondary.push(r);
        }
        const candidates=accepted.length?accepted:unobstructedSecondary.length?unobstructedSecondary:secondaryAccepted;
        pupil={min:accepted[0]||0,max:accepted[accepted.length-1]||0,radius:candidates[Math.floor(candidates.length*.5)]||radius*.8};
        pupilCache.set(cacheKey,pupil);
      }
      const pupilMin=pupil.min,pupilMax=pupil.max,pupilRadius=pupil.radius;
      const rays=angles.map(a=>trace(pupilRadius*Math.cos(a),pupilRadius*Math.sin(a)));
      const paths=rays.filter(p=>p.valid),fallbackPaths=rays.filter(p=>!p.valid);
      // A fixed incident ray may miss the finite secondary at another focal.
      // The renderer then retains its incoming segment and omits its reflected branch.
      const secondaryMissed=rays.filter(p=>!p.secondaryValid).length;
      const focusBeforeSecondary=primaryX-imageDistance>=secondaryX;
      const lensOriginalThickness=.009+.018*Math.sqrt(model.referenceEyepiece/state.eyepiece),lensReferenceThickness=.009+.018;
      return {focal,geometryFocal,eyeFocal,radius,outerRadius,primaryX,secondaryX,secondaryRadius,secondaryClear,apertureScale,displayScale,rayCount,pupilRadius,
        front,lensY,lensRadius,eyeBase,eyeTop,exitY,fadeStartY,fold,ratio,envelope,pupilMin,pupilMax,
        vignetted:pupilMax<radius*.93,blocked:!paths.length,incomingReferenceFocal:model.incomingReferenceFocal,secondaryMissed,
        sag:radius*radius/(4*focal),lensOriginalThickness,lensReferenceThickness,
        lensThickness:lensReferenceThickness+model.lensMorphStrength*(lensOriginalThickness-lensReferenceThickness),
        geometrySag:radius*radius/(4*geometryFocal),focusBeforeSecondary,
        focus:focusBeforeSecondary?[primaryX-imageDistance,0,0]:[secondaryX,secondaryX-primaryX+imageDistance,0],rays,paths,fallbackPaths};
    }
  };
})(window.Newton);

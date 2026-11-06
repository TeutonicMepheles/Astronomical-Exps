const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={window:{Newton:{}}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/section-optics.js'),'utf8'),context);
const optics=context.window.Newton.sectionOptics;
const near=(a,b,tolerance=1e-9)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
let configurations=0;
for(const focal of [400,800,1600])for(const aperture of [80,130,250])for(const eyepiece of [5,25,50])for(const mode of ['parallel','point']){
  const c=optics.calculate({focal,aperture,eyepiece,mode});configurations++;
  near(c.radius*c.apertureScale/(aperture/2),optics.mm);near(c.displayScale,1+.35*Math.log(aperture/130));near(c.sag,c.radius*c.radius/(4*c.focal));
  near(c.geometryFocal,800*optics.mm);near(c.geometrySag,c.radius*c.radius/(4*c.geometryFocal));
  near(c.exitY-c.lensY,.215*.5*c.ratio);
  const reference=optics.calculate({focal:800,aperture,eyepiece,mode});
  for(const field of ['primaryX','secondaryX','front','fold','lensY','eyeBase','eyeTop','geometrySag'])near(c[field],reference[field]);
  assert(c.secondaryX<c.primaryX&&c.front<c.secondaryX&&c.lensY>c.fold);
  assert.equal(c.blocked,c.paths.length===0);
  assert.equal(c.paths.length+c.fallbackPaths.length,c.rayCount,'Every aperture retains its representative rays');
  const incomingReference=optics.calculate({focal:530,aperture,eyepiece,mode});
  assert.equal(c.incomingReferenceFocal,530);
  assert.equal(JSON.stringify(c.rays.map(r=>r.points.slice(0,2))),JSON.stringify(incomingReference.rays.map(r=>r.points.slice(0,2))),
    'Incident origins, primary hit positions, order and count must match 530 mm exactly');
  assert.equal(c.secondaryMissed,c.rays.filter(r=>!r.secondaryValid).length);
  for(const ray of c.rays){
    ray.points.flat().forEach(x=>assert(Number.isFinite(x)));
    const [start,primary,secondary,lens,exit]=ray.points;
    assert(start[0]<primary[0]&&secondary[0]<primary[0]&&lens[1]>secondary[1]&&exit[1]>lens[1]);
    near(primary[0],c.primaryX-(primary[1]**2+primary[2]**2)/(4*c.geometryFocal));
    near(Math.hypot(primary[1],primary[2]),c.pupilRadius);
    near(secondary[0]+secondary[1],c.secondaryX);near(lens[1],c.lensY);
    if(ray.secondaryValid){
      assert(Math.hypot(secondary[0]-c.secondaryX,secondary[1],secondary[2])+ray.footprint<c.secondaryClear);
      // Test every polygon edge including the full incident-angle-correct beam radius.
      const tangent=(secondary[0]-c.secondaryX-secondary[1])*Math.SQRT1_2;
      for(let edge=0;edge<optics.model.secondarySides;edge++){
        const angle=(edge+.5)*2*Math.PI/optics.model.secondarySides;
        assert(tangent*Math.cos(angle)+secondary[2]*Math.sin(angle)+ray.footprint<c.secondaryClear);
      }
    }else assert(!ray.valid,'A ray that misses the finite secondary cannot transmit');
    if(ray.valid){
      assert(Math.hypot(lens[0]-c.secondaryX,lens[2])+c.envelope<c.lensRadius);
      const lipX=lens[0]+ray.slope*(c.eyeTop-lens[1]);
      const lipZ=lens[2]+ray.slopeZ*(c.eyeTop-lens[1]);
      assert(Math.hypot(lipX-c.secondaryX,lipZ)+c.envelope<c.lensRadius,'A transmitting ray must pass through the fixed round eyepiece opening');
      assert(exit[1]>c.eyeTop&&c.fadeStartY>c.eyeTop&&c.fadeStartY<exit[1],'The purple tail extends beyond the eyepiece and fades outside');
    }
    // Reflection reverses the normal component and preserves the tangential component.
    near(ray.incoming.reduce((s,x,i)=>s+x*ray.normal[i],0),-ray.returned.reduce((s,x,i)=>s+x*ray.normal[i],0));
    near(Math.hypot(...ray.returned),1);near(ray.folded[0],-ray.returned[1]);near(ray.folded[1],-ray.returned[0]);
    near(ray.folded[2],ray.returned[2]);
    optics.reflect(ray.incoming,ray.normal).forEach((value,i)=>near(value,ray.returned[i]));
    if(mode==='parallel'){
      // The effective-focal diagram converges at the requested primary focus.
      const focusX=primary[0]-primary[1]*ray.returned[0]/ray.returned[1];near(focusX,c.primaryX-c.focal);
      near(primary[2]-primary[1]*ray.returned[2]/ray.returned[1],0);
      const focusY=secondary[1]+(c.secondaryX-secondary[0])*ray.folded[1]/ray.folded[0];near(focusY,c.secondaryX-c.primaryX+c.focal);
      if(focal===800&&eyepiece===25){near(ray.slope,0);near(ray.slopeZ,0);near(exit[0],lens[0]);near(exit[2],lens[2]);}
      near(ray.slope,ray.folded[0]/ray.folded[1]-(lens[0]-c.secondaryX)/c.eyeFocal);
      near(ray.slopeZ,ray.folded[2]/ray.folded[1]-lens[2]/c.eyeFocal);
    }
  }
}
const short=optics.calculate({focal:400,aperture:130,eyepiece:5,mode:'parallel'});
const long=optics.calculate({focal:1600,aperture:130,eyepiece:50,mode:'parallel'});
near(short.sag/long.sag,4);near(short.geometrySag,long.geometrySag);assert(short.lensThickness>long.lensThickness);
assert.notDeepEqual(short.focus,long.focus);
let sweep=0;
for(let focal=400;focal<=1600;focal+=10)for(const aperture of [80,130,250])for(const eyepiece of [5,25,50])for(const mode of ['parallel','point']){
  const c=optics.calculate({focal,aperture,eyepiece,mode}),rays=c.rays;sweep++;
  const reference=optics.calculate({focal:530,aperture,eyepiece,mode});
  assert.equal(rays.length,c.rayCount);
  assert.equal(JSON.stringify(rays.map(r=>r.points.slice(0,2))),JSON.stringify(reference.rays.map(r=>r.points.slice(0,2))));
  for(const ray of rays){const p=ray.points[2];if(ray.secondaryValid)assert(Math.hypot(p[0]-c.secondaryX,p[1],p[2])+ray.footprint<c.secondaryClear);else assert(!ray.valid);}
}
const baseline=optics.calculate({focal:530,aperture:130,eyepiece:25,mode:'parallel'});
assert(baseline.rays.every(r=>r.secondaryValid),'The complete reference ring must reach the finite secondary at 530 mm');
for(const aperture of [80,130,250]){
  const ring=optics.calculate({focal:530,aperture,eyepiece:25,mode:'parallel'}),count=ring.rayCount;
  assert(count>=8,'Even the smallest aperture must show a full ring');
  for(let i=0;i<count;i++){
    const p=ring.rays[i].points[1],opposite=ring.rays[(i+count/2)%count].points[1];
    near(Math.hypot(p[1],p[2]),ring.pupilRadius);near(p[1]+opposite[1],0);near(p[2]+opposite[2],0);
    const next=ring.rays[(i+1)%count].points[1],dot=(p[1]*next[1]+p[2]*next[2])/(ring.pupilRadius**2);
    near(dot,Math.cos(2*Math.PI/count));
  }
  for(const axis of [1,2]){
    assert(Math.max(...ring.rays.map(r=>r.points[1][axis]))>ring.pupilRadius*.9);
    assert(Math.min(...ring.rays.map(r=>r.points[1][axis]))<-ring.pupilRadius*.9);
  }
}
const counts=[80,130,250].map(aperture=>optics.calculate({focal:800,aperture,eyepiece:25,mode:'parallel'}).rayCount);
assert(counts[0]<counts[1]&&counts[1]<counts[2]);
for(const focal of [540,690,800])for(const aperture of [80,110,250])for(const mode of ['parallel','point']){
  const reference=optics.calculate({focal,aperture,eyepiece:25,mode});
  for(const eyepiece of [5,17,25,50]){
    const c=optics.calculate({focal,aperture,eyepiece,mode});
    for(const field of ['front','lensY','eyeBase','eyeTop','exitY','fold'])near(c[field],reference[field]);
    assert.equal(JSON.stringify(c.focus),JSON.stringify(reference.focus));
    assert.equal(JSON.stringify(c.rays.map(r=>r.points.slice(0,4))),JSON.stringify(reference.rays.map(r=>r.points.slice(0,4))),
      'Eyepiece focal must preserve all yellow/cyan ray endpoints, including the fixed lens plane');
    near(c.lensThickness-.027,.5*((.009+.018*Math.sqrt(25/eyepiece))-.027));
    if(eyepiece!==25)assert.notEqual(c.rays[0].slope,reference.rays[0].slope,'Only the post-lens ray direction responds to eyepiece focal');
  }
}
console.log(`PASS ${configurations} reference-assembly diagrams and ${sweep} full-range checks: uniform 360-degree pupil rings, fixed 530 mm incident rays, fixed hardware, three-dimensional reflection/refraction and finite round apertures.`);

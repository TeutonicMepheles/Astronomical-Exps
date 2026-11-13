const assert=require('node:assert/strict');
(async()=>{
 const {visibleAt,visibleSegments}=await import('./js/overview-depth.mjs');
 const globe={x:0,y:0,depth:0,r:10};
 assert.equal(visibleAt({x:0,y:0,depth:-20},[globe]),false,'rear Moon is occulted');
 assert.equal(visibleAt({x:0,y:0,depth:20},[globe]),true,'near Moon is in front');
 assert.equal(visibleAt({x:0,y:0,depth:5},[globe]),false,'test sphere surface, not merely center depth');
 assert.equal(visibleAt({x:11,y:0,depth:-20},[globe]),true,'outside limb remains visible');
 const rear=visibleSegments([{x:-20,y:0,depth:-20},{x:20,y:0,depth:-20}],[globe]);
 assert.equal(rear.length,2);assert.ok(rear[0][1].x<=-9.5);assert.ok(rear[1][0].x>=9.5);
 assert.equal(visibleSegments([{x:-20,y:0,depth:20},{x:20,y:0,depth:20}],[globe]).length,1);
 console.log('PASS front/back occultation, spherical surface depth, limb splitting.');
})().catch(e=>{console.error(e);process.exitCode=1;});

/* Axial conic sections in image coordinates. No optical scale in mm is assumed. */
(function(root){
  'use strict';
  function create(start,end,sag,kind='parabola',direction=1){
    const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy),half=length/2;
    if(!(dy>0&&sag>0&&sag<half)||!['parabola','sphere'].includes(kind)||![-1,1].includes(direction))throw new RangeError('Invalid conic profile');
    const along={x:dx/length,y:dy/length},normal={x:along.y,y:-along.x};
    const radius=(half*half+sag*sag)/(2*sag),rimDistance=radius-sag;
    function point(t){
      const u=(t-.5)*length;
      // Rationalized circular sag avoids subtracting nearly equal square roots.
      const depth=direction*(kind==='sphere'?(half*half-u*u)/(Math.sqrt(radius*radius-u*u)+rimDistance):4*sag*t*(1-t));
      return {x:start.x+dx*t+normal.x*depth,y:start.y+dy*t+normal.y*depth};
    }
    function atY(y){
      if(y<start.y||y>end.y)return null;
      let low=0,high=1;
      for(let i=0;i<45;i++){const mid=(low+high)/2;if(point(mid).y<y)low=mid;else high=mid;}
      return point((low+high)/2).x;
    }
    const middle={x:(start.x+end.x)/2,y:(start.y+end.y)/2};
    const vertex=point(.5),focalMagnitude=kind==='sphere'?radius/2:length*length/(16*sag);
    const focus={x:vertex.x-direction*normal.x*focalMagnitude,y:vertex.y-direction*normal.y*focalMagnitude};
    const center={x:middle.x-direction*normal.x*rimDistance,y:middle.y-direction*normal.y*rimDistance};
    return {kind,start,end,sag,direction,length,along,normal,radius,vertex,focus,center,focalMagnitude,point,atY};
  }
  const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.MirrorProfile=api;
})(typeof window==='object'?window:globalThis);

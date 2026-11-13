// Authored teaching ruler, not a calibration of the photographed apparatus.
export const BALLOON_LAYOUT=Object.freeze({nozzleStart:125,carriageStart:330,travel:470,rulerCm:100,floor:620,playbackRate:.25});
export function balloonMotion(charge,time){
 const progress=Math.max(0,Math.min(1,time/4)),travel=progress*Math.max(0,Math.min(1,charge))*BALLOON_LAYOUT.travel;
 return{progress,travel,remaining:charge*(1-progress),carriageX:BALLOON_LAYOUT.carriageStart+travel,nozzleX:BALLOON_LAYOUT.nozzleStart+travel,displacementCm:travel/BALLOON_LAYOUT.travel*BALLOON_LAYOUT.rulerCm};
}

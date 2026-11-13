export const CANNON_ART={"width": 2368, "height": 1776, "muzzle": [1770, 79], "ground": [2300, 1592], "rotation": 0.0698860016346425, "scale": 0.19, "target": [440, 235]};
export function artPoint([x,y]){const a=CANNON_ART,dx=x-a.muzzle[0],dy=y-a.muzzle[1],c=Math.cos(a.rotation),s=Math.sin(a.rotation);return[a.target[0]+a.scale*(dx*c-dy*s),a.target[1]+a.scale*(dx*s+dy*c)];}

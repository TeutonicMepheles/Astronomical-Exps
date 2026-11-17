// Finite apparent discs at one observer. Status is independent of display colors.
export function classifySolarDiscs(sunR,moonR,separation){
 if(separation>=sunR+moonR)return 'none';
 if(moonR>=sunR&&separation<=moonR-sunR)return 'total';
 if(sunR>moonR&&separation<=sunR-moonR)return 'annular';
 return 'partial';
}
export function exactSolarCone(M,center,radius,sun,sunRadius){
 const distance=M.dist(center,sun),axis=M.unit(M.sub(center,sun)),difference=sunRadius-radius,sum=sunRadius+radius;
 const innerSlope=difference/Math.sqrt(distance*distance-difference*difference),outerSlope=sum/Math.sqrt(distance*distance-sum*sum),innerIntercept=radius*distance/Math.sqrt(distance*distance-difference*difference),outerIntercept=radius*distance/Math.sqrt(distance*distance-sum*sum),umbraLength=distance*radius/difference;
 return {axis,sourceRadius:radius,umbraLength,umbraApex:M.add(center,M.mul(axis,umbraLength)),penumbraApex:M.add(center,M.mul(axis,-distance*radius/sum)),umbraHalfAngle:Math.asin(difference/distance),penumbraHalfAngle:Math.asin(sum/distance),umbraRadiusAt:t=>innerIntercept-innerSlope*t,penumbraRadiusAt:t=>outerIntercept+outerSlope*t};
}

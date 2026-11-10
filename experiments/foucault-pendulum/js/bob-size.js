// Relative, equal-density spherical size; this is display calibration, not a density estimate.
export const MASS_DISPLAY_REFERENCE=100;
export function bobSize(mass,baseScale,cableLength,radius){
  const massScale=mass===null?1:Math.cbrt(mass/MASS_DISPLAY_REFERENCE);
  const requested=baseScale*massScale;
  const scale=Math.min(requested,220/70,cableLength*.8/radius);
  return {scale,limited:scale<requested*(1-1e-10)};
}

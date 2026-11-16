// Experiment-local adaptation of GlobeShaderRenderer's pigment noise, 2026-11-16.
// Source: shared/components/globe-shader-renderer/renderer.js (hash31/vnoise3/fbm3,
// procedural brush and rough pigment). The globe API renders spheres only; this
// variant retains the imported mesh UV paint and Three.js lighting/selection.
// Object-space noise is static: no additional clock, textures, render pass or RAF.
const pigmentGLSL = `
varying vec3 vRocketPaper;
float rocketHash(vec3 p) {
 p=fract(p*.3183099+vec3(.11,.17,.13));p*=17.;
 return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float rocketNoise(vec3 p) {
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 float a=mix(rocketHash(i),rocketHash(i+vec3(1,0,0)),f.x);
 float b=mix(rocketHash(i+vec3(0,1,0)),rocketHash(i+vec3(1,1,0)),f.x);
 float c=mix(rocketHash(i+vec3(0,0,1)),rocketHash(i+vec3(1,0,1)),f.x);
 float d=mix(rocketHash(i+vec3(0,1,1)),rocketHash(i+vec3(1,1,1)),f.x);
 return mix(mix(a,b,f.y),mix(c,d,f.y),f.z);
}
float rocketFBM(vec3 p) {return .68*rocketNoise(p)+.32*rocketNoise(p*2.13);}
`;

export function applyRocketPaint(material) {
 material.userData.rocketPaint=true;
 material.roughness=Math.max(material.roughness??.6,.62);
 material.metalness=Math.min(material.metalness??0,.12);
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vRocketPaper;\n'+shader.vertexShader.replace(
   '#include <begin_vertex>','#include <begin_vertex>\nvRocketPaper=position/8.;');
  shader.fragmentShader=pigmentGLSL+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float rocketBrush=rocketFBM(vRocketPaper*vec3(7.,21.,7.));
   float rocketPigment=rocketFBM(vRocketPaper*vec3(24.,48.,24.));
   vec3 grainPoint=vRocketPaper*180.;
   float grainDetail=1.-smoothstep(.35,1.4,length(fwidth(grainPoint)));
   float rocketGrain=(rocketNoise(grainPoint)-.5)*grainDetail;
   diffuseColor.rgb*=.88+.24*rocketBrush+.095*rocketGrain;
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor+.13*(rocketPigment-.5),.48,.94);
  `);
 };
 material.customProgramCacheKey=()=> 'rocket-globe-pigment-v1';
 return material;
}

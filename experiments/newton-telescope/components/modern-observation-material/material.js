/* Private Three.js adaptation of the Foucault globe procedural pigment. See SOURCE.md. */
(function(N){
 'use strict';
 const pigment=`float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
}

// Two octaves are sufficient at the supplied globe sizes.
float fbm3(vec3 p) {
  return 0.68 * vnoise3(p) + 0.32 * vnoise3(p * 2.13);
}

`;
 N.modernObservationMaterial=function(material){
  const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
  material.userData.modernPaint=true;
  material.onBeforeCompile=function(shader,renderer){
   previous.call(this,shader,renderer);
   shader.vertexShader='varying vec3 modernPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmodernPosition=position;');
   shader.fragmentShader='varying vec3 modernPosition;\n'+pigment+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    // The source atlas is only a surface-ID mask: discard brown pigment and wood streaks.
    float modernWarm=smoothstep(.12,.28,(diffuseColor.r-diffuseColor.b)/max(diffuseColor.r,.001));
    vec3 modernP=modernPosition*3.;
    float modernBrush=fbm3(modernP*vec3(7.,21.,7.));
    vec3 modernPaperP=modernPosition*650.;
    float modernFootprint=max(length(dFdx(modernPaperP)),length(dFdy(modernPaperP)));
    float modernPaper=(hash31(floor(modernPaperP))-.5)*(1.-smoothstep(.65,1.8,modernFootprint));
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
    // Preserve the original metal mask for section-wall transparency.
    float modernMetal=smoothstep(.25,.75,metalnessFactor);
    vec3 modernWhite=vec3(.80,.825,.85);
    vec3 modernSilver=vec3(.48,.53,.59);
    diffuseColor.rgb=mix(diffuseColor.rgb,mix(modernWhite,modernSilver,modernMetal),modernWarm);
    float modernSurface=modernWarm*(1.-modernMetal*.7);
    diffuseColor.rgb*=mix(1.,.895+.210*modernBrush,modernSurface);
    diffuseColor.rgb+=modernPaper*.028*modernSurface;
    roughnessFactor=mix(roughnessFactor,mix(.76,.42,modernMetal)+(modernBrush-.5)*.12,modernWarm);
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
    vec3 modernSmoothNormal=normal;
    #include <normal_fragment_maps>
    normal=normalize(mix(normal,modernSmoothNormal,modernWarm));
   `);
  };
  material.customProgramCacheKey=()=>previousKey+'/modern-observation-pigment-v1';
  return material;
 };
})(window.Newton);

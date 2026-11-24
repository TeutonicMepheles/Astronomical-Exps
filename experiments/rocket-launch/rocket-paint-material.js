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

// Globe-inspired directional wash and chalk pigment, adapted to arbitrary meshes.
// Keep UV albedo, alpha, emissive selection and any pre-existing scan/fill hooks.
export function applyRocketPaint(material,padLighting) {
 if(material.userData.rocketPaint)return material;
 if(/^(Interior_|NASA_Terra_|Tianzhou_)/.test(material.name))return applyInteriorSurface(material);
 material.userData.rocketPaint=true;
 material.roughness= .82; material.metalness=0;
 const previous=material.onBeforeCompile, previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previous.call(material,shader);
  shader.vertexShader='varying vec3 vRocketPaper; varying vec3 vRocketNormal;\n'+shader.vertexShader.replace(
   '#include <begin_vertex>','#include <begin_vertex>\nvRocketPaper=position/8.; vRocketNormal=normalize(normalMatrix*normal);');
  if(padLighting){
   Object.assign(shader.uniforms,padLighting);
   shader.vertexShader='varying vec3 vPadWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvPadWorld=(modelMatrix*vec4(position,1.)).xyz;');
  }
  shader.fragmentShader=pigmentGLSL+'varying vec3 vRocketNormal;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
   {
   vec3 paperN=normalize(vRocketNormal);
   vec3 paperSun=normalize(vec3(-.65,.55,1.));
   float NoL=max(dot(paperN,paperSun),0.);
   float NoV=max(abs(paperN.z),.001);
   float brush=rocketFBM(vRocketPaper*vec3(7.,21.,7.));
   float pigment=rocketFBM(vRocketPaper*vec3(24.,48.,24.));
   // Stable object-space stipple; derivative filtering retains coarse pigment at distance.
   vec3 gp=vRocketPaper*110.;
   float detail=1.-smoothstep(.6,2.4,length(fwidth(gp)));
   float paper=(rocketNoise(gp)-.5)*detail;
   float wash=smoothstep(.02,.92,NoL);
   vec3 shade=mix(vec3(.29,.35,.46),vec3(1.04,1.00,.90),wash);
   vec3 painted=diffuseColor.rgb*shade*(.79+.36*brush+.38*paper);
   float roughness=.48+.20*pigment;
   vec3 H=normalize(paperSun+vec3(0.,0.,1.));
   float NoH=max(dot(paperN,H),0.);
   float a2=pow(roughness,4.);
   float denom=NoH*NoH*(a2-1.)+1.;
   float spec=a2/(3.14159265*denom*denom);
   float edge=pow(1.-NoV,.7)*smoothstep(.05,.85,NoL);
   float warmth=clamp((.18*NoL*NoL+edge*.65)*(.82+.30*brush),0.,.7);
   vec3 warm=vec3(1.,.94,.82)*(.82+.18*clamp(diffuseColor.rgb*1.25,0.,1.));
   painted=mix(painted,warm,warmth*.65);
   painted+=vec3(1.,.94,.82)*min(spec*.025,.12)*NoL*(.84+.28*pigment+.2*paper);
   outgoingLight=painted+totalEmissiveRadiance;
   }
   #include <opaque_fragment>
  `);
  if(padLighting){
   shader.fragmentShader=`
    varying vec3 vPadWorld;
    uniform float padLightMix;
    uniform vec3 padLightA;
    uniform vec3 padLightB;
    uniform vec3 padAim;
    float padBeam(vec3 lamp, vec3 normalView) {
     vec3 ray=vPadWorld-lamp;
     float distanceToLamp=max(length(ray),1.);
     vec3 direction=ray/distanceToLamp;
     float cone=smoothstep(.82,.98,dot(direction,normalize(padAim-lamp)));
     vec3 lightView=mat3(viewMatrix)*(-direction);
     return cone*max(dot(normalView,lightView),0.)*min(1.45,5000./(distanceToLamp*distanceToLamp));
    }
   `+shader.fragmentShader.replace('outgoingLight=painted+totalEmissiveRadiance;',`
    if(padLightMix>0.) {
     float key=padBeam(padLightA,paperN);
     float fill=padBeam(padLightB,paperN);
     float aboveBeam=smoothstep(padAim.y+7.,padAim.y+37.,vPadWorld.y);
     vec3 evening=painted*mix(vec3(.24,.30,.46),vec3(.16,.21,.35),aboveBeam);
     vec3 pools=diffuseColor.rgb*(key*vec3(.86,.69,.49)+fill*vec3(.22,.32,.49))*(.91+.18*brush);
     vec3 lit=evening+pools*(1.-.72*aboveBeam);
     vec3 shoulder=max(lit-vec3(.42),vec3(0.));
     painted=mix(painted,min(lit,vec3(.42))+shoulder/(1.+1.5*shoulder),padLightMix);
    }
    outgoingLight=painted+totalEmissiveRadiance;
   `);
  }
 };
 material.customProgramCacheKey=()=>previousKey+(padLighting?'-rocket-pad-lit-v1':'-rocket-globe-pigment-v2');
 material.needsUpdate=true;
 return material;
}

// Interior metals keep the imported PBR response; restrained grain never replaces lighting.
function applyInteriorSurface(material){
 material.userData.rocketPaint=true;material.userData.interiorPBR=true;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey(),solar=/Panels/.test(material.name)&&!/Hardware/.test(material.name),tank=/^Interior_.*(_Primer|_Endcap|MachinedRings)$/.test(material.name);
 material.onBeforeCompile=shader=>{
  previous.call(material,shader);
  shader.vertexShader='varying vec3 vInteriorPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvInteriorPosition=position;');
  shader.fragmentShader='varying vec3 vInteriorPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grain=sin(vInteriorPosition.x*173.0+sin(vInteriorPosition.z*31.0))*sin(vInteriorPosition.z*219.0);
   diffuseColor.rgb*=1.0+grain*${tank?'0.008':'0.035'};
   ${solar?"vec2 cell=abs(fract(vInteriorPosition.yz*vec2(9.,18.))-.5);float seam=smoothstep(.45,.49,max(cell.x,cell.y));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.21,.32,.44),seam*.65);":""}
  `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+grain*'+(tank?'.008':'.035')+',.18,.8);');
 };
 material.customProgramCacheKey=()=>key+'-interior-pbr-grain-v2-'+solar+'-'+tank;material.needsUpdate=true;return material;
}

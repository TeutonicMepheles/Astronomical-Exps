/** Screen-aligned yellow drafting strokes inside selected source mesh fragments. */
export function applyRocketSelectionHatch(material,pixelRatio=1){
 if(material.userData.rocketSelectionHatch)return material;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey(),ratio={value:pixelRatio};
 material.userData.rocketSelectionHatch=true;material.userData.selectionHatchRatio=ratio;
 material.onBeforeCompile=shader=>{previous.call(material,shader);shader.uniforms.rocketSelectionHatchRatio=ratio;shader.fragmentShader='uniform float rocketSelectionHatchRatio;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
  float hatchPhase=(gl_FragCoord.x-gl_FragCoord.y)/(15.0*rocketSelectionHatchRatio);
  float hatchWidth=max(fwidth(hatchPhase),0.001);
  float hatchDistance=abs(fract(hatchPhase)-0.5);
  float selectedHatch=1.0-smoothstep(0.065,0.065+hatchWidth,hatchDistance);
  outgoingLight=mix(outgoingLight,vec3(1.0,0.64,0.09),selectedHatch*0.78);
  #include <opaque_fragment>
 `);};
 material.customProgramCacheKey=()=>key+'-selected-yellow-hatch-v1';material.needsUpdate=true;return material;
}

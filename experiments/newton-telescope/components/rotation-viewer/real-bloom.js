/* Local selective Bloom: depth-tested emission + separable Gaussian convolution.
   The normal scene is rendered directly (unchanged colour management). The blur
   is composited additively, excluding unrelated opaque silhouettes. */
(function(N){'use strict';
N.createStep2Bloom=function(T,renderer){
 const options={minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,depthBuffer:true};
 const emission=new T.WebGLRenderTarget(1,1,options),ping=new T.WebGLRenderTarget(1,1,{...options,depthBuffer:false}),pong=ping.clone();
 const black=new T.MeshBasicMaterial({color:0,side:T.DoubleSide});
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));scene.add(quad);
 const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:null},stepUV:{value:new T.Vector2()}},vertexShader:vertex,fragmentShader:'precision highp float;varying vec2 vUv;uniform sampler2D image;uniform vec2 stepUV;void main(){vec4 c=texture2D(image,vUv)*.227027;c+=(texture2D(image,vUv+stepUV*1.384615)+texture2D(image,vUv-stepUV*1.384615))*.316216;c+=(texture2D(image,vUv+stepUV*3.230769)+texture2D(image,vUv-stepUV*3.230769))*.070270;gl_FragColor=c;}'});
 const composite=new T.ShaderMaterial({depthTest:false,depthWrite:false,transparent:true,blending:T.CustomBlending,blendSrc:T.SrcAlphaFactor,blendDst:T.OneFactor,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlpha,toneMapped:false,uniforms:{glowImage:{value:pong.texture},emissionImage:{value:emission.texture},strength:{value:.7}},vertexShader:vertex,fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D glowImage,emissionImage;uniform float strength;void main(){vec4 e=texture2D(emissionImage,vUv);vec3 g=texture2D(glowImage,vUv).rgb*strength;float visibleLight=step(.005,max(e.r,max(e.g,e.b)));g*=max(1.-e.a,visibleLight);float a=clamp(max(g.r,max(g.g,g.b)),0.,.6);gl_FragColor=vec4(g/max(a,.00001),a);}`});
 let width=1,height=1;
 function resize(w,h){width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));emission.setSize(width,height);ping.setSize(Math.max(1,width>>1),Math.max(1,height>>1));pong.setSize(ping.width,ping.height);}
 function render(world,view){
  const saved=[],clear=new T.Color();renderer.getClearColor(clear);const alpha=renderer.getClearAlpha(),tone=renderer.toneMapping,autoClear=renderer.autoClear;
  renderer.setRenderTarget(null);renderer.render(world,view);
  world.traverse(o=>{if(o.isMesh&&!o.userData.isOpticalBeam){saved.push([o,o.material]);o.material=black;}});
  renderer.setClearColor(0,0);renderer.setRenderTarget(emission);renderer.clear();renderer.render(world,view);for(const [o,m] of saved)o.material=m;
  renderer.toneMapping=T.NoToneMapping;quad.material=blur;blur.uniforms.image.value=emission.texture;blur.uniforms.stepUV.value.set(1.6/width,0);renderer.setRenderTarget(ping);renderer.clear();renderer.render(scene,camera);
  blur.uniforms.image.value=ping.texture;blur.uniforms.stepUV.value.set(0,1.6/height);renderer.setRenderTarget(pong);renderer.clear();renderer.render(scene,camera);
  quad.material=composite;renderer.setRenderTarget(null);renderer.autoClear=false;renderer.render(scene,camera);renderer.autoClear=autoClear;renderer.toneMapping=tone;renderer.setClearColor(clear,alpha);
 }
 return {render,resize,type:'selective-gaussian-two-pass',targets:[emission,ping,pong],dispose(){for(const t of [emission,ping,pong])t.dispose();black.dispose();blur.dispose();composite.dispose();quad.geometry.dispose();}};
};
})(window.Newton=window.Newton||{});

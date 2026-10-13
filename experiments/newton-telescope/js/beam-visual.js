/* Soft light scattered around the physical path; this never changes ray geometry. */
(function(N){
  'use strict';const T=window.THREE;
  N.BeamVisual={
    addSegment(parent,start,end,color){
      const a=new T.Vector3(...start),b=new T.Vector3(...end),direction=b.clone().sub(a),length=direction.length();
      if(length<.0001)return;
      const material=new T.ShaderMaterial({
        uniforms:{tint:{value:new T.Color(color)},length:{value:length}},
        vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:`varying vec2 vUv; uniform vec3 tint; uniform float length;
          void main(){
            float y=(vUv.y-.5)*2.;
            float halo=exp(-y*y*9.)*.18+exp(-y*y*38.)*.24;
            float core=exp(-y*y*550.)*.65;
            float scatter=.88+.08*sin(vUv.x*length*13.)+.04*sin(vUv.x*length*43.+y*17.);
            float ends=smoothstep(0.,.025,vUv.x)*smoothstep(0.,.025,1.-vUv.x);
            gl_FragColor=vec4(tint,(halo*scatter+core)*ends);
          }`,
        transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide
      });
      const mesh=new T.Mesh(new T.PlaneGeometry(length,.32),material);
      mesh.position.copy(a).lerp(b,.5);mesh.position.z+=.025;
      mesh.rotation.z=Math.atan2(direction.y,direction.x);parent.add(mesh);
    }
  };
})(window.Newton);

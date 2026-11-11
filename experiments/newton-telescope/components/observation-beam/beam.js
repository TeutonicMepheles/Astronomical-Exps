/* Batched 3D adaptation of shared OpticalBeam's first-stage halo. See SOURCE.md. */
(function(N){
 'use strict';
 const T=window.THREE;
 N.ObservationBeam=class{
  constructor(){
   this.material=new T.ShaderMaterial({
    uniforms:{beamOpacity:{value:1}},transparent:true,depthWrite:false,depthTest:true,
    blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,
    vertexShader:`attribute vec3 direction;attribute vec3 tint;attribute float width;attribute float fade;attribute float beamLength;
     varying vec2 vUv;varying vec3 vTint;varying float vFade;varying float vLength;
     void main(){
      vUv=uv;vTint=tint;vFade=fade;vLength=beamLength;
      vec4 p=modelViewMatrix*vec4(position,1.);
      vec3 d=mat3(modelViewMatrix)*direction;
      vec2 side=vec2(-d.y,d.x)/max(length(d.xy),.00001);
      float scale=length(modelViewMatrix[0].xyz);
      p.xy+=side*(uv.y-.5)*width*scale;
      gl_Position=projectionMatrix*p;
     }`,
    fragmentShader:`varying vec2 vUv;varying vec3 vTint;varying float vFade;varying float vLength;uniform float beamOpacity;
     void main(){
      float y=(vUv.y-.5)*2.;
      float halo=exp(-y*y*9.)*.18+exp(-y*y*38.)*.24;
      float core=exp(-y*y*550.)*.65;
      float scatter=.88+.08*sin(vUv.x*vLength*13.)+.04*sin(vUv.x*vLength*43.+y*17.);
      float ends=smoothstep(0.,.025,vUv.x)*smoothstep(0.,.025,1.-vUv.x);
      gl_FragColor=vec4(vTint,(halo*scatter+core)*ends*beamOpacity*vFade);
     }`
   });
   this.mesh=new T.Mesh(new T.BufferGeometry(),this.material);this.mesh.name='observation-bloom-beams';
   this.mesh.renderOrder=11;this.mesh.frustumCulled=false;
  }
  setOpacity(value){this.material.uniforms.beamOpacity.value=value;}
  update(paths,c){
   const arrays={position:[],direction:[],tint:[],width:[],fade:[],beamLength:[],uv:[]};
   const colors=[new T.Color(0xffd17e),new T.Color(0x6fe8ff),new T.Color(0x6fe8ff),new T.Color(0xd3adff)];
   const width=c.envelope*10*Math.min(1,Math.sqrt(4/c.rayCount));
   for(const path of paths)path.points.slice(1).forEach((end,j)=>{
    const a=new T.Vector3(...path.points[j]),b=new T.Vector3(...end),d=b.clone().sub(a),length=d.length();
    if(length<.0001)return;d.normalize();const rows=j===3?32:1;
    const vertex=(u,v)=>{
     const point=a.clone().lerp(b,u);
     arrays.position.push(...point.toArray());arrays.direction.push(...d.toArray());arrays.tint.push(...colors[j].toArray());
     arrays.width.push(width);arrays.beamLength.push(length*10);arrays.uv.push(u,v);
     arrays.fade.push(j===3?1-T.MathUtils.smoothstep(point.y,c.fadeStartY,c.exitY):1);
    };
    for(let i=0;i<rows;i++){const a=i/rows,b=(i+1)/rows;for(const [u,v] of [[a,0],[b,0],[a,1],[a,1],[b,0],[b,1]])vertex(u,v);}
   });
   const geometry=new T.BufferGeometry();
   for(const [key,values] of Object.entries(arrays))geometry.setAttribute(key,new T.Float32BufferAttribute(values,['position','direction','tint'].includes(key)?3:key==='uv'?2:1));
   this.mesh.geometry.dispose();this.mesh.geometry=geometry;
  }
  dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();}
 };
})(window.Newton);

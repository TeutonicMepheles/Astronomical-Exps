import * as T from './vendor/three/three.module.js';

/** Metre-spaced surface grid and scan bands; static, antialiased, no extra clock. */
export function createScanMaterial({opacity=.42,color=0x87cdd1}={}){
 return new T.ShaderMaterial({
  name:'RocketScanGrid',transparent:true,depthWrite:false,side:T.FrontSide,
  uniforms:{tint:{value:new T.Color(color)},strength:{value:opacity}},
  vertexShader:`varying vec3 surface; varying vec3 facing;
   void main(){surface=position;facing=normalize(normalMatrix*normal);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec3 surface; varying vec3 facing;
   uniform vec3 tint; uniform float strength;
   float line(float value){float width=max(fwidth(value),0.001);float edge=abs(fract(value-0.5)-0.5);return 1.0-smoothstep(width*0.35,width*1.4,edge);}
   void main(){
    float grid=max(line(surface.y/1.2),max(line(surface.x/1.2),line(surface.z/1.2)));
    float scan=line(surface.y/0.3)*0.23;
    float rim=pow(1.0-abs(facing.z),2.0);
    float alpha=strength*(0.055+0.62*grid+scan+0.45*rim);
    gl_FragColor=vec4(tint,clamp(alpha,0.0,0.72));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
}

import * as T from './vendor/three/three.module.js';
// Three intersecting feathered sheets, one draw call per nozzle. Page-owned clock only.
export function createRocketExhaust(){
 const positions=[],uvs=[];
 for(let sheet=0;sheet<3;sheet++){const a=sheet*Math.PI/3,c=Math.cos(a),s=Math.sin(a);for(const [x,y,u,v]of [[-1,0,0,0],[1,0,1,0],[-1,-1,0,1],[1,0,1,0],[1,-1,1,1],[-1,-1,0,1]]){positions.push(x*c,y,x*s);uvs.push(u,v);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{clock:{value:0},power:{value:1}},vertexShader:`varying vec2 plumeUV; uniform float clock; uniform float power;
 void main(){plumeUV=uv;vec3 p=position;p.xz*=1.6;p.y*=9.5*power;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`precision highp float;varying vec2 plumeUV;uniform float clock;uniform float power;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){float y=plumeUV.y;float n=noise(vec2(plumeUV.x*12.,y*23.-clock*16.));float coarse=noise(vec2(plumeUV.x*5.,y*8.-clock*7.));
 float width=mix(.30,.80,smoothstep(0.,.22,y))*(1.-.72*pow(y,1.8));width*=.83+.22*coarse;
 float x=abs(plumeUV.x-.5)*2.;float edge=1.-smoothstep(width*.35,width,x);float tail=pow(1.-smoothstep(.52,1.,y),1.4);
 float core=exp(-x*x/max(.003,width*width*.14))*(1.-smoothstep(.2,.86,y));float cells=.96+.04*cos(y*43.-.9*sin(clock*12.));
 vec3 amber=mix(vec3(1.,.17,.025),vec3(1.,.63,.20),coarse);vec3 color=mix(amber,vec3(.76,.88,1.),exp(-y*18.));color=mix(color,vec3(1.,.97,.80),core*.88);
 float alpha=edge*tail*(.18+.30*n+.26*core)*cells*smoothstep(0.,.018,y);gl_FragColor=vec4(color,alpha*power);}`});
 const flame=new T.Mesh(geometry,material);flame.frustumCulled=false;const group=new T.Group();group.name='EngineExhaust';group.add(flame);group.visible=false;
 return{group,flame,update(time){material.uniforms.clock.value=time;material.uniforms.power.value=.96+.04*Math.sin(time*23.);},reset(){group.visible=false;material.uniforms.clock.value=0;},dispose(){geometry.dispose();material.dispose();}};
}

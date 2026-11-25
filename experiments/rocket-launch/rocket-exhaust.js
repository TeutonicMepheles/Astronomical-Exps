import * as T from './vendor/three/three.module.js';
// Three intersecting feathered sheets, one draw call per nozzle. Page-owned clock only.
export function createRocketExhaust(){
 const positions=[],uvs=[];
 for(let sheet=0;sheet<3;sheet++){const a=sheet*Math.PI/3,c=Math.cos(a),s=Math.sin(a);for(const [x,y,u,v]of [[-1,0,0,0],[1,0,1,0],[-1,-1,0,1],[1,0,1,0],[1,-1,1,1],[-1,-1,0,1]]){positions.push(x*c,y,x*s);uvs.push(u,v);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{clock:{value:0},power:{value:1},padPlume:{value:0},flightVapor:{value:0},spool:{value:1},padGround:{value:0}},vertexShader:`varying vec2 plumeUV; varying float worldHeight; uniform float clock; uniform float power;
 void main(){plumeUV=uv;vec3 p=position;p.xz*=7.5;p.y*=64.*power;worldHeight=(modelMatrix*vec4(p,1.)).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`precision highp float;varying vec2 plumeUV;uniform float clock;uniform float power;uniform float padPlume;uniform float flightVapor;uniform float spool;uniform float padGround;varying float worldHeight;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){
  float y=plumeUV.y;
  float turbulence=noise(vec2(plumeUV.x*13.,y*23.-clock*15.));
  float cloud=noise(vec2(plumeUV.x*6.,y*9.-clock*6.));
  float center=(cloud-.5)*.24*smoothstep(.05,.76,y);
  float distanceFromAxis=abs((plumeUV.x-.5)*2.-center);

  // Nozzle-sized at the origin, then a wide, turbulent expansion and soft wake.
  float width=mix(.095,.89,pow(y,.53))*(.88+.24*cloud);
  float edge=1.-smoothstep(width*.43,width,distanceFromAxis);
  float coreWidth=width*mix(.78,.27,smoothstep(.10,.51,y));
  float core=(1.-smoothstep(coreWidth*.52,coreWidth,distanceFromAxis))*
    (1.-smoothstep(.24,.60,y));
  float hotGas=edge*(.42+.58*turbulence)*(1.-smoothstep(.42,.88,y));
  float wake=edge*(.25+.75*cloud)*smoothstep(.26,.61,y)*(1.-smoothstep(.78,1.,y));
  vec3 amber=mix(vec3(1.15,.29,.06),vec3(1.25,.66,.27),turbulence);
  vec3 wakeColor=mix(vec3(.70,.46,.33),vec3(.68,.73,.80),smoothstep(.49,.97,y));
  vec3 gasColor=mix(amber,wakeColor,smoothstep(.44,.92,y));
  float hotCore=core*(.96+.04*cos(y*68.-clock*14.));
  vec3 color=mix(gasColor,vec3(1.52,1.41,1.20),hotCore);
  float alpha=(hotGas*.72+hotCore*.88+wake*(.23+.09*flightVapor))*smoothstep(0.,.012,y);
  if(padPlume>.5){
   // The hot jet fades above the pad, where the ground-steam effect takes over.
   alpha*=spool*smoothstep(0.,6.,worldHeight-padGround);
  }
 gl_FragColor=vec4(color,alpha*power);}`});
 const flame=new T.Mesh(geometry,material);flame.frustumCulled=false;const group=new T.Group();group.name='EngineExhaust';group.add(flame);group.visible=false;
 return{group,flame,update(time,spool=null,ground=0,flightVapor=false){material.uniforms.flightVapor.value=flightVapor?1:0;material.uniforms.clock.value=time;material.uniforms.power.value=.96+.04*Math.sin(time*23.);material.uniforms.padPlume.value=spool===null?0:1;material.uniforms.spool.value=spool??1;material.uniforms.padGround.value=ground;},reset(){group.visible=false;material.uniforms.clock.value=0;},dispose(){geometry.dispose();material.dispose();}};
}

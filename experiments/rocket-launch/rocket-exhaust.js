import * as T from './vendor/three/three.module.js';
// Three intersecting feathered sheets, one draw call per nozzle. Page-owned clock only.
export function createRocketExhaust(){
 const positions=[],uvs=[];
 for(let sheet=0;sheet<3;sheet++){const a=sheet*Math.PI/3,c=Math.cos(a),s=Math.sin(a);for(const [x,y,u,v]of [[-1,0,0,0],[1,0,1,0],[-1,-1,0,1],[1,0,1,0],[1,-1,1,1],[-1,-1,0,1]]){positions.push(x*c,y,x*s);uvs.push(u,v);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{clock:{value:0},power:{value:1},padPlume:{value:0},spool:{value:1},padGround:{value:0}},vertexShader:`varying vec2 plumeUV; varying float worldHeight; uniform float clock; uniform float power;
 void main(){plumeUV=uv;vec3 p=position;p.xz*=1.6;p.y*=9.5*power;worldHeight=(modelMatrix*vec4(p,1.)).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`precision highp float;varying vec2 plumeUV;uniform float clock;uniform float power;uniform float padPlume;uniform float spool;uniform float padGround;varying float worldHeight;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){float y=plumeUV.y;float n=noise(vec2(plumeUV.x*12.,y*23.-clock*16.));float coarse=noise(vec2(plumeUV.x*5.,y*8.-clock*7.));
 float width=mix(.30,.80,smoothstep(0.,.22,y))*(1.-.72*pow(y,1.8));width*=.83+.22*coarse;
 float x=abs(plumeUV.x-.5)*2.;float edge=1.-smoothstep(width*.35,width,x);float tail=pow(1.-smoothstep(.52,1.,y),1.4);
 float core=exp(-x*x/max(.003,width*width*.14))*(1.-smoothstep(.2,.86,y));float cells=.96+.04*cos(y*43.-.9*sin(clock*12.));
 vec3 amber=mix(vec3(1.,.17,.025),vec3(1.,.63,.20),coarse);vec3 color=mix(amber,vec3(.76,.88,1.),exp(-y*18.));color=mix(color,vec3(1.,.97,.80),core*.88);
 float alpha=edge*tail*(.18+.30*n+.26*core)*cells*smoothstep(0.,.018,y);
 if(padPlume>.5){
  float lane=plumeUV.x-.5+(coarse-.5)*.12*smoothstep(.08,.85,y);
  float envelope=mix(.14,.45,smoothstep(0.,.58,y))*(1.-.56*smoothstep(.60,1.,y));
  float shear=noise(vec2(plumeUV.x*13.,y*26.-clock*17.));
  float fringe=1.-smoothstep(envelope*.34,envelope*1.19,abs(lane));
  float shock=pow(.5+.5*cos(y*69.-y*y*21. + .28*sin(clock*19.)),3.);
  float hot=exp(-pow(abs(lane)/max(.018,envelope*(.36+.16*shock)),2.))*
   (1.-smoothstep(.34,.92,y));
  float end=pow(1.-smoothstep(.35,.96,y+(shear-.5)*.14),1.3);
  vec3 amber=mix(vec3(1.,.13,.035),vec3(1.,.55,.15),shear);
  color=mix(amber,vec3(1.,.96,.77),hot);
  color=mix(color,vec3(.68,.84,1.),exp(-y*46.)*.72);
  float clearance=worldHeight-padGround;
  // The hot jet loses definition before it reaches the illustrated floor.
  float verticalJet=smoothstep(0.,5.,clearance);
  alpha=(fringe*(.16+.33*shear)+hot*(.28+.25*shock))*end*
   smoothstep(0.,.015,y)*spool*verticalJet;
 }
 gl_FragColor=vec4(color,alpha*power);}`});
 const flame=new T.Mesh(geometry,material);flame.frustumCulled=false;const group=new T.Group();group.name='EngineExhaust';group.add(flame);group.visible=false;
 return{group,flame,update(time,spool=null,ground=0){material.uniforms.clock.value=time;material.uniforms.power.value=.96+.04*Math.sin(time*23.);material.uniforms.padPlume.value=spool===null?0:1;material.uniforms.spool.value=spool??1;material.uniforms.padGround.value=ground;},reset(){group.visible=false;material.uniforms.clock.value=0;},dispose(){geometry.dispose();material.dispose();}};
}

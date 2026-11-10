// Shared display geometry: the surface is the shader's half-alpha contour.
export const BOB_SIZE=70;
export const BOB_RADIUS=BOB_SIZE/2.1*Math.sqrt(.9875);
import {createGL} from './gl-core.js';
import {rgb} from './lighting.js';
const vertex=`attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.,1.);}`;
const fragment=`precision highp float;
uniform vec2 resolution;
uniform vec3 highColor,rimColor,ambientColor;
uniform float highStrength,highRange,rimStrength,ambientStrength;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec2 p=(gl_FragCoord.xy/resolution-.5)*2.1;
 float r2=dot(p,p);if(r2>1.){gl_FragColor=vec4(0.);return;}
 vec3 n=vec3(p,sqrt(max(0.,1.-r2))),light=normalize(vec3(.64,.48,.6));
 float nl=max(dot(n,light),0.),nv=max(n.z,.001);
 vec3 h=normalize(light+vec3(0.,0.,1.));
 // Hand-painted brush noise: fine grain plus a broad mottle, screen-space.
 float grain=hash(gl_FragCoord.xy)-.5;
 float mottle=hash(floor(gl_FragCoord.xy*.13)+7.3)-.5;
 // Light silver base with the brush variation retained.
 vec3 silver=vec3(.80,.82,.85);
 vec3 base=silver*(1.+grain*.05+mottle*.08);
 // Environment reflection (bright sky above, darker ground below) reads as metal.
 float env=clamp(n.y*.5+.5,0.,1.);
 vec3 refl=mix(vec3(.30,.34,.42),vec3(.96,.98,1.),env);
 // Fresnel grazing reflectivity and a sharp specular highlight.
 float fres=0.04+0.96*pow(1.-nv,5.);
 float spec=pow(max(dot(n,h),0.),mix(140.,60.,clamp(highRange/2.,0.,1.)));
 vec3 color=base*(ambientColor*ambientStrength);
 color+=refl*.85;
 color+=highColor*spec*1.8*highStrength;
 color+=rimColor*fres*(1.-nl)*rimStrength;
 float cover=1.-smoothstep(.975,1.,r2);
 gl_FragColor=vec4(color*cover,cover);
}`;
export function createBobRenderer(canvas){
 const r=createGL(canvas,fragment,vertex);if(!r)throw Error('WebGL unavailable');
 const {gl,program}=r,u={};for(const n of ['resolution','highColor','rimColor','ambientColor','highStrength','highRange','rimStrength','ambientStrength'])u[n]=gl.getUniformLocation(program,n);
 return {draw(l){gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(u.resolution,canvas.width,canvas.height);for(const [a,b] of [['highColor','highlightColor'],['rimColor','rimColor'],['ambientColor','ambientColor']])gl.uniform3fv(u[a],rgb(l[b]));for(const [a,b] of [['highStrength','highlightStrength'],['highRange','highlightRange'],['rimStrength','rimStrength'],['ambientStrength','ambientStrength']])gl.uniform1f(u[a],l[b]);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);}};
}

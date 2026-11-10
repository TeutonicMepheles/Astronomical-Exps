// White graticule globe (Eratosthenes-style "白色地球仪"): light sphere with
// grey lat/lon grid lines and single-side lighting. No texture/grain pass.
// Adapted from EXP-04 renderer-wireframe.js (2026-11-05); no runtime dependency.
import { createGL } from './gl-core.js';

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;

const FRAG = `#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 u_res,u_center;uniform float u_radius;
uniform vec3 u_axis,u_e2,u_e3,u_sun;uniform float u_debug;
const float PI=3.14159265359;const float STEP=0.26179938779;
void main(){
 vec2 p=(gl_FragCoord.xy-u_center)/u_radius;
 float r2=dot(p,p);float aa=fwidth(r2)*1.2;
 float cover=1.0-smoothstep(1.0-aa,1.0,r2);
 if(cover<=0.002)discard;
 float z=sqrt(max(0.0,1.0-r2));vec3 n=vec3(p,z);
 float qa=dot(n,u_axis);float qx=dot(n,u_e2);float qz=dot(n,u_e3);
 float lat=asin(clamp(qa,-1.0,1.0));float lon=atan(qz,qx);
 float cosLat=length(vec2(qx,qz));
 float pxAng=1.0/(u_radius*max(z,0.06));
 float la=lat/STEP;float lb=abs(fract(la+0.5)-0.5);
 float latW=clamp(pxAng/STEP,1e-4,0.45);
 float latLine=1.0-smoothstep(latW*0.45,latW,lb);
 float lo=lon/STEP;float lob=abs(fract(lo+0.5)-0.5);
 float lonW=clamp(pxAng/(STEP*max(cosLat,0.10)),1e-4,0.45);
 float lonLine=1.0-smoothstep(lonW*0.45,lonW,lob);
 lonLine*=smoothstep(0.045,0.22,cosLat);
 float grid=max(latLine,lonLine);
 float ndl=dot(normalize(n),u_sun);
 float lit=smoothstep(-0.70,0.95,ndl);
 vec3 base=mix(vec3(0.847,0.863,0.886),vec3(0.957,0.961,0.969),lit);
 vec3 gcol=mix(vec3(0.565,0.532,0.540),vec3(0.700,0.655,0.668),lit);
 vec3 col=mix(base,gcol,grid*0.86);
 float rim=smoothstep(0.94,1.0,sqrt(r2));
 col=mix(col,vec3(0.741,0.773,0.820),rim*0.22);
 if(u_debug>1.5&&u_debug<2.5){gl_FragColor=vec4(vec3(lat/PI+0.5),1.0);return;}
 if(u_debug>2.5&&u_debug<3.5){gl_FragColor=vec4(vec3(lon/PI*0.5+0.5),1.0);return;}
 if(u_debug>0.5){gl_FragColor=vec4(vec3(grid),1.0);return;}
 gl_FragColor=vec4(col*cover,cover);
}`;

export function createWireframeRenderer(){
  let gl=null,program=null,u={};
  return {
    init(canvas){
      try{
        const r=createGL(canvas,FRAG,VERT);if(!r)return false;
        gl=r.gl;program=r.program;
        for(const name of ['u_res','u_center','u_radius','u_axis','u_e2','u_e3','u_sun','u_debug'])u[name]=gl.getUniformLocation(program,name);
        return true;
      }catch(err){console.error(err);return false;}
    },
    gl:()=>gl,
    resize(w,h){if(gl)gl.viewport(0,0,w,h);},
    draw(scene){
      if(!gl)return;
      const size=scene.sizePx;const{axis,e2,e3}=scene.basis;
      gl.uniform2f(u.u_res,size,size);
      const zoom=scene.zoom||1,f=scene.focus;
      const ppl=scene.pxPerLogical||(size/(202*2*1.42));
      const dx=(f.x-781)*zoom*ppl,dy=(f.y-324)*zoom*ppl;
      gl.uniform2f(u.u_center,size/2-dx,size/2+dy);
      gl.uniform1f(u.u_radius,202*zoom*ppl);
      gl.uniform3f(u.u_axis,axis[0],axis[1],axis[2]);
      gl.uniform3f(u.u_e2,e2[0],e2[1],e2[2]);
      gl.uniform3f(u.u_e3,e3[0],e3[1],e3[2]);
      gl.uniform3f(u.u_sun,scene.sun[0],scene.sun[1],scene.sun[2]);
      gl.uniform1f(u.u_debug,scene.debug||0);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES,0,3);
    },
  };
}

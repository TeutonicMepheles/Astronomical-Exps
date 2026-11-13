// Analytic receiver-sphere field: shade and both contours share the cone's map.
// A single bounded WebGL target serves the stage and the optional detail lens.
let instances=0;
export function createShadowSurface(){
 const id=++instances;let draws=0,disposed=false;
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
 if(!gl)throw new Error('Shadow surface requires WebGL');
 // Keep thin contour compositing stable across otherwise identical frames.
 gl.disable(gl.DITHER);
 const derivatives=gl.getExtension('OES_standard_derivatives');
 function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;}
 const vs=compile(gl.VERTEX_SHADER,'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}');
 const fs=compile(gl.FRAGMENT_SHADER,`${derivatives?'#extension GL_OES_standard_derivatives : enable\n':''}
 precision highp float;
 uniform vec2 viewport,flags,slopes,intercepts;uniform float dpr,sourceRadius,sunRadius,lunar;
 uniform vec4 sphere;uniform vec3 sourceCam,sourceModel,sun,axis;uniform mat3 inverseMap,forwardMap;
 const float PI=3.141592653589793;
 float widthOf(float value){return ${derivatives?'max(fwidth(value),.000001)':'max(sourceRadius/max(sphere.w,1.),.000001)'};}
 float overlap(float a,float b,float d){
  if(d>=a+b)return 0.;if(d<=abs(a-b)){float r=min(a,b);return PI*r*r;}
  float x=(d*d+a*a-b*b)/(2.*d),h=sqrt(max(0.,a*a-x*x)),y=d-x;
  return a*a*acos(clamp(x/a,-1.,1.))-x*h+b*b*acos(clamp(y/b,-1.,1.))-y*h;
 }
 float visibility(vec3 p){
  vec3 os=sourceModel-p,ss=sun-p;float distanceO=length(os);if(distanceO<=sourceRadius)return 0.;
  float a=asin(clamp(sunRadius/length(ss),0.,1.)),b=asin(clamp(sourceRadius/distanceO,0.,1.)),d=acos(clamp(dot(normalize(ss),normalize(os)),-1.,1.));
  return clamp(1.-overlap(a,b,d)/max(PI*a*a,.000000001),0.,1.);
 }
 vec4 over(vec4 base,vec3 color,float a){return vec4(color*a+base.rgb*(1.-a),a+base.a*(1.-a));}
 vec4 boundary(vec4 base,float field,vec3 color,float enabled){
  float distance=abs(field)/widthOf(field),core=1.-smoothstep(.6*dpr,1.15*dpr,distance),halo=exp(-distance*distance/(12.*dpr*dpr))*.24;
  base=over(base,vec3(.015,.025,.04),(1.-smoothstep(1.2*dpr,2.1*dpr,distance))*.6*enabled);
  return over(base,color,max(core*.98,halo)*enabled);
 }
 void main(){
  vec2 pixel=vec2(gl_FragCoord.x/dpr,viewport.y-gl_FragCoord.y/dpr),q=(pixel-sphere.xy)/sphere.w;float rr=1.-dot(q,q);if(rr<0.)discard;
  vec3 normal=vec3(q,sqrt(rr)),cameraPoint=vec3(pixel,sphere.z+normal.z*sphere.w),p=sourceModel+inverseMap*(cameraPoint-sourceCam),relative=p-sourceModel;
  float t=dot(relative,axis);if(t<=0.)discard;
  vec3 radial=relative-axis*t;float rho=length(radial),ru=intercepts.x+slopes.x*t,rp=intercepts.y+slopes.y*t;
  vec3 radialUnit=radial/max(rho,.0000001),umbraRay=forwardMap*(axis+radialUnit*slopes.x),penumbraRay=forwardMap*(axis+radialUnit*slopes.y);
  float incoming=dot(normal,cameraPoint-(sourceCam+forwardMap*(sun-sourceModel)))<0.?1.:0.;
  float visible=visibility(p);float shade=(1.-visible)*(lunar>.5?.82:.96)*flags.x*incoming;
  vec4 result=vec4((lunar>.5?mix(vec3(.015,.023,.035),vec3(.37,.16,.10),1.-smoothstep(-widthOf(rho-ru),0.,rho-ru)):vec3(.012,.023,.047))*shade,shade);
  if(flags.y>.5){
   result=boundary(result,rho-rp,vec3(.64,.9,.98),dot(normal,penumbraRay)<0.?1.:0.);
   result=boundary(result,rho-max(ru,0.),vec3(1.,.79,.40),ru>0.&&dot(normal,umbraRay)<0.?1.:0.);
   vec3 antumbraRay=forwardMap*(axis-radialUnit*slopes.x);
   result=boundary(result,rho+ru,vec3(.83,.68,1.),ru<0.&&dot(normal,antumbraRay)<0.?1.:0.);
  }
  gl_FragColor=result;
 }`);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer(),attribute=gl.getAttribLocation(program,'position'),uniform=Object.fromEntries(['viewport','flags','slopes','intercepts','dpr','sourceRadius','sunRadius','lunar','sphere','sourceCam','sourceModel','sun','axis','inverseMap','forwardMap'].map(name=>[name,gl.getUniformLocation(program,name)]));
 return {draw(ctx,{layout,center,radius,model,mode,width=1600,height=900,dpr=1,shade=true,edges=true}){
  if(disposed)throw new Error('Shadow surface is disposed');draws++;
  const W=1600*dpr,H=900*dpr;if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  gl.viewport(0,0,width*dpr,height*dpr);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.BLEND);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const x0=(center.x-radius-8)/width*2-1,x1=(center.x+radius+8)/width*2-1,y0=1-(center.y-radius-8)/height*2,y1=1-(center.y+radius+8)/height*2;
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([x0,y0,x1,y0,x1,y1,x0,y0,x1,y1,x0,y1]),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  const xyz=p=>[p.x,p.y,p.z||0],r=layout.cone.umbraRadiusAt(0),rp=layout.cone.penumbraRadiusAt(0);
  gl.uniform2f(uniform.viewport,width,height);gl.uniform2f(uniform.flags,shade?1:0,edges?1:0);gl.uniform2f(uniform.slopes,layout.cone.umbraRadiusAt(1)-r,layout.cone.penumbraRadiusAt(1)-rp);gl.uniform2f(uniform.intercepts,r,rp);gl.uniform1f(uniform.dpr,dpr);gl.uniform1f(uniform.sourceRadius,layout.cone.sourceRadius||r);gl.uniform1f(uniform.sunRadius,model.SUN_R);gl.uniform1f(uniform.lunar,mode==='lunar'?1:0);gl.uniform4f(uniform.sphere,center.x,center.y,center.depth,radius);
  gl.uniform3f(uniform.sourceCam,layout.sourceScreen.x,layout.sourceScreen.y,layout.sourceScreen.depth);gl.uniform3f(uniform.sourceModel,...xyz(layout.origin));gl.uniform3f(uniform.sun,...xyz(model.SUN));gl.uniform3f(uniform.axis,...xyz(layout.cone.axis));gl.uniformMatrix3fv(uniform.inverseMap,false,new Float32Array(layout.cameraToModel));gl.uniformMatrix3fv(uniform.forwardMap,false,new Float32Array(layout.modelToCamera));
  gl.drawArrays(gl.TRIANGLES,0,6);ctx.drawImage(canvas,0,H-height*dpr,width*dpr,height*dpr,0,0,width,height);
 },getStats(){return {id,draws,disposed,buffers:disposed?0:1,programs:disposed?0:1};},dispose(){disposed=true;gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.width=canvas.height=1;}};
}

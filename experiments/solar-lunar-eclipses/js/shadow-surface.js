// Analytic receiver-sphere field: shade and both contours share the cone's map.
// A single bounded WebGL target serves the stage and the optional detail lens.
let instances=0;
export function createShadowSurface(){
 const id=++instances;let draws=0,sweepUploads=0,disposed=false;
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
 if(!gl)throw new Error('Shadow surface requires WebGL');
 // Keep thin contour compositing stable across otherwise identical frames.
 gl.disable(gl.DITHER);
 const derivatives=gl.getExtension('OES_standard_derivatives');
 function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;}
 const vs=compile(gl.VERTEX_SHADER,'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}');
 const fs=compile(gl.FRAGMENT_SHADER,`${derivatives?'#extension GL_OES_standard_derivatives : enable\n':''}
 precision highp float;
 uniform float diagnosticMode;uniform sampler2D sweepMap;uniform float sweepEnabled;uniform vec3 groundAxis,groundE2,groundE3;uniform vec2 viewport,flags,slopes,intercepts;uniform float dpr,sourceRadius,sunRadius,lunar,lunarAppearance;
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
  vec3 toSun=sun-p,toMoon=sourceModel-p;float sunAngle=asin(clamp(sunRadius/length(toSun),0.,1.)),moonAngle=asin(clamp(sourceRadius/length(toMoon),0.,1.)),separation=acos(clamp(dot(normalize(toSun),normalize(toMoon)),-1.,1.));
  float outerContact=separation-sunAngle-moonAngle,innerContact=separation-abs(moonAngle-sunAngle);
  float visible=visibility(p);if(diagnosticMode>.5&&diagnosticMode<1.5){float category=outerContact>=0.?0.:innerContact>0.?1.:moonAngle>=sunAngle?2.:3.;gl_FragColor=vec4(category/3.,visible,0.,1.);return;}
  // Appearance-only transmission for the ground window. Colors are an artistic
  // approximation of atmospheric light, not measured photometry or a forecast.
  // Multiplication preserves maria/crater texture instead of painting over it.
  if(lunarAppearance>.5){
   float depth=clamp((ru-rho)/max(sourceRadius*.85,.000001),0.,1.);
   vec3 indirect=mix(vec3(.65,.28,.12),vec3(.14,.028,.018),smoothstep(0.,1.,depth));
   float blocked=1.-visible;
   vec3 transmission=vec3(pow(visible,.72))+indirect*pow(blocked,3.)*smoothstep(-.08,.12,(ru-rho)/sourceRadius);
   gl_FragColor=vec4(mix(vec3(1.),clamp(transmission,0.,1.),flags.x*incoming),1.);
   return;
  }
  float shade=(1.-visible)*(lunar>.5?.82:.96)*flags.x*incoming;
  vec4 coverage=vec4(0.);if(sweepEnabled>.5){vec3 unitPoint=normalize(p);vec2 uv=vec2(atan(dot(unitPoint,groundE3),dot(unitPoint,groundE2))/(2.*PI)+.5,asin(clamp(dot(unitPoint,groundAxis),-1.,1.))/PI+.5);vec2 field=texture2D(sweepMap,uv).rg;if(diagnosticMode>1.5){gl_FragColor=vec4(field.g>.5?1.:field.r>.5?.5:0.,0.,0.,1.);return;}float hatch=step(.57,fract((uv.x+uv.y)*100.));coverage=field.g>.5?vec4(vec3(.96,.57,.22)*(.38+.18*hatch),.38+.18*hatch):field.r>.5?vec4(vec3(.16,.74,.77)*.30,.30):vec4(0.);}
  vec4 result=vec4((lunar>.5?mix(vec3(.015,.023,.035),vec3(.37,.16,.10),1.-smoothstep(-widthOf(rho-ru),0.,rho-ru)):vec3(.012,.023,.047))*shade,shade);
  if(lunar>.5&&lunarAppearance<.5){
   float penumbraOnly=smoothstep(-widthOf(rho-ru),widthOf(rho-ru),rho-ru);
   result=over(result,vec3(.10,.42,.55),.18*(1.-visible)*penumbraOnly*flags.x*incoming);
  }
  coverage*=outerContact<0.&&innerContact<=0.?.12:mix(.12,1.,smoothstep(0.,.5,visible));
  result=vec4(coverage.rgb+result.rgb*(1.-coverage.a),coverage.a+result.a*(1.-coverage.a));
  if(flags.y>.5){
   if(lunar<.5){
    result=boundary(result,outerContact,vec3(.64,.9,.98),incoming);
    result=boundary(result,innerContact,moonAngle>=sunAngle?vec3(1.,.79,.40):vec3(.83,.68,1.),outerContact<0.?incoming:0.);
   }else{
    // Thin continuous contour: no hard dash ends on the small lunar disc.
    float facing=dot(normal,penumbraRay),facingAA=widthOf(facing);
    result=boundary(result,rho-rp,vec3(.45,.9,1.),1.-smoothstep(-facingAA,facingAA,facing));
    result=boundary(result,rho-max(ru,0.),vec3(1.,.79,.40),ru>0.&&dot(normal,umbraRay)<0.?1.:0.);
   }
  }
  gl_FragColor=result;
 }`);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer(),attribute=gl.getAttribLocation(program,'position'),uniform=Object.fromEntries(['diagnosticMode','sweepMap','sweepEnabled','groundAxis','groundE2','groundE3','viewport','flags','slopes','intercepts','dpr','sourceRadius','sunRadius','lunar','lunarAppearance','sphere','sourceCam','sourceModel','sun','axis','inverseMap','forwardMap'].map(name=>[name,gl.getUniformLocation(program,name)]));
 const sweepTexture=gl.createTexture();let sweepSource=null;
 gl.bindTexture(gl.TEXTURE_2D,sweepTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
 return {draw(ctx,{layout,center,radius,model,mode,width=1600,height=900,dpr=1,shade=true,edges=true,sweep,basis,lunarAppearance=false}){
  if(disposed)throw new Error('Shadow surface is disposed');draws++;
  const W=1600*dpr,H=900*dpr;if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  gl.viewport(0,0,width*dpr,height*dpr);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.BLEND);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const x0=(center.x-radius-8)/width*2-1,x1=(center.x+radius+8)/width*2-1,y0=1-(center.y-radius-8)/height*2,y1=1-(center.y+radius+8)/height*2;
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([x0,y0,x1,y0,x1,y1,x0,y0,x1,y1,x0,y1]),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  const xyz=p=>[p.x,p.y,p.z||0],r=layout.cone.umbraRadiusAt(0),rp=layout.cone.penumbraRadiusAt(0);
  gl.uniform2f(uniform.viewport,width,height);gl.uniform2f(uniform.flags,shade?1:0,edges?1:0);gl.uniform2f(uniform.slopes,layout.cone.umbraRadiusAt(1)-r,layout.cone.penumbraRadiusAt(1)-rp);gl.uniform2f(uniform.intercepts,r,rp);gl.uniform1f(uniform.dpr,dpr);gl.uniform1f(uniform.sourceRadius,layout.cone.sourceRadius||r);gl.uniform1f(uniform.sunRadius,model.SUN_R);gl.uniform1f(uniform.lunar,mode==='lunar'?1:0);gl.uniform1f(uniform.lunarAppearance,mode==='lunar'&&lunarAppearance?1:0);gl.uniform4f(uniform.sphere,center.x,center.y,center.depth,radius);
  gl.uniform3f(uniform.sourceCam,layout.sourceScreen.x,layout.sourceScreen.y,layout.sourceScreen.depth);gl.uniform3f(uniform.sourceModel,...xyz(layout.origin));gl.uniform3f(uniform.sun,...xyz(model.SUN));gl.uniform3f(uniform.axis,...xyz(layout.cone.axis));gl.uniformMatrix3fv(uniform.inverseMap,false,new Float32Array(layout.cameraToModel));gl.uniformMatrix3fv(uniform.forwardMap,false,new Float32Array(layout.modelToCamera));
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sweepTexture);gl.uniform1i(uniform.sweepMap,0);gl.uniform1f(uniform.sweepEnabled,sweep&&basis?1:0);
  if(sweep&&basis){if(sweepSource!==sweep){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,sweep.width,sweep.height,0,gl.RGBA,gl.UNSIGNED_BYTE,sweep.pixels);sweepSource=sweep;sweepUploads++;}gl.uniform3fv(uniform.groundAxis,basis.axis);gl.uniform3fv(uniform.groundE2,basis.e2);gl.uniform3fv(uniform.groundE3,basis.e3);}
  gl.uniform1f(uniform.diagnosticMode,0);gl.drawArrays(gl.TRIANGLES,0,6);ctx.save();if(mode==='lunar'&&lunarAppearance)ctx.globalCompositeOperation='multiply';ctx.drawImage(canvas,0,H-height*dpr,width*dpr,height*dpr,0,0,width,height);ctx.restore();
 },sampleProjected(points,dpr=1,diagnostic=1){
  gl.uniform1f(uniform.diagnosticMode,diagnostic);gl.drawArrays(gl.TRIANGLES,0,6);const results=points.map(p=>{const pixel=new Uint8Array(4);gl.readPixels(Math.floor(p.x*dpr),canvas.height-1-Math.floor(p.y*dpr),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return {category:Math.round(pixel[0]/255*(diagnostic===2?2:3)),visibility:pixel[1]/255,alpha:pixel[3]};});gl.uniform1f(uniform.diagnosticMode,0);return results;
 },getStats(){return {id,draws,disposed,sweepUploads,sweepBytes:sweepSource?sweepSource.pixels.byteLength:0,buffers:disposed?0:1,programs:disposed?0:1};},dispose(){disposed=true;sweepSource=null;gl.deleteTexture(sweepTexture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.width=canvas.height=1;}};
}

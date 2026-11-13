import {conePoint} from './shadow-geometry.mjs';

// Native WebGL triangle surfaces, with smooth radial normals and MSAA.
// Uses the host's camera/display mapping, and adds no animation clock.
export function createShadowVolume(){
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
 if(!gl)throw new Error('Shadow cones require WebGL');
 // Keep thin contour compositing stable across otherwise identical frames.
 gl.disable(gl.DITHER);
 let draws=0,lastSections=[];
 const derivatives=gl.getExtension('OES_standard_derivatives');
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 const vs=shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute float facing;attribute vec3 world;attribute vec3 raySource;varying vec3 rayStart;varying vec3 worldPoint;varying float shade;varying float depth;void main(){gl_Position=vec4(position,1.);rayStart=raySource;worldPoint=world;shade=facing;depth=position.z*10000.;}`);
 const fs=shader(gl.FRAGMENT_SHADER,`${derivatives?'#extension GL_OES_standard_derivatives : enable\n':''}precision highp float;varying vec3 rayStart;uniform vec4 cameraReceiver;uniform vec3 sourceMask;varying vec3 worldPoint;uniform vec4 receiver;uniform vec3 coneOrigin;uniform vec3 coneAxis;uniform vec2 coneShape;uniform vec2 endFade;varying float shade;varying float depth;uniform vec4 bodies[2];uniform float dpr;uniform vec4 tint;uniform vec3 edgeTint;uniform mat3 normalMap;uniform float analyticNormal;uniform float outline;void main(){if(outline>.5){float y=shade;float halo=exp(-y*y*9.)*.18+exp(-y*y*38.)*.24;float core=exp(-y*y*550.)*.65;gl_FragColor=vec4(tint.rgb,(halo+core)*tint.a);}else{if(receiver.w>0.&&cameraReceiver.w<=0.){vec3 relative=worldPoint-coneOrigin;float t=dot(relative,coneAxis);vec3 radial=relative-coneAxis*t;float radialLength=length(radial);if(radialLength>0.000001){radial/=radialLength;vec3 a=coneOrigin+radial*coneShape.x-receiver.xyz;vec3 b=coneAxis+radial*coneShape.y;float A=dot(b,b);vec3 perpendicular=cross(a,b);float clearance=receiver.w*receiver.w-dot(perpendicular,perpendicular)/A;if(clearance>=0.){float entry=-dot(a,b)/A-sqrt(clearance/A);if(entry>=0.&&t>entry+.00001)discard;}}}vec2 pixel=vec2(gl_FragCoord.x/dpr,900.-gl_FragCoord.y/dpr);if(sourceMask.z>0.&&distance(pixel,sourceMask.xy)<sourceMask.z+.15)discard;if(cameraReceiver.w>0.){vec3 a=rayStart-cameraReceiver.xyz;vec3 b=vec3(pixel,depth)-rayStart;float A=dot(b,b);if(A>.00001){vec3 crossAB=cross(a,b);float clearance=cameraReceiver.w*cameraReceiver.w-dot(crossAB,crossAB)/A;if(clearance>=0.){float first=-dot(a,b)/A-sqrt(clearance/A);if(first>=0.&&first<.99999)discard;}}}for(int i=0;i<2;i++){vec2 delta=pixel-bodies[i].xy;float rr=bodies[i].w*bodies[i].w-dot(delta,delta);if(rr>0.&&depth<bodies[i].z+sqrt(rr)+.05)discard;}float facingValue=shade;if(analyticNormal>.5){vec3 relative=worldPoint-coneOrigin;vec3 radial=relative-coneAxis*dot(relative,coneAxis);vec3 normal=normalize(normalMap*(radial/max(length(radial),.000001)-coneAxis*coneShape.y));facingValue=normal.z;}float rim=pow(1.-abs(facingValue),3.);float fade=1.-smoothstep(endFade.x,endFade.y,dot(worldPoint-coneOrigin,coneAxis));float width=${derivatives?'max(fwidth(facingValue),.00001)':'0.015'};float edge=exp(-pow(abs(facingValue)/width/1.3,2.))*.82;float alpha=(tint.a*(.65+.35*rim)+edge*(1.-tint.a))*fade;vec3 color=mix(tint.rgb*(.72+.28*abs(facingValue)),edgeTint,edge);gl_FragColor=vec4(color,alpha);}}`);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
 const axialSegments=32,radialSegments=192,meshData=new Float32Array(axialSegments*radialSegments*6*10);
 const buffer=gl.createBuffer(),position=gl.getAttribLocation(program,'position'),facing=gl.getAttribLocation(program,'facing'),tint=gl.getUniformLocation(program,'tint'),outline=gl.getUniformLocation(program,'outline'),bodiesUniform=gl.getUniformLocation(program,'bodies[0]'),dprUniform=gl.getUniformLocation(program,'dpr'),world=gl.getAttribLocation(program,'world'),receiverUniform=gl.getUniformLocation(program,'receiver'),originUniform=gl.getUniformLocation(program,'coneOrigin'),axisUniform=gl.getUniformLocation(program,'coneAxis'),shapeUniform=gl.getUniformLocation(program,'coneShape'),endFadeUniform=gl.getUniformLocation(program,'endFade'),raySource=gl.getAttribLocation(program,'raySource'),cameraReceiverUniform=gl.getUniformLocation(program,'cameraReceiver'),edgeTintUniform=gl.getUniformLocation(program,'edgeTint'),sourceMaskUniform=gl.getUniformLocation(program,'sourceMask'),normalMapUniform=gl.getUniformLocation(program,'normalMap'),analyticNormalUniform=gl.getUniformLocation(program,'analyticNormal');
 return {draw(ctx,{origin,cone,length,project,projectGenerator,normalForGenerator,vector,dpr,bodies,receiver,clipReceiver,sourceBody,layout,meshMode='subdivided'}){
  draws++;const axialSegments=meshMode==='cone'?1:32;
  const w=1600*dpr,h=900*dpr;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.uniform1f(analyticNormalUniform,meshMode==='cone'&&layout?1:0);if(layout){const m=layout.cameraToModel;gl.uniformMatrix3fv(normalMapUniform,false,new Float32Array([m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]]));}
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,3,gl.FLOAT,false,40,0);gl.enableVertexAttribArray(facing);gl.vertexAttribPointer(facing,1,gl.FLOAT,false,40,12);gl.enableVertexAttribArray(world);gl.vertexAttribPointer(world,3,gl.FLOAT,false,40,16);gl.enableVertexAttribArray(raySource);gl.vertexAttribPointer(raySource,3,gl.FLOAT,false,40,28);
  gl.uniform3f(sourceMaskUniform,sourceBody?.x||0,sourceBody?.y||0,sourceBody?.r||0);gl.uniform1f(outline,0);gl.uniform1f(dprUniform,dpr);gl.uniform4fv(bodiesUniform,new Float32Array(bodies.flatMap(b=>[b.x,b.y,b.depth,b.r])));gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform4f(cameraReceiverUniform,clipReceiver?.x||0,clipReceiver?.y||0,clipReceiver?.depth||0,clipReceiver?.r||0);
  gl.uniform4f(receiverUniform,receiver?.center.x||0,receiver?.center.y||0,receiver?.center.z||0,receiver?.radius||0);gl.uniform3f(originUniform,origin.x,origin.y,origin.z||0);gl.uniform3f(axisUniform,cone.axis.x,cone.axis.y,cone.axis.z||0);
  const sections=[{type:'penumbra',r:cone.penumbraRadiusAt(0),s:cone.penumbraRadiusAt(1)-cone.penumbraRadiusAt(0),start:0,end:length},{type:'umbra',r:cone.umbraRadiusAt(0),s:cone.umbraRadiusAt(1)-cone.umbraRadiusAt(0),start:0,end:Math.min(length,cone.umbraLength)}];
  if(length>cone.umbraLength)sections.push({type:'antumbra',r:-cone.umbraRadiusAt(0),s:cone.umbraRadiusAt(0)/cone.umbraLength,start:cone.umbraLength,end:length});
  lastSections=sections.map(s=>s.type);
  for(const section of sections){
   const penumbra=section.type==='penumbra',antumbra=section.type==='antumbra',radius=section.r,slope=section.s,start=section.start,end=section.end,vertices=meshData.subarray(0,axialSegments*radialSegments*6*10);
   gl.uniform3f(edgeTintUniform,...(penumbra?[.62,.88,.96]:antumbra?[.83,.68,1]:[1,.78,.39]));gl.uniform2f(shapeUniform,radius,slope);gl.uniform2f(endFadeUniform,penumbra||antumbra||end<cone.umbraLength?end*.82:end+.01,penumbra||antumbra||end<cone.umbraLength?end+1e-5:end+1);
   // Keep every generator continuous; sphere entry clipping happens per fragment.
   // Reusing the bounded upload array avoids six repeated roots/projections per triangle pair.
   const grid=Array.from({length:axialSegments+1},(_,j)=>Array.from({length:radialSegments+1},(_,i)=>{
    const t=start+j*(end-start)/axialSegments,a=i*Math.PI*2/radialSegments,point=conePoint(origin,cone.axis,radius,slope,t,a),p=projectGenerator?projectGenerator(t,a,radius,slope):project(point),normal=normalForGenerator?normalForGenerator(a,slope):vector({x:point.x-origin.x-cone.axis.x*t,y:point.y-origin.y-cone.axis.y*t,z:point.z-origin.z-cone.axis.z*t}),n=Math.hypot(...normal)||1;
    return [p.x/800-1,1-p.y/450,p.depth/10000,normal[2]/n,point.x,point.y,point.z,p.rayStart?.x||0,p.rayStart?.y||0,p.rayStart?.depth||0];
   }));
   let offset=0;for(let j=0;j<axialSegments;j++)for(let i=0;i<radialSegments;i++)for(const point of [grid[j][i],grid[j+1][i],grid[j+1][i+1],grid[j][i],grid[j+1][i+1],grid[j][i+1]]){vertices.set(point,offset);offset+=10;}
   gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
   gl.uniform4f(tint,...(penumbra?[.18,.24,.32,.09]:antumbra?[.17,.10,.26,.22]:[.012,.018,.028,.42]));gl.enable(gl.CULL_FACE);gl.cullFace(gl.FRONT);gl.drawArrays(gl.TRIANGLES,0,vertices.length/10);gl.cullFace(gl.BACK);gl.drawArrays(gl.TRIANGLES,0,vertices.length/10);gl.disable(gl.CULL_FACE);
  }
  ctx.drawImage(canvas,0,0,1600,900);
 },getStats(){return {draws,sections:lastSections,buffers:1,programs:1};},drawOutline(ctx,curves,color){
  gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.uniform1f(outline,1);
  const vertices=[],halfWidth=8;
  const put=(p,n,sign)=>vertices.push((p.x+n.x*sign*halfWidth)/800-1,1-(p.y+n.y*sign*halfWidth)/450,0,sign,0,0,0,0,0,0);
  for(const curve of curves)for(let i=1;i<curve.length;i++){
   const a=curve[i-1],b=curve[i];if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<1e-5)continue;
   const n={x:-dy/length,y:dx/length};put(a,n,-1);put(b,n,-1);put(b,n,1);put(a,n,-1);put(b,n,1);put(a,n,1);
  }
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);gl.uniform4f(tint,...color,1);gl.drawArrays(gl.TRIANGLES,0,vertices.length/10);ctx.drawImage(canvas,0,0,1600,900);
 },dispose(){gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.width=canvas.height=1;}};
}

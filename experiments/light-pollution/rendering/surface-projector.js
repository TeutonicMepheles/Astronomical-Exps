/* Inverse projective renderer shared by windows, screens and masks. */
window.createSurfaceProjector=function(){
 const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 // Projective homography maps texture coordinates to the same four corners used for hit testing.
 function homography(q){const rows=[];for(let i=0;i<4;i++){const u=[0,1,1,0][i],v=[0,0,1,1][i],[x,y]=q[i];rows.push([u,v,1,0,0,0,-u*x,-v*x,x],[0,0,0,u,v,1,-u*y,-v*y,y]);}for(let i=0;i<8;i++){let k=i;for(let j=i+1;j<8;j++)if(Math.abs(rows[j][i])>Math.abs(rows[k][i]))k=j;[rows[k],rows[i]]=[rows[i],rows[k]];const d=rows[i][i];for(let j=i;j<9;j++)rows[i][j]/=d;for(let k=0;k<8;k++)if(k!==i){const f=rows[k][i];for(let j=i;j<9;j++)rows[k][j]-=f*rows[i][j];}}return [...rows.map(r=>r[8]),1];}
 function meshWarp(texture,q){
  const x=Math.floor(Math.min(...q.map(p=>p[0]))),y=Math.floor(Math.min(...q.map(p=>p[1]))),w=Math.max(1,Math.ceil(Math.max(...q.map(p=>p[0])))-x),h=Math.max(1,Math.ceil(Math.max(...q.map(p=>p[1])))-y),out=make(w,h),c=out.getContext('2d'),m=homography(q.map(p=>[p[0]-x,p[1]-y])),[a,b,d,e,f,g,k,l,n]=m;
  const inv=[f*n-g*l,d*l-b*n,b*g-d*f,g*k-e*n,a*n-d*k,d*e-a*g,e*l-f*k,b*k-a*l,a*f-b*e],src=texture.getContext('2d').getImageData(0,0,texture.width,texture.height).data,dst=c.createImageData(w,h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const xx=i+.5,yy=j+.5,z=inv[6]*xx+inv[7]*yy+inv[8],u=(inv[0]*xx+inv[1]*yy+inv[2])/z,v=(inv[3]*xx+inv[4]*yy+inv[5])/z;if(u<0||v<0||u>=1||v>=1)continue;const sx=Math.min(texture.width-1,Math.floor(u*texture.width)),sy=Math.min(texture.height-1,Math.floor(v*texture.height)),s=(sy*texture.width+sx)*4,t=(j*w+i)*4;dst.data.set(src.subarray(s,s+4),t);}
  c.putImageData(dst,0,0);return {canvas:out,x,y};
 }
 // WebGL and the CPU fallback both use inverse projective sampling without triangle seams.
 const projector=make(1,1),gl=projector.getContext('webgl',{premultipliedAlpha:false,preserveDrawingBuffer:true});
 let program,textureHandle,position;const outputs=new Map();
 if(gl){
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision highp float;uniform sampler2D image;uniform mat3 inverseH;uniform vec2 size;uniform float antialias;vec4 samplePoint(vec2 point){vec3 p=inverseH*vec3(point,1.);vec2 uv=p.xy/p.z;if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return vec4(0.);vec4 c=texture2D(image,uv);return vec4(c.rgb*c.a,c.a);}void main(){vec2 point=vec2(gl_FragCoord.x,size.y-gl_FragCoord.y);vec4 c=vec4(0.);if(antialias>.5){for(int y=0;y<3;y++){for(int x=0;x<3;x++){c+=samplePoint(point+vec2(float(x)-1.,float(y)-1.)/3.);}}c/=9.;}else{c=samplePoint(point);}gl_FragColor=vec4(c.a>0.?c.rgb/c.a:vec3(0.),c.a);}'));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Perspective renderer unavailable');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  textureHandle=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,textureHandle);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 }
 function warp(texture,q,id,{antialias=false}={}){
  if(antialias&&(!gl||gl.isContextLost())){const span=Math.max(...[0,1].map(axis=>Math.max(...q.map(p=>p[axis]))-Math.min(...q.map(p=>p[axis])))),factor=Math.min(3,Math.max(1,2048/Math.max(1,span))),result=warp(texture,q.map(p=>p.map(v=>v*factor)),id? id+':aa-source':undefined),w=result.canvas.width/factor,h=result.canvas.height/factor;let out=id?outputs.get(id+':aa-output'):null;if(!out){out=make(Math.ceil(w),Math.ceil(h));if(id)outputs.set(id+':aa-output',out);}if(out.width!==Math.ceil(w))out.width=Math.ceil(w);if(out.height!==Math.ceil(h))out.height=Math.ceil(h);const c=out.getContext('2d');c.clearRect(0,0,out.width,out.height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(result.canvas,0,0,result.canvas.width,result.canvas.height,0,0,w,h);return {canvas:out,x:result.x/factor,y:result.y/factor};}
  if(!gl||gl.isContextLost())return meshWarp(texture,q);const x=Math.floor(Math.min(...q.map(p=>p[0]))),y=Math.floor(Math.min(...q.map(p=>p[1]))),w=Math.max(1,Math.ceil(Math.max(...q.map(p=>p[0])))-x),h=Math.max(1,Math.ceil(Math.max(...q.map(p=>p[1])))-y),m=homography(q.map(p=>[p[0]-x,p[1]-y])),[a,b,c,d,e,f,g,k,i]=m;
  const inv=[e*i-f*k,c*k-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*k-e*g,b*g-a*k,a*e-b*d];
  if(projector.width<w)projector.width=w;if(projector.height<h)projector.height=h;gl.viewport(0,0,w,h);gl.useProgram(program);gl.uniformMatrix3fv(gl.getUniformLocation(program,'inverseH'),false,new Float32Array([inv[0],inv[3],inv[6],inv[1],inv[4],inv[7],inv[2],inv[5],inv[8]]));gl.uniform2f(gl.getUniformLocation(program,'size'),w,h);gl.uniform1f(gl.getUniformLocation(program,'antialias'),antialias?1:0);gl.bindTexture(gl.TEXTURE_2D,textureHandle);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,texture);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);let out=id?outputs.get(id):null;if(!out){out=make(w,h);if(id)outputs.set(id,out);}if(out.width!==w)out.width=w;if(out.height!==h)out.height=h;const target=out.getContext('2d');target.clearRect(0,0,w,h);target.drawImage(projector,0,projector.height-h,w,h,0,0,w,h);return {canvas:out,x,y};
 }

 return {warp,destroy(){outputs.clear();if(gl)gl.getExtension('WEBGL_lose_context')?.loseContext();}};
};

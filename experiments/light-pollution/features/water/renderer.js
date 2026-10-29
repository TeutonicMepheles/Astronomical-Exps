/* Water-only texture advection. Geometry and alpha remain in layer coordinates. */
window.createWaterFlow=function(){
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{premultipliedAlpha:false});
 window.LightPollution?.trackGL(gl);
 if(!gl)return {render:()=>null};
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();
 gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0,1);}`));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D image;uniform vec2 size;uniform float time;uniform sampler2D reflected;uniform vec4 waterRect;uniform vec2 sceneSize;uniform float hasReflection;
 vec4 sampleFlow(float phase){float edge=smoothstep(0.,.15,uv.y)*smoothstep(0.,.12,1.-uv.y);vec2 offset=vec2(phase*48.,sin(uv.x*32.-time*.7)*.65*edge)/size;vec2 sampleUV=uv-offset;sampleUV.x=1.5/size.x+abs(sampleUV.x-1.5/size.x);return texture2D(image,clamp(sampleUV,vec2(1.5,.5)/size,1.-vec2(1.5,.5)/size));}
 // Sparse, tiny point glints drift with the water; slow pulses avoid harsh flashing.
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float glints(){
  vec2 p=(uv*size-vec2(time*3.,0.))/vec2(72.,13.);
  vec2 cell=floor(p),local=fract(p);float seed=hash(cell);
  vec2 center=vec2(.25+.5*hash(cell+7.),.3+.4*hash(cell+19.));
  vec2 delta=(local-center)*vec2(72.,13.)/vec2(1.8+.4*seed,1.35+.25*seed);
  float radius=dot(delta,delta);
  float core=exp(-radius*3.5);
  float halo=.18*exp(-radius*.5);
  float rays=.22*exp(-abs(delta.x)*7.-abs(delta.y)*1.8)+.16*exp(-abs(delta.y)*8.-abs(delta.x)*1.8);
  float shape=core+halo+rays;
  float pulse=pow(.5+.5*sin(time*.85+seed*6.283185),2.);
  float banks=smoothstep(.08,.3,uv.y)*smoothstep(0.,.2,1.-uv.y);
  return step(.82,seed)*shape*pulse*banks;
 }
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 vec3 reflection(){
  float depth=uv.y;
  vec2 drift=vec2(uv.x*size.x*.022-time*.12,depth*16.);
  float coarse=noise(drift),fine=noise(drift*vec2(2.3,2.7)+4.1);
  // Stretched noise produces independent brush fragments, without a shared row grid.
  vec2 waterPixel=vec2(waterRect.x+uv.x*waterRect.z-time*1.2,depth*size.y);
  float warp=(noise(waterPixel/vec2(85.,22.))-.5)*8.;
  vec2 brush=vec2(waterPixel.x/29.,(waterPixel.y+warp)/3.2);
  float flecks=noise(brush),detail=noise(brush*vec2(2.1,1.7)+13.);
  float ripple=(coarse-.5)*17.+sin(time*.7+uv.x*24.)*3.;
  vec2 pos=vec2(waterRect.x+uv.x*waterRect.z+ripple,waterRect.y-18.-depth*360.);
  vec2 ruv=pos/sceneSize;
  if(ruv.x<0.||ruv.x>1.||ruv.y<0.||ruv.y>1.)return vec3(0.);
  vec4 light=texture2D(reflected,ruv);
  float stroke=smoothstep(.34,.62,flecks*.73+detail*.27);
  float gaps=smoothstep(.18,.48,noise(brush*vec2(.43,.8)+31.));
  float tooth=noise(waterPixel/vec2(5.,2.5));
  float edge=smoothstep(.1+fine*.14,.23+fine*.14,light.a);
  float broken=.1+.9*stroke*gaps*(.7+.3*tooth);
  float fade=pow(1.-depth,1.3)*smoothstep(0.,.035,depth);
  return light.rgb*light.a*edge*broken*fade*(1.28+.14*sin(time*.8+coarse*6.28))*hasReflection;

 }
 void main(){vec4 base=texture2D(image,uv);float phase=fract(time/16.);float other=fract(phase+.5);float weight=abs(phase*2.-1.);vec4 a=sampleFlow(phase),b=sampleFlow(other);vec4 flow=mix(a,b,weight);float edge=smoothstep(0.,16./size.x,uv.x)*smoothstep(0.,16./size.x,1.-uv.x)*smoothstep(0.,.08,uv.y);vec3 color=mix(base.rgb,flow.rgb,edge*flow.a);color+=vec3(1.35,1.5,1.7)*glints()*edge*base.a;color+=reflection()*base.a;gl_FragColor=vec4(color,base.a);}`));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
 const size=gl.getUniformLocation(program,'size'),time=gl.getUniformLocation(program,'time');let previous=null,shape='';
 const crop=document.createElement('canvas'),reflectionCrop=document.createElement('canvas');reflectionCrop.width=1086;reflectionCrop.height=362;
 const reflectionTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,reflectionTexture);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,reflectionCrop);gl.uniform1i(gl.getUniformLocation(program,'reflected'),1);gl.activeTexture(gl.TEXTURE0);

 return {render(source,b,seconds,replacement=false,reflectionSource=null,rect=b){if(gl.isContextLost())return null;const key=[b.x,b.y,b.w,b.h,replacement].join(',');if(source!==previous||shape!==key){crop.width=Math.max(1,Math.ceil(b.w));crop.height=Math.max(1,Math.ceil(b.h));const c=crop.getContext('2d');if(replacement){const s=Math.max(b.w/source.width,b.h/source.height);c.drawImage(source,(b.w-source.width*s)/2,(b.h-source.height*s)/2,source.width*s,source.height*s);}else c.drawImage(source,b.x,b.y,b.w,b.h,0,0,crop.width,crop.height);canvas.width=crop.width;canvas.height=crop.height;gl.viewport(0,0,canvas.width,canvas.height);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,crop);gl.uniform2f(size,canvas.width,canvas.height);previous=source;shape=key;}gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,reflectionTexture);if(reflectionSource){const rc=reflectionCrop.getContext('2d');rc.clearRect(0,0,1086,362);rc.drawImage(reflectionSource,0,0,1086,362);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,reflectionCrop);}gl.uniform1f(gl.getUniformLocation(program,'hasReflection'),reflectionSource?1:0);gl.uniform2f(gl.getUniformLocation(program,'sceneSize'),reflectionSource?.width||2172,reflectionSource?.height||724);gl.uniform4f(gl.getUniformLocation(program,'waterRect'),rect.x,rect.y,rect.w,rect.h);gl.activeTexture(gl.TEXTURE0);gl.uniform1f(time,seconds);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return canvas;}};
};

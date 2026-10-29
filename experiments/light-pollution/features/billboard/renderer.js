/* Offline sequence player; image 08 and screen-local effects. */
window.createBillboardVideo=async function(){
const sources={'08':window.BILLBOARD_SEQUENCE,'03':window.BILLBOARD_FUTURE_SEQUENCE},decoded={};await Promise.all(Object.entries(sources).map(async([id,data])=>{decoded[id]=await Promise.all(data.atlases.map(src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;})));}));
const canvas=Object.assign(document.createElement('canvas'),{width:640,height:384}),gl=canvas.getContext('webgl',{premultipliedAlpha:false,preserveDrawingBuffer:true});
window.LightPollution?.trackGL(gl);if(!gl)throw Error('大屏动态效果需要 WebGL');
const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision highp float;
uniform sampler2D image;uniform mat3 inverseH;uniform vec2 size;uniform vec4 crop;uniform float gain;uniform vec3 effects;uniform float time;
vec3 sampleFrame(vec2 uv){return texture2D(image,crop.xy+clamp(uv,0.,1.)*crop.zw).rgb;}
float noise(float x){return fract(sin(x*127.1+311.7)*43758.5453);}
void main(){vec2 uv=vec2(gl_FragCoord.x/size.x,1.-gl_FragCoord.y/size.y);
if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.){gl_FragColor=vec4(0.);return;}
float tick=floor(time*12.);float band=floor(uv.y*24.);
float burst=step(.70,noise(tick));float shift=(noise(band+tick*31.)-.5)*.09*effects.y*burst;
vec2 q=uv+vec2(shift,0.);float split=.008*effects.y*(.25+burst);
vec3 col=sampleFrame(q);col.r=sampleFrame(q+vec2(split,0.)).r;col.b=sampleFrame(q-vec2(split,0.)).b;
vec3 glow=vec3(0.);for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){vec3 tap=sampleFrame(q+vec2(float(x),float(y))*.009);glow+=max(tap-vec3(.55),vec3(0.));}}
col+=glow*(effects.x/9.)*1.7;
vec2 cell=fract(uv*vec2(144.,81.))-.5;float dotMask=1.-smoothstep(.32,.49,length(cell));
// Fade tiny dots to avoid moire when the screen is distant.
float resolved=smoothstep(144.,432.,size.x);col*=mix(1.,.45+.55*dotMask,effects.z*resolved);
gl_FragColor=vec4(col*gain,texture2D(image,crop.xy+clamp(q,0.,1.)*crop.zw).a);
}`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);let uploaded=-1;
const u=name=>gl.getUniformLocation(program,name);gl.uniform2f(u('size'),640,384);gl.uniform1f(u('gain'),1);gl.viewport(0,0,640,384);
return {draw(time,fx,id='08'){const data=sources[id]||sources['08'],images=decoded[id]||decoded['08'];const frame=Math.floor(time%data.duration*data.fps)%data.count,page=Math.floor(frame/data.perAtlas),slot=frame%data.perAtlas;if(uploaded!==id+':'+page){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,images[page]);uploaded=id+':'+page;}gl.uniform4f(u('crop'),((slot%data.columns)*data.strideX+data.padding+.5)/data.atlasWidth,(Math.floor(slot/data.columns)*data.strideY+data.padding+.5)/data.atlasHeight,(data.frameWidth-1)/data.atlasWidth,(data.frameHeight-1)/data.atlasHeight);gl.uniform3f(u('effects'),fx.bloom,fx.glitch,fx.dots);gl.uniform1f(u('time'),time);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return canvas;}};
};

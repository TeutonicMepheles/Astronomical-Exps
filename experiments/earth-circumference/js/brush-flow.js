/* A bounded, low-resolution texture-flow pass; static original remains fallback. */
export function mountBrushFlow(layer){
 const canvas=document.createElement('canvas');canvas.className='brush-flow';canvas.hidden=true;canvas.width=960;canvas.height=540;canvas.setAttribute('aria-hidden','true');layer.prepend(canvas);
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});if(!gl){canvas.remove();return;}
 const vert='attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
 const frag=`precision mediump float;varying vec2 uv;uniform sampler2D tex;uniform float time;
 void main(){vec2 q=vec2(uv.x,1.-uv.y);vec3 original=texture2D(tex,q).rgb;
 float phase=time*.46;
 vec2 flow=vec2(sin(q.y*17.+phase)+.5*sin(q.x*22.-phase*.7),cos(q.x*14.+phase*.8)+.5*sin(q.y*25.+phase*.6));
 float edge=smoothstep(0.,.07,q.x)*smoothstep(0.,.07,1.-q.x)*smoothstep(0.,.07,q.y)*smoothstep(0.,.07,1.-q.y);
 float star=1.-smoothstep(.45,.8,max(original.r,max(original.g,original.b)));
 vec2 displaced=clamp(q+flow*vec2(.009,.012)*edge*star,vec2(.001),vec2(.999));
 vec3 moving=texture2D(tex,displaced).rgb;float movingStar=smoothstep(.32,.65,max(moving.r,max(moving.g,moving.b)));float staticStar=smoothstep(.32,.65,max(original.r,max(original.g,original.b)));vec3 color=mix(moving,original,max(movingStar,staticStar));gl_FragColor=vec4(color*.86,1.);}`;
 function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vert));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){canvas.remove();return;}gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'tex'),0);const clock=gl.getUniformLocation(program,'time');
 const reduce=matchMedia('(prefers-reduced-motion:reduce)'),off=new URLSearchParams(location.search).get('motion')==='off';let ready=false,frame=0,last=-100,start=performance.now();
 function tick(now){frame=0;if(!ready||document.hidden||reduce.matches||off)return;if(now-last>=32){gl.uniform1f(clock,(now-start)/1000);gl.drawArrays(gl.TRIANGLES,0,3);last=now;canvas.dataset.flowTime=((now-start)/1000).toFixed(2);}frame=requestAnimationFrame(tick);}
 function sync(){cancelAnimationFrame(frame);frame=0;canvas.hidden=!ready||reduce.matches||off;if(!canvas.hidden&&!document.hidden)frame=requestAnimationFrame(tick);}
 const image=new Image();image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);ready=true;sync();};image.src=new URL('../assets/starfield-reference.png',import.meta.url).href;
 reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;cancelAnimationFrame(frame);canvas.hidden=true;});
}

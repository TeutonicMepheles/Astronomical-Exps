/* Private adaptation of EXP-04 brush-flow.js; see SOURCE.md. */
(function(N){
N.ObservationNebula=class{
 constructor(canvas,image){
  this.canvas=canvas;this.ready=false;this.dead=false;
  canvas.width=960;canvas.height=540;
  const gl=this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false});
  if(!gl)return;
 const vert='attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
 const frag=`precision mediump float;varying vec2 uv;uniform sampler2D tex;uniform float time;
 void main(){vec2 q=vec2(uv.x,1.-uv.y);vec3 original=texture2D(tex,q).rgb;
 float phase=time*.46;
 vec2 flow=vec2(sin(q.y*17.+phase)+.5*sin(q.x*22.-phase*.7),cos(q.x*14.+phase*.8)+.5*sin(q.y*25.+phase*.6));
 float edge=smoothstep(0.,.07,q.x)*smoothstep(0.,.07,1.-q.x)*smoothstep(0.,.07,q.y)*smoothstep(0.,.07,1.-q.y);
 float star=1.-smoothstep(.45,.8,max(original.r,max(original.g,original.b)));
 vec2 displaced=clamp(q+flow*vec2(.009,.012)*edge*star,vec2(.001),vec2(.999));
 vec3 moving=texture2D(tex,displaced).rgb;float movingStar=smoothstep(.32,.65,max(moving.r,max(moving.g,moving.b)));float staticStar=smoothstep(.32,.65,max(original.r,max(original.g,original.b)));vec3 color=mix(moving,original,max(movingStar,staticStar));gl_FragColor=vec4(color*.86,1.);}`;

  const shader=(type,source)=>{const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
  const program=this.program=gl.createProgram();this.shaders=[shader(gl.VERTEX_SHADER,vert),shader(gl.FRAGMENT_SHADER,frag)];this.shaders.forEach(sh=>gl.attachShader(program,sh));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;gl.useProgram(program);
  const buffer=this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const texture=this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  for(const [key,value] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);
  gl.uniform1i(gl.getUniformLocation(program,'tex'),0);this.clock=gl.getUniformLocation(program,'time');
  const upload=()=>{if(this.dead)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);this.ready=true;this.draw(0);N.app.observationModel?.render();};
  if(image.complete&&image.naturalWidth)upload();else image.addEventListener('load',upload,{once:true});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;canvas.hidden=true;});
 }
 draw(time){if(!this.ready)return;const gl=this.gl;gl.viewport(0,0,960,540);gl.uniform1f(this.clock,time);gl.drawArrays(gl.TRIANGLES,0,3);this.canvas.hidden=false;}
 destroy(){this.dead=true;this.ready=false;const gl=this.gl;if(!gl)return;gl.deleteBuffer(this.buffer);gl.deleteTexture(this.texture);gl.deleteProgram(this.program);this.shaders?.forEach(sh=>gl.deleteShader(sh));}
};
})(window.Newton);

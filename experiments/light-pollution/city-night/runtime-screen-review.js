/* Standalone art preview. Linear-light composition; shared single frame scheduler. */
'use strict';
const W=2736,H=1536,$=id=>document.getElementById(id),cv=$('scene');
const gl=cv.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});
if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw Error('需要支持浮点帧缓冲的 WebGL2');
// Float composition has no low-bit color target; keep fixed pixels deterministic across light changes.
gl.disable(gl.DITHER);
const labels={'public-pair':'公共建筑亮度','residential':'住宅窗灯','public':'公共建筑','commercial-windows':'商业窗灯','commercial-screens':'商业屏幕','billboard':'广告牌','stadium':'体育场','distant':'远景窗灯亮度'};
// These two window channels now belong exclusively to the fixed master.
const rasterChannels=Object.keys(labels).filter(k=>k!=='residential'&&k!=='public');
const names={road:'路灯',path:'步道灯',wall:'住宅墙灯',parking:'停车场地灯'};
const shades={open:'无遮挡',cap:'顶罩',half:'半遮光',full:'全遮光',off:'熄灯'};
const profiles={open:{mode:0,spill:1,ground:.60,width:1.8,beam:.24},cap:{mode:1,spill:.75,ground:.66,width:1.6,beam:.32},half:{mode:2,spill:.32,ground:.76,width:1.25,beam:.45},full:{mode:3,spill:.015,ground:.85,width:.68,beam:.65},off:{mode:3,spill:0,ground:0,width:.68,beam:0}};
const state={gains:Object.fromEntries(Object.keys(labels).map(k=>[k,2])),groups:Object.fromEntries(Object.keys(names).map(k=>[k,{shade:'open',useTiled:false,gain:2,spread:1,halo:.85}])),media:{time:0,paused:false},traffic:{gain:1,glare:.65,speed:1,paused:false,beam:'high'},stadium:{overnight:true},park:{gain:1},pair:{warmth:.5,shade:'open'},view:'scene',time:0};
// Editable visual demonstration gains; not photometric calibration.
const haloDefaults=Object.freeze({total:1.5,stadium:.88,commercial:.48,billboard:.40,road:.80});
const haloStorage='city-night-halo-v1';
state.halo={...haloDefaults};
try{const saved=JSON.parse(localStorage.getItem(haloStorage));for(const k in haloDefaults)if(Number.isFinite(saved?.[k]))state.halo[k]=Math.max(0,Math.min(3,saved[k]));}catch{}
// All exterior road and sidewalk fixtures belong to one editable object.
state.groups.path=state.groups.road;state.groups.road.useTiled=false;
const views={scene:[0,0,W,H],road:[1100,780,620,348],path:[500,940,700,393],wall:[170,780,630,354],parking:[1450,1000,800,449]};
let ready=false,dirty=true,pending=0,last=0,frames=0,staticDraws=0,uploads=0,dead=false;
const timings=[];
function range(id,label,min,max,value,step=1){return `<label>${label}<output id="o-${id}">${Math.round(value*100)}%</output><input id="${id}" aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`}
$('fixtures').innerHTML=Object.entries(names).map(([k,n])=>`<section><div class="section-title"><b>${n}</b>${k==='parking'?'':`<select id="shade-${k}" aria-label="${n}灯罩">${Object.entries(shades).map(([v,l])=>`<option value="${v}" ${state.groups[k].shade===v?'selected':''}>${l}</option>`).join('')}</select>`}</div>${range(k+'-gain',n+'亮度',0,2,state.groups[k].gain,.01)}<div class="twins">${range(k+'-spread','范围',.45,1.8,1,.01)}${range(k+'-halo','光晕',0,1.5,.85,.01)}</div></section>`).join('');
$('buildings').innerHTML=Object.entries(labels).map(([k,n])=>range('gain-'+k,n,0,2,state.gains[k],.01)).join('');
function syncRoadControls(){for(const id of ['road','path']){for(const key of ['gain','spread','halo']){$(id+'-'+key).value=state.groups.road[key];$('o-'+id+'-'+key).value=Math.round(state.groups.road[key]*100)+'%'}$('shade-'+id).value=state.groups.road.shade}}
syncRoadControls();
function changed(){dirty=true;request()}
for(const k of Object.keys(names)){
 if(k!=='parking')$('shade-'+k).onchange=e=>{state.groups[k].shade=e.target.value;state.groups[k].useTiled=false;if(k==='road'||k==='path')syncRoadControls();changed()};
 for(const p of ['gain','spread','halo'])$(k+'-'+p).oninput=e=>{state.groups[k][p]=+e.target.value;$('o-'+k+'-'+p).value=Math.round(+e.target.value*100)+'%';if(k==='road'||k==='path')syncRoadControls();changed()};
}
function setBuildingGain(id,value){const linked=id==='residential'||id==='public'?['residential','public']:[id];for(const k of linked){state.gains[k]=value;$('gain-'+k).value=value;$('o-gain-'+k).value=Math.round(value*100)+'%'}changed()}
for(const k of Object.keys(labels))$('gain-'+k).oninput=e=>setBuildingGain(k,+e.target.value);
$('beam').onchange=e=>{state.traffic.beam=e.target.checked?'high':'low';changed()};
$('view').onchange=e=>{state.view=e.target.value;request()};
for(const id of ['fixtures','buildings'])$('tab-'+id).onclick=()=>{for(const n of ['fixtures','buildings']){$(n).hidden=n!==id;$('tab-'+n).setAttribute('aria-pressed',String(n===id))}};
function all(value){for(const k in state.gains){state.gains[k]=value;$('gain-'+k).value=value;$('o-gain-'+k).value=value*100+'%'}for(const k in state.groups){state.groups[k].gain=value;$(k+'-gain').value=value;$('o-'+k+'-gain').value=value*100+'%'}state.traffic.gain=value;changed()}

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');reducedMotion.addEventListener('change',()=>{last=0;request()});
const linear=`vec3 lin(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}vec3 enc(vec3 c){c=max(c,vec3(0));return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}`;
const vert=`#version 300 es
precision highp float;uniform vec4 rect;uniform vec4 camera;out vec2 uv;out vec2 world;
void main(){vec2 p=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1))[gl_VertexID];uv=p;world=rect.xy+p*rect.zw;gl_Position=vec4((world.x-camera.x)/camera.z*2.-1.,1.-(world.y-camera.y)/camera.w*2.,0,1);}`;
function program(body,vertexSource=vert){function sh(type,s){const v=gl.createShader(type);gl.shaderSource(v,s);gl.compileShader(v);if(!gl.getShaderParameter(v,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(v));return v}const p=gl.createProgram(),v=sh(gl.VERTEX_SHADER,vertexSource),f=sh(gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;in vec2 uv;in vec2 world;out vec4 frag;${linear}\n${body}`);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.deleteShader(v);gl.deleteShader(f);p.u={};return p}
// Keep the original bezel/glow raster while replacing only emissive screen interiors.
const screenMasks=window.CITY_SCREENS.map((screen,i)=>`vec2 screenUV${i}(vec2 at){vec3 q=mat3(${screen.inverseH.map(n=>Number(n).toExponential(12)).join(',')})*vec3(at,1.);return q.xy/q.z;}`).join('');
const screenInside=`float insideScreen(vec2 q){vec2 px=max(fwidth(q),vec2(.00001));vec2 d=min(q,1.-q)/px;return smoothstep(-3.5,-2.5,min(d.x,d.y));}`;
const screenChannelMask=channel=>window.CITY_SCREENS.map((screen,i)=>screen.channel===channel?`*(1.-insideScreen(screenUV${i}(world)))`:'').join('');
const staticP=program(`${screenMasks}${screenInside}uniform sampler2D base;uniform sampler2D cleanSky;uniform float skyPollution;${rasterChannels.map((k,i)=>`uniform sampler2D l${i};uniform float g${i};`).join('')}uniform vec3 pairTint;void main(){vec4 sky=texture(cleanSky,uv);vec3 c=mix(lin(texture(base,uv).rgb),lin(sky.rgb),sky.a);c+=sky.a*skyPollution*vec3(.055,.035,.018)*(.4+.6*uv.y);${rasterChannels.map((k,i)=>`c+=lin(texture(l${i},uv).rgb)*g${i}${k==='public-pair'?'*pairTint':''}${screenChannelMask(k)};`).join('')}frag=vec4(c,1);}`);
const starP=program(`in float starAlpha;in float starLum;in vec2 starTint;void main(){if(starAlpha<=.02)discard;float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.05,1.,r))*starAlpha;frag=vec4(vec3(starTint.x,starTint.y,1.)*a*starLum*.8,0.);}`,`#version 300 es
precision highp float;layout(location=0)in vec4 star;layout(location=1)in vec2 tint;uniform vec4 camera;uniform float limit;out vec2 uv;out vec2 world;out float starAlpha;out float starLum;out vec2 starTint;void main(){world=star.xy;uv=vec2(0);starAlpha=clamp((limit-star.z)/.008,0.,1.);starTint=tint;starLum=.2+.8*pow(1.-star.z,4.);gl_PointSize=star.w*(.55+.45*(1.-star.z));gl_Position=vec4((star.x-camera.x)/camera.z*2.-1.,1.-(star.y-camera.y)/camera.w*2.,0,1);}`);
let skyVertices=new Float32Array(0),skyVAO=null,skyBuffer=null,skyReadout={pollution:1,bortle:9,visibleStars:0,limit:.01};
function prepareSky(im){const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(im,0,0);skyVertices=CitySkyModel.catalogue(c.getContext('2d').getImageData(0,0,W,H).data,W,H);skyVAO=gl.createVertexArray();skyBuffer=gl.createBuffer();gl.bindVertexArray(skyVAO);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,skyVertices,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,24,16);gl.bindVertexArray(null);}
// Local readout feedback; only update on changed values, with no extra clock or layout reads.
function setSkyMetric(id,next){const output=$(id),previous=output.dataset.value; if(previous===String(next))return;output.dataset.value=String(next);output.textContent=next.toLocaleString('zh-CN');const metric=output.parentElement,arrow=metric.querySelector('.sky-metric-delta');const direction=previous===undefined?0:Math.sign(next-Number(previous));metric.classList.toggle('is-up',direction>0);metric.classList.toggle('is-down',direction<0);arrow.textContent=direction>0?'↑':direction<0?'↓':'';}
function drawSkyStars(){const model=CitySkyModel.evaluate(state),camera=renderView;let visibleStars=0;for(let i=0;i<skyVertices.length;i+=6)if((model.limit-skyVertices[i+2])/.008>.02&&skyVertices[i]>=camera[0]&&skyVertices[i]<camera[0]+camera[2]&&skyVertices[i+1]>=camera[1]&&skyVertices[i+1]<camera[1]+camera[3])visibleStars++;skyReadout={...model,visibleStars,catalogueSize:skyVertices.length/6};setSkyMetric('bortle-value',model.bortle);setSkyMetric('star-count',visibleStars);use(starP);f(starP,'limit',model.limit);gl.bindVertexArray(skyVAO);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.POINTS,0,Math.min(6000,Math.ceil(model.limit*6000)));gl.bindVertexArray(null);}

const residentFixedP=program(window.RESIDENT_FIXED.fragment);
const finalP=program(`uniform sampler2D image;uniform vec4 view;void main(){vec2 p=(view.xy+uv*view.zw)/vec2(${W},${H});frag=vec4(clamp(enc(texture(image,vec2(p.x,1.-p.y)).rgb),0.,1.),1);}`);
const spriteP=program(`uniform sampler2D image;uniform sampler2D receivers;uniform vec4 crop;uniform vec3 tint;uniform float opacity;uniform float flip;uniform float occlude;void main(){vec2 p=vec2(mix(uv.x,1.-uv.x,flip),uv.y);vec4 c=texture(image,crop.xy+p*crop.zw);float a=c.a*opacity;if(occlude>.5)a*=texture(receivers,world/vec2(${W},${H})).a;frag=vec4(lin(c.rgb)*tint*a,a);}`);
// The original Seedream paintings are static materials on continuously projected vehicle geometry.
const carP=program(`uniform sampler2D image;uniform float opacity;in vec3 materialColor;
void main(){vec4 paint=texture(image,uv);vec3 color=mix(lin(materialColor),lin(paint.rgb),smoothstep(.15,.85,paint.a));frag=vec4(color*opacity,opacity);}`,`#version 300 es
precision highp float;layout(location=0)in vec3 position;layout(location=1)in vec2 paintUV;layout(location=2)in vec3 faceColor;
uniform vec4 camera;uniform vec2 groundPivot;uniform vec4 groundBasis;uniform float heightY;uniform float worldScale;uniform vec2 viewAngles;
out vec2 uv;out vec2 world;out vec3 materialColor;
void main(){uv=paintUV;materialColor=faceColor;world=groundPivot+worldScale*vec2(groundBasis.x*position.x+groundBasis.y*position.z,groundBasis.z*position.x+groundBasis.w*position.z+heightY*position.y);float depth=cos(viewAngles.y)*(sin(viewAngles.x)*position.x+cos(viewAngles.x)*position.z)+sin(viewAngles.y)*position.y;gl_Position=vec4((world.x-camera.x)/camera.z*2.-1.,1.-(world.y-camera.y)/camera.w*2.,-depth/20.,1.);}`);
const lightP=program(`uniform sampler2D receivers;uniform vec3 color;uniform float gain;uniform float kind;uniform float channel;uniform float cutoff;uniform vec2 direction;
void main(){vec2 p=uv*2.-1.;float a=0.;if(kind<.5){a=exp(-3.8*dot(p,p))*pow(max(0.,1.-dot(p,p)),.7);vec4 m=texture(receivers,world/vec2(${W},${H}));a*=channel<.5?m.r:channel<1.5?m.g:channel<2.5?m.b:m.r;}
else if(kind<1.5){a=exp(-4.7*dot(p,p))*pow(max(0.,1.-dot(p,p)),1.2);if(cutoff>.5&&cutoff<1.5)a*=smoothstep(-.08,.10,p.y+abs(p.x)*.95);else if(cutoff>1.5&&cutoff<2.5)a*=smoothstep(-.015,.08,p.y);else if(cutoff>2.5)a*=smoothstep(0.,.12,p.y)*(1.-smoothstep(.06+.35*max(p.y,0.),.13+.52*max(p.y,0.),abs(p.x)));}
else if(kind<2.5){a=pow(max(0.,1.-dot(p,p)),2.);}
else if(kind<3.5){float y=direction.y<0.?1.-uv.y:uv.y;float width=.10+.85*y;float x=abs(p.x);a=(1.-smoothstep(width*.62,width,x))*pow(1.-y,1.6)*smoothstep(0.,.08,y);a*=texture(receivers,world/vec2(${W},${H})).r;}
else if(kind<4.5){float r=length(p);float rays=0.;float axes=direction.x;for(int i=0;i<3;i++){if(float(i)>=axes)break;float angle=.30+float(i)*3.14159265/axes;vec2 axis=vec2(cos(angle),sin(angle));float along=abs(dot(p,axis));float side=abs(p.x*axis.y-p.y*axis.x);float width=.008+.016*pow(max(0.,1.-along),2.);float column=exp(-pow(side/width,2.))+.16*exp(-pow(side/(width*2.8),2.));rays+=column*pow(max(0.,1.-along),1.8);}a=exp(-900.*r*r)*.65+exp(-70.*r*r)*.30+rays*.44; a*=1.-smoothstep(.82,1.,r);}
else if(kind<5.5){float t=uv.y;float center=mix(direction.x,direction.y,t);float sigma=.012+.19*pow(t,.92);float side=(uv.x-center)/sigma;float veil=exp(-.5*side*side);float core=exp(-2.5*side*side);a=(veil*.65+core*.35)*exp(-1.35*t)*smoothstep(0.,.022,t)*(1.-smoothstep(.60,1.,t));a*=texture(receivers,world/vec2(${W},${H})).a;}
else if(kind<6.5){vec2 dir=normalize(direction);float along=dot(p,dir);float side=abs(p.x*dir.y-p.y*dir.x);a=exp(-2.8*dot(p,p))*smoothstep(0.,.08,along)*(1.-smoothstep(.06+.30*along,.14+.52*along,side))*pow(max(0.,1.-dot(p,p)),1.3);}
else if(kind<7.5){float t=uv.y;float depth=t/max(direction.x,.01);float x=uv.x-.5;float sigma=.009+.105*pow(max(depth,0.),.86);float core=exp(-.5*pow(x/sigma,2.));float veil=exp(-.5*pow(x/(sigma*1.85+.012),2.));float distanceFade=exp(-1.65*depth);float floorFade=1.-smoothstep(direction.x-direction.y*.45,direction.x+direction.y*1.35,t);float aperture=smoothstep(0.,.018,t);float edgeFade=1.-smoothstep(.43,.5,abs(x));float coneWidth=.006+.325*max(depth,0.);float feather=.012+.020*max(depth,0.);float inside=1.-smoothstep(coneWidth-feather,coneWidth+feather,abs(x));float rim=exp(-.5*pow((abs(x)-coneWidth)/(feather*.65),2.))*smoothstep(.015,.10,depth)*(1.-smoothstep(.98,1.08,depth));a=((core*.28+veil*.08)*distanceFade+(.16*inside+.26*rim)*exp(-.65*depth))*floorFade*aperture*edgeFade;}
else if(kind<8.5){float t=uv.y;float spread=.055+.42*pow(t,.7);float side=(uv.x-.5)/spread;a=exp(-2.8*side*side)*exp(-2.4*t)*smoothstep(0.,.045,t)*(1.-smoothstep(.65,1.,t));a*=texture(receivers,world/vec2(${W},${H})).b;}
else{float r=length(p);float angle=atan(p.y,p.x);float rays=pow(.5+.5*cos(angle*16.),6.)*.07*exp(-3.5*r*r);a=(.65*exp(-4.*r*r)+.35*exp(-70.*r*r)+rays)*pow(max(0.,1.-r*r),1.5);if(cutoff<.5)a*=mix(.5,1.,smoothstep(-.3,-.06,p.y));else if(cutoff>.5&&cutoff<1.5)a*=smoothstep(-.04,.06,p.y+abs(p.x)*.75);else if(cutoff>1.5&&cutoff<2.5)a*=smoothstep(-.01,.06,p.y);else if(cutoff>2.5)a*=smoothstep(.02,.09,p.y)*(1.-smoothstep(.10+.32*max(p.y,0.),.18+.48*max(p.y,0.),abs(p.x)));}
if(kind>4.5&&kind<5.5||kind>7.5&&kind<8.5)a*=smoothstep(0.,.035,uv.x)*(1.-smoothstep(.965,1.,uv.x));
a*=texture(receivers,world/vec2(${W},${H})).a;frag=vec4(color*gain*a,0);}`);
const additiveP=program(`uniform sampler2D image;uniform float gain;uniform vec4 crop;void main(){frag=vec4(lin(texture(image,crop.xy+uv*crop.zw).rgb)*gain,0);}`);
// Atlas sampling uses the mature padded crop scheme, with adjacent-frame interpolation.
const screenP=program(`uniform sampler2D atlasA;uniform sampler2D atlasB;uniform sampler2D loopAtlas;uniform vec4 cropA;uniform vec4 cropB;uniform vec4 loopCrop;uniform mat3 inverseH;uniform float blendFrame;uniform float loopBlend;uniform float gain;uniform float bloomPass;uniform float bloomRadius;uniform float bloomGain;uniform float glitch;uniform float fxTime;
vec3 rawArtwork(vec2 q){vec2 at=clamp(q,0.,1.);vec3 a=lin(texture(atlasA,cropA.xy+at*cropA.zw).rgb),b=lin(texture(atlasB,cropB.xy+at*cropB.zw).rgb),c=lin(texture(loopAtlas,loopCrop.xy+at*loopCrop.zw).rgb);return mix(mix(a,b,blendFrame),c,loopBlend);}
// Screen-local band displacement / RGB split adapted from Foucault hall screens.
vec3 artwork(vec2 q){if(glitch<=0.)return rawArtwork(q);float burst=smoothstep(.65,.94,sin(fxTime*4.7));float band=exp(-pow((q.y-(.5+.46*sin(fxTime*1.9)))/.065,2.));float edge=smoothstep(0.,.07,min(min(q.x,1.-q.x),min(q.y,1.-q.y)));float shift=sin(q.y*85.+fxTime*29.)*.052*glitch*burst*band*edge;float split=glitch*(.0025+.012*burst*band)*edge;vec2 at=q+vec2(shift,0.);vec3 c=rawArtwork(at);c.r=rawArtwork(at+vec2(split,0.)).r;c.b=rawArtwork(at-vec2(split,0.)).b;return c;}
// Convolve actual animation highlights, not the screen rectangle or clamped borders.
vec3 highlightAt(vec2 at){vec3 h=inverseH*vec3(at,1.);vec2 q=h.xy/h.z;if(any(lessThan(q,vec2(0.)))||any(greaterThan(q,vec2(1.))))return vec3(0.);vec3 c=artwork(q);float l=dot(c,vec3(.2126,.7152,.0722));return c*smoothstep(.28,.72,l);}
float weight(int i){return i==0?6.:abs(i)==1?4.:1.;}
void main(){if(bloomPass>.5){vec3 glow=vec3(0.);for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){float w=weight(x)*weight(y)/256.;vec2 d=vec2(float(x),float(y));glow+=w*(highlightAt(world+d*bloomRadius)*.65+highlightAt(world+d*bloomRadius*2.4)*.35);}frag=vec4(glow*gain*bloomGain,0.);return;}vec3 mapped=inverseH*vec3(world,1.);vec2 q=mapped.xy/mapped.z;vec2 dx=dFdx(q),dy=dFdy(q),px=max(abs(dx)+abs(dy),vec2(.00001));vec2 edge=min(q,1.-q)/px;float aa=smoothstep(-.5,.5,min(edge.x,edge.y));if(aa<=0.)discard;vec3 c=vec3(0.);for(int x=0;x<4;x++)for(int y=0;y<4;y++){vec2 jitter=(vec2(float(x),float(y))+.5)/4.-.5;c+=artwork(q+dx*jitter.x+dy*jitter.y)/16.;}frag=vec4(c*gain*aa,aa);}`);
function sequenceFrame(frame){const n=((frame%100)+100)%100,slot=n%16;return {page:Math.floor(n/16),crop:[((slot%4)*508+2.5)/2032,(Math.floor(slot/4)*288+2.5)/1152,503/2032,283/1152]}}
function screensPlaying(){return !state.media.paused&&!reducedMotion.matches&&state.view==='scene'&&window.CITY_SCREENS.some(s=>state.gains[s.channel]>0)}
let screenBloomGain=.85,screenEmissionGain=1.15,screenGlitchGain=.65;
function effectiveScreenBloom(channelGain=2){return screenBloomGain*Math.pow(.8/Math.max(.8,screenEmissionGain*channelGain/2),1.6)}
function drawScreens(){if(state.view!=='scene')return;use(screenP);for(const screen of window.CITY_SCREENS){const gain=state.gains[screen.channel];if(gain<=0)continue;const time=((state.media.time+screen.offset)%5+5)%5,position=time*20,a=sequenceFrame(Math.floor(position)),b=sequenceFrame(Math.min(99,Math.floor(position)+1)),first=sequenceFrame(0);bind(screenP,'atlasA',textures['screen-'+screen.source+'-'+a.page]);bind(screenP,'atlasB',textures['screen-'+screen.source+'-'+b.page],1);bind(screenP,'loopAtlas',textures['screen-'+screen.source+'-0'],2);v(screenP,'cropA',a.crop);v(screenP,'cropB',b.crop);v(screenP,'loopCrop',first.crop);gl.uniformMatrix3fv(loc(screenP,'inverseH'),false,screen.inverseH);f(screenP,'blendFrame',position%1);const fade=Math.max(0,(time-4.6)/.4);f(screenP,'loopBlend',fade*fade*(3-2*fade));f(screenP,'fxTime',state.media.time+screen.offset);f(screenP,'glitch',reducedMotion.matches?0:screenGlitchGain);f(screenP,'gain',gain*screenEmissionGain);f(screenP,'bloomPass',0);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);quad(screenP,[screen.rect[0]-2,screen.rect[1]-2,screen.rect[2]+4,screen.rect[3]+4]);const radius=Math.max(1.1,Math.min(3.2,screen.rect[2]*.018)),padding=Math.ceil(radius*5+2);f(screenP,'bloomRadius',radius);f(screenP,'bloomGain',effectiveScreenBloom(gain));f(screenP,'bloomPass',1);gl.blendFunc(gl.ONE,gl.ONE);quad(screenP,[screen.rect[0]-padding,screen.rect[1]-padding,screen.rect[2]+padding*2,screen.rect[3]+padding*2])}}
const shadowP=program(`uniform sampler2D receivers;uniform float opacity;uniform float groundOnly;void main(){vec2 p=uv*2.-1.;float a=exp(-4.*dot(p,p))*(1.-smoothstep(.65,1.,length(p)))*opacity*mix(1.,texture(receivers,world/vec2(${W},${H})).r,groundOnly);frag=vec4(0.,0.,0.,a);}`);
const neighborhoodP=program(`uniform sampler2D openLight;uniform sampler2D fullLight;uniform float shield;uniform float gain;uniform vec3 tint;void main(){vec3 c=mix(lin(texture(openLight,uv).rgb),lin(texture(fullLight,uv).rgb),shield);frag=vec4(c*gain*tint,0);}`);
const cityHaloP=program(`uniform vec4 sources;uniform float total;uniform sampler2D fixedBase;uniform sampler2D fixedReceivers;uniform vec4 fixedRect;float haze(vec2 center,vec2 radius){return pow(max(0.,1.-length((world/vec2(${W},${H})-center)/radius)),1.5);}void main(){float a=haze(vec2(.31,.43),vec2(.32,.30))*sources.x*.12;float b=haze(vec2(.73,.50),vec2(.26,.27))*sources.y*.10;float c=haze(vec2(.63,.61),vec2(.20,.25))*sources.z*.09;float d=(haze(vec2(.50,.55),vec2(.11,.41))*.07+haze(vec2(.50,.84),vec2(.45,.13))*.045)*sources.w;float canopy=haze(vec2(.50,.40),vec2(.58,.31))*dot(sources,vec4(.25))*.035;vec2 localUV=(world-fixedRect.xy)/fixedRect.zw;float inLocal=step(0.,localUV.x)*step(0.,localUV.y)*step(localUV.x,1.)*step(localUV.y,1.);float visibleHalo=1.;if(inLocal>.5)visibleHalo-=texture(fixedReceivers,localUV).a*texture(fixedBase,localUV).a*.995;frag=vec4(visibleHalo*total*(lin(vec3(.96,.78,.52))*a+lin(vec3(.77,.71,.88))*b+lin(vec3(.63,.79,.93))*c+lin(vec3(.93,.82,.64))*d+lin(vec3(.84,.70,.57))*canopy),0.);}`);
function stadiumGain(){return state.stadium.overnight?state.gains.stadium:0}
function haloSources(){return [state.halo.stadium*stadiumGain(),state.halo.commercial*(state.gains['commercial-screens']*.8+state.gains['commercial-windows']*.2),state.halo.billboard*state.gains.billboard,state.halo.road*state.groups.road.gain*(profiles[state.groups.road.shade].spill/.32)];}
function renderCityHalo(){if(state.halo.total<=0)return;use(cityHaloP);v(cityHaloP,'sources',haloSources());f(cityHaloP,'total',state.halo.total);bind(cityHaloP,'fixedBase',textures['resident-fixed-base']);bind(cityHaloP,'fixedReceivers',textures['resident-fixed-receivers'],1);v(cityHaloP,'fixedRect',window.RESIDENT_FIXED.rect);gl.blendFunc(gl.ONE,gl.ONE);quad(cityHaloP,[0,0,W,H]);}
const textures={},textureList=[],buffers=[],vehicleBuffers=[],depthBuffers=[],programs=[screenP,starP,staticP,finalP,spriteP,carP,lightP,additiveP,shadowP,neighborhoodP,cityHaloP,residentFixedP];
let renderView=[0,0,W,H],cachedView='';function use(p){gl.useProgram(p);v(p,'camera',renderView)}function loc(p,n){return p.u[n]??(p.u[n]=gl.getUniformLocation(p,n))}function f(p,n,v){gl.uniform1f(loc(p,n),v)}function v(p,n,x){if(x.length===4)gl.uniform4fv(loc(p,n),x);else if(x.length===3)gl.uniform3fv(loc(p,n),x);else gl.uniform2fv(loc(p,n),x)}
function bind(p,n,t,unit=0){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(loc(p,n),unit)}function quad(p,r){v(p,'rect',r);gl.drawArrays(gl.TRIANGLES,0,6)}
function texture(image){const t=gl.createTexture();textureList.push(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);uploads++;return t}
function target(){let t=gl.createTexture();textureList.push(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,W,H,0,gl.RGBA,gl.HALF_FLOAT,null);let fb=gl.createFramebuffer();buffers.push(fb);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('浮点合成缓冲不完整');return {t,fb}}
let cached,frame;const meta={};
function sprite(name,r,{flip=0,opacity=1,tint=[1,1,1],occlude=0}={}){const p=spriteP;use(p);bind(p,'image',textures[name]);bind(p,'receivers',textures.receivers,1);v(p,'crop',meta[name]?.crop||[0,0,1,1]);v(p,'tint',tint);f(p,'flip',flip);f(p,'opacity',opacity);f(p,'occlude',occlude);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);quad(p,r)}
function additive(name,rect,gain,crop=[0,0,1,1]){if(gain<=0)return;use(additiveP);bind(additiveP,'image',textures[name]);v(additiveP,'crop',crop);f(additiveP,'gain',gain);gl.blendFunc(gl.ONE,gl.ONE);quad(additiveP,rect)}
function contactShadow(x,y,rx,ry,opacity,groundOnly=1){use(shadowP);bind(shadowP,'receivers',textures.receivers);f(shadowP,'opacity',opacity);f(shadowP,'groundOnly',groundOnly);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);quad(shadowP,[x-rx,y-ry,rx*2,ry*2])}
function light(x,y,rx,ry,color,gain,kind=1,channel=0,cutoff=0,direction=[0,1]){if(gain<=0||rx<=0||ry<=0)return;use(lightP);bind(lightP,'receivers',textures.receivers);v(lightP,'color',color);v(lightP,'direction',direction);f(lightP,'gain',gain);f(lightP,'kind',kind);f(lightP,'channel',channel);f(lightP,'cutoff',cutoff);gl.blendFunc(gl.ONE,gl.ONE);quad(lightP,[x-rx,y-ry,rx*2,ry*2])}
const lamps=[];
function fixture(group,x,y,s,groundX,groundY){lamps.push({id:group+'-'+lamps.length,group,x,y,s,groundX,groundY})}
// Authoritative scene coordinates are generated from lighting-layout.json.
for(const family of ['wall'])for(const a of window.SCENE_LIGHT_LAYOUT[family]){fixture(family,...a.slice(0,5));if(a.length>5)lamps[lamps.length-1].receiver=a[5]}
const parking=window.SCENE_LIGHT_LAYOUT.parking;
function drawAirBeam(x,y,gx,gy,radius,color,gain){if(gain<=0)return;const left=Math.min(x,gx)-radius*1.8,right=Math.max(x,gx)+radius*1.8;use(lightP);bind(lightP,'receivers',textures.receivers);v(lightP,'color',color);v(lightP,'direction',[(x-left)/(right-left),(gx-left)/(right-left)]);f(lightP,'gain',gain);f(lightP,'kind',5);f(lightP,'channel',0);f(lightP,'cutoff',0);gl.blendFunc(gl.ONE,gl.ONE);quad(lightP,[left,y,right-left,gy-y]);}
function drawDownCone(ex,ey,footY,rx,ry,color,gain){if(gain<=0)return;const length=footY+ry*1.5-ey;use(lightP);bind(lightP,'receivers',textures.receivers);v(lightP,'color',color);v(lightP,'direction',[(footY-ey)/length,ry/length]);f(lightP,'gain',gain);f(lightP,'kind',7);f(lightP,'channel',0);f(lightP,'cutoff',0);gl.blendFunc(gl.ONE,gl.ONE);quad(lightP,[ex-rx*1.5,ey,rx*3,length]);}

function renderLamps(){
 for(const l of window.SCENE_LIGHT_LAYOUT.wholeFixtures){const a=state.groups[l.group],shade=a.useTiled?l.defaultShade:a.shade,p=profiles[shade],g=a.gain,road=l.group==='road',sz=l.sourceScale,c=road?[1,.76,.47]:[1,.78,.45];
 const head='whole-road-'+shade,m=meta[head],[x,y,w,h]=l.rect,flip=l.flip,[cx,cy,cw,ch]=m.uploadCrop;
 // A single complete generated fixture is the Tiled object. Its light shares that transform.
 const ex=x+(flip?2048-m.emitterFrame[0]:m.emitterFrame[0])*w/2048,ey=y+m.emitterFrame[1]*h/2048;
 const bodyRect=[x+(flip?2048-cx-cw:cx)*w/2048,y+cy*h/2048,cw*w/2048,ch*h/2048];
 if(g<=0||p.ground<=0){sprite(head,bodyRect,{flip,occlude:1});continue;}
 const footY=y+h*1900/2048,height=footY-ey,rx=height*.72*a.spread*p.width,ry=rx*.32;
 // Vertical fixture axis and floor projection coincide. Legacy side-arm targets are not used.
 drawDownCone(ex,ey+sz,footY,rx,ry,c,g*p.beam*.65);
 light(ex,footY,rx,ry,c,g*p.ground*.48,0,l.receiver);
 light(ex,footY,rx*1.5,ry*1.5,c,g*p.ground*.22,0,l.receiver);
 sprite(head,bodyRect,{flip,occlude:1});
 const radius=(road?120:85)*sz*a.spread*(.45+p.spill);
 light(ex,ey,radius,radius,c,g*a.halo*p.spill*.62,9,0,p.mode);
 light(ex,ey,16*sz,16*sz,c,g*a.halo*.18,1,0,p.mode);
 const aperture={open:[8,8],cap:[7,5],half:[6,3],full:[5,1.5]}[shade];light(ex,ey,aperture[0]*sz,aperture[1]*sz,c,g*(shade==='full'?.65:1),2);
 }
 // Building fixtures and all their received light belong to generated neighborhood fields.
 const a=state.groups.parking;for(const p of parking){sprite('ground-fixture',[p.x-3.6*p.s,p.y-1.6*p.s,7.2*p.s,3.2*p.s]);light(p.x,p.y,21*p.s*a.spread,8*p.s*a.spread,[1,.75,.42],a.gain*.08,0,0);light(p.x,p.y,12*p.s*a.spread,9*p.s*a.spread,[1,.78,.48],a.gain*a.halo*.055,1);light(p.x,p.y,2.3*p.s,1*p.s,[1,.88,.65],a.gain*.7,2);}
}
function renderAmbient(){const stadium=stadiumGain()*2.6;
 for(const [x,y] of [[442,606],[548,624],[708,574],[1098,568],[1205,594],[968,670]]){light(x,y,66,64,[1,.90,.72],stadium*.04,1);light(x,y,19,15,[1,.93,.80],stadium*.08,2);drawAirBeam(x,y+6,x<820?x+145:x-115,750,88,[1,.90,.76],stadium*.09)}
 light(820,570,590,310,[1,.80,.53],stadium*.023,1);
 const ad=state.gains.billboard*2.5,screens=state.gains['commercial-screens']*1.4;
 light(1758,945,220,180,[.52,.76,1],ad*.10,1);
 light(1758,965,325,245,[.48,.70,1],ad*.035,1);
 light(1770,1052,245,110,[.48,.72,1],ad*.27,0,0);
 light(1665,1018,165,80,[.48,.72,1],ad*.10,0,0);
 light(2105,800,245,185,[.62,.62,1],screens*.075,1);
 light(1880,772,155,165,[.48,.70,1],screens*.045,1);
 light(2075,891,360,145,[.60,.64,1],screens*.036,1);
 light(2080,927,340,70,[.65,.62,1],screens*.20,0,0);
 const shop=state.gains['commercial-windows'];
 light(2060,911,325,70,[1,.81,.54],shop*.055,1);
}
function pairTint(){const t=(state.pair.warmth-.5)*2;return t>=0?[1+t*.15,1-t*.12,1-t*.4]:[1+t*.4,1+t*.05,1-t*.6]}
function renderPark(){for(const b of window.SCENE_LIGHT_LAYOUT.parkBollards)sprite('park-bollard-unlit',b.rect,{tint:[.22,.28,.38]});if(state.park.gain>0){additive('park-light',[0,0,W,H],state.park.gain);}}
function renderResidentFixed(){
 const cfg=window.RESIDENT_FIXED,g=cfg.geometry,p=residentFixedP,a=state.groups.wall;
 use(p);bind(p,'base',textures['resident-fixed-base']);bind(p,'receivers',textures['resident-fixed-receivers'],1);bind(p,'windowsTex',textures['resident-fixed-material'],2);bind(p,'windowResponse',textures['resident-window-response'],3);v(p,'windowCrop',cfg.windowResponseCrop);
 for(const key of ['side','front','ground'])gl.uniformMatrix3fv(loc(p,key+'H'),false,g.matrices[key]);
 for(const key of ['sideLight','frontLight','sideFoot','frontFoot','bounceCenter','sideGroundTangent','sideGroundNormal','frontGroundTangent','frontGroundNormal'])v(p,key,g[key]);
 f(p,'gain',a.shade==='off'?0:a.gain);f(p,'shield',({open:0,cap:.32,half:.7,full:1})[a.shade]||0);f(p,'windowGain',state.gains.residential);f(p,'glare',a.halo/.85);
 gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);quad(p,cfg.rect);
}
function renderBuildingWalls(){
 const shield={open:0,cap:.32,half:.70,full:1};
 for(const [family,shade,gain,tint] of [['public',state.pair.shade,state.gains['public-pair'],pairTint()]]){
  if(shade==='off'||gain<=0)continue;
  use(neighborhoodP);bind(neighborhoodP,'openLight',textures[family+'-wall-open']);bind(neighborhoodP,'fullLight',textures[family+'-wall-full'],1);
  f(neighborhoodP,'shield',shield[shade]);f(neighborhoodP,'gain',gain);v(neighborhoodP,'tint',tint);gl.blendFunc(gl.ONE,gl.ONE);quad(neighborhoodP,meta[family+'-wall-open'].sceneRect);
 }
}
function rebuild(){gl.bindFramebuffer(gl.FRAMEBUFFER,cached.fb);gl.disable(gl.BLEND);use(staticP);v(staticP,'pairTint',pairTint());bind(staticP,'base',textures.base);bind(staticP,'cleanSky',textures['sky-clean'],rasterChannels.length+1);f(staticP,'skyPollution',CitySkyModel.evaluate(state).pollution);rasterChannels.forEach((k,i)=>{bind(staticP,'l'+i,textures[k],i+1);f(staticP,'g'+i,(k==='stadium'?stadiumGain()*1.35:state.gains[k]))});quad(staticP,[0,0,W,H]);gl.enable(gl.BLEND);renderResidentFixed();renderPark();renderBuildingWalls();renderLamps();renderAmbient();renderCityHalo();drawSkyStars();dirty=false;staticDraws++}
const vehicleGeometry=new Map();
const trafficLayers={body:true,ground:true,shadows:true,lamps:true};
function prepareVehicles(manifest){for(const mesh of manifest.vehicleMeshes){const data=new Float32Array(mesh.vertices),vao=gl.createVertexArray(),buffer=gl.createBuffer();vehicleBuffers.push({vao,buffer});gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);for(const [index,size,offset] of [[0,3,0],[1,2,12],[2,3,20]]){gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,32,offset)}vehicleGeometry.set(mesh.id,{vao,count:data.length/8});}gl.bindVertexArray(null);}
function poses(time=state.time){return window.CITY_TRAFFIC.poses(time,meta['car-angles'])}
function carLights(c){return c.lamps.map(l=>({x:l.point[0],y:l.point[1],front:l.front,visibility:l.visibility}))}
function carLampPoints(c){return c.lamps.map(l=>l.point.slice())}
function drawCar(c){const mesh=vehicleGeometry.get(c.type);use(carP);v(carP,'groundPivot',[c.x,c.y]);v(carP,'groundBasis',c.groundBasis);f(carP,'heightY',c.heightY);f(carP,'worldScale',c.worldScale);v(carP,'viewAngles',[c.yaw,c.pitch]);bind(carP,'image',textures['car-angles']);f(carP,'opacity',c.opacity);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);gl.bindVertexArray(mesh.vao);if(c.opacity<.999){gl.colorMask(false,false,false,false);gl.drawArrays(gl.TRIANGLES,0,mesh.count);gl.colorMask(true,true,true,true);gl.depthMask(false);gl.depthFunc(gl.EQUAL);}gl.drawArrays(gl.TRIANGLES,0,mesh.count);gl.depthMask(true);gl.depthFunc(gl.LESS);gl.bindVertexArray(null);gl.disable(gl.DEPTH_TEST)}
function drawTraffic(){const cars=poses().filter(c=>c.opacity>.001),a=state.traffic,high=a.beam==='high';if(trafficLayers.ground)for(const c of cars){const g=a.gain*c.opacity,[x,y]=c.frontGround,[dx,dy]=c.forward;if(c.horizontal){light(x+dx*45*c.s,y,80*c.s,16*c.s,[1,.85,.61],g*.10,0);continue}light(x+dx*32*c.s,y+dy*32*c.s,54*c.s,35*c.s,[1,.86,.65],g*(high?.23:.11),0);light(x+dx*70*c.s,y+dy*70*c.s,45*c.s,(high?110:65)*c.s,[1,.88,.70],g*(high?.13:.06),3,0,0,[dx,dy]);}
for(const c of cars){const box=c.footBounds;if(trafficLayers.shadows){contactShadow((box[0]+box[2])/2,(box[1]+box[3])/2,(box[2]-box[0])*.46,c.shadowDepth,c.opacity*.50,0);for(const [x,y] of c.wheelContacts)contactShadow(x,y,.24*c.worldScale,.12*c.worldScale,c.opacity*.65,0);}if(trafficLayers.body)drawCar(c);}
if(trafficLayers.lamps)for(const c of cars){for(const lamp of carLights(c)){const {x,y,front,visibility}=lamp,g=a.gain*c.opacity*visibility,color=front?[1,.87,.68]:[1,.055,.014];light(x,y,3.5*c.s,1.7*c.s,color,g*.9,2);const lens=g*a.glare*(front?(high?3.2:1.4):.05)*Math.pow(Math.min(1,c.s),.75);light(x,y,(high?125:85)*c.s,(high?125:85)*c.s,[.78,.88,1],lens*.72,4,0,0,[high?3:2,0]);light(x,y,38*c.s,38*c.s,color,lens*.06,1);light(x,y,9*c.s,9*c.s,color,lens*.22,1);if(front&&high)light(x+(W*.5-x)*.18,y+(H*.5-y)*.18,12*c.s,12*c.s,[.4,.6,1],lens*.025,1)}}return cars;}

function request(){if(!pending&&!dead&&!document.hidden)pending=requestAnimationFrame(tick)}
function tick(now){pending=0;if(!ready||dead||document.hidden)return;let start=performance.now();const dt=last?Math.max(0,Math.min(.07,(now-last)/1000)):0;if(!state.traffic.paused)state.time+=dt*state.traffic.speed;if(screensPlaying())state.media.time+=dt;last=now;gl.viewport(0,0,W,H);renderView=views[state.view];if(cachedView!==state.view){dirty=true;cachedView=state.view}if(dirty)rebuild();gl.disable(gl.BLEND);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,cached.fb);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,frame.fb);gl.blitFramebuffer(0,0,W,H,0,0,W,H,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,frame.fb);gl.enable(gl.BLEND);drawScreens();drawTraffic();gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.BLEND);renderView=[0,0,W,H];use(finalP);bind(finalP,'image',frame.t);v(finalP,'view',[0,0,W,H]);quad(finalP,[0,0,W,H]);frames++;timings.push(performance.now()-start);if(timings.length>600)timings.shift();if(!state.traffic.paused&&state.traffic.speed>0||screensPlaying())request()}
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(pending);pending=0}else request()});
window.addEventListener('pagehide',()=>{dead=true;cancelAnimationFrame(pending);textureList.forEach(t=>gl.deleteTexture(t));buffers.forEach(b=>gl.deleteFramebuffer(b));programs.forEach(p=>gl.deleteProgram(p));vehicleBuffers.forEach(({vao,buffer})=>{gl.deleteVertexArray(vao);gl.deleteBuffer(buffer)});depthBuffers.forEach(b=>gl.deleteRenderbuffer(b));gl.deleteBuffer(skyBuffer);gl.deleteVertexArray(skyVAO);});
window.scenePreview={sky:()=>({...skyReadout}),stars:()=>Array.from({length:skyVertices.length/6},(_,i)=>Array.from(skyVertices.slice(i*6,i*6+6))),setTrafficOptions:options=>{for(const k of ['gain','glare','speed','paused'])if(k in options)state.traffic[k]=options[k];last=0;request()},setTrafficLayers:layers=>{Object.assign(trafficLayers,{body:true,ground:true,shadows:true,lamps:true},layers);request()},state:()=>JSON.parse(JSON.stringify(state)),camera:()=>views[state.view].slice(),poses:()=>poses(),lampPoints:()=>poses().map(c=>({id:c.id,points:carLampPoints(c)})),screenEffects:()=>({emission:screenEmissionGain,bloom:screenBloomGain,effectiveBloom:effectiveScreenBloom(),glitch:screenGlitchGain}),setScreenGlitch:gain=>{if(Number.isFinite(gain)){screenGlitchGain=Math.max(0,Math.min(1,gain));request()}},setScreenEmission:gain=>{if(Number.isFinite(gain)){screenEmissionGain=Math.max(0,Math.min(2,gain));request()}},setScreenBloom:gain=>{if(Number.isFinite(gain)){screenBloomGain=Math.max(0,Math.min(1,gain));request()}},setMediaOptions:options=>{if("paused" in options)state.media.paused=!!options.paused;last=0;request()},screens:()=>JSON.parse(JSON.stringify(window.CITY_SCREENS)),setMediaTime:t=>{if(Number.isFinite(t)){state.media.time=t;state.media.paused=true;request()}},setTime:t=>{state.time=t;last=0;request()},stats:()=>({screenTextureBytes:14*2032*1152*4,liveScreenTextures:Object.entries(textures).filter(([name,t])=>name.startsWith("screen-")&&gl.isTexture(t)).length,frames,staticDraws,uploads,canvas:[W,H],errors:gl.getError(),frameCpuMs:timings.slice(),skyBufferBytes:skyVertices.byteLength,liveSkyBuffer:!!skyBuffer&&gl.isBuffer(skyBuffer),fixtureCount:lamps.filter(l=>l.x<2000).length+2+window.SCENE_LIGHT_LAYOUT.wholeFixtures.length+window.SCENE_LIGHT_LAYOUT.parkBollards.length,parkCount:window.SCENE_LIGHT_LAYOUT.parkBollards.length,parkingCount:parking.length,textureCount:textureList.length,vehicleBufferCount:vehicleBuffers.length,vehicleVertexBytes:[...vehicleGeometry.values()].reduce((n,m)=>n+m.count*32,0),vehicleDepthBytes:W*H*2,liveVehicleBuffers:vehicleBuffers.filter(({buffer})=>gl.isBuffer(buffer)).length,liveVehicleDepth:depthBuffers.filter(b=>gl.isRenderbuffer(b)).length}),fixtures:()=>window.SCENE_LIGHT_LAYOUT.wholeFixtures.map(l=>{const m=meta['whole-road-'+(state.groups[l.group].useTiled?l.defaultShade:state.groups[l.group].shade)],[x,y,w,h]=l.rect;return {id:l.id,group:l.group,rect:l.rect.slice(),sourceScale:l.sourceScale,foot:[x+w*.5,y+h*1900/2048],emitter:[x+(l.flip?2048-m.emitterFrame[0]:m.emitterFrame[0])*w/2048,y+m.emitterFrame[1]*h/2048]}}),layout:()=>JSON.parse(JSON.stringify(window.SCENE_LIGHT_LAYOUT)),pixel:(x,y)=>{const p=new Uint8Array(4);gl.readPixels(x,H-1-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p)}};
async function load(){const manifest=await getManifest();prepareVehicles(manifest);for(const r of manifest.runtime){let im=new Image();im.src=window.EMBEDDED?.[r.name]||(r.path+'?v='+r.sha256.slice(0,16));await im.decode();if(r.name==='sky-clean')prepareSky(im);if(r.uploadCrop){const b=await createImageBitmap(im,...r.uploadCrop,{premultiplyAlpha:'none',colorSpaceConversion:'none'});textures[r.name]=texture(b);b.close()}else textures[r.name]=texture(im);meta[r.name]=r;}cached=target();frame=target();const depth=gl.createRenderbuffer();depthBuffers.push(depth);gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,W,H);gl.bindFramebuffer(gl.FRAMEBUFFER,frame.fb);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('车辆深度缓冲不完整');ready=true;tick(performance.now());$('loading').hidden=true;document.body.dataset.ready='true'}
async function getManifest(){return window.BUNDLE||fetch('screen-review-manifest.json',{cache:'no-store'}).then(r=>r.json())}
load().catch(e=>{$('loading').textContent=e.message;console.error(e)});



// Presentation UI owns only selection and delegates values to the existing controls.
(()=>{
const items=[
 ['road','路灯','灯具','♧',47,64,[990,1030,840,471.58]],['park','公园','公园','♧',31,72,[350,920,900,400]],['public-pair','公共建筑','建筑','▥',13,66,[0,770,540,470]],['parking','停车场地灯','灯具','⊙',64,78,[1470,1040,550,320]],
 ['residential','居民住宅','建筑','▦',83,79,[1930,920,730,500]],['commercial-windows','商业综合体','商业','▤',71,55,[1600,620,760,430]],['billboard','广告牌','商业','▣',59,66,[1450,820,500,350]],['stadium','体育场','体育场','◉',34,45,[500,480,760,470]],['distant','远景建筑','远景','▥',52,36,[0,400,2736,820]],['traffic','动态车流','车流','↔',49,85,[1100,900,650,400]]
];
// One filled pictogram family for every scene marker and its panel heading.
const filledIcons={
 park:'<path d="M9 2 2 14h4l-5 8h6v7h4v-7h6l-5-8h4L9 2Zm10 15h11v5H19v-5Zm-1 7h13v3h-2v3h-3v-3h-4v3h-3v-3h-1v-3Z"/>',
 road:'<path d="M14 8h4v20h5v3H9v-3h5V8Z"/><path d="M16 11C11 3 3 3 1 10l3 1c1-4 6-3 10 3h4c4-6 9-7 10-3l3-1C29 3 21 3 16 11Z"/><path d="M1 12h11c-1 6-10 6-11 0Zm19 0h11c-1 6-10 6-11 0Z"/>',
 residential:'<path fill-rule="evenodd" d="m2 12 9-9 9 9h-3v18H4V12H2Zm6 2v4h4v-4H8Zm0 7v4h4v-4H8Zm10-8 5-5 8 8h-3v14H18V13Zm3 4v4h4v-4h-4Zm0 7v4h4v-4h-4Z"/>',
 public:'<path fill-rule="evenodd" d="M5 2h22v5H5V2ZM2 9h28v21H2V9Zm4 4v4h4v-4H6Zm8 0v4h4v-4h-4Zm8 0v4h4v-4h-4ZM6 21v5h4v-5H6Zm8 0v9h4v-9h-4Zm8 0v5h4v-5h-4Z"/>',
 'commercial-windows':'<path fill-rule="evenodd" d="M4 3h24l3 8H1l3-8ZM2 13h28v17H2V13Zm4 4v7h8v-7H6Zm13 0v13h7V17h-7Z"/>',
 billboard:'<path fill-rule="evenodd" d="M2 3h28v21H2V3Zm5 5v3h18V8H7Zm0 6v4h10v-4H7Zm7 12h4v3h7v3H7v-3h7v-3Z"/>',
 stadium:'<path fill-rule="evenodd" d="M1 10c0-11 30-11 30 0v13c0 11-30 11-30 0V10Zm5-1c-2 6 22 6 20 0C24 4 8 4 6 9Zm0 10v5l3 1v-5l-3-1Zm7 2v5h6v-5h-6Zm10-1v5l3-1v-5l-3 1Z"/>',
 parking:'<path fill-rule="evenodd" d="M3 2h26v28H3V2Zm7 5v18h4v-6h5c9 0 9-12 0-12h-9Zm4 4h5c3 0 3 4 0 4h-5v-4Z"/>',
 distant:'<path fill-rule="evenodd" d="M1 14h8V5h9V1h9v19h4v11H1V14Zm11-5v3h3V9h-3Zm0 6v3h3v-3h-3Zm0 6v3h3v-3h-3Zm9-16v3h3V5h-3Zm0 6v3h3v-3h-3Zm0 6v3h3v-3h-3Zm0 6v3h3v-3h-3ZM4 18v3h3v-3H4Zm0 6v3h3v-3H4Z"/>',
 traffic:'<path fill-rule="evenodd" d="m7 6-4 9H1v10h3a5 5 0 0 0 10 0h5a5 5 0 0 0 10 0h2V15h-4l-5-9H7Zm2 4h11l3 6H6l3-6ZM6 23a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm15 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"/>'
};
const icon=id=>filledIcons[id]?'<svg class="ui-icon filled-icon" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">'+filledIcons[id]+'</svg>':'<img class="ui-icon" alt="" aria-hidden="true" src="'+(window.UI_ICONS?.[id]||'assets/ui/'+id+'.png')+'">';
const categoryIcons={'总览':'home','灯具':'road','建筑':'residential','商业':'commercial-windows','体育场':'stadium','远景':'distant','车流':'traffic'};
let selected=null,zoom=false;const completed=new Set();
const markerStorage='city-night-marker-positions-v1',markerDefaults={road:[47,61],park:[31,63],'public-pair':[13,53],parking:[64,69],residential:[83,70],'commercial-windows':[71,43],billboard:[59,54],stadium:[34,40],distant:[52,29],traffic:[49,80]};
for(const item of items)[item[4],item[5]]=markerDefaults[item[0]];
try{const saved=JSON.parse(localStorage.getItem(markerStorage));if(saved?.version===1)for(const item of items){const p=saved.positions?.[item[0]];if(Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=3&&p[0]<=97&&p[1]>=8&&p[1]<=97)[item[4],item[5]]=p;}}catch{}
let markerEditing=false,markerDirty=false,markerDrag=null;
function markerPositions(){return Object.fromEntries(items.map(i=>[i[0],[i[4],i[5]]]))}

const markers=document.querySelector('.markers'),panel=document.querySelector('aside'),body=$('panel-body'),layout=document.querySelector('.layout');
const objectChannels={'residential':['residential','wall'],'commercial-windows':['commercial-windows','commercial-screens']};
const controls={};for(const id of [...Object.keys(names),...Object.keys(labels),'traffic'])controls[id]=id==='traffic'?document.querySelector('.traffic'):names[id]?$(id+'-gain').closest('section'):$('gain-'+id).closest('label');
// Keep fixed calibration controls outside user-facing fixture panels.
for(const id of ['road','wall','parking'])document.querySelector('.legacy-controls').append(controls[id].querySelector('.twins'));
for(const [id,channels] of Object.entries(objectChannels)){const group=document.createElement('section');group.className='object-controls';for(const channel of channels)group.append(controls[channel]);controls[id]=group}

const stadiumControls=document.createElement('section');stadiumControls.append(controls.stadium);stadiumControls.insertAdjacentHTML('beforeend','<label class="beam-toggle"><span>使用时打开</span><input id="stadium-schedule" type="checkbox" role="switch" aria-label="通宵打开" checked><span class="beam-track" aria-hidden="true"></span><span>通宵打开</span></label>');controls.stadium=stadiumControls;document.querySelector('.legacy-controls').append(stadiumControls);$('stadium-schedule').onchange=e=>{state.stadium.overnight=e.target.checked;changed();markComplete('stadium')};
const parkControls=document.createElement('section');parkControls.innerHTML=range('park-gain','公园亮度',0,1,state.park.gain,.01);document.querySelector('.legacy-controls').append(parkControls);controls.park=parkControls;$('park-gain').oninput=e=>{state.park.gain=+e.target.value;$('o-park-gain').value=Math.round(+e.target.value*100)+'%';changed()};
const pairControls=document.createElement('section');pairControls.append(controls['public-pair']);pairControls.insertAdjacentHTML('beforeend',range('pair-warmth','冷暖',0,1,.5,.01));controls['public-pair']=pairControls;document.querySelector('.legacy-controls').append(pairControls);$('pair-warmth').oninput=e=>{state.pair.warmth=+e.target.value;$('o-pair-warmth').value=Math.round(+e.target.value*100)+'%';changed()};
const shadeIcon=key=>'<img class="ui-icon fixture-head-icon" alt="" aria-hidden="true" src="'+(window.LAMP_HEADS?.[key]||'assets/lamp-heads/'+key+'.png')+'">';
const shadeChoices={};for(const id of ['road','wall','public-pair']){const div=document.createElement('div');div.className='shade-choices';for(const [key,title] of Object.entries(shades)){let b=document.createElement('button');b.innerHTML='<span aria-hidden="true">'+shadeIcon(key)+'</span>'+title;b.onclick=()=>{if(id==='public-pair'){state.pair.shade=key;changed()}else{$('shade-'+id).value=key;$('shade-'+id).dispatchEvent(new Event('change'));}markComplete(selected);sync()};b.dataset.shade=key;div.append(b)}if(id==='public-pair'){const title=document.createElement('b');title.textContent='墙灯灯罩';title.style.fontSize='1cqw';controls[id].append(title)}controls[id].append(div);shadeChoices[id]=div}
function sync(){if(selected==='road'||selected==='path'){const image=document.querySelector('.object-preview');image.src=window.LAMP_HERO?.[state.groups[selected].shade]||'assets/lamp-hero/'+state.groups[selected].shade+'.png';image.classList.add('lamp-preview');image.alt=shades[state.groups[selected].shade]+'完整路灯'}else document.querySelector('.object-preview').classList.remove('lamp-preview');for(const input of document.querySelectorAll('input[type=range]'))input.style.setProperty('--fill',((input.value-input.min)/(input.max-input.min)*100)+'%');for(const [id,div] of Object.entries(shadeChoices))for(const b of div.children)b.setAttribute('aria-pressed',String(b.dataset.shade===(id==='public-pair'?state.pair.shade:state.groups[id].shade)))}
document.addEventListener('input',sync);document.addEventListener('change',sync);
// Completion follows current reductions from the initial maximum-pollution choices.
function reduced(id){
 const group=k=>state.groups[k].gain<2||state.groups[k].shade!=='open';
 switch(id){
 case 'road':return group('road');
 case 'park':return state.park.gain<1;
 case 'parking':return state.groups.parking.gain<2;
 case 'residential':return state.gains.residential<2||group('wall');
 case 'public-pair':return state.gains['public-pair']<2||state.pair.shade!=='open';
 case 'commercial-windows':return state.gains['commercial-windows']<2||state.gains['commercial-screens']<2;
 case 'stadium':return !state.stadium.overnight||state.gains.stadium<2;
 case 'traffic':return state.traffic.beam==='low';
 default:return state.gains[id]<2;
 }
}
function markComplete(){let updated=false;for(const item of items){const id=item[0],value=reduced(id);if(value!==completed.has(id)){updated=true;if(value)completed.add(id);else completed.delete(id)}}if(updated)render()}
body.addEventListener('input',e=>{if(e.target.matches('input[type=range]'))markComplete()});
body.addEventListener('change',markComplete);
function frameDetail(){const box=items.find(i=>i[0]===selected)[6],fraction=panel.offsetWidth/layout.clientWidth,margin=.02,gap=.035,available=1-fraction-margin*2-gap,dock=box[0]+box[2]/2>=W/2?'left':'right',width=Math.min(W,Math.max(box[2]/available,box[3]/.96*W/H)),height=width*H/W,target=dock==='left'?margin+fraction+gap+available/2:margin+available/2;const camera=[Math.max(0,Math.min(W-width,box[0]+box[2]/2-target*width)),Math.max(0,Math.min(H-height,box[1]+box[3]/2-height/2)),width,height];if(!views.detail||camera.some((v,i)=>Math.abs(v-views.detail[i])>.01)){views.detail=camera;dirty=true;request()}panel.dataset.dock=dock;return dock;}
function positionPanel(){if(panel.hidden||!selected)return;const r=layout.getBoundingClientRect();panel.dataset.detail=String(zoom);if(zoom){const dock=frameDetail();panel.style.left=(dock==='left'?r.width*.015:r.width*.985-panel.offsetWidth)+'px';panel.style.top=Math.max(r.width*.015,(r.height-panel.offsetHeight)/2)+'px';return}const item=items.find(i=>i[0]===selected),gap=r.width*.025,edge=r.width*.015,bw=r.width*.028;
 const x=r.width*item[4]/100,y=r.height*item[5]/100-bw/2,pw=panel.offsetWidth,ph=panel.offsetHeight;
 // Reserve the object's complete scene bounds, rather than only its marker.
 const bounds=selected==='residential'||selected==='public'?[1930,920,730,500]:item[6],objectLeft=bounds[0]/W*r.width,objectRight=(bounds[0]+bounds[2])/W*r.width;
 const rightSpace=r.width-edge-objectRight,leftSpace=objectLeft-edge,preferRight=objectLeft+objectRight<r.width;
 const right=rightSpace>=pw+gap&&(preferRight||leftSpace<pw+gap);let left=right?objectRight+gap:objectLeft-gap-pw;left=Math.max(edge,Math.min(r.width-pw-edge,left));
 const top=Math.max(edge,Math.min(r.height-ph-edge,y-ph/2));panel.style.left=left+'px';panel.style.top=top+'px';panel.dataset.side=right?'right':'left';panel.style.setProperty('--anchor-y',Math.max(18,Math.min(ph-18,y-top))+'px');}
new ResizeObserver(positionPanel).observe(layout);new ResizeObserver(positionPanel).observe(panel);
function choose(id){if(id==='path')id='road';if(id==='wall'||id==='public')id='residential';if(id==='commercial-screens')id='commercial-windows';const item=items.find(i=>i[0]===id);if(!item)return;selected=id;zoom=false;state.view='scene';$('view').value='scene';$('detail').textContent='查看局部';$('detail').hidden=id!=='residential';for(const child of [...body.children])document.querySelector('.legacy-controls').append(child);body.replaceChildren(controls[id]);panel.hidden=false;$('panel-title').innerHTML=icon(id==='public-pair'?'public':id)+item[1];const img=document.querySelector('.object-preview');img.src=window.UI_THUMBNAILS?.[id]||'previews/ui-'+id+'.jpg';img.alt=item[1]+'场景局部';render();sync();positionPanel();request()}
function render(){markers.replaceChildren();for(const i of items){const b=document.createElement('button');b.className='marker';b.dataset.id=i[0];b.style.left=i[4]+'%';b.style.top=i[5]+'%';b.hidden=zoom;b.innerHTML='<span aria-hidden="true">'+icon(i[0]==='public-pair'?'public':i[0])+'</span>'+(completed.has(i[0])?'<span class="completion" aria-hidden="true">✓</span>':'');b.setAttribute('aria-label',i[1]+'调节'+(completed.has(i[0])?'，已完成':''));b.setAttribute('aria-pressed',String(i[0]===selected&&!panel.hidden));b.setAttribute('aria-expanded',String(i[0]===selected&&!panel.hidden));b.onclick=()=>{if(!markerEditing)choose(i[0])};markers.append(b)}}
$('close-panel').onclick=()=>{panel.hidden=true;state.view='scene';zoom=false;render();request()};cv.addEventListener('click',()=>{if(!panel.hidden)$('close-panel').click()});document.addEventListener('keydown',e=>{if(e.key==='Escape')$('close-panel').click()});
$('detail').onclick=()=>{if(selected!=='residential')return;zoom=!zoom;state.view=zoom?'detail':'scene';$('detail').textContent=zoom?'返回全景':'查看局部';render();positionPanel();request()};
const markerBar=document.createElement('div');markerBar.className='marker-editor-bar';markerBar.hidden=true;markerBar.innerHTML='<span id="marker-edit-status">拖动气泡定位</span><button id="marker-save">保存位置</button><button id="marker-finish">退出定位</button>';layout.append(markerBar);
function markerStatus(text){$('marker-edit-status').textContent=text;window.dispatchEvent(new CustomEvent('city-marker-layout-change',{detail:{editing:markerEditing,dirty:markerDirty,status:text}}))}
function applyMarkerPosition(item,node,x,y){item[4]=Math.round(Math.max(3,Math.min(97,x))*10000)/10000;item[5]=Math.round(Math.max(8,Math.min(97,y))*10000)/10000;node.style.left=item[4]+'%';node.style.top=item[5]+'%'}
function cancelMarkerDrag(){if(!markerDrag)return;const d=markerDrag;markerDrag=null;applyMarkerPosition(d.item,d.node,...d.start);if(markers.hasPointerCapture(d.pointerId))markers.releasePointerCapture(d.pointerId)}
function editMarkerLayout(value){cancelMarkerDrag();markerEditing=!!value;markerBar.hidden=!markerEditing;layout.classList.toggle('editing-markers',markerEditing);if(markerEditing){panel.hidden=true;zoom=false;if(state.view!=='scene'){state.view='scene';request()}render()}markerStatus(markerDirty?'位置未保存':'拖动气泡定位')}
function saveMarkerLayout(){try{localStorage.setItem(markerStorage,JSON.stringify({version:1,positions:markerPositions()}));markerDirty=false;markerStatus('位置已保存到本机');return true}catch{markerStatus('本机存储不可用，请导出位置');return false}}
function resetMarkerLayout(){cancelMarkerDrag();for(const item of items)[item[4],item[5]]=markerDefaults[item[0]];markerDirty=true;render();positionPanel();markerStatus('已恢复默认位置，尚未保存')}
markers.addEventListener('pointerdown',e=>{if(!markerEditing||e.button!==0||!e.isPrimary)return;const node=e.target.closest('.marker');if(!node)return;e.preventDefault();cancelMarkerDrag();const item=items.find(i=>i[0]===node.dataset.id);markerDrag={node,item,start:[item[4],item[5]],x:e.clientX,y:e.clientY,rect:layout.getBoundingClientRect(),pointerId:e.pointerId};markers.setPointerCapture(e.pointerId)});
markers.addEventListener('pointermove',e=>{const d=markerDrag;if(!d||e.pointerId!==d.pointerId)return;e.preventDefault();applyMarkerPosition(d.item,d.node,d.start[0]+(e.clientX-d.x)/d.rect.width*100,d.start[1]+(e.clientY-d.y)/d.rect.height*100)});
markers.addEventListener('pointerup',e=>{if(!markerDrag||e.pointerId!==markerDrag.pointerId)return;const d=markerDrag;markerDrag=null;if(markers.hasPointerCapture(e.pointerId))markers.releasePointerCapture(e.pointerId);if(d.start[0]!==d.item[4]||d.start[1]!==d.item[5]){markerDirty=true;markerStatus('位置未保存')}});
markers.addEventListener('pointercancel',cancelMarkerDrag);markers.addEventListener('lostpointercapture',cancelMarkerDrag);window.addEventListener('resize',cancelMarkerDrag);window.addEventListener('blur',cancelMarkerDrag);window.addEventListener('pagehide',cancelMarkerDrag);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&markerEditing)editMarkerLayout(false)});
$('marker-save').onclick=saveMarkerLayout;$('marker-finish').onclick=()=>editMarkerLayout(false);
$('close-panel').innerHTML=icon('close');window.lightingUI={markerLayout:{positions:markerPositions,defaults:()=>JSON.parse(JSON.stringify(markerDefaults)),edit:editMarkerLayout,editing:()=>markerEditing,save:saveMarkerLayout,reset:resetMarkerLayout},select:choose,close:()=>$('close-panel').click(),items:()=>items.map(i=>({id:i[0],name:i[1],category:i[2],markerPosition:[i[4],i[5]],channels:objectChannels[i[0]]||[i[0]]})),selected:()=>selected,bounds:()=>items.find(i=>i[0]===selected)?.[6].slice(),completed:()=>[...completed]};panel.hidden=true;render();sync();
})();

// City-night developer controls, sharing the original Ctrl-hold convention.
(()=>{
 const layout=document.querySelector('.layout'),box=document.createElement('section');box.id='city-halo-dev';box.hidden=true;box.setAttribute('aria-label','开发者模式：城市光晕');
 const style=document.createElement('style');style.textContent='#city-halo-dev{position:absolute;z-index:12;right:2%;top:12%;width:27%;padding:1.2cqw;background:#112136f5;border:1px solid #607694;border-radius:1cqw;color:#ecf1f9}#city-halo-dev h2{font-size:1.25cqw;margin:0 0 1cqw}#city-halo-dev label{font-size:.9cqw;margin:.7cqw 0}#city-halo-dev input{width:100%;accent-color:#edc68d}#city-halo-dev button{font-size:.85cqw;min-height:2cqw}#city-halo-dev .dev-actions{display:flex;gap:.4cqw;flex-wrap:wrap}#city-halo-dev p{font-size:.8cqw;margin:.6cqw 0 0}';document.head.append(style);
 const titles={total:'总强度',stadium:'体育场',commercial:'商业综合体',billboard:'独立广告牌',road:'道路路灯'};
 box.innerHTML='<h2>开发者模式</h2><div class="dev-actions"><button id="marker-edit">拖动气泡位置</button><button id="marker-reset">恢复默认位置</button><button id="marker-export">导出气泡位置</button></div>'+Object.entries(titles).map(([k,t])=>range('city-halo-'+k,t,0,3,state.halo[k],.01)).join('')+'<div class="dev-actions"><button id="halo-save">保存参数</button><button id="halo-reset">恢复默认</button><button id="halo-export">导出参数</button><button id="halo-close">关闭</button></div><p id="halo-status" role="status">视觉演示参数</p>';layout.append(box);
 function sync(){for(const k in titles){$('city-halo-'+k).value=state.halo[k];$('o-city-halo-'+k).value=Math.round(state.halo[k]*100)+'%';}}
 for(const k in titles)$('city-halo-'+k).oninput=e=>{state.halo[k]=+e.target.value;sync();$('halo-status').textContent='未保存';changed()};
 $('halo-save').onclick=()=>{try{localStorage.setItem(haloStorage,JSON.stringify(state.halo));$('halo-status').textContent='已保存到本机';}catch{$('halo-status').textContent='本机存储不可用，请导出参数';}};
 $('halo-reset').onclick=()=>{Object.assign(state.halo,haloDefaults);sync();changed();$('halo-status').textContent='已恢复默认，保存后下次生效';};
 $('halo-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,halo:state.halo},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='city-halo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('marker-edit').onclick=()=>{box.hidden=true;lightingUI.markerLayout.edit(true)};$('marker-reset').onclick=()=>lightingUI.markerLayout.reset();$('marker-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,positions:lightingUI.markerLayout.positions()},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='city-night-marker-positions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 function toggle(){lightingUI.markerLayout.edit(false);box.hidden=!box.hidden;} $('halo-close').onclick=()=>{box.hidden=true;};
 let timer=0,held=false;function cancel(){clearTimeout(timer);timer=0;held=false;}
 document.addEventListener('keydown',e=>{if(e.key==='Control'&&!e.altKey&&!e.shiftKey&&!e.metaKey){if(!held&&!e.repeat){held=true;timer=setTimeout(()=>{timer=0;toggle();},3000);}}else cancel();});
 document.addEventListener('keyup',e=>{if(e.key==='Control')cancel();});window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});window.addEventListener('pagehide',cancel);sync();
})();

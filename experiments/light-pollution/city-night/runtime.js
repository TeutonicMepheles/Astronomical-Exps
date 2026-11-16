/* Standalone art preview. Linear-light composition; shared single frame scheduler. */
'use strict';
const W=2736,H=1536,$=id=>document.getElementById(id),cv=$('scene');
const gl=cv.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});
if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw Error('需要支持浮点帧缓冲的 WebGL2');
const labels={'public-pair':'公共建筑亮度','residential':'住宅窗灯','public':'公共建筑','commercial-windows':'商业窗灯','commercial-screens':'商业屏幕','billboard':'广告牌','stadium':'体育场','distant':'远景建筑'};
// These two window channels now belong exclusively to the fixed master.
const rasterChannels=Object.keys(labels).filter(k=>k!=='residential'&&k!=='public');
const names={road:'路灯',path:'步道灯',wall:'住宅墙灯',parking:'停车场地灯'};
const shades={open:'无遮挡',cap:'顶罩',half:'半遮光',full:'全遮光',off:'熄灯'};
const profiles={open:{mode:0,spill:1,ground:.60,width:1.8,beam:.24},cap:{mode:1,spill:.75,ground:.66,width:1.6,beam:.32},half:{mode:2,spill:.32,ground:.76,width:1.25,beam:.45},full:{mode:3,spill:.015,ground:.85,width:.68,beam:.65},off:{mode:3,spill:0,ground:0,width:.68,beam:0}};
const state={gains:Object.fromEntries(Object.keys(labels).map(k=>[k,1])),groups:Object.fromEntries(Object.keys(names).map(k=>[k,{shade:window.SCENE_LIGHT_LAYOUT.defaultShades?.[k]||(k==='road'?'half':'full'),useTiled:true,gain:1,spread:1,halo:.85}])),media:{time:0,paused:false},traffic:{gain:1,glare:.65,speed:1,paused:false,beam:'low'},park:{gain:.6},pair:{warmth:.5,shade:'full'},view:'scene',time:0};
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
$('fixtures').innerHTML=Object.entries(names).map(([k,n])=>`<section><div class="section-title"><b>${n}</b>${k==='parking'?'':`<select id="shade-${k}" aria-label="${n}灯罩">${Object.entries(shades).map(([v,l])=>`<option value="${v}" ${state.groups[k].shade===v?'selected':''}>${l}</option>`).join('')}</select>`}</div>${range(k+'-gain',n+'亮度',0,2,1,.01)}<div class="twins">${range(k+'-spread','范围',.45,1.8,1,.01)}${range(k+'-halo','光晕',0,1.5,.85,.01)}</div></section>`).join('');
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
for(const p of ['gain','glare','speed'])$('traffic-'+p).oninput=e=>{state.traffic[p]=+e.target.value;$('o-traffic-'+p).value=Math.round(+e.target.value*100)+'%';request()};
$('beam').onchange=e=>{state.traffic.beam=e.target.value;request()};
$('pause').onclick=()=>{state.traffic.paused=!state.traffic.paused;$('pause').textContent=state.traffic.paused?'继续车流':'暂停车流';last=0;request()};
$('view').onchange=e=>{state.view=e.target.value;request()};
for(const id of ['fixtures','buildings'])$('tab-'+id).onclick=()=>{for(const n of ['fixtures','buildings']){$(n).hidden=n!==id;$('tab-'+n).setAttribute('aria-pressed',String(n===id))}};
function all(value){for(const k in state.gains){state.gains[k]=value;$('gain-'+k).value=value;$('o-gain-'+k).value=value*100+'%'}for(const k in state.groups){state.groups[k].gain=value;$(k+'-gain').value=value;$('o-'+k+'-gain').value=value*100+'%'}state.traffic.gain=value;$('traffic-gain').value=value;$('o-traffic-gain').value=value*100+'%';changed()}

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');reducedMotion.addEventListener('change',()=>{last=0;request()});
const linear=`vec3 lin(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}vec3 enc(vec3 c){c=max(c,vec3(0));return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}`;
const vert=`#version 300 es
precision highp float;uniform vec4 rect;uniform vec4 camera;out vec2 uv;out vec2 world;
void main(){vec2 p=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1))[gl_VertexID];uv=p;world=rect.xy+p*rect.zw;gl_Position=vec4((world.x-camera.x)/camera.z*2.-1.,1.-(world.y-camera.y)/camera.w*2.,0,1);}`;
function program(body){function sh(type,s){const v=gl.createShader(type);gl.shaderSource(v,s);gl.compileShader(v);if(!gl.getShaderParameter(v,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(v));return v}const p=gl.createProgram(),v=sh(gl.VERTEX_SHADER,vert),f=sh(gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;in vec2 uv;in vec2 world;out vec4 frag;${linear}\n${body}`);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.deleteShader(v);gl.deleteShader(f);p.u={};return p}
const staticP=program(`uniform sampler2D base;${rasterChannels.map((k,i)=>`uniform sampler2D l${i};uniform float g${i};`).join('')}uniform vec3 pairTint;void main(){vec3 c=lin(texture(base,uv).rgb);${rasterChannels.map((k,i)=>`c+=lin(texture(l${i},uv).rgb)*g${i}${k==='public-pair'?'*pairTint':''};`).join('')}frag=vec4(c,1);}`);
const residentFixedP=program(window.RESIDENT_FIXED.fragment);
const finalP=program(`uniform sampler2D image;uniform vec4 view;void main(){vec2 p=(view.xy+uv*view.zw)/vec2(${W},${H});frag=vec4(clamp(enc(texture(image,vec2(p.x,1.-p.y)).rgb),0.,1.),1);}`);
const spriteP=program(`uniform sampler2D image;uniform sampler2D receivers;uniform vec4 crop;uniform vec3 tint;uniform float opacity;uniform float flip;uniform float occlude;void main(){vec2 p=vec2(mix(uv.x,1.-uv.x,flip),uv.y);vec4 c=texture(image,crop.xy+p*crop.zw);float a=c.a*opacity;if(occlude>.5)a*=texture(receivers,world/vec2(${W},${H})).a;frag=vec4(lin(c.rgb)*tint*a,a);}`);
// Four neighbouring baked views, blended in premultiplied linear light in one draw.
const carP=program(`uniform sampler2D image;uniform vec4 tiles;uniform vec2 blendView;uniform float opacity;
vec4 sampleCar(float tile){vec2 cell=vec2(mod(tile,16.),floor(tile/16.));vec4 c=texture(image,(cell+uv)/16.);return vec4(lin(c.rgb)*c.a,c.a);}
void main(){vec4 c=mix(mix(sampleCar(tiles.x),sampleCar(tiles.y),blendView.x),mix(sampleCar(tiles.z),sampleCar(tiles.w),blendView.x),blendView.y);frag=c*opacity;}`);
const lightP=program(`uniform sampler2D receivers;uniform vec3 color;uniform float gain;uniform float kind;uniform float channel;uniform float cutoff;uniform vec2 direction;
void main(){vec2 p=uv*2.-1.;float a=0.;if(kind<.5){a=exp(-3.8*dot(p,p))*pow(max(0.,1.-dot(p,p)),.7);vec4 m=texture(receivers,world/vec2(${W},${H}));a*=channel<.5?m.r:channel<1.5?m.g:channel<2.5?m.b:m.r;}
else if(kind<1.5){a=exp(-4.7*dot(p,p))*pow(max(0.,1.-dot(p,p)),1.2);if(cutoff>.5&&cutoff<1.5)a*=smoothstep(-.08,.10,p.y+abs(p.x)*.95);else if(cutoff>1.5&&cutoff<2.5)a*=smoothstep(-.015,.08,p.y);else if(cutoff>2.5)a*=smoothstep(0.,.12,p.y)*(1.-smoothstep(.06+.35*max(p.y,0.),.13+.52*max(p.y,0.),abs(p.x)));}
else if(kind<2.5){a=pow(max(0.,1.-dot(p,p)),2.);}
else if(kind<3.5){float y=direction.y<0.?1.-uv.y:uv.y;float width=.10+.85*y;float x=abs(p.x);a=(1.-smoothstep(width*.62,width,x))*pow(1.-y,1.6)*smoothstep(0.,.08,y);a*=texture(receivers,world/vec2(${W},${H})).r;}
else if(kind<4.5){float r=length(p);a=exp(-6.*r*r)*.52;float rays=pow(max(0.,1.-abs(p.x)*55.),3.)+pow(max(0.,1.-abs(p.y)*55.),3.);a+=rays*pow(max(0.,1.-r),3.)*.20;a*=pow(max(0.,1.-r*r),2.);}
else if(kind<5.5){float t=uv.y;float center=mix(direction.x,direction.y,t);float sigma=.012+.19*pow(t,.92);float side=(uv.x-center)/sigma;float veil=exp(-.5*side*side);float core=exp(-2.5*side*side);a=(veil*.65+core*.35)*exp(-1.35*t)*smoothstep(0.,.022,t)*(1.-smoothstep(.60,1.,t));a*=texture(receivers,world/vec2(${W},${H})).a;}
else if(kind<6.5){vec2 dir=normalize(direction);float along=dot(p,dir);float side=abs(p.x*dir.y-p.y*dir.x);a=exp(-2.8*dot(p,p))*smoothstep(0.,.08,along)*(1.-smoothstep(.06+.30*along,.14+.52*along,side))*pow(max(0.,1.-dot(p,p)),1.3);}
else if(kind<7.5){float t=uv.y;float depth=t/max(direction.x,.01);float x=uv.x-.5;float sigma=.009+.105*pow(max(depth,0.),.86);float core=exp(-.5*pow(x/sigma,2.));float veil=exp(-.5*pow(x/(sigma*1.85+.012),2.));float distanceFade=exp(-1.65*depth);float floorFade=1.-smoothstep(direction.x-direction.y*.45,direction.x+direction.y*1.35,t);float aperture=smoothstep(0.,.018,t);float edgeFade=1.-smoothstep(.39,.5,abs(x));a=(core*.64+veil*.20)*distanceFade*floorFade*aperture*edgeFade;}
else{float t=uv.y;float spread=.055+.42*pow(t,.7);float side=(uv.x-.5)/spread;a=exp(-2.8*side*side)*exp(-2.4*t)*smoothstep(0.,.045,t)*(1.-smoothstep(.65,1.,t));a*=texture(receivers,world/vec2(${W},${H})).b;}
if(kind>.5)a*=texture(receivers,world/vec2(${W},${H})).a;frag=vec4(color*gain*a,0);}`);
const additiveP=program(`uniform sampler2D image;uniform float gain;uniform vec4 crop;void main(){frag=vec4(lin(texture(image,crop.xy+uv*crop.zw).rgb)*gain,0);}`);
const shadowP=program(`uniform sampler2D receivers;uniform float opacity;uniform float groundOnly;void main(){vec2 p=uv*2.-1.;float a=exp(-4.*dot(p,p))*(1.-smoothstep(.65,1.,length(p)))*opacity*mix(1.,texture(receivers,world/vec2(${W},${H})).r,groundOnly);frag=vec4(0.,0.,0.,a);}`);
const neighborhoodP=program(`uniform sampler2D openLight;uniform sampler2D fullLight;uniform float shield;uniform float gain;uniform vec3 tint;void main(){vec3 c=mix(lin(texture(openLight,uv).rgb),lin(texture(fullLight,uv).rgb),shield);frag=vec4(c*gain*tint,0);}`);
const cityHaloP=program(`uniform vec4 sources;uniform float total;uniform sampler2D fixedBase;uniform sampler2D fixedReceivers;uniform vec4 fixedRect;float haze(vec2 center,vec2 radius){return pow(max(0.,1.-length((world/vec2(${W},${H})-center)/radius)),1.5);}void main(){float a=haze(vec2(.31,.43),vec2(.32,.30))*sources.x*.12;float b=haze(vec2(.73,.50),vec2(.26,.27))*sources.y*.10;float c=haze(vec2(.63,.61),vec2(.20,.25))*sources.z*.09;float d=(haze(vec2(.50,.55),vec2(.11,.41))*.07+haze(vec2(.50,.84),vec2(.45,.13))*.045)*sources.w;float canopy=haze(vec2(.50,.40),vec2(.58,.31))*dot(sources,vec4(.25))*.035;vec2 localUV=(world-fixedRect.xy)/fixedRect.zw;float inLocal=step(0.,localUV.x)*step(0.,localUV.y)*step(localUV.x,1.)*step(localUV.y,1.);float visibleHalo=1.;if(inLocal>.5)visibleHalo-=texture(fixedReceivers,localUV).a*texture(fixedBase,localUV).a*.995;frag=vec4(visibleHalo*total*(lin(vec3(.96,.78,.52))*a+lin(vec3(.77,.71,.88))*b+lin(vec3(.63,.79,.93))*c+lin(vec3(.93,.82,.64))*d+lin(vec3(.84,.70,.57))*canopy),0.);}`);
function haloSources(){return [state.halo.stadium*state.gains.stadium,state.halo.commercial*(state.gains['commercial-screens']*.8+state.gains['commercial-windows']*.2),state.halo.billboard*state.gains.billboard,state.halo.road*state.groups.road.gain*(profiles[state.groups.road.shade].spill/.32)];}
function renderCityHalo(){if(state.halo.total<=0)return;use(cityHaloP);v(cityHaloP,'sources',haloSources());f(cityHaloP,'total',state.halo.total);bind(cityHaloP,'fixedBase',textures['resident-fixed-base']);bind(cityHaloP,'fixedReceivers',textures['resident-fixed-receivers'],1);v(cityHaloP,'fixedRect',window.RESIDENT_FIXED.rect);gl.blendFunc(gl.ONE,gl.ONE);quad(cityHaloP,[0,0,W,H]);}
const textures={},textureList=[],buffers=[],programs=[staticP,finalP,spriteP,carP,lightP,additiveP,shadowP,neighborhoodP,cityHaloP,residentFixedP];
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
 const radius=(road?85:60)*sz*a.spread*(.30+p.spill);
 if(shade==='cap'){for(const dx of [-.82,.82])light(ex,ey,100*sz*a.spread,100*sz*a.spread,c,g*a.halo*.11,6,0,0,[dx,-.58]);}
 light(ex,ey,radius,radius,c,g*a.halo*p.spill*.40,1,0,p.mode);
 light(ex,ey,16*sz,16*sz,c,g*a.halo*.18,1,0,p.mode);
 const aperture={open:[8,8],cap:[7,5],half:[6,3],full:[5,1.5]}[shade];light(ex,ey,aperture[0]*sz,aperture[1]*sz,c,g*(shade==='full'?.65:1),2);
 }
 // Building fixtures and all their received light belong to generated neighborhood fields.
 const a=state.groups.parking;for(const p of parking){sprite('ground-fixture',[p.x-3.6*p.s,p.y-1.6*p.s,7.2*p.s,3.2*p.s]);light(p.x,p.y,21*p.s*a.spread,8*p.s*a.spread,[1,.75,.42],a.gain*.08,0,0);light(p.x,p.y,12*p.s*a.spread,9*p.s*a.spread,[1,.78,.48],a.gain*a.halo*.055,1);light(p.x,p.y,2.3*p.s,1*p.s,[1,.88,.65],a.gain*.7,2);}
}
function renderAmbient(){const stadium=state.gains.stadium*2.6;
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
function rebuild(){gl.bindFramebuffer(gl.FRAMEBUFFER,cached.fb);gl.disable(gl.BLEND);use(staticP);v(staticP,'pairTint',pairTint());bind(staticP,'base',textures.base);rasterChannels.forEach((k,i)=>{bind(staticP,'l'+i,textures[k],i+1);f(staticP,'g'+i,state.gains[k]*(k==='stadium'?1.35:1))});quad(staticP,[0,0,W,H]);gl.enable(gl.BLEND);renderResidentFixed();renderPark();renderBuildingWalls();renderLamps();renderAmbient();renderCityHalo();dirty=false;staticDraws++}
const mod=x=>((x%1)+1)%1;
// Fixed scene camera, independent of the UI detail crop. Values are art calibration.
function carView(c){
 const atlas=meta['car-angles'],focal=1400,dx=1368-c.x,near=Math.hypot(focal,dx);
 const yaw=c.horizontal?Math.atan2(c.right?-focal:focal,c.right?dx:-dx):Math.atan2(c.incoming?dx:-dx,c.incoming?focal:-focal);
 const pitch=Math.atan2(Math.max(0,c.y-558),near),az=mod(yaw/(2*Math.PI))*atlas.yawCount,el=Math.min(atlas.pitchCount-1,pitch*180/Math.PI/atlas.pitchStep);
 const i=Math.floor(az),j=Math.floor(el),next=(i+1)%atlas.yawCount,up=Math.min(j+1,atlas.pitchCount-1);
 const size=c.horizontal?1.02:1.48*c.s,F=atlas.frameSize;
 return {...c,yaw,pitch,tiles:[j*atlas.yawCount+i,j*atlas.yawCount+next,up*atlas.yawCount+i,up*atlas.yawCount+next],blend:[az-i,el-j],spriteScale:size,shadowDepth:atlas.scale*size*(.96*Math.abs(Math.sin(yaw))+1.96*Math.abs(Math.cos(yaw)))*Math.sin(pitch)+6,spriteRect:[c.x-atlas.pivot[0]*size,c.y-atlas.pivot[1]*size,F*size,F*size],w:2*atlas.scale*size*(.96*Math.abs(Math.cos(yaw))+1.96*Math.abs(Math.sin(yaw))),h:atlas.scale*size*(1.4*Math.cos(pitch)+3.9*Math.sin(pitch))};
}
function poses(time=state.time){const cars=[];for(let lane=0;lane<2;lane++)for(let i=0;i<4;i++){const incoming=lane===0,phase=mod(i/4+(incoming?1:-1)*time*.024),depth=25*Math.pow(48,phase),y=558+depth,s=depth/960,x=incoming?1377+depth*.076:1368-depth*.18,w=64*s;cars.push({id:`v${lane}-${i}`,x,y,w,h:w*meta[incoming?'car-front':'car-rear'].aspect,s,incoming,horizontal:false,phase,opacity:Math.max(0,Math.min(1,(depth-25)/28,(1-phase)/.035))});}
for(let lane=0;lane<2;lane++)for(let i=0;i<3;i++){const right=lane===0,phase=mod(i/3+(right?1:-1)*time*.017),x=-180+phase*(W+360),y=right?1408:1361,opacity=Math.max(0,Math.min(1,(x-540)/80,(1620-x)/80));cars.push({id:`h${lane}-${i}`,x,y,w:92,h:92*meta['car-side'].aspect,s:.88,incoming:false,horizontal:true,right,phase,opacity});}return cars.map(carView).sort((a,b)=>a.y-b.y)}
function roadVisible(x,y){return x>=0&&x<=W&&y>=558&&y<=H&&!(y>1340&&x<495)&&!(y>1380&&x>1660)}
function carLights(c){
 const k=meta['car-angles'].scale*c.spriteScale,sa=Math.sin(c.yaw),ca=Math.cos(c.yaw),se=Math.sin(c.pitch),ce=Math.cos(c.pitch),lamps=[];
 for(const end of [-1,1]){const visibility=Math.max(0,Math.min(1,end*ca/.22));if(visibility<=0)continue;
 for(const side of [-1,1]){const x=side*.54,z=end>0?1.958:-1.908;lamps.push({x:c.x+k*(ca*x-sa*z),y:c.y-k*(ce*.615-se*(sa*x+ca*z)),front:end>0,visibility});}}
 return lamps;
}
function carLampPoints(c){return carLights(c).map(l=>[l.x,l.y])}
function drawCar(c){use(carP);bind(carP,'image',textures['car-angles']);v(carP,'tiles',c.tiles);v(carP,'blendView',c.blend);f(carP,'opacity',c.opacity);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);quad(carP,c.spriteRect)}
function drawTraffic(){const cars=poses().filter(c=>c.opacity>.001&&roadVisible(c.x,c.y)),a=state.traffic,high=a.beam==='high';for(const c of cars){const g=a.gain*c.opacity;if(c.horizontal){light(c.x+(c.right?55:-55),c.y,90,19,[1,.85,.61],g*.10,0);continue}if(c.incoming){light(c.x,c.y+32*c.s,54*c.s,35*c.s,[1,.86,.65],g*(high?.23:.11),0);light(c.x,c.y+(high?115:70)*c.s,45*c.s,(high?110:65)*c.s,[1,.88,.70],g*(high?.13:.06),3)}else light(c.x,c.y-38*c.s,25*c.s,47*c.s,[1,.83,.57],g*.03,0)}
for(const c of cars){contactShadow(c.x,c.y,c.w*.60,c.shadowDepth,c.opacity*.72);contactShadow(c.x,c.y,c.w*.43,c.shadowDepth*.65,c.opacity*.85);drawCar(c);}
for(const c of cars){for(const lamp of carLights(c)){const {x,y,front,visibility}=lamp,g=a.gain*c.opacity*visibility,color=front?[1,.87,.68]:[1,.055,.014];light(x,y,3.5*c.s,1.7*c.s,color,g*.9,2);const lens=g*a.glare*(front?(high?3.2:1.4):.05)*Math.pow(Math.min(1,c.s),.75);light(x,y,95*c.s,95*c.s,color,lens*.95,4);light(x,y,200*c.s,150*c.s,color,lens*.055,1);light(x,y,22*c.s,22*c.s,color,lens*.9,1);if(front&&high)light(x+(W*.5-x)*.18,y+(H*.5-y)*.18,12*c.s,12*c.s,[.4,.6,1],lens*.025,1)}}return cars;}

function request(){if(!pending&&!dead&&!document.hidden)pending=requestAnimationFrame(tick)}
function tick(now){pending=0;if(!ready||dead||document.hidden)return;let start=performance.now();const dt=last?Math.max(0,Math.min(.07,(now-last)/1000)):0;if(!state.traffic.paused)state.time+=dt*state.traffic.speed;last=now;gl.viewport(0,0,W,H);renderView=views[state.view];if(cachedView!==state.view){dirty=true;cachedView=state.view}if(dirty)rebuild();gl.disable(gl.BLEND);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,cached.fb);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,frame.fb);gl.blitFramebuffer(0,0,W,H,0,0,W,H,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,frame.fb);gl.enable(gl.BLEND);drawTraffic();gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.BLEND);renderView=[0,0,W,H];use(finalP);bind(finalP,'image',frame.t);v(finalP,'view',[0,0,W,H]);quad(finalP,[0,0,W,H]);frames++;timings.push(performance.now()-start);if(timings.length>600)timings.shift();if(!state.traffic.paused&&state.traffic.speed>0)request()}
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(pending);pending=0}else request()});
window.addEventListener('pagehide',()=>{dead=true;cancelAnimationFrame(pending);textureList.forEach(t=>gl.deleteTexture(t));buffers.forEach(b=>gl.deleteFramebuffer(b));programs.forEach(p=>gl.deleteProgram(p));});
window.scenePreview={state:()=>JSON.parse(JSON.stringify(state)),camera:()=>views[state.view].slice(),poses:()=>poses(),lampPoints:()=>poses().map(c=>({id:c.id,points:carLampPoints(c)})),setMediaTime:t=>{state.media.time=t;request()},setTime:t=>{state.time=t;last=0;request()},stats:()=>({frames,staticDraws,uploads,canvas:[W,H],errors:gl.getError(),frameCpuMs:timings.slice(),fixtureCount:lamps.filter(l=>l.x<2000).length+2+window.SCENE_LIGHT_LAYOUT.wholeFixtures.length+window.SCENE_LIGHT_LAYOUT.parkBollards.length,parkCount:window.SCENE_LIGHT_LAYOUT.parkBollards.length,parkingCount:parking.length,textureCount:textureList.length}),fixtures:()=>window.SCENE_LIGHT_LAYOUT.wholeFixtures.map(l=>{const m=meta['whole-road-'+(state.groups[l.group].useTiled?l.defaultShade:state.groups[l.group].shade)],[x,y,w,h]=l.rect;return {id:l.id,group:l.group,foot:[x+w*.5,y+h*1900/2048],emitter:[x+(l.flip?2048-m.emitterFrame[0]:m.emitterFrame[0])*w/2048,y+m.emitterFrame[1]*h/2048]}}),layout:()=>JSON.parse(JSON.stringify(window.SCENE_LIGHT_LAYOUT)),pixel:(x,y)=>{const p=new Uint8Array(4);gl.readPixels(x,H-1-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p)}};
async function load(){const manifest=await getManifest();for(const r of manifest.runtime){let im=new Image();im.src=window.EMBEDDED?.[r.name]||(r.path+'?v='+r.sha256.slice(0,16));await im.decode();if(r.uploadCrop){const b=await createImageBitmap(im,...r.uploadCrop,{premultiplyAlpha:'none',colorSpaceConversion:'none'});textures[r.name]=texture(b);b.close()}else textures[r.name]=texture(im);meta[r.name]=r;}cached=target();frame=target();ready=true;tick(performance.now());$('loading').hidden=true;document.body.dataset.ready='true'}
async function getManifest(){return window.BUNDLE||fetch('runtime-manifest.json',{cache:'no-store'}).then(r=>r.json())}
load().catch(e=>{$('loading').textContent=e.message;console.error(e)});



// Presentation UI owns only selection and delegates values to the existing controls.
(()=>{
const items=[
 ['road','路灯','灯具','♧',47,64,[990,1030,840,471.58]],['park','公园','公园','♧',31,72,[350,920,900,400]],['public-pair','公共建筑','建筑','▥',13,66,[0,770,540,470]],['parking','停车场地灯','灯具','⊙',64,78,[1470,1040,550,320]],
 ['residential','住宅','建筑','▦',86,82,[1930,920,730,500]],['public','公共建筑','建筑','▥',80,75,[1930,920,480,350]],['commercial-windows','商业综合体','商业','▤',71,55,[1600,620,760,430]],['billboard','广告牌','商业','▣',59,66,[1450,820,500,350]],['stadium','体育场','体育场','◉',34,45,[500,480,760,470]],['distant','远景建筑','远景','▥',52,36,[600,350,1300,450]],['traffic','动态车流','车流','↔',49,85,[1100,900,650,400]]
];
const icon=id=>id==='park'?'<svg class="ui-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 24V15M4 15h10L9 4zM4 28h24M20 20h8M20 24h8M21 24v4m6-4v4"/></svg>':'<img class="ui-icon" alt="" aria-hidden="true" src="'+(window.UI_ICONS?.[id]||'assets/ui/'+id+'.png')+'">';const categoryIcons={'总览':'home','灯具':'road','建筑':'residential','商业':'commercial-windows','体育场':'stadium','远景':'distant','车流':'traffic'};
let selected=null,zoom=false;const completed=new Set();
const markers=document.querySelector('.markers'),panel=document.querySelector('aside'),body=$('panel-body'),layout=document.querySelector('.layout');
const objectChannels={'residential':['residential','wall'],'commercial-windows':['commercial-windows','commercial-screens']};
const controls={};for(const id of [...Object.keys(names),...Object.keys(labels),'traffic'])controls[id]=id==='traffic'?document.querySelector('.traffic'):names[id]?$(id+'-gain').closest('section'):$('gain-'+id).closest('label');
// Keep fixed calibration controls outside user-facing fixture panels.
for(const id of ['road','wall','parking'])document.querySelector('.legacy-controls').append(controls[id].querySelector('.twins'));
for(const [id,channels] of Object.entries(objectChannels)){const group=document.createElement('section');group.className='object-controls';for(const channel of channels)group.append(controls[channel]);controls[id]=group}

const parkControls=document.createElement('section');parkControls.innerHTML=range('park-gain','公园亮度',0,1,state.park.gain,.01);document.querySelector('.legacy-controls').append(parkControls);controls.park=parkControls;$('park-gain').oninput=e=>{state.park.gain=+e.target.value;$('o-park-gain').value=Math.round(+e.target.value*100)+'%';changed()};
const pairControls=document.createElement('section');pairControls.append(controls['public-pair']);pairControls.insertAdjacentHTML('beforeend',range('pair-warmth','冷暖',0,1,.5,.01));controls['public-pair']=pairControls;document.querySelector('.legacy-controls').append(pairControls);$('pair-warmth').oninput=e=>{state.pair.warmth=+e.target.value;$('o-pair-warmth').value=Math.round(+e.target.value*100)+'%';changed()};
const shadeChoices={};for(const id of ['road','wall','public-pair']){const div=document.createElement('div');div.className='shade-choices';for(const [key,title] of Object.entries(shades)){let b=document.createElement('button');b.innerHTML='<span aria-hidden="true">'+(id==='road'||id==='path'?'<img class="ui-icon fixture-thumb" alt="" src="'+(window.LAMP_THUMBS?.[key]||'assets/lamp-thumbs/'+key+'.png')+'">':icon('shade-'+key))+'</span>'+title;b.onclick=()=>{if(id==='public-pair'){state.pair.shade=key;changed()}else{$('shade-'+id).value=key;$('shade-'+id).dispatchEvent(new Event('change'));}markComplete(selected);sync()};b.dataset.shade=key;div.append(b)}if(id==='public-pair'){const title=document.createElement('b');title.textContent='墙灯灯罩';title.style.fontSize='1cqw';controls[id].append(title)}controls[id].append(div);shadeChoices[id]=div}
function sync(){if(selected==='road'||selected==='path'){const image=document.querySelector('.object-preview');image.src=window.LAMP_HERO?.[state.groups[selected].shade]||'assets/lamp-hero/'+state.groups[selected].shade+'.png';image.classList.add('lamp-preview');image.alt=shades[state.groups[selected].shade]+'完整路灯'}else document.querySelector('.object-preview').classList.remove('lamp-preview');if($('pause'))$('pause').innerHTML=icon(state.traffic.paused?'play':'pause')+(state.traffic.paused?'继续车流':'暂停车流');for(const input of document.querySelectorAll('input[type=range]'))input.style.setProperty('--fill',((input.value-input.min)/(input.max-input.min)*100)+'%');for(const [id,div] of Object.entries(shadeChoices))for(const b of div.children)b.setAttribute('aria-pressed',String(b.dataset.shade===(id==='public-pair'?state.pair.shade:state.groups[id].shade)))}
document.addEventListener('input',sync);document.addEventListener('change',sync);
function markComplete(id){if(completed.has(id))return;completed.add(id);const marker=markers.querySelector('[data-id="'+id+'"]');if(marker){const badge=document.createElement('span');badge.className='completion';badge.textContent='✓';badge.setAttribute('aria-hidden','true');marker.append(badge);marker.setAttribute('aria-label',items.find(i=>i[0]===id)[1]+'调节，已完成')}}
body.addEventListener('input',e=>{if(e.target.matches('input[type=range]')&&selected)markComplete(selected)});
body.addEventListener('change',e=>{if(e.target.id==='beam'&&selected)markComplete(selected)});
function frameDetail(){const box=items.find(i=>i[0]===selected)[6],fraction=panel.offsetWidth/layout.clientWidth,margin=.02,gap=.035,available=1-fraction-margin*2-gap,dock=box[0]+box[2]/2>=W/2?'left':'right',width=Math.min(W,Math.max(box[2]/available,box[3]/.96*W/H)),height=width*H/W,target=dock==='left'?margin+fraction+gap+available/2:margin+available/2;const camera=[Math.max(0,Math.min(W-width,box[0]+box[2]/2-target*width)),Math.max(0,Math.min(H-height,box[1]+box[3]/2-height/2)),width,height];if(!views.detail||camera.some((v,i)=>Math.abs(v-views.detail[i])>.01)){views.detail=camera;dirty=true;request()}panel.dataset.dock=dock;return dock;}
function positionPanel(){if(panel.hidden||!selected)return;const r=layout.getBoundingClientRect();panel.dataset.detail=String(zoom);if(zoom){const dock=frameDetail();panel.style.left=(dock==='left'?r.width*.015:r.width*.985-panel.offsetWidth)+'px';panel.style.top=Math.max(r.width*.015,(r.height-panel.offsetHeight)/2)+'px';return}const item=items.find(i=>i[0]===selected),gap=r.width*.025,edge=r.width*.015,bw=r.width*.028;
 const x=r.width*item[4]/100,y=r.height*item[5]/100-bw/2,pw=panel.offsetWidth,ph=panel.offsetHeight;
 // Reserve the object's complete scene bounds, rather than only its marker.
 const bounds=selected==='residential'||selected==='public'?[1930,920,730,500]:item[6],objectLeft=bounds[0]/W*r.width,objectRight=(bounds[0]+bounds[2])/W*r.width;
 const rightSpace=r.width-edge-objectRight,leftSpace=objectLeft-edge,preferRight=objectLeft+objectRight<r.width;
 const right=rightSpace>=pw+gap&&(preferRight||leftSpace<pw+gap);let left=right?objectRight+gap:objectLeft-gap-pw;left=Math.max(edge,Math.min(r.width-pw-edge,left));
 const top=Math.max(edge,Math.min(r.height-ph-edge,y-ph/2));panel.style.left=left+'px';panel.style.top=top+'px';panel.dataset.side=right?'right':'left';panel.style.setProperty('--anchor-y',Math.max(18,Math.min(ph-18,y-top))+'px');}
new ResizeObserver(positionPanel).observe(layout);new ResizeObserver(positionPanel).observe(panel);
function choose(id){if(id==='path')id='road';if(id==='wall')id='residential';if(id==='commercial-screens')id='commercial-windows';const item=items.find(i=>i[0]===id);if(!item)return;selected=id;zoom=false;state.view='scene';$('view').value='scene';$('detail').textContent='查看局部';for(const child of [...body.children])document.querySelector('.legacy-controls').append(child);body.replaceChildren(controls[id]);panel.hidden=false;$('panel-title').innerHTML=icon(id==='public-pair'?'public':id)+item[1];const img=document.querySelector('.object-preview');img.src=window.UI_THUMBNAILS?.[id]||'previews/ui-'+id+'.jpg';img.alt=item[1]+'场景局部';render();sync();positionPanel();request()}
function render(){markers.replaceChildren();for(const i of items){const b=document.createElement('button');b.className='marker';b.dataset.id=i[0];b.style.left=i[4]+'%';b.style.top=i[5]+'%';b.hidden=zoom;b.innerHTML='<span aria-hidden="true">'+icon(i[0]==='public-pair'?'public':i[0])+'</span>'+(completed.has(i[0])?'<span class="completion" aria-hidden="true">✓</span>':'');b.setAttribute('aria-label',i[1]+'调节'+(completed.has(i[0])?'，已完成':''));b.setAttribute('aria-pressed',String(i[0]===selected&&!panel.hidden));b.setAttribute('aria-expanded',String(i[0]===selected&&!panel.hidden));b.onclick=()=>choose(i[0]);markers.append(b)}}
$('close-panel').onclick=()=>{panel.hidden=true;state.view='scene';zoom=false;render();request()};cv.addEventListener('click',()=>{if(!panel.hidden)$('close-panel').click()});document.addEventListener('keydown',e=>{if(e.key==='Escape')$('close-panel').click()});
$('detail').onclick=()=>{zoom=!zoom;state.view=zoom?'detail':'scene';$('detail').textContent=zoom?'返回全景':'查看局部';render();positionPanel();request()};
$('close-panel').innerHTML=icon('close');const pauseAction=$('pause').onclick;$('pause').onclick=()=>{pauseAction();sync()};
window.lightingUI={select:choose,close:()=>$('close-panel').click(),items:()=>items.map(i=>({id:i[0],name:i[1],category:i[2],channels:objectChannels[i[0]]||[i[0]]})),selected:()=>selected,bounds:()=>items.find(i=>i[0]===selected)?.[6].slice(),completed:()=>[...completed]};panel.hidden=true;render();sync();
})();

// City-night developer controls, sharing the original Ctrl-hold convention.
(()=>{
 const layout=document.querySelector('.layout'),box=document.createElement('section');box.id='city-halo-dev';box.hidden=true;box.setAttribute('aria-label','开发者模式：城市光晕');
 const style=document.createElement('style');style.textContent='#city-halo-dev{position:absolute;z-index:12;right:2%;top:12%;width:27%;padding:1.2cqw;background:#112136f5;border:1px solid #607694;border-radius:1cqw;color:#ecf1f9}#city-halo-dev h2{font-size:1.25cqw;margin:0 0 1cqw}#city-halo-dev label{font-size:.9cqw;margin:.7cqw 0}#city-halo-dev input{width:100%;accent-color:#edc68d}#city-halo-dev button{font-size:.85cqw;min-height:2cqw}#city-halo-dev .dev-actions{display:flex;gap:.4cqw;flex-wrap:wrap}#city-halo-dev p{font-size:.8cqw;margin:.6cqw 0 0}';document.head.append(style);
 const titles={total:'总强度',stadium:'体育场',commercial:'商业综合体',billboard:'独立广告牌',road:'道路路灯'};
 box.innerHTML='<h2>开发者模式 · 城市光晕</h2>'+Object.entries(titles).map(([k,t])=>range('city-halo-'+k,t,0,3,state.halo[k],.01)).join('')+'<div class="dev-actions"><button id="halo-save">保存参数</button><button id="halo-reset">恢复默认</button><button id="halo-export">导出参数</button><button id="halo-close">关闭</button></div><p id="halo-status" role="status">视觉演示参数</p>';layout.append(box);
 function sync(){for(const k in titles){$('city-halo-'+k).value=state.halo[k];$('o-city-halo-'+k).value=Math.round(state.halo[k]*100)+'%';}}
 for(const k in titles)$('city-halo-'+k).oninput=e=>{state.halo[k]=+e.target.value;sync();$('halo-status').textContent='未保存';changed()};
 $('halo-save').onclick=()=>{try{localStorage.setItem(haloStorage,JSON.stringify(state.halo));$('halo-status').textContent='已保存到本机';}catch{$('halo-status').textContent='本机存储不可用，请导出参数';}};
 $('halo-reset').onclick=()=>{Object.assign(state.halo,haloDefaults);sync();changed();$('halo-status').textContent='已恢复默认，保存后下次生效';};
 $('halo-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,halo:state.halo},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='city-halo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function toggle(){box.hidden=!box.hidden;} $('halo-close').onclick=()=>{box.hidden=true;};
 let timer=0,held=false;function cancel(){clearTimeout(timer);timer=0;held=false;}
 document.addEventListener('keydown',e=>{if(e.key==='Control'&&!e.altKey&&!e.shiftKey&&!e.metaKey){if(!held&&!e.repeat){held=true;timer=setTimeout(()=>{timer=0;toggle();},3000);}}else cancel();});
 document.addEventListener('keyup',e=>{if(e.key==='Control')cancel();});window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});window.addEventListener('pagehide',cancel);sync();
})();

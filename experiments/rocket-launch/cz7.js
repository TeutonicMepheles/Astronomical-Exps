import {smooth,releasedAppearance} from './flight-presentation.js';
import {SOURCE_GEOMETRY} from './assets/cz7/asset-geometry.js';
// CZ-7 basic variant. One geometry owns exterior, cutaway, assembly and separation.
// Native source aspect ratios are preserved; axial partitions are educational.
export const HEIGHT=700;
export const PARTS=[
 {id:'lower',name:'一级',role:'贮箱和两台发动机组成一级，耗尽后与二级分离。'},
 {id:'upper',name:'二级',role:'有独立贮箱和四台发动机，一级分离后继续推进。'},
 {id:'boosters',name:'四枚助推器',role:'环绕一级，起飞时共同提供推力，先于一级分离。'},
 {id:'payload',name:'载荷',role:'安装在二级顶部，发射时由整流罩包覆。'},
 {id:'fairing',name:'整流罩',role:'保护载荷，飞出稠密大气后分成两片抛离。'}
];

// Hit rectangles use the same axial coordinates as the cutaway rendering.
export const INTERNAL_PARTS=[
 {name:'一级液氧箱',role:'储存液氧，为一级发动机提供氧化剂。',box:[-16,355,32,130]},
 {name:'一级煤油箱',role:'储存煤油，与液氧一同供给一级发动机。',box:[-16,495,32,110.5]},
 {name:'一级发动机',role:'两台发动机燃烧煤油和液氧，向后喷气产生推力。',box:[-21,676,42,24]},
 {name:'二级液氧箱',role:'储存液氧，供二级发动机继续工作。',box:[-16,183,32,55]},
 {name:'二级煤油箱',role:'储存煤油，供二级发动机继续工作。',box:[-16,248,32,46.75]},
 {name:'二级发动机',role:'四台发动机在一级分离后继续推进。',box:[-20,303,40,20]}
];
export const STRUCTURE_PARTS=[...PARTS,...INTERNAL_PARTS];
export function hitStructure(images,x,y,{xray=false}={}){
 if(xray){for(let i=INTERNAL_PARTS.length-1;i>=0;i--){const [left,top,w,h]=INTERNAL_PARTS[i].box;if(x>=left-3&&x<=left+w+3&&y>=top-4&&y<=top+h+4)return PARTS.length+i;}}
 return hitPart(images,x,y,{xray});
}

const sprite=(asset,x,y,w,h,extra={})=>({asset,x,y,w,h,...extra});
const core=SOURCE_GEOMETRY.core,k=HEIGHT/core.height,cuts=core.cuts.map(y=>y*k),coreW=core.width*k;
const booster=SOURCE_GEOMETRY.booster,boosterH=350,boosterW=booster.width/booster.height*boosterH;
const payload=SOURCE_GEOMETRY.payload,payloadH=114,payloadW=payload.width/payload.height*payloadH;
export const GEOMETRY=[
 [sprite('interstage',-coreW/2,cuts[2],coreW,cuts[3]-cuts[2]),sprite('lower-stage',-coreW/2,cuts[3],coreW,HEIGHT-cuts[3])],
 [sprite('upper-stage',-coreW/2,cuts[1],coreW,cuts[2]-cuts[1])],
 [-16,16,-42,42].map((cx,index)=>sprite('booster',cx-boosterW/2,350,boosterW,boosterH,{rear:index<2,index})),
 [sprite('payload',-payloadW/2,50,payloadW,payloadH)],
 [sprite('fairing-left',-coreW/2,0,coreW/2,cuts[1]),sprite('fairing-right',0,0,coreW/2,cuts[1])]
];
const ASSETS=['fairing','fairing-left','fairing-right','upper-stage','interstage','lower-stage','booster','payload','oxygen-tank','fuel-tank','nozzle'];
export function loadRocketAssets(onReady){const images={};for(const name of ASSETS){const im=new Image();im.onload=onReady;im.src=`assets/cz7/${name}.png`;images[name]=im;}return images;}
export function flightState(t){return{boosters:Math.max(0,Math.min(1,(t-2)/1.5)),lower:Math.max(0,Math.min(1,(t-5)/1.5)),fairing:Math.max(0,Math.min(1,(t-8)/1.5)),payload:Math.max(0,Math.min(1,(t-11)/1.5)),activeStage:t<5?'一级工作':t<11?'二级工作':'载荷释放',phase:t<2?'起飞':t<5?'助推器分离':t<8?'一级与二级分离':t<11?'整流罩分离':'载荷分离'};}
export function instances({t=0,xray=false,flight=false}={}){const state=flightState(t),out=[];if(flight)for(const key of ['boosters','lower','fairing','payload'])state[key]=smooth(state[key]);for(const [part,group] of GEOMETRY.entries())for(const r of group){const item={...r,part,alpha:1,angle:0};if(part===2){const side=[-1,1,-1,1][r.index],distance=[100,100,190,190][r.index];item.x+=side*distance*state.boosters;item.y+=120*state.boosters;item.angle=side*.18*state.boosters;}if(part===0){item.x-=75*state.lower;item.y+=240*state.lower;item.angle=-.10*state.lower;}if(part===4){const side=r.x<0?-1:1;item.x+=side*160*state.fairing;item.y+=90*state.fairing;item.angle=side*.26*state.fairing;item.alpha=xray?.14:1;}if(part===3)item.y-=85*state.payload;out.push(flight?releasedAppearance(part,item,t,state):item);}return out;}
export function drawSprite(ctx,images,r){const im=images[r.asset];if(!im?.naturalWidth)return;ctx.save();ctx.globalAlpha*=r.alpha??1;ctx.translate(r.x+r.w/2,r.y+r.h/2);ctx.rotate(r.angle||0);const scale=r.fit==='cover'?Math.max(r.w/im.naturalWidth,r.h/im.naturalHeight):Math.min(r.w/im.naturalWidth,r.h/im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();}
function tank(ctx,images,name,x,y,w,h){ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,[w/2]);ctx.clip();ctx.filter='grayscale(1)';drawSprite(ctx,images,sprite(name,x,y,w,h,{fit:'cover'}));ctx.restore();ctx.strokeStyle='#cbd1d8';ctx.lineWidth=.8;ctx.beginPath();ctx.roundRect(x,y,w,h,[w/2]);ctx.stroke();}
function nozzles(ctx,images,upper){for(const r of upper?[[-14,307],[-4,307],[6,307],[16,307]]:[[-11,681],[11,681]])drawSprite(ctx,images,sprite('nozzle',r[0]-4,r[1],8,11));}
function plume(ctx,x,y,w,h,time){ctx.save();const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#fff8dc');g.addColorStop(.25,'#ffd998');g.addColorStop(1,'#e3984500');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.quadraticCurveTo(x-w*.35,y+h*.55,x,y+h*(.94+.06*Math.sin(time*18)));ctx.quadraticCurveTo(x+w*.35,y+h*.55,x+w/2,y);ctx.fill();ctx.restore();}
export function drawRocket(ctx,images,{x=570,y=40,height=560,t=0,xray=false,selected=null,ignited=false,installed=null,rotation=0,flight=false,exhaustTime=t}={}){
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(height/700,height/700);const state=flightState(t),all=instances({t,xray,flight}),isInstalled=i=>!installed||installed.has(i);const draw=r=>{if(!isInstalled(r.part)||(r.alpha??1)<=0)return;drawSprite(ctx,images,r);};
 all.filter(r=>r.rear).forEach(draw);
 all.filter(r=>r.part===0||r.part===1).forEach(r=>{if(xray){ctx.save();ctx.globalAlpha=.19;draw(r);ctx.restore();}else draw(r);});
 if(xray){for(const [part,top,h] of [[1,183,55],[0,355,130]]){if(!isInstalled(part))continue;ctx.save();if(part===0){ctx.translate(-75*state.lower,240*state.lower);ctx.rotate(-.1*state.lower);}tank(ctx,images,'oxygen-tank',-16,top,32,h);tank(ctx,images,'fuel-tank',-16,top+h+10,32,h*.85);ctx.strokeStyle='#b0b9c5';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,top+h*1.85+10);ctx.lineTo(0,part===0?678:305);ctx.stroke();nozzles(ctx,images,part===1);ctx.restore();}}
 else if(state.lower>0)nozzles(ctx,images,true);
 all.filter(r=>r.part===3).forEach(draw);
 all.filter(r=>r.part===4).forEach(draw);
 all.filter(r=>r.part===2&&!r.rear).forEach(draw);
 if(ignited){if(state.lower===0){for(const px of [-11,11])plume(ctx,px,695,11,80,exhaustTime);if(state.boosters===0)for(const r of GEOMETRY[2])plume(ctx,r.x+r.w/2,695,10,70,exhaustTime);}else if(state.payload===0)for(const px of [-14,-4,6,16])plume(ctx,px,319,8,58,exhaustTime);}
 if(selected>=PARTS.length){const [left,top,w,h]=INTERNAL_PARTS[selected-PARTS.length].box;ctx.fillStyle='#d8b07433';ctx.strokeStyle='#edcc9a';ctx.lineWidth=2;ctx.fillRect(left-4,top-4,w+8,h+8);ctx.strokeRect(left-4,top-4,w+8,h+8);}
 if(selected!==null&&selected<PARTS.length){const ranges=all.filter(r=>r.part===selected&&!r.rear);ctx.strokeStyle='#e4e9ef';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);for(const r of ranges){ctx.strokeRect(r.x-5,r.y-5,r.w+10,r.h+10);}}
 ctx.restore();
}
// Transparent pixels never count as an object hit; masks are decoded only once.
const masks=new WeakMap();
export function hitPart(images,x,y,{xray=false}={}){const list=instances({xray});const ordered=[...list.filter(r=>r.rear),...list.filter(r=>r.part===0||r.part===1),...list.filter(r=>r.part===3),...list.filter(r=>r.part===4),...list.filter(r=>r.part===2&&!r.rear)].reverse();for(const r of ordered){if(xray&&r.part===4)continue;const u=(x-r.x)/r.w,v=(y-r.y)/r.h;if(u<0||u>=1||v<0||v>=1)continue;const im=images[r.asset];if(!im?.naturalWidth)continue;let mask=masks.get(im);if(!mask){const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(im,0,0);mask=cx.getImageData(0,0,c.width,c.height);masks.set(im,mask);}if(mask.data[(Math.floor(v*mask.height)*mask.width+Math.floor(u*mask.width))*4+3]>=32)return r.part;}return null;}
export function drawPlan(ctx,x=155,y=475){ctx.save();ctx.translate(x,y);ctx.strokeStyle='#aeb7c6';ctx.fillStyle='#dfe4eb';const circle=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();};circle(0,0,16);for(const [dx,dy] of [[0,-28],[28,0],[0,28],[-28,0]])circle(dx,dy,10);ctx.fillStyle='#c5ccd7';ctx.font='17px sans-serif';ctx.textAlign='center';ctx.fillText('四枚助推器环绕一级',0,68);ctx.fillText('俯视示意',0,91);ctx.restore();}

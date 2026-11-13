import {CANNON_ART,artPoint} from './assets/cannon-scene/geometry.js';
import {MODEL,GEARS,model,pathOf,solarPath,positionAt} from './orbital-model.js';
export {MODEL,model,pathOf,solarPath,positionAt} from './orbital-model.js';
const ink='#e8e0cc',dim='#a9b0bf',warm='#d8b074',cool='#a8c4c6',tau=Math.PI*2;
const GEO={cx:940,cy:345,s:180};
function label(c,s,x,y,size=22,color=ink){c.fillStyle=color;c.font=`${size}px "Microsoft YaHei",sans-serif`;c.fillText(s,x,y);}
function line(c,pts,color=warm,width=2,dash=[]){if(!pts.length)return;c.save();c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.restore();}
function dot(c,x,y,r=4,color=ink){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,tau);c.fill();}
function arrow(c,a,b,color=warm){line(c,[a,b],color,2);const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);line(c,[[b[0]-10*Math.cos(ang-.4),b[1]-10*Math.sin(ang-.4)],b,[b[0]-10*Math.cos(ang+.4),b[1]-10*Math.sin(ang+.4)]],color,2);}
const projected=(path,project)=>path.screen||(path.screen=path.pts.map(project));
function trace(c,path,project,progress=1,color=warm){const head=positionAt(path,progress),points=projected(path,project).slice(0,head.index);points.push(project(head));line(c,points,color,2.4);const xy=project(head);dot(c,...xy,4,color);return xy;}
function continuation(c,path,project,color=warm){const p=path.pts,tail=project(p[p.length-8]),end=project(p.at(-1)),a=Math.atan2(end[1]-tail[1],end[0]-tail[0]);arrow(c,[end[0]-18*Math.cos(a),end[1]-18*Math.sin(a)],end,color);}
export function createVelocityScene(hooks={}){
 const st={v:4.5,age:0,paused:true,compare:false,solar:0,replay:0,dragging:false,cam:{...GEO}},cache=new Map(),solarCache=new Map();let cannon=null,grain=null,globe=null,backdrop=null,lastState='';
 const getPath=(v,far=3)=>{const key=v+':'+far;if(!cache.has(key))cache.set(key,pathOf(v,far));return cache.get(key);};
 const getSolar=v=>{if(!solarCache.has(v))solarCache.set(v,solarPath(v));return solarCache.get(v);};
 const mk=()=>GEARS.find(g=>g.v===st.v)||{name:st.v<7.9?'水平发射':'轨道探索',result:st.v<7.9?'落回地面':model(st.v).kind==='closed'?'环绕地球':'逃离地球',note:'理想条件下的水平发射演示。'},duration=()=>st.v===16.7?7:5;
 function setValue(v){st.v=Math.round(Math.max(.5,Math.min(16.7,v))*100)/100;cache.clear();st.age=0;st.replay=0;st.paused=true;}
 function earth(c,x,y,r){if(globe)globe(c,x,y,r);else{dot(c,x,y,r,'#596d77');if(grain){c.save();c.beginPath();c.arc(x,y,r,0,tau);c.clip();c.globalAlpha=.2;c.fillStyle=grain;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}}}
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function storyboard(c,v,progress,alpha=1){
  if(alpha<=.001)return;
  c.save();c.globalAlpha=alpha;
  const path=getPath(v),wide=ease((st.age-.25)/1.8),space=v>=7?ease((st.age-1.15)/1.6):0;
  st.shot=space>.99?'earth':wide>.99?'terrain':'close';
  // A single projection carries the muzzle, projectile and planet through the zoom.
  // Local scale is independent of speed: faster shots travel further on screen.
  const mx=360,my=230,ground=530,impact=getPath(4.5).pts.at(-1);
  const z=1.8-.8*wide,blend=space;
  const localX=850/impact.x*z,localY=(ground-my)/(MODEL.R0-impact.y)*z;
  const sx=Math.exp(Math.log(localX)*(1-blend)+Math.log(180)*blend);
  const sy=Math.exp(Math.log(localY)*(1-blend)+Math.log(180)*blend);
  const muzzleX=mx+(750-mx)*blend,muzzleY=my+(340-180*MODEL.R0-my)*blend;
  const project=p=>[muzzleX+p.x*sx,muzzleY+(MODEL.R0-p.y)*sy];
  // Animation uses the page-wide canvas; the stage canvas is only for labels/controls.
  // Keep the same projection so changing layers never shifts the muzzle or projectile.
  const visual=backdrop||c;visual.save();visual.globalAlpha=alpha;
  if(!backdrop){visual.beginPath();visual.rect(0,155,1500,425);visual.clip();}
  if(space>0)earth(visual,muzzleX,muzzleY+MODEL.R0*sy,sy);
  visual.save();visual.globalAlpha=alpha*(1-space);
  visual.translate(mx*(1-z),my*(1-z));visual.scale(z,z);
  for(let layer=0;layer<3;layer++){
   visual.fillStyle=['#56647522','#68758033','#7d868144'][layer];visual.beginPath();visual.moveTo(-600,1100);
   for(let x=-600;x<=2100;x+=60)visual.lineTo(x,430+layer*45-45*Math.sin(x/170+layer)-28*Math.cos(x/87));
   visual.lineTo(2100,1100);visual.lineTo(-600,1100);visual.fill();
  }
  line(visual,[[-600,ground],[2100,ground]],'#a8c4c644',2);visual.restore();
  if(st.compare)for(const value of [4.5,7.89,7.9,11.2])if(value!==v)line(visual,getPath(value).pts.map(project),'#a8c4c655',1.3,[4,7]);
  if(cannon?.naturalWidth){visual.save();visual.translate(muzzleX,muzzleY);visual.rotate(CANNON_ART.rotation);const sc=.20*z*(1-blend)+.035*blend;visual.scale(sc,sc);visual.drawImage(cannon,-CANNON_ART.muzzle[0],-CANNON_ART.muzzle[1]);visual.restore();}
  if(st.age>0){const head=positionAt(path,progress),pts=path.pts.slice(0,head.index).map(project);pts.push(project(head));line(visual,pts,ink,2.6);dot(visual,...project(head),6,warm);}
  visual.restore();
  if(st.age===0&&st.paused){
   const x=360,y=230,w=960,f=(v-.5)/16.2;
   line(c,[[x,y],[x+w,y]],'#8ea7b544',18);
   line(c,[[x,y],[x+w*f,y]],'#a8c4c6',18);
   for(const tick of [1,7.9,11.2,16.7]){const tx=x+w*(tick-.5)/16.2;line(c,[[tx,y-10],[tx,y+10]],ink,2);label(c,String(tick),tx-15,y+48,22,dim);}
   const tx=x+w*f;line(c,[[tx,y-20],[tx,y+20]],warm,7);
   label(c,'初速度  '+String(v)+' km/s',x,y-42,30,ink);
  }
  const measure=ease((st.age-3.65)/1.1);
  if(v<7&&measure>0){const end=project(path.pts.at(-1)),x=mx+(end[0]-mx)*measure;
   c.save();c.beginPath();c.rect(0,155,1500,445);c.clip();c.globalAlpha=alpha*measure;line(c,[[mx,my],[mx,ground]],cool,1.5,[5,7]);line(c,[[mx,ground+23],[x,ground+23]],ink,2,[5,6]);
   line(c,[[mx,ground+15],[mx,ground+31]],ink);line(c,[[x,ground+15],[x,ground+31]],ink);
   label(c,'水平距离 '+(Math.atan2(path.pts.at(-1).x,path.pts.at(-1).y)*100*measure).toFixed(1)+' 示意格',(mx+x)/2-100,ground+59,23);c.restore();
  }
  if(st.age>0)label(c,space>.5?'地球视角':'牛顿大炮 · 水平发射',65,145,25);
  c.restore();
 }
 function geocentric(c,v,progress,alpha=1){storyboard(c,v,progress,alpha);}
 function solar(c,progress,alpha){c.save();c.globalAlpha=alpha;const cx=700,cy=335,s=170,project=p=>[cx+s*p.x,cy-s*p.y];
  label(c,'以太阳为参照',65,145,26);label(c,'顺地球公转方向出发',65,185,21,cool);
  const visual=backdrop||c;visual.save();visual.globalAlpha=alpha;if(!backdrop){visual.beginPath();visual.rect(0,195,1500,385);visual.clip();}
  const orbit=[];for(let i=0;i<=240;i++){const a=i/240*tau;orbit.push([cx+Math.cos(a)*s,cy+Math.sin(a)*s]);}line(visual,orbit,'#a8c4c66f',1.5,[3,7]);
  const glow=visual.createRadialGradient(cx,cy,10,cx,cy,80);glow.addColorStop(0,'#e0bb773b');glow.addColorStop(1,'#e0bb7700');visual.fillStyle=glow;visual.fillRect(cx-80,cy-80,160,160);dot(visual,cx,cy,29,'#e2c391');label(visual,'太阳',cx-23,cy+57,21);
  const e0=project({x:0,y:1});earth(visual,...e0,17);label(visual,'地球（发射时）',e0[0]-145,e0[1]-25,19,cool);arrow(visual,[e0[0]+25,e0[1]],[e0[0]+105,e0[1]],cool);
  if(st.compare){const bound=getSolar(11.2);line(visual,projected(bound,project),'#a8c4c699',1.4,[5,6]);label(visual,'11.2：仍绕太阳',cx-245,cy+220,19,cool);}
  const path=getSolar(16.7);line(visual,projected(path,project),'#d8b07455',1.5,[3,7]);trace(visual,path,project,progress);continuation(visual,path,project);label(visual,'向太阳系外延伸',1160,540,20,warm);
  visual.restore();
  label(c,'日心图另用尺度 · 天体大小放大 · 忽略其他天体',65,610,17,dim);c.restore();
 }
 return{get value(){return st.v;},state:st,gears:GEARS.map(g=>g.v),setValue,name:()=>mk().name,note:()=>mk().note,cam:()=>({...GEO}),toPixel:(x,y)=>[GEO.cx+GEO.s*x,GEO.cy-GEO.s*y],
  nudge(dir){const values=GEARS.map(g=>g.v);const next=dir<0?[...values].reverse().find(v=>v<st.v):values.find(v=>v>st.v);setValue(next??st.v);hooks.onChange?.();},down:()=>false,move(){},up(){},setBackdrop:context=>backdrop=context,setGrain:v=>grain=v,setGlobe:fn=>globe=fn,setCannon:im=>cannon=im,
  replay(){st.age=0;st.replay=0;st.paused=false;},togglePause(){st.paused=!st.paused;},toggleCompare(){st.compare=!st.compare;},needsFrame:()=>!st.paused&&st.age<duration(),
  draw(c,W,H,dt){if(!st.paused){st.age=Math.min(duration(),st.age+Math.min(dt||.016,.05));if(st.age>=duration()){st.paused=true;hooks.onChange?.();}}st.replay=st.age/duration();const state=String(st.v)+' km/s';if(state!==lastState){lastState=state;hooks.onState?.(state);}const g=mk();label(c,st.age===0&&st.paused?'牛顿大炮':g.name+' · '+g.result,65,55,32);if(st.age>0)label(c,g.note,65,91,20,dim);
   if(st.v===16.7){st.solar=Math.max(0,Math.min(1,(st.age-1.6)/.65));geocentric(c,st.v,Math.min(1,st.age/1.6),1-st.solar);if(st.solar>0)solar(c,Math.max(0,(st.age-2.25)/4.75),st.solar);}else{st.solar=0;geocentric(c,st.v,Math.min(1,st.age/5));}
   if(st.solar<.01)label(c,'山高与距离示意 · 近地参考速度 · 忽略大气与自转 · 时间压缩',65,610,17,dim);
  }
 };
}
const radialMotion=(()=>{const dt=.001,rows=[{r:1,v:Math.sqrt(2*(1-1/1.25))}];let r=1,v=rows[0].v,apex=0;for(let i=1;i<=4000;i++){if(i===1||r>1){const half=v-dt/(2*r*r);r=Math.max(1,r+half*dt);v=half-dt/(2*r*r);}rows.push({r,v});if(rows[i].r>rows[apex].r)apex=i;}return{rows,dt,apexTime:apex*dt};})();
export function directionState(time){const u=Math.max(0,time-1.5),simTime=time<1.5?radialMotion.apexTime*Math.max(0,time)/1.5:radialMotion.apexTime+u*2.1,index=Math.min(radialMotion.rows.length-1,Math.round(simTime/radialMotion.dt)),radial=radialMotion.rows[index];return{radialR:radial.r,radialV:radial.v,impact:time>1.5&&radial.r<=1,orbitalR:time<1.5?radial.r:1.25,angle:u/Math.sqrt(1.25**3)*2.1,orbitalV:1/Math.sqrt(1.25)};}
export function drawDirectionScene(c,{time,earth,grain}){
 const R=170,alt=1.25,progress=Math.min(time/1.5,1),u=Math.max(0,time-1.5),cx=[410,1085],cy=340,state=directionState(time);
 label(c,'垂直发射',90,85,29);label(c,'升高后转向并加速',810,85,29);
 for(let i=0;i<2;i++){earth(c,cx[i],cy,R);const y0=cy-R,y1=cy-R*alt;line(c,[[cx[i],y0],[cx[i],y1]],'#d8b07455',2,[3,6]);
  const y=cy-R*state.orbitalR,top=[cx[i],y1];
  if(i===0){const r=state.radialR,py=cy-r*R;line(c,[[cx[i],y0],[cx[i],Math.min(py,y0)]],warm,2.5);dot(c,cx[i],py,6,warm);label(c,state.impact?'落回地面':u>0?'失去推力后回落':time<=0?'准备发射':'垂直升高',cx[i]-70,585,23,warm);}
  else{const circle=[];for(let j=0;j<=240;j++){const a=j/240*tau;circle.push([cx[i]+R*alt*Math.sin(a),cy-R*alt*Math.cos(a)]);}line(c,circle,'#a8c4c64d',1.5,[3,7]);if(u<=0)dot(c,cx[i],y,6,warm);else{const angle=state.angle,pts=[];for(let j=0;j<=240;j++){const a=Math.min(angle,tau)*j/240;pts.push([cx[i]+R*alt*Math.sin(a),cy-R*alt*Math.cos(a)]);}line(c,pts,warm,2.5);dot(c,cx[i]+R*alt*Math.sin(angle),cy-R*alt*Math.cos(angle),6,warm);}arrow(c,[top[0]+10,top[1]],[top[0]+80,top[1]],cool);label(c,'转向加速',top[0]+25,top[1]-25,19,cool);label(c,u>0?'保持环绕':time<=0?'准备发射':'垂直升高',cx[i]-65,585,23,warm);}
 }
 label(c,'高度与时间为演示尺度',65,635,17,dim);
}

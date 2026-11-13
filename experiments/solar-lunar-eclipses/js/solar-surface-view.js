/* 地月主视图：绕竖轴朝向迎光面 50°，全部天体、影锥和地表边界共用同一正投影。 */
(function(global){
'use strict';
var M=global.EclipseModel,A=50*M.DEG,C=Math.cos(A),S=Math.sin(A),TAU=Math.PI*2;
function render(scene,state){
 var ctx=scene.ctx,moon=M.moonAt(state.phi),camera=M.orbitCamera(state.phi,'solar',scene.surfaceZoom),px=camera.px,cx=camera.cx,cy=camera.cy;
 ctx.save();ctx.beginPath();ctx.rect(375,258,1065,466);ctx.clip();
 function project(p){p=M.displayPoint(p,camera.focus);return {x:cx+(p.x*C+(p.z||0)*S)*px,y:cy-p.y*px};}
 function label(t,x,y,color){ctx.font='18px "Microsoft YaHei",sans-serif';ctx.fillStyle=color||'#dce7f6';ctx.fillText(t,x,y);}
 function polygon(points,fill,stroke){ctx.beginPath();points.forEach(function(p,i){var q=project(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.2;ctx.stroke();}}
 // 平行入射方向的屏幕投影仍为水平方向。
 ctx.strokeStyle='rgba(243,216,168,.22)';ctx.lineWidth=1;
 for(var yy=285;yy<=640;yy+=59){ctx.beginPath();ctx.moveTo(380,yy);ctx.lineTo(1420,yy);ctx.stroke();label('→',390,yy+5,'#b7a585');}
 global.OrbitPlaneView.draw(ctx,state,project);
 var cone=M.cone(moon,M.RM),u=cone.axis,L=cone.umbraLength,far=Math.min(L,M.dist(moon,M.EARTH)+1.2);
 function edge(t,sign,pen){var radius=pen?cone.penumbraRadiusAt(t):cone.umbraRadiusAt(t);return {x:moon.x+u.x*t-u.y*radius*sign,y:moon.y+u.y*t+u.x*radius*sign,z:(moon.z||0)+(u.z||0)*t};}
 polygon([edge(0,-1,true),edge(far,-1,true),edge(far,1,true),edge(0,1,true)],'rgba(182,185,194,.25)','#75808e');
 polygon([edge(0,-1,false),edge(far,-1,false),edge(far,1,false),edge(0,1,false)],'rgba(4,7,12,.94)','#79818a');
 var mid=project({x:moon.x+u.x*2,y:moon.y+u.y*2,z:moon.z+(u.z||0)*2});label('本影',mid.x+30,mid.y+5);label('半影',mid.x-18,mid.y-65);
 // 球面采样与两条等值线共用三维坐标，不用平面圆斑贴到球边。
 var N=256,r=N/2-1;
 if(!scene.solarSurface){scene.solarSurface=document.createElement('canvas');scene.solarSurface.width=N;scene.solarSurface.height=N;}
 if(scene.solarSurfacePhi!==state.phi+'|'+M.orbitInfo(state.phi).nodeAngle){
  scene.solarSurfacePhi=state.phi+'|'+M.orbitInfo(state.phi).nodeAngle;var g=scene.solarSurface.getContext('2d'),im=g.createImageData(N,N),fields=[new Float32Array(N*N),new Float32Array(N*N)];
  fields.forEach(function(f){f.fill(NaN);});
  for(var j=0;j<N;j++)for(var i=0;i<N;i++){
   var h=(i-r)/r,y=(r-j)/r,d2=1-h*h-y*y;if(d2<0)continue;
   var dep=Math.sqrt(d2),x=h*C-dep*S,z=h*S+dep*C;
   var sx=M.SUN.x-x,sy=-y,sz=-z,mx=moon.x-x,my=moon.y-y,mz=(moon.z||0)-z;
   var ds=Math.hypot(sx,sy,sz),dm=Math.hypot(mx,my,mz),sep=Math.acos(M.clamp((sx*mx+sy*my+sz*mz)/(ds*dm),-1,1)),as=Math.asin(M.SUN_R/ds),am=Math.asin(M.RM/dm);
   var k=j*N+i;fields[0][k]=sep-(as+am);fields[1][k]=sep-(am-as);
   if(fields[0][k]>=0)continue;
   var vis=M.surfaceVisibility(y,z,state.phi,x,moon),at=k*4;im.data[at]=im.data[at+1]=im.data[at+2]=8;im.data[at+3]=Math.round((1-vis)*235);
  }
  g.putImageData(im,0,0);
  fields.forEach(function(f,index){g.beginPath();for(var j=0;j<N-1;j++)for(var i=0;i<N-1;i++){
   var corners=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],v=[f[j*N+i],f[j*N+i+1],f[(j+1)*N+i+1],f[(j+1)*N+i]];
   if(v.some(function(x){return !Number.isFinite(x);}))continue;var cuts=[];
   for(var e=0;e<4;e++){var n=(e+1)%4;if((v[e]<0)!==(v[n]<0)){var t=v[e]/(v[e]-v[n]);cuts.push({x:corners[e][0]+(corners[n][0]-corners[e][0])*t,y:corners[e][1]+(corners[n][1]-corners[e][1])*t});}}
   if(cuts.length===2){g.moveTo(cuts[0].x,cuts[0].y);g.lineTo(cuts[1].x,cuts[1].y);}
  }g.strokeStyle=index?'#ffe1a1':'#bfe4ef';g.lineWidth=index?1.5:1.2;g.setLineDash(index?[]:[4,3]);g.stroke();g.setLineDash([]);});
 }
 var pm=global.PlanetMaterials;ctx.beginPath();ctx.arc(cx,cy,px,0,TAU);ctx.fillStyle='#5485a4';ctx.fill();
 if(pm&&pm.earthOblique.ready){var side=px/pm.fill;ctx.drawImage(pm.earthOblique.canvas,cx-side/2,cy-side/2,side,side);}
 ctx.drawImage(scene.solarSurface,cx-px,cy-px,px*2,px*2);
 var ms=project(moon),mr=M.RM*px*(.23+.77*camera.focus);scene.lastMoon=moon;
 if(pm&&pm.moonSide.ready){var side=mr/pm.fill;ctx.drawImage(pm.moonSide.canvas,ms.x-side/2,ms.y-side/2,side,side);}else{ctx.beginPath();ctx.arc(ms.x,ms.y,mr,0,TAU);ctx.fillStyle='#c2c5cb';ctx.fill();}
 if(camera.focus<.1)label('月球',ms.x+12,ms.y-12);
 var P=M.mul(M.unit(moon),M.RE),q=project(P);
 ctx.beginPath();ctx.arc(q.x,q.y,2.2,0,TAU);ctx.fillStyle='#ffd591';ctx.fill();ctx.strokeStyle='#fff2ce';ctx.lineWidth=1.5;ctx.stroke();
 ctx.beginPath();ctx.moveTo(q.x+7,q.y+4);ctx.lineTo(q.x+50,q.y+38);ctx.strokeStyle='#ffd591';ctx.stroke();label(moon.x>0?'观察点 A（背面）':'观察点 A',q.x+53,q.y+45,'#ffd591');
 ctx.restore();
 global.OrbitPlaneView.drawYear(ctx,state);
 label('地月斜视 · 同一球面上的投影',780,686,'#bacde2');
 label('— 本影边界：日全食区',780,720,'#ffe1a1');label('┄ 半影外边界：日偏食区',780,752,'#bfe4ef');
 label('球间距离压缩示意 · 遮挡按三维位置计算',56,815,'#9aafc9');
}
global.SolarSurfaceView={render:render};
})(window);

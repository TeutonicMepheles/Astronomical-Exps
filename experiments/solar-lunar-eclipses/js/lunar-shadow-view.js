/* 月食地月视图：同一影锥剖面、月球位姿和地面月相，共用 EclipseModel / EclipseSky。 */
(function(global){
'use strict';
var M=global.EclipseModel,TAU=Math.PI*2,C=.8,S=-.6;
function render(scene,state){
 var ctx=scene.ctx,moon=M.moonAt(state.phi),camera=M.orbitCamera(state.phi,'lunar',scene.surfaceZoom),px=camera.px,cx=camera.cx,cy=camera.cy;
 scene.lastMoon=moon;
 ctx.save();ctx.beginPath();ctx.rect(375,258,1065,466);ctx.clip();
 function project(p){p=M.displayPoint(p,camera.focus);return {x:cx+(p.x*C+(p.z||0)*S)*px,y:cy-p.y*px};}
 function text(t,x,y,color,size){ctx.font=(size||18)+'px "Microsoft YaHei",sans-serif';ctx.fillStyle=color||'#dce7f6';ctx.fillText(t,x,y);}
 function path(points,fill,color,dash){ctx.beginPath();points.forEach(function(p,i){var q=project(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}if(color){ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.setLineDash(dash||[]);ctx.stroke();ctx.setLineDash([]);}}
 global.OrbitPlaneView.draw(ctx,state,project);
 var cone=M.cone(M.EARTH,M.RE),far=M.ORBIT+6;
 // 透明填充保持月球、轨道和边界可辨；地球之后才存在背日影区。
 function edges(pen){var rad=pen?cone.penumbraRadiusAt(far):cone.umbraRadiusAt(far);return [{x:0,y:-1},{x:far,y:-rad},{x:far,y:rad},{x:0,y:1}];}
 path(edges(true),'rgba(180,185,194,.16)');
 path(edges(false),'rgba(3,6,12,.72)');
 [true,false].forEach(function(pen){var e=edges(pen);path([e[0],e[1]],null,pen?'#bfe4ef':'#ffe1a1',pen?[7,6]:[]);path([e[3],e[2]],null,pen?'#bfe4ef':'#ffe1a1',pen?[7,6]:[]);});
 for(var yy=310;yy<=660;yy+=70){ctx.strokeStyle='rgba(239,210,160,.19)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(380,yy);ctx.lineTo(460,yy);ctx.stroke();text('→',380,yy+5,'#d9c392');}
 text('平行阳光',395,293,'#d9c392');
 // 月球处的影锥横截面：圆经同一斜视投影成为椭圆。
 var sectionX=Math.max(0,moon.x),ru=cone.umbraRadiusAt(sectionX),rp=cone.penumbraRadiusAt(sectionX);
 function ring(radius,color,dash){var points=[];for(var i=0;i<=128;i++){var a=i/128*TAU;points.push({x:sectionX,y:radius*Math.sin(a),z:radius*Math.cos(a)});}path(points,null,color,dash);}
 if(moon.x>.001){ring(rp,'#bfe4ef',[7,5]);ring(ru,'#ffe1a1');}
 var center=project({x:sectionX,y:0});
 ctx.strokeStyle='rgba(191,217,233,.24)';ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(center.x,cy-rp*px-10);ctx.lineTo(center.x,cy+rp*px+10);if(moon.x>.001)ctx.stroke();ctx.setLineDash([]);
 // 红光仅在月球进入本影时提示；曲线为成因示意，不用作几何边界。
 if(M.sunVisible(moon,M.EARTH,M.RE)<.5){ctx.strokeStyle='rgba(224,125,100,.45)';ctx.lineWidth=1.5;[-1,1].forEach(function(sign){ctx.beginPath();ctx.moveTo(cx-px*.9,cy+sign*px*.7);ctx.quadraticCurveTo(cx+px*.5,cy+sign*px*1.05,project(moon).x,project(moon).y);ctx.stroke();});text('大气折射红光（示意）',760,689,'#d8a38f',16);}
 // 灰月→被遮缺→红月与地面小窗复用同一绘制函数，不独立估计食相或色深。
 if(!scene.lunarDisc){scene.lunarDisc=document.createElement('canvas');scene.lunarDisc.width=160;scene.lunarDisc.height=160;scene.lunarSky=new global.EclipseSky(scene.lunarDisc);scene.lunarSky.w=160;scene.lunarSky.h=160;}
 var pm=global.PlanetMaterials,key=[moon.x,moon.y,moon.z].join('|')+'|'+Boolean(pm&&pm.moonFront.ready);
 if(scene.lunarDiscKey!==key){scene.lunarDiscKey=key;scene.lunarSky.drawOrbitMoon(scene.lunarSky.ctx,moon);}
 var ms=project(moon),mr=M.RM*px*(.23+.77*camera.focus),side=mr/.34;
 ctx.save();ctx.beginPath();ctx.arc(ms.x,ms.y,mr,0,TAU);ctx.clip();ctx.drawImage(scene.lunarDisc,ms.x-side/2,ms.y-side/2,side,side);ctx.restore();
 ctx.beginPath();ctx.arc(ms.x,ms.y,mr,0,TAU);ctx.strokeStyle='#cfdae9';ctx.lineWidth=1;ctx.stroke();
 text('月球',ms.x+mr+14,ms.y+6);
 // 地球自身位于影锥前方；地面观察点在面向月球的夜半球。
 if(pm&&pm.earth.ready){var earthSide=px/pm.fill;ctx.drawImage(pm.earth.canvas,cx-earthSide/2,cy-earthSide/2,earthSide,earthSide);}else{ctx.fillStyle='#457ca4';ctx.beginPath();ctx.arc(cx,cy,px,0,TAU);ctx.fill();}
 var P=M.mul(M.unit(moon),M.RE),q=project(P);
 ctx.fillStyle='#ffd591';ctx.beginPath();ctx.arc(q.x,q.y,3,0,TAU);ctx.fill();ctx.strokeStyle='#ffd591';ctx.beginPath();ctx.moveTo(q.x+6,q.y+5);ctx.lineTo(q.x+38,q.y+38);ctx.stroke();text(moon.x<0?'观察点 A（背面）':'观察点 A',q.x+42,q.y+45,'#ffd591');
 var labelX=cx+px+28;
 text('本影',labelX,cy-20,'#ffe1a1');text('半影',labelX,cy-1.28*px,'#bfe4ef');
 ctx.restore();
 global.OrbitPlaneView.drawYear(ctx,state);
 text('— 本影边界',465,735,'#ffe1a1');text('┄ 半影外边界',640,735,'#bfe4ef');text(moon.x>.001?'椭圆：月球所在位置的地影横截面':'月球未进入地影',850,735,'#b7cadf',16);
 text('教学压缩比例 · 月球与地面小窗共用同一食相绘制',56,815,'#9aafc9',15);
}
global.LunarShadowView={render:render};
})(window);

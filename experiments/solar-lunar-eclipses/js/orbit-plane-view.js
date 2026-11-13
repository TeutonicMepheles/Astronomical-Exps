(function(global){
'use strict';
var M=global.EclipseModel,TAU=Math.PI*2;
function draw(ctx,state,project){
 var info=M.orbitInfo(state.phi),moon=M.moonAt(state.phi);
 function curve(at,color,dash,fill){ctx.beginPath();for(var i=0;i<=180;i++){var p=project(at(i/180*TAU));if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash||[]);ctx.stroke();ctx.setLineDash([]);}
 ctx.save();
 curve(M.eclipticAt,'rgba(130,189,215,.65)',[7,6],'rgba(100,160,190,.08)');
 curve(M.moonAt,'#e9cca0');
 var n1=project(M.moonAt(info.nodeAngle)),n2=project(M.moonAt(info.nodeAngle+Math.PI));
 ctx.strokeStyle='rgba(157,224,201,.55)';ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(n1.x,n1.y);ctx.lineTo(n2.x,n2.y);ctx.stroke();ctx.setLineDash([]);
 ctx.font='17px "Microsoft YaHei",sans-serif';
 [n1,n2].forEach(function(p){ctx.beginPath();ctx.arc(p.x,p.y,5,0,TAU);ctx.fillStyle='#96e2c6';ctx.fill();ctx.fillText('交点',p.x+10,p.y-12);});
 var p=project(moon),flat=project({x:moon.x,y:moon.y,z:0});
 ctx.strokeStyle='#96e2c6';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(flat.x,flat.y);ctx.stroke();ctx.setLineDash([]);
 // 两平面的局部剖面使用真实夹角。放在左下预留区，不遮挡天体或观测小窗。
 ctx.fillStyle='rgba(11,22,37,.94)';ctx.fillRect(390,626,330,113);
 ctx.fillStyle='#b9ddec';ctx.fillText('黄道面',405,650);ctx.fillStyle='#e9cca0';ctx.fillText('月球轨道面 · 约 5.1°',495,650);
 var x=410,y=713,L=275;
 ctx.strokeStyle='#8db8ce';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+L,y);ctx.stroke();
 ctx.strokeStyle='#e9cca0';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+L*Math.cos(M.INCLINATION),y-L*Math.sin(M.INCLINATION));ctx.stroke();
 ctx.fillStyle='#b8d1d9';ctx.font='14px "Microsoft YaHei",sans-serif';ctx.fillText('两个轨道面相交处为交点',405,678);
 ctx.restore();
}
function drawYear(ctx,state){
 var cx=160,cy=360,R=56,e={x:cx+R*Math.cos(state.year),y:cy-R*Math.sin(state.year)};
 ctx.save();ctx.font='16px "Microsoft YaHei",sans-serif';ctx.fillStyle='#d3e2f3';ctx.fillText('地球公转一年',56,292);
 ctx.beginPath();ctx.ellipse(cx,cy,R,R,0,0,TAU);ctx.strokeStyle='#637f9b';ctx.lineWidth=1.3;ctx.setLineDash([3,5]);ctx.stroke();ctx.setLineDash([]);
 ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(e.x,e.y);ctx.strokeStyle='#efd19c';ctx.lineWidth=2;ctx.stroke();
 ctx.beginPath();ctx.moveTo(e.x-33,e.y);ctx.lineTo(e.x+33,e.y);ctx.strokeStyle='#96e2c6';ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
 ctx.beginPath();ctx.arc(cx,cy,6,0,TAU);ctx.fillStyle='#efd19c';ctx.fill();ctx.beginPath();ctx.arc(e.x,e.y,5,0,TAU);ctx.fillStyle='#83badd';ctx.fill();
 ctx.font='14px "Microsoft YaHei",sans-serif';ctx.fillStyle='#efd19c';ctx.fillText('日地连线',246,333);ctx.fillStyle='#96e2c6';ctx.fillText('交点线',246,360);ctx.fillStyle='#b9cbdc';ctx.fillText('俯视 · 交点线固定示意',56,440);
 ctx.restore();
}
global.OrbitPlaneView={draw:draw,drawYear:drawYear};
})(window);

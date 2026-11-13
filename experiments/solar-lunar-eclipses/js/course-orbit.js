/* 独立轨道教学投影；角度为约 5.1°，距离压缩，不用于预报食象。 */
(function(global){
  'use strict';
  var tilt=5.1*Math.PI/180, tau=Math.PI*2;
  function render(scene,state){
    scene.setup(); if(!scene.bg)scene.buildBackground();
    var c=scene.ctx,d=scene.dpr;c.setTransform(d,0,0,d,0,0);c.drawImage(scene.bg,0,0,1600,900);
    var cx=760,cy=430,R=405;
    function point(a,flat){var u=a+state.year,x=Math.cos(u),z=Math.sin(u)*Math.cos(tilt),y=flat?0:Math.sin(u)*Math.sin(tilt);var xx=x*Math.cos(state.year)+z*Math.sin(state.year),zz=-x*Math.sin(state.year)+z*Math.cos(state.year);return {x:cx+xx*R,y:cy-zz*R*.48-y*R};}
    function line(points,color,width,dash){c.beginPath();points.forEach(function(p,i){if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash||[]);c.stroke();c.setLineDash([]);}
    function text(t,x,y,color,size){c.fillStyle=color||'#d9e5f9';c.font=(size||20)+'px "Microsoft YaHei",sans-serif';c.fillText(t,x,y);}
    c.fillStyle='rgba(114,165,209,.10)';c.beginPath();c.ellipse(cx,cy,R+45,(R+45)*.48,0,0,tau);c.fill();
    var flat=[],orbit=[];for(var i=0;i<=180;i++){flat.push(point(i*tau/180,true));orbit.push(point(i*tau/180,false));}line(flat,'#7599b2',2,[7,8]);line(orbit,'#efd2a0',3);
    for(var y=280;y<590;y+=65){line([{x:220,y:y},{x:1270,y:y}],'rgba(255,225,161,.26)',1);text('→',260,y+6,'#e4c895',22);}
    text('平行阳光 →',230,240,'#efd2a0');text('黄道面',1100,610,'#8cbedb');text('月球轨道',990,210,'#efd2a0');
    var n1=point(-state.year,false),n2=point(Math.PI-state.year,false);line([n1,n2],'#b4dbda',2,[4,5]);
    [n1,n2].forEach(function(p){c.beginPath();c.arc(p.x,p.y,7,0,tau);c.fillStyle='#ace2d6';c.fill();text('交点',p.x-18,p.y-38,'#ace2d6',18);});
    // 从交点展开的两平面局部剖面，避免透视压缩掩盖真实小夹角。
    c.fillStyle='rgba(12,21,36,.94)';c.fillRect(720,650,470,90);line([{x:750,y:715},{x:1130,y:715}],'#8cbedb',2);line([{x:750,y:715},{x:1130,y:681}],'#efd2a0',3);text('两轨道面夹角约 5.1°',750,670,'#e6edf8',20);
    var pm=global.PlanetMaterials;
    function sphere(p,r,name,material,color){if(material&&material.ready){var side=r/pm.fill;c.drawImage(material.canvas,p.x-side/2,p.y-side/2,side,side);}else{c.beginPath();c.arc(p.x,p.y,r,0,tau);c.fillStyle=color;c.fill();}text(name,p.x-r,p.y+r+28);}
    sphere({x:cx,y:cy},52,'地球',pm&&pm.earth,'#5b9cd4');
    var m=point(state.orbitPhi,false),foot=point(state.orbitPhi,true);line([m,foot],'#ace2d6',2,[3,3]);sphere(m,22,'月球',pm&&pm.moonFront,'#c9cdd5');
    text('新月',cx-R-10,cy+70,'#b5c4da',18);text('满月',cx+R-10,cy+70,'#b5c4da',18);
    text('轨道距离与天体大小为教学示意；地球公转调节改变日地连线与交点线的相对方向',220,766,'#9aafc9',16);
  }
  global.CourseOrbit={render:render};
})(window);

/* Matched PNG layers extracted from one apparatus master. Hardware is never redrawn.
 * All parts share the same uniform scale and vertical registration; movement is translation. */
(function(N){
'use strict';const T=window.THREE;
N.OpticalArt=class{
 constructor(room){
  this.room=room;this.view=room.view;
  this.canvas=document.querySelector('#optical-mirror-art');
  this.rail=document.querySelector('#optical-rail-art');this.emitter=document.querySelector('#optical-emitter-art');
  this.assetRoot='assets/rail-lab/coherent-v4/';this.kind='';
  for(const el of [this.canvas,this.rail,this.emitter])el.addEventListener('load',()=>{this.view.dirty=true;});
  // Preload installed variants so switching does not flash an empty holder.
  this.images={};for(const type of ['holder','plane','concave','convex']){const img=new Image();img.src=this.assetRoot+(type==='plane'?'plane-extended':type)+'.png';this.images[type]=img;}
 }
 local(p){const q=this.room.project(p),r=this.view.container.getBoundingClientRect();return{x:(q.x-r.left)/r.width*this.view.container.clientWidth,y:(q.y-r.top)/r.height*this.view.container.clientHeight};}
 curvePoint(type,f,y,offset=0){const slope=type==='plane'?1:(type==='concave'?-1:1)*y/(2*f),normal=Math.hypot(1,slope);return{x:(type==='plane'?y:(type==='concave'?-1:1)*y*y/(4*f))+offset/normal,y:y-offset*slope/normal};}
 place(s){
  const origin=this.local(new T.Vector3()),unit=this.local(new T.Vector3(1,0,0)).x-origin.x;
  const center=this.local(new T.Vector3(s.mirrorPosition,0,0)),source=this.local(new T.Vector3(s.mirrorSource+.46,0,0));
  const scale=.8*unit/100,width=1672*scale,height=941*scale,top=origin.y-330*scale;
  const set=(el,left)=>Object.assign(el.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
  // The rail uses its own uniform scale, registered to the identical top contact line.
  const railScale=.88*unit/100;Object.assign(this.rail.style,{left:origin.x-1672*railScale/2+'px',top:top+625*scale-625*railScale+'px',width:1672*railScale+'px',height:941*railScale+'px'});
  set(this.emitter,source.x-576*scale);
  const kind=s.mirrorMounted?s.mirror:'holder';
  // Reflecting-edge landmarks measured from each transparent plate at native y=330.
  const anchor={holder:1243,plane:1118,concave:1094,convex:1018}[kind];
  const left=center.x-anchor*scale;
  if(kind!==this.kind){this.canvas.src=this.assetRoot+(kind==='plane'?'plane-extended':kind)+'.png';this.kind=kind;}
  this.canvas.hidden=false;set(this.canvas,left);
  this.mount={x:center.x,y:center.y,width:3.6*unit,height:4.4*unit,left:center.x-1.2*unit,top:center.y-1.6*unit};
  const guideAnchor=document.querySelector('#mirror-guide-anchor');if(guideAnchor)Object.assign(guideAnchor.style,{left:center.x+'px',top:center.y+'px'});
  const carriage=document.querySelector('#rail-carriage');
  Object.assign(carriage.style,{left:this.mount.left+'px',top:this.mount.top+'px',width:this.mount.width+'px',height:this.mount.height+'px'});
  carriage.hidden=false;carriage.setAttribute('aria-label',s.mirrorMounted?'沿导轨移动镜面，当前位置 '+Math.round(s.mirrorPosition*30)+' 厘米；左右方向键微调':'空镜片夹具：拖入镜片安装，点击选择夹具');
  const handle=document.querySelector('#mirror-move-handle');if(handle)Object.assign(handle.style,{left:(left+1248*scale)+'px',top:(top+665*scale)+'px'});
  const controls=document.querySelector('#mounted-mirror-controls');if(controls){const controlsX=Math.min(1460,left+1350*scale),controlsY=top+240*scale;Object.assign(controls.style,{left:controlsX+'px',top:controlsY+'px'});const remove=controls.querySelector('button');if(remove)Object.assign(remove.style,{left:(left+1248*scale-controlsX-32)+'px',top:(top+100*scale-controlsY)+'px'});}
  const aperture=kind==='plane'?1.8:2.4;
  this.geometryInfo=s.mirrorMounted?{type:s.mirror,focal:s.mirrorFocal,angle:kind==='plane'?45:90,aperture,edge:[-aperture/2,0,aperture/2].map(y=>this.curvePoint(kind,s.mirrorFocal/300,y))}:null;
  this.cableInfo={exit:{x:source.x-576*scale,y:top+635*scale}};
  this.registration={scale,top,railTop:top+625*scale,saddleX:left+1248*scale};
 }
};
})(window.Newton);

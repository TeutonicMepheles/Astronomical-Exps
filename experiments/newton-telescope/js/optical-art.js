/* Preserve the registered apparatus layers. Only the curved mirror region is remapped;
 * the rail, carriage, upright and mounting pivot retain their original pixels and scale. */
(function(N){
'use strict';const T=window.THREE;
N.OpticalArt=class{
 constructor(room){
  this.room=room;this.view=room.view;
  this.canvas=document.querySelector('#optical-mirror-art');
  this.surfaceCanvas=document.createElement('canvas');this.surfaceCanvas.id='optical-mirror-surface';
  this.surfaceCanvas.setAttribute('aria-hidden','true');this.surfaceCanvas.hidden=true;this.canvas.after(this.surfaceCanvas);
  this.profiles={};this.surfaceKey='';this.parts=new N.MirrorPartsArt(()=>{this.view.dirty=true;});
  this.rail=document.querySelector('#optical-rail-art');this.emitter=document.querySelector('#optical-emitter-art');
  this.assetRoot='assets/rail-lab/coherent-v4/';this.kind='';
  for(const el of [this.canvas,this.rail,this.emitter])el.addEventListener('load',()=>{this.view.dirty=true;});
  // Preload installed variants so switching does not flash an empty holder.
  this.images={};for(const type of ['holder','plane','concave','convex']){const img=new Image();img.addEventListener('load',()=>{this.view.dirty=true;});img.src=this.assetRoot+(type==='plane'?'plane-extended':type)+'.png';this.images[type]=img;}
 }
 local(p){const q=this.room.project(p),r=this.view.container.getBoundingClientRect();return{x:(q.x-r.left)/r.width*this.view.container.clientWidth,y:(q.y-r.top)/r.height*this.view.container.clientHeight};}
 curvePoint(type,f,y,offset=0){return ['concave','convex'].includes(type)?N.mirrorParts.surface(type,f*300,y):N.mirrorOptics.surface(type,f,y,offset);}
 profile(type){return this.parts.source(type);}
 renderSurface(s){
  if(!s.mirrorMounted||!['concave','convex'].includes(s.mirror))return false;
  const key=s.mirror+'/'+s.mirrorFocal;if(key===this.surfaceKey)return true;
  if(!this.parts.render(s.mirror,s.mirrorFocal,this.surfaceCanvas))return false;
  this.surfaceKey=key;return true;
 }
 contour(type,focal){
  if(!this.profile(type))return window.CourseContours?.['mounted-'+type];
  const key=type+'/'+focal;if(this.contourKey===key)return this.currentContour;
  if(!this.renderSurface({mirrorMounted:true,mirror:type,mirrorFocal:focal}))return window.CourseContours?.['mounted-'+type];
  this.contourKey=key;return this.currentContour=this.parts.contour(this.surfaceCanvas);
 }
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
  const parametric=this.renderSurface(s);this.canvas.style.visibility=parametric?'hidden':'';
  this.surfaceCanvas.hidden=!parametric;if(parametric)set(this.surfaceCanvas,left);
  this.mount={x:center.x,y:center.y,width:3.6*unit,height:4.4*unit,left:center.x-1.2*unit,top:center.y-1.6*unit};
  const guideAnchor=document.querySelector('#mirror-guide-anchor');if(guideAnchor)Object.assign(guideAnchor.style,{left:center.x+'px',top:center.y+'px'});
  const carriage=document.querySelector('#rail-carriage');
  Object.assign(carriage.style,{left:this.mount.left+'px',top:this.mount.top+'px',width:this.mount.width+'px',height:this.mount.height+'px'});
  carriage.hidden=false;carriage.setAttribute('aria-label',s.mirrorMounted?'拖动托镜座沿导轨移动镜面，当前位置 '+Math.round(s.mirrorPosition*30)+' 厘米；左右方向键微调':'空镜片夹具：拖入镜片安装，点击选中或拖动托镜座沿导轨移动');
  const handle=document.querySelector('#mirror-move-handle');if(handle)Object.assign(handle.style,{left:(left+1248*scale)+'px',top:(top+665*scale)+'px'});
  const controls=document.querySelector('#mounted-mirror-controls');if(controls){const controlsX=Math.min(1460,left+1350*scale),controlsY=top+240*scale;Object.assign(controls.style,{left:controlsX+'px',top:controlsY+'px'});const remove=controls.querySelector('button');if(remove)Object.assign(remove.style,{left:(left+1248*scale-controlsX-32)+'px',top:(top+100*scale-controlsY)+'px'});}
  const approved=N.mirrorParts.config[kind],aperture=approved?2*Math.min(330-approved.start.y,approved.end.y-330)/125-.01:1.8;
  this.geometryInfo=s.mirrorMounted?{type:s.mirror,focal:s.mirrorFocal,angle:kind==='plane'?45:90,aperture,edge:[-aperture/2,0,aperture/2].map(y=>this.curvePoint(kind,s.mirrorFocal/300,y))}:null;
  this.cableInfo={exit:{x:source.x-576*scale,y:top+635*scale}};
  this.registration={scale,top,railTop:top+625*scale,saddleX:left+1248*scale};
 }
};
})(window.Newton);

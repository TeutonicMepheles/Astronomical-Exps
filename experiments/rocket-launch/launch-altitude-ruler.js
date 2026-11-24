import {loadRocketSilhouette} from './rocket-silhouette.js';
import {ALTITUDE_INK as INK,altitudeLine,drawAltitudeGrid,drawAltitudeFlight,drawAltitudeGuides} from './altitude-chart.js';

const AXIS = 112, RIGHT = 690, TOP = 105, GROUND = 711;
const FRAME_LEFT = 45, FRAME_TOP = 1, FRAME_RIGHT = 726, FRAME_BOTTOM = 799;
const PAGE_SIZE = 6;
export const MAX_HEIGHT = 140;
const CURRENT = '#99e2e3';
const yAt = height => GROUND - (GROUND - TOP) * height / MAX_HEIGHT;
const xAt = slot => AXIS + (slot + .5) * (RIGHT - AXIS) / PAGE_SIZE;

export class LaunchAltitudeRuler {
 constructor({host, canvas, invalidate, onSelect}) {
  Object.assign(this,{host,canvas,invalidate,onSelect});
  this.records = [];
  this.page = 0;
  this.root = document.createElement('div');
  this.root.className = 'launch-altitude-records';
  this.root.setAttribute('role','group');
  this.root.setAttribute('aria-label','高度记录');
  this.root.setAttribute('aria-description','横轴为发射次序，纵轴为高度（示意格）。');
  this.detail = document.createElement('output');
  this.detail.id = 'launch-altitude-detail';
  this.detail.hidden = true;
  this.points = document.createElement('div');
  this.nav = document.createElement('nav');
  this.nav.className = 'launch-altitude-pages';
  this.nav.setAttribute('aria-label','实验记录翻页');
  this.previous = this.pageButton('‹','上一组记录',-1);
  this.next = this.pageButton('›','下一组记录',1);
  this.pageStatus = document.createElement('output');
  this.nav.append(this.previous,this.pageStatus,this.next);
  this.root.append(this.points,this.detail,this.nav);
  host.append(this.root);
  loadRocketSilhouette(invalidate);

  this.root.addEventListener('pointerdown',event=>{
   if (!event.isPrimary || event.button!==0 || this.nav.contains(event.target)) return;
   this.swipe = {id:event.pointerId,x:event.clientX,y:event.clientY};
   this.ignoreClick = false;
  });
  this.root.addEventListener('pointermove',event=>{
   if (this.swipe?.id!==event.pointerId) return;
   const dx=event.clientX-this.swipe.x, dy=event.clientY-this.swipe.y;
   if(Math.abs(dx)>30 && Math.abs(dx)>Math.abs(dy)){
    this.ignoreClick = true;
    this.root.setPointerCapture(event.pointerId);
   }
  });
  this.root.addEventListener('pointerup',event=>{
   if (this.swipe?.id!==event.pointerId) return;
   const dx=event.clientX-this.swipe.x;
   if(this.ignoreClick)this.changePage(dx<0?1:-1);
   this.swipe=null;
  });
  this.root.addEventListener('pointercancel',()=>{this.swipe=null;});
  this.root.addEventListener('click',event=>{
   if(this.ignoreClick && event.detail>0){
    this.ignoreClick=false;
    event.stopPropagation();
   }
  },true);
  this.root.addEventListener('keydown',event=>{
   if(event.key==='Escape' && this.selected){
    this.clearSelection();
    event.stopPropagation();
   }
  });
 }

 pageButton(text,label,direction) {
  const button=document.createElement('button');
  button.type='button';
  button.textContent=text;
  button.setAttribute('aria-label',label);
  button.onclick=()=>this.changePage(direction);
  return button;
 }

 sync(records,followLatest=false) {
  this.records=records;
  this.running=records.at(-1)?.status==='running';
  this.pages=Math.max(1,Math.ceil(records.length/PAGE_SIZE));
  this.page=followLatest?this.pages-1:Math.min(this.page,this.pages-1);
  this.selected=null;
  this.layout();
 }

 changePage(direction) {
  const page=this.page+direction;
  if(this.running || page<0 || page>=this.pages)return;
  this.page=page;
  this.selected=null;
  this.layout();
  this.invalidate();
 }

 clearSelection() {
  if(!this.selected)return;
  this.selected=null;
  this.updateSelection();
  this.invalidate();
 }

 layout() {
  const {clientWidth,clientHeight}=this.host;
  this.scale=Math.min(clientWidth/this.canvas.width,clientHeight/this.canvas.height);
  const k=this.scale;
  Object.assign(this.root.style,{
   left:((clientWidth-this.canvas.width*k)/2+FRAME_LEFT*k)+'px',
   top:((clientHeight-this.canvas.height*k)/2+FRAME_TOP*k)+'px',
   width:((FRAME_RIGHT-FRAME_LEFT)*k)+'px',
   height:((FRAME_BOTTOM-FRAME_TOP)*k)+'px'
  });
  const offset=this.page*PAGE_SIZE;
  this.markers=this.records.slice(offset,offset+PAGE_SIZE).flatMap((record,slot)=>{
   if(record.metric!=='flight-height'||!Number.isFinite(record.height))return [];
   const button=document.createElement('button');
   button.type='button';
   button.className='launch-record-point';
   button.disabled=this.running;
   button.setAttribute('aria-label','第 '+(offset+slot+1)+' 次发射');
   button.setAttribute('aria-controls',this.detail.id);
   const marker={record,button,x:xAt(slot),y:yAt(record.height)};
   button.style.left=(marker.x-FRAME_LEFT)*k+'px';
   button.style.top=(marker.y-FRAME_TOP)*k+'px';
   button.onclick=()=>{
    if(this.selected===marker){this.clearSelection();return;}
    this.selected=marker;
    this.onSelect(record);
    this.updateSelection();
    this.invalidate();
   };
   return [marker];
  });
  this.points.replaceChildren(...this.markers.map(marker=>marker.button));
  this.nav.hidden=this.pages===1;
  this.previous.disabled=this.running||this.page===0;
  this.next.disabled=this.running||this.page===this.pages-1;
  this.pageStatus.textContent=(this.page+1)+' / '+this.pages;
  this.updateSelection();
 }

 updateSelection() {
  for(const marker of this.markers){
   marker.button.setAttribute('aria-pressed',String(marker===this.selected));
  }
  this.detail.hidden=!this.selected;
  if(!this.selected)return;
  const {x,y,record:{height,status}}=this.selected;
  const qualifier=status==='interrupted'?'中断时 · ':height===0?'未起飞 · ':'';
  this.detail.textContent=qualifier+height+' 示意格';
  this.detail.toggleAttribute('data-below', y<TOP+42);
  this.detail.style.left=(x-FRAME_LEFT)*this.scale+'px';
  this.detail.style.top=(y-FRAME_TOP)*this.scale+'px';
 }

 draw(c,{height,flying,ignition}) {
  c.save();
  drawAltitudeGrid(c,{left:AXIS,right:RIGHT,top:TOP,ground:GROUND,max:MAX_HEIGHT,interval:35,yAt,title:'高度（示意格）'});
  c.textAlign='center';
  const offset=this.page*PAGE_SIZE;
  for(let slot=0;slot<PAGE_SIZE;slot++){
   const x=xAt(slot);
   altitudeLine(c,x,GROUND,x,GROUND+7,INK);
   c.fillText(String(offset+slot+1),x,GROUND+25);
  }
  c.textAlign='right';
  c.fillText('发射次序（次）',RIGHT,GROUND+61);
  if(this.selected){
   const {x,y}=this.selected;
   drawAltitudeGuides(c,AXIS,GROUND,x,y,CURRENT);
  }
  if(flying){
   const x=xAt(this.records.length-1-offset),y=yAt(height);
   drawAltitudeFlight(c,x,y,GROUND,CURRENT);
   if(ignition>0){
    c.globalAlpha=ignition;
    altitudeLine(c,x,y+2,x,y+19,'#e3bb79',4);
    c.globalAlpha=1;
   }
   c.textAlign='left';
   c.fillStyle=CURRENT;
   c.fillText(String(Math.round(height)),x+16,y-9);
  }
  c.restore();
 }
}

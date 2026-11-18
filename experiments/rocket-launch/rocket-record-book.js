import * as T from './vendor/three/three.module.js';

const recordLevel=v=>['低','中','高'][Number(v)-1]||'—';
function portraitCanvas(){const c=document.createElement('canvas');c.width=600;c.height=720;const x=c.getContext('2d');x.fillStyle='#10263b';x.fillRect(0,0,600,720);return c;}
function drawRecordForces(c,arrows,conditions){
 arrows.draw(c,{id:'record-thrust',x:165,y:320,angle:-Math.PI/2,maxLength:200,strength:conditions.thrust/3,height:38});
 const components=[{id:'record-self-weight',x:105,label:'自重',level:conditions.mass,color:'#edb27b'},{id:'record-payload-weight',x:225,label:'载荷',level:conditions.load,color:'#b8a6d9'}];
 for(const part of components){arrows.draw(c,{id:part.id,x:part.x,y:370,angle:Math.PI/2,maxLength:360,strength:part.level/6,height:24,color:part.color});c.fillStyle=part.color;c.textAlign='center';c.font='36px "Alibaba PuHuiTi 3",sans-serif';c.fillText(part.label,part.x,600);c.font='32px "Alibaba PuHuiTi 3",sans-serif';c.fillText(recordLevel(part.level),part.x,645);}
 c.font='36px "Alibaba PuHuiTi 3",sans-serif';c.textAlign='center';c.fillStyle='#a8c4c6';c.fillText('推力 · '+recordLevel(conditions.thrust),165,90);
}

// Capture the same rendered model and three-slice force glyphs at ignition, never the depleted end frame.
export function captureLaunchRecord(adapter,arrows,conditions){
 adapter.setAscent(0);adapter.update(0,{flames:false,effectTime:0});
 const canvas=portraitCanvas(),c=canvas.getContext('2d');
 adapter.scene.updateMatrixWorld(true);const world=new T.Box3();adapter.model.traverse(o=>{if(!o.isMesh||o.userData.scan)return;for(let p=o;p;p=p.parent)if(!p.visible||p.name==='EngineExhaust')return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();world.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});
 const points=[];for(const x of[world.min.x,world.max.x])for(const y of[world.min.y,world.max.y])for(const z of[world.min.z,world.max.z]){const p=new T.Vector3(x,y,z).project(adapter.camera);points.push({x:(p.x+1)*adapter.renderer.domElement.width/2,y:(1-p.y)*adapter.renderer.domElement.height/2});}
 const box={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))},ratio=1,pad=5,bw=box.right-box.left+pad*2,bh=box.bottom-box.top+pad*2,k=Math.min(170/bw,600/bh);
 c.drawImage(adapter.renderer.domElement,(box.left-pad)*ratio,(box.top-pad)*ratio,bw*ratio,bh*ratio,425-bw*k/2,360-bh*k/2,bw*k,bh*k);
 drawRecordForces(c,arrows,conditions);
 return {image:canvas.toDataURL('image/webp',.85),imageLayout:'portrait-split-forces-v2',forces:{thrust:{strength:conditions.thrust/3,direction:'up'},weight:{strength:(conditions.mass+conditions.load)/6,direction:'down'},selfWeight:{strength:conditions.mass/6,direction:'down',color:'#edb27b'},payloadWeight:{strength:conditions.load/6,direction:'down',color:'#b8a6d9'}}};
}

export class RocketRecordBook{
 constructor({host,getRecords,arrows,onOpen=()=>{},onClose=()=>{}}){
  this.records=getRecords;this.arrows=arrows;this.previewCache=new Map();this.page=0;this.onOpen=onOpen;this.onClose=onClose;this.button=document.createElement('button');this.button.type='button';this.button.className='rocket-record-button';this.button.setAttribute('aria-haspopup','dialog');this.button.onclick=()=>this.open();host.append(this.button);
  this.dialog=document.createElement('dialog');this.dialog.className='rocket-record-book';this.dialog.setAttribute('aria-labelledby','rocket-record-title');
  this.dialog.innerHTML='<article class="rocket-record-paper"><header class="rocket-record-header"><h2 id="rocket-record-title">实验记录</h2><button type="button" class="rocket-record-close">关闭 ×</button></header><div class="rocket-record-cards"></div><nav class="rocket-record-pages" aria-label="记录翻页"><button type="button" class="record-prev">上一页</button><output></output><button type="button" class="record-next">下一页</button></nav></article>';
  document.body.append(this.dialog);this.closeButton=this.dialog.querySelector('.rocket-record-close');this.closeButton.onclick=()=>this.close();this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.dialog.addEventListener('click',e=>{if(e.target===this.dialog)this.close();});
  this.dialog.querySelector('.record-prev').onclick=()=>{this.page--;this.render();};this.dialog.querySelector('.record-next').onclick=()=>{this.page++;this.render();};
  this.resize=()=>this.dialog.style.setProperty('--record-fit',Math.min(innerWidth/1600,innerHeight/900));addEventListener('resize',this.resize);this.resize();this.sync(false);
 }
 sync(active){this.active=active;this.button.hidden=!active;this.button.textContent='实验记录 · '+this.records().length;if(!active)this.close(false);if(this.dialog.open)this.render();}
 open(){if(!this.active||this.dialog.open)return;this.page=Math.max(0,Math.ceil(this.records().length/3)-1);this.onOpen();this.render();this.dialog.showModal();this.closeButton.focus();}
 close(restore=true){if(!this.dialog.open)return;this.dialog.close();this.onClose();if(restore&&!this.button.hidden)this.button.focus({preventScroll:true});}
 render(){
  const records=this.records(),pages=Math.max(1,Math.ceil(records.length/3));this.page=Math.max(0,Math.min(pages-1,this.page));const cards=[];
  for(let j=0;j<3;j++){const i=this.page*3+j,r=records[i],card=document.createElement('section');card.className='rocket-record-card';
   if(!r){card.classList.add('is-empty');const title=document.createElement('h3');title.textContent='待记录';const empty=document.createElement('div');empty.className='record-image-empty';empty.textContent='—';card.append(title,empty);cards.push(card);continue;}
   card.dataset.index=i;const state=r.status==='running'?'进行中':r.status==='interrupted'?'已中断':r.metric==='flight-height'?(r.height>0?'已完成':'未起飞'):'历史记录';
   const top=document.createElement('div');top.className='record-card-heading';const title=document.createElement('h3');title.textContent='第 '+(i+1)+' 次';
   const result=r.status==='running'?'进行中':r.height==null?(r.metric==='flight-distance'?r.distance+' 示意格（距离）':r.metric==null&&r.distance!=null?r.distance+' 示意格（旧版）':'未完成'):r.height+' 示意格';
   const badge=document.createElement('output');badge.className='record-result';badge.textContent=result;badge.setAttribute('aria-label',state+'，'+result);top.append(title,badge);
   const picture=document.createElement(r.image?'img':'div');if(r.image){picture.alt='第'+(i+1)+'次，推力'+recordLevel(r.thrust)+'，自重'+recordLevel(r.mass)+'，载荷'+recordLevel(r.load)+'，'+state;this.showPicture(picture,r);}else{picture.className='record-image-empty';picture.textContent='历史记录';}
   card.append(top,picture);cards.push(card);
  }
  this.dialog.querySelector('.rocket-record-cards').replaceChildren(...cards);this.dialog.querySelector('.record-prev').disabled=this.page===0;this.dialog.querySelector('.record-next').disabled=this.page>=pages-1;this.dialog.querySelector('.rocket-record-pages output').textContent=(this.page+1)+' / '+pages;
 }
 // Adapt previously saved landscape captures for display only. Never rewrite a historical image.
 showPicture(picture,record){
  if(record.imageLayout==='portrait-split-forces-v2'||!this.arrows){picture.src=record.image;return;}
  if(this.previewCache.has(record)){picture.src=this.previewCache.get(record);return;}
  const source=new Image();source.onload=()=>{
   if(source.width!==600||![360,720].includes(source.height)){picture.src=record.image;return;}
   const old=document.createElement('canvas');old.width=600;old.height=source.height;const oc=old.getContext('2d');oc.drawImage(source,0,0);const data=oc.getImageData(0,0,600,source.height).data;const x0=source.height===720?330:220,x1=source.height===720?540:380;let left=x1,right=x0,top=source.height,bottom=0;
   for(let y=0;y<source.height;y++)for(let x=x0;x<x1;x++){const i=(y*600+x)*4;if(Math.min(data[i],data[i+1],data[i+2])>135){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
   if(bottom<=top||right<=left){picture.src=record.image;return;}
   left=Math.max(0,left-9);top=Math.max(0,top-9);const w=Math.min(600-left,right-left+10),h=Math.min(source.height-top,bottom-top+10),k=Math.min(170/w,600/h),canvas=portraitCanvas(),c=canvas.getContext('2d');c.drawImage(source,left,top,w,h,425-w*k/2,360-h*k/2,w*k,h*k);drawRecordForces(c,this.arrows,record);const preview=canvas.toDataURL('image/webp',.85);this.previewCache.set(record,preview);if(this.previewCache.size>6)this.previewCache.delete(this.previewCache.keys().next().value);if(picture.isConnected)picture.src=preview;
  };source.onerror=()=>{if(picture.isConnected)picture.alt+='（缩略图不可用）';};source.src=record.image;
 }
 destroy(){this.close(false);removeEventListener('resize',this.resize);this.previewCache.clear();this.button.remove();this.dialog.remove();}
}

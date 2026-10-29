/* The front is an analytic conic; the original rear band and hardware remain fixed. */
'use strict';
const images=new Map(),views=[],state={concave:0,convex:0},sourceCache=new Map(),warpCache=new Map(),rangeCache=new Map();
const rearBand=3,minimumBlue=1.5;
const model=document.getElementById('curve-model');
function imageFor(file){if(!images.has(file)){const img=new Image();img.src=file;images.set(file,img);}return images.get(file);}
for(const [type,g] of Object.entries(manifest.groups)){
  const section=document.createElement('section'),h=document.createElement('h2');h.textContent=g.label;section.append(h);
  const controls=document.createElement('div');controls.className='rig-controls';
  controls.innerHTML='<label for="bend-'+type+'">镜面曲率 <small>更平缓</small><input id="bend-'+type+'" type="range" min="-60" max="100" value="0" step="1" aria-label="'+g.label+'镜面曲率"><small>更弯曲</small><output id="amount-'+type+'">0%</output></label><button type="button" data-reset="'+type+'">恢复初始曲率</button><small id="geometry-'+type+'"></small>';
  controls.querySelector('input').max=g.deformable.previewShape?.sliderMax??100;
  section.append(controls);document.querySelector('main').append(section);
  controls.querySelector('input').addEventListener('input',e=>{state[type]=Number(e.target.value);document.getElementById('amount-'+type).textContent=state[type]+'%';draw();});
  controls.querySelector('button').onclick=()=>{state[type]=0;controls.querySelector('input').value=0;document.getElementById('amount-'+type).textContent='0%';draw();};
  const grid=document.createElement('div');grid.className='cards';section.append(grid);
  for(const spec of [{key:'reference',label:'原图对照',file:'../'+type+'.png'},{key:'deformable',label:'可变镜体 · 镜面＋背壳',file:g.deformable.file},{key:'fixed',label:'固定结构 · 含上下端块',file:g.fixed.file},{key:'combined',label:'两层组合 · 背侧不动'}]){
    const f=document.createElement('figure'),caption=document.createElement('figcaption');caption.append(spec.label);
    if(spec.file){const a=document.createElement('a');a.href=spec.file;a.textContent='原始 PNG';caption.append(a);imageFor(spec.file);}
    const canvas=document.createElement('canvas');canvas.width=390;canvas.height=620;canvas.setAttribute('aria-label',g.label+spec.label);
    canvas.dataset.type=type;canvas.dataset.part=spec.key;
    const note=document.createElement('div');note.className='note';note.textContent=spec.key==='deformable'?'银色带与前缘同步移动，可见宽度基本不变；蓝色背壳衔接固定背缘。':spec.key==='fixed'?'上下两个长方体、螺钉及所有连接件都在此层。':spec.key==='combined'?'银蓝交界跟随镜面，最外背缘与支架保持不动。':'原文件保留。预览会先将镜面前缘校正为所选曲线。';
    f.append(caption,canvas,note);grid.append(f);views.push({type,g,spec,canvas});
  }
}
function sourceFor(type){
  if(sourceCache.has(type))return sourceCache.get(type);
  const layer=manifest.groups[type].deformable,m=layer.transform,canvas=document.createElement('canvas');
  canvas.width=manifest.referenceCanvas.width;canvas.height=manifest.referenceCanvas.height;
  const ctx=canvas.getContext('2d');ctx.setTransform(m.a,m.b,-m.b,m.a,m.x,m.y);ctx.drawImage(imageFor(layer.file),0,0);ctx.resetTransform();
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data,rows=[];
  for(let y=0;y<canvas.height;y++){
    let front=-1,rear=-1;
    for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>32){if(front<0)front=x;rear=x;}
    rows.push({front,rear});
  }
  const contacts=manifest.groups[type].contacts,top=Math.ceil(contacts[0].y),bottom=Math.floor(contacts[1].y);
  // Locate the silver/blue seam once, using the sustained red/green drop.
  // Front texture is then translated intact, rather than scaled into the rear.
  for(let y=top;y<=bottom;y++){
    const row=rows[y];let seam=row.front+1,score=-Infinity;
    for(let x=row.front+Math.ceil((row.rear-row.front)*.4);x<=row.rear-9;x++){
      let drop=0;for(let k=1;k<=4;k++){
        const left=(y*canvas.width+x-k)*4,right=(y*canvas.width+x+k-1)*4;
        drop+=data[left]+data[left+1]-data[right]-data[right+1];
      }
      if(drop>score){score=drop;seam=x;}
    }
    row.colourSeam=seam;
  }
  const start={x:rows[top].front,y:top},end={x:rows[bottom].front,y:bottom};
  const length=Math.hypot(end.x-start.x,end.y-start.y),normal={x:(end.y-start.y)/length,y:-(end.x-start.x)/length};
  const mid=Math.round((top+bottom)/2),middle={x:(start.x+end.x)/2,y:(top+bottom)/2};
  const nativeSag=Math.abs((rows[mid].front-middle.x)*normal.x+(mid-middle.y)*normal.y);
  const shape=layer.previewShape||{},baseSag=nativeSag*(shape.sagScale??1),silverScale=shape.silverWidthScale??1;
  // Include the seam's colour gradient in the invariant strip. Near the end
  // caps there is less blue space; retain only the available transition tail.
  // Source seam selection uses the native profile; display shape parameters
  // are applied afterwards so a flatter preview still uses all silver texture.
  const baseline=MirrorProfile.create(start,end,nativeSag,'parabola',layer.bendSign);
  const spherical=MirrorProfile.create(start,end,nativeSag,'sphere',layer.bendSign);
  for(let y=top;y<=bottom;y++){
    const row=rows[y],baselineFront=Math.max(baseline.atY(y),spherical.atY(y));
    const available=Math.floor(row.rear-rearBand-minimumBlue-(baselineFront-row.front)-.1);
    row.seam=Math.min(row.colourSeam+4,available);row.silverWidth=(row.seam-row.front)*silverScale;
  }
  const source={canvas,rows,start,end,baseSag};sourceCache.set(type,source);return source;
}
function curveFor(type,sag){
  const source=sourceFor(type);return MirrorProfile.create(source.start,source.end,sag,model.value,manifest.groups[type].deformable.bendSign);
}
function rangeFor(type){
  const key=type+'/'+model.value;if(rangeCache.has(key))return rangeCache.get(key);
  const source=sourceFor(type),base=source.baseSag;
  const fits=sag=>{
    const p=curveFor(type,sag);
    for(let y=source.start.y;y<=source.end.y;y++){
      const row=source.rows[y];if(row.rear-rearBand-p.atY(y)-row.silverWidth<minimumBlue)return false;
    }
    return true;
  };
  if(!fits(base))throw new RangeError('Baseline silver band does not fit inside the fixed rear');
  const limit=requested=>{
    if(fits(requested))return requested;
    let good=base,bad=requested;
    for(let i=0;i<24;i++){const mid=(good+bad)/2;if(fits(mid))good=mid;else bad=mid;}
    return good;
  };
  const shape=manifest.groups[type].deformable.previewShape||{};
  const range={low:limit(base*.6),high:limit(base*(shape.highFactor??1.4))};rangeCache.set(key,range);return range;
}
function profileFor(type){
  const base=sourceFor(type).baseSag,value=state[type],range=rangeFor(type);
  const sag=value<0?base+(base-range.low)*value/60:base+(range.high-base)*value/100;
  return curveFor(type,sag);
}
function warpedBody(type){
  const source=sourceFor(type),profile=profileFor(type),key=model.value+'/'+state[type];
  let cache=warpCache.get(type);if(cache&&cache.key===key)return cache.canvas;
  if(!cache){const canvas=document.createElement('canvas');canvas.width=source.canvas.width;canvas.height=source.canvas.height;cache={canvas};warpCache.set(type,cache);}
  const ctx=cache.canvas.getContext('2d');ctx.clearRect(0,0,cache.canvas.width,cache.canvas.height);
  for(let y=0;y<source.rows.length;y++){
    const {front,rear,seam,silverWidth}=source.rows[y];if(front<0)continue;
    const target=profile.atY(y);
    if(target===null){ctx.drawImage(source.canvas,0,y,source.canvas.width,1,0,y,source.canvas.width,1);continue;}
    // Translate the silver strip without scaling its width. Only blue casing
    // between the moving seam and invariant outer rear band changes width.
    const split=rear-rearBand,targetSeam=target+silverWidth;
    if(!(split-targetSeam>=minimumBlue-1e-6&&split>seam))throw new RangeError('Silver band would cross the fixed rear surface');
    ctx.drawImage(source.canvas,front,y,seam-front,1,target,y,silverWidth,1);
    ctx.drawImage(source.canvas,seam,y,split-seam,1,targetSeam,y,split-targetSeam,1);
    ctx.drawImage(source.canvas,split,y,source.canvas.width-split,1,split,y,source.canvas.width-split,1);
  }
  cache.key=key;return cache.canvas;
}
function paintLayer(ctx,type,part){
  if(part==='deformable'){ctx.drawImage(warpedBody(type),0,0);return;}
  const layer=manifest.groups[type][part],m=layer.transform;ctx.save();ctx.transform(m.a,m.b,-m.b,m.a,m.x,m.y);ctx.drawImage(imageFor(layer.file),0,0);ctx.restore();
}
function drawGuide(ctx,type){
  const p=profileFor(type);ctx.save();ctx.strokeStyle='#ffd87d';ctx.lineWidth=1.2;ctx.setLineDash([4,3]);ctx.beginPath();
  for(let i=0;i<=200;i++){const pt=p.point(i/200);if(i)ctx.lineTo(pt.x,pt.y);else ctx.moveTo(pt.x,pt.y);}ctx.stroke();ctx.restore();
}
function draw(){
  const visible=new Set([...document.querySelectorAll('[data-visible]:checked')].map(x=>x.dataset.visible));
  const guide=document.getElementById('curve-guide').checked;
  document.getElementById('curve-description').textContent=model.value==='parabola'?'抛物线：u² = 4|f|z。此处 z 从顶点沿开口方向计；凹、凸对应相反的反射面朝向。轴上平行光的焦点关系精确成立。':'圆弧：u² + (z − R)² = R²。球面镜仅在近轴条件下满足 |f| ≈ R/2；大口径会出现球差。';
  for(const type of Object.keys(manifest.groups)){
    const p=profileFor(type);document.getElementById('geometry-'+type).textContent='弓高 '+p.sag.toFixed(1)+' px · '+(p.kind==='sphere'?'近轴 ':'')+'|f| '+p.focalMagnitude.toFixed(1)+' px · 银色带宽度保持 · 背缘位移 0 px';
  }
  for(const {canvas,type,spec} of views){
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,390,620);ctx.save();ctx.translate(-980,-130);
    if(spec.key==='reference')ctx.drawImage(imageFor(spec.file),0,0);
    else if(spec.key==='combined'){if(visible.has('deformable'))paintLayer(ctx,type,'deformable');if(visible.has('fixed'))paintLayer(ctx,type,'fixed');if(guide&&visible.has('deformable'))drawGuide(ctx,type);}
    else {paintLayer(ctx,type,spec.key);if(guide&&spec.key==='deformable')drawGuide(ctx,type);}
    ctx.restore();
  }
}
Promise.all([...images.values()].map(img=>img.decode())).then(()=>{draw();document.body.dataset.ready='true';document.getElementById('status').textContent='解析曲线与固定背侧已就绪';}).catch(e=>{document.getElementById('status').textContent='加载失败：'+e.message;console.error(e);});
document.querySelectorAll('[data-visible],#curve-guide,#curve-model').forEach(input=>input.onchange=()=>{if(document.body.dataset.ready)draw();});
document.getElementById('background').onclick=()=>{const light=document.body.classList.toggle('light');document.getElementById('background').textContent=light?'切换深色底':'切换浅色底';};

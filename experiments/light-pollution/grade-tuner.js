(() => {
  const root=document.querySelector('.stage-top');
  if(!root)return;
  const fields=[
    {key:'--grade-top',label:'距顶 %',min:1,max:12,step:.1,unit:'%',value:4.2},
    {key:'--grade-left',label:'距左 %',min:1,max:10,step:.1,unit:'%',value:3.6},
    {key:'--grade-right',label:'距右 %',min:2,max:20,step:.1,unit:'%',value:12},
    {key:'--grade-gap',label:'与标题间距',min:.4,max:3,step:.05,unit:'cqw',value:1.2},
    {key:'--grade-title-size',label:'页面标题字号',min:1.6,max:4.5,step:.05,unit:'cqw',value:2.9},
    {key:'--grade-pad-y',label:'卡片上下内边距',min:.2,max:2,step:.05,unit:'cqw',value:.75},
    {key:'--grade-pad-x',label:'卡片左右内边距',min:.4,max:3,step:.05,unit:'cqw',value:1.3},
    {key:'--grade-radius',label:'卡片圆角',min:.2,max:2.5,step:.05,unit:'cqw',value:1.2},
    {key:'--grade-border',label:'描边厚度',min:.04,max:.4,step:.02,unit:'cqw',value:.12},
    {key:'--grade-caption-size',label:'“当前光污染等级”字号',min:.6,max:1.6,step:.05,unit:'cqw',value:1},
    {key:'--grade-number-size',label:'数字字号',min:1.4,max:4,step:.05,unit:'cqw',value:2.6},
    {key:'--grade-unit-size',label:'“级”字号',min:.7,max:2,step:.05,unit:'cqw',value:1.2},
    {key:'--grade-copy-size',label:'说明文字字号',min:.7,max:1.8,step:.05,unit:'cqw',value:1.1},
    {key:'--grade-copy-line',label:'说明行高',min:1.2,max:1.9,step:.05,unit:'',value:1.55},
    {key:'--grade-ring-size',label:'圆环尺寸',min:3,max:8,step:.1,unit:'cqw',value:5.6},
    {key:'--grade-ring-width',label:'圆环线宽',min:.08,max:.5,step:.02,unit:'cqw',value:.22},
    {key:'--grade-ring-inset-x',label:'圆环距左边框',min:-1.5,max:3,step:.05,unit:'cqw',value:0},
    {key:'--grade-ring-inset-y',label:'圆环距上边框',min:-1.5,max:3,step:.05,unit:'cqw',value:0},
    {key:'--grade-ring-inset-bottom',label:'圆环距下边框',min:0,max:3,step:.05,unit:'cqw',value:.5},
    {key:'--grade-number-shift-x',label:'数字距外框（水平）',min:-1.5,max:1.5,step:.05,unit:'cqw',value:0},
    {key:'--grade-number-shift-y',label:'数字距外框（垂直）',min:-1.5,max:1.5,step:.05,unit:'cqw',value:0},
    {key:'--grade-unit-gap',label:'“级”与圆环间距',min:0,max:2,step:.05,unit:'cqw',value:.55},
    {key:'--grade-unit-shift-x',label:'“级”距外框（水平）',min:-1.5,max:2,step:.05,unit:'cqw',value:0},
    {key:'--grade-unit-shift-y',label:'“级”距外框（垂直）',min:-1.5,max:2,step:.05,unit:'cqw',value:0},
    {key:'--grade-level-width',label:'左侧等级区宽度',min:6,max:14,step:.1,unit:'cqw',value:10.2},
    {key:'--grade-divider',label:'分隔线厚度',min:0,max:.3,step:.02,unit:'cqw',value:.08}
  ];
  const storageKey='light-pollution-grade-tuner';
  const values={};
  fields.forEach(field=>values[field.key]=field.value);
  try{Object.assign(values,JSON.parse(localStorage.getItem(storageKey)||'{}'));}catch{}
  const tuner=document.createElement('section');
  tuner.className='grade-tuner';
  tuner.hidden=true;
  tuner.innerHTML='<div class="grade-tuner-head"><h2>等级条样式</h2><button type="button" class="grade-tuner-hide">收起</button></div><div class="grade-tuner-list"></div><div class="grade-tuner-actions"><button type="button" class="grade-tuner-reset">恢复默认</button><button type="button" class="grade-tuner-copy-btn">复制 CSS</button></div><pre class="grade-tuner-copy"></pre>';
  const openButton=document.createElement('button');
  openButton.className='grade-tuner-toggle';
  openButton.type='button';
  openButton.textContent='等级条样式';
  openButton.setAttribute('aria-expanded','false');
  const list=tuner.querySelector('.grade-tuner-list');
  const preview=tuner.querySelector('.grade-tuner-copy');
  function cssText(){
    return fields.map(field=>`${field.key}: ${values[field.key]}${field.unit};`).join('\n');
  }
  function apply(){
    fields.forEach(field=>root.style.setProperty(field.key,`${values[field.key]}${field.unit}`));
    preview.textContent=`.stage-top {\n  ${cssText().replaceAll('\n','\n  ')}\n}`;
    localStorage.setItem(storageKey,JSON.stringify(values));
  }
  fields.forEach(field=>{
    const label=document.createElement('label');
    const read=document.createElement('output');
    const input=document.createElement('input');
    input.type='range';input.min=String(field.min);input.max=String(field.max);input.step=String(field.step);
    input.value=String(values[field.key]);
    read.value=`${values[field.key]}${field.unit}`;
    label.append(field.label,' ',read);
    list.append(label,input);
    input.addEventListener('input',()=>{
      values[field.key]=Number(input.value);
      read.value=`${values[field.key]}${field.unit}`;
      apply();
    });
    field.input=input;field.read=read;
  });
  function show(){
    tuner.hidden=false;
    openButton.hidden=true;
    openButton.setAttribute('aria-expanded','true');
  }
  function hide(){
    tuner.hidden=true;
    openButton.hidden=false;
    openButton.setAttribute('aria-expanded','false');
  }
  openButton.addEventListener('click',show);
  tuner.querySelector('.grade-tuner-hide').addEventListener('click',hide);
  tuner.querySelector('.grade-tuner-reset').addEventListener('click',()=>{
    fields.forEach(field=>{
      values[field.key]=field.value;
      field.input.value=String(field.value);
      field.read.value=`${field.value}${field.unit}`;
    });
    localStorage.removeItem(storageKey);
    apply();
  });
  tuner.querySelector('.grade-tuner-copy-btn').addEventListener('click',async()=>{
    const text=preview.textContent;
    try{await navigator.clipboard.writeText(text);}catch{
      const box=document.createElement('textarea');box.value=text;document.body.append(box);box.select();document.execCommand('copy');box.remove();
    }
    tuner.querySelector('.grade-tuner-copy-btn').textContent='已复制';
    setTimeout(()=>tuner.querySelector('.grade-tuner-copy-btn').textContent='复制 CSS',1200);
  });
  document.body.append(openButton,tuner);
  apply();
})();

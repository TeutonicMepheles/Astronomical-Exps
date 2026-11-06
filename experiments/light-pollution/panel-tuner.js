(() => {
  const dock=document.querySelector('.control-dock');
  if(!dock)return;
  const fields=[
    {key:'--dock-width-px',label:'面板宽度 px',min:220,max:480,step:2,unit:'px',value:320},
    {key:'--dock-width-pct',label:'面板宽度 %',min:18,max:45,step:.5,unit:'%',value:28},
    {key:'--dock-top',label:'距顶 %',min:0,max:12,step:.1,unit:'%',value:3.2},
    {key:'--dock-right',label:'距右 %',min:0,max:8,step:.1,unit:'%',value:1.5},
    {key:'--dock-bottom',label:'距底 %',min:8,max:22,step:.1,unit:'%',value:13},
    {key:'--dock-pad-y',label:'上下内边距',min:6,max:32,step:1,unit:'px',value:16},
    {key:'--dock-pad-x',label:'左右内边距',min:8,max:32,step:1,unit:'px',value:18},
    {key:'--dock-radius',label:'面板圆角',min:0,max:32,step:1,unit:'px',value:18},
    {key:'--dock-title-size',label:'标题字号',min:12,max:28,step:1,unit:'px',value:18},
    {key:'--dock-group-title-size',label:'分组标题字号',min:11,max:22,step:1,unit:'px',value:15},
    {key:'--dock-indent',label:'参数行缩进',min:0,max:48,step:1,unit:'px',value:16},
    {key:'--dock-label-size',label:'标签/读数字号',min:10,max:20,step:1,unit:'px',value:13},
    {key:'--dock-chip-size',label:'档位按钮字号',min:10,max:18,step:1,unit:'px',value:12},
    {key:'--dock-chip-height',label:'档位按钮高度',min:24,max:52,step:1,unit:'px',value:36},
    {key:'--dock-chip-radius',label:'档位按钮圆角',min:0,max:20,step:1,unit:'px',value:8},
    {key:'--dock-chip-gap',label:'档位按钮间距',min:2,max:16,step:1,unit:'px',value:6},
    {key:'--dock-icon-size',label:'分组图标',min:12,max:32,step:1,unit:'px',value:18},
    {key:'--dock-close-size',label:'关闭按钮尺寸',min:28,max:56,step:1,unit:'px',value:44},
    {key:'--dock-close-font',label:'关闭按钮字号',min:16,max:36,step:1,unit:'px',value:26},
    {key:'--dock-toggle-size',label:'菜单按钮尺寸',min:36,max:72,step:1,unit:'px',value:52},
    {key:'--dock-toggle-top',label:'菜单距顶 %',min:1,max:12,step:.1,unit:'%',value:4.4},
    {key:'--dock-toggle-right',label:'菜单距右 %',min:.5,max:8,step:.1,unit:'%',value:2},
    {key:'--dock-toggle-radius',label:'菜单圆角',min:4,max:28,step:1,unit:'px',value:14},
    {key:'--dock-bar-width',label:'菜单三条杠宽度',min:10,max:28,step:1,unit:'px',value:18},
    {key:'--dock-track-height',label:'滑条轨道厚度',min:3,max:12,step:1,unit:'px',value:6},
    {key:'--dock-thumb-size',label:'滑条圆钮',min:12,max:28,step:1,unit:'px',value:18},
    {key:'--dock-slider-height',label:'滑条点击高度',min:18,max:40,step:1,unit:'px',value:28},
    {key:'--dock-group-pad',label:'分组上下间距',min:2,max:24,step:1,unit:'px',value:10},
    {key:'--dock-heading-gap',label:'标题下间距',min:0,max:20,step:1,unit:'px',value:6},
    {key:'--dock-label-gap',label:'标签间距',min:2,max:16,step:1,unit:'px',value:8}
  ];
  const storageKey='light-pollution-dock-tuner';
  const values={};
  fields.forEach(field=>values[field.key]=field.value);
  try{Object.assign(values,JSON.parse(localStorage.getItem(storageKey)||'{}'));}catch{}
  const tuner=document.createElement('section');
  tuner.className='panel-tuner';
  tuner.hidden=true;
  tuner.innerHTML='<div class="panel-tuner-head"><h2>右侧面板样式</h2><button type="button" class="panel-tuner-hide">收起</button></div><div class="panel-tuner-list"></div><div class="panel-tuner-actions"><button type="button" class="panel-tuner-reset">恢复默认</button><button type="button" class="panel-tuner-copy-btn">复制 CSS</button></div><pre class="panel-tuner-copy"></pre>';
  const openButton=document.createElement('button');
  openButton.className='panel-tuner-toggle';
  openButton.type='button';
  openButton.textContent='面板样式';
  openButton.setAttribute('aria-expanded','false');
  const list=tuner.querySelector('.panel-tuner-list');
  const preview=tuner.querySelector('.panel-tuner-copy');
  function cssText(){
    return fields.map(field=>`${field.key}: ${values[field.key]}${field.unit};`).join('\n');
  }
  function apply(){
    fields.forEach(field=>dock.style.setProperty(field.key,`${values[field.key]}${field.unit}`));
    preview.textContent=`.control-dock {\n  ${cssText().replaceAll('\n','\n  ')}\n}`;
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
    window.ControlDock?.open();
  }
  function hide(){
    tuner.hidden=true;
    openButton.hidden=false;
    openButton.setAttribute('aria-expanded','false');
  }
  openButton.addEventListener('click',show);
  tuner.querySelector('.panel-tuner-hide').addEventListener('click',hide);
  tuner.querySelector('.panel-tuner-reset').addEventListener('click',()=>{
    fields.forEach(field=>{
      values[field.key]=field.value;
      field.input.value=String(field.value);
      field.read.value=`${field.value}${field.unit}`;
    });
    localStorage.removeItem(storageKey);
    apply();
  });
  tuner.querySelector('.panel-tuner-copy-btn').addEventListener('click',async()=>{
    const text=preview.textContent;
    try{await navigator.clipboard.writeText(text);}catch{
      const box=document.createElement('textarea');box.value=text;document.body.append(box);box.select();document.execCommand('copy');box.remove();
    }
    tuner.querySelector('.panel-tuner-copy-btn').textContent='已复制';
    setTimeout(()=>tuner.querySelector('.panel-tuner-copy-btn').textContent='复制 CSS',1200);
  });
  document.body.append(openButton,tuner);
  apply();
})();

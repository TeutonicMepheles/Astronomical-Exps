/* A local authoring surface. Experiment stores and owning modules retain control of behavior. */
(function (N) {
  'use strict';
  const D = N.developer, stage = document.querySelector('.observatory');
  const $ = s => document.querySelector(s);
  const stageNames = {mirrors:'认识镜面',assembly:'组装望远镜',observation:'参数观测'};
  const definitions = [
    ['introduction','标题说明整体','.introduction'],['title','主标题','.introduction h1'],['english','英文副标题','.english-title'],['description','阶段说明','.introduction .description'],
    ['progress','任务菜单整体','#course-progress'],['viewport','光学实验台整体（含光路）','#viewport',['mirrors']],
    ['mirror-tray','反射镜托盘','#table-mirror-page',['mirrors']],['plane','平面镜','[data-mirror="plane"]',['mirrors']],['concave','凹面镜','[data-mirror="concave"]',['mirrors']],['convex','凸面镜','[data-mirror="convex"]',['mirrors']],
    ['lens-tray','透镜托盘','#table-lens-page',['mirrors']],['concave-lens','凹透镜','[data-table-lens="concave"]',['mirrors']],['convex-lens','凸透镜','[data-table-lens="convex"]',['mirrors']],
    ['mounted-controls','镜座焦距与取下控件','#mounted-mirror-controls',['mirrors']],['next-page','下一页箭头','.table-page-next',['mirrors']],['previous-page','上一页箭头','.table-page-previous',['mirrors']],
    ['finish-mirrors','进入组装按钮','#finish-mirrors',['mirrors']],['feedback','右侧反馈卡','.preview-card'],['stationery','桌面文具整体','.lab-stationery'],
    ['workbench','组装桌面','.workbench-table',['assembly']],['assembly-instrument','组装望远镜整体','.assembly-preview',['assembly']],['assembly-tray','组装零件托盘','.assembly-mirror-tray',['assembly']],
    ['primary-part','主镜零件','[data-assembly-mirror="concave"]',['assembly']],['secondary-part','副镜零件','[data-assembly-mirror="plane"]',['assembly']],['convex-part','凸面镜零件','[data-assembly-mirror="convex"]',['assembly']],
    ['primary-slot','主镜安装位','.assembly-slot.concave',['assembly']],['secondary-slot','副镜安装位','.assembly-slot.plane',['assembly']],
    ['assembly-next','进入观测按钮','.assembly-next',['assembly']],['assembly-reset','重新组装按钮','.assembly-reset',['assembly']],
    ['observation-instrument','观测望远镜','.observation-instrument',['observation']],['observation-sliders','观测滑块整体','.observation-sliders',['observation']],
    ['focal-slider','主镜焦距滑块','.observation-slider:has(#focal)',['observation']],['eyepiece-slider','目镜焦距滑块','.observation-slider:has(#eyepiece)',['observation']],['aperture-slider','主镜口径滑块','.observation-slider:has(#aperture)',['observation']],
    ['observation-launch','观测按钮组','.observation-launch',['observation']],['observation-targets','观测目标按钮组','.observation-targets',['observation']],
    ['observation-close','收起观测按钮','.observation-close',['observation']],['observation-details-toggle','对照实验入口','.observation-detail-toggle',['observation']],['observation-details','对照实验面板','#observation-details',['observation']],
    ['observation-message','观测提示','.observation-message',['observation']],['observation-stars','观测星空','.observation-starfield',['observation']],['observation-foreground','观测远景','.observation-foreground',['observation']],['observation-table','观测夜景背景','.observation-night',['observation']]
  ];
  const targets = definitions.map(([id,label,selector,stages]) => ({id,label,element:$(selector),stages:stages || D.stages})).filter(t => t.element);
  targets.forEach(t => t.element.dataset.devTarget = t.id);
  const heading = new N.ExperimentHeading($('.introduction'));
  const textDefinitions = [
    ['title','主标题','.introduction h1'],['english','英文副标题','.english-title'],['description','阶段说明','.introduction .description'],
    ['finish-mirrors','进入组装按钮','#finish-mirrors',['mirrors']],['assembly-next','进入观测按钮','.assembly-next',['assembly']],['assembly-reset','重新组装按钮','.assembly-reset',['assembly']],
    ['observation-open','目镜观测按钮','.observation-open',['observation']],['observation-reset','重置参数按钮','.observation-reset',['observation']],
    ['observation-details-toggle','对照实验入口','.observation-detail-toggle',['observation']],['target-saturn','土星按钮','[data-observation-target="saturn"]',['observation']],['target-moon','月球按钮','[data-observation-target="moon"]',['observation']],['target-jupiter','木星按钮','[data-observation-target="jupiter"]',['observation']],['target-pleiades','昴星团按钮','[data-observation-target="pleiades"]',['observation']]
  ];
  const textTargets = textDefinitions.map(([id,label,selector,stages]) => {
    const element = $(selector); return {id,label,element,stages:stages || D.stages,original:element?.innerHTML};
  }).filter(t => t.element);
  const skyDefaults = window.NightSkyControls.getSettings();
  const opticalDefaults = N.store.get();
  const launch = document.createElement('button');
  launch.type='button';launch.id='developer-launch';launch.className='developer-launch';launch.textContent='开发者模式';launch.setAttribute('aria-controls','developer-panel');
  const panel = document.createElement('aside');
  panel.id='developer-panel';panel.className='developer-panel';panel.hidden=true;panel.setAttribute('aria-label','开发者模式');
  panel.innerHTML=`<header><div><small>NEWTON · DEV TOOLS</small><strong>开发者模式</strong></div><button type="button" class="developer-close" data-action="close" aria-label="收起开发者面板">×</button></header>
    <nav class="developer-tabs" role="tablist" aria-label="开发工具"><button type="button" role="tab" id="dev-tab-steps" aria-controls="dev-page-steps" data-tab="steps">步骤跳转</button><button type="button" role="tab" id="dev-tab-layout" aria-controls="dev-page-layout" data-tab="layout">元素布局</button><button type="button" role="tab" id="dev-tab-content" aria-controls="dev-page-content" data-tab="content">文字数值</button><button type="button" role="tab" id="dev-tab-effects" aria-controls="dev-page-effects" data-tab="effects">交互效果</button></nav>
    <div class="developer-body">
      <section id="dev-page-steps" role="tabpanel" aria-labelledby="dev-tab-steps" data-page="steps"><h3>自由切换实验步骤</h3><p class="developer-note">直接进入任意页面。真实学习进度仍按实际操作记录。</p><div class="developer-steps"><button type="button" data-jump="mirrors"><b>01 A</b><span>认识镜面 · 反射镜</span><small>↗</small></button><button type="button" data-jump="lenses"><b>01 B</b><span>认识镜面 · 透镜</span><small>↗</small></button><button type="button" data-jump="assembly"><b>02</b><span>组装望远镜</span><small>↗</small></button><button type="button" data-jump="observation"><b>03</b><span>参数观测</span><small>↗</small></button></div><p class="developer-note" id="dev-current-stage"></p><div class="developer-pair"><button type="button" data-action="preview">打开目镜观测</button><button type="button" data-action="reset-stage">重置当前步骤</button></div><h3>使用方式</h3><p class="developer-note">切换到「元素布局」，选择元素或在画布上点选拖动。所有位移以 1600 × 900 舞台坐标计算，各阶段分别保存。</p><p class="developer-note">参数自动暂存在本浏览器；导出 JSON 可备份并在其他浏览器导入。退出调试后显示原版布局，保留配置供下次继续。</p></section>
      <section id="dev-page-layout" role="tabpanel" aria-labelledby="dev-tab-layout" data-page="layout" hidden><h3>元素位置与外观</h3><label class="developer-field"><span>当前阶段的元素</span><select id="dev-target" aria-label="选择调节元素"></select></label><div class="developer-pair"><button type="button" data-action="pick" aria-pressed="false">画布点选 / 拖动</button><button type="button" data-action="reset-element">恢复此元素</button></div><p class="developer-note">位移相对原布局，X 向右、Y 向下。光学实验台整体移动时，器材、光路与点击区域保持联动。</p><div id="dev-layout-fields"></div><div class="developer-nudge"><button type="button" data-nudge="-1,0" aria-label="向左微调">←</button><button type="button" data-nudge="0,-1" aria-label="向上微调">↑</button><button type="button" data-nudge="0,1" aria-label="向下微调">↓</button><button type="button" data-nudge="1,0" aria-label="向右微调">→</button></div><label class="developer-field"><span>每次微调距离</span><select id="dev-nudge-step"><option value="1">1 px</option><option value="10">10 px</option><option value="50">50 px</option></select></label><p class="developer-note">点选模式下可用方向键，按住 Shift 每次移动 10 px；Esc 结束点选。</p></section>
      <section id="dev-page-content" role="tabpanel" aria-labelledby="dev-tab-content" data-page="content" hidden><h3>文案编辑</h3><label class="developer-field"><span>文字位置</span><select id="dev-text-target" aria-label="选择文案"></select></label><label class="developer-field"><span>显示文字（支持换行）</span><textarea id="dev-text" maxlength="1200" aria-label="编辑显示文字"></textarea></label><button type="button" data-action="reset-text">恢复此处原文</button><h3>光学演示参数</h3><p class="developer-note">沿用当前版本的范围与计算，数值即时联动。镜面参数需先在第一阶段安装镜片。</p><div id="dev-parameter-fields"></div><div class="developer-pair"><button type="button" data-mount="plane">装平面镜</button><button type="button" data-mount="concave">装凹面镜</button><button type="button" data-mount="convex">装凸面镜</button></div><div id="dev-mirror-fields"></div></section>
      <section id="dev-page-effects" role="tabpanel" aria-labelledby="dev-tab-effects" data-page="effects" hidden><h3>交互与光路</h3><div id="dev-effect-fields"></div><p class="developer-note">转场速度为 0 时即时切换，光子速度为 0 时暂停流动。系统「减少动态效果」设置优先。</p><h3>夜空与前景</h3><div id="dev-sky-fields"></div></section>
    </div><p class="developer-status" role="status" aria-live="polite"></p><footer class="developer-footer"><button type="button" data-action="undo">撤销修改</button><button type="button" data-action="export">导出配置</button><button type="button" data-action="import">导入配置</button><button type="button" data-action="reset-all">恢复全部默认</button><button type="button" data-action="close">收起面板</button><button type="button" data-action="exit">退出调试</button></footer><input type="file" id="dev-import" accept=".json,application/json" hidden>`;
  const style = document.createElement('style'), selection = document.createElement('div');
  selection.className='developer-selection';selection.hidden=true;selection.setAttribute('aria-hidden','true');selection.append(document.createElement('span'));
  document.head.append(style);document.body.append(launch,panel,selection);
  const q = s => panel.querySelector(s);
  let tab='steps', selected=targets[0]?.id, selectedText='title', picking=false, drag=null, history=[], returnFocus, frame=0, lastStage='';
  const numericFields = new Map();
  const currentStage = () => N.course.get().stage;
  // Keep legacy exterior adjustments, but never apply them to the section close-up.
  const layoutId = id => id==='observation-instrument'&&N.app.observationModel?.viewMode==='section'?id+'-section':id;
  const layoutValue = (id,s=currentStage()) => D.layout(layoutId(id),s);
  const configKey = id => currentStage()+'/'+layoutId(id);
  const activeTarget = () => targets.find(t => t.id===selected);
  const activeText = () => textTargets.find(t => t.id===selectedText);
  function status(message) { q('.developer-status').textContent=message; }
  function remember() { history.push({config:D.snapshot(),parameters:N.store.get()}); if(history.length>40)history.shift();q('[data-action="undo"]').disabled=false; }
  function change(group,id,value) {remember();D.update(group,id,value);}
  function field(container,id,label,min,max,step,onChange) {
    const row=document.createElement('label');row.className='developer-number';
    const caption=document.createElement('span');caption.textContent=label;
    const pair=document.createElement('div'),range=document.createElement('input'),number=document.createElement('input');
    range.type='range';number.type='number';range.id='dev-'+id;number.id='dev-'+id+'-number';
    for(const input of [range,number]) {input.min=min;input.max=max;input.step=step;input.setAttribute('aria-label',label+(input===number?'数值':''));input.addEventListener('input',()=>{if(input.value.trim()==='')return;const value=Number(input.value);if(!Number.isFinite(value))return;const start=Number(input.min),end=Number(input.max),stride=Number(input.step);onChange(Number(Math.max(start,Math.min(end,start+Math.round((value-start)/stride)*stride)).toFixed(5)));});input.addEventListener('change',()=>{const active=document.activeElement;input.blur();syncValues();if(active===input)input.focus();});}
    pair.append(range,number);row.append(caption,pair);q(container).append(row);numericFields.set(id,{range,number});
  }
  function value(id,value,disabled=false,limits) {
    const pair=numericFields.get(id);if(!pair)return;
    for(const input of Object.values(pair)) {if(limits){input.min=limits.min;input.max=limits.max;}if(document.activeElement!==input)input.value=Number(Number(value).toFixed(3));input.disabled=disabled;}
  }
  for(const [id,label,min,max,step,initial] of [['x','水平位移 X · px',-1600,1600,1,0],['y','垂直位移 Y · px',-900,900,1,0],['scale','缩放 · %',10,300,1,100],['rotation','旋转 · °',-180,180,1,0],['opacity','透明度 · %',0,100,1,100]]) {
    field('#dev-layout-fields',id,label,min,max,step,v=>change('layout',configKey(selected),{...layoutValue(selected),[id]:id==='scale'||id==='opacity'?v/100:v}));
  }
  for(const [id,label,min,max,step] of [['focal','主镜焦距 · mm',400,1600,10],['eyepiece','目镜焦距 · mm',5,50,1],['aperture','主镜口径 · mm',80,250,10],['angle','望远镜角度 · °',0,90,1]]) {
    field('#dev-parameter-fields',id,label,min,max,step,v=>{change('parameters',id,v);N.store.set({[id]:v});});
  }
  field('#dev-mirror-fields','mirror-focal','当前反射镜焦距 · mm',300,1200,1,v=>N.course.setMirrorFocal(v));
  field('#dev-mirror-fields','mirror-position','镜座位置 · 场景单位',-3,5.3,.01,v=>N.course.setMirrorPosition(v));
  const effectDefs=[['transitionSpeed','转场速度 · ×',0,3,.1],['photonSpeed','光子流动速度 · ×',0,3,.1],['beamStrength','光束亮度 · ×',0,2,.05],['dragThreshold','镜座拖动阈值 · 屏幕 px',1,20,1]];
  effectDefs.forEach(([id,label,min,max,step])=>field('#dev-effect-fields',id,label,min,max,step,v=>change('effects',id,v)));
  window.NightSkyControls.getFields().forEach(([id,label,min,max,step,,unit])=>field('#dev-sky-fields','sky-'+id,label+(unit?' · '+unit:''),min,max,step,v=>change('sky',id,v)));
  function apply() {
    const s=currentStage(), rules=[];
    if(D.enabled) for(const target of targets) {
      const p=layoutValue(target.id,s);
      if(!Object.keys(p).length)continue;
      const selector=`[data-dev-target="${target.id}"]`+(target.id==='observation-table'?',.observatory .observation-saturn-layer':'');
      rules.push(`${selector}{translate:${p.x||0}px ${p.y||0}px;scale:${p.scale??1};rotate:${p.rotation||0}deg;opacity:${p.opacity??1}!important;}`);
    }
    style.textContent=rules.join('\n');
    heading.update(s);
    for(const t of textTargets) {
      if(['title','english','description'].includes(t.id)){t.element.classList.toggle('developer-text-override',D.enabled&&Object.hasOwn(D.snapshot().text,s+'/'+t.id));continue;}
      const text=D.enabled?D.snapshot().text[s+'/'+t.id]:undefined;
      if(text===undefined){if(t.element.dataset.devTextOverride){t.element.innerHTML=t.original;delete t.element.dataset.devTextOverride;}}
      else if(t.element.textContent!==text||!t.element.dataset.devTextOverride){t.element.textContent=text;t.element.dataset.devTextOverride='true';}
      t.element.classList.toggle('developer-text-override',text!==undefined);
    }
    window.NightSkyControls.setSettings(D.enabled?{...skyDefaults,...D.snapshot().sky}:skyDefaults);
    N.app.telescope?.lab.setBeamOpacity(N.app.telescope.lab.beamOpacity);
    N.app.telescope && (N.app.telescope.dirty=true);
    N.app.observationModel?.render();
    launch.setAttribute('aria-pressed',String(D.enabled));launch.setAttribute('aria-expanded',String(!panel.hidden));
    launch.textContent=D.enabled?'开发者模式 · 已开启':'开发者模式';
    syncOptions();syncValues();
  }
  function syncOptions() {
    const s=currentStage();
    const context=s+'/'+(N.app.observationModel?.viewMode||'exterior');
    if(context!==lastStage) {
      lastStage=context;
      for(const [select,entries,which] of [[q('#dev-target'),targets,'layout'],[q('#dev-text-target'),textTargets,'text']]) {
        const available=entries.filter(t=>t.stages.includes(s));select.replaceChildren(...available.map(t=>new Option(t.id==='observation-instrument'?t.label+' · '+(N.app.observationModel?.viewMode==='section'?'剖面':'外观'):t.label,t.id)));
        if(which==='layout'){if(!available.some(t=>t.id===selected))selected=available[0]?.id;select.value=selected;}
        else {if(!available.some(t=>t.id===selectedText))selectedText=available[0]?.id;select.value=selectedText;}
      }
    }
    q('#dev-current-stage').textContent='当前：'+stageNames[s]+(s==='mirrors'?' · '+(N.tableSpecimens.page==='lenses'?'透镜页':'反射镜页'):'');
    panel.querySelectorAll('[data-jump]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.jump===(s==='mirrors'&&N.tableSpecimens.page==='lenses'?'lenses':s))));
  }
  function syncValues() {
    const p=layoutValue(selected),optics=N.store.get(),course=N.course.get();
    value('x',p.x||0);value('y',p.y||0);value('scale',(p.scale??1)*100);value('rotation',p.rotation||0);value('opacity',(p.opacity??1)*100);
    for(const id of ['focal','eyepiece','aperture','angle'])value(id,optics[id]);
    const limits=N.mirrorParts.limits(course.mirror);
    value('mirror-focal',course.mirrorFocal,course.stage!=='mirrors'||!course.mirrorMounted||course.mirror==='plane',limits);
    value('mirror-position',course.mirrorPosition,course.stage!=='mirrors');
    panel.querySelectorAll('[data-mount]').forEach(b=>b.disabled=course.stage!=='mirrors');
    effectDefs.forEach(([id])=>value(id,D.effect(id)));
    for(const [id,v] of Object.entries(window.NightSkyControls.getSettings()))value('sky-'+id,v);
    const t=activeText();if(t&&document.activeElement!==q('#dev-text'))q('#dev-text').value=t.element.textContent;
    q('[data-action="undo"]').disabled=!history.length;
  }
  function setPicking(value) {picking=value;document.documentElement.classList.toggle('developer-picking',value);q('[data-action="pick"]').setAttribute('aria-pressed',String(value));if(!value)drag=null;}
  function setTab(value) {
    tab=value;if(tab!=='layout')setPicking(false);
    panel.querySelectorAll('[data-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tab===tab));b.tabIndex=b.dataset.tab===tab?0:-1;});
    panel.querySelectorAll('[data-page]').forEach(p=>p.hidden=p.dataset.page!==tab);syncValues();
  }
  async function jump(target) {
    setPicking(false);await N.courseCompletion.dismiss();N.workbenchTransition.cancel();N.trayTransition.cancel();
    N.course.enter(target==='lenses'?'mirrors':target);
    if(target==='lenses'||target==='mirrors')N.tableSpecimens.showPage(target==='lenses'?'lenses':'mirrors',{instant:true});
    apply();status('已跳转到 '+q('#dev-current-stage').textContent.replace('当前：',''));
  }
  function show(value) {
    if(value){returnFocus=document.activeElement;if(!D.enabled){D.setEnabled(true);N.course.refresh();}N.courseCompletion.dismiss();panel.hidden=false;setTab(tab);q('.developer-close').focus();}
    else {panel.hidden=true;setPicking(false);returnFocus?.isConnected&&returnFocus.focus();}
    launch.setAttribute('aria-expanded',String(value));drawSelection();
  }
  function nudge(x,y,step=Number(q('#dev-nudge-step').value)) {const p=layoutValue(selected);change('layout',configKey(selected),{...p,x:(p.x||0)+x*step,y:(p.y||0)+y*step});}
  function parentMatrix(element) {
    let matrix=new DOMMatrix();
    for(let parent=element.parentElement;parent&&parent!==stage;parent=parent.parentElement) {
      const css=getComputedStyle(parent),scale=css.scale==='none'?[1,1]:css.scale.split(' ').map(Number);
      const rotate=css.rotate==='none'?0:parseFloat(css.rotate),transform=new DOMMatrix(css.transform==='none'?undefined:css.transform);
      matrix=new DOMMatrix().rotate(rotate||0).scale(scale[0],scale[1]??scale[0]).multiply(transform).multiply(matrix);
    }
    return matrix;
  }
  launch.addEventListener('click',()=>show(panel.hidden));
  panel.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tab){setTab(b.dataset.tab);return;}
    if(b.dataset.jump){await jump(b.dataset.jump);return;}
    if(b.dataset.mount){N.tableSpecimens.showPage('mirrors',{instant:true});N.course.mountMirror(b.dataset.mount);return;}
    if(b.dataset.nudge){nudge(...b.dataset.nudge.split(',').map(Number));return;}
    switch(b.dataset.action) {
      case 'close':show(false);break;
      case 'pick':setPicking(!picking);status(picking?'点击或拖动画布中的元素；Esc 结束点选。':'已结束点选。');break;
      case 'reset-element':change('layout',configKey(selected),undefined);break;
      case 'reset-text':change('text',configKey(selectedText),undefined);break;
      case 'undo':if(history.length){const previous=history.pop();D.replace(previous.config);N.store.set(previous.parameters);status('已撤销上次配置修改。');}break;
      case 'reset-all':remember();D.reset();N.store.reset();status('已恢复全部调节默认值，可撤销。');break;
      case 'reset-stage':N.course.resetStage();break;
      case 'preview':await jump('observation');N.observationFlow.openObservation();break;
      case 'exit':setPicking(false);await N.courseCompletion.dismiss();N.workbenchTransition.cancel();N.trayTransition.cancel();D.setEnabled(false);if(!N.course.canEnter(currentStage()))N.course.enter(N.course.canEnter('assembly')?'assembly':'mirrors');else N.course.refresh();show(false);break;
      case 'export': {
        const blob=new Blob([JSON.stringify(D.snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download='newton-developer-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('已导出 JSON 配置。');break;
      }
      case 'import':q('#dev-import').click();break;
    }
  });
  q('#dev-import').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>200000)throw Error('配置文件请小于 200 KB。');const data=JSON.parse(await file.text());const previous={config:D.snapshot(),parameters:N.store.get()};D.replace(data);history.push(previous);N.store.set({...opticalDefaults,...D.snapshot().parameters});status('已导入配置，当前阶段立即生效。');}
    catch(error){status('导入失败：'+error.message);}finally{e.target.value='';}
  });
  q('#dev-target').addEventListener('change',e=>{selected=e.target.value;syncValues();drawSelection();});
  q('#dev-text-target').addEventListener('change',e=>{selectedText=e.target.value;syncValues();});
  q('#dev-text').addEventListener('input',e=>change('text',configKey(selectedText),e.target.value));
  panel.addEventListener('keydown',e=>{
    if(e.ctrlKey&&e.altKey&&e.code==='KeyD')return;
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();if(picking)setPicking(false);else show(false);}
    if(e.target.matches('[role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const list=[...panel.querySelectorAll('[role="tab"]')],i=list.indexOf(e.target),next=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:list.length-1))%list.length;setTab(list[next].dataset.tab);list[next].focus();}
  });
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey&&e.altKey&&e.code==='KeyD'&&!e.repeat){e.preventDefault();show(panel.hidden);return;}
    if(!picking||e.target.closest('input,textarea,select'))return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setPicking(false);return;}
    const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(direction){e.preventDefault();e.stopImmediatePropagation();nudge(...direction,e.shiftKey?10:1);}
  },true);
  document.addEventListener('pointerdown',e=>{
    if(!picking||!stage.contains(e.target)||e.button!==0)return;
    e.preventDefault();e.stopImmediatePropagation();
    // Text and decorative layers often have pointer-events:none; select by visible bounds.
    const target=targets.filter(t=>t.stages.includes(currentStage())&&t.element.checkVisibility()).map(t=>({target:t,rect:t.element.getBoundingClientRect()})).filter(({rect:r})=>e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom).sort((a,b)=>a.rect.width*a.rect.height-b.rect.width*b.rect.height)[0]?.target;
    if(!target){status('请从列表选择这个区域的整体元素。');return;}
    selected=target.id;q('#dev-target').value=selected;syncValues();
    const p=layoutValue(selected);drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:p.x||0,startY:p.y||0,original:p,moved:false,stage:currentStage(),parentInverse:parentMatrix(target.element).inverse()};
    stage.setPointerCapture(e.pointerId);drawSelection();
  },true);
  document.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;e.preventDefault();e.stopImmediatePropagation();
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<2)return;
    if(!drag.moved){remember();drag.moved=true;}
    if(drag.stage!==currentStage()){drag=null;return;}
    const scale=stage.getBoundingClientRect().width/1600;
    const delta=new DOMPoint(dx/scale,dy/scale,0,0).matrixTransform(drag.parentInverse);
    D.update('layout',configKey(selected),{...drag.original,x:Math.round(drag.startX+delta.x),y:Math.round(drag.startY+delta.y)});
  },true);
  function endDrag(e){if(!drag||e.pointerId!==drag.id)return;e.preventDefault();e.stopImmediatePropagation();const id=drag.id;drag=null;if(stage.hasPointerCapture(id))stage.releasePointerCapture(id);}
  document.addEventListener('pointerup',endDrag,true);document.addEventListener('pointercancel',endDrag,true);
  window.addEventListener('blur',()=>{drag=null;setPicking(false);});
  function drawSelection() {
    cancelAnimationFrame(frame);
    const target=activeTarget(),visible=D.enabled&&!panel.hidden&&tab==='layout'&&target?.stages.includes(currentStage());
    const r=visible?target.element.getBoundingClientRect():null;
    selection.hidden=!visible||!r?.width||!r?.height||getComputedStyle(target.element).visibility==='hidden'||!target.element.checkVisibility();
    if(!selection.hidden){Object.assign(selection.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});selection.firstChild.textContent=target.label;}
    if(!panel.hidden)frame=requestAnimationFrame(drawSelection);
  }
  D.subscribe(()=>{apply();status(D.storageAvailable?'配置已自动保存到本浏览器。':'浏览器存储不可用，请导出 JSON 备份。');drawSelection();});
  $('.observation-instrument')?.addEventListener('viewmodechange',()=>{drag=null;apply();drawSelection();});
  N.course.subscribe(()=>{queueMicrotask(()=>{apply();drawSelection();});});N.store.subscribe(()=>syncValues());
  // Text authored outside the course store can be re-rendered by its owning module.
  const observer=new MutationObserver(()=>{if(D.enabled)for(const t of textTargets){if(['title','english','description'].includes(t.id))continue;const v=D.snapshot().text[configKey(t.id)];if(v!==undefined&&t.element.textContent!==v)t.element.textContent=v;}});
  textTargets.forEach(t=>observer.observe(t.element,{childList:true,characterData:true,subtree:true}));
  apply();if(D.enabled){N.store.set(D.snapshot().parameters);N.course.refresh();show(true);}else setTab('steps');
})(window.Newton);

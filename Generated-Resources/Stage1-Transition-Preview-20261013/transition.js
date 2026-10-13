(() => {
  'use strict';
  const stage=document.querySelector('.observatory');
  const viewport=document.querySelector('#viewport');
  const panel=document.querySelector('.console');
  const table=document.createElement('div');table.className='transition-worktable';table.setAttribute('aria-hidden','true');stage.append(table);
  const tray=document.createElement('div');tray.className='assembly-mirror-tray';tray.setAttribute('aria-label','工作台上的平面镜、凹面镜、凸面镜');
  document.querySelectorAll('[data-mirror] .mirror-art').forEach(img=>{const copy=img.cloneNode();copy.alt=img.closest('[data-mirror]').getAttribute('aria-label')||'镜片';tray.append(copy);});stage.append(tray);
  const overlay=document.createElement('section');
  overlay.className='assembly-preview';
  overlay.setAttribute('aria-label','待组装的牛顿望远镜资源预览');
  overlay.innerHTML='<img src="/Generated-Resources/Stage1-Transition-Preview-20261013/telescope-assembly.png" alt="待组装的牛顿望远镜"><div class="assembly-caption"><strong>组装牛顿望远镜</strong>认识主镜与副镜的安装位置<br>转场预览 · 暂未接入装配交互</div>';
  stage.append(overlay);
  const toolbar=document.createElement('div');toolbar.className='transition-toolbar';
  toolbar.innerHTML='<span role="status">01 / 认识镜面</span><button type="button">预览转场 →</button><button type="button" class="preview-back">返回第一阶段</button>';
  stage.append(toolbar);
  const picker=document.createElement('select');picker.setAttribute('aria-label','望远镜候选');
  picker.innerHTML='<option value="aligned">已选 · 正侧视校正图</option><option value="0">原资源（对照）</option>'+[1,2,3,4,5].map(n=>`<option value="${n}">候选 ${n}</option>`).join('');toolbar.prepend(picker);
  const chosen=new URLSearchParams(location.search).get('candidate');picker.value=/^[0-5]$/.test(chosen||'')?chosen:'aligned';
  const choose=()=>{overlay.querySelector('img').src=picker.value==='aligned'?'/Generated-Resources/Telescope-Alignment-20261013/telescope-side-aligned.png':picker.value==='0'?'/Generated-Resources/Stage1-Transition-Preview-20261013/telescope-assembly.png':`/Generated-Resources/Telescope-Candidates-20261013/telescope-${picker.value}.png`;};
  picker.addEventListener('change',choose);choose();
  const [play,back]=toolbar.querySelectorAll('button'),status=toolbar.querySelector('[role=status]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let busy=false,assembly=false;const animations=[];
  function animate(el,frames,duration,delay=0){if(!el)return Promise.resolve();const a=el.animate(frames,{duration:reduced.matches?1:duration,delay:reduced.matches?0:delay,easing:'cubic-bezier(.22,.7,.25,1)',fill:'forwards'});animations.push(a);return a.finished.catch(()=>{});}
  function reset(){animations.splice(0).forEach(a=>a.cancel());stage.classList.remove('assembly-demo','transition-busy');viewport.inert=false;if(panel)panel.inert=false;overlay.style.visibility='hidden';overlay.setAttribute('aria-hidden','true');tray.style.visibility='hidden';tray.setAttribute('aria-hidden','true');assembly=false;status.textContent='01 / 认识镜面';play.textContent='预览转场 →';}
  function lock(value){busy=value;play.disabled=value;back.disabled=value;picker.disabled=value;stage.classList.toggle('transition-busy',value);}
  async function transition(){if(busy)return;lock(true);try{
    if(assembly)reset();
    // Art-direction prototype only: keep course progress and its gating untouched.
    await overlay.querySelector('img').decode();
    stage.classList.add('transition-busy');viewport.inert=true;if(panel)panel.inert=true;
    status.textContent='正在切换…';
    window.Newton.app.telescope.lab.darkroom.endDrag();
    await Promise.all([...viewport.querySelectorAll(':scope > canvas'),panel,document.querySelector('.view-tools')].map(el=>animate(el,[{opacity:1},{opacity:0}],180)));
    const hardware=['#optical-mirror-art','#optical-emitter-art','#optical-rail-art'].map(s=>document.querySelector(s));
    await Promise.all(hardware.map((el,i)=>animate(el,[{opacity:1,transform:'translateY(0px)'},{opacity:0,transform:'translateY(38px)'}],340,i*65)));
    stage.classList.add('assembly-demo');
    overlay.style.visibility='visible';overlay.setAttribute('aria-hidden','false');
    await Promise.all([animate(table,[{transform:'translateY(0px)'},{transform:'translateY(40px)'}],540),animate(overlay,[{opacity:0,transform:'translateY(30px) scale(.98)'},{opacity:1,transform:'translateY(0px) scale(1)'}],540)]);
    tray.style.visibility='visible';tray.setAttribute('aria-hidden','false');
    await animate(tray,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0px)'}],220);
    assembly=true;status.textContent='02 / 组装望远镜';play.textContent='重播转场';
  }catch(error){reset();status.textContent='资源加载失败，请重试';console.error(error);}finally{lock(false);}}
  play.addEventListener('click',transition);back.addEventListener('click',()=>{if(!busy)reset();});
  overlay.setAttribute('aria-hidden','true');
  document.title='一至二阶段转场 · 独立预览';
})();


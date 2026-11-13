import {createPeriodMetric} from './period-metric.js';
import {LENGTH_TIERS,MASS_TIERS} from './scale-reference.js';

// Experiment-owned SVG schematic. Geometry is illustrative; time uses SI units.
export function mountParameterDialog(stage,{getParameters,getScenePose,onApply,onOpenChange}){
  const overlay=document.createElement('div');
  overlay.className='fp-parameter-overlay';overlay.hidden=true;
  overlay.innerHTML=`<section id="parameterDialog" class="fp-parameter-dialog" role="dialog" aria-modal="true" aria-labelledby="parameterTitle">
    <header><h2 id="parameterTitle">调整单摆参数</h2><button class="fp-close" type="button" aria-label="关闭参数弹窗">×</button></header>
    <div class="fp-parameter-body">
      <div class="fp-blueprint">
        <div class="fp-demo-speed" role="group" aria-label="单摆演示速度"><svg class="fp-speed-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M6.5 22.5a10.5 10.5 0 1 1 19 0M16 17.5l5.1-5.1M12.5 5h7M16 5v3"/><circle cx="16" cy="17.5" r="1.7"/></svg>${[2,4,8].map(speed=>`<button type="button" data-demo-speed="${speed}" aria-pressed="${speed===2}">${speed}×</button>`).join('')}</div>
        <svg viewBox="0 0 940 630" role="img" aria-label="单摆蓝图：静止位置、摆动范围及持续摆动的淡色单摆">
          <defs>
            <filter id="fpChalk" x="-5%" y="-15%" width="110%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="grain"/><feColorMatrix in="grain" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .45 .55"/><feComposite in="SourceGraphic" operator="in"/></filter>
            <pattern id="fpHatch" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M-2 10 10-2M8 12 12 8" stroke="#dcecff" stroke-width="1.5"/></pattern>
            <radialGradient id="fpBob" cx="32%" cy="24%" r="75%"><stop stop-color="#fff"/><stop offset=".4" stop-color="#dce8fa"/><stop offset=".75" stop-color="#a6bbd9"/><stop offset="1" stop-color="#e0ecff"/></radialGradient>
            <marker id="fpArrow" markerWidth="9" markerHeight="9" refX="4" refY="4" orient="auto-start-reverse"><path d="M0 0 8 4 0 8Z" fill="#e3efff"/></marker>
            <linearGradient id="fpFieldFadeX"><stop stop-color="black"/><stop offset=".18" stop-color="white"/><stop offset="1" stop-color="white"/></linearGradient>
            <mask id="fpFieldMask" maskUnits="userSpaceOnUse" x="0" y="20" width="290" height="570"><rect x="0" y="20" width="290" height="570" fill="url(#fpFieldFadeX)"/></mask>
            <clipPath id="fpFieldReveal"><rect data-field-reveal x="0" y="20" width="290" height="0"/></clipPath>
          </defs>
          <g class="fp-field-reference" opacity="1" aria-hidden="false">
            <g mask="url(#fpFieldMask)" clip-path="url(#fpFieldReveal)">
              <g data-field-art><image data-field-lines href="assets/football-field-blueprint.svg" x="-8" y="-32" width="686" height="1064" preserveAspectRatio="xMidYMid meet" opacity=".7"/></g>
              <g data-basketball fill="none" stroke="#dcecff" stroke-width="1.4" opacity=".7">
                <path d="M0 0H150V280H0ZM0 140H150M50 0V58H100V0M50 280V222H100V280M35 0V38A40 40 0 0 0 115 38V0M35 280V242A40 40 0 0 1 115 242V280M62 12H88M62 268H88"/>
                <circle cx="75" cy="140" r="18"/><circle cx="75" cy="58" r="18"/><circle cx="75" cy="222" r="18"/><circle cx="75" cy="17" r="4"/><circle cx="75" cy="263" r="4"/>
              </g>
            </g>
            <g class="fp-dimension" data-field-dimension>
              <path class="fp-dimension-line" data-field-measure pathLength="1"/>
              <path class="fp-dimension-ticks" data-field-ticks/>
              <path class="fp-dimension-guides" data-field-guides/>
              <text class="fp-dimension-label" data-field-label x="320"/>
            </g>
            <g data-caption-art><svg x="45" y="550" width="610" height="74" viewBox="0 200 2172 300" preserveAspectRatio="xMinYMid meet"><image data-caption-image width="2172" height="724"/></svg><text data-field-caption class="fp-caption-accessible" aria-hidden="true"/></g>
          </g>
          <g transform="translate(85 0)"><path d="M365 45H575V65H365Z" fill="url(#fpHatch)"/>
          <path d="M365 65H575" stroke="#d8e7ff" stroke-width="6" stroke-linecap="round"/>
          <path d="M448 69H492L487 80H453Z" fill="#bccfe9"/></g>
          <g class="fp-swing-guides" fill="none" stroke="#b6cee9" stroke-width="1.5" stroke-dasharray="9 7">
            <path data-guide-left/><path data-guide-right/><path data-swing-arc/>
          </g>
          <g fill="#b8d5f5" fill-opacity=".14" stroke="#c7dfff" stroke-opacity=".3" stroke-width="1.5"><circle data-limit-left/><circle data-limit-right/></g>
          <g class="fp-equilibrium"><path data-rest-cable stroke="#e0edff" stroke-width="6"/><circle data-rest-bob fill="url(#fpBob)" stroke="#eef6ff" stroke-width="2"/></g>
          <g data-moving-pendulum opacity=".45"><path data-moving-cable stroke="#cce4ff" stroke-width="4"/><circle data-moving-bob fill="#c2ddfa" stroke="#e2f1ff" stroke-width="2"/></g>
          <g class="fp-dimension" data-pendulum-dimension>
            <path data-length-arrow class="fp-dimension-line" pathLength="1"/>
            <path data-length-ticks class="fp-dimension-ticks"/>
            <text data-length-symbol class="fp-dimension-label" x="619" font-style="italic">L</text>
          </g>
        </svg>
      </div>
      <div class="fp-parameter-settings">
        <fieldset><legend>摆长 <i>L</i> <small>（m）</small></legend><div class="fp-options" aria-label="摆长档位">${LENGTH_TIERS.map(n=>`<button type="button" data-length="${n}" aria-pressed="false">${n}</button>`).join('')}</div></fieldset>
        <fieldset><legend>摆球质量 <i>m</i> <small>（kg）</small></legend><div class="fp-options" aria-label="摆球质量档位">${MASS_TIERS.map(n=>`<button type="button" data-mass="${n}" aria-pressed="false">${n}</button>`).join('')}</div></fieldset>
        <div class="fp-period"><div><span>理论周期 <i>T</i> <small>（s）</small></span><span class="metric-value fp-period-value"><span class="metric-delta" aria-hidden="true"></span><output id="swingPeriod" aria-live="polite"></output></span></div><div class="fp-formula"><svg class="fp-equation" viewBox="0 0 180 80" role="img" aria-label="T 等于二π乘以 L 除以 g 的平方根">
          <g fill="currentColor" font-family="Georgia, Times New Roman, serif" font-size="36"><text x="2" y="52" font-style="italic">T</text><text x="33" y="52">=</text><text x="64" y="52">2π</text><text x="151" y="30" text-anchor="middle" font-size="30" font-style="italic">L</text><text x="151" y="65" text-anchor="middle" font-size="30" font-style="italic">g</text></g>
          <path d="M108 44L114 40L122 65L132 9H173M138 40H165" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="miter"/>
        </svg><span class="fp-gravity"><i>g</i> = 9.81 m/s²</span></div></div>
        <footer><button type="button" data-cancel>取消</button><button type="button" data-apply>应用</button></footer>
      </div>
    </div>
  </section><svg class="fp-transfer" viewBox="0 0 1600 900" aria-hidden="true" hidden>
    <defs><radialGradient id="fpTransferBob" cx="32%" cy="24%" r="75%"><stop stop-color="#fff"/><stop offset=".4" stop-color="#dce8fa"/><stop offset=".75" stop-color="#a6bbd9"/><stop offset="1" stop-color="#e0ecff"/></radialGradient></defs>
    <path data-transfer-cable fill="none" stroke="#e0edff" stroke-width="4"/>
    <ellipse data-transfer-bob fill="url(#fpTransferBob)" stroke="#eef6ff" stroke-width="1.5"/>
  </svg>`;
  stage.append(overlay);
  const find=s=>overlay.querySelector(s),dialog=find('[role="dialog"]');
  const moving=find('[data-moving-pendulum]');
  const periodMetric=createPeriodMetric(find('.fp-period-value'),find('#swingPeriod'));
  const set=(selector,attrs)=>{const node=find(selector);for(const [key,val] of Object.entries(attrs))node.setAttribute(key,val);};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const transfer=find('.fp-transfer'),blueprint=find('.fp-blueprint>svg');
  let demoSpeed=2;
  let fieldTime=0,fieldOpacity=0,closing=null,transferPose=null;
  let draft,shown,resizeAnimation=null,opening=null,targetFrame=null,phase=0,returnFocus=null,inertStates=[];
  const smooth=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
  const dimensions=({length,mass})=>({span:300+150*(length-28)/72,radius:25*Math.cbrt(mass/28)});
  function renderGeometry(){
    const {span,radius}=shown;
    const x=555,y=80,bottom=y+span,angle=.32,dx=span*Math.sin(angle),ey=y+span*Math.cos(angle);
    set('[data-rest-cable]',{d:`M${x} ${y}V${bottom-radius}`});
    set('[data-rest-bob]',{cx:x,cy:bottom,r:radius});
    set('[data-moving-cable]',{d:`M${x} ${y}V${bottom-radius}`});
    set('[data-moving-bob]',{cx:x,cy:bottom,r:radius});
    set('[data-guide-left]',{d:`M${x} ${y}L${x-dx} ${ey}`});
    set('[data-guide-right]',{d:`M${x} ${y}L${x+dx} ${ey}`});
    set('[data-limit-left]',{cx:x-dx,cy:ey,r:radius});
    set('[data-limit-right]',{cx:x+dx,cy:ey,r:radius});
    set('[data-swing-arc]',{d:`M${x-dx} ${ey}A${span} ${span} 0 0 0 ${x+dx} ${ey}`});
    set('[data-length-arrow]',{d:`M601 ${y}V${bottom}`});
    set('[data-length-ticks]',{d:`M594 ${y-7}L608 ${y+7}M594 ${bottom-7}L608 ${bottom+7}`});
    renderFieldGeometry();
    set('[data-length-symbol]',{y:y+span/2+10});
    draw();
  }
  // Independent EXP-01 adaptation of EXP-04 line-styles.js drafting endpoints;
  // no runtime import of another experiment's private implementation.
  function renderFieldGeometry(){
    const span=shown.span,bottom=80+span,isBasket=draft.length===28,isWidth=draft.length===67;
    const scale=span/(isWidth?670:1000);
    set('[data-field-art]',{visibility:isBasket?'hidden':'visible',transform:isWidth?`translate(280 80) rotate(90) scale(${scale})`:`translate(${280-670*scale} 80) scale(${scale})`});
    set('[data-basketball]',{visibility:isBasket?'visible':'hidden',transform:`translate(${280-150*span/280} 80) scale(${span/280})`});
    set('[data-field-measure]',{d:`M302 80V${bottom}`});
    set('[data-field-ticks]',{d:`M295 73L309 87M295 ${bottom-7}L309 ${bottom+7}`});
    set('[data-field-guides]',{d:`M280 80H613M280 ${bottom}H613`});
    set('[data-field-label]',{y:80+span/2});
    find('[data-field-label]').textContent=`L = ${draft.length} m`;
    const caption=find('[data-field-caption]');
    const captionText=isBasket?'28m —— 约为标准篮球场长度':isWidth?'67m —— 约为足球场宽度':'100m —— 约为标准足球场长度';
    if(caption.textContent!==captionText){
      caption.textContent=captionText;
      set('[data-caption-image]',{href:`assets/chalk-caption-${draft.length}.png`,'aria-label':captionText});
      for(const animation of find('[data-caption-art]').getAnimations())animation.cancel();
      if(!reduced.matches)find('[data-caption-art]').animate([{opacity:0,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0% 0 0)'}],{duration:800,easing:'ease-out'});
    }
    find('.fp-field-reference').dataset.reference=isBasket?'basketball-length':isWidth?'football-width':'football-length';
  }
  function renderControls(){
    for(const button of overlay.querySelectorAll('button[data-length]'))button.setAttribute('aria-pressed',String(+button.dataset.length===draft.length));
    for(const button of overlay.querySelectorAll('button[data-mass]'))button.setAttribute('aria-pressed',String(+button.dataset.mass===draft.mass));
    periodMetric.set(2*Math.PI*Math.sqrt(draft.length/9.81),true);
    dialog.dataset.length=draft.length;dialog.dataset.mass=draft.mass;
  }
  function draw(){moving.setAttribute('transform',`rotate(${(.32*Math.sin(phase)*180/Math.PI).toFixed(4)} 555 80)`);}
  function animateDimensions(){
    for(const dimension of overlay.querySelectorAll('.fp-dimension')){
      for(const animation of dimension.getAnimations({subtree:true}))animation.cancel();
      if(reduced.matches)continue;
      dimension.animate([{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)'}],{duration:560,easing:'ease-out'});
      for(const part of dimension.querySelectorAll('.fp-dimension-ticks,.fp-dimension-label'))part.animate([{opacity:.15},{opacity:1}],{duration:560,easing:'ease-out'});
    }
  }
  function selectParameter(key,value){
    if(draft[key]===value)return;
    draft[key]=value;
    if(key==='length')animateDimensions();
    if(key==='length'){fieldTime=0;updateField(0,true);}
    const target=dimensions(draft);
    resizeAnimation=reduced.matches?null:{from:{...shown},to:target,time:0};
    if(!resizeAnimation){shown=target;renderGeometry();}
    dialog.dataset.resizing=String(!!resizeAnimation);renderControls();
  }
  // Read the blueprint projection only at entry/resize, never in the frame loop.
  function measureTarget(){
    if(overlay.hidden)return;
    const matrix=blueprint.getScreenCTM(),rect=stage.getBoundingClientRect(),scale=rect.width/1600;
    targetFrame={x:(matrix.e-rect.left)/scale,y:(matrix.f-rect.top)/scale,scale:matrix.a/scale};
  }
  window.addEventListener('resize',measureTarget);
  function finishOpening(){
    opening=null;transfer.setAttribute('hidden','');overlay.classList.remove('fp-entering');
    overlay.style.removeProperty('--fp-enter');dialog.dataset.entering='false';
  }
  function paintTransfer(pose,width){
    transferPose={...pose};
    const {x,y,anchorX:ax,anchorY:ay,radius:r}=pose,distance=Math.hypot(x-ax,y-ay)||1;
    set('[data-transfer-cable]',{d:`M${ax} ${ay}L${x-(x-ax)/distance*r} ${y-(y-ay)/distance*r}`,'stroke-width':width});
    set('[data-transfer-bob]',{cx:x,cy:y,rx:r,ry:r});
  }
  function drawOpening(){
    const t=Math.min(1,opening.time/.95),e=smooth(t),f=targetFrame,from=opening.from;
    const x=mix(from.x,f.x+555*f.scale,e),y=mix(from.y,f.y+(80+shown.span)*f.scale,e);
    const ax=mix(from.anchorX,f.x+555*f.scale,e),ay=mix(from.anchorY,f.y+80*f.scale,e);
    const r=mix(from.radius,shown.radius*f.scale,e);
    paintTransfer({x,y,anchorX:ax,anchorY:ay,radius:r},mix(4,6*f.scale,e));
    transfer.style.opacity=String(1-smooth(Math.max(0,(t-.78)/.22)));
    overlay.style.setProperty('--fp-enter',String(e));
    if(t===1){finishOpening();fieldTime=0;animateDimensions();}
  }
  function finishClose(){
    if(closing?.apply)onApply(closing.apply);
    closing=null;finishOpening();resizeAnimation=null;overlay.hidden=true;stage.classList.remove('fp-parameter-open');
    dialog.dataset.exiting='false';
    for(const button of overlay.querySelectorAll('button'))button.disabled=false;
    for(const [node,inert] of inertStates)node.inert=inert;
    inertStates=[];onOpenChange(false);
    if(returnFocus?.isConnected&&!returnFocus.closest('[aria-hidden="true"]'))returnFocus.focus({preventScroll:true});
  }
  function close(apply=false){
    if(overlay.hidden||closing)return;
    const f=targetFrame;
    const source=opening&&transferPose?{...transferPose}:{x:f.x+555*f.scale,y:f.y+(80+shown.span)*f.scale,
      anchorX:f.x+555*f.scale,anchorY:f.y+80*f.scale,radius:shown.radius*f.scale};
    const progress=opening?Number(overlay.style.getPropertyValue('--fp-enter')):1;
    const destination=getScenePose(apply?draft:null);
    finishOpening();resizeAnimation=null;
    closing={from:source,to:destination,time:0,progress,apply:apply?{...draft}:null};
    if(reduced.matches){finishClose();return;}
    dialog.dataset.exiting='true';
    for(const button of overlay.querySelectorAll('button'))button.disabled=true;
    transfer.removeAttribute('hidden');overlay.classList.add('fp-entering');drawClosing();
  }
  function drawClosing(){
    const t=Math.min(1,closing.time/.95),e=smooth(t),a=closing;
    const pose={};for(const key of ['x','y','anchorX','anchorY','radius'])pose[key]=mix(a.from[key],a.to[key],e);
    paintTransfer(pose,mix(6*targetFrame.scale,4,e));
    transfer.style.opacity='1';overlay.style.setProperty('--fp-enter',String(a.progress*(1-e)));
    if(t===1)finishClose();
  }
  function updateField(dt,force=false){
    if(!force&&fieldTime>=1.1)return;
    fieldTime=reduced.matches?1.1:Math.min(1.1,fieldTime+dt);
    const progress=smooth(fieldTime/1.1);
    set('[data-field-reveal]',{height:570*progress});
    find('.fp-field-reference').dataset.phase=progress===1?'blueprint':'transition';
  }
  function open(){
    if(!overlay.hidden)return;
    const {length,mass}=getParameters();draft={length,mass};shown=dimensions(draft);resizeAnimation=null;phase=0;
    fieldTime=0;fieldOpacity=0;updateField(0,true);
    returnFocus=document.activeElement;
    inertStates=[...stage.children].filter(node=>node!==overlay).map(node=>[node,node.inert]);
    for(const [node] of inertStates)node.inert=true;
    overlay.hidden=false;periodMetric.reset(2*Math.PI*Math.sqrt(length/9.81));renderGeometry();renderControls();measureTarget();
    dialog.dataset.resizing='false';
    if(!reduced.matches){
      opening={from:getScenePose(),time:0};transfer.removeAttribute('hidden');
      overlay.classList.add('fp-entering');dialog.dataset.entering='true';drawOpening();
    }else finishOpening();
    stage.classList.add('fp-parameter-open');onOpenChange(true);find('.fp-close').focus({preventScroll:true});
  }
  overlay.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.matches('[data-demo-speed]')){
      demoSpeed=Number(button.dataset.demoSpeed);
      for(const option of overlay.querySelectorAll('[data-demo-speed]'))option.setAttribute('aria-pressed',String(Number(option.dataset.demoSpeed)===demoSpeed));
    }
    else if(button.matches('[data-length]'))selectParameter('length',+button.dataset.length);
    else if(button.matches('[data-mass]'))selectParameter('mass',+button.dataset.mass);
    else close(button.hasAttribute('data-apply'));
  });
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
    if(event.key==='Tab'){
      const buttons=[...overlay.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  reduced.addEventListener('change',()=>{
    if(!reduced.matches||overlay.hidden)return;
    animateDimensions();
    if(closing){finishClose();return;}
    updateField(0,true);
    shown=dimensions(draft);resizeAnimation=null;dialog.dataset.resizing='false';renderGeometry();finishOpening();
  });
  return {open,advance(dt){
    if(overlay.hidden)return;
    if(closing){closing.time+=dt;drawClosing();return;}
    updateField(dt);
    periodMetric.tick(performance.now());
    if(resizeAnimation){
      const a=resizeAnimation;a.time+=dt;const t=Math.min(1,a.time/.55),e=smooth(t);
      shown={span:mix(a.from.span,a.to.span,e),radius:mix(a.from.radius,a.to.radius,e)};
      renderGeometry();
      if(t===1){resizeAnimation=null;dialog.dataset.resizing='false';}
    }
    if(opening){opening.time+=dt;drawOpening();}
    else{const visualLength=28+(shown.span-300)*72/150;phase+=dt*demoSpeed*Math.sqrt(9.81/visualLength);draw();}
  }};
}

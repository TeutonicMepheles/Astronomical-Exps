/* Step2 R2: geometric part hotspots + click/long-press popover.
 * Works with the experiment's real-mesh viewer public API; no Step3 dependencies.
 * Never mutates scene geometry or the course state.
 */
(function (N) {
  'use strict';
  const PARTS = {
    tube: {name:'木质镜筒', detail:'浅木质筒身围护光学通道，帮助阻挡杂散光；侧面的展示开口让我们看见内部结构。'},
    primary: {name:'凹面主镜', detail:'安装在镜筒后端，负责汇集来自远处天体的光，并使光束逐渐会聚。'},
    secondary: {name:'平面副镜', detail:'位于镜筒前部，斜置的平面镜把主镜反射的光折向上方目镜。'},
    eyepiece: {name:'目镜', detail:'位于镜筒上方，供观察者查看经主镜与副镜形成的光学像。'},
    mount: {name:'转轴与支架', detail:'承托镜筒的球形转轴和支臂，帮助望远镜保持姿态并调整指向。'},
    base: {name:'圆盘底座', detail:'底部的稳定支座，承担整体重量，支撑上方望远镜结构。'},
  };
  N.createStep2Hotspots = function ({THREE:T, root, host, canvas, api, meshes, dock}) {
    const controller = new AbortController(), signal=controller.signal;
    const anchors = new Map(), dots = new Map();
    const layer=document.createElement('div'); layer.className='newton-part-hotspots';
    layer.setAttribute('aria-label','望远镜可查看部件');host.append(layer);
    const popup=document.createElement('section');popup.className='newton-part-popover';popup.hidden=true;
    popup.setAttribute('role','dialog');popup.setAttribute('aria-label','望远镜部件介绍');
    popup.innerHTML='<button type="button" class="newton-part-close" aria-label="关闭部件介绍">×</button><h3></h3><p></p>';
    host.append(popup);
    const title=popup.querySelector('h3'),description=popup.querySelector('p');
    const raycaster = new T.Raycaster(), toCamera=new T.Vector3(), project=new T.Vector3();
    const allKeys=Object.keys(PARTS);
    let selected=null, focusPoint=null, press=null, pressTimer=0, inputTimer=0, destroyed=false;
    let lastLayout=0,popupSize={w:380,h:240};
    const partGroups=Object.fromEntries(allKeys.map(key=>[key,meshes.filter(m=>m.userData.part===key)]));
    const bounding=Object.fromEntries(allKeys.map(key=>{
      const box=new T.Box3();for(const mesh of partGroups[key])box.expandByObject(mesh);
      return [key,box.isEmpty()?null:{center:box.getCenter(new T.Vector3()),radius:box.getSize(new T.Vector3()).length()*.3}];
    }));
    for(const key of allKeys){
      const button=document.createElement('button');button.className='newton-part-dot';button.type='button';
      button.setAttribute('aria-label','查看'+PARTS[key].name);
      button.dataset.part=key;button.title='查看'+PARTS[key].name;
      button.innerHTML='<span aria-hidden="true"></span>';button.hidden=true;
      button.addEventListener('click',e=>{e.stopPropagation();choose(key,anchors.get(key)||bounding[key]?.center);},{signal});
      dots.set(key,button);layer.append(button);
    }
    function close(clear=true){popup.hidden=true;selected=null;focusPoint=null;if(clear)api.selectPart(null);for(const dot of dots.values())dot.classList.remove('is-selected');}
    function choose(key,point){
      if(!key||!PARTS[key]){close();return;}
      selected=key;focusPoint=(point?.isVector3?point.clone():anchors.get(key)?.clone()||bounding[key]?.center.clone());
      // A paused object lets visitors actually read the card instead of chasing it.
      const autoButton=dock.querySelector('[data-real-action="auto"]');
      if(autoButton?.getAttribute('aria-pressed')==='true')autoButton.click();
      api.selectPart(key);title.textContent=PARTS[key].name;description.textContent=PARTS[key].detail;
      popup.hidden=false;popupSize={w:popup.offsetWidth,h:popup.offsetHeight};for(const [k,dot] of dots)dot.classList.toggle('is-selected',k===key);
      update(true);
    }
    popup.querySelector('.newton-part-close').addEventListener('click',()=>close(),{signal});
    root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!popup.hidden){e.stopPropagation();close();}}, {signal});
    root.addEventListener('pointerdown',e=>{
      if(e.target===canvas||e.target.closest('.rotation-stage canvas'))return;
      if(e.target.closest('.newton-part-popover,.newton-part-dot'))return;
      if(!popup.hidden)close();
    },{signal});
    canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
    function cancelPress(){if(pressTimer)clearTimeout(pressTimer);pressTimer=0;}
    canvas.addEventListener('pointerdown',e=>{
      cancelPress();if(e.button!==0&&e.pointerType==='mouse')return;
      press={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,held:false};
      // Both touch long-press and stationary mouse press can open the same card.
      pressTimer=setTimeout(()=>{
        if(!press||press.moved||press.id!==e.pointerId)return;
        const hit=api.pick(press.x,press.y);
        if(hit?.object?.userData?.part){press.held=true;choose(hit.object.userData.part,hit.point);}
      },510);
    },{signal});
    canvas.addEventListener('pointermove',e=>{
      if(press?.id===e.pointerId){if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>8){press.moved=true;cancelPress();if(!popup.hidden&&e.buttons)popup.hidden=true;}}
      // Orbit gestures cause new world-to-screen projection. Core renders on demand.
      requestUpdate();
    },{signal});
    canvas.addEventListener('pointerup',e=>{
      cancelPress();const old=press;press=null;
      if(!old||old.id!==e.pointerId||old.moved)return;
      const hit=api.pick(e.clientX,e.clientY);
      if(hit?.object?.userData?.part)choose(hit.object.userData.part,hit.point);
      else close();
    },{signal});
    for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{cancelPress();press=null;requestUpdate();},{signal});
    root.addEventListener('click',e=>{
      if(e.target.closest('[data-real-action="section"],[data-real-action="reset"]'))requestUpdate();
    },{signal});
    const tools=dock.querySelector('.rotation-controls');
    const toolToggle=document.createElement('button');toolToggle.type='button';toolToggle.className='newton-tool-toggle';toolToggle.dataset.realAction='tools';toolToggle.setAttribute('aria-label','展开观察工具');
    toolToggle.setAttribute('aria-expanded','false');toolToggle.textContent='工具 ▾';
    const toolPanel=document.createElement('div');toolPanel.className='newton-tools-panel';toolPanel.hidden=true;
    for(const key of ['rays','bloom','auto','reset']){
      const item=dock.querySelector('[data-real-action="'+key+'"]');
      if(item)toolPanel.append(item); // preserve original handlers
    }
    tools.append(toolToggle);tools.after(toolPanel);
    toolToggle.addEventListener('click',()=>{
      toolPanel.hidden=!toolPanel.hidden;toolToggle.setAttribute('aria-expanded',String(!toolPanel.hidden));
      toolToggle.textContent=toolPanel.hidden?'工具 ▾':'工具 ▴';
    },{signal});
    const legacyParts=dock.querySelector('.real-viewer-parts');if(legacyParts)legacyParts.hidden=true;
    const ro=new ResizeObserver(entries=>{for(const entry of entries)if(entry.target===popup&&!popup.hidden){const box=entry.borderBoxSize?.[0];popupSize={w:box?.inlineSize||popup.offsetWidth,h:box?.blockSize||popup.offsetHeight};}requestUpdate();});ro.observe(host);ro.observe(popup);
    function requestUpdate(){if(destroyed||inputTimer)return;inputTimer=requestAnimationFrame(()=>{inputTimer=0;update(true);});}
    function visibleGeometry(){return meshes.filter(m=>m.visible);}
    function findVisibleAnchor(key,visible){
      const box=bounding[key];if(!box)return null;
      // Favour the centre of the part and require the same named part to be the first hit.
      const candidates=[box.center,...partGroups[key].filter(m=>m.visible).slice(0,12).map(m=>new T.Box3().setFromObject(m).getCenter(new T.Vector3()))];
      for(const candidate of candidates){
        toCamera.copy(candidate).sub(api.camera.position);const length=toCamera.length();
        if(length<.001)continue;
        raycaster.set(api.camera.position,toCamera.normalize());raycaster.near=0;raycaster.far=length+box.radius;
        const hits=raycaster.intersectObjects(visible,false);
        if(hits.length&&hits[0].object.userData.part===key)return hits[0].point;
      }
      return null;
    }
    function reposition(el,world){
      project.copy(world).project(api.camera);
      if(project.z>1||project.z< -1||!Number.isFinite(project.x))return false;
      const w=host.clientWidth||1,h=host.clientHeight||1,x=(project.x*.5+.5)*w,y=(-project.y*.5+.5)*h;
      if(x<16||x>w-16||y<12||y>h-12)return false;
      el.style.left=x+'px';el.style.top=y+'px';return {x,y,w,h};
    }
    function update(force=false){
      if(destroyed)return;
      const now=performance.now();if(!force&&now-lastLayout<70)return;lastLayout=now;
      api.camera.updateMatrixWorld(true);
      const visible=visibleGeometry(),isSection=api.getState().section;
      for(const key of allKeys){
        const dot=dots.get(key);
        // In exterior mode, avoid hotspots on normally obscured internal optics.
        if(!isSection&&['primary','secondary'].includes(key)){dot.hidden=true;continue;}
        const anchor=findVisibleAnchor(key,visible);anchors.set(key,anchor);
        if(!anchor){dot.hidden=true;continue;}
        const screen=reposition(dot,anchor);dot.hidden=!screen;
      }
      if(selected&&!popup.hidden){
        const target=anchors.get(selected)||focusPoint;
        if(!target){popup.hidden=true;return;}
        const screen=reposition(popup,target);
        if(!screen){popup.hidden=true;return;}
        const x=Math.max(12,Math.min(screen.w-popupSize.w-12,screen.x+24+popupSize.w<screen.w?screen.x+24:screen.x-popupSize.w-24)),
          y=Math.max(12,Math.min(screen.h-popupSize.h-12,screen.y-popupSize.h-56));
        popup.style.left=x+'px';popup.style.top=y+'px';
      }
    }
    update(true);
    return {update,choose,close,requestUpdate,dispose(){destroyed=true;cancelPress();cancelAnimationFrame(inputTimer);controller.abort();ro.disconnect();layer.remove();popup.remove();toolPanel.remove();toolToggle.remove();}};
  };
})(window.Newton=window.Newton||{});

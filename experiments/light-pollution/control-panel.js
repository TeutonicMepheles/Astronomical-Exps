(() => {
  const stage=document.querySelector('.stage');
  const panel=document.querySelector('.control-panel');
  const toggle=document.querySelector('.control-toggle');
  const closeButton=document.querySelector('.control-close');
  function isOpen(){return !panel.hidden;}
  function close(){
    panel.hidden=true;
    toggle.hidden=false;
    toggle.setAttribute('aria-expanded','false');
    stage.classList.remove('control-open');
  }
  function open(){
    window.LampScene.close();
    window.ResidentialScene.close();
    window.PublicBuildingScene.close();
    window.BillboardScene.close();
    panel.hidden=false;
    toggle.hidden=true;
    toggle.setAttribute('aria-expanded','true');
    stage.classList.add('control-open');
    syncAll();
  }
  toggle.addEventListener('click',()=>isOpen()?close():open());
  closeButton.addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&isOpen())close();});
  for(const name of ['lamp-selected','residential-selected','public-building-selected','billboard-selected']){
    stage.addEventListener(name,close);
  }
  function drive(source,value){
    source.value=String(value);
    source.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function bindRange(sourceId,dockId,outputId,format){
    const source=document.querySelector(sourceId),dock=document.querySelector(dockId),output=document.querySelector(outputId);
    dock.addEventListener('input',()=>drive(source,dock.value));
    source.addEventListener('input',()=>{
      dock.value=source.value;
      output.value=format(source.value);
    });
  }
  bindRange('#residential-temperature','#dock-residential-temperature','#dock-residential-temperature-value',v=>`${v}K`);
  bindRange('#residential-brightness','#dock-residential-brightness','#dock-residential-brightness-value',v=>`${v}%`);
  bindRange('#public-building-temperature','#dock-public-temperature','#dock-public-temperature-value',v=>`${v}K`);
  bindRange('#public-building-brightness','#dock-public-brightness','#dock-public-brightness-value',v=>`${v}%`);
  bindRange('#billboard-brightness','#dock-billboard-brightness','#dock-billboard-brightness-value',v=>`${v}%`);
  bindRange('#temperature','#dock-lamp-temperature','#dock-lamp-temperature-value',v=>`${v}K`);
  bindRange('#lamp-brightness','#dock-lamp-brightness','#dock-lamp-brightness-value',v=>`${v}%`);
  function syncChips(dockAttr,sourceAttr){
    document.querySelectorAll(`[${sourceAttr}]`).forEach(button=>{
      button.addEventListener('click',()=>{
        const value=button.getAttribute(sourceAttr);
        document.querySelectorAll(`[${dockAttr}]`).forEach(chip=>chip.setAttribute('aria-pressed',String(chip.getAttribute(dockAttr)===value)));
      });
    });
    document.querySelectorAll(`[${dockAttr}]`).forEach(chip=>{
      chip.addEventListener('click',()=>{
        const match=document.querySelector(`[${sourceAttr}="${chip.getAttribute(dockAttr)}"]`);
        match?.click();
      });
    });
  }
  syncChips('data-dock-curtain','data-curtain');
  syncChips('data-dock-shade','data-shade');
  function syncAll(){
    [
      ['#residential-temperature','#dock-residential-temperature','#dock-residential-temperature-value',v=>`${v}K`],
      ['#residential-brightness','#dock-residential-brightness','#dock-residential-brightness-value',v=>`${v}%`],
      ['#public-building-temperature','#dock-public-temperature','#dock-public-temperature-value',v=>`${v}K`],
      ['#public-building-brightness','#dock-public-brightness','#dock-public-brightness-value',v=>`${v}%`],
      ['#billboard-brightness','#dock-billboard-brightness','#dock-billboard-brightness-value',v=>`${v}%`],
      ['#temperature','#dock-lamp-temperature','#dock-lamp-temperature-value',v=>`${v}K`],
      ['#lamp-brightness','#dock-lamp-brightness','#dock-lamp-brightness-value',v=>`${v}%`]
    ].forEach(([sourceId,dockId,outputId,format])=>{
      const source=document.querySelector(sourceId);
      document.querySelector(dockId).value=source.value;
      document.querySelector(outputId).value=format(source.value);
    });
    const curtain=document.querySelector('[data-curtain][aria-pressed="true"]');
    document.querySelectorAll('[data-dock-curtain]').forEach(chip=>chip.setAttribute('aria-pressed',String(curtain&&chip.dataset.dockCurtain===curtain.dataset.curtain)));
    const shade=document.querySelector('[data-shade][aria-pressed="true"]');
    document.querySelectorAll('[data-dock-shade]').forEach(chip=>chip.setAttribute('aria-pressed',String(shade&&chip.dataset.dockShade===shade.dataset.shade)));
  }
  window.ControlDock={open,close,isOpen};
  close();
  syncAll();
})();

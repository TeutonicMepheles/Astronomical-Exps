(() => {
  if(!window.PollutionIndex)return;

  const shadeLabel={open:'无遮挡',half:'半遮光',full:'全遮光'};
  const meter=document.createElement('section');
  meter.className='pollution-meter';
  meter.innerHTML=`
    <div class="pollution-meter-head">
      <h2>相对光污染等级</h2>
      <button type="button" class="pollution-meter-hide">收起</button>
    </div>
    <p class="pollution-meter-grade"><span data-grade>1.0</span><small>级</small></p>
    <p class="pollution-meter-round">取整 <strong data-round>1</strong> 级 · P <span data-p>0</span></p>
    <dl class="pollution-meter-parts"></dl>
    <p class="pollution-meter-note">实验系统内部相对标尺：全关锚定 1 级，全开最冷色且最不利遮挡锚定 9 级。不是波特尔夜空的绝对物理量。</p>
    <h3>合规校验（不参与等级）</h3>
    <ul class="pollution-meter-checks"></ul>`;
  const openButton=document.createElement('button');
  openButton.className='pollution-meter-toggle';
  openButton.type='button';
  openButton.textContent='相对等级';
  openButton.setAttribute('aria-expanded','true');
  const parts=meter.querySelector('.pollution-meter-parts');
  const checks=meter.querySelector('.pollution-meter-checks');

  function fmt(value,digits){return value.toFixed(digits);}

  function render(){
    const state=window.PollutionIndex.readDocument();
    const result=window.PollutionIndex.evaluate(state);
    meter.querySelector('[data-grade]').textContent=fmt(result.continuous,1);
    meter.querySelector('[data-round]').textContent=String(result.rounded);
    meter.querySelector('[data-p]').textContent=fmt(result.p,3);
    const rows=[
      ['住宅窗灯',result.parts.residential,`B ${state.residential.brightness}% · T ${fmt(result.factors.residentialT,2)} · 窗帘K ${fmt(result.factors.curtainK,2)}`],
      ['公共建筑',result.parts.publicBuilding,`B ${state.publicBuilding.brightness}% · T ${fmt(result.factors.publicT,2)}`],
      ['广告牌',result.parts.billboard,`B ${state.billboard.brightness}% · T ${fmt(result.factors.billboardT,2)}（固定）`],
      ['路灯',result.parts.lamp,`B ${state.lamp.brightness}% · T ${fmt(result.factors.lampT,2)} · 遮光K ${fmt(result.factors.shadeK,1)}`]
    ];
    parts.innerHTML=rows.map(([name,value,detail])=>`<div><dt>${name}</dt><dd>${fmt(value,3)}<small>${detail}</small></dd></div>`).join('')
      +`<div><dt>S / Smax</dt><dd>${fmt(result.s,3)} / ${fmt(result.sMax,3)}</dd></div>`;
    const shade=state.lamp.shade;
    const shadeNote=shade==='open'?'向上光通最大（示意，非正式判定）'
      :shade==='full'?'向上光通相对最低（示意，非正式判定）'
      :'介于无遮挡与全遮光之间（示意）';
    checks.innerHTML=`
      <li>路灯遮光：${shadeLabel[shade]||shade}。${shadeNote}</li>
      <li>广告牌亮度 ${state.billboard.brightness}%：面积与区域类别限值未接入，不判定是否超标。</li>
      <li>住宅窗外垂直照度 25 lx 指引：未接入绝对照度模型，不判定。</li>`;
  }

  function show(){
    meter.hidden=false;
    openButton.hidden=true;
    openButton.setAttribute('aria-expanded','true');
  }
  function hide(){
    meter.hidden=true;
    openButton.hidden=false;
    openButton.setAttribute('aria-expanded','false');
  }
  openButton.addEventListener('click',show);
  meter.querySelector('.pollution-meter-hide').addEventListener('click',hide);
  document.addEventListener('input',render);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-curtain],[data-shade],[data-dock-curtain],[data-dock-shade]')){
      requestAnimationFrame(render);
    }
  });
  document.body.append(openButton,meter);
  hide();
  render();
})();

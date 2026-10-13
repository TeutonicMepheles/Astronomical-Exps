/* Preview-only parameter editor. Components consume CSS variables, not this UI. */
(() => {
  const groups = [
    ['拖动轨迹', [
      ['trail-width','主线宽度',3,.5,10,.1,'px'],
      ['trail-opacity','主线透明度',.65,0,1,.01,''],
      ['trail-base-width','底线宽度',1.5,0,6,.1,'px'],
      ['trail-base-opacity','底线透明度',.12,0,1,.01,''],
      ['trail-soft-width','柔光宽度',7,0,24,.5,'px'],
      ['trail-soft-opacity','柔光透明度',.1,0,.6,.01,''],
      ['end-radius','落点半径',10,0,30,1,'px'],
      ['drag-period','拖动周期',3.6,1,8,.1,'s'],
      ['trail-color','轨迹颜色','#c4e3f1']
    ]],
    ['手势图标', [
      ['hand-size','图标尺寸',76,40,140,1,'px'],
      ['hand-opacity','图标透明度',1,.2,1,.01,''],
      ['hand-angle','倾斜角度',-12,-40,40,1,'deg'],
      ['press-scale','按下缩放',.88,.6,1,.01,''],
      ['ring-size','按压圆环',28,10,64,1,'px'],
      ['tap-period','点击周期',2.8,1,6,.1,'s']
    ]],
    ['物品描边', [
      ['outline-width','描边宽度',2,.5,6,.1,'px'],
      ['glow-width','光晕范围',16,2,36,1,'px'],
      ['glow-strength','光晕强度',1,0,3,.05,''],
      ['outline-min','最低亮度',.22,0,1,.01,''],
      ['outline-max','最高亮度',.95,0,1,.01,''],
      ['period','呼吸周期',2.8,1,8,.1,'s'],
      ['outline','描边颜色','#c4e3f1']
    ]],
    ['名称气泡', [
      ['bubble-size','文字大小',18,12,28,1,'px'],
      ['bubble-pad-x','水平留白',27,12,48,1,'px'],
      ['bubble-pad-y','垂直留白',13,6,24,1,'px'],
      ['cream','气泡底色','#fff4d8'],
      ['ink','气泡文字','#514736']
    ]]
  ];
  const fields = groups.flatMap(([,items])=>items);
  const key = 'astronomy.interaction-preview.visual-tuning.v1';
  class HintDebugPanel {
    constructor({onReplay = ()=>{}, onBubble = ()=>{}} = {}) {
      this.abort = new AbortController(); this.previous = new Map(); this.values = {};
      this.on = (node,event,fn)=>node.addEventListener(event,fn,{signal:this.abort.signal});
      this.controls = new Map();
      this.launcher = document.createElement('button'); this.launcher.className = 'hint-debug-launcher'; this.launcher.type='button';
      this.launcher.textContent = '⚙ 交互调试'; this.launcher.setAttribute('aria-expanded','false'); this.launcher.setAttribute('aria-controls','hint-debug-panel');
      this.panel = document.createElement('aside'); this.panel.id='hint-debug-panel'; this.panel.className='hint-debug-panel'; this.panel.hidden=true; this.panel.setAttribute('aria-label','交互视觉参数调试');
      this.panel.innerHTML = '<header class="hint-debug-header"><div><strong>交互调试</strong><small>拖动标题可移动 · Ctrl + Alt + D</small></div><button type="button" data-close aria-label="关闭调试面板">×</button></header><div class="hint-debug-body"><p class="hint-debug-help">参数实时生效。保存仅影响本机预览；导出可保留一份配置。</p><div class="hint-debug-preview"><button type="button" data-replay="tap">演示点击</button><button type="button" data-replay="drag">演示拖动</button><button type="button" data-bubble>显示气泡</button></div><div data-fields></div></div><div class="hint-debug-actions"><button type="button" data-save>保存本机</button><button type="button" data-export>导出 JSON</button><button type="button" data-reset>恢复默认</button><p role="status" data-status>默认主线宽度 3px</p></div>';
      document.body.append(this.launcher,this.panel);
      for (const [title,items] of groups) {
        const details=document.createElement('details'); details.open = title==='拖动轨迹';
        const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
        for (const field of items) {
          const [id,label,initial,min,max,step,unit] = field;
          this.values[id]=initial;this.previous.set(id,document.documentElement.style.getPropertyValue('--hint-'+id));
          const row=document.createElement('div');row.className='hint-debug-row';
          const labelNode=document.createElement('label');labelNode.textContent=label;labelNode.htmlFor='hint-setting-'+id;row.append(labelNode);
          const inputs=[];
          if (typeof initial==='string') {
            const input=document.createElement('input');input.type='color';input.id=labelNode.htmlFor;row.append(input);inputs.push(input);
          } else {
            const range=document.createElement('input'),number=document.createElement('input');range.type='range';number.type='number';
            range.id=labelNode.htmlFor;number.setAttribute('aria-label',label+'数值'+(unit?' '+unit:''));
            for(const input of [range,number]){input.min=min;input.max=max;input.step=step;inputs.push(input);}
            const value=document.createElement('span');value.className='hint-debug-value';value.append(number,document.createTextNode(unit||''));row.append(range,value);
          }
          inputs.forEach(input=>{
            input.value=initial;
            this.on(input,'input',()=>{
              if(input.value==='')return;
              // Let users finish typing e.g. 120 before clamping the interim 1.
              if(input.type==='number'&&(Number(input.value)<min||Number(input.value)>max))return;
              this.set(id,input.value);this.status('未保存 · 已实时应用');
            });
            this.on(input,'change',()=>{if(input.value!=='')this.set(id,input.value);this.sync(id);});
          });
          this.controls.set(id,inputs);details.append(row);
        }
        this.panel.querySelector('[data-fields]').append(details);
      }
      try {const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.version===1){for(const [id,value] of Object.entries(saved.values||{}))this.set(id,value);this.status('已载入本机配置');}} catch {this.status('无法读取本机配置，当前使用默认值');}
      fields.forEach(([id])=>this.set(id,this.values[id]));
      this.on(this.launcher,'click',()=>this.toggle());this.on(this.panel.querySelector('[data-close]'),'click',()=>this.toggle(false));
      this.on(document,'keydown',e=>{if(e.ctrlKey&&e.altKey&&e.code==='KeyD'){e.preventDefault();this.toggle();}else if(e.key==='Escape'&&!this.panel.hidden){this.toggle(false);}});
      this.panel.querySelectorAll('[data-replay]').forEach(button=>this.on(button,'click',()=>onReplay(button.dataset.replay)));
      this.on(this.panel.querySelector('[data-bubble]'),'click',onBubble);
      this.on(this.panel.querySelector('[data-save]'),'click',()=>{try{localStorage.setItem(key,JSON.stringify(this.snapshot()));this.status('已保存到本机，刷新后仍生效');}catch{this.status('本机存储不可用，请导出 JSON');}});
      this.on(this.panel.querySelector('[data-reset]'),'click',()=>{
        fields.forEach(([id,,initial])=>this.set(id,initial));
        try{localStorage.removeItem(key);this.status('已恢复默认并清除本机配置');}catch{this.status('已恢复默认；无法清除本机存储');}
      });
      this.on(this.panel.querySelector('[data-export]'),'click',()=>{
        const blob=new Blob([JSON.stringify(this.snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download='interaction-visual-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.status('配置已导出为 JSON');
      });
      const header=this.panel.querySelector('.hint-debug-header'); let drag=null;
      this.on(header,'pointerdown',e=>{if(e.target.closest('button')||e.button!==0)return;const rect=this.panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,id:e.pointerId};header.setPointerCapture(e.pointerId);});
      this.on(header,'pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;this.place(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])this.on(header,event,()=>{drag=null;});
      this.on(window,'resize',()=>{if(!this.panel.hidden){const rect=this.panel.getBoundingClientRect();this.place(rect.left,rect.top);}});
    }
    set(id,raw) {
      const field=fields.find(item=>item[0]===id);if(!field)return;
      let value=raw;
      if(typeof field[2]==='number') {value=Number(raw);if(!Number.isFinite(value))return;value=Math.max(field[3],Math.min(field[4],value));value=Number((Math.round(value/field[5])*field[5]).toFixed(3));}
      else if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))return;
      this.values[id]=value;document.documentElement.style.setProperty('--hint-'+id,value+(field[6]||''));this.sync(id);
      if(id==='outline-min'&&value>this.values['outline-max'])this.set('outline-max',value);
      if(id==='outline-max'&&value<this.values['outline-min'])this.set('outline-min',value);
    }
    sync(id){this.controls.get(id)?.forEach(input=>input.value=this.values[id]);}
    snapshot(){return {version:1,values:{...this.values}};}
    status(text){this.panel.querySelector('[data-status]').textContent=text;}
    place(x,y){this.panel.style.left=Math.max(8,Math.min(innerWidth-this.panel.offsetWidth-8,x))+'px';this.panel.style.top=Math.max(8,Math.min(innerHeight-this.panel.offsetHeight-8,y))+'px';this.panel.style.bottom='auto';}
    toggle(force){const open=force??this.panel.hidden;this.panel.hidden=!open;this.launcher.setAttribute('aria-expanded',String(open));if(open){const r=this.panel.getBoundingClientRect();this.place(r.left,r.top);this.panel.querySelector('[data-close]').focus();}else this.launcher.focus();}
    destroy(){this.abort.abort();for(const [id,value] of this.previous){if(value)document.documentElement.style.setProperty('--hint-'+id,value);else document.documentElement.style.removeProperty('--hint-'+id);}this.panel.remove();this.launcher.remove();}
  }
  window.HintDebugPanel=HintDebugPanel;
})();

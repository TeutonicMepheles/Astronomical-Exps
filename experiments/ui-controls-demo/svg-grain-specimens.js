const progressSteps = ['选择光照', '框出轮廓', '选择山峰 A', '计算高度差'];

function progressAlternatives(index = 1) {
  const count = progressSteps.length;
  const current = progressSteps[index];
  const stage = `<span class="progress-index">${index + 1} / ${count}</span>`;
  const segments = progressSteps.map((step, i) =>
    `<li class="${i < index ? 'done' : ''}" ${i === index ? 'aria-current="step"' : ''}><span class="progress-tick" aria-hidden="true"></span><span>${step}</span></li>`
  ).join('');
  const remaining = index + 1 < count ? `下一步 · ${progressSteps[index + 1]}` : '最后一步';
  return `
    <div class="progress-variant"><p>观测刻度</p><div class="progress-face surface progress-scale">
      <div class="progress-line"><strong>${current}</strong>${stage}</div>
      <ol aria-label="实验步骤">${segments}</ol>
    </div></div>
    <div class="progress-variant"><p>章节索引</p><ol class="progress-face surface progress-index-list" aria-label="实验步骤">${segments}</ol></div>
    <div class="progress-variant"><p>流程接力</p><div class="progress-face surface progress-handoff">
      <div class="progress-line">${stage}<strong>${current}</strong></div>
      <span class="progress-next">${remaining}</span>
    </div></div>
    <div class="progress-variant"><p>页签书签</p><div class="progress-face surface progress-bookmark">
      <span class="progress-flag" aria-label="第 ${index + 1} 步，共 ${count} 步">${String(index + 1).padStart(2, '0')}</span><strong>${current}</strong>
    </div></div>`;
}

function knowledgeDirections() {
  const placements = [['up', '底边 · 向上'], ['down', '顶边 · 向下'], ['left', '右边 · 向左'], ['right', '左边 · 向右']];
  return placements.map(([direction, label]) => `
    <div class="knowledge-case"><p class="tip-placement">${label}</p>
      <div class="knowledge-scene knowledge-scene--${direction}">
        <details class="knowledge-disclosure">
          <summary class="knowledge-trigger surface" aria-label="知识点已解锁，影子是怎么形成的？">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7c-2-2-5-2.5-9-2v13c4-.5 7 0 9 2 2-2 5-2.5 9-2V8M12 7v13m4-16 2 2 4-4"/></svg>
          </summary>
          <div class="knowledge-tip surface">
            <div class="knowledge-title"><h4>影子是怎么形成的？</h4><button type="button" class="knowledge-close" data-bubble-close aria-label="关闭知识点详情">×</button></div>
            <p>当物体挡住光线时，物体背光的一侧会出现影子。</p>
          </div>
        </details>
      </div>
    </div>`).join('');
}

function directionalTips(expandable) {
  const placements = [['above', '上方'], ['below', '下方'], ['left', '左侧'], ['right', '右侧']];
  const content = expandable
    ? '<details class="bubble-details" open><summary class="bubble-copy surface"><span>观测点 A</span><i class="bubble-chevron" aria-hidden="true"></i></summary><div class="bubble-panel surface"><p class="bubble-heading">观测参数</p><dl><dt>太阳高度角</dt><dd>35°</dd><dt>影长</dt><dd>110 cm</dd></dl><div class="row"><button type="button" class="action surface" data-bubble-select>设为观测点</button><button type="button" class="option surface" data-bubble-close>收起</button></div><p class="bubble-feedback" role="status"></p></div></details>'
    : '<p class="bubble-copy surface" role="status">沿经线选择观测点</p>';
  return placements.map(([placement, label]) =>
    `<div class="tip-case"><p class="tip-placement">${label}</p><div class="tip-scene tip-scene--${placement}"><span class="tip-pin" aria-hidden="true">A</span>${content}</div></div>`
  ).join('');
}

function steppedBar(name, labels, selected) {
  const count = labels.length;
  const segments = labels.map((label, i) =>
    `<label class="step-segment"><span class="step-fill surface" aria-hidden="true"></span><input type="radio" name="level-${count}" ${i === selected ? 'checked' : ''}><span class="step-label">${label}</span></label>`
  ).join('');
  return `<fieldset class="step-field"><legend>${name} · ${count} 挡</legend><div class="step-bar" style="--steps:${count}">${segments}</div></fieldset>`;
}

const svgSpecimens = [
  ['按钮与导航', [
    ['文字与图标按钮','<div class="row"><button class="action surface">开始实验</button><button class="option surface">重置</button><button class="option surface" aria-label="关闭">×</button><button class="option surface" disabled>未解锁</button></div>'],
    ['章节导航与阶段进度','<div class="row"><button class="option surface" aria-pressed="true">认识镜面</button><button class="option surface" aria-pressed="false">组装</button></div><progress max="3" value="2" aria-label="实验进度"></progress><span>完成 2 / 3</span>'],
    ['实验顺序进度条','<div class="course-track surface"><ol class="course-rail" aria-label="实验顺序"><li class="done"><b aria-hidden="true">✓</b>选择因素</li><li aria-current="step"><b>2</b>设置参数</li><li><b>3</b>观察记录</li></ol></div>'],
    ['实验进度条 · 四种样式', `<div class="progress-preview" data-progress-preview="1"><div class="progress-variants" data-progress-variants aria-live="polite">${progressAlternatives()}</div><div class="row progress-preview-actions"><button type="button" class="option surface" data-progress-delta="-1">上一步</button><button type="button" class="option surface" data-progress-delta="1">下一步</button></div></div>`],
    ['实验记录册入口','<button class="record-entry surface" data-dialog="records" aria-haspopup="dialog"><span class="record-spine"><svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h13v16H7a2 2 0 0 1 0-4h12M6 3.5a1 1 0 0 0-1 1v13M9 7.5h6M9 10.5h6"/></svg></span><span class="record-label">实验记录</span><b>01</b></button>'],
    ['弹出菜单与折叠区','<details><summary class="surface">实验章节</summary><div class="row"><button class="option surface">参数观测</button><button class="option surface">返回首页</button></div></details>']
  ]],
  ['选择与开关',[
    ['分段选择和图文选项','<div class="row" data-single><button class="option surface" aria-pressed="true">◉ 日食</button><button class="option surface" aria-pressed="false">◐ 月食</button></div>'],
    ['单选组与下拉菜单','<div class="row"><label><input type="radio" name="compare" checked> 大小</label><label><input type="radio" name="compare"> 速度</label><label>目标 <select class="surface"><option>土星</option><option>月球</option><option>木星</option></select></label></div>'],
    ['复选与开关','<div class="row"><label><input type="checkbox" checked> 显示辅助线</label><label><input type="checkbox" role="switch"> 实时预览</label></div>'],
    ['观察点与完成标记','<div class="row" data-single><button class="option surface" aria-pressed="true">A</button><button class="option surface" aria-pressed="false">B</button><button class="option surface" aria-pressed="false" aria-label="观察点 C，已记录">✓ C</button></div>']
  ]],
  ['输入与读数',[
    ['离散式滑条 · 点击选挡',
      steppedBar('陨石大小',['小','中','大'],1)+
      steppedBar('灯光亮度',['关','低','中','高'],2)+
      steppedBar('演示速度',['1×','2×','3×','4×','5×'],1)+
      steppedBar('光照角度',['10°','20°','30°','40°','50°','60°'],3)],
    ['填充式滑条 · 参数、比例、角度','<div class="slider-bars"><label class="value-slider" data-tone="warm">太阳高度角 <input type="range" min="5" max="85" value="35" data-increments="1 5" data-range data-unit="°"><output>35°</output></label><label class="value-slider" data-tone="cool">灯光亮度 <input type="range" min="0" max="100" value="68" data-increments="1 5" data-range><output>68%</output></label><label class="value-slider">曝光 <input type="range" min="0" max="3" step="0.01" value="1.8" data-increments="0.01 0.10" data-range data-unit="" data-precision="2"><output>1.80</output></label><label class="value-slider">锁定参数 <input type="range" min="0" max="100" value="45" data-increments="1 5" data-range disabled><output>45%</output></label></div>'],
    ['文本、校验与数值输入','<div class="row"><label>经度 <input class="surface" type="text" value="121" inputmode="numeric" data-longitude></label><label>影长 <input class="surface" type="number" value="110" min="0" step="1"> cm</label></div><p class="tip surface" role="status" data-validation>经度范围 −180° 至 180°</p>'],
    ['步进器与单位','<div class="row standalone-stepper"><button type="button" class="option surface" data-delta="-1" aria-label="减少 1 度">−1°</button><label class="stepper-field surface"><input type="number" min="-180" max="180" step="1" value="121" data-step-value aria-label="角度（度）"><span aria-hidden="true">°</span></label><button type="button" class="option surface" data-delta="1" aria-label="增加 1 度">+1°</button></div>'],
    ['经度输入 · 双档步进', `
      <div class="longitude-stepper">
        <div class="standalone-stepper longitude-stepper-row" role="group" aria-label="经度步进">
          <button type="button" class="option surface" data-delta="-10" aria-label="减少 10 度">−10°</button>
          <button type="button" class="option surface" data-delta="-1" aria-label="减少 1 度">−1°</button>
          <label class="stepper-field surface"><input type="number" min="-180" max="180" step="1" value="121" data-step-value aria-label="经度（东正西负，度）"><span aria-hidden="true">°</span></label>
          <button type="button" class="option surface" data-delta="1" aria-label="增加 1 度">+1°</button>
          <button type="button" class="option surface" data-delta="10" aria-label="增加 10 度">+10°</button>
          <button type="button" class="option surface longitude-confirm" data-longitude-confirm aria-label="确认经度"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
        <p class="longitude-stepper-status" role="status" data-longitude-status>待确认</p>
      </div>`],
    ['范围滑块与数值输出','<label class="value-slider">亮度 <input type="range" min="0" max="100" value="40" data-range><output>40%</output></label>'],
    ['面板读数与公式','<div class="row"><span>正午夹角 <b>25°</b></span><span>估算公式 <b>C ≈ 360° ÷ θ × d</b></span></div>']
  ]],
  ['时间与视图',[
    ['播放、暂停、重播与逐步','<div class="row"><button class="option surface" data-play aria-pressed="false">▶ 播放</button><button class="option surface" data-replay>↻ 重播</button><button class="option surface" data-tick>＋1</button></div><label class="value-slider">食相时间轴 <input type="range" min="0" max="100" value="32" data-range data-timeline><output>32%</output></label>'],
    ['时间节点与当前阶段','<div class="row" data-single><button class="option surface" aria-pressed="true">初亏</button><button class="option surface" aria-pressed="false">食甚</button><button class="option surface" aria-pressed="false">复圆</button></div>'],
    ['章节速度、视图与放大','<div class="row" data-single><button class="option surface" aria-pressed="true">1×</button><button class="option surface" aria-pressed="false">2×</button></div><div class="row"><button class="option surface" aria-pressed="false">局部放大</button><button class="option surface" aria-pressed="false">双视图</button></div>'],
    ['旋转、俯仰与回正','<div class="row"><button class="option surface" data-turn="-15">左转</button><button class="option surface" data-turn="15">右转</button><button class="option surface" data-turn="0">回正</button><output data-view-angle>0°</output></div>']
  ]],
  ['拖拽与测量',[
    ['调节旋钮与导轨滑块','<div class="row"><label class="dial surface"><span class="dial-face" aria-hidden="true"></span><input type="range" min="0" max="100" value="40" data-range aria-label="焦距旋钮"><output>40%</output></label><label class="value-slider rail">镜座导轨 <input type="range" min="-30" max="105" value="35" data-range data-unit=" cm"><output>35 cm</output></label></div>'],
    ['可拖动的分屏手柄','<label class="value-slider divider surface">分屏位置 <input type="range" min="25" max="75" value="50" data-range><output>50%</output></label>'],
    ['拖放目标和点按替代','<div class="row"><button class="option surface" draggable="true" data-piece aria-pressed="false">凹面镜</button><button class="drop surface" data-drop>放入安装位</button></div>'],
    ['选点、轮廓、测尺与标注','<div class="measure surface"><div class="row"><button class="option surface" data-point="A" aria-pressed="false">起点 A</button><span aria-hidden="true">┄┄┄</span><button class="option surface" data-point="B" aria-pressed="false">终点 B</button></div><div class="row"><output data-measure>等待取点</output><button class="option surface" data-measure-confirm disabled>确认</button></div></div>'],
    ['手势提示与可操作轮廓','<div class="row"><span class="badge surface gesture"><span aria-hidden="true">☝</span> 点按观察点</span><span class="badge surface">↔ 拖动调节</span></div><button class="drop surface" aria-pressed="false">可安装的轮廓</button>'],
    ['按住施力与释放','<button class="action surface" data-hold>按住打气</button><output data-pressure>0 次</output>']
  ]],
  ['提示与状态',[
    ['知识点解锁 · 图标与四向 Tips', knowledgeDirections()],
    ['Tips 气泡 · 四向定位', directionalTips(false)],
    ['可展开气泡 · 四向观测面板', directionalTips(true)],
    ['操作提示、名称气泡与图例','<p class="tip surface" role="status">放下以安装镜片</p><div class="row"><span class="badge surface">观察点 A</span><span>● 本影　○ 半影</span></div>'],
    ['状态条、结果提示与警示','<div class="row"><span class="badge surface">✓ 已记录</span><span class="badge surface" role="status">△ 等待确认</span><span class="badge surface" aria-busy="true">计算中…</span></div>'],
    ['名称标签、状态读数与完成反馈','<p>推力 <b>中</b>　高度 <b>30</b> 示意格</p><button class="action surface" data-dialog="complete">查看阶段完成</button>']
  ]],
  ['弹窗与记录',[
    ['参数、任务目标与阶段完成弹窗','<div class="row"><button class="action surface" data-dialog="params">调整参数</button><button class="option surface" data-dialog="complete">阶段完成</button></div>'],
    ['记录面板、表格、卡片与分页','<details open><summary class="surface">课堂记录</summary><table><thead><tr><th>组次</th><th>条件</th><th>结果</th></tr></thead><tbody><tr><td data-record>01</td><td>大小对照</td><td>已记录</td></tr></tbody></table><div class="row"><button class="option surface" data-page="-1">上一页</button><output data-page-label>1 / 2</output><button class="option surface" data-page="1">下一页</button></div></details>'],
    ['局部窗口、记录图与空状态','<details><summary class="surface">局部放大与图片记录</summary><figure class="record-frame surface"><div class="record-image" role="img" aria-label="地面视图示意"></div><figcaption>第 1 组 · 局部截图</figcaption></figure><p class="tip surface">第 2 组待记录</p></details>']
  ]],
  ['开发与编辑',[
    ['颜色取样与数值微调','<div class="row"><label>标记颜色 <input type="color" value="#ad9bd8"></label><label>位置 <input class="surface" type="number" value="12"></label></div>'],
    ['编辑工具与保存状态','<div class="row"><button class="option surface" aria-pressed="false">编辑位置</button><button class="action surface" data-save>保存位置</button><label>导入 <input type="file" accept=".json"></label></div><p class="tip surface" role="status" data-save-status>等待保存</p>'],
    ['对象列表、重置与禁用工具','<details><summary class="surface">对象列表</summary><button class="option surface">恢复默认</button><button class="option surface" disabled>删除选中</button></details>']
  ]]
];

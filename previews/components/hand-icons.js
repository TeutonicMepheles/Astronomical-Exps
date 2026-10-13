/* Ten local vector proposals. No icon service, font or remote asset required. */
(() => {
  const finger = 'M22 42V14c0-7 10-7 10 0v23-8c0-6 10-6 10 0v9-5c0-6 9-6 9 0v9-4c0-6 9-6 9 0v17c0 13-8 21-20 21h-3c-7 0-12-4-16-10L9 50c-5-6 2-12 7-7l9 8';
  const cursor = 'M22 43V12h9v25h8v5h9v5h9v18l-8 12H29l-6-14L12 53v-9h7l10 10';
  const glove = 'M22 41V15c0-9 13-9 13 0v21c2-8 12-7 12 1 6-5 14 0 12 8l-2 17c-1 9-10 15-20 15-8 0-12-4-16-11L9 50c-5-8 4-14 10-8l7 8';
  const slim = 'M24 45V13c0-6 8-6 8 0v27l5-3c6-4 18 3 18 10v14c0 10-7 16-17 16-7 0-10-4-14-10L13 51c-4-6 2-11 6-7l10 11';
  const pinch = 'M24 43V14c0-7 10-7 10 0v26c6-7 20-3 20 7v14c0 10-6 16-17 16-9 0-14-5-15-14l-2-10-6 3c-8 3-12-7-5-11l10-6';
  const palm = 'M24 40V14c0-7 9-7 9 0v23-28c0-7 9-7 9 0v29-22c0-7 9-7 9 0v25-16c0-7 9-7 9 0v32c0 14-7 22-21 22-9 0-15-5-19-13L9 47c-4-8 5-13 9-6l8 13';
  const fist = 'M19 41V30c0-8 12-8 12 0v10-15c0-8 11-8 11 0v17-11c0-8 11-8 11 0v14-7c0-7 10-7 10 0v20c0 12-9 20-23 20-12 0-20-8-22-18L12 48c-4-8 4-12 9-6l11 10';
  const two = 'M23 43V15c0-7 9-7 9 0v26-30c0-7 10-7 10 0v30c3-6 11-4 11 3 5-3 10 1 10 7v10c0 11-8 18-21 18-10 0-15-5-19-13L11 51c-5-8 4-13 9-6l7 9';
  const joint = '<path d="M33 39v10m10-7v9m9-4v7" fill="none"/>';
  const entries = [
    ['cream','01','奶油手套','圆润、亲和 · 推荐',glove,'#fff1d4','#675d4c',2.2,joint],
    ['cursor','02','经典指针','清楚、熟悉',cursor,'#fff','#334561',2.5,''],
    ['line','03','极简线稿','轻巧、低干扰',slim,'#17253bd9','#f4f0df',2.4,''],
    ['round','04','圆头短手','紧凑、柔和',pinch,'#e5f2ec','#496c68',2,joint],
    ['paper','05','剪纸手指','平面、简洁',finger,'#f2d9aa','none',0,''],
    ['cuff','06','袖口手套','角色感、课堂感',glove,'#f5eee2','#5b6571',2.2,'<path d="M29 73h24v10H29z" fill="#8eafd3"/>'],
    ['palm','07','张开手掌','适合抓取前提示',palm,'#f1e7d5','#615b52',2,'<path d="M34 56q8-5 16 0" fill="none"/>'],
    ['grab','08','握住物品','强调已按住状态',fist,'#f1e7d5','#615b52',2,joint],
    ['two','09','双指手势','适合双指操作',two,'#ddeef5','#54758b',2,joint],
    ['touch','10','指尖触点','突出接触位置',slim,'#f9edda','#6c665d',2,'<circle cx="28" cy="14" r="6" fill="#a9d8c5" stroke="none"/>']
  ];
  const icons = entries.map(([id,number,name,note,path,fill,stroke,width,detail])=>({id,number,name,note,svg:`<svg viewBox="0 0 72 88" aria-hidden="true" focusable="false"><g fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/>${detail}</g></svg>`}));
  window.ExperimentHints = window.ExperimentHints || {};
  window.ExperimentHints.handIcons = icons;
})();

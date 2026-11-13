/*
 * 分步演示控制：日食 / 月食两套五节点，播放可暂停，上一步/下一步定格。
 */
(function () {
  'use strict';

  var M = window.EclipseModel;
  var stage = document.getElementById('stage');
  var scene = new window.EclipseScene(document.getElementById('scene'));
  var sky = new window.EclipseSky(document.getElementById('sky'));
  var rail = window.StageRail.create(document.getElementById('stageRail'), {
    onPick: function (index) { jumpTo(index); }
  });

  var stageName = document.getElementById('stageName');
  var stageType = document.getElementById('stageType');
  var stageFill = document.getElementById('stageFill');
  var live = document.getElementById('live');
  var phiRange = document.getElementById('phiRange');
  var phiTicks = document.getElementById('phiTicks');
  var sceneCanvas = document.getElementById('scene');
  var skyFrame = document.querySelector('.sky-frame');
  var viewButtons = document.querySelectorAll('.view-switch button');
  var transport = document.querySelector('.transport');
  var prevBtn = document.getElementById('prevBtn');
  var playBtn = document.getElementById('playBtn');
  var nextBtn = document.getElementById('nextBtn');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cache = {};
  var move = null;
  var holdUntil = 0;
  var lastTime = 0;
  var labelTimer = 0;

  var state = {
    chapter: 0, orbitPhi: Math.PI, year: 0, orbitPlaying: false, yearPlaying: false, speed: 1,
    mode: 'solar',
    index: 0,
    phi: 0,
    motion: !reduce,
    playing: false,
    /* 拖动进度后进入自由位姿：阶段名按当前 phi 落在哪一段来定，不再绑节点序号 */
    free: false,
    dragging: false,
    link: false,
    view: 'earth',
    time: 0
  };

  function nodesFor(mode) {
    if (!cache[mode]) cache[mode] = M.nodes(mode);
    return cache[mode];
  }

  /* 斜视档画的是另一个月份（新月离交点 90°），食相的五节点对它没有意义：
     那一档的进度条走完整圈，四个台阶是 望 → 下弦 → 新月 → 上弦 → 望。 */
  var TAU = Math.PI * 2;
  var QUARTER = Math.PI / 2;
  /* 进度条 50% 落在「离交点 90°」的那一帧：日食档是新月（φ=180°），
     月食档是望月（φ=0，斜视里整体转了 180°），所以相位名两边是相反的 */
  var QUARTER_NAMES = {
    solar: ['望月', '下弦', '新月', '上弦', '望月'],
    lunar: ['新月', '上弦', '望月', '下弦', '新月']
  };
  function orbitView() { return state.view === 'oblique'; }

  /* ---------------- 公转进度：节点角度区间就是可拖动范围 ---------------- */
  function bounds() { return state.mode === 'solar' ? [0, TAU] : [-Math.PI, Math.PI]; }
  function eventPhi(phi) { var center=state.mode==='solar'?Math.PI:0;return center+Math.atan2(Math.sin(phi-center),Math.cos(phi-center)); }

  function phiFromValue(v) {
    var b = bounds();
    return b[0] + (b[1] - b[0]) * (v / 1000);
  }

  function valueFromPhi(phi) {
    var b = bounds();
    var span = b[1] - b[0] || 1;
    return M.clamp((phi - b[0]) / span, 0, 1) * 1000;
  }

  /* 已经越过的最后一个节点：轨道上的琥珀高亮挂在它身上，
     而不是「最近的节点」——点在两节点之间时，文字不会无归属地来回跳 */
  function crossedIndex(phi) {
    phi = eventPhi(phi);
    if (orbitView()) return M.clamp(Math.round(phi / QUARTER), 0, 4);
    var list = nodesFor(state.mode);
    var idx = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].phi <= phi) idx = i;
    }
    return idx;
  }

  /* 节点上是节点名，落在节点之间就是「偏食 / 全食」这两段之一。
     全食段是食既→生光，也就是已越过节点为 1 / 2 的那两段。 */
  function phaseName(phi) {
    var info=M.orbitInfo(phi),m=M.moonAt(phi);
    if(Math.abs(Math.sin(info.nodeAngle))>.00001){
      if(state.mode==='lunar'){var status=M.lunarStatus(phi);return status==='total'?'全食':status==='partial'?'偏食':status==='penumbra'?'半影月食':'未发生月食';}
      var skyState=M.solarSky(phi),visibility=M.sunVisible(skyState.P,skyState.M,M.RM);
      return visibility<.001?'全食':visibility<.999?'偏食':'未发生日食';
    }
    var p=eventPhi(phi),list=nodesFor(state.mode);
    if(p<list[0].phi-.001 || p>list[4].phi+.001) {
      if(state.mode==='lunar' && M.lunarStatus(phi)==='penumbra')return '半影月食';
      return '未发生'+M.MODES[state.mode].label;
    }
    for(var i=0;i<list.length;i++)if(Math.abs(list[i].phi-p)<.001)return list[i].name;
    var idx=crossedIndex(p);return idx>=1&&idx<=2?'全食':'偏食';
  }

  function buildTicks() {
    var b = bounds();
    var span = b[1] - b[0] || 1;
    phiTicks.innerHTML = '';
    if (orbitView()) {
      for (var q = 1; q <= 3; q++) {
        var tq = document.createElement('i');
        tq.style.left = ((q * QUARTER - b[0]) / span * 100).toFixed(2) + '%';
        phiTicks.appendChild(tq);
      }
      return;
    }
    var list = nodesFor(state.mode);
    for (var i = 0; i < list.length; i++) {
      var t = document.createElement('i');
      t.style.left = ((list[i].phi - b[0]) / span * 100).toFixed(2) + '%';
      phiTicks.appendChild(t);
    }
  }

  function syncSlider() {
    phiRange.value = String(Math.round(valueFromPhi(state.phi)*10)/10);
    var degrees=(valueFromPhi(state.phi)*.36).toFixed(1);
    phiRange.setAttribute('aria-valuetext', degrees+'°，'+phaseName(state.phi));
    document.getElementById('phiValue').textContent=degrees+'°';
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function fit() {
    var s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }

  var labelTarget = '';
  function setLabels(name, type) {
    /* 比的是「正在排队的目标」而不是当前文本：拖月球时 170ms 内会连发多次，
       若拿当前文本判重，旧的那次计时器会把名字改回去（初亏/偏食来回闪）。 */
    var key = name + '|' + type;
    if (labelTarget === key) return;
    labelTarget = key;
    stageName.classList.add('is-swap');
    stageType.classList.add('is-swap');
    window.clearTimeout(labelTimer);
    labelTimer = window.setTimeout(function () {
      stageName.textContent = name;
      stageType.textContent = type;
      stageName.classList.remove('is-swap');
      stageType.classList.remove('is-swap');
    }, reduce ? 0 : 170);
  }

  function updateUI() {
    var list = nodesFor(state.mode);
    var name = phaseName(state.phi);
    var inEvent = phaseName(state.phi).indexOf('未发生') !== 0;
    var type=!inEvent?'完整公转':name==='半影月食'?'半影月食':name==='偏食'?(state.mode==='solar'?'日偏食':'月偏食'):M.MODES[state.mode].type;
    setLabels(name,type);
    stage.dataset.outside=String(!inEvent || name==='半影月食');
    /* 斜视档这一框里没有发生食——只对辅助技术说话时也不能说反 */
    live.textContent = state.view === 'oblique'
      ? name + '，斜视图'
      : name + '，完整公转 ' + Math.round(valueFromPhi(state.phi)*.36) + '°';
    stageFill.style.width = (valueFromPhi(state.phi) / 10).toFixed(1) + '%';
    rail.setProgress(state.phi, state.index);
    transport.classList.toggle('is-playing', state.playing);
    playBtn.setAttribute('aria-label', state.playing ? '暂停' : '播放');
    prevBtn.disabled = state.index === 0;
    nextBtn.disabled = state.index === stageCount() - 1;
    syncSlider();
    var info=M.orbitInfo(state.phi),aligned=Math.abs(Math.sin(info.nodeAngle))<.00001;
    document.getElementById('nodeStatus').textContent='离交点 '+info.nodeDistance.toFixed(1)+'° · 黄纬 '+info.latitude.toFixed(1)+'°';
    document.querySelectorAll('.rail-node').forEach(function(b){b.disabled=!aligned;});
    if(!aligned){prevBtn.disabled=true;nextBtn.disabled=true;}
  }

  /* ---------------- 自由拖动：滑块 + 直接拖月球 ---------------- */
  function scrubTo(phi, andIndex) {
    var b = bounds();
    state.phi = M.clamp(phi, b[0], b[1]);
    state.free = true;
    state.yearPlaying=false;syncYear();
    state.playing = false;
    move = null;
    if (andIndex !== false) state.index = crossedIndex(state.phi);
    updateUI();
  }

  phiRange.addEventListener('input', function () {
    scrubTo(phiFromValue(Number(phiRange.value)));
  });

  function durationFor(from, to) {
    var deg = Math.abs(to - from) * 180 / Math.PI;
    return M.clamp(680 + deg * 9, 680, 1500);
  }

  function stageCount() { return orbitView() ? 5 : nodesFor(state.mode).length; }

  function jumpTo(index, immediate) {
    state.yearPlaying=false;syncYear();
    state.playing=false;
    index = Math.max(0, Math.min(stageCount() - 1, index));
    state.index = index;
    /* 斜视档的台阶是四个相位，阶段名一律由 phi 推出来 */
    state.free = orbitView();
    var target = orbitView() ? index * QUARTER : nodesFor(state.mode)[index].phi;
    if (immediate || reduce) {
      state.phi = target;
      move = null;
      holdUntil = window.performance.now() + 900;
    } else {
      move = {
        from: state.phi,
        to: target,
        start: window.performance.now(),
        dur: durationFor(state.phi, target) / state.speed
      };
    }
    updateUI();
  }

  function step(delta) {
    if(Math.abs(Math.sin(M.orbitInfo(state.phi).nodeAngle))>.00001)return;
    var list=nodesFor(state.mode),phi=eventPhi(state.phi),target=delta>0?list.length-1:0;
    if(delta>0){for(var i=0;i<list.length;i++)if(list[i].phi>phi+.001){target=i;break;}}
    else{for(var i=list.length-1;i>=0;i--)if(list[i].phi<phi-.001){target=i;break;}}
    jumpTo(target);
  }

  function togglePlay() {
    state.yearPlaying=false;syncYear();
    move=null;state.free=true;
    if(!state.playing && state.phi>=bounds()[1]-.0001)state.phi=bounds()[0];
    state.playing=!state.playing;updateUI();
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    state.yearPlaying=false;syncYear();
    state.mode = mode;
    state.playing = false;
    state.index = 0;
    state.free = false;
    rail.setStages(nodesFor(mode), mode);
    buildTicks();
    /* 两套食象的角度区间不相邻，跨模式不做插值动画，直接落到初亏。
       斜视档落到「离交点 90°」那一帧：日食看新月、月食看望月，两边对比的正是同一件事 */
    jumpTo(orbitView() ? 2 : 0, true);
    document.querySelectorAll('.mode-switch button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
  }

  function frame(now) {
    var dt = lastTime ? Math.min(64, now - lastTime) : 16;
    lastTime = now;
    state.time += dt;

    if (move) {
      var t = (now - move.start) / move.dur;
      if (t >= 1) {
        state.phi = move.to;
        move = null;
        holdUntil = now + (reduce ? 1000 : 900) / state.speed;
        /* 斜视档的阶段名按 phi 推，动画走完要补一次，否则名字停在上一档 */
        updateUI();
      } else {
        state.phi = move.from + (move.to - move.from) * ease(t);
        updateUI();
      }
    }

    if (state.playing && !move && !document.hidden) {
      state.phi=Math.min(bounds()[1],state.phi+dt*TAU/24000*state.speed);
      state.free=true;state.index=crossedIndex(state.phi);
      if(state.phi>=bounds()[1])state.playing=false;
      updateUI();
    }

    if(state.yearPlaying && !document.hidden){
      applyYear(Math.min(TAU,state.year+dt*TAU/24000*state.speed),false);
      if(state.year>=TAU){state.yearPlaying=false;syncYear();}
    }
    if (!state.dragging) syncSlider();
    /* 轨道上的琥珀点跟着 φ 连续走（内部按 t 去重，静止时不写 DOM） */
    rail.setProgress(state.phi, state.index);
    if (state.chapter === 0 || state.chapter === 4) {
      if (state.orbitPlaying && !document.hidden) { state.orbitPhi += dt * TAU / 24000 * state.speed; if (state.orbitPhi >= TAU) {state.orbitPhi = TAU; state.orbitPlaying = false;} syncOrbit(); }
      window.CourseOrbit.render(scene, state);
    } else { scene.render(state); sky.render(state); }
    window.requestAnimationFrame(frame);
  }

  prevBtn.addEventListener('click', function () { step(-1); });
  nextBtn.addEventListener('click', function () { step(1); });
  playBtn.addEventListener('click', togglePlay);

  document.querySelectorAll('.mode-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.mode); });
  });

  /* 换视角只动相机：公转进度、食象与节点全部沿用同一份 state。
     斜视档的进度区间变成整圈，切进切出时若 phi 落在新区间外，落到中点
     （两种区间的中点都是「食甚 / 新月」那一帧）。 */
  viewButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      state.view = b.dataset.view;
      scene.setView(state.view);
      document.getElementById('zoomBtn').setAttribute('aria-pressed','false');
      stage.dataset.view = state.view;
      buildTicks();
      var bb = bounds();
      if (state.phi < bb[0] || state.phi > bb[1]) {
        state.playing = false;
        jumpTo(2, true);
      } else if (orbitView()) {
        state.index = crossedIndex(state.phi);
        state.free = true;
      }
      viewButtons.forEach(function (x) {
        x.setAttribute('aria-pressed', String(x.dataset.view === state.view));
      });
      updateUI();
    });
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    /* 进度条自己要用方向键；按钮上的空格由按钮自己响应（回车/空格=点击） */
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === ' ') {
      if (tag === 'BUTTON') return;
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft') {
      step(-1);
    } else if (e.key === 'ArrowRight') {
      step(1);
    }
  });

  window.addEventListener('resize', fit);
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var onMq = function (ev) { reduce = ev.matches; state.motion = !ev.matches; };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }


  var lessons = [
    ['为什么不是每个月都有日月食？', '先让月球运行一周，再改变地球公转位置，比较新月、满月与交点的关系。'],
    ['影子为什么有深浅？', '沿光线观察：本影挡住全部直射阳光，半影只挡住一部分。点击食甚，比较太空影区与地面所见。'],
    ['日食：月影落向地球', '按五个节点观察月球遮挡太阳；日全食只发生在地面本影覆盖的区域。'],
    ['月食：月球进入地影', '按五个节点观察月球进入本影。穿过地球大气的阳光经折射到达月球，留下偏红的光。'],
    ['新月或满月，还需要什么？', '日食需新月、月食需满月，并且月球接近轨道交点。全食还取决于影区覆盖和视直径；接近交点并不保证全食。']
  ];
  function syncOrbit() {
    var degrees = Math.round(state.orbitPhi / M.DEG);
    document.getElementById('orbitRange').value = degrees;
    document.getElementById('orbitValue').textContent = degrees + '°';
    document.getElementById('yearValue').textContent = (state.year / M.DEG).toFixed(1) + '°';
    document.getElementById('orbitPlay').textContent = state.orbitPlaying ? '暂停公转' : '播放一周';
    var nearPhase = Math.abs(Math.sin(state.orbitPhi)) < 0.10;
    var nearNode = Math.abs(Math.sin(state.orbitPhi + state.year)) < 0.10;
    document.getElementById('orbitStatus').textContent = !nearPhase ? '尚未到新月或满月位置' : !nearNode ? '已到新月或满月，但偏离交点：影轴错开' : '新月或满月接近交点：具备发生食象的几何条件';
  }
  function chapter(n) {
    document.getElementById('zoomBtn').setAttribute('aria-pressed','false');
    state.yearPlaying=false;syncYear();
    state.chapter = n; state.playing = false; state.orbitPlaying = false; move = null;
    stage.dataset.chapter = n;
    document.getElementById('lessonTitle').textContent = lessons[n][0];
    document.getElementById('lessonText').textContent = lessons[n][1];
    document.querySelectorAll('[data-chapter]').forEach(function(b) { b.setAttribute('aria-current', Number(b.dataset.chapter) === n ? 'step' : 'false'); });
    document.getElementById('courseBack').disabled = n === 0;
    document.getElementById('courseNext').textContent = n === 4 ? '重新探索 ↺' : ['进入本影与半影 →','观察日食过程 →','观察月食过程 →','回顾发生条件 →'][n];
    if (n > 0 && n < 4) { setMode(n === 3 ? 'lunar' : 'solar'); state.view = 'earth'; scene.setView('earth'); stage.dataset.view = 'earth'; viewButtons.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.view === 'earth'));}); buildTicks(); jumpTo(n === 1 ? 2 : 0, true); }
    syncOrbit(); updateUI();
  }
  document.querySelectorAll('[data-chapter]').forEach(function(b){ b.addEventListener('click',function(){chapter(Number(b.dataset.chapter));}); });
  document.getElementById('courseBack').onclick = function(){chapter(Math.max(0,state.chapter-1));};
  document.getElementById('courseNext').onclick = function(){chapter((state.chapter+1)%5);};
  document.getElementById('orbitRange').oninput = function(){state.orbitPhi=Number(this.value)*M.DEG;state.orbitPlaying=false;syncOrbit();};
  document.getElementById('yearRange').oninput = function(){applyYear(Number(this.value)*M.DEG,true);syncOrbit();};
  document.getElementById('alignedBtn').onclick = function(){applyYear(0,true);syncOrbit();};
  document.getElementById('missBtn').onclick = function(){applyYear(Math.PI/2,true);syncOrbit();};
  document.getElementById('orbitPlay').onclick = function(){if(state.orbitPhi>=TAU)state.orbitPhi=0;state.orbitPlaying=!state.orbitPlaying;syncOrbit();};
  document.getElementById('restartBtn').onclick = function(){scrubTo(bounds()[0]);};
  document.getElementById('speed').onchange = function(){state.speed=Number(this.value);};
  document.getElementById('zoomBtn').onclick = function(){var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));scene.setZoom(on?1.35:1);};

  function syncYear(){
    var degrees=(state.year/M.DEG).toFixed(1),aligned=Math.abs(Math.sin(state.year))<.00001,miss=Math.abs(Math.cos(state.year))<.00001;
    document.getElementById('earthYearRange').value=degrees;
    document.getElementById('earthYearValue').textContent=degrees+'°';
    document.getElementById('earthYearRange').setAttribute('aria-valuetext',degrees+'°，一年公转进度');
    document.getElementById('yearRange').value=degrees;
    document.getElementById('yearValue').textContent=degrees+'°';
    document.getElementById('nodeAligned').setAttribute('aria-pressed',String(aligned));
    document.getElementById('nodeMiss').setAttribute('aria-pressed',String(miss));
    document.getElementById('yearPlay').setAttribute('aria-pressed',String(state.yearPlaying));
    document.getElementById('yearPlay').textContent=state.yearPlaying?'暂停年度对比':'年度对比（定相位）';
  }
  function applyYear(angle,manual){
    state.year=M.clamp(angle,0,TAU);
    // 日地连线随地球公转旋转；在随日地连线转动的地心视角中，交点线反向转动。
    M.setNodeAngle(Math.atan2(Math.sin(-state.year),Math.cos(-state.year)));
    if(manual){state.yearPlaying=false;state.playing=false;state.orbitPlaying=false;move=null;}
    state.free=true;
    if(state.chapter>0&&state.chapter<4&&state.view!=='earth'){
      state.view='earth';scene.setView('earth');stage.dataset.view='earth';document.getElementById('zoomBtn').setAttribute('aria-pressed','false');
    }
    var aligned=Math.abs(Math.sin(state.year))<.00001;
    viewButtons.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.view===state.view));b.disabled=!aligned&&b.dataset.view!=='earth';});
    syncYear();updateUI();
  }
  function compareNodes(angle){applyYear(angle,true);}
  document.getElementById('earthYearRange').oninput=function(){applyYear(Number(this.value)*M.DEG,true);};
  document.getElementById('yearPlay').onclick=function(){
    if(!state.yearPlaying&&state.year>=TAU)applyYear(0,true);
    state.playing=false;state.orbitPlaying=false;move=null;
    state.yearPlaying=!state.yearPlaying;syncYear();updateUI();
  };
  document.getElementById('overviewBtn').onclick=function(){var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));M.setOverview(on);};
  document.getElementById('nodeAligned').onclick=function(){compareNodes(0);};
  document.getElementById('nodeMiss').onclick=function(){compareNodes(Math.PI/2);};
  document.getElementById('syzygyBtn').onclick=function(){scrubTo(state.mode==='solar'?Math.PI:0);};

  fit();
  stage.dataset.view = state.view;
  state.phi = nodesFor('solar')[0].phi;
  rail.setStages(nodesFor('solar'), 'solar');
  buildTicks();
  updateUI();
  chapter(0);
  window.requestAnimationFrame(frame);
})();

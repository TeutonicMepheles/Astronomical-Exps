/* Learning state is independent of optical parameters and viewport state. */
(function(N){
  'use strict';
  const fresh=()=>({stage:'mirrors',mirror:'plane',mirrorMounted:false,mirrorSelection:null,lens:null,convexShape:100,concaveShape:100,seen:[],mirrorFocal:700,mirrorSource:-4.2,mirrorPosition:3.5,selected:null,installed:[],assemblyDone:false,collapsed:false,records:[],complete:false,message:'将操作台上的镜片拖入光轴夹具，观察光路。'});
  // Reflecting faces sit at different distances from the common holder pivot.
  const mountOffset=type=>({plane:1,concave:1.192,convex:1.8}[type]||0);
  const bounded=(value,type)=>Math.max(-1-mountOffset(type),Math.min(5.3-mountOffset(type),value));
  let state=fresh(),resetVersion=0;const listeners=new Set();
  const emit=()=>listeners.forEach(fn=>fn(N.course.get()));
  const patch=p=>{state={...state,...p};emit();};
  N.course={
    get resetVersion(){return resetVersion;},
    get:()=>({...state,seen:[...state.seen],installed:[...state.installed],records:state.records.map(r=>({...r}))}),
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    canEnter(stage){return stage==='mirrors'||stage==='assembly'&&state.seen.length===3||stage==='observation'&&state.assemblyDone;},
    enter(stage){if(!this.canEnter(stage))return false;patch({stage,selected:null,mirrorSelection:null,message:stage==='mirrors'?'将桌面镜片放入光路，比较三种镜面的光线与焦点。':stage==='assembly'?'选择零件，再点击安装位。':'保持主镜不变，对比 25、10、5 mm 目镜。'});return true;},
    selectMirror(mirror){if(state.stage!=='mirrors'||state.mirrorMounted&&state.mirror===mirror||!['plane','concave','convex'].includes(mirror))return;patch({mirrorSelection:mirror,message:'已选择镜片。拖到夹具上安装。'});},
    clearMirrorSelection(){if(state.stage==='mirrors')patch({mirrorSelection:null});},
    mountLens(type){if(state.stage!=='mirrors'||!['concave','convex'].includes(type))return false;patch({lens:type,message:(type==='concave'?'凹透镜已安装：光束发散，蓝色虚线反向延伸到虚焦点。':'凸透镜已安装：平行光穿过透镜后会聚到实焦点。')+'可移动镜座或取下镜片。'});return true;},
    removeLens(){if(state.stage==='mirrors')patch({lens:null,message:'透镜已回到桌面，圆环镜座已清空。'});},
    setConvexShape(value){value=Number(value);if(state.stage!=='mirrors'||state.lens!=='convex'||!Number.isFinite(value))return;patch({convexShape:Math.max(92,Math.min(100,value))});},
    setConcaveShape(value){value=Number(value);if(state.stage!=='mirrors'||state.lens!=='concave'||!Number.isFinite(value))return;patch({concaveShape:Math.max(85,Math.min(100,value))});},
    mountMirror(mirror=state.mirrorSelection,position){
      if(state.stage!=='mirrors'||!['plane','concave','convex'].includes(mirror))return false;
      const names={plane:'平面镜',concave:'凹面镜',convex:'凸面镜'};
      const carriage=state.mirrorPosition+(state.mirrorMounted?mountOffset(state.mirror):0);
      const target=Number.isFinite(position)?position:carriage-mountOffset(mirror);
      patch({mirror,mirrorFocal:N.mirrorParts?N.mirrorParts.limits(mirror).initial:mirror==='convex'?270:mirror==='concave'?440:700,mirrorPosition:bounded(target,mirror),mirrorMounted:true,mirrorSelection:null,seen:[...new Set([...state.seen,mirror])],message:names[mirror]+'已放入光路。沿导轨拖动镜面，比较光路变化。'});return true;
    },
    removeMirror(){if(state.stage!=='mirrors')return;patch({mirrorPosition:state.mirrorPosition+(state.mirrorMounted?mountOffset(state.mirror):0),mirrorMounted:false,mirrorSelection:null,message:'镜片已回到桌面。比较空光路，或放入另一块镜片。'});},
    setMirrorFocal(value){value=Number(value);if(state.stage!=='mirrors'||!state.mirrorMounted||state.mirror==='plane'||!Number.isFinite(value))return;const range=N.mirrorParts?.limits(state.mirror)||{min:200,max:1200};patch({mirrorFocal:Math.max(range.min,Math.min(range.max,value))});},
    setMirrorPosition(value){if(state.stage!=='mirrors'||!Number.isFinite(value))return;patch({mirrorPosition:bounded(value,state.mirrorMounted?state.mirror:null)});},
    selectPart(part,focus=true){if(!['primary','secondary'].includes(part)||state.installed.includes(part))return;patch({selected:part,focusSelection:focus,message:part==='primary'?'凹面主镜负责集光和会聚。请选择它的安装位置。':'平面副镜将会聚光折向目镜。请选择它的安装位置。'});},
    install(slot,part=state.selected){
      if(state.stage!=='assembly'||!['primary','secondary'].includes(slot))return false;
      if(!part){patch({message:'请先选择主镜或副镜。'});return false;}
      if(part!==slot){patch({message:part==='primary'?'位置不对：主镜应安装在镜筒后端。':'位置不对：副镜应安装在前部，朝向主镜，以 45° 折转光路。'});return false;}
      if(state.installed.includes(part))return false;
      const installed=[...state.installed,part],done=installed.length===2;
      patch({installed,selected:null,assemblyDone:done,message:done?'两面镜子已就位，完整光路接通。观察两次反射后，进入参数观测。':'安装正确。观察镜面的作用，再安装另一面镜子。'});return true;
    },
    toggleCollapsed(){patch({collapsed:!state.collapsed});},
    record(){
      const optical=N.store.get();if(state.stage!=='observation')return;
      if(!optical.live){patch({message:'画面已冻结。请开启实时预览，再记录当前参数。'});return;}
      if(![25,10,5].includes(optical.eyepiece)){patch({message:'本次对照任务请使用 25、10、5 mm 三档目镜。'});return;}
      // A comparison is valid only at the same focal length, aperture, target and source.
      const key=[optical.focal,optical.aperture,optical.target,optical.mode].join('/');
      let records=state.records.filter(r=>r.key===key&&r.eyepiece!==optical.eyepiece);
      const metrics=N.store.metrics(optical);
      records.push({key,eyepiece:optical.eyepiece,focal:optical.focal,aperture:optical.aperture,target:optical.target,magnification:metrics.magnification,field:metrics.field});
      patch({records,complete:records.length===3,message:records.length===3?'对照完成：目镜焦距越短，倍率越高，实际视场越窄。':'已记录。保持主镜、目标和光源不变，换一档目镜继续比较。'});
    },
    resetStage(){
      resetVersion++;
      if(state.stage==='mirrors')patch({mirror:'plane',mirrorMounted:false,mirrorSelection:null,lens:null,convexShape:100,concaveShape:100,seen:[],mirrorFocal:700,mirrorSource:-4.2,mirrorPosition:3.5,installed:[],assemblyDone:false,records:[],complete:false,message:'光路已清空，镜片回到操作台。请重新比较三种镜面。'});
      else if(state.stage==='assembly')patch({installed:[],selected:null,assemblyDone:false,records:[],complete:false,message:'零件已回到托盘，请重新组装。'});
      else{N.store.reset();patch({records:[],complete:false,message:'已恢复观测参数，重新进行三档目镜对照。'});}
    },
    restart(){resetVersion++;state=fresh();N.store.reset();emit();}
  };
})(window.Newton);

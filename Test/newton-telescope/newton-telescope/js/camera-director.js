/* Camera framing only. User rotation remains owned by the viewport. */
(function(N){
  'use strict';
  N.CameraDirector=class{
    constructor(view){this.view=view;this.current={x:0,y:.15,span:7.6};this.transition=null;}
    frame(stage,part,instant=false){
      const frames={mirrors:{x:0,y:-.9,span:9},assembly:{x:0,y:0,span:8.2},observation:{x:0,y:.15,span:7.6},primary:{x:2.3,y:0,span:4.8},secondary:{x:-1.5,y:.3,span:4.8}};
      const to=frames[part]||frames[stage];
      this.view.yaw=0;this.view.pitch=0;this.view.zoom=1;
      if(instant||this.view.reducedMotion){this.current={...to};this.transition=null;this.apply();return;}
      this.transition={from:{...this.current},to:{...to},start:performance.now(),duration:850};this.view.dirty=true;
    }
    tick(time){if(!this.transition)return;const t=Math.min(1,Math.max(0,(time-this.transition.start)/this.transition.duration)),e=t*t*(3-2*t);for(const key of ['x','y','span'])this.current[key]=this.transition.from[key]+(this.transition.to[key]-this.transition.from[key])*e;this.apply();if(t===1)this.transition=null;}
    apply(){const {x,y}=this.current,isMirror=N.course.get().stage==='mirrors';this.view.camera.position.set(isMirror?x:x-3.3,isMirror?y:y+2.4,15);this.view.camera.lookAt(x,y,0);this.view.resize();}
    get busy(){return !!this.transition;}
  };
})(window.Newton);

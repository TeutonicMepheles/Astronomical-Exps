/* Four fixed teaching targets; painted sky locations, not celestial coordinates. */
(function(N){
  'use strict';
  N.observationTargets={
    saturn:{name:'土星',x:1055.84,y:562.42},
    moon:{name:'月球',x:1150,y:530},
    jupiter:{name:'木星',x:930,y:570},
    pleiades:{name:'昴星团',x:1120,y:545}
  };
  N.ObservationAim=class{
    constructor(){this.reset();}
    reset(){this.target=null;this.acquired=false;this.current=null;this.completed=new Set();}
    select(target='saturn'){
      if(!N.observationTargets[target]||this.target===target)return;
      this.target=target;this.acquired=false;
    }
    update({active,state,pointing}){
      if(!active||!N.observationTargets[state.target]||state.mode!=='parallel'){
        this.current=null;return null;
      }
      const base={enabled:true,target:state.target};
      if(this.target!==state.target)return this.current={...base,selected:false,acquired:false,inField:false,x:0,y:0,distance:0};
      if(!pointing||!Number.isFinite(pointing.horizontalError)||!Number.isFinite(pointing.verticalError)){
        this.acquired=false;
        return this.current={...base,selected:true,available:false,acquired:false,inField:false,x:0,y:0,distance:0};
      }
      const radius=N.store.metrics(state).field*Math.PI/360;
      const x=pointing.horizontalError/radius,y=-pointing.verticalError/radius,distance=Math.hypot(x,y),facing=pointing.facing;
      if(facing&&distance<=1)this.acquired=true;
      if(!facing||distance>1.35)this.acquired=false;
      const centerZone=.3;
      const aligned=Boolean(facing&&distance<=centerZone);
      // Accept the same central area shown by the aiming guide. On wider
      // views also check the upcoming 25 mm field, so zooming in has room.
      const referenceEyepiece=N.course?.observationEyepieces?.[0]??25;
      const recordOffset=distance*state.eyepiece/referenceEyepiece;
      // At high magnification a small angular wobble looks larger. Hold a
      // near-axis pointing across focal changes while the target is visible.
      const wasCentered=this.current?.target===state.target&&this.current.recordingCentered;
      const withinCenter=aligned&&recordOffset<=centerZone;
      const stablePointing=recordOffset<=(wasCentered ? .14 : .12);
      const recordingCentered=Boolean(facing&&distance<=1&&(withinCenter||stablePointing));
      const wasFocused=this.current?.target===state.target&&this.current.focused;
      const focused=N.store.focusAcceptable(state,Boolean(wasFocused));
      if(N.course?.get?.().observedTargets?.includes(state.target))this.completed.add(state.target);
      return this.current={...base,selected:true,available:true,acquired:this.acquired,inField:facing&&distance<=1,x,y,distance,
        facing,aligned,focused,recordingCentered,observed:this.completed.has(state.target),horizontalError:pointing.horizontalError,verticalError:pointing.verticalError};
    }
    suggestedTarget(recordedTarget){
      const order=Object.keys(N.observationTargets);
      if(this.target&&this.target!==recordedTarget&&!this.completed.has(this.target))return null;
      const start=this.target?order.indexOf(this.target)+1:0;
      for(let i=0;i<order.length;i++){
        const id=order[(start+i)%order.length];
        if(id!==recordedTarget&&!this.completed.has(id))return id;
      }
      return null;
    }
  };
})(window.Newton);

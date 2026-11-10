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
      const aligned=Boolean(facing&&distance<=.3);
      if(aligned&&state.live)this.completed.add(state.target);
      return this.current={...base,selected:true,available:true,acquired:this.acquired,inField:facing&&distance<=1,x,y,distance,
        facing,aligned,observed:this.completed.has(state.target),horizontalError:pointing.horizontalError,verticalError:pointing.verticalError};
    }
    suggestedTarget(){
      const order=Object.keys(N.observationTargets);
      if(this.target&&!this.completed.has(this.target))return null;
      const start=this.target?order.indexOf(this.target)+1:0;
      for(let i=0;i<order.length;i++){const id=order[(start+i)%order.length];if(!this.completed.has(id))return id;}
      return null;
    }
  };
})(window.Newton);

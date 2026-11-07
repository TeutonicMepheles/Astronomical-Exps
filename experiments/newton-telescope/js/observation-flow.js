/* Third-stage navigation: instrument -> automatic rays -> eyepiece observation. */
(function(N){
  'use strict';
  N.ObservationFlow=class{
    constructor({model,store,showPreview,changed=()=>{}}){
      this.model=model;this.store=store;this.showPreview=showPreview;this.changed=changed;this.phase='initial';
    }
    initial({immediate=false}={}){
      this.phase='initial';this.showPreview(false);this.store.set({running:false});
      this.model?.returnToExterior({immediate});this.changed(this.phase);
    }
    section({immediate=false}={}){
      if(!this.model)return;
      this.phase='section';this.showPreview(false);this.store.set({running:true});
      this.model.setViewMode('section',{immediate});this.changed(this.phase);
    }
    observe(){
      if(this.phase==='initial'||this.model?.transition||this.model?.pendingViewMode)return;
      this.phase='observing';this.store.set({running:true});this.showPreview(true);this.changed(this.phase);
    }
    closePreview(){
      if(this.phase!=='observing')return;
      this.phase='section';this.showPreview(false);this.changed(this.phase);
    }
    openObservation(){this.section({immediate:true});this.observe();}
    activate(target){
      if(this.model?.transition||this.model?.pendingViewMode)return;
      if(target==='environment'){if(this.phase!=='initial')this.initial();return;}
      if(this.phase==='initial'&&(target==='telescope'||target==='eyepiece'))this.section();
      else if(target==='eyepiece')this.observe();
    }
  };
})(window.Newton);

/* Passive operation feedback; the host owns validity and visibility. */
(()=>{
 class OperationTip{
  constructor(root=document.body,{top='64px',className=''}={}){
   this.node=document.createElement('div');this.node.className='experiment-operation-tip'+(className?' '+className:'');
   this.node.setAttribute('role','status');this.node.setAttribute('aria-live','polite');this.node.setAttribute('aria-atomic','true');
   this.node.style.setProperty('--operation-tip-top',top);this.node.hidden=true;root.append(this.node);this.destroyed=false;
  }
  show(text){if(this.destroyed)return;if(this.node.textContent!==text)this.node.textContent=text;this.node.hidden=false;}
  hide(){if(!this.destroyed)this.node.hidden=true;}
  destroy(){this.node.remove();this.destroyed=true;}
 }
 window.ExperimentUI=window.ExperimentUI||{};window.ExperimentUI.OperationTip=OperationTip;
})();

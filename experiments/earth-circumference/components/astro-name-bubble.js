/* Adapted from shared/components/name-bubble.js at repository HEAD 29e13d0.
 * Private EXP04 variant: LibTV indigo/gold visual skin, host-controlled lifecycle,
 * real text, viewport clamping; no mutation of shared component internals. */
export class AstroNameBubble {
 show({target,text}) {
  this.hide();this.target=target;
  const node=document.createElement('div');this.node=node;node.className='astro-name-bubble';
  node.id='astro-variable-tip';node.setAttribute('role','tooltip');node.textContent=text;
  this.previous=target.getAttribute('aria-describedby');target.setAttribute('aria-describedby',[this.previous,node.id].filter(Boolean).join(' '));
  document.body.append(node);this.position();
  this.onResize=()=>this.position();window.addEventListener('resize',this.onResize);
 }
 position(){if(!this.target?.isConnected)return this.hide();const r=this.target.getBoundingClientRect(),b=this.node.getBoundingClientRect();
  const x=Math.max(12,Math.min(innerWidth-b.width-12,r.left+r.width/2-b.width/2)),above=r.top-b.height-12;
  this.node.dataset.below=String(above<12);this.node.style.left=x+'px';this.node.style.top=Math.max(12,Math.min(innerHeight-b.height-12,above<12?r.bottom+12:above))+'px';
  this.node.style.setProperty('--tail',Math.max(18,Math.min(b.width-18,r.left+r.width/2-x))+'px');
 }
 hide(){window.removeEventListener('resize',this.onResize);if(this.target){if(this.previous)this.target.setAttribute('aria-describedby',this.previous);else this.target.removeAttribute('aria-describedby');}this.node?.remove();this.node=null;this.target=null;}
 destroy(){this.hide();}
}

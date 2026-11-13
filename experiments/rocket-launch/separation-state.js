/** Teaching gates and clip-local time are deliberately independent of the old 14 s film. */
export class SeparationLesson {
 constructor(){this.reset();}
 reset(){this.phase='ready';this.index=0;this.local=0;this.elapsed=0;this.paused=false;}
 start(){this.reset();this.phase='ascent';}
 trigger(){if(this.phase!=='waiting'||this.paused)return false;this.phase='animation';this.local=0;return true;}
 get running(){return !this.paused&&['ascent','animation','payload-gap'].includes(this.phase);}
 advance(dt){
  if(!this.running)return null;this.local+=dt;this.elapsed+=dt;
  if(this.phase==='ascent'&&this.local>=1.2){this.phase='waiting';this.local=0;return 'wait';}
  if(this.phase==='payload-gap'&&this.local>=.6){this.phase='animation';this.local=0;return 'payload';}
  if(this.phase==='animation'&&this.local>=2){this.local=0;this.index++;if(this.index<3){this.phase='waiting';return 'wait';}if(this.index===3){this.phase='payload-gap';return 'payload-gap';}this.phase='complete';return 'complete';}
  return null;
 }
}

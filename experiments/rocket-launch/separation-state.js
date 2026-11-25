export const SEPARATION_ASCENT_DURATION=5;
export const SEPARATION_CHASE_DURATION=2;

/** Teaching gates and clip-local time are deliberately independent of the old 14 s film. */
export class SeparationLesson {
 constructor({guided=false}={}){this.guided=guided;this.reset();}
 reset(){this.phase='ready';this.index=0;this.local=0;this.elapsed=0;this.paused=false;}
 start(){this.reset();this.phase='ascent';}
 trigger(){if(this.phase!=='waiting'||this.paused)return false;this.phase='animation';this.local=0;return true;}
 get running(){return !this.paused&&['ascent','chase','animation','booster-drop','debris-exit','payload-gap'].includes(this.phase);}
 advance(dt,shotComplete){
  if(!this.running)return null;this.local+=dt;this.elapsed+=dt;
  if(this.phase==='ascent'&&(shotComplete??(this.local>=SEPARATION_ASCENT_DURATION))){
   this.local=0;
   this.phase=this.guided?'chase':'waiting';
   return this.guided?'chase':'wait';
  }
  if(this.phase==='chase'&&this.local>=SEPARATION_CHASE_DURATION){this.phase='waiting';this.local=0;return 'wait';}
  if(this.phase==='payload-gap'&&this.local>=.6){this.phase='animation';this.local=0;return 'payload';}
  if(this.phase==='animation'&&this.local>=2&&this.guided){
   this.phase=this.index===0?'booster-drop':'debris-exit';
   this.local=0;
   return this.phase;
  }
  if((this.phase==='booster-drop'||this.phase==='debris-exit')&&shotComplete){
   this.local=0;
   this.index++;
   this.phase=this.index===4?'complete':'waiting';
   return this.phase==='complete'?'complete':'wait';
  }
  if(this.phase==='animation'&&this.local>=2){this.local=0;this.index++;if(this.index<3||(this.index===3&&this.guided)){this.phase='waiting';return 'wait';}if(this.index===3){this.phase='payload-gap';return 'payload-gap';}this.phase='complete';return 'complete';}
  return null;
 }
}

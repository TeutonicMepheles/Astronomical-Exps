/* Offline, gesture-safe assembly completion feedback. Visual feedback remains
   available when Web Audio is blocked or unsupported. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory');
 let audio=null,lastPlayed=-Infinity,lastAttempted=false;
 function unlock(){
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(Audio&&!audio)audio=new Audio();
   if(audio?.state==='suspended')audio.resume().catch(()=>{});
  }catch{/* The visual feedback is the fallback. */}
 }
 function tone(){
  if(audio?.state!=='running')return false;
  const now=audio.currentTime,notes=[[523.25,0,.24],[659.25,.08,.28],[783.99,.16,.4]];
  for(const [frequency,delay,duration] of notes){
   const start=now+delay,oscillator=audio.createOscillator(),gain=audio.createGain();
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);
   gain.gain.setValueAtTime(0,start);
   gain.gain.linearRampToValueAtTime(.055,start+.018);
   gain.gain.exponentialRampToValueAtTime(.001,start+duration);
   oscillator.connect(gain);gain.connect(audio.destination);
   oscillator.start(start);oscillator.stop(start+duration);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  return true;
 }
 function play(){
  const now=performance.now();
  if(now-lastPlayed<700)return false;
  lastPlayed=now;lastAttempted=true;
  stage.dispatchEvent(new CustomEvent('newton-assembly-feedback',{detail:{audioAttempted:lastAttempted}}));
  unlock();
  if(audio?.state==='running')return tone();
  audio?.resume().then(tone).catch(()=>{});
  return false;
 }
 N.assemblyFeedback={unlock,play,getState(){return{audioSupported:Boolean(audio),audioState:audio?.state||'unavailable',lastAttempted};}};
 window.addEventListener('pointerdown',unlock,{passive:true});
 window.addEventListener('pagehide',()=>{audio?.close().catch(()=>{});audio=null;});
})(window.Newton);

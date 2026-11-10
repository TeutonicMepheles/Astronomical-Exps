// User-gesture-only, offline feedback; one short tone and one finite animation.
export function createNoonFeedback(stage) {
  let audio = null, lastPlayed = -Infinity;
  function unlock() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio && !audio) audio = new Audio();
      if (audio?.state === 'suspended') audio.resume().catch(()=>{});
    } catch { /* Visual confirmation remains available when audio is blocked. */ }
  }
  function play() {
    if (performance.now()-lastPlayed < 700) return;
    lastPlayed=performance.now();
    stage.dispatchEvent(new CustomEvent('noon-feedback'));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const el of stage.querySelectorAll('.geo-selected .geo-ring, #localSolarTime')) {
        el.getAnimations().forEach(animation=>animation.cancel());
        el.animate([{opacity:.55,scale:1},{opacity:1,scale:1.12},{opacity:1,scale:1}],{duration:520,easing:'ease-out'});
      }
    }
    if (audio?.state !== 'running') return;
    const tone=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
    tone.type='sine';tone.frequency.setValueAtTime(660,now);tone.frequency.setValueAtTime(880,now+.1);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.07,now+.015);gain.gain.exponentialRampToValueAtTime(.001,now+.3);
    tone.connect(gain);gain.connect(audio.destination);tone.start(now);tone.stop(now+.32);
    tone.onended=()=>{tone.disconnect();gain.disconnect();};
  }
  window.addEventListener('pagehide',()=>{audio?.close().catch(()=>{});audio=null;});
  return {unlock,play};
}

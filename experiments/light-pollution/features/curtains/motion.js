/* Deterministic curtain physics shared by the window renderer and light model. */
(function(){
 const hash=id=>{let value=2166136261;for(const ch of id)value=Math.imul(value^ch.charCodeAt(0),16777619)>>>0;return value/4294967296;};

 LightPollution.curtainTransmission=function(coverage,material='blackout'){
  const cloth=material==='blackout'?.02:.15;
  return 1-Math.max(0,Math.min(100,coverage))/100*(1-cloth);
 };

 LightPollution.curtainMotion=function(id,time,position=1,strength=25,speed=1){
  const amount=Math.max(0,Math.min(100,strength))/100;
  if(!amount)return 0;
  const seed=hash(id),phase=seed*Math.PI*2,t=time*Math.max(.5,Math.min(2,speed));
  const slow=Math.sin(t*(1.05+seed*.22)+phase);
  const detail=Math.sin(t*(2.15+seed*.34)+phase*1.73)*.34;
  const drift=Math.sin(t*.44+phase*.61)*.16;
  const hem=Math.sin(t*(3.1+seed*.48)+phase*.83+position*8.5)*Math.pow(position,3)*.42;
  return (slow+detail+drift+hem)*(8+seed*4)*Math.sqrt(amount);
 };
})();

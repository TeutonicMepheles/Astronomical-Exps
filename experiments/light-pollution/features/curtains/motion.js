 window.LightPollution.curtainMotion=function(id,t){let hash=2166136261;for(const ch of id)hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;const seed=hash/4294967296,cycle=10+seed*11,phase=(t+seed*71)%cycle;const envelope=phase<3.8?Math.sin(Math.PI*phase/3.8)**2:0;return envelope*(Math.sin(t*(1.3+seed)+seed*19)+.35*Math.sin(t*2.1+seed*37))*1.6;}
;

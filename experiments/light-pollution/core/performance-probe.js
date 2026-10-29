/* Opt-in local diagnostics: ?profile=1. No collection in ordinary runs. */
(() => {
 if(new URLSearchParams(location.search).get('profile')!=='1')return;
 const records=[],longs=[];let start=performance.now(),last=0;
 const output=document.createElement('output');output.id='performance-probe';output.style.cssText='position:fixed;left:8px;top:8px;z-index:99999;background:#001d;color:white;font:12px monospace;max-width:95vw;pointer-events:none';document.body.append(output);
 const observer=new PerformanceObserver(list=>longs.push(...list.getEntries().map(x=>x.duration)));observer.observe({type:'longtask'});
 LightPollution.profile={record(ms){const now=performance.now();records.push({ms,gap:last?now-last:0});last=now;},reset(){records.length=longs.length=0;start=performance.now();last=0;}};
 const timer=setInterval(()=>{const duration=(performance.now()-start)/1000,sorted=records.map(x=>x.ms).sort((a,b)=>a-b),gaps=records.map(x=>x.gap).filter(Boolean).sort((a,b)=>a-b);const at=(a,q)=>+(a[Math.min(a.length-1,Math.floor(a.length*q))]||0).toFixed(2);const result={seconds:+duration.toFixed(1),sceneFps:+(records.length/duration).toFixed(1),renderP95:at(sorted,.95),renderMax:at(sorted,1),gapP95:at(gaps,.95),gapMax:at(gaps,1),longTasks:longs.length,heap:performance.memory?.usedJSHeapSize,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight]};output.textContent=JSON.stringify(result);output.dataset.result=JSON.stringify(result);if(duration>20)LightPollution.profile.reset();},5000);
 LightPollution.disposers.push(()=>{clearInterval(timer);observer.disconnect();output.remove();});
})();

export function setMetricFeedback(metric,direction,animate){
  metric.classList.remove('is-changing','is-up','is-down');
  const arrow=metric.querySelector('.metric-delta');
  arrow.textContent=direction==='up'?'↑':direction==='down'?'↓':'';
  delete metric.dataset.direction;
  if(!animate||direction==='none')return;
  metric.dataset.direction=direction;
  // Restart the short cue even when cities are switched rapidly.
  void metric.offsetWidth;
  metric.classList.add('is-changing','is-'+direction);
}

// Shared by the hall and the parameter preview; driven by the owning page clock.
export function createPeriodMetric(metric,output){
  let value=null,target=null,animation=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function render(n){value=n;output.textContent=n.toFixed(2);output.dataset.value=String(n);}
  return {
    get active(){return !!animation;},
    set(next,animate=false){
      if(next===target)return;
      target=next;
      if(value===null||!animate||reduced.matches){animation=null;render(next);setMetricFeedback(metric,'none',false);metric.setAttribute('aria-busy','false');return;}
      animation={from:value,to:next,start:performance.now()};
      setMetricFeedback(metric,next>value?'up':'down',true);metric.setAttribute('aria-busy','true');
    },
    tick(now){
      if(!animation)return;
      const a=animation,t=reduced.matches?1:Math.min(1,(now-a.start)/560),e=t*t*(3-2*t);
      render(a.from+(a.to-a.from)*e);
      if(t===1)metric.setAttribute('aria-busy','false');
      if(reduced.matches||now-a.start>=1200){animation=null;setMetricFeedback(metric,'none',false);}
    },
    reset(next){target=null;this.set(next,false);},
  };
}

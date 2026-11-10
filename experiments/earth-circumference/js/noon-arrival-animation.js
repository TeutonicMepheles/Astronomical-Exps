// Ordered, finite feedback for the moment the selected site reaches local noon.
export function mountNoonArrivalAnimation(scene) {
  const stage = scene.stage;
  const phases = ['noon-arrival-tip', 'noon-arrival-lines', 'noon-arrival-point'];
  const timers = new Set();
  let active = false;

  function clearTimers() {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  }

  function reset() {
    clearTimers();
    active = false;
    stage.classList.remove(...phases);
    stage.removeAttribute('data-noon-arrival');
    stage.dispatchEvent(new CustomEvent('noon-arrival-state', { detail: { phase: 'idle' } }));
  }

  function schedule(delay, callback) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  }

  function start() {
    reset();
    if (!stage.classList.contains('at-local-noon')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stage.dataset.noonArrival = 'complete';
      stage.dispatchEvent(new CustomEvent('noon-arrival-state', { detail: { phase: 'complete' } }));
      return;
    }

    active = true;
    stage.dataset.noonArrival = 'tip';
    stage.classList.add('noon-arrival-tip');
    stage.dispatchEvent(new CustomEvent('noon-arrival-state', { detail: { phase: 'tip' } }));
    schedule(320, () => {
      if (!active || !stage.classList.contains('at-local-noon')) return reset();
      stage.classList.remove('noon-arrival-tip');
      stage.classList.add('noon-arrival-lines');
      stage.dataset.noonArrival = 'lines';
      stage.dispatchEvent(new CustomEvent('noon-arrival-state', { detail: { phase: 'lines' } }));
    });
    schedule(760, () => {
      if (!active || !stage.classList.contains('at-local-noon')) return reset();
      stage.classList.add('noon-arrival-point');
      stage.dataset.noonArrival = 'point';
      stage.dispatchEvent(new CustomEvent('noon-arrival-state', { detail: { phase: 'point' } }));
    });
    schedule(1280, () => {
      if (!active) return;
      reset();
      stage.dataset.noonArrival = 'complete';
      stage.dispatchEvent(new CustomEvent('noon-arrival-state', { detail: { phase: 'complete' } }));
    });
  }

  function syncWhileActive() {
    if (!stage.classList.contains('at-local-noon')) reset();
  }

  stage.addEventListener('noon-feedback', start);
  for (const event of ['globe-frame', 'globe-mode-change', 'view-mode-change']) {
    window.addEventListener(event, syncWhileActive);
  }
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    reset();
    stage.removeEventListener('noon-feedback', start);
    for (const name of ['globe-frame', 'globe-mode-change', 'view-mode-change']) {
      window.removeEventListener(name, syncWhileActive);
    }
  }, { once: true });
}

// Host adapter for the shared OperationTip. The experiment owns the noon gate.
export function mountNoonAlignmentHint(scene) {
  const OperationTip = window.ExperimentUI?.OperationTip;
  if (!OperationTip) return;

  const tip = new OperationTip(scene.stage, {
    top: '702px',
    className: 'noon-alignment-tip',
  });
  const alignmentMessage = '拖动时间轴，将当地时间调到正午 12:00，定位太阳参考点';
  const observationMessage = '点击观测点，开始测量';
  const events = ['globe-frame', 'globe-mode-change', 'view-mode-change'];

  function update() {
    const stage = scene.stage;
    const visible = stage.dataset.viewMode === 'earth'
      && stage.classList.contains('has-selection')
      && !scene.measuring
      && !scene.calculating;
    if (!visible) {
      tip.hide();
      return;
    }
    if (stage.classList.contains('awaiting-noon')) {
      tip.show(alignmentMessage);
      return;
    }
    if (stage.dataset.noonArrival === 'complete' && stage.classList.contains('at-local-noon')) {
      tip.show(observationMessage);
      return;
    }
    tip.hide();
  }

  for (const event of events) window.addEventListener(event, update);
  scene.stage.addEventListener('noon-arrival-state', update);
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    for (const name of events) window.removeEventListener(name, update);
    scene.stage.removeEventListener('noon-arrival-state', update);
    tip.destroy();
  }, { once: true });
  update();
}

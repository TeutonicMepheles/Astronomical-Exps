const MODES = new Set(['orbit', 'earth']);

export function mountViewMode(stage) {
  const tabs = [...stage.querySelectorAll('[data-view-mode-button]')];
  if (!tabs.length) return;

  function select(mode, moveFocus = false) {
    const next = MODES.has(mode) ? mode : 'orbit';
    stage.dataset.viewMode = next;
    for (const tab of tabs) {
      const selected = tab.dataset.viewModeButton === next;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    }
    window.dispatchEvent(new CustomEvent('view-mode-change', { detail: { mode: next } }));
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab.dataset.viewModeButton));
    tab.addEventListener('keydown', (event) => {
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
      if (direction) {
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        select(next.dataset.viewModeButton, true);
        event.preventDefault();
      } else if (event.key === 'Home' || event.key === 'End') {
        const next = event.key === 'Home' ? tabs[0] : tabs.at(-1);
        select(next.dataset.viewModeButton, true);
        event.preventDefault();
      }
    });
  });
  window.addEventListener('view-mode-request', (event) => {
    if (MODES.has(event.detail?.mode)) select(event.detail.mode, true);
  });

  const initial = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true')?.dataset.viewModeButton;
  select(initial || stage.dataset.viewMode || 'orbit');
}

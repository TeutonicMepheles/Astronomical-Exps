const COLLAPSED_SPACE = '56px';

export function mountTuneCollapse(panel, { spaceVar, storageKey, label }) {
  const button = panel.querySelector('.tune-collapse');
  if (!button) return;
  const root = document.documentElement;
  const openSpace = getComputedStyle(root).getPropertyValue(spaceVar).trim() || '320px';
  let collapsed = false;
  try { collapsed = localStorage.getItem(storageKey) === '1'; } catch {}

  function apply(next) {
    collapsed = next;
    panel.classList.toggle('is-collapsed', collapsed);
    root.style.setProperty(spaceVar, collapsed ? COLLAPSED_SPACE : openSpace);
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? `展开${label}` : `收起${label}`);
  }

  button.addEventListener('click', () => {
    apply(!collapsed);
    try { localStorage.setItem(storageKey, collapsed ? '1' : '0'); } catch {}
    window.dispatchEvent(new Event('resize'));
  });
  apply(collapsed);
}

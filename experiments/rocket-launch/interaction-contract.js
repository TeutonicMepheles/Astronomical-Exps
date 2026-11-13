/**
 * A group has one interaction purpose. Labels describe the purpose, not its appearance.
 * @typedef {'action'|'choice'|'toggle'|'parameters'|'utility'} ControlKind
 * @typedef {{label:string, kind:ControlKind}} ControlGroup
 */
/** @param {HTMLElement} parent @param {ControlGroup} spec */
export function createControlGroup(parent, {label,kind}) {
  if (!label || !['action','choice','toggle','parameters','utility'].includes(kind)) {
    throw new TypeError('A control group needs a purpose and a supported kind');
  }
  const group=document.createElement('div');
  group.className='control-cluster';
  group.dataset.controlKind=kind;
  group.setAttribute('role','group');
  group.setAttribute('aria-label',label);
  parent.append(group);
  return group;
}
/** @param {HTMLButtonElement} button @param {boolean} selected */
export function markChoice(button,selected) {
  button.dataset.controlKind='choice';
  button.setAttribute('aria-label',button.textContent);
  button.setAttribute('aria-pressed',String(selected));
  button.classList.toggle('active',selected);
}
/** @param {HTMLButtonElement} button @param {boolean} checked */
export function markSwitch(button,checked) {
  button.dataset.controlKind='toggle';
  button.setAttribute('role','switch');
  button.setAttribute('aria-checked',String(checked));
  button.classList.toggle('active',checked);
}
/** Static semantics only: meaningful grouping and visual reading order still need review. */
export function auditControls(root) {
  const errors=[];
  for(const group of root.querySelectorAll('.control-cluster')) {
    const kind=group.dataset.controlKind;
    if(!kind||!group.getAttribute('aria-label')) errors.push('Group lacks declared purpose');
    for(const button of group.querySelectorAll(':scope > button')) {
      const actual=button.dataset.controlKind||'action';
      if(kind==='parameters'||(kind!=='utility'&&actual!==kind)) errors.push(`Mixed controls: ${group.getAttribute('aria-label')}`);
      if(actual==='choice'&&!['true','false'].includes(button.getAttribute('aria-pressed'))) errors.push('Choice lacks selection state');
      if(actual==='toggle'&&(button.getAttribute('role')!=='switch'||!['true','false'].includes(button.getAttribute('aria-checked')))) errors.push('Toggle lacks checked state');
    }
  }
  return errors;
}

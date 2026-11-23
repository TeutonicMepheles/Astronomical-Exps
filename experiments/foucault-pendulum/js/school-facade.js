/** Teaching-block elevation for the existing 3 m per-storey comparison. */
export function schoolFacade(floors, span) {
  const ground = span;
  const height = span / floors;
  const level = y => y.toFixed(2);
  const stories = Array.from({length: floors}, (_, i) => {
    const bottom = ground - i * height;
    const y = bottom - height;
    const sill = y + height * .65;
    const head = y + height * .22;
    const windowHeight = sill - head;
    const doorHeight = bottom - head - 1;
    const bays = [86, 143, 200].map(x => {
      const opening = i === 0
        ? '<rect x="' + (x + 11) + '" y="' + level(head) + '" width="24" height="' + level(doorHeight) + '" rx=".65"/><path d="M' + (x + 23) + ' ' + level(head) + 'V' + level(bottom - 1) + '"/>'
        : '<rect x="' + x + '" y="' + level(head) + '" width="29" height="' + level(windowHeight) + '" rx=".55"/><path d="M' + (x + 14.5) + ' ' + level(head) + 'V' + level(sill) + 'M' + (x + 36) + ' ' + level(bottom - 1) + 'V' + level(head) + 'h10V' + level(bottom - 1) + '"/>';
      return opening;
    }).join('');
    const stairs = 'M260 ' + level(bottom - height * .18) + 'h6l17 -' + level(height * .61) + 'h7';
    return '<g data-storey="' + (i + 1) + '">' +
      '<path stroke="#eef6ff" stroke-width="1.6" d="M68 ' + level(y) + 'H300"/>' +
      '<g>' + bays + '<path d="' + stairs + '"/></g>' +
      '</g>';
  }).join('');
  const entranceTop = ground - height * .63;
  return `
    <g fill="none" stroke-linejoin="round" stroke-linecap="round">
      <path fill="#1b3550" d="M71 0H297V${ground}H71Z"/>
      <path fill="#254260" d="M250 0H297V${ground}H250Z"/>
      <g stroke="#d4e6fb" stroke-width=".85">${stories}</g>
      <path stroke="#eef6ff" stroke-width="1.6" d="M71 ${ground}V0H297V${ground}M250 0V${ground}M64 -4H304M69 -4V0M299 -4V0"/>
      <path stroke="#eef6ff" stroke-width="1.1" d="M141 ${entranceTop}H191M146 ${entranceTop}V${ground}M186 ${entranceTop}V${ground}M138 ${ground+4}H194"/>
      <path stroke="#7c97b1" d="M45 ${ground}H354"/>
    </g>`;
}

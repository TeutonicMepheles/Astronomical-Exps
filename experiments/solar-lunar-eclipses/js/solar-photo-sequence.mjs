const FRAME_SIZE = 352;
const sequences = new Map();

export function solarPhotoFrame(kind, phi, contacts, observed, onReady) {
  if (!['total', 'annular', 'partial'].includes(kind) ||
      contacts.length !== 5 || observed.altitude <= 0) return null;

  const partial = contacts[1].kind === 'teaching';
  if (!partial && !['食既', '环食始'].includes(contacts[1].name)) return null;
  const source = partial ? 'partial' : kind;
  let image = sequences.get(source);
  if (!image) {
    image = new Image();
    image.onload = onReady;
    image.src = new URL('../assets/solar-sequences/' + source + '.webp', import.meta.url).href;
    sequences.set(source, image);
  }
  if (!image.complete || !image.naturalWidth) return null;

  const [first, begin, maximum, end, last] = contacts.map(contact => contact.phi);
  let index;
  if (partial) {
    // The photo sequence is ordered left to right, top row then bottom row.
    if (phi <= first) index = 0;
    else if (phi >= last - 1e-7) index = 25;
    else if (phi <= maximum) index = Math.round(13 * (phi - first) / (maximum - first));
    else index = 13 + Math.round(12 * (phi - maximum) / (last - maximum));
  } else if (phi <= first) index = 0;
  else if (phi >= last) index = 10;
  else if (Math.abs(phi - begin) < 1e-7) index = 4;
  else if (Math.abs(phi - end) < 1e-7) index = 6;
  else if (phi > begin && phi < end) index = 5;
  else if (phi < begin) index = Math.min(4, Math.floor(5 * (phi - first) / (begin - first)));
  else index = Math.max(6, 10 - Math.floor(5 * (last - phi) / (last - end)));
  const columns = partial ? 13 : 11;
  return { image, index, size: FRAME_SIZE, column: index % columns, row: Math.floor(index / columns) };
}

"""Keep original generated files; crop only known reference padding for review."""
import json
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

HERE = Path(__file__).resolve().parent
manifest = json.loads((HERE/'manifest.json').read_text(encoding='utf-8'))
output = HERE/'panorama'
output.mkdir(exist_ok=True)
sheet = Image.new('RGB', (1500, 4*225), '#e3e7ee')
draw = ImageDraw.Draw(sheet)
results = []
for i, layer in enumerate(manifest['layers']):
    raw_folder = HERE/'raw'/layer['id']
    if layer['id'] == '12-water-reflections' and (HERE/'raw'/'12-water-reflections-r2').exists():
        raw_folder = HERE/'raw'/'12-water-reflections-r2'
    candidates = sorted(raw_folder.glob('*'))
    candidates = [p for p in candidates if p.suffix.lower() in ('.png','.jpg','.jpeg','.webp')]
    if not candidates:
        continue
    source = candidates[0]
    im = Image.open(source).convert('RGB')
    w,h = im.size
    box = (round(w*6/2184), round(h*106/936), round(w*2177/2184), round(h*830/936))
    crop = im.crop(box).resize((2172,724), Image.Resampling.LANCZOS)
    # Normalize only near-neutral white connected to the outer canvas.
    # Preserve enclosed material highlights and all original generated files.
    pixels = np.asarray(crop)
    near_white = (pixels.min(axis=2) >= 230) & (pixels.max(axis=2)-pixels.min(axis=2) <= 20)
    flood = Image.fromarray((near_white.astype('uint8')*255)).copy()
    for point in [(x,y) for x in (0,2171) for y in range(724)]+[(x,y) for y in (0,723) for x in range(2172)]:
        if flood.getpixel(point) == 255:
            ImageDraw.floodfill(flood, point, 128)
    white_mask = flood.point(lambda value: 255 if value == 128 else 0)
    crop.paste((255,255,255), (0,0), white_mask)
    crop.save(output/(layer['id']+'.png'))
    preview = crop.resize((490,163), Image.Resampling.LANCZOS)
    x,y = (i%3)*500, (i//3)*225
    sheet.paste(preview,(x+5,y+35))
    draw.text((x+8,y+10), layer['id'], fill='#152038')
    corners = [im.getpixel(p) for p in ((0,0),(w-1,0),(0,h-1),(w-1,h-1))]
    results.append({'id':layer['id'],'raw':str(source.relative_to(HERE)), 'raw_size':[w,h],
                    'crop_box':box, 'output_size':[2172,724], 'raw_corner_rgb':corners,
                    'white_background_normalized':True})
sheet.save(HERE/'contact-sheet.jpg',quality=94)
(HERE/'review-metadata.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))

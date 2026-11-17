"""Preview-only animation packaging; does not modify the experiment UI."""
from pathlib import Path
import math
from PIL import Image

out = Path(__file__).parent
background = Image.open(r'C:\Users\student\AppData\Local\Temp\pasted-image-24627.png').convert('RGBA')
sprite = Image.open(r'C:\Users\student\.codex\generated_images\01a1e96f-ade0-74d2-bc03-72eaea09c969\exec-1ffb9825-f80b-4091-a459-a04fd2a7b2dc.png').convert('RGBA')
# Keep the supplied ring and background fixed. Only animate the generated light.
background = background.resize((background.width * 2, background.height * 2), Image.Resampling.LANCZOS)
frames = []
for index in range(90):
    t = index / 25
    pulse = math.sin(math.pi * (t - 1) / 1.2) ** 2 if 1 < t < 2.2 else 0
    size = round(90 + 30 * pulse)
    light = sprite.resize((size, size), Image.Resampling.LANCZOS)
    alpha = light.getchannel('A').point(lambda value: round(value * (.48 + .52 * pulse)))
    light.putalpha(alpha)
    frame = background.copy()
    frame.alpha_composite(light, (144 - size // 2, 144 - size // 2))
    frames.append(frame.convert('RGB'))
palette = frames[40].quantize(colors=256)
indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
indexed[0].save(out / 'natural-star-preview.gif', save_all=True, append_images=indexed[1:], duration=40, loop=0, disposal=2)
frames[0].save(out / 'star-idle.png')
frames[40].save(out / 'star-peak.png')
print(out / 'natural-star-preview.gif')

"""Current production invariants; generated screenshots live under artifacts/."""
from pathlib import Path
import hashlib
import json
from PIL import Image
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.parents[2] / 'artifacts/city-night-current'
OUT.mkdir(parents=True, exist_ok=True)
lock = json.loads((ROOT / 'tests/asset-lock.json').read_text(encoding='utf-8'))
for name, digest in lock.items():
    assert hashlib.sha256((ROOT / 'assets' / (name + '.png')).read_bytes()).hexdigest() == digest, name
base = np.asarray(Image.open(ROOT / 'assets/resident-fixed-base.png'))
recv = np.asarray(Image.open(ROOT / 'assets/resident-fixed-receivers.png'))
response = np.asarray(Image.open(ROOT / 'assets/resident-window-response.png'))
alpha = base[:, :, 3]
assert max(alpha[0].max(), alpha[-1].max(), alpha[:, 0].max(), alpha[:, -1].max()) == 0
strip = alpha[1200:1600, 2195:].astype(int)
assert np.all(np.diff(strip, axis=1) <= 0)
assert np.max(-np.diff(strip, axis=1)) <= 3
assert response[:, :, 3].min() == 255
rgb = response[:, :, :3]
assert max(rgb[0].max(), rgb[-1].max(), rgb[:, 0].max(), rgb[:, -1].max()) == 0
full = np.zeros((1664, 2496, 3), np.uint8)
full[150:1280, 200:1900] = rgb
assert alpha[full.max(axis=2) > 0].min() == 255
assert full[recv[:, :, 3] > 230].max() == 0, 'No window light in core shadow'
ground = (recv[:, :, 2] > 250) & (recv[:, :, 0] == 0) & (recv[:, :, 1] == 0)
assert full[ground].max() == 0, 'No window light on ground'
# Native-to-scene pixel-centre mapping, plus one-pixel bilinear sampling guard.
scale = .2565
matrix = np.float32([[scale, 0, 1946+(scale-1)/2], [0, scale, 956+(scale-1)/2]])
projected = cv2.warpAffine(full.max(axis=2), matrix, (2736, 1536))
allowed = cv2.dilate(np.uint8(projected > 0), np.ones((3, 3), np.uint8)) > 0
before = np.asarray(Image.open(OUT / 'window-response-0.png').convert('RGB'))
after = np.asarray(Image.open(OUT / 'window-response-2.png').convert('RGB'))
changed = np.any(before != after, axis=2)
assert not np.any(changed & ~allowed), 'Light escaped window/frame response footprint'
report = dict(passed=True, immutableAssetsExact=True, zeroImageBorders=True,
              coreShadowUnchanged=True, groundUnchanged=True,
              changedPixelsOutsideChannel=int((changed & ~allowed).sum()))
(OUT / 'asset-validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(report)

"""Independent check: annotated recognition elevation retains installed model proportions."""
from pathlib import Path
import json,math
R=Path(__file__).resolve().parents[1];A=R/'assets/cz7-kiu-20261116';D=R/'assets/blueprint-flat'
layout=json.loads((A/'internal-drafting-layout.json').read_text());audit=json.loads((A/'internal-layout-audit.json').read_text());hotspots=json.loads((D/'hotspots.json').read_text(encoding='utf-8'));fills=json.loads((D/'fill-contours.json').read_text());scale=-layout['slope']
for stage in audit['stages']:
 for suffix,bounds in [('FuelTank',stage['fuelBounds']),('LOXTank',stage['LOXBounds'])]:
  name=stage['stage']+suffix;part=layout['parts'][name];rect=next(r['rect'] for r in hotspots['recognition'] if r['node']==name)
  assert all(math.isfinite(v) for v in rect)
  assert abs(part['worldBottom']-bounds['bottom'])<1e-5 and abs(part['worldTop']-bounds['top'])<1e-5
  assert abs(rect[2]-scale*(bounds['top']-bounds['bottom']))<.002,name
  assert fills['paths']['recognition:'+name]!=fills['paths']['assembly:'+name],name
  assert max(abs(a-b) for a,b in zip(rect,part['rect']))<.001
assert all('NaN' not in p and 'Infinity' not in p for p in fills['paths'].values())
print('PASS one-scale assembled tank elevation, current GLB lengths/positions, matching hit regions and phase-specific fills')

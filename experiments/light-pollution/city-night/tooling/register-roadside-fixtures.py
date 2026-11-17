"""Rebuild roadside registration and perspective together using their single owning normalizer."""
from pathlib import Path
import subprocess,sys
ROOT=Path(__file__).resolve().parent.parent
subprocess.run([sys.executable,str(ROOT/'tooling/normalize-fixture-scale.py')],check=True)
print('Registered road-edge constraints applied; independent curved/sidewalk anchors retained')

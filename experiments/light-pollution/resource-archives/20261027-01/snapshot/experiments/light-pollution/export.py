"""Compatibility wrapper; canonical exporter lives in tools/."""
from pathlib import Path
import subprocess,sys
subprocess.run([sys.executable,str(Path(__file__).resolve().parents[2]/'tools/export.py'),'light-pollution'],check=True)

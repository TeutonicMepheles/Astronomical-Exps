"""Rebuild the repository's double-clickable Newton delivery from its sources."""
from pathlib import Path
import shutil
import subprocess
import sys

experiment = Path(__file__).resolve().parent
repository = experiment.parents[1]
subprocess.run([sys.executable, str(repository / 'tools/export.py'), 'newton-telescope'],
               cwd=repository, check=True)
target = experiment / 'standalone.html'
shutil.copyfile(repository / 'dist/newton-telescope/index.html', target)
print(f'Delivery: {target} ({target.stat().st_size / 1048576:.2f} MiB)')

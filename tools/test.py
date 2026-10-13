from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
tests=['optics.test.cjs','mirror-optics.test.cjs','course.test.cjs','course-completion.test.cjs']
for name in tests:
    subprocess.run(['node',str(root/'experiments/newton-telescope/tests'/name)],cwd=root,check=True)
print('PASS existing calculation and course unit tests; browser checks are separate.')

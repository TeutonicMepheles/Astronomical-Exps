from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]

subprocess.run([sys.executable, '-X', 'utf8', '-m', 'unittest', 'discover', '-s', 'tools/tests', '-p', 'test_*.py'],cwd=root,check=True)
tests=['optics.test.cjs','mirror-optics.test.cjs','course.test.cjs','course-completion.test.cjs']
for name in tests:
    subprocess.run(['node',str(root/'experiments/newton-telescope/tests'/name)],cwd=root,check=True)
print('PASS existing calculation and course unit tests; browser checks are separate.')

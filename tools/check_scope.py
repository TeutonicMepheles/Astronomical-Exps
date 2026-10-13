"""Review changed paths including staged, unstaged and untracked files."""
import argparse,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--experiment');p.add_argument('--branch');a=p.parse_args()
if a.branch and a.branch.startswith('experiment/'):
    import re
    match=re.fullmatch(r'experiment/([a-z0-9-]+)/[a-z0-9_/-]+',a.branch)
    if not match:sys.exit('Invalid experiment branch name')
    a.experiment=match[1]
root=Path(__file__).resolve().parents[1]
def git(*args):return subprocess.check_output(['git',*args],cwd=root).decode('utf-8').split('\0')
# Merge base avoids reporting unrelated updates already on main.
names=set(git('diff','--no-renames','--name-only','-z',a.base+'...HEAD'))|set(git('diff','--no-renames','--name-only','-z','HEAD'))|set(git('ls-files','--others','--exclude-standard','-z'))
names.discard('')
experiments={x.split('/')[1] for x in names if x.startswith('experiments/')}
if a.experiment:
    invalid=sorted(x for x in names if not x.startswith('experiments/'+a.experiment+'/'))
    for x in invalid:print('OUT OF SCOPE:',x)
    print('PASS experiment scope' if not invalid else 'Maintainer action required; do not discard these files.')
    sys.exit(bool(invalid))
print('Changed experiment directories:',', '.join(sorted(experiments)) or '(none)')
protected=sorted(x for x in names if not x.startswith('experiments/'))
for x in protected:print('MAINTAINER REVIEW:',x)
if len(experiments)>1:print('MAINTAINER REVIEW: multiple experiments changed')
print('Report only: authorization must be checked by a reviewer. Use --experiment for strict enforcement.')

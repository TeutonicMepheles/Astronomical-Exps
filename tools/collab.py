"""Student collaboration commands; never reset, stash, rebase, force push or merge PRs."""
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys


class Stop(RuntimeError):
    pass


class Collaboration:
    def __init__(self, root):
        self.root = Path(root).resolve()
        if Path(self.git('rev-parse', '--show-toplevel')).resolve() != self.root:
            raise Stop('脚本位置与 Git 根目录不一致，请回到正确的项目副本。')
        self.settings = json.loads((self.root / 'docs/collaboration/pages.json').read_text(encoding='utf-8-sig'))
        self.state = Path(self.git('rev-parse', '--path-format=absolute', '--git-path', 'student-collab'))

    def run(self, *args, capture=True):
        result = subprocess.run(list(args), cwd=self.root, text=True, encoding='utf-8',
                                stdout=subprocess.PIPE if capture else None,
                                stderr=subprocess.PIPE if capture else None)
        if result.returncode:
            raise Stop(f'命令失败：{args[0]} {args[1] if len(args) > 1 else ""}\n'
                       + (result.stdout or '') + (result.stderr or '') + '\n已停止；已有文件和冲突现场保留。')
        return (result.stdout or '').rstrip('\r\n')

    def git(self, *args):
        return self.run('git', *args)

    def read(self, name):
        path = self.state / name
        if not path.exists():
            raise Stop('缺少本地记录，请先 start；提交验收前先 check。')
        return json.loads(path.read_text(encoding='utf-8'))

    def write(self, name, value):
        self.state.mkdir(parents=True, exist_ok=True)
        (self.state / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

    def clean(self):
        if self.git('status', '--porcelain'):
            raise Stop('有未提交或未跟踪文件，请先保存进度；不会自动丢弃或 stash。')

    def remote(self):
        repo = self.settings['repository'].lower()
        allowed = {f'https://github.com/{repo}', f'https://github.com/{repo}.git',
                   f'git@github.com:{repo}.git', f'ssh://git@github.com/{repo}.git'}
        for args in [('remote', 'get-url', '--all', 'origin'),
                     ('remote', 'get-url', '--push', '--all', 'origin')]:
            urls = self.git(*args).splitlines()
            if len(urls) != 1 or urls[0].lower() not in allowed:
                raise Stop('origin 拉取或推送地址与登记仓库不一致，请维护者检查。')

    def identity(self):
        return self.run('gh', 'api', '--hostname', 'github.com', 'user', '--jq', '.login').lower()

    def page(self, experiment):
        page = self.settings['pages'].get(experiment)
        if not page:
            raise Stop('网页尚未加入项目目录，请维护者准备正式实验入口。')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', experiment):
            raise Stop('实验目录名无效。')
        for name in ['index.html', 'AGENTS.md']:
            if not (self.root / 'experiments' / experiment / name).is_file():
                raise Stop('正式实验目录尚未准备好，请维护者建立入口和 AGENTS.md。')
        return page

    def branch(self):
        return self.git('symbolic-ref', '--quiet', '--short', 'HEAD')

    def guard(self):
        self.remote()
        context = self.read('context.json')
        experiment = context['experiment']
        self.page(experiment)
        branch = self.branch()
        if branch != context['branch'] or not re.fullmatch(
                rf'experiment/{re.escape(experiment)}/[a-z0-9][a-z0-9-]*', branch):
            raise Stop('当前分支与登记网页不匹配。请回到原分支；不要覆盖已有工作。')
        values = dict(line.split('=', 1) for line in self.git('config', '--list').splitlines() if '=' in line)
        if values.get('remote.origin.mirror', 'false').lower() in ['true', 'yes', 'on', '1']:
            raise Stop('origin 配置为镜像推送，请维护者处理。')
        if values.get(f'branch.{branch}.remote', 'origin') != 'origin' or values.get(
                f'branch.{branch}.merge', f'refs/heads/{branch}') != f'refs/heads/{branch}':
            raise Stop('分支跟踪目标错误，不能向 main 或其他任务分支推送。')
        if self.git('diff', '--name-only', '--diff-filter=U'):
            raise Stop('存在未解决冲突，请保留现场并联系维护者。')
        for marker in ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply']:
            if Path(self.git('rev-parse', '--path-format=absolute', '--git-path', marker)).exists():
                raise Stop('有未结束的 Git 操作，请先处理现场。')
        names = set()
        for args in [('diff', '--no-renames', '--name-only', '-z', 'origin/main...HEAD'),
                     ('diff', '--no-renames', '--name-only', '-z', 'HEAD'),
                     ('diff', '--cached', '--no-renames', '--name-only', '-z'),
                     ('ls-files', '--others', '--exclude-standard', '-z')]:
            names.update(filter(None, self.git(*args).split('\0')))
        invalid = sorted(name for name in names if not name.startswith(f'experiments/{experiment}/'))
        if invalid:
            raise Stop('存在范围外改动，保留文件并联系维护者：\n' + '\n'.join(invalid))
        self.git('diff', '--check')
        self.git('diff', '--cached', '--check')
        return context

    def fetch(self):
        self.remote()
        self.git('fetch', 'origin')

    def start(self, experiment, task):
        self.clean()
        self.remote()
        owner = self.identity()
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', task):
            raise Stop('任务名仅使用小写字母、数字和连字符。')
        self.fetch()
        self.page(experiment)
        branch = f'experiment/{experiment}/{task}'
        refs = self.git('for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes/origin').splitlines()
        if f'refs/heads/{branch}' in refs or f'refs/remotes/origin/{branch}' in refs:
            raise Stop('分支已存在。请继续原工作区，不会自动覆盖、认领或复用已交付分支。')
        if self.prs({'branch': branch}):
            raise Stop('此任务名已有 PR 记录，请继续原任务或选择新的任务名。')
        if 'refs/heads/main' in refs:
            ahead, _ = map(int, self.git('rev-list', '--left-right', '--count', 'main...origin/main').split())
            if ahead:
                raise Stop('本地 main 有独立提交，请维护者处理。')
        if self.branch() == 'main':
            self.git('merge', '--ff-only', 'origin/main')
        self.git('switch', '--no-track', '-c', branch, 'origin/main')
        self.write('context.json', {'owner': owner, 'experiment': experiment, 'branch': branch})
        print(f'已开始：{branch}；只修改 experiments/{experiment}/。')

    def resume(self, experiment, task):
        self.remote()
        owner = self.identity()
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', task):
            raise Stop('任务名仅使用小写字母、数字和连字符。')
        self.fetch()
        self.page(experiment)
        context = {'owner': owner, 'experiment': experiment, 'branch': f'experiment/{experiment}/{task}'}
        if any(pr['state'] != 'OPEN' for pr in self.prs(context)):
            raise Stop('分支已有关闭或合并的 PR，请开始新任务。')
        branch = context['branch']
        if self.branch() != branch:
            self.clean()
            refs = self.git('for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes/origin').splitlines()
            if f'refs/heads/{branch}' in refs:
                self.git('switch', branch)
            elif f'refs/remotes/origin/{branch}' in refs:
                self.git('switch', '--track', '-c', branch, f'origin/{branch}')
            else:
                raise Stop('找不到已有分支，请使用 start 开始。')
        self.write('context.json', context)
        self.guard()
        print('已回到原网页分支；已有改动保留。')

    def save(self, summary, completed, issues):
        context = self.guard()
        if not self.git('status', '--porcelain'):
            print('没有需要保存的新改动。')
            return
        if not summary.strip() or '\n' in summary or '\r' in summary:
            raise Stop('摘要须为一行非空文字。')
        message = self.render('docs/collaboration/commit-template.txt', context, completed, issues, summary=summary)
        self.state.mkdir(parents=True, exist_ok=True)
        path = self.state / 'commit-message.txt'
        path.write_text(message, encoding='utf-8')
        self.git('add', '--', f'experiments/{context["experiment"]}/')
        self.git('diff', '--cached', '--check')
        self.run('git', 'diff', '--cached', '--stat', capture=False)
        self.git('commit', '-F', str(path))
        print('已保存到本地，尚未上传。')

    def prs(self, context):
        results = json.loads(self.run('gh', 'pr', 'list', '--repo', self.repo_url(),
                                      '--head', context['branch'], '--state', 'all',
                                      '--json', 'number,state,url,baseRefName,isCrossRepository', '--limit', '100'))
        return [pr for pr in results if not pr['isCrossRepository']]

    def repo_url(self):
        return 'https://github.com/' + self.settings['repository']

    def live_context(self):
        context = self.guard()
        # The current login is delivery metadata, not a pre-registered permission list.
        context['owner'] = self.identity()
        prs = self.prs(context)
        if any(pr['state'] != 'OPEN' for pr in prs):
            raise Stop('该分支已有关闭或合并的 PR。请由维护者处理或开始新的任务分支。')
        if any(pr['baseRefName'] != 'main' for pr in prs):
            raise Stop('已有 PR 的目标不是 main，请维护者检查。')
        return context, prs

    def backup(self):
        self.live_context()
        self.clean()
        self.fetch()
        context = self.guard()
        self.git('push', '--no-force', '--no-follow-tags', '-u', 'origin', f'HEAD:refs/heads/{context["branch"]}')
        print('已备份当前任务分支。备份不代表提交验收或合并。')

    def sync(self):
        self.guard()
        self.clean()
        self.fetch()
        context = self.guard()
        message = self.render('docs/collaboration/commit-template.txt', context,
                              ['合入 origin/main'], '待检查', summary='同步公共更新')
        self.git('merge', '--no-edit', '-m', message, 'origin/main')
        self.guard()
        print('已同步公共更新，请重新检查及试玩。')

    def snapshot(self):
        return {'head': self.git('rev-parse', 'HEAD'), 'base': self.git('rev-parse', 'origin/main'),
                'branch': self.branch()}

    def check(self):
        context = self.guard()
        self.clean()
        self.fetch()
        self.guard()
        if self.git('rev-list', '--count', 'HEAD..origin/main') != '0':
            raise Stop('请先 sync 合入最新 main，再检查。')
        snapshot = self.snapshot()
        self.write('checks.json', {'passed': False})
        npm = shutil.which('npm.cmd' if sys.platform == 'win32' else 'npm')
        if not npm:
            raise Stop('请先安装 Node.js 22+。')
        for args in [('run', 'check'), ('test',), ('run', 'test:browser'),
                     ('run', 'export', '--', context['experiment'])]:
            self.run(npm, *args, capture=False)
        self.clean()
        if snapshot != self.snapshot():
            raise Stop('检查期间分支或提交变化，请重新检查。')
        self.write('checks.json', {'passed': True, **snapshot})
        print('自动检查及导出通过。还需学生整页试玩和打开离线导出；未宣称人工验收通过。')

    def render(self, template, context, completed, issues, **extra):
        if not completed or not all(x.strip() for x in completed) or not issues.strip():
            raise Stop('请填写完成内容及已知问题；未检查请写“待检查”。')
        values = {'page': self.settings['pages'][context['experiment']]['name'],
                  'entry': f'experiments/{context["experiment"]}/index.html',
                  'completed': '\n'.join('- ' + x for x in completed), 'issues': '- ' + issues,
                  **context, **extra}
        return (self.root / template).read_text(encoding='utf-8').format(**values)

    def submit(self, completed, issues, playtested):
        if not playtested:
            raise Stop('仅在学生明确确认整页试玩及离线打开通过后，使用 --playtested。')
        context, prs = self.live_context()
        self.clean()
        self.fetch()
        self.guard()
        snapshot = self.snapshot()
        receipt = self.read('checks.json')
        if not receipt.get('passed') or any(receipt.get(k) != v for k, v in snapshot.items()):
            raise Stop('检查记录缺失或已过期，请先同步并运行 check，再试玩。')
        if self.git('rev-list', '--count', 'origin/main..HEAD') == '0':
            raise Stop('没有可提交验收的改动。')
        body = self.render('docs/collaboration/pr-template.md', context, completed, issues,
                           head=snapshot['head'], base=snapshot['base'])
        path = self.state / 'pr-body.md'
        path.write_text(body, encoding='utf-8')
        self.git('push', '--no-force', '--no-follow-tags', '-u', 'origin', f'HEAD:refs/heads/{context["branch"]}')
        title = '[整页验收] ' + self.settings['pages'][context['experiment']]['name']
        if prs:
            result = self.run('gh', 'pr', 'edit', str(prs[0]['number']), '--repo', self.repo_url(),
                              '--title', title, '--body-file', str(path))
        else:
            result = self.run('gh', 'pr', 'create', '--repo', self.repo_url(), '--base', 'main',
                              '--head', context['branch'], '--title', title, '--body-file', str(path))
        print(result or (prs[0]['url'] if prs else '请检查 GitHub PR 列表。'))
        print('已提交整页验收，等待维护者审核；未合并。')


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ['status', 'guard', 'backup', 'sync', 'check']:
        sub.add_parser(name)
    for command in ['start', 'resume']:
        start = sub.add_parser(command)
        start.add_argument('--experiment', required=True)
        start.add_argument('--task', default='initial-delivery')
    for command in ['save', 'submit']:
        p = sub.add_parser(command)
        p.add_argument('--completed', action='append', required=True)
        p.add_argument('--issues', required=True)
        if command == 'save':
            p.add_argument('--summary', required=True)
        else:
            p.add_argument('--playtested', action='store_true')
    args = parser.parse_args()
    try:
        app = Collaboration(Path(__file__).resolve().parents[1])
        if args.command == 'status':
            for cmd in [('rev-parse', '--show-toplevel'), ('status', '--short', '--branch'),
                        ('remote', '-v'), ('branch', '-vv')]:
                print(app.git(*cmd))
            print('本地绑定：', app.read('context.json') if (app.state / 'context.json').exists() else '尚未 start')
        else:
            values = vars(args).copy()
            values.pop('command')
            result = getattr(app, args.command)(**values)
            if args.command == 'guard':
                print('检查通过：', result)
    except (Stop, OSError, ValueError, KeyError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())

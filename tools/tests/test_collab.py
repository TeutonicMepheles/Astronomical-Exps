"""Exercise safety invariants with disposable real Git repositories; no GitHub writes."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from collab import Collaboration, Stop

SOURCE = Path(__file__).resolve().parents[2]


class CollaborationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'student'
        self.root.mkdir()
        self.remote = Path(self.temp.name) / 'remote.git'
        self.cmd('git', 'init', '-b', 'main')
        self.cmd('git', 'config', 'user.name', 'Student')
        self.cmd('git', 'config', 'user.email', 'student@example.invalid')
        self.cmd('git', 'config', 'commit.gpgsign', 'false')
        self.cmd('git', 'config', 'core.autocrlf', 'input')
        self.cmd('git', 'config', 'core.hooksPath', str(Path(self.temp.name) / 'no-hooks'))
        for name in ['commit-template.txt', 'pr-template.md', 'pages.json']:
            path = self.root / 'docs/collaboration' / name
            path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(SOURCE / 'docs/collaboration' / name, path)
        self.page = self.root / 'experiments/light-pollution'
        self.page.mkdir(parents=True)
        (self.page / 'index.html').write_text('initial\n', encoding='utf-8')
        (self.page / 'AGENTS.md').write_text('local rules\n', encoding='utf-8')
        (self.root / 'shared').mkdir()
        (self.root / 'shared/base.txt').write_text('base\n', encoding='utf-8')
        (self.root / 'tools').mkdir()
        shutil.copyfile(SOURCE / 'tools/check_scope.py', self.root / 'tools/check_scope.py')
        self.cmd('git', 'add', '.')
        self.cmd('git', 'commit', '-m', 'fixture')
        self.cmd('git', 'init', '--bare', str(self.remote))
        self.cmd('git', 'remote', 'add', 'origin', str(self.remote))
        self.cmd('git', 'push', '-u', 'origin', 'main')
        self.app = Collaboration(self.root)
        # Allow only this fixture's local transport; separately test the production URL guard.
        self.app.remote = lambda: None
        self.app.identity = lambda: 'student'
        self.app.prs = lambda context: []
        self.app.start('light-pollution', 'initial-delivery')

    def cmd(self, *args):
        return subprocess.check_output(args, cwd=self.root, text=True, encoding='utf-8', stderr=subprocess.PIPE).strip()

    def edit(self):
        (self.page / 'index.html').write_text('new behavior\n', encoding='utf-8')

    def save(self):
        self.edit()
        self.app.save('灯具开关', ['实现灯具开关'], '待检查')

    def test_save_template_is_local_only(self):
        self.save()
        message = self.cmd('git', 'log', '-1', '--format=%B')
        self.assertIn('光污染：灯具开关', message)
        self.assertIn('完成内容：\n- 实现灯具开关', message)
        self.assertIn('已知问题：\n- 待检查', message)
        self.assertEqual('', self.cmd('git', 'status', '--porcelain'))
        self.assertNotIn('experiment/', self.cmd('git', 'ls-remote', '--heads', 'origin'))

    def test_main_rejected_without_losing_edits(self):
        self.cmd('git', 'switch', 'main')
        self.edit()
        with self.assertRaisesRegex(Stop, '分支'):
            self.app.save('修改', ['修改'], '待检查')
        self.assertEqual('new behavior\n', (self.page / 'index.html').read_text())

    def test_untracked_outside_scope_preserved(self):
        stray = self.root / 'outside.txt'
        stray.write_text('keep me')
        with self.assertRaisesRegex(Stop, '范围外'):
            self.app.guard()
        self.assertEqual('keep me', stray.read_text())

    def test_staged_outside_scope_preserved(self):
        path = self.root / 'shared/base.txt'
        path.write_text('keep staged\n')
        self.cmd('git', 'add', 'shared/base.txt')
        with self.assertRaisesRegex(Stop, '范围外'):
            self.app.save('修改', ['修改'], '待检查')
        self.assertIn('shared/base.txt', self.cmd('git', 'diff', '--cached', '--name-only'))

    def test_staged_change_hidden_by_worktree_restore_rejected(self):
        path = self.root / 'shared/base.txt'
        path.write_text('staged outside change\n')
        self.cmd('git', 'add', 'shared/base.txt')
        path.write_text('base\n')
        self.assertEqual('', self.cmd('git', 'diff', 'HEAD', '--name-only'))
        with self.assertRaisesRegex(Stop, '范围外'):
            self.app.guard()
        self.assertIn('shared/base.txt', self.cmd('git', 'diff', '--cached', '--name-only'))
        result = subprocess.run([sys.executable, 'tools/check_scope.py', '--base', 'origin/main',
                                 '--experiment', 'light-pollution'], cwd=self.root, capture_output=True)
        self.assertNotEqual(0, result.returncode)
        self.assertIn(b'OUT OF SCOPE: shared/base.txt', result.stdout)

    def test_committed_cross_directory_rename_rejected(self):
        self.cmd('git', 'mv', 'shared/base.txt', 'experiments/light-pollution/base.txt')
        self.cmd('git', 'commit', '-m', 'wrong scope')
        with self.assertRaisesRegex(Stop, '范围外'):
            self.app.guard()

    def test_tracking_main_rejected(self):
        self.cmd('git', 'branch', '--set-upstream-to=origin/main')
        with self.assertRaisesRegex(Stop, '跟踪目标'):
            self.app.guard()

    def test_dirty_start_and_sync_do_not_discard(self):
        self.edit()
        before = self.app.branch()
        for action in [lambda: self.app.start('light-pollution', 'next'), self.app.sync]:
            with self.assertRaisesRegex(Stop, '未提交'):
                action()
        self.assertEqual(before, self.app.branch())
        self.assertEqual('new behavior\n', (self.page / 'index.html').read_text())

    def test_any_logged_in_student_can_start_without_registration(self):
        self.app.identity = lambda: 'someone-else'
        self.app.start('light-pollution', 'next')
        self.assertEqual('someone-else', self.app.read('context.json')['owner'])
        self.app.guard()
        with self.assertRaisesRegex(Stop, '网页尚未'):
            self.app.start('unknown-page', 'next')

    def test_delivery_uses_current_login_without_owner_match(self):
        self.app.identity = lambda: 'another-student'
        context, _ = self.app.live_context()
        self.assertEqual('another-student', context['owner'])

    def test_remote_and_pushurl_checked(self):
        self.app.remote = lambda: Collaboration.remote(self.app)
        with self.assertRaisesRegex(Stop, '地址'):
            self.app.remote()
        url = 'https://github.com/TeutonicMepheles/Astronomical-Exps.git'
        self.cmd('git', 'remote', 'set-url', 'origin', url)
        self.app.remote()
        self.cmd('git', 'config', 'remote.origin.pushurl', 'https://github.com/other/repo.git')
        with self.assertRaisesRegex(Stop, '地址'):
            self.app.remote()

    def test_backup_updates_only_task_branch(self):
        main = self.cmd('git', 'rev-parse', 'origin/main')
        self.save()
        self.app.backup()
        self.assertEqual(main, self.cmd('git', 'rev-parse', 'origin/main'))
        self.assertEqual(self.cmd('git', 'rev-parse', 'HEAD'),
                         self.cmd('git', 'rev-parse', 'origin/' + self.app.branch()))

    def test_closed_pr_not_reused(self):
        self.app.prs = lambda context: [{'state': 'MERGED', 'baseRefName': 'main'}]
        with self.assertRaisesRegex(Stop, '合并'):
            self.app.backup()

    def test_resume_preserves_same_branch_dirty_work(self):
        self.edit()
        self.app.resume('light-pollution', 'initial-delivery')
        self.assertEqual('new behavior\n', (self.page / 'index.html').read_text())

    def test_diverged_main_does_not_start_new_task(self):
        self.cmd('git', 'switch', 'main')
        self.edit()
        self.cmd('git', 'add', '.')
        self.cmd('git', 'commit', '-m', 'local main work')
        with self.assertRaisesRegex(Stop, '独立提交'):
            self.app.start('light-pollution', 'next')
        self.assertEqual('main', self.app.branch())

    def advance_main(self, path='shared/base.txt', content='new shared version\n'):
        branch = self.app.branch()
        self.cmd('git', 'switch', 'main')
        (self.root / path).write_text(content, encoding='utf-8')
        self.cmd('git', 'add', '--', path)
        self.cmd('git', 'commit', '-m', 'main update')
        self.cmd('git', 'push', 'origin', 'main')
        self.cmd('git', 'switch', branch)

    def test_main_update_invalidates_receipt_and_sync_uses_template(self):
        self.save()
        self.app.write('checks.json', {'passed': True, **self.app.snapshot()})
        self.advance_main()
        with self.assertRaisesRegex(Stop, '过期'):
            self.app.submit(['完成'], '无', True)
        self.app.sync()
        self.assertEqual('0', self.cmd('git', 'rev-list', '--count', 'HEAD..origin/main'))
        self.assertIn('光污染：同步公共更新', self.cmd('git', 'log', '-1', '--format=%B'))
        self.app.guard()

    def test_sync_conflict_keeps_both_versions(self):
        self.save()
        self.advance_main('experiments/light-pollution/index.html', 'different main version\n')
        with self.assertRaises(Stop):
            self.app.sync()
        self.assertIn('index.html', self.cmd('git', 'diff', '--name-only', '--diff-filter=U'))
        contents = (self.page / 'index.html').read_text()
        self.assertIn('new behavior', contents)
        self.assertIn('different main version', contents)

    def test_non_fast_forward_backup_keeps_local_and_remote_commits(self):
        self.save()
        self.app.backup()
        branch = self.app.branch()
        local_head = self.cmd('git', 'rev-parse', 'HEAD')
        self.cmd('git', 'switch', '-c', 'remote-writer', 'origin/main')
        (self.page / 'index.html').write_text('remote work\n')
        self.cmd('git', 'add', '.')
        self.cmd('git', 'commit', '-m', 'remote independent commit')
        remote_head = self.cmd('git', 'rev-parse', 'HEAD')
        # Fixture-only replacement models a remote branch that diverged independently.
        self.cmd('git', '--git-dir=' + str(self.remote), 'update-ref',
                 'refs/heads/' + branch, local_head)
        # Transfer the competing object without rewriting the remote task branch.
        self.cmd('git', 'push', 'origin', 'HEAD:refs/heads/other-writer')
        self.cmd('git', '--git-dir=' + str(self.remote), 'update-ref', 'refs/heads/' + branch, remote_head)
        self.cmd('git', 'switch', branch)
        with self.assertRaises(Stop):
            self.app.backup()
        self.assertEqual(local_head, self.cmd('git', 'rev-parse', 'HEAD'))
        self.assertEqual(remote_head, self.cmd('git', '--git-dir=' + str(self.remote), 'rev-parse', 'refs/heads/' + branch))

    def test_missing_manual_confirmation_rejected(self):
        with self.assertRaisesRegex(Stop, '明确确认'):
            self.app.submit(['完成'], '无', False)

    def test_changed_commit_invalidates_check_receipt(self):
        self.app.write('checks.json', {'passed': True, **self.app.snapshot()})
        self.save()
        with self.assertRaisesRegex(Stop, '过期'):
            self.app.submit(['完成'], '无', True)

    def test_failed_check_invalidates_previous_pass(self):
        self.app.write('checks.json', {'passed': True, **self.app.snapshot()})
        original = self.app.run
        def run(*args, **kwargs):
            if args[0] == 'fake-npm':
                raise Stop('simulated test failure')
            return original(*args, **kwargs)
        with patch('collab.shutil.which', return_value='fake-npm'), patch.object(self.app, 'run', side_effect=run):
            with self.assertRaisesRegex(Stop, 'simulated'):
                self.app.check()
        self.assertFalse(self.app.read('checks.json')['passed'])

    def test_submit_retry_updates_existing_pr_using_body_file(self):
        self.save()
        self.app.write('checks.json', {'passed': True, **self.app.snapshot()})
        original = self.app.run
        calls = []
        def run(*args, **kwargs):
            if args[0] == 'gh':
                calls.append(args)
                return 'https://github.com/example/repo/pull/1'
            return original(*args, **kwargs)
        with patch.object(self.app, 'run', side_effect=run):
            self.app.submit(['完成整页'], '无', True)
            self.app.prs = lambda context: [{'number': 1, 'state': 'OPEN', 'baseRefName': 'main', 'url': 'test'}]
            self.app.submit(['完成整页及返修'], '无', True)
        self.assertEqual(['create', 'edit'], [call[2] for call in calls])
        self.assertTrue(all('--body-file' in call for call in calls))
        self.assertIn('完成整页及返修', (self.app.state / 'pr-body.md').read_text(encoding='utf-8'))

    def test_same_named_fork_pr_is_not_edited(self):
        prs = [{'number': 1, 'isCrossRepository': True}, {'number': 2, 'isCrossRepository': False}]
        with patch.object(self.app, 'run', return_value=json.dumps(prs)) as run:
            result = Collaboration.prs(self.app, self.app.read('context.json'))
        self.assertEqual([2], [pr['number'] for pr in result])
        self.assertIn('https://github.com/TeutonicMepheles/Astronomical-Exps', run.call_args.args)


if __name__ == '__main__':
    unittest.main()

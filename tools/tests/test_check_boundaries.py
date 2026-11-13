"""Historical text is archival; production may never import its missing media."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


class ArchiveBoundaryTests(unittest.TestCase):
    def test_archive_is_not_executable_but_active_import_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'tools').mkdir()
            shutil.copyfile(Path(__file__).parents[1] / 'check.py', root / 'tools/check.py')
            archived = root / 'experiments/example/resource-archives/snapshot'
            archived.mkdir(parents=True)
            (archived / 'old.html').write_text('<img src="excluded-reference.png">', encoding='utf-8')
            entry = root / 'experiments/example/index.html'
            entry.write_text('<p>Current experiment</p>', encoding='utf-8')

            def check():
                return subprocess.run([sys.executable, str(root / 'tools/check.py')],
                                      capture_output=True, text=True, encoding='utf-8')

            self.assertEqual(check().returncode, 0)
            entry.write_text('<iframe src="resource-archives/snapshot/old.html"></iframe>', encoding='utf-8')
            result = check()
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('active dependency on historical resource archive', result.stdout)

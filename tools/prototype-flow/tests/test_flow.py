"""Rebuilt source tests. Synthetic snapshots are not actual Figma results."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
loader = importlib.util.spec_from_file_location("flow", ROOT / "flow.py")
flow = importlib.util.module_from_spec(loader)
loader.loader.exec_module(flow)


class FlowTests(unittest.TestCase):
    def setUp(self):
        self.spec = flow.read_json(ROOT / "examples/earth-observation.v0.1.0.json")

    def mutated(self, fn):
        value = copy.deepcopy(self.spec)
        fn(value)
        return value

    def mock(self, mode="normal"):
        with tempfile.TemporaryDirectory(prefix="prototype-flow-test-") as temporary:
            out = Path(temporary) / "run"
            flow.build(self.spec, out)
            for name in ("build.figma.js", "readback.figma.js"):
                subprocess.run(["node", "--check", str(out / name)], check=True, capture_output=True)
            evidence = Path(temporary) / "mock.json"
            subprocess.run(["node", str(ROOT / "tests/figma-mock.cjs"),
                            str(out / "build.figma.js"), str(out / "readback.figma.js"),
                            str(evidence), mode], check=True, capture_output=True)
            return flow.read_json(evidence)

    def test_example_passes_structural_gate_only(self):
        self.assertEqual(flow.validate(self.spec), [])
        result = flow.evaluate(self.spec)
        self.assertEqual(result["overall"], "pending")
        self.assertEqual(result["gates"]["specification"]["status"], "pass")

    def test_invalid_target(self):
        value = self.mutated(lambda s: s["states"][0]["controls"][0].update(target="missing"))
        self.assertTrue(any("dangling" in e for e in flow.validate(value)))

    def test_hover_dependency_rejected(self):
        value = self.mutated(lambda s: s["states"][0]["controls"][0].update(trigger="ON_HOVER"))
        self.assertTrue(flow.validate(value))

    def test_wrong_ratio_and_html_rejected(self):
        for change in (lambda s: s["canvas"].update(width=1000), lambda s: s.update(target="html")):
            self.assertTrue(flow.validate(self.mutated(change)))

    def test_overlapping_controls_rejected(self):
        value = self.mutated(lambda s: s["states"][1]["controls"][1].update(x=48))
        self.assertTrue(any("overlaps" in e for e in flow.validate(value)))

    def test_duplicate_ids_rejected(self):
        value = self.mutated(lambda s: s["states"][1].update(id="choose"))
        self.assertTrue(flow.validate(value))

    def test_bad_path_and_missing_category_rejected(self):
        value = self.mutated(lambda s: s["scenarios"][0].update(steps=["calculate"]))
        self.assertTrue(flow.validate(value))
        self.assertTrue(flow.validate(self.mutated(lambda s: s["scenarios"].pop())))

    def test_unreachable_and_trapped_states_rejected(self):
        value = self.mutated(lambda s: s["states"][0]["controls"][0].update(target="choose"))
        self.assertTrue(any("unreachable" in e for e in flow.validate(value)))
        value = self.mutated(lambda s: s["states"][-1]["controls"][0].update(target="invalidated"))
        self.assertTrue(any("cannot reach" in e for e in flow.validate(value)))

    def test_compile_native_graph_and_readback(self):
        data = self.mock("duplicate")
        self.assertEqual(len(data["frames"]), 10)
        self.assertTrue(any("fixtures cannot pass" in e for e in flow.snapshot_errors(self.spec, data)))
        # In-memory unit test of comparison logic only; never persist as live evidence.
        synthetic = {**data, "kind": "figma-live-readback"}
        self.assertEqual(flow.snapshot_errors(self.spec, synthetic), [])

    def test_broken_link_and_color_detected(self):
        for mode, expected in (("broken-link", "reaction"), ("color", "grayscale")):
            data = self.mock(mode)
            data["kind"] = "figma-live-readback"  # In-memory synthetic unit test only.
            self.assertTrue(any(expected in e for e in flow.snapshot_errors(self.spec, data)))

    def test_hidden_text_and_opacity_rejected(self):
        for mode in ("hidden-text", "opacity"):
            data = self.mock(mode)
            data["kind"] = "figma-live-readback"  # Never persisted.
            self.assertTrue(any("hidden" in e for e in flow.snapshot_errors(self.spec, data)))

    def test_malformed_nested_evidence_does_not_crash(self):
        data = self.mock()
        data["kind"] = "figma-live-readback"
        data["frames"][0]["controls"][0]["reactions"][0]["trigger"] = None
        data["frames"][0]["paints"][0]["color"] = None
        self.assertTrue(flow.snapshot_errors(self.spec, data))

    def test_stale_evidence_rejected(self):
        data = self.mock()
        data["artifact_digest"] = "0" * 64
        self.assertTrue(any("digest" in e for e in flow.snapshot_errors(self.spec, data)))

    def test_evidence_missing_identity_rejected(self):
        data = self.mock()
        data["file_key"] = None
        self.assertTrue(any("file_key" in e for e in flow.snapshot_errors(self.spec, data)))

    def test_malformed_review_does_not_crash(self):
        review = flow.review_template(self.spec)
        review["scenario_runs"][0]["id"] = []
        self.assertTrue(any("Malformed" in e for e in flow.review_errors(self.spec, review)))

    def test_review_template_cannot_pass(self):
        review = flow.review_template(self.spec)
        self.assertTrue(flow.review_errors(self.spec, review))
        self.assertEqual(flow.evaluate(self.spec, review=review)["overall"], "fail")

    def test_review_requires_each_real_scenario(self):
        evidence = self.mock()
        review = flow.review_template(self.spec, evidence)
        review.update(reviewer="Synthetic test reviewer", reviewed_at="test-only", decision="approve")
        for run in review["scenario_runs"]:
            run.update(status="pass", evidence="test-only, not actual evidence")
        self.assertEqual(flow.review_errors(self.spec, review, evidence), [])
        changed = {**evidence, "captured_at": "later"}
        self.assertTrue(any("snapshot" in e for e in flow.review_errors(self.spec, review, changed)))
        review["scenario_runs"][0]["status"] = "fail"
        self.assertTrue(flow.review_errors(self.spec, review, evidence))
        review["artifact_digest"] = "0" * 64
        self.assertTrue(any("digest" in e for e in flow.review_errors(self.spec, review, evidence)))

    def test_output_directory_never_overwritten(self):
        with tempfile.TemporaryDirectory() as temporary:
            out = Path(temporary) / "run"
            flow.build(self.spec, out)
            with self.assertRaises(ValueError):
                flow.build(self.spec, out)

    def test_digest_stable_and_sensitive(self):
        other = dict(reversed(list(self.spec.items())))
        self.assertEqual(flow.digest(self.spec), flow.digest(other))
        other["version"] = "0.2.0"
        self.assertNotEqual(flow.digest(self.spec), flow.digest(other))

    def test_cli_pending_exit_and_no_traceback(self):
        run = subprocess.run([sys.executable, str(ROOT / "flow.py"), "eval",
                              str(ROOT / "examples/earth-observation.v0.1.0.json")],
                              capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(run.returncode, 2)
        self.assertEqual(json.loads(run.stdout)["overall"], "pending")

    def test_template_tokens_in_user_text_are_not_replaced(self):
        spec = self.mutated(lambda s: s["states"][0].update(body="Literal __DIGEST_JSON__ and __SPEC_JSON__"))
        with tempfile.TemporaryDirectory() as temporary:
            out = Path(temporary) / "run"
            flow.build(spec, out)
            for name in ("build.figma.js", "readback.figma.js"):
                subprocess.run(["node", "--check", str(out / name)], check=True, capture_output=True)
                self.assertIn("Literal __DIGEST_JSON__ and __SPEC_JSON__", (out / name).read_text(encoding="utf-8"))

    def test_parent_digest_must_be_explicit(self):
        self.assertTrue(flow.validate(self.mutated(lambda s: s.pop("parent_digest"))))

    def test_nonfinite_spec_returns_failure(self):
        bad = self.mutated(lambda s: s["canvas"].update(width=float("nan")))
        self.assertEqual(flow.evaluate(bad)["overall"], "fail")

    def test_duplicate_essential_text_rejected(self):
        data = self.mock()
        data["kind"] = "figma-live-readback"  # Comparison-unit test only.
        data["frames"][0]["texts"].append(copy.deepcopy(data["frames"][0]["texts"][0]))
        self.assertTrue(any("inventory" in e for e in flow.snapshot_errors(self.spec, data)))

    def test_prepare_review_rejects_mock_file(self):
        with tempfile.TemporaryDirectory() as temporary:
            evidence = Path(temporary) / "mock.json"
            evidence.write_text(json.dumps(self.mock()), encoding="utf-8")
            out = Path(temporary) / "review.json"
            run = subprocess.run([sys.executable, str(ROOT / "flow.py"), "prepare-review",
                                  str(ROOT / "examples/earth-observation.v0.1.0.json"),
                                  "--evidence", str(evidence), "--out", str(out)],
                                  capture_output=True, text=True, encoding="utf-8")
            self.assertEqual(run.returncode, 1)
            self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main()

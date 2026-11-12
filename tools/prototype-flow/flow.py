"""Tempad/Figma prototype compiler and evidence-gated Eval, recovery edition.
Standard library only. No HTML, model service, network or credentials.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import sys

VERSION = "0.1.1"
HERE = Path(__file__).resolve().parent
CRITERIA = ["task_clarity", "action_discoverability", "state_feedback", "recovery_clarity", "teaching_flow"]
CATEGORIES = {"happy", "cancel", "repeat", "error"}
ID = re.compile(r"^[a-z][a-z0-9-]{0,63}$")
SHA = re.compile(r"^[0-9a-f]{64}$")


def read_json(path):
    with Path(path).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def digest(value):
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def _validate(spec):
    errors = []
    def need(ok, message):
        if not ok:
            errors.append(message)
    if not isinstance(spec, dict):
        return ["spec must be an object"]
    need(spec.get("schema_version") == 1, "schema_version must be 1")
    need(isinstance(spec.get("id"), str) and bool(ID.fullmatch(spec["id"])), "id must be a safe stable identifier")
    need(isinstance(spec.get("version"), str) and bool(re.fullmatch(r"\d+\.\d+\.\d+", spec["version"])), "version must be x.y.z")
    need(nonempty(spec.get("title")) and len(spec["title"]) <= 80, "title is required, max 80 characters")
    need(spec.get("target") == "figma-native-grayscale", "target must be figma-native-grayscale, not HTML")
    need("parent_digest" in spec, "parent_digest is required (null for first version)")
    need(spec.get("parent_digest") is None or isinstance(spec["parent_digest"], str) and bool(SHA.fullmatch(spec["parent_digest"])), "parent_digest must be null or SHA256")
    for key in ("scope", "change_summary"):
        need(nonempty(spec.get(key)), key + " is required")
    need(isinstance(spec.get("uncertainties"), list), "uncertainties must be explicit, possibly empty")
    canvas = spec.get("canvas")
    if not isinstance(canvas, dict):
        return errors + ["canvas must be an object"]
    width, height = canvas.get("width"), canvas.get("height")
    need(number(width) and number(height) and width >= 800 and height >= 450, "canvas requires finite dimensions >= 800x450")
    if errors:
        return errors
    need(abs(width / height - 16 / 9) < 0.001, "project constraint: canvas must be 16:9")
    requirements = spec.get("requirements")
    if not isinstance(requirements, list) or not requirements:
        return errors + ["requirements must contain source-labelled entries"]
    for item in requirements:
        if not isinstance(item, dict):
            errors.append("requirement must be an object")
            continue
        need(item.get("kind") in {"project_constraint", "confirmed_requirement", "candidate"}, "requirement kind must distinguish facts and candidates")
        need(all(nonempty(item.get(k)) for k in ("id", "text", "source")), "each requirement needs id, text and source")
    states = spec.get("states")
    if not isinstance(states, list) or not 2 <= len(states) <= 40:
        return errors + ["states must contain 2..40 frames"]
    state_ids, control_ids = set(), set()
    for state in states:
        if not isinstance(state, dict):
            errors.append("state must be an object")
            continue
        sid = state.get("id")
        if not isinstance(sid, str) or not ID.fullmatch(sid):
            errors.append("state id must be stable")
            continue
        need(sid not in state_ids, "duplicate state: " + sid)
        state_ids.add(sid)
        need(state.get("kind") in {"entry", "task", "feedback", "terminal"}, sid + ": invalid state kind")
        for field, limit in (("title", 60), ("body", 240), ("scene", 180)):
            need(nonempty(state.get(field)) and len(state[field]) <= limit, f"{sid}: {field} is required, max {limit}")
        controls = state.get("controls")
        if not isinstance(controls, list):
            errors.append(sid + ": controls must be array")
            continue
        need(1 <= len(controls) <= 8, sid + ": expected 1..8 controls")
        boxes = []
        for control in controls:
            if not isinstance(control, dict):
                errors.append(sid + ": control must be an object")
                continue
            cid = control.get("id")
            if not isinstance(cid, str) or not ID.fullmatch(cid):
                errors.append(sid + ": control id must be stable")
                continue
            need(cid not in control_ids, "duplicate control: " + cid)
            control_ids.add(cid)
            need(nonempty(control.get("label")) and len(control["label"]) <= 42, cid + ": label is required, max 42")
            need(control.get("trigger") in {"ON_CLICK", "ON_DRAG"}, cid + ": only click/drag, no hover/scroll dependency")
            need(isinstance(control.get("target"), str), cid + ": target is required")
            need(control.get("role") in {"primary", "secondary", "recovery"}, cid + ": invalid role")
            box = [control.get(k) for k in ("x", "y", "width", "height")]
            if not all(number(v) for v in box):
                errors.append(cid + ": finite numeric geometry required")
                continue
            x, y, w, h = box
            need(w >= 160 and h >= 52, cid + ": compiler candidate minimum is 160x52 logical px")
            need(x >= 24 and y >= height * .65 and x + w <= width - 24 and y + h <= height - 24, cid + ": control outside interaction region")
            for other, ox, oy, ow, oh in boxes:
                need(not (x < ox + ow and x + w > ox and y < oy + oh and y + h > oy), cid + ": overlaps " + other)
            boxes.append((cid, x, y, w, h))
    if errors:
        return errors
    mapping = {s["id"]: s for s in states}
    entry = spec.get("entry")
    need(entry in mapping, "entry must point to a state")
    need([s["id"] for s in states if s["kind"] == "entry"] == [entry], "exactly one matching entry state required")
    terminals = {s["id"] for s in states if s["kind"] == "terminal"}
    need(bool(terminals), "at least one terminal state required")
    for state in states:
        for control in state["controls"]:
            need(control["target"] in mapping, control["id"] + ": dangling target " + control["target"])
    if errors:
        return errors
    def reachable(start):
        seen, todo = set(), [start]
        while todo:
            current = todo.pop()
            if current not in seen:
                seen.add(current)
                todo.extend(c["target"] for c in mapping[current]["controls"])
        return seen
    missing = set(mapping) - reachable(entry)
    need(not missing, "unreachable states: " + ", ".join(sorted(missing)))
    for sid in mapping:
        need(bool(reachable(sid) & terminals), sid + ": cannot reach a terminal outcome")
    scenarios = spec.get("scenarios")
    if not isinstance(scenarios, list) or not scenarios:
        return errors + ["scenarios required"]
    case_ids, categories = set(), set()
    for case in scenarios:
        if not isinstance(case, dict):
            errors.append("scenario must be object")
            continue
        cid = case.get("id")
        if not isinstance(cid, str) or not ID.fullmatch(cid):
            errors.append("scenario ids must be unique and stable")
            continue
        need(cid not in case_ids, "duplicate scenario: " + cid)
        case_ids.add(cid)
        need(case.get("category") in CATEGORIES, cid + ": invalid category")
        categories.add(case.get("category"))
        need(nonempty(case.get("expected")), cid + ": observable expected outcome required")
        current = case.get("start", entry)
        steps = case.get("steps")
        if current not in mapping or not isinstance(steps, list) or not steps:
            errors.append(cid + ": valid start and nonempty steps required")
            continue
        for step in steps:
            choice = next((c for c in mapping[current]["controls"] if c["id"] == step), None)
            if choice is None:
                errors.append(f"{cid}: {step} is not available in {current}")
                break
            current = choice["target"]
        need(current == case.get("end"), cid + ": scenario end mismatch")
    need(CATEGORIES <= categories, "include happy, cancel, repeat and error scenarios")
    return errors


def validate(spec):
    try:
        return _validate(spec)
    except (TypeError, KeyError, AttributeError, ValueError) as exc:
        return ["Malformed specification: " + str(exc)]


def review_template(spec, evidence=None):
    return {
        "schema_version": 1, "artifact_digest": digest(spec), "prototype_version": spec["version"],
        "evidence_digest": digest(evidence) if evidence is not None else None,
        "file_key": evidence.get("file_key") if evidence else None,
        "page_id": evidence.get("page_id") if evidence else None,
        "reviewer": "", "reviewed_at": "", "decision": "pending",
        "scenario_runs": [{"id": c["id"], "status": "not_run", "evidence": "", "notes": ""} for c in spec["scenarios"]],
        "criteria": {name: {"score": None, "reason": ""} for name in CRITERIA},
        "preferences": [], "next_changes": [],
        "notice": "Candidate rubric, not calibrated personal labels. Record real Present-mode runs; never fill from expected behavior."
    }


def build(spec, out):
    errors = validate(spec)
    if errors:
        raise ValueError("\n".join(errors))
    out = Path(out)
    if out.exists():
        raise ValueError("Output already exists; choose a new version/run directory: " + str(out))
    # Prepare everything before creating the output directory.
    substitutions = {"__SPEC_JSON__": json.dumps(spec, ensure_ascii=False), "__DIGEST_JSON__": json.dumps(digest(spec))}
    outputs = {}
    for source, target in (("figma-build.js", "build.figma.js"), ("figma-readback.js", "readback.figma.js")):
        script = (HERE / source).read_text(encoding="utf-8")
        for key in substitutions:
            if key not in script:
                raise ValueError("Template placeholder missing: " + key)
        # Replace only tokens in the original template, never rescan inserted user JSON.
        outputs[target] = re.sub(r"__SPEC_JSON__|__DIGEST_JSON__", lambda match: substitutions[match.group(0)], script)
    manifest = {
        "compiler_version": VERSION, "artifact_digest": digest(spec), "prototype_version": spec["version"],
        "parent_digest": spec["parent_digest"], "created_at": datetime.now(timezone.utc).isoformat(),
        "target": spec["target"], "states": len(spec["states"]), "figma_execution": "not_run",
        "human_review": "not_run", "transport": "Tempad capability discovery required",
    }
    for filename, value in (("spec.json", spec), ("review.template.json", review_template(spec)), ("manifest.json", manifest)):
        outputs[filename] = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    out.mkdir(parents=True, exist_ok=False)
    for filename, value in outputs.items():
        with (out / filename).open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(value)
    return manifest


def _snapshot_errors(spec, data):
    errors = []
    def check(ok, message):
        if not ok:
            errors.append(message)
    if not isinstance(data, dict):
        return ["evidence must be object"]
    check(data.get("schema_version") == 1, "unsupported evidence schema")
    check(data.get("kind") == "figma-live-readback", "evidence is not a live Figma readback (fixtures cannot pass)")
    check(data.get("artifact_digest") == digest(spec), "stale/different spec digest")
    check(data.get("prototype_version") == spec["version"], "prototype version mismatch")
    for key in ("file_key", "page_id", "captured_at"):
        check(nonempty(data.get(key)), "missing " + key)
    frames = data.get("frames")
    if not isinstance(frames, list) or not all(isinstance(f, dict) for f in frames):
        return errors + ["frames must be an object array"]
    check(len(frames) == len(spec["states"]), "frame count mismatch")
    ids = [f.get("state_id") for f in frames]
    check(len(ids) == len(set(ids)) and set(ids) == {s["id"] for s in spec["states"]}, "frame mapping mismatch")
    mapping = {f.get("state_id"): f for f in frames}
    node_ids = [f.get("node_id") for f in frames]
    check(all(nonempty(v) for v in node_ids) and len(set(node_ids)) == len(node_ids), "Figma node IDs missing/duplicated")
    if errors:
        return errors
    starts = data.get("flow_starting_points", [])
    check(isinstance(starts, list) and any(isinstance(p, dict) and p.get("nodeId") == mapping[spec["entry"]]["node_id"] for p in starts), "prototype flow starting point missing")
    for state in spec["states"]:
        actual = mapping[state["id"]]
        check(actual.get("width") == spec["canvas"]["width"] and actual.get("height") == spec["canvas"]["height"], state["id"] + ": frame dimensions differ")
        check(actual.get("visible") is True and number(actual.get("effective_opacity")) and actual["effective_opacity"] > 0, state["id"] + ": frame hidden")
        check(all(actual.get(k) == state[k] for k in ("title", "body", "scene")), state["id"] + ": text differs")
        controls = actual.get("controls")
        if not isinstance(controls, list) or not all(isinstance(c, dict) for c in controls):
            errors.append(state["id"] + ": controls missing")
            continue
        cm = {c.get("control_id"): c for c in controls}
        check(len(controls) == len(state["controls"]) and set(cm) == {c["id"] for c in state["controls"]}, state["id"] + ": controls differ")
        for control in state["controls"]:
            found = cm.get(control["id"], {})
            check(found.get("visible") is True and number(found.get("effective_opacity")) and found["effective_opacity"] > 0, control["id"] + ": hidden")
            check(found.get("label") == control["label"], control["id"] + ": label differs")
            check(all(found.get(k) == control[k] for k in ("x", "y", "width", "height")), control["id"] + ": geometry differs")
            reactions = found.get("reactions")
            valid = False
            if isinstance(reactions, list) and len(reactions) == 1 and isinstance(reactions[0], dict):
                reaction = reactions[0]
                actions = reaction.get("actions") or ([reaction["action"]] if reaction.get("action") else [])
                trigger = reaction.get("trigger")
                if isinstance(actions, list) and len(actions) == 1 and isinstance(actions[0], dict) and isinstance(trigger, dict):
                    action = actions[0]
                    valid = (trigger.get("type") == control["trigger"] and action.get("type") == "NODE"
                             and action.get("navigation") == "NAVIGATE"
                             and action.get("destinationId") == mapping[control["target"]]["node_id"])
            check(valid, control["id"] + ": native prototype reaction missing/wrong")
        texts = actual.get("texts", [])
        if not isinstance(texts, list):
            texts = []
        expected_texts = {k: state[k] for k in ("title", "body", "scene")}
        expected_texts.update({c["id"]: c["label"] for c in state["controls"]})
        observed = {t.get("key"): t for t in texts if isinstance(t, dict)}
        check(len(texts) == len(expected_texts) and set(observed) == set(expected_texts), state["id"] + ": essential text inventory differs")
        for key, value in expected_texts.items():
            text = observed.get(key, {})
            check(text.get("characters") == value and text.get("effective_visible") is True
                  and number(text.get("effective_opacity")) and text["effective_opacity"] > 0
                  and text.get("within_parent") is True,
                  state["id"] + "/" + key + ": text hidden, transparent or outside parent")
        paints = actual.get("paints", [])
        check(isinstance(paints, list) and bool(paints), state["id"] + ": no observed paints")
        if isinstance(paints, list):
            for paint in paints:
                if not isinstance(paint, dict) or paint.get("type") != "SOLID":
                    errors.append(state["id"] + ": non-solid paint needs manual review")
                    continue
                color = paint.get("color") if isinstance(paint.get("color"), dict) else {}
                values = [color.get(k) for k in ("r", "g", "b")]
                check(all(number(v) and 0 <= v <= 1 for v in values) and max(values) - min(values) < .002 if all(number(v) for v in values) else False,
                      state["id"] + ": non-grayscale paint")
    return errors


def snapshot_errors(spec, data):
    try:
        return _snapshot_errors(spec, data)
    except (TypeError, KeyError, AttributeError, ValueError) as exc:
        return ["Malformed snapshot: " + str(exc)]


def _review_errors(spec, review, evidence=None):
    if not isinstance(review, dict):
        return ["review must be object"]
    errors = []
    if evidence is None:
        errors.append("exact Figma readback required to bind human review")
    elif (review.get("evidence_digest") != digest(evidence) or review.get("file_key") != evidence.get("file_key")
          or review.get("page_id") != evidence.get("page_id")):
        errors.append("review is not bound to this exact Figma file/page/snapshot")
    if review.get("artifact_digest") != digest(spec):
        errors.append("review refers to a different prototype digest")
    if review.get("prototype_version") != spec["version"]:
        errors.append("review prototype version mismatch")
    if review.get("decision") != "approve":
        errors.append("human decision is not approve")
    if not all(nonempty(review.get(k)) for k in ("reviewer", "reviewed_at")):
        errors.append("reviewer and reviewed_at required")
    runs = review.get("scenario_runs", [])
    if not isinstance(runs, list):
        return errors + ["scenario_runs must be array"]
    indexed = {r.get("id"): r for r in runs if isinstance(r, dict)}
    if len(runs) != len(spec["scenarios"]) or set(indexed) != {c["id"] for c in spec["scenarios"]}:
        errors.append("scenario review coverage mismatch")
    for case in spec["scenarios"]:
        run = indexed.get(case["id"], {})
        if run.get("status") != "pass" or not nonempty(run.get("evidence")):
            errors.append(case["id"] + ": actual passing run and evidence reference required")
    return errors


def review_errors(spec, review, evidence=None):
    try:
        return _review_errors(spec, review, evidence)
    except (TypeError, KeyError, AttributeError, ValueError) as exc:
        return ["Malformed review: " + str(exc)]


def evaluate(spec, evidence=None, review=None):
    static = validate(spec)
    figma_errors = snapshot_errors(spec, evidence) if not static and evidence is not None else []
    human_errors = review_errors(spec, review, evidence) if not static and review is not None else []
    gates = {
        "specification": {"status": "fail" if static else "pass", "issues": static},
        "figma_readback": {"status": "pending" if evidence is None or static else ("fail" if figma_errors else "pass"), "issues": figma_errors},
        "human_playtest": {"status": "pending" if review is None or static else ("fail" if human_errors else "pass"), "issues": human_errors},
    }
    statuses = [g["status"] for g in gates.values()]
    overall = "fail" if "fail" in statuses else ("pending" if "pending" in statuses else "pass")
    try:
        artifact_digest = digest(spec)
    except (TypeError, ValueError):
        artifact_digest = None
    return {
        "evaluator_version": VERSION, "artifact_digest": artifact_digest, "overall": overall, "gates": gates,
        "personal_preference_calibration": "not_calibrated",
        "limits": [
            "Checks supplied Figma snapshot; does not independently authenticate provenance or open Present mode.",
            "Passing native reactions does not prove touch usability, typography, scientific correctness or user satisfaction.",
            "Candidate rubric scores are not a calibrated personal evaluator and never become automatic pass labels.",
        ],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("validate", "build", "eval", "prepare-review"):
        command = sub.add_parser(name)
        command.add_argument("spec")
        if name in {"build", "prepare-review"}:
            command.add_argument("--out", required=True)
        if name == "prepare-review":
            command.add_argument("--evidence", required=True)
        if name == "eval":
            command.add_argument("--evidence")
            command.add_argument("--review")
            command.add_argument("--out")
    args = parser.parse_args(argv)
    try:
        spec = read_json(args.spec)
        if args.command == "validate":
            issues = validate(spec)
            result = {"status": "fail" if issues else "pass", "issues": issues}
            if not issues:
                result["artifact_digest"] = digest(spec)
            code = 1 if issues else 0
        elif args.command == "build":
            result, code = build(spec, args.out), 0
        elif args.command == "prepare-review":
            evidence = read_json(args.evidence)
            issues = validate(spec) or snapshot_errors(spec, evidence)
            if issues:
                raise ValueError("\n".join(issues))
            result, code = review_template(spec, evidence), 0
            with Path(args.out).open("x", encoding="utf-8") as stream:
                json.dump(result, stream, ensure_ascii=False, indent=2)
        else:
            result = evaluate(spec, read_json(args.evidence) if args.evidence else None, read_json(args.review) if args.review else None)
            code = {"pass": 0, "fail": 1, "pending": 2}[result["overall"]]
        output = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        if args.command == "eval" and args.out:
            with Path(args.out).open("x", encoding="utf-8") as stream:
                stream.write(output)
        print(output, end="")
        return code
    except (OSError, ValueError, TypeError, KeyError) as exc:
        print("ERROR: " + str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

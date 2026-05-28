from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC = ROOT / "docs/stage-13-learning-flow.md"
ROADMAP = ROOT / "docs/project-roadmap-after-stage9.md"
STAGE12_FINAL_DOC = ROOT / "docs/stage-12-8-final-stabilization.md"

REQUIRED_FILES = [
    DOC,
    ROADMAP,
    STAGE12_FINAL_DOC,
    ROOT / "scripts/check_stage12_8_final_stabilization.py",
    ROOT / "scripts/check_stage12_7_import_export_reporting.py",
    ROOT / "scripts/check_project_roadmap_after_stage9.py",
    ROOT / "scripts/check_ci_local_gate.py",
]

DOC_MARKERS = [
    "Stage 13 baseline server check - 2026-05-28",
    "production git head: 6f78013",
    "Stage 13 baseline server check passed",
    "stage13_baseline_tag=ok",
    "backend_health=ok",
    "backend_ready=ok",
    "public_ready=ok",
    "Status: in progress",
    "Stage: 13",
    "Stage 13 Learning flow / прохождение курсов",
    "Stage 13 baseline",
    "v0.1.0-stage12-complete",
    "learner course list",
    "learner course detail page",
    "modules and lessons display",
    "lesson completion",
    "progress calculation",
    "course completion",
    "link to generated documents",
    "learner-scoped",
    "production_runtime_changed=no",
]

ROADMAP_MARKERS = [
    "Stage 13 — Learning flow / прохождение курсов",
    "implement the learner-side course experience",
    "learner course list",
    "course detail page",
    "modules and lessons display",
    "lesson completion",
    "progress calculation",
    "course completion",
    "link to generated documents",
]

STAGE12_FINAL_MARKERS = [
    "Status: accepted",
    "Stage: 12.8",
    "Stage 12 accepted",
    "Stage 12.8 accepted",
    "v0.1.0-stage12-complete",
    "214 passed",
    "frontend production build passed",
]

FORBIDDEN_SECRET_MARKERS = [
    "BOT_" + "TOKEN=",
    "SECRET_" + "KEY=",
    "POSTGRES_" + "PASSWORD=",
    "MINIO_ROOT_" + "PASSWORD=",
    "ACCESS_" + "TOKEN=",
    "SERVICE_" + "SECRET=",
]


def read_text(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"[fail] required file is missing: {path.relative_to(ROOT)}")

    return path.read_text(encoding="utf-8")


def require_markers(path: Path, markers: list[str]) -> int:
    text = read_text(path)
    missing = [marker for marker in markers if marker not in text]

    if missing:
        details = "\n".join(f"  missing marker: {marker}" for marker in missing)
        raise SystemExit(f"[fail] {path.relative_to(ROOT)}\n{details}")

    return len(markers)


def check_no_secret_markers(path: Path) -> None:
    text = read_text(path)

    for marker in FORBIDDEN_SECRET_MARKERS:
        if marker in text:
            raise SystemExit(
                f"[fail] forbidden secret-like marker {marker!r} found in {path.relative_to(ROOT)}"
            )


def main() -> None:
    for path in REQUIRED_FILES:
        read_text(path)

    for path in [DOC, Path(__file__).resolve()]:
        check_no_secret_markers(path)

    doc_count = require_markers(DOC, DOC_MARKERS)
    roadmap_count = require_markers(ROADMAP, ROADMAP_MARKERS)
    stage12_count = require_markers(STAGE12_FINAL_DOC, STAGE12_FINAL_MARKERS)

    print(
        "stage 13 learning flow diagnostics passed: "
        f"doc_markers={doc_count}, roadmap_markers={roadmap_count}, "
        f"stage12_final_markers={stage12_count}, required_files={len(REQUIRED_FILES)}, "
        "secrets_printed=no, production_runtime_changed=no"
    )


if __name__ == "__main__":
    main()

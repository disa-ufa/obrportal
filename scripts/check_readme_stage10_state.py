from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"

REQUIRED_MARKERS = [
    "# ObrPortal",
    "## Текущая контрольная точка",
    "v0.1.0-stage6-ops9",
    "79c64c0 docs: stabilize stage 9.9 checkpoint",
    "Stage 9 полностью закрыт",
    "Stage 10 — project roadmap stabilization and controlled production readiness",
    "10.1 — post Stage 9 roadmap",
    "10.2 — README актуализирован под Stage 10",
    "10.3 — добавить Stage 9 / Stage 10 roadmap guards в CI",
    "10.4 — исправить frontend API base variable mismatch",
    "10.5 — убрать demo credentials из production login form",
    "10.6 — подготовить production initialization runbook",
    "Stage 12 — Course authoring / конструктор курсов",
    "docs/project-roadmap-after-stage9.md",
    "python .\\scripts\\check_project_roadmap_after_stage9.py",
    "Checkpoint 10.1 - post Stage 9 project roadmap",
    "Stage 12 - Course authoring / конструктор курсов",
    "Stage 13 - Learning flow / прохождение курсов",
    "Stage 14 - Documents / certificates / verification",
    "`develop`: `c71eb14`",
    "`main`: `79c64c0`",
]

FORBIDDEN_MARKERS = [
    "6.40.1 — актуализация README.md",
    "6.40.2 — полный quality gate",
    "6.40.3 — commit / push / fast-forward merge develop → main",
    "К следующему функциональному блоку `6.41",
]


def main() -> None:
    if not README.exists():
        raise SystemExit("README.md is missing")

    text = README.read_text(encoding="utf-8")

    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]
    if missing:
        print("README Stage 10 state diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    forbidden = [marker for marker in FORBIDDEN_MARKERS if marker in text]
    if forbidden:
        print("README Stage 10 state diagnostics failed")
        print("forbidden outdated markers:")
        for marker in forbidden:
            print(f" - {marker}")
        raise SystemExit(1)

    checkpoint_count = text.count("Checkpoint 10.1 - post Stage 9 project roadmap")
    stage12_count = text.count("Course authoring") + text.count("конструктор курсов")
    stage10_count = text.count("Stage 10") + text.count("10.2")

    if checkpoint_count != 1:
        raise SystemExit(f"expected exactly one Stage 10.1 checkpoint, got {checkpoint_count}")

    if stage12_count < 3:
        raise SystemExit(f"expected at least 3 course authoring markers, got {stage12_count}")

    if stage10_count < 4:
        raise SystemExit(f"expected at least 4 Stage 10 markers, got {stage10_count}")

    print(
        "README Stage 10 state diagnostics passed: "
        f"checkpoint_count={checkpoint_count}, stage12_markers={stage12_count}, "
        f"stage10_markers={stage10_count}, markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()

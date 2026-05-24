from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"

REQUIRED_MARKERS = [
    "# ObrPortal",
    "## Текущая контрольная точка",
    "v0.1.0-stage6-ops9",
    "a1b5962 docs: add production initialization runbook",
    "79c64c0 docs: stabilize stage 9.9 checkpoint",
    "Stage 9 полностью закрыт",
    "10.1 - post Stage 9 roadmap",
    "10.2 - README актуализирован под Stage 10",
    "10.3 - Stage 9 / Stage 10 roadmap guards добавлены в CI",
    "10.4 - frontend API base variable mismatch исправлен",
    "10.5 - demo credentials убраны из production frontend",
    "10.6 - production initialization runbook подготовлен",
    "10.7 - README checkpoint после production initialization runbook",
    "10.8 - final develop gate перед production initialization",
    "10.9 - fast-forward main после зелёного gate",
    "10.10 - tag pre-production-init checkpoint",
    "10.11 - controlled production initialization по runbook",
    "Stage 12 - Course authoring / конструктор курсов",
    "docs/project-roadmap-after-stage9.md",
    "docs/production-initialization-runbook.md",
    "python .\\scripts\\check_project_roadmap_after_stage9.py",
    "python .\\scripts\\check_readme_stage10_state.py",
    "python .\\scripts\\check_frontend_api_base_config.py",
    "python .\\scripts\\check_frontend_no_demo_credentials.py",
    "python .\\scripts\\check_production_initialization_runbook.py",
    "Checkpoint 10.1 - post Stage 9 project roadmap",
    "Checkpoint 10.6 - production initialization runbook",
    "`develop`: `a1b5962`",
    "`main`: `79c64c0`",
]

FORBIDDEN_MARKERS = [
    "6.40.1 - актуализация README.md",
    "6.40.2 - полный quality gate",
    "6.40.3 - commit / push / fast-forward merge develop → main",
    "К следующему функциональному блоку `6.41",
    "10.6 — подготовить production initialization runbook",
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

    checkpoint_10_1_count = text.count("Checkpoint 10.1 - post Stage 9 project roadmap")
    checkpoint_10_6_count = text.count("Checkpoint 10.6 - production initialization runbook")
    stage12_count = text.count("Course authoring") + text.count("конструктор курсов")
    stage10_count = text.count("Stage 10") + text.count("10.")

    if checkpoint_10_1_count != 1:
        raise SystemExit(f"expected exactly one Stage 10.1 checkpoint, got {checkpoint_10_1_count}")

    if checkpoint_10_6_count != 1:
        raise SystemExit(f"expected exactly one Stage 10.6 checkpoint, got {checkpoint_10_6_count}")

    if stage12_count < 3:
        raise SystemExit(f"expected at least 3 course authoring markers, got {stage12_count}")

    if stage10_count < 12:
        raise SystemExit(f"expected at least 12 Stage 10 markers, got {stage10_count}")

    print(
        "README Stage 10 state diagnostics passed: "
        f"checkpoint_10_1_count={checkpoint_10_1_count}, "
        f"checkpoint_10_6_count={checkpoint_10_6_count}, "
        f"stage12_markers={stage12_count}, "
        f"stage10_markers={stage10_count}, markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()

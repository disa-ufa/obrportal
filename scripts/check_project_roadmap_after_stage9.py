from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "project-roadmap-after-stage9.md"

REQUIRED_MARKERS = [
    "# ObrPortal roadmap after Stage 9",
    "Version: `v0.1.0-stage6-ops9`",
    "Base checkpoint: `79c64c0`",
    "Release tag: `v0.1.0-stage6-ops9`",
    "Stage 10 — Production data initialization / controlled readiness",
    "Stage 11 — Production hardening",
    "Stage 12 — Course authoring / конструктор курсов",
    "Stage 13 — Learning flow / прохождение курсов",
    "Stage 14 — Documents / certificates / verification",
    "Stage 15 — Admin UX / operator workflow",
    "Stage 16 — Integrations",
    "Stage 17 — Backup and monitoring automation",
    "Stage 18 — Beta release / acceptance",
    "The course authoring module must be a separate development stage.",
    "create course",
    "create modules",
    "create lessons",
    "attach lesson materials",
    "preview course as learner",
    "show published course in public catalog",
    "only `published` courses are visible in public catalog",
    "Update project documentation after Stage 9",
    "Add Stage 9 guards to CI where appropriate",
    "Fix frontend API base variable mismatch",
    "Remove demo credentials from production login",
    "Prepare production initialization runbook",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Current stable checkpoint",
    "## 3. Important correction",
    "## 4. Stage 10 — Production data initialization / controlled readiness",
    "## 5. Stage 11 — Production hardening",
    "## 6. Stage 12 — Course authoring / конструктор курсов",
    "## 7. Stage 13 — Learning flow / прохождение курсов",
    "## 8. Stage 14 — Documents / certificates / verification",
    "## 9. Stage 15 — Admin UX / operator workflow",
    "## 10. Stage 16 — Integrations",
    "## 11. Stage 17 — Backup and monitoring automation",
    "## 12. Stage 18 — Beta release / acceptance",
    "## 13. Immediate next technical actions",
    "## 14. Acceptance criteria",
]


def main() -> None:
    if not DOC.exists():
        raise SystemExit(f"missing required document: {DOC.relative_to(ROOT)}")

    text = DOC.read_text(encoding="utf-8")

    missing = [
        marker
        for marker in [*REQUIRED_MARKERS, *REQUIRED_SECTIONS]
        if marker not in text
    ]

    if missing:
        print("project roadmap after Stage 9 diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    stage_mentions = text.count("Stage ")
    course_mentions = text.lower().count("course")
    safety_mentions = text.count("production")

    if sections < 14:
        raise SystemExit(f"expected at least 14 sections, got {sections}")

    if stage_mentions < 20:
        raise SystemExit(f"expected at least 20 stage mentions, got {stage_mentions}")

    if course_mentions < 15:
        raise SystemExit(f"expected at least 15 course mentions, got {course_mentions}")

    if safety_mentions < 10:
        raise SystemExit(f"expected at least 10 production mentions, got {safety_mentions}")

    print(
        "project roadmap after Stage 9 diagnostics passed: "
        f"sections={sections}, stage_mentions={stage_mentions}, "
        f"course_mentions={course_mentions}, production_mentions={safety_mentions}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()

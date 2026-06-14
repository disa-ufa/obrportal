from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs" / "stage82-organization-attention-reason-badges.md"


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.28 organization attention reason badges guard failed: {message}")


def read_required(path: Path) -> str:
    if not path.exists():
        fail(f"{path.relative_to(ROOT)} is missing")
    return path.read_text(encoding="utf-8")


def main() -> None:
    panel = read_required(PANEL)
    doc = read_required(DOC)

    panel_markers = [
        "stage82_28_organization_attention_reason_badges",
        "ORGANIZATION_ATTENTION_REASON_BADGE_LABELS",
        "getOrganizationAttentionReasonBadgeToneClass",
        "buildOrganizationAttentionReasonBadges",
        "no_email",
        "not_completed",
        "no_document",
        "unpublished_document",
        "revoked_document",
        "published_document",
        "data-stage-reason-badges",
        "data-reason-count",
        "organization-learning-attention-reason-badges",
        "organization-learning-attention-reason-badge",
        "data-reason-id",
    ]
    missing_panel = [marker for marker in panel_markers if marker not in panel]
    if missing_panel:
        fail("missing panel markers: " + ", ".join(missing_panel))

    doc_markers = [
        "Stage 82.28",
        "Frontend-only",
        "reason badges",
        "missing document",
        "unfinished learning",
        "missing email",
        "unpublished document",
        "revoked document",
        "Backend unchanged",
        "Database unchanged",
        "No migration required",
    ]
    missing_doc = [marker for marker in doc_markers if marker not in doc]
    if missing_doc:
        fail("missing doc markers: " + ", ".join(missing_doc))

    print("stage 82.28 organization attention reason badges guard passed")


if __name__ == "__main__":
    main()

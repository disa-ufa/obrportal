from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs" / "stage82-organization-attention-reason-filters.md"


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.30 organization attention reason filters guard failed: {message}")


def read_required(path: Path) -> str:
    if not path.exists():
        fail(f"{path.relative_to(ROOT)} is missing")
    return path.read_text(encoding="utf-8")


def main() -> None:
    panel = read_required(PANEL)
    doc = read_required(DOC)

    panel_markers = [
        "stage82_30_organization_attention_reason_filters",
        "ORGANIZATION_ATTENTION_REASON_FILTER_LABELS",
        "ORGANIZATION_ATTENTION_REASON_FILTERS",
        "enrollmentMatchesOrganizationAttentionReasonFilter",
        "buildOrganizationAttentionReasonFilterCounts",
        "selectedReasonFilterId",
        "setSelectedReasonFilterId",
        "reasonFilterCounts",
        "selectedReasonFilter",
        "reasonFilteredItems",
        "data-stage-reason-filters",
        "data-selected-reason-filter",
        "data-selected-reason-filter-count",
        "organization-learning-attention-reason-filters",
        "organization-learning-attention-reason-filter-button",
        "data-reason-filter-id",
        "buildOrganizationLearningAttentionExportRows(",
        "reasonFilteredItems,",
        "selectedFilter,",
        "selectedReasonFilter",
    ]
    missing_panel = [marker for marker in panel_markers if marker not in panel]
    if missing_panel:
        fail("missing panel markers: " + ", ".join(missing_panel))

    doc_markers = [
        "Stage 82.30",
        "Frontend-only",
        "reason filters",
        "missing email",
        "unfinished learning",
        "missing document",
        "unpublished document",
        "revoked document",
        "published document",
        "CSV export now respect",
        "Backend unchanged",
        "Database unchanged",
        "No migration required",
    ]
    missing_doc = [marker for marker in doc_markers if marker not in doc]
    if missing_doc:
        fail("missing doc markers: " + ", ".join(missing_doc))

    print("stage 82.30 organization attention reason filters guard passed")


if __name__ == "__main__":
    main()

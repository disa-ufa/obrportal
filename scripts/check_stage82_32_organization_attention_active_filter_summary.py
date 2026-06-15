from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs" / "stage82-organization-attention-active-filter-summary.md"


def fail(message: str) -> None:
    raise SystemExit(
        f"stage 82.32 organization attention active filter summary guard failed: {message}"
    )


def read_required(path: Path) -> str:
    if not path.exists():
        fail(f"{path.relative_to(ROOT)} is missing")
    return path.read_text(encoding="utf-8")


def main() -> None:
    panel = read_required(PANEL)
    doc = read_required(DOC)

    panel_markers = [
        "stage82_32_organization_attention_active_filter_summary",
        "ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY_LABELS",
        "handleResetOrganizationAttentionReasonFilter",
        "handleResetOrganizationAttentionQuickFilter",
        "setSelectedReasonFilterId(readOrganizationAttentionStoredReasonFilter(defaultAttentionFilterId))",
        "data-stage-active-filter-summary",
        "data-active-summary-count",
        "organization-learning-attention-active-filter-summary",
        "organization-learning-attention-active-quick-filter",
        "organization-learning-attention-active-reason-filter",
        "organization-learning-attention-active-filtered-count",
        "organization-learning-attention-reset-reason-filter",
        "organization-learning-attention-reset-quick-filter",
        "selectedReasonFilter.id === \"all\"",
        "selectedFilter.id === ORGANIZATION_LEARNING_ATTENTION_FILTERS[0].id",
    ]
    missing_panel = [marker for marker in panel_markers if marker not in panel]
    if missing_panel:
        fail("missing panel markers: " + ", ".join(missing_panel))

    doc_markers = [
        "Stage 82.32",
        "Frontend-only",
        "active filter summary",
        "selected quick attention list",
        "selected reason filter",
        "filtered record count",
        "reset reason filter",
        "reset quick attention list",
        "Backend unchanged",
        "Database unchanged",
        "No migration required",
    ]
    missing_doc = [marker for marker in doc_markers if marker not in doc]
    if missing_doc:
        fail("missing doc markers: " + ", ".join(missing_doc))

    print("stage 82.32 organization attention active filter summary guard passed")


if __name__ == "__main__":
    main()

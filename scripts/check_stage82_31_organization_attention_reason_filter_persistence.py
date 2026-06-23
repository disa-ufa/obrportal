from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs" / "stage82-organization-attention-reason-filter-persistence.md"


def fail(message: str) -> None:
    raise SystemExit(
        f"stage 82.31 organization attention reason filter persistence guard failed: {message}"
    )


def read_required(path: Path) -> str:
    if not path.exists():
        fail(f"{path.relative_to(ROOT)} is missing")
    return path.read_text(encoding="utf-8")


def main() -> None:
    panel = read_required(PANEL)
    doc = read_required(DOC)

    panel_markers = [
        "stage82_31_organization_attention_reason_filter_persistence",
        "ORGANIZATION_ATTENTION_REASON_FILTER_STORAGE_KEY",
        "obrportal.organization.attention.reasonFilters.v1",
        "normalizeOrganizationAttentionReasonFilterId",
        "readOrganizationAttentionStoredReasonFilters",
        "readOrganizationAttentionStoredReasonFilter",
        "saveOrganizationAttentionStoredReasonFilter",
        "readOrganizationAttentionStoredReasonFilter(ORGANIZATION_LEARNING_ATTENTION_FILTERS[0].id)",
        "readOrganizationAttentionStoredReasonFilter(selectedFilter.id)",
        "handleSelectOrganizationAttentionReasonFilter",
        "saveOrganizationAttentionStoredReasonFilter(selectedFilter.id, normalizedReasonFilterId)",
        "handleSelectOrganizationAttentionReasonFilter(filter.id)",
        "data-stage-reason-filter-persistence",
        "data-reason-filter-storage-key",
    ]
    missing_panel = [marker for marker in panel_markers if marker not in panel]
    if missing_panel:
        fail("missing panel markers: " + ", ".join(missing_panel))

    doc_markers = [
        "Stage 82.31",
        "Frontend-only",
        "localStorage",
        "per quick attention list",
        "restored",
        "normalized to “all”",
        "Backend unchanged",
        "Database unchanged",
        "No migration required",
    ]
    missing_doc = [marker for marker in doc_markers if marker not in doc]
    if missing_doc:
        fail("missing doc markers: " + ", ".join(missing_doc))

    print("stage 82.31 organization attention reason filter persistence guard passed")


if __name__ == "__main__":
    main()

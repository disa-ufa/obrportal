from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs" / "stage82-organization-overview-search-filters.md"


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.23 organization overview search filters guard failed: {message}")


def require_file(path: Path) -> str:
    if not path.exists():
        fail(f"{path.relative_to(ROOT)} is missing")
    return path.read_text(encoding="utf-8")


def main() -> None:
    panel = require_file(PANEL)
    doc = require_file(DOC)

    markers = [
        "stage82_23_organization_overview_search_filters",
        "ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS",
        "ORGANIZATION_OVERVIEW_LEARNING_STATUS_FILTERS",
        "ORGANIZATION_OVERVIEW_DOCUMENT_STATUS_FILTERS",
        "filterOrganizationLearningOverviewEnrollments",
        "enrollmentMatchesOverviewSearch",
        "enrollmentMatchesOverviewLearningStatus",
        "enrollmentMatchesOverviewDocumentStatus",
        "organization-learning-overview-search-filters",
        "organization-learning-overview-search-input",
        "organization-learning-overview-learning-filter",
        "organization-learning-overview-document-filter",
        "organization-learning-overview-filter-reset",
        "organization-learning-overview-filter-summary",
        "data-filtered-enrollments",
        "enrollments={filteredEnrollments}",
    ]

    missing = [marker for marker in markers if marker not in panel]
    if missing:
        fail("missing panel markers: " + ", ".join(missing))

    doc_markers = [
        "Stage 82.23",
        "Frontend-only",
        "Backend unchanged",
        "Database unchanged",
        "No migration required",
    ]
    missing_doc = [marker for marker in doc_markers if marker not in doc]
    if missing_doc:
        fail("missing doc markers: " + ", ".join(missing_doc))

    print("stage 82.23 organization overview search filters guard passed")


if __name__ == "__main__":
    main()

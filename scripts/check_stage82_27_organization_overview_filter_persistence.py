from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs" / "stage82-organization-overview-filter-persistence.md"


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.27 organization overview filter persistence guard failed: {message}")


def read_required(path: Path) -> str:
    if not path.exists():
        fail(f"{path.relative_to(ROOT)} is missing")
    return path.read_text(encoding="utf-8")


def main() -> None:
    panel = read_required(PANEL)
    doc = read_required(DOC)

    panel_markers = [
        "stage82_27_organization_overview_filter_persistence",
        "ORGANIZATION_OVERVIEW_FILTER_STORAGE_KEY",
        "readOrganizationOverviewStoredFilters",
        "saveOrganizationOverviewStoredFilters",
        "window.localStorage.getItem",
        "window.localStorage.setItem",
        "storedOverviewFilters",
        "activeOverviewFilterLabels",
        "data-stage-filter-persistence",
        "data-active-filter-count",
        "organization-learning-overview-clear-search",
        "organization-learning-overview-active-filter-chips",
        "organization-learning-overview-active-filter-chip",
    ]
    missing_panel = [marker for marker in panel_markers if marker not in panel]
    if missing_panel:
        fail("missing panel markers: " + ", ".join(missing_panel))

    doc_markers = [
        "Stage 82.27",
        "Frontend-only",
        "localStorage",
        "clear search",
        "active filter chips",
        "Backend unchanged",
        "Database unchanged",
        "No migration required",
    ]
    missing_doc = [marker for marker in doc_markers if marker not in doc]
    if missing_doc:
        fail("missing doc markers: " + ", ".join(missing_doc))

    print("stage 82.27 organization overview filter persistence guard passed")


if __name__ == "__main__":
    main()

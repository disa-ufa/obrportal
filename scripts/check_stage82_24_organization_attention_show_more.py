from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs" / "stage82-organization-attention-show-more.md"


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.24 organization attention show more guard failed: {message}")


def read_required(path: Path) -> str:
    if not path.exists():
        fail(f"{path.relative_to(ROOT)} is missing")
    return path.read_text(encoding="utf-8")


def main() -> None:
    panel = read_required(PANEL)
    doc = read_required(DOC)

    panel_markers = [
        "stage82_24_organization_attention_show_more",
        "ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT",
        "ORGANIZATION_ATTENTION_SHOW_MORE_LABELS",
        "const [visibleLimit, setVisibleLimit]",
        "hiddenItemsCount",
        "canShowMore",
        "canCollapse",
        "data-stage-show-more",
        "data-visible-count",
        "data-hidden-count",
        "organization-learning-attention-show-more",
        "organization-learning-attention-visible-summary",
        "organization-learning-attention-show-more-button",
        "organization-learning-attention-show-all-button",
        "organization-learning-attention-collapse-button",
        "setVisibleLimit(selectedItems.length)",
    ]
    missing_panel = [marker for marker in panel_markers if marker not in panel]
    if missing_panel:
        fail("missing panel markers: " + ", ".join(missing_panel))

    doc_markers = [
        "Stage 82.24",
        "Frontend-only",
        "show more",
        "show all",
        "collapse",
        "Backend unchanged",
        "Database unchanged",
        "No migration required",
    ]
    missing_doc = [marker for marker in doc_markers if marker not in doc]
    if missing_doc:
        fail("missing doc markers: " + ", ".join(missing_doc))

    print("stage 82.24 organization attention show more guard passed")


if __name__ == "__main__":
    main()

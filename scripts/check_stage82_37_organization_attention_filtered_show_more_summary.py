from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend/src/components/organization/OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs/stage82-organization-attention-filtered-show-more-summary.md"

def fail(message: str) -> None:
    raise SystemExit(
        f"stage 82.37 organization attention filtered show more summary guard failed: {message}"
    )

panel = PANEL.read_text(encoding="utf-8")
doc = DOC.read_text(encoding="utf-8")

markers = [
    "stage82_37_organization_attention_filtered_show_more_summary",
    "STAGE82_ORGANIZATION_ATTENTION_FILTERED_SHOW_MORE_SUMMARY",
    "data-stage-filtered-show-more-summary",
    "data-stage-filtered-summary",
    "data-filtered-show-more-total={reasonFilteredItems.length}",
    "{reasonFilteredItems.length}",
    "Math.min(",
    "reasonFilteredItems.length",
    "onClick={() => setVisibleLimit(reasonFilteredItems.length)}",
]

missing = [marker for marker in markers if marker not in panel]
if missing:
    fail("missing panel markers: " + ", ".join(missing))

for forbidden in [
    "{selectedItems.length}",
    "selectedItems.length\n                      )",
    "setVisibleLimit(selectedItems.length)",
]:
    if forbidden in panel:
        fail("old selectedItems show-more total is still present: " + forbidden)

doc_markers = [
    "Stage 82.37",
    "Frontend-only",
    "reason-filtered item count",
    "show all",
    "show more",
    "Backend unchanged",
    "Database unchanged",
    "No migration required",
]

missing_doc = [marker for marker in doc_markers if marker not in doc]
if missing_doc:
    fail("missing doc markers: " + ", ".join(missing_doc))

print("stage 82.37 organization attention filtered show more summary guard passed")

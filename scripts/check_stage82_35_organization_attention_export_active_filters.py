from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend/src/components/organization/OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs/stage82-organization-attention-export-active-filters.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 82.35 organization attention export active filters guard failed: {message}")

panel = PANEL.read_text(encoding="utf-8")
doc = DOC.read_text(encoding="utf-8")

markers = [
    "stage82_35_organization_attention_export_active_filters",
    "ORGANIZATION_ATTENTION_EXPORT_ACTIVE_FILTER_LABELS",
    "activeReason: \"Активная причина\"",
    "activeReasonId: \"ID активной причины\"",
    'key: "active_reason_filter"',
    'key: "active_reason_filter_id"',
    "buildOrganizationAttentionExportFilenamePrefix",
    "organization-attention-${filterId}-${reasonFilterId}",
    "active_reason_filter: reasonFilter?.label || \"\"",
    "active_reason_filter_id: reasonFilter?.id || \"\"",
    "data-stage-export-active-filters",
    "data-export-active-reason-filter",
    "data-export-filename-prefix",
    "buildOrganizationLearningAttentionExportRows(",
    "selectedReasonFilter",
]

missing = [marker for marker in markers if marker not in panel]
if missing:
    fail("missing panel markers: " + ", ".join(missing))

doc_markers = [
    "Stage 82.35",
    "Frontend-only",
    "CSV filename",
    "selected quick attention list id",
    "selected reason filter id",
    "active reason filter label",
    "active reason filter id",
    "Backend unchanged",
    "Database unchanged",
    "No migration required",
]

missing_doc = [marker for marker in doc_markers if marker not in doc]
if missing_doc:
    fail("missing doc markers: " + ", ".join(missing_doc))

print("stage 82.35 organization attention export active filters guard passed")

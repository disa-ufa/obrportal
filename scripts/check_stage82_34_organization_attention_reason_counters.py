from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend/src/components/organization/OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs/stage82-organization-attention-reason-counters.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 82.34 organization attention reason counters guard failed: {message}")

panel = PANEL.read_text(encoding="utf-8")
doc = DOC.read_text(encoding="utf-8")

markers = [
    "stage82_34_organization_attention_reason_counters",
    "ORGANIZATION_ATTENTION_REASON_COUNTER_LABELS",
    "getOrganizationAttentionReasonFilterButtonClass",
    "getOrganizationAttentionReasonCounterBadgeClass",
    "reasonFiltersWithRecordsCount",
    "reasonFiltersWithoutRecordsCount",
    "data-stage-reason-counters",
    "data-stage-counters",
    "data-reason-filters-with-records",
    "data-reason-filters-without-records",
    "data-reason-selected",
    "data-reason-count",
    "data-reason-has-records",
    "organization-learning-attention-reason-filter-count",
    "organization-learning-attention-reason-counter-summary",
    "Есть записи",
    "Без записей",
    "grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
]

missing = [marker for marker in markers if marker not in panel]
if missing:
    fail("missing panel markers: " + ", ".join(missing))

doc_markers = [
    "Stage 82.34",
    "Frontend-only",
    "reason filter counters",
    "Active reason filter",
    "separate badge",
    "zero records",
    "Backend unchanged",
    "Database unchanged",
    "No migration required",
]

missing_doc = [marker for marker in doc_markers if marker not in doc]
if missing_doc:
    fail("missing doc markers: " + ", ".join(missing_doc))

print("stage 82.34 organization attention reason counters guard passed")

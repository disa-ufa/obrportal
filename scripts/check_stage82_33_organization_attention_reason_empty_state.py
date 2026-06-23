from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend/src/components/organization/OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs/stage82-organization-attention-reason-empty-state.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 82.33 organization attention reason empty state guard failed: {message}")

panel = PANEL.read_text(encoding="utf-8")
doc = DOC.read_text(encoding="utf-8")

markers = [
    "stage82_33_organization_attention_reason_empty_state",
    "ORGANIZATION_ATTENTION_REASON_EMPTY_STATE_LABELS",
    "getOrganizationAttentionReasonEmptyStateText",
    "По причине «${selectedReasonFilter.label}» в списке «${selectedFilter.label}» записей нет.",
    "data-stage-reason-empty-state",
    "data-empty-reason-filter",
    "data-empty-quick-filter",
    "organization-learning-attention-empty-message",
    "organization-learning-attention-empty-reset-reason",
    "handleResetOrganizationAttentionReasonFilter",
    'selectedReasonFilter.id !== "all"',
]

missing = [marker for marker in markers if marker not in panel]
if missing:
    fail("missing panel markers: " + ", ".join(missing))

doc_markers = [
    "Stage 82.33",
    "Frontend-only",
    "specific empty state",
    "selected quick attention list",
    "selected reason filter",
    "reset reason button",
    "Backend unchanged",
    "Database unchanged",
    "No migration required",
]

missing_doc = [marker for marker in doc_markers if marker not in doc]
if missing_doc:
    fail("missing doc markers: " + ", ".join(missing_doc))

print("stage 82.33 organization attention reason empty state guard passed")

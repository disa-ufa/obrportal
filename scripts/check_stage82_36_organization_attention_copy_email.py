from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend/src/components/organization/OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs/stage82-organization-attention-copy-email.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 82.36 organization attention copy email guard failed: {message}")

panel = PANEL.read_text(encoding="utf-8")
doc = DOC.read_text(encoding="utf-8")

markers = [
    "stage82_36_organization_attention_copy_email",
    "STAGE82_ORGANIZATION_ATTENTION_COPY_EMAIL",
    "ORGANIZATION_ATTENTION_COPY_EMAIL_LABELS",
    "copyEmail: \"Скопировать email\"",
    "const hasEmail = Boolean(enrollment.user_email)",
    "const emailActionId = `email-${enrollment.id}`",
    "data-stage-copy-email",
    "data-has-email={hasEmail ? \"true\" : \"false\"}",
    "organization-learning-attention-copy-email-button",
    "data-stage={STAGE82_ORGANIZATION_ATTENTION_COPY_EMAIL}",
    "handleCopyOrganizationAttentionDocumentAction(",
    "emailActionId,",
    "enrollment.user_email",
    "copiedActionId === emailActionId",
    "ORGANIZATION_ATTENTION_COPY_EMAIL_LABELS.copyEmail",
]

missing = [marker for marker in markers if marker not in panel]
if missing:
    fail("missing panel markers: " + ", ".join(missing))

doc_markers = [
    "Stage 82.36",
    "Frontend-only",
    "copy email",
    "learner email exists",
    "clipboard feedback",
    "Backend unchanged",
    "Database unchanged",
    "No migration required",
]

missing_doc = [marker for marker in doc_markers if marker not in doc]
if missing_doc:
    fail("missing doc markers: " + ", ".join(missing_doc))

print("stage 82.36 organization attention copy email guard passed")

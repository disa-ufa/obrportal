from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs" / "stage82-organization-attention-card-details.md"


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.25 organization attention card details guard failed: {message}")


def read_required(path: Path) -> str:
    if not path.exists():
        fail(f"{path.relative_to(ROOT)} is missing")
    return path.read_text(encoding="utf-8")


def main() -> None:
    panel = read_required(PANEL)
    doc = read_required(DOC)

    panel_markers = [
        "stage82_25_organization_attention_card_details",
        "ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS",
        "formatOrganizationAttentionDate",
        "getOrganizationAttentionEmailLabel",
        "getOrganizationAttentionDocumentNumberLabel",
        "getOrganizationAttentionVerificationCodeLabel",
        "data-stage-card-details",
        "data-learning-status",
        "data-document-status",
        "organization-learning-attention-card-details",
        "getEnrollmentStatusLabel(enrollment.status)",
        "enrollment.completed_at",
        "enrollment.document?.document_number",
        "enrollment.document?.verification_code",
    ]
    missing_panel = [marker for marker in panel_markers if marker not in panel]
    if missing_panel:
        fail("missing panel markers: " + ", ".join(missing_panel))

    doc_markers = [
        "Stage 82.25",
        "Frontend-only",
        "learning status",
        "learner email",
        "completion date",
        "document number",
        "verification code",
        "Backend unchanged",
        "Database unchanged",
        "No migration required",
    ]
    missing_doc = [marker for marker in doc_markers if marker not in doc]
    if missing_doc:
        fail("missing doc markers: " + ", ".join(missing_doc))

    print("stage 82.25 organization attention card details guard passed")


if __name__ == "__main__":
    main()

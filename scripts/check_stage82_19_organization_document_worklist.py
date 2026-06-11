from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FILES = {
    "org_api": ROOT / "backend" / "app" / "api" / "v1" / "org.py",
    "org_schema": ROOT / "backend" / "app" / "schemas" / "org.py",
    "org_section": ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationGroupEnrollmentsSection.jsx",
    "org_card": ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationGroupEnrollmentCard.jsx",
}

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.19 organization document worklist guard failed: {message}")


for name, path in FILES.items():
    if not path.exists():
        fail(f"{name} file is missing: {path}")

texts = {name: path.read_text(encoding="utf-8") for name, path in FILES.items()}

for name in ("org_section", "org_card"):
    text = texts[name]
    if EMAIL_RE.search(text):
        fail(f"{name} contains raw email-like value")
    if PHONE_RE.search(text):
        fail(f"{name} contains raw phone-like value")

required = {
    "org_schema": [
        "class OrgEnrollmentDocumentItem(BaseModel):",
        "document: OrgEnrollmentDocumentItem | None = None",
        "public_verify_path: str | None = None",
        "file_available: bool = False",
    ],
    "org_api": [
        "from app.models.document_record import DocumentRecord",
        "OrgEnrollmentDocumentItem",
        "def build_org_enrollment_document_item(row) -> OrgEnrollmentDocumentItem | None:",
        "public_verify_path = (",
        "document=build_org_enrollment_document_item(row)",
        'DocumentRecord.id.label("document_id")',
        'DocumentRecord.status.label("document_status")',
        'DocumentRecord.verification_code.label("document_verification_code")',
        ".outerjoin(DocumentRecord, DocumentRecord.enrollment_id == Enrollment.id)",
    ],
    "org_section": [
        "const STAGE82_ORGANIZATION_DOCUMENT_WORKLIST =",
        '"stage82_19_organization_document_worklist"',
        "const ORGANIZATION_DOCUMENT_WORKLIST_LABELS =",
        "function getOrganizationDocumentWorklistStats(enrollments = [])",
        "function OrganizationDocumentWorklistPanel({ groupEnrollments })",
        'data-testid="organization-document-worklist"',
        "data-stage={STAGE82_ORGANIZATION_DOCUMENT_WORKLIST}",
        'data-testid="organization-document-worklist-summary"',
        'data-testid="organization-document-worklist-items"',
        'data-testid="organization-document-worklist-item"',
        'data-testid="organization-document-worklist-empty"',
        "<OrganizationDocumentWorklistPanel groupEnrollments={groupEnrollments} />",
    ],
    "org_card": [
        "function getEnrollmentDocumentMiniStatusLabel(status)",
        "function getEnrollmentDocumentMiniStatusTone(status)",
        "const documentItem = enrollment.document;",
        'data-testid="organization-enrollment-document-mini-status"',
    ],
}

for name, markers in required.items():
    text = texts[name]
    for marker in markers:
        if marker not in text:
            fail(f"{name} missing marker: {marker}")

print("stage 82.19 organization document worklist guard passed")

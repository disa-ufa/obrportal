from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_DETAIL_PAGE = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
CLIENT = ROOT / "frontend" / "src" / "api" / "client.js"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.15 learner document availability handoff guard failed: {message}")


course_text = COURSE_DETAIL_PAGE.read_text(encoding="utf-8")
client_text = CLIENT.read_text(encoding="utf-8")

for label, text in {
    "CourseDetailPage.jsx": course_text,
    "client.js": client_text,
}.items():
    if EMAIL_RE.search(text):
        fail(f"{label} contains raw email-like value")
    if PHONE_RE.search(text):
        fail(f"{label} contains raw phone-like value")

course_markers = [
    'const STAGE82_LEARNER_DOCUMENT_AVAILABILITY_HANDOFF = "stage82_15_learner_document_availability_handoff"',
    "const LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS = {",
    "function getLearnerDocumentAvailabilityHandoffDocument(course, existingEnrollment, accountDocuments = [])",
    "function getLearnerDocumentAvailabilityHandoffMeta({",
    "function getLearnerDocumentVerificationValue(documentItem)",
    "function getLearnerDocumentVerificationPath(documentItem)",
    "documentItem = getLearnerDocumentAvailabilityHandoffDocument(course, existingEnrollment, accountDocuments)",
    "availability = getLearnerDocumentAvailabilityHandoffMeta({",
    "accountDocuments={accountDocuments}",
    "documentsLoading={accountDocumentsLoading}",
    "documentsError={accountDocumentsError || accountDocumentDownloadError}",
    "onDownloadDocument={handleDownloadAccountDocument}",
    "downloadAccountDocument(documentItem.id)",
    "getAccountDocuments({",
    'data-testid="learner-document-handoff-availability-panel"',
    'data-testid="learner-document-handoff-document-card"',
    'data-testid="learner-document-handoff-download-action"',
    'data-testid="learner-document-handoff-public-verify-action"',
    'data-testid="learner-document-handoff-download-state"',
    "DocumentVerificationQrBlock",
    "data-document-availability-state={facts.availability.key}",
    "STAGE82_LEARNER_DOCUMENT_AVAILABILITY_HANDOFF",
]

for marker in course_markers:
    if marker not in course_text:
        fail(f"CourseDetailPage.jsx missing marker: {marker}")

client_markers = [
    "export async function getAccountDocuments(filters = {})",
    "const params = new URLSearchParams();",
    "Object.entries(filters).forEach",
    "return request(`/api/v1/account/documents${query ? `?${query}` : \"\"}`);",
    "export async function downloadAccountDocument(documentId)",
]

for marker in client_markers:
    if marker not in client_text:
        fail(f"client.js missing marker: {marker}")

print("stage 82.15 learner document availability handoff guard passed")

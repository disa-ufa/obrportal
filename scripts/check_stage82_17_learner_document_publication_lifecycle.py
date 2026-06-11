from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_DETAIL_PAGE = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.17 learner document publication lifecycle guard failed: {message}")


text = COURSE_DETAIL_PAGE.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("CourseDetailPage.jsx contains raw email-like value")
if PHONE_RE.search(text):
    fail("CourseDetailPage.jsx contains raw phone-like value")

required_markers = [
    'const STAGE82_LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE = "stage82_17_learner_document_publication_lifecycle"',
    "const LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS = {",
    "function getLearnerDocumentPublicationLifecycleState({",
    "function getLearnerDocumentPublicationLifecycleStepTone(stepState = \"\")",
    "function getLearnerDocumentPublicationLifecycleBadgeLabel(stepState = \"\")",
    "function getLearnerDocumentPublicationLifecycleSummary(state = \"\")",
    "function getLearnerDocumentPublicationLifecycleSteps({",
    "const publicationLifecycleState = getLearnerDocumentPublicationLifecycleState({",
    "const publicationLifecycleSteps = getLearnerDocumentPublicationLifecycleSteps({",
    "data-testid=\"learner-document-publication-lifecycle-panel\"",
    "data-stage={STAGE82_LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE}",
    "data-publication-lifecycle-state={publicationLifecycleState}",
    "data-testid=\"learner-document-publication-lifecycle-steps\"",
    "data-testid={`learner-document-publication-lifecycle-step-${step.key}`}",
    "data-publication-step-state={step.state}",
    "LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publication",
    "LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publicationAvailable",
    "LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.downloadAndVerify",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

print("stage 82.17 learner document publication lifecycle guard passed")

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS_PAGE = ROOT / "frontend" / "src" / "pages" / "DocumentsPage.jsx"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.18 admin generated document publication workflow guard failed: {message}")


text = DOCUMENTS_PAGE.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("DocumentsPage.jsx contains raw email-like value")
if PHONE_RE.search(text):
    fail("DocumentsPage.jsx contains raw phone-like value")

required_markers = [
    'const STAGE82_ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW =',
    '"stage82_18_admin_generated_document_publication_workflow"',
    "const ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS = {",
    "function getGeneratedDocumentPublicationWorkflowStats(documents = [])",
    "function getGeneratedDocumentPublicationWorkflowTone(stats)",
    "function getGeneratedDocumentPublicationWorkflowFocusText(stats)",
    "function GeneratedDocumentPublicationWorkflowPanel({",
    "data-testid=\"admin-generated-document-publication-workflow\"",
    "data-stage={STAGE82_ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW}",
    "data-generated-publication-ready={stats.readyCount}",
    "data-testid=\"admin-generated-document-publication-workflow-summary\"",
    "data-testid=\"admin-generated-document-publication-workflow-actions\"",
    "data-testid=\"admin-generated-document-publication-ready-list\"",
    "data-testid=\"admin-generated-document-publication-ready-item\"",
    "data-testid=\"admin-generated-document-publication-publish-action\"",
    "data-testid=\"admin-generated-document-publication-empty\"",
    "canPublishGeneratedCompletionDocument",
    "onPublishDocument={(documentItem) => handleQuickStatusUpdate(documentItem, \"available\")}",
    "statusSavingKey={statusSavingKey}",
    "deleteSavingId={deleteSavingId}",
    "q: \"AUTO-\"",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

print("stage 82.18 admin generated document publication workflow guard passed")

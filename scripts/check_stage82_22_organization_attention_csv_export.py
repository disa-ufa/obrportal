from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OVERVIEW = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.22 organization attention CSV export guard failed: {message}")


if not OVERVIEW.exists():
    fail("OrganizationLearningOverviewPanel.jsx is missing")

text = OVERVIEW.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("overview contains raw email-like value")
if PHONE_RE.search(text):
    fail("overview contains raw phone-like value")

required_markers = [
    'import { buildDatedCsvFilename, downloadCsvFile } from "../../utils/exportCsv";',
    "const STAGE82_ORGANIZATION_ATTENTION_CSV_EXPORT =",
    '"stage82_22_organization_attention_csv_export"',
    "const ORGANIZATION_ATTENTION_CSV_EXPORT_LABELS =",
    "const ORGANIZATION_LEARNING_ATTENTION_EXPORT_COLUMNS =",
    'label: "Email слушателя"',
    'label: "Публичная ссылка"',
    "function getEnrollmentStatusLabel(status)",
    "function formatEnrollmentDateTime(value)",
    "function buildOrganizationLearningAttentionExportRows(enrollments = [], filter)",
    "const selectedItems = buildOrganizationLearningAttentionItems(enrollments, selectedFilter.id);",
    "const visibleItems = selectedItems.slice(0, 8);",
    "function handleExportSelectedFilter()",
    "downloadCsvFile(",
    "buildDatedCsvFilename(`organization-attention-${selectedFilter.id}`)",
    "buildOrganizationLearningAttentionExportRows(selectedItems, selectedFilter)",
    "data-stage-export={STAGE82_ORGANIZATION_ATTENTION_CSV_EXPORT}",
    "data-export-count={selectedItems.length}",
    'data-testid="organization-learning-attention-export-button"',
    "visibleItems.length === 0",
    "{visibleItems.map((enrollment) => {",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

print("stage 82.22 organization attention CSV export guard passed")

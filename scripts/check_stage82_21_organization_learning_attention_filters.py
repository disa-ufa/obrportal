from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OVERVIEW = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.21 organization learning attention filters guard failed: {message}")


if not OVERVIEW.exists():
    fail("OrganizationLearningOverviewPanel.jsx is missing")

text = OVERVIEW.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("overview contains raw email-like value")
if PHONE_RE.search(text):
    fail("overview contains raw phone-like value")

required_markers = [
    'import React from "react";',
    "const STAGE82_ORGANIZATION_LEARNING_ATTENTION_FILTERS =",
    '"stage82_21_organization_learning_attention_filters"',
    "const ORGANIZATION_LEARNING_ATTENTION_LABELS =",
    "const ORGANIZATION_LEARNING_ATTENTION_FILTERS =",
    'id: "completed_without_document"',
    'id: "draft_documents"',
    'id: "available_documents"',
    'id: "revoked_documents"',
    'id: "active_learning"',
    "function getAttentionFilterToneClass(tone, selected = false)",
    "function buildOrganizationLearningAttentionFilterCounts(enrollments = [])",
    "function buildOrganizationLearningAttentionItems(enrollments = [], filterId)",
    "function OrganizationLearningAttentionFiltersPanel({",
    'data-testid="organization-learning-attention-filters"',
    "data-stage={STAGE82_ORGANIZATION_LEARNING_ATTENTION_FILTERS}",
    'data-testid="organization-learning-attention-filter-buttons"',
    'data-testid="organization-learning-attention-filter-button"',
    'data-testid="organization-learning-attention-items"',
    'data-testid="organization-learning-attention-item"',
    'data-testid="organization-learning-attention-empty"',
    "<OrganizationLearningAttentionFiltersPanel",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

print("stage 82.21 organization learning attention filters guard passed")

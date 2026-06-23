from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_DETAIL_PAGE = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.16 learner completion document focus guard failed: {message}")


text = COURSE_DETAIL_PAGE.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("CourseDetailPage.jsx contains raw email-like value")
if PHONE_RE.search(text):
    fail("CourseDetailPage.jsx contains raw phone-like value")

required_markers = [
    'useRef',
    'const STAGE82_LEARNER_COMPLETION_DOCUMENT_FOCUS = "stage82_16_learner_completion_document_focus"',
    "const LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS = {",
    "function getLearnerCompletionDocumentFocusKey(documentItem, documentsError = \"\")",
    "function getLearnerCompletionDocumentFocusMessage(documentItem, documentsError = \"\")",
    "function getLearnerCompletionDocumentFocusTone(focusKey = \"\")",
    "completionDocumentFocus = null",
    "onClearCompletionDocumentFocus",
    "documentHandoffRef",
    "data-testid=\"learner-completion-document-focus-banner\"",
    "data-testid=\"learner-completion-document-focus-dismiss\"",
    "data-completion-document-focus={completionDocumentFocus ? \"true\" : \"false\"}",
    "data-completion-document-focus-state={completionDocumentFocus.key}",
    "const [completionDocumentFocus, setCompletionDocumentFocus] = useState(null);",
    "const documentHandoffPanelRef = useRef(null);",
    "documentHandoffPanelRef.current?.scrollIntoView",
    "documentHandoffPanelRef.current?.focus",
    "setCompletionDocumentFocus({",
    "LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS.loading",
    "getLearnerDocumentAvailabilityHandoffDocument(",
    "getLearnerCompletionDocumentFocusKey(completedDocumentItem)",
    "getLearnerCompletionDocumentFocusMessage(completedDocumentItem)",
    "setCourseCompletionSuccess(LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS.courseCompleted)",
    "completionDocumentFocus={completionDocumentFocus}",
    "documentHandoffRef={documentHandoffPanelRef}",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

print("stage 82.16 learner completion document focus guard passed")

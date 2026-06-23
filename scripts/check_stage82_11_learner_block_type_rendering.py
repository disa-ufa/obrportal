from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_DETAIL_PAGE = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"

EMAIL_RE = re.compile(r"(?<![\\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}(?![\\w*.-])")
PHONE_RE = re.compile(r"(?<!\\d)(?:\\+7|8)\\d{10}(?!\\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.11 learner block type rendering guard failed: {message}")


text = COURSE_DETAIL_PAGE.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("CourseDetailPage.jsx contains raw email-like value")
if PHONE_RE.search(text):
    fail("CourseDetailPage.jsx contains raw phone-like value")

required_markers = [
    'const STAGE82_LEARNER_BLOCK_TYPE_RENDERING = "stage82_11_learner_block_type_rendering"',
    "function getLearnerLessonBlockViewerQuestion(block)",
    "function getLearnerLessonBlockViewerFileName(block)",
    "function getLearnerLessonBlockViewerActionLabel(blockType)",
    "function LearnerLessonBlockViewerBody({ block, blockType, text, url, href, options })",
    'data-testid="learner-lesson-block-viewer-video"',
    'data-testid="learner-lesson-block-viewer-file-link"',
    'data-testid="learner-lesson-block-viewer-quiz"',
    'data-testid="learner-lesson-block-viewer-assignment"',
    'data-testid="learner-lesson-block-viewer-callout"',
    'data-testid="learner-lesson-block-viewer-rich-text"',
    "{LEARNER_LESSON_BLOCK_VIEWER_LABELS.openVideo}",
    "{getLearnerLessonBlockViewerActionLabel(blockType)}",
    "{LEARNER_LESSON_BLOCK_VIEWER_LABELS.assignmentInstruction}",
    "{LEARNER_LESSON_BLOCK_VIEWER_LABELS.calloutNote}",
    "{LEARNER_LESSON_BLOCK_VIEWER_LABELS.richTextBody}",
    "<LearnerLessonBlockViewerBody",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

for unsupported_marker in [
    'data-testid="learner-lesson-block-viewer-open-link"',
    'blockType === "quiz" ?',
]:
    if unsupported_marker in text:
        fail(f"old generic/quiz-only renderer still present: {unsupported_marker}")

print("stage 82.11 learner block type rendering guard passed")

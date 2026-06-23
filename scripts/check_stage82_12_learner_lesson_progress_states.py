from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_DETAIL_PAGE = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.12 learner lesson progress states guard failed: {message}")


text = COURSE_DETAIL_PAGE.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("CourseDetailPage.jsx contains raw email-like value")
if PHONE_RE.search(text):
    fail("CourseDetailPage.jsx contains raw phone-like value")

required_markers = [
    'const STAGE82_LEARNER_LESSON_PROGRESS_STATES = "stage82_12_learner_lesson_progress_states"',
    "const LEARNER_LESSON_PROGRESS_STATE_LABELS = {",
    "function getLearnerLessonProgressState(lesson, selectedLessonId",
    "function getLearnerLessonProgressButtonClass(progressState, selected)",
    'data-testid="learner-lesson-progress-state"',
    'data-testid="learner-lesson-block-viewer-progress-state"',
    'data-testid="learner-completion-action-progress-state"',
    "data-progress-state={progressState.key}",
    "getLearnerLessonProgressState(lesson, selectedLessonId)",
    "progressState, canCompleteLesson",
    "notStarted:",
    "inProgress:",
    "completed:",
    "unavailable:",
    "completionReady:",
    "completionLocked:",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

print("stage 82.12 learner lesson progress states guard passed")

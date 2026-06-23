from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_DETAIL_PAGE = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.14 learner course completion readiness guard failed: {message}")


text = COURSE_DETAIL_PAGE.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("CourseDetailPage.jsx contains raw email-like value")
if PHONE_RE.search(text):
    fail("CourseDetailPage.jsx contains raw phone-like value")

required_markers = [
    'const STAGE82_LEARNER_COURSE_COMPLETION_READINESS = "stage82_14_learner_course_completion_readiness"',
    "const LEARNER_COURSE_COMPLETION_READINESS_LABELS = {",
    "function getLearnerCourseCompletionReadinessMeta({",
    "const remainingRequiredLessons = requiredLessons.filter((lesson) => !getLessonCompleted(lesson))",
    "const readiness = getLearnerCourseCompletionReadinessMeta({",
    "remainingRequiredLessons,",
    "readiness,",
    'data-testid="learner-course-completion-readiness-card"',
    'data-testid="learner-course-completion-readiness-panel"',
    'data-testid="learner-course-completion-remaining-required-lessons"',
    'data-testid="learner-course-completion-no-remaining-required-lessons"',
    'data-readiness-state={facts.readiness.key}',
    'data-stage={STAGE82_LEARNER_COURSE_COMPLETION_READINESS}',
    "LEARNER_COURSE_COMPLETION_READINESS_LABELS.readyTitle",
    "LEARNER_COURSE_COMPLETION_READINESS_LABELS.lockedTitle",
    "LEARNER_COURSE_COMPLETION_READINESS_LABELS.completedTitle",
    "LEARNER_COURSE_COMPLETION_READINESS_LABELS.remainingRequiredLessons",
    "facts.remainingRequiredLessons.slice(0, 8).map",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

print("stage 82.14 learner course completion readiness guard passed")

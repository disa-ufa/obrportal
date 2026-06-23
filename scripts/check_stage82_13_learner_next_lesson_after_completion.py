from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_DETAIL_PAGE = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.13 learner next lesson after completion guard failed: {message}")


text = COURSE_DETAIL_PAGE.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("CourseDetailPage.jsx contains raw email-like value")
if PHONE_RE.search(text):
    fail("CourseDetailPage.jsx contains raw phone-like value")

required_markers = [
    'const STAGE82_LEARNER_NEXT_LESSON_AFTER_COMPLETION = "stage82_13_learner_next_lesson_after_completion"',
    "const LEARNER_NEXT_LESSON_AFTER_COMPLETION_LABELS = {",
    "function getLearnerNextLessonAfterCompletion(course, existingEnrollment, user, completedLesson)",
    "function getLearnerNextLessonAfterCompletionMessage(nextLesson)",
    "afterCompletedLesson.find",
    "lessons.find((lesson) => lesson.active && lesson.available && !getLessonCompleted(lesson))",
    "const nextLesson = getLearnerNextLessonAfterCompletion(",
    "const nextLessonId = getLearnerLessonBlockViewerLessonId(nextLesson)",
    "setSelectedLessonId(nextLessonId)",
    "setSelectedLessonId(getLearnerLessonBlockViewerLessonId(lesson))",
    "setLessonCompletionSuccess(getLearnerNextLessonAfterCompletionMessage(nextLesson))",
    'data-stage={STAGE82_LEARNER_NEXT_LESSON_AFTER_COMPLETION}',
    "nextLessonSelected:",
    "allLessonsCompleted:",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

print("stage 82.13 learner next lesson after completion guard passed")

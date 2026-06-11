from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_DETAIL_PAGE = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.10 learner lesson blocks navigation guard failed: {message}")


text = COURSE_DETAIL_PAGE.read_text(encoding="utf-8")

if EMAIL_RE.search(text):
    fail("CourseDetailPage.jsx contains raw email-like value")
if PHONE_RE.search(text):
    fail("CourseDetailPage.jsx contains raw phone-like value")

required_markers = [
    'const STAGE82_LEARNER_LESSON_BLOCK_NAVIGATION = "stage82_10_learner_lesson_blocks_navigation"',
    "function getLearnerLessonBlockViewerLessonId(lesson)",
    "function getLearnerLessonBlockViewerSelectedLesson(accessFacts, selectedLessonId = \"\")",
    "function LearnerLessonBlockNavigation({ lessons, selectedLessonId, onSelectLesson })",
    'data-testid="learner-lesson-block-navigation"',
    'data-testid="learner-lesson-block-navigation-item"',
    'data-selected={selected ? "true" : "false"}',
    "onClick={() => onSelectLesson?.(lessonId)}",
    "selectedLessonId={selectedLessonId}",
    "onSelectLesson={setSelectedLessonId}",
    "const [selectedLessonId, setSelectedLessonId] = useState(\"\")",
    "const learnerLessonAccessFacts = useMemo(",
    "getLearnerLessonContentPreviewFacts(course, existingEnrollment, user, selectedLessonId)",
    "getLearnerLessonBlockViewerFacts(course, existingEnrollment, user, selectedLessonId)",
    "getLearnerCompletionActionFacts(course, existingEnrollment, user, selectedLessonId)",
]

for marker in required_markers:
    if marker not in text:
        fail(f"missing marker: {marker}")

print("stage 82.10 learner lesson blocks navigation guard passed")

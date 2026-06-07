from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage78-learner-completion-action-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_COURSE_DETAIL_MARKERS = [
    "LEARNER_COMPLETION_ACTION_UX_LABELS",
    "function getLearnerCompletionActionFacts",
    "function CourseLearnerCompletionActionPanel",
    'data-testid="learner-completion-action-panel"',
    'data-testid="learner-completion-action-status"',
    'data-testid="learner-completion-action-summary"',
    'data-testid="learner-completion-action-checklist"',
    'data-testid="learner-completion-action-step"',
    'data-testid="learner-completion-action-note"',
    'data-testid="learner-completion-action-actions"',
    "<CourseLearnerCompletionActionPanel",
]

REQUIRED_DOC_MARKERS = [
    "Stage 78.4 - Learner completion action UX",
    "stage78_4_status=implementation_ready",
    "stage78_4_release_manifest_required=yes",
    "stage78_4_guard_required=yes",
    "stage78_4_frontend_only=yes",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "78.4"',
    '"id": "78.4"',
    '"name": "Learner completion action UX"',
    '"branch": "stage78-learner-completion-action-ux"',
    '"learner_completion_action_panel"',
    '"learner_completion_action_summary"',
    '"learner_completion_action_checklist"',
    '"learner_completion_action_actions"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.4 learner completion action UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_completion_action_labels() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    match = re.search(
        r"const LEARNER_COMPLETION_ACTION_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("LEARNER_COMPLETION_ACTION_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'nextAction: "-"', 'completionMode: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"LEARNER_COMPLETION_ACTION_UX_LABELS contains broken labels: {found}")

    required = [
        "\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f \\u043f\\u043e \\u043f\\u0440\\u043e\\u0445\\u043e\\u0436\\u0434\\u0435\\u043d\\u0438\\u044e \\u0443\\u0440\\u043e\\u043a\\u0430",
        "\\u0422\\u0435\\u043a\\u0443\\u0449\\u0438\\u0439 \\u0443\\u0440\\u043e\\u043a",
        "\\u0421\\u043b\\u0435\\u0434\\u0443\\u044e\\u0449\\u0435\\u0435 \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u0435",
        "\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u043c\\u0430\\u0442\\u0435\\u0440\\u0438\\u0430\\u043b",
        "\\u0424\\u0438\\u043a\\u0441\\u0430\\u0446\\u0438\\u044f \\u043f\\u0440\\u043e\\u0433\\u0440\\u0435\\u0441\\u0441\\u0430",
    ]

    missing = [marker for marker in required if marker not in block]

    if missing:
        fail(f"LEARNER_COMPLETION_ACTION_UX_LABELS misses real label markers: {missing}")


def require_panel_order() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    progress_position = text.find("<CourseLearnerProgressFoundationPanel")
    access_position = text.find("<CourseLearnerLessonAccessPanel")
    preview_position = text.find("<CourseLearnerLessonContentPreviewPanel")
    completion_position = text.find("<CourseLearnerCompletionActionPanel")
    diagnostics_position = text.find("<CourseSelfEnrollmentDiagnostics")

    if min(progress_position, access_position, preview_position, completion_position, diagnostics_position) < 0:
        fail("course detail learner panel order markers are missing")

    if not progress_position < access_position < preview_position < completion_position < diagnostics_position:
        fail("completion action panel must be placed between lesson content preview panel and diagnostics")


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_real_completion_action_labels()
    require_panel_order()
    print("stage 78.4 learner completion action UX guard passed")


if __name__ == "__main__":
    main()

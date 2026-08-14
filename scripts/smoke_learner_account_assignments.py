from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(
            f"File not found: {relative_path}"
        )

    return path.read_text(
        encoding="utf-8-sig"
    )


def require_contains(
    relative_path: str,
    fragments: list[str],
) -> None:
    text = read_text(relative_path)
    missing = [
        fragment
        for fragment in fragments
        if fragment not in text
    ]

    if missing:
        print(
            f"{relative_path} is missing required fragments:"
        )
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/api/client.js",
        [
            (
                "export async function "
                "getAccountActivities()"
            ),
            (
                'return request('
                '"/api/v1/account/activities");'
            ),
        ],
    )

    require_contains(
        (
            "frontend/src/components/account/"
            "LearnerAccountAssignments.jsx"
        ),
        [
            "export function LearnerAccountAssignments",
            "ACTIVITY_FILTERS",
            'label: "Все"',
            'label: "Требуют выполнения"',
            'label: "На проверке"',
            'label: "Выполнены"',
            "matchesFilter(activity, filter)",
            "activity.requires_action",
            'activity.status === "review"',
            'activity.status === "completed"',
            'data-testid="learner-account-assignments"',
            'data-testid="learner-assignments-stats"',
            'data-testid="learner-assignment-filters"',
            'data-testid="learner-assignment-card"',
            'data-testid="learner-assignments-loading"',
            'data-testid="learner-assignments-empty"',
            'data-testid="learner-assignments-filter-empty"',
            'data-testid="learner-assignments-list"',
            "getActivityTypeLabel",
            "getActivityStatusLabel",
            "getReviewModeLabel",
            "getSubmissionStatusLabel",
            "activity.attempts_used",
            "activity.max_attempts",
            "activity.remaining_attempts",
            "activity.best_percent",
            "activity.review_comment",
            "Открыть программу",
        ],
    )

    require_contains(
        "frontend/src/pages/AccountPage.jsx",
        [
            "getAccountActivities,",
            (
                'import { LearnerAccountAssignments } '
                'from "../components/account/'
                'LearnerAccountAssignments";'
            ),
            'assignments: "account-assignments"',
            (
                "const [activitiesResponse, "
                "setActivitiesResponse] = useState(null);"
            ),
            (
                "const [activitiesLoading, "
                "setActivitiesLoading] = useState(true);"
            ),
            (
                "const [activitiesError, "
                'setActivitiesError] = useState("");'
            ),
            (
                "const [activityStatusFilter, "
                'setActivityStatusFilter] = useState("");'
            ),
            "async function loadAccountActivities()",
            "const data = await getAccountActivities();",
            "async function refreshAccountActivities()",
            "await refreshAccountActivities();",
            (
                "const activities = "
                "activitiesResponse?.items || [];"
            ),
            'id="account-assignments"',
            "<LearnerAccountAssignments",
            "activities={activities}",
            "selectedFilter={activityStatusFilter}",
            "loading={activitiesLoading}",
            "errorMessage={activitiesError}",
            "onFilterChange={setActivityStatusFilter}",
            'activeAccountSection === "assignments"',
        ],
    )

    require_contains(
        "backend/app/api/v1/account.py",
        [
            '"/activities"',
            "response_model=AccountActivitiesResponse",
            "async def get_account_activities(",
            "LessonBlock.block_type.in_(",
            '["quiz", "assignment"]',
        ],
    )

    require_contains(
        "backend/app/schemas/account.py",
        [
            "class AccountActivityItemResponse(BaseModel):",
            "activity_type: str",
            "requires_action: bool = False",
            "attempts_used: int | None = None",
            "review_mode: str | None = None",
            "class AccountActivitiesResponse(BaseModel):",
        ],
    )

    print(
        "Learner account assignments smoke passed"
    )
    print(
        " - account activities client contract covered"
    )
    print(
        " - activity status filters covered"
    )
    print(
        " - quiz and assignment cards covered"
    )
    print(
        " - account section integration covered"
    )
    print(
        " - loading/error/empty states covered"
    )


if __name__ == "__main__":
    main()

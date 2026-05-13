from pathlib import Path
import os
import urllib.error
import urllib.request


FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")


def require_contains(path: str, fragments: list[str]) -> None:
    file_path = Path(path)

    if not file_path.exists():
        raise SystemExit(f"Missing required file: {path}")

    text = file_path.read_text(encoding="utf-8")

    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"Missing route wiring fragments in {path}:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def require_not_contains(path: str, fragments: list[str]) -> None:
    file_path = Path(path)

    if not file_path.exists():
        raise SystemExit(f"Missing required file: {path}")

    text = file_path.read_text(encoding="utf-8")
    present = [fragment for fragment in fragments if fragment in text]

    if present:
        print(f"Forbidden route wiring fragments in {path}:")
        for fragment in present:
            print(f" - {fragment}")
        raise SystemExit(1)


def fetch_frontend_route(path: str) -> str:
    url = f"{FRONTEND_BASE_URL}{path}"
    request = urllib.request.Request(url, headers={"Accept": "text/html"})

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            status = response.status
            body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"Frontend route {path} returned HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Could not open frontend route {path}: {exc}") from exc

    if status != 200:
        raise SystemExit(f"Frontend route {path} returned HTTP {status}")

    if 'id="root"' not in body and "ObrPortal" not in body:
        raise SystemExit(f"Frontend route {path} did not return the app shell")

    return body


def main() -> None:
    require_contains(
        "backend/app/schemas/org.py",
        [
            "class OrgProfileUpdate",
            "class OrgUserSearchItem",
            "class OrgEnrollmentGroupCreate",
            "class OrgEnrollmentBulkCreateResult",
            "class OrgEnrollmentItem",
            "class OrgUserSearchOrganizationItem",
            "class OrgUserSearchRoleItem",
            "user_organizations",
            "user_roles",
            "organizations",
            "roles",
            "legal_address",
            "actual_address",
        ],
    )

    require_contains(
        "backend/app/api/v1/org.py",
        [
            '@router.get("/profile", response_model=OrgProfile)',
            '"org.profile.read"',
            "build_org_profile_summary",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetForms.jsx",
        [
            "export function EmptyState",
            "export function OrganizationCabinetHero",
            "export function OrganizationCabinetStats",
            "export function OrganizationGroupCreateSection",
            "export function OrganizationGroupListSection",
            "export function OrganizationUsersSection",
            "export function OrganizationSelectedGroupPanelHeader",
            "Участники группы",
            "Опасная зона",
            "Удалить группу",
            "getOrganizationLabel",
            "Обучающиеся организации",
            "Загрузить список",
            "Поиск по email или ФИО",
            "formatUserOrganizations",
            "formatUserRoles",
            "Учебные группы",
            "groups.map((group)",
            "Создать учебную группу",
            "Создать группу",
            "export function OrganizationProfileSection",
            "Реквизиты организации",
            "OrganizationProfileCard",
            "export function SummaryCard",
            "export function OrganizationProfileCard",
            "export function LearningGroupEditForm",
            "buildOrganizationProfileFormData",
            "buildLearningGroupFormData",
            "formatOptional",
            "formatApiError",
            "Сохранить реквизиты",
            "Редактировать группу",
            "Сохранить группу",
            "Юридический адрес",
            "Фактический адрес",
            "Редактировать",
        ],
    )

    require_contains(
        "frontend/src/utils/organizationCabinet.js",
        [
            "export function formatDate",
            "export function formatOptional",
            "export function shortId",
            "export function formatUserOrganizations",
            "export function formatUserRoles",
            "export function buildOrganizationOptions",
            "export function getOrganizationLabel",
            "export function getGroupStatus",
            "export function sortEnrollments",
            "export function formatEnrollmentStatus",
            "export function mergeUniqueEnrollments",
            "export function enrollmentMatchesFilters",
            "export function hasActiveEnrollmentFilters",
            "export function sortOrganizationUsers",
            "export function buildOrganizationUserFromMember",
            "export function organizationUserMatchesQuery",
            "export function sortMembers",
            "export function buildEmptyGroupEnrollmentForm",
            "export function buildEmptyGroupForm",
            "export function buildLearningGroupFormData",
            "export function buildOrganizationProfileFormData",
        ],
    )

    require_contains(
        "frontend/src/pages/OrganizationCabinetPage.jsx",
        [
            "export function OrganizationCabinetPage",
            "from \"../components/organization/OrganizationCabinetForms\";",
            "from \"../utils/organizationCabinet\";",
            "addOrgLearningGroupMember",
            "removeOrgLearningGroupMember",
            "searchOrgUsers",
            "createOrgLearningGroup",
            "createOrgGroupEnrollments",
            "getOrgGroupEnrollments",
            "deleteOrgGroupEnrollment",
            "getPublicCourses",
            "deleteOrgLearningGroup",
            "updateOrgLearningGroup",
            "getOrgProfile",
            "updateOrgProfile",
            "getOrgLearningGroups",
            "getOrgLearningGroupMembers",
            "organizationUsers",
            "handleSearchOrganizationUsers",
            "handleAddOrganizationUserToSelectedGroup",
            "filters.exclude_group_id = selectedGroupId",
            "setOrganizationUsers([])",
            "setOrganizationUsers(Array.isArray(results) ? sortOrganizationUsers(results) : [])",
            "addingOrganizationUserId",
            "Добавить в группу",
            "handleCreateGroup",
            "LearningGroupEditForm",
            "handleSaveGroup",
            "handleDeleteGroup",
            "handleCreateGroupEnrollments",
            "handleSearchCourseCandidates",
            "handleSelectCourse",
            "Название, код или описание курса",
            "Найти курс",
            "Выбранный курс",
            "Назначить курс группе",
            "Назначения группы",
            "groupEnrollments",
            "formatEnrollmentStatus",
            "mergeUniqueEnrollments",
            "groupEnrollmentsRefreshKey",
            "visibleGroupEnrollments",
            "groupEnrollmentSearchQuery",
            "groupEnrollmentStatusFilter",
            "enrollmentMatchesFilters",
            "hasActiveEnrollmentFilters",
            "groupEnrollmentFiltersActive",
            "deletingGroupEnrollmentId",
            "groupEnrollmentDeleteMessage",
            "handleDeleteGroupEnrollment",
            "onClick={() => handleDeleteGroupEnrollment(enrollment)}",
            "enrollment.status === \"assigned\"",
            "Снять назначение",
            "Сбросить",
            "Поиск по курсу, участнику или email",
            "Все статусы",
            "Обновить",
            
            "created_count",
            "skipped_count",
            "handleSearchMemberCandidates",
            "exclude_group_id",
            "handleAddMember",
            "handleDeleteMember",
            "Добавить участника",
            "Email или ФИО пользователя",
            "formatUserOrganizations",
            "formatUserRoles",
            "sortOrganizationUsers",
            "buildOrganizationUserFromMember",
            "organizationUserMatchesQuery",
            "candidate.roles",
            "member.user_roles",
            "Удалить",
            "Кабинет организации",
            "OrganizationSelectedGroupPanelHeader",
        ],
    )

    require_contains(
        "frontend/src/api/client.js",
        [
            "export async function getOrgProfile()",
            "export async function updateOrgProfile",
            "/api/v1/org/profile",
            "/api/v1/org/profile/${organizationId}",
            "export async function createOrgLearningGroup",
            "export async function createOrgGroupEnrollments",
            "export async function deleteOrgLearningGroup",
            "export async function addOrgLearningGroupMember",
            "export async function removeOrgLearningGroupMember",
            "export async function searchOrgUsers",
            "export async function updateOrgLearningGroup",
            "/api/v1/org/groups",
            "/api/v1/org/groups/${groupId}",
            "/api/v1/org/groups/${groupId}/members",
            "/api/v1/org/groups/${groupId}/members/${userId}",
            "/api/v1/org/groups/${groupId}/enrollments",
            "/api/v1/org/users",
            "/api/v1/org/enrollments/group",
        ],
    )

    require_contains(
        "frontend/src/routes/PublicRoutes.jsx",
        [
            'import { OrganizationCabinetPage } from "../pages/OrganizationCabinetPage";',
            'path="/organization"',
            'userHasRole(user, "org_rep")',
            '<Navigate to="/organization" replace />',
        ],
    )

    require_contains(
        "frontend/src/utils/publicRoutes.js",
        [
            'organization: "/organization"',
            'if (pathname === "/organization") return "organization";',
            "Кабинет организации - ObrPortal",
        ],
    )

    require_contains(
        "frontend/src/hooks/useAuthFlow.js",
        [
            "getPostAuthPublicPage",
            "getPostAuthPublicPath",
            'userHasRole(user, "org_rep") ? "organization" : "account"',
            'userHasRole(user, "org_rep") ? "/organization" : "/account"',
        ],
    )

    require_contains(
        "frontend/src/components/layout/PublicShell.jsx",
        [
            'userHasRole(user, "org_rep")',
            'active={currentPage === "organization"}',
            'onClick={() => onPageChange("organization")}',
            "Кабинет организации",
        ],
    )

    require_not_contains(
        "frontend/src/components/layout/PublicShell.jsx",
        [
            'function NavButton({ active, children, onClick }) {\n  const isOrgRepresentative = userHasRole(user, "org_rep");',
        ],
    )

    fetch_frontend_route("/organization")

    print("Organization cabinet frontend smoke passed:")
    print(" - source route wiring ok")
    print(" - public route registry ok")
    print(" - org_rep auth redirect wiring ok")
    print(" - org_rep public navigation ok")
    print(" - direct /organization frontend shell ok")


if __name__ == "__main__":
    main()

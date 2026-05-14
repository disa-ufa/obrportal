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
        "frontend/src/components/organization/OrganizationSelectedGroupAside.jsx",
        [
            "export function OrganizationSelectedGroupAside",
            "panelHeaderProps",
            "selectedGroupContentProps",
            "groupMembersSectionProps",
            "<OrganizationSelectedGroupPanelHeader {...panelHeaderProps} />",
            "<OrganizationSelectedGroupContent {...selectedGroupContentProps} />",
            "<OrganizationGroupMembersSection {...groupMembersSectionProps} />",
            "hasSelectedGroup",
            "OrganizationSelectedGroupContent",
            "OrganizationSelectedGroupPanelHeader",
            "OrganizationGroupMembersSection",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationSelectedGroupContent.jsx",
        [
            "export function OrganizationSelectedGroupContent",
            "groupEditProps",
            "<LearningGroupEditForm {...groupEditProps} />",
            "courseAssignmentProps",
            "groupEnrollmentsProps",
            "<OrganizationGroupCourseAssignmentForm {...courseAssignmentProps} />",
            "<OrganizationGroupEnrollmentsSection {...groupEnrollmentsProps} />",
            "LearningGroupEditForm",
            "OrganizationGroupCourseAssignmentForm",
            "OrganizationGroupEnrollmentsSection",
            "handleCreateGroupEnrollments",
            "handleDeleteGroupEnrollment",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseAssignmentForm.jsx",
        [
            "export function OrganizationGroupCourseAssignmentForm",
            "canAssignCourse",
            "OrganizationGroupCoursePicker",
            "OrganizationGroupCourseAssignmentActions",
            "OrganizationGroupCourseAssignmentError",
            "OrganizationGroupCourseAssignmentResult",
            "Назначить курс группе",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseAssignmentError.jsx",
        [
            "export function OrganizationGroupCourseAssignmentError",
            "groupEnrollmentError",
            "return null",
            "bg-red-50",
            "text-red-800",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseAssignmentActions.jsx",
        [
            "export function OrganizationGroupCourseAssignmentActions",
            "selectedStatus",
            "isSubmitDisabled",
            "submitLabel",
            "groupEnrollmentForm.status",
            "handleGroupEnrollmentFormChange",
            "assigningGroupCourse",
            "canAssignCourse",
            "Назначен",
            "В процессе",
            "Завершён",
            "Назначить",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCoursePicker.jsx",
        [
            "export function OrganizationGroupCoursePicker",
            "selectedCourseLabel",
            "selectedCourseId",
            "hasCourseSearchResults",
            "OrganizationGroupCourseOption",
            "Название, код или описание курса",
            "Найти курс",
            "Выбранный курс",
            "shortId",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseAssignmentResult.jsx",
        [
            "export function OrganizationGroupCourseAssignmentResult",
            "visibleSkippedEnrollments",
            "hasSkippedEnrollments",
            "Результат назначения",
            "created_count",
            "skipped_count",
            "Пропущенные участники",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseOption.jsx",
        [
            "export function OrganizationGroupCourseOption",
            "courseTitle",
            "courseMetaLabel",
            "onSelect(course)",
            "course.title || course.slug || course.id",
            "course.slug || shortId(course.id)",
            "course.hours",
            "course.format",
            "course.document_type",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsSection.jsx",
        [
            "export function OrganizationGroupEnrollmentsSection",
            "OrganizationGroupEnrollmentsHeader",
            "OrganizationGroupEnrollmentsFilters",
            "OrganizationGroupEnrollmentsMessages",
            "OrganizationGroupEnrollmentsList",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsHeader.jsx",
        [
            "export function OrganizationGroupEnrollmentsHeader",
            "refreshButtonLabel",
            "counterLabel",
            "Назначения группы",
            "Курсы, уже назначенные участникам выбранной учебной группы",
            "setGroupEnrollmentsRefreshKey((current) => current + 1)",
            "groupEnrollmentsLoading ? \"Обновляем...\" : \"Обновить\"",
            "visibleGroupEnrollments.length",
            "groupEnrollments.length",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsFilters.jsx",
        [
            "export function OrganizationGroupEnrollmentsFilters",
            "handleSearchQueryChange",
            "handleStatusFilterChange",
            "handleResetFilters",
            "Поиск по курсу, участнику или email",
            "Все статусы",
            "Назначен",
            "В процессе",
            "Завершён",
            "setGroupEnrollmentSearchQuery(\"\")",
            "setGroupEnrollmentStatusFilter(\"\")",
            "Сбросить",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsMessages.jsx",
        [
            "export function OrganizationGroupEnrollmentsMessages",
            "hasDeleteMessage",
            "hasErrorMessage",
            "return null",
            "groupEnrollmentDeleteMessage",
            "groupEnrollmentsError",
            "bg-green-50",
            "text-green-800",
            "bg-red-50",
            "text-red-800",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsList.jsx",
        [
            "export function OrganizationGroupEnrollmentsList",
            "hasGroupEnrollments",
            "hasVisibleGroupEnrollments",
            "OrganizationGroupEnrollmentCard",
            "Загружаем назначения",
            "У выбранной группы пока нет назначенных курсов",
            "По заданным фильтрам назначений не найдено",
            "visibleGroupEnrollments.map((enrollment) =>",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentCard.jsx",
        [
            "export function OrganizationGroupEnrollmentCard",
            "courseLabel",
            "userLabel",
            "statusLabel",
            "createdAtLabel",
            "isAssigned",
            "isDeleting",
            "deleteButtonLabel",
            "formatEnrollmentStatus",
            "formatDate",
            "enrollment.status === \"assigned\"",
            "onClick={() => handleDeleteGroupEnrollment(enrollment)}",
            "deletingGroupEnrollmentId === enrollment.id",
            "Снять назначение",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMembersSection.jsx",
        [
            "export function OrganizationGroupMembersSection",
            "hasSelectedGroup",
            "memberAddFormProps",
            "membersListProps",
            "<OrganizationGroupMemberAddForm {...memberAddFormProps} />",
            "<OrganizationGroupMembersList {...membersListProps} />",
            "OrganizationGroupMemberAddForm",
            "OrganizationGroupMembersList",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMembersList.jsx",
        [
            "export function OrganizationGroupMembersList",
            "hasMembers",
            "memberCardProps",
            "{...memberCardProps}",
            "OrganizationGroupMemberCard",
            "Загружаем участников",
            "В выбранной группе пока нет участников",
            "members.map((member) =>",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMemberAddForm.jsx",
        [
            "export function OrganizationGroupMemberAddForm",
            "hasMemberSearchResults",
            "isSubmitDisabled",
            "searchButtonLabel",
            "submitButtonLabel",
            "handleMemberSearchQueryChange",
            "OrganizationGroupMemberCandidateCard",
            "Добавить участника",
            "Email или ФИО пользователя",
            "Добавить в группу",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMemberCandidateCard.jsx",
        [
            "export function OrganizationGroupMemberCandidateCard",
            "candidateTitle",
            "candidateEmail",
            "candidateClassName",
            "handleSelectCandidate",
            "formatUserOrganizations",
            "formatUserRoles",
            "candidate.full_name || candidate.email",
            "Организация:",
            "Роли:",
            "setMemberUserId(candidate.id)",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMemberCard.jsx",
        [
            "export function OrganizationGroupMemberCard",
            "memberTitle",
            "memberEmail",
            "createdAtLabel",
            "deleteButtonLabel",
            "handleDeleteClick",
            "organizationLabel",
            "roleLabel",
            "isDeleting",
            "member.user_roles",
            "formatDate",
            "formatUserOrganizations",
            "formatUserRoles",
            "handleDeleteMember(member)",
            "deletingMemberId === member.id",
            "Удалить",
        ],
    )

    require_not_contains(
        "frontend/src/utils/organizationCabinet.js",
        [
            "normalizedActiveGroupsCount",
            "filter((group) => group.is_active)",
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
            "Organization cabinet summary helpers.",
            "function normalizeItems",
            "function normalizeObject",
            "!Array.isArray(item)",
            "normalizeItems(groups)",
            "normalizeObject(summary)",
            "export function buildActiveGroupsCount",
            "group?.is_active === true",
            "export function buildFallbackOrganizationSummary",
            "export function buildInactiveGroupsCount",
            "activeGroupsCountValue",
            "fallbackActiveGroupsCount",
            "totalGroupsCount",
            "export function getOrganizationLabel",
            "normalizeItems(organizations)",
            "export function getGroupStatus",
            "return group?.is_active === true",
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
        "frontend/src/utils/organizationCabinetProps.js",
        [
            "Page-level layout props.",
            "export function buildHeroSectionProps",
            "export function buildCabinetStatsProps",
            "Organization profile, users, and group form props.",
            "export function buildOrganizationProfileSectionProps",
            "export function buildOrganizationUsersSectionProps",
            "export function buildGroupCreateSectionProps",
            "Group workspace props.",
            "export function buildGroupListProps",
            "export function buildGroupsWorkspaceProps",
            "export function buildSelectedGroupAsideSectionProps",
            "Large selected-group aside props are kept explicit to preserve the component contract.",
            "selectedGroupAsideProps",
            "handleDeleteMember",
        ],
    )

    require_contains(
        "frontend/src/pages/OrganizationCabinetPage.jsx",
        [
            "export function OrganizationCabinetPage",
            "hasGroups",
            "heroUserLabel",
            "from \"../components/organization/OrganizationCabinetForms\";",
            "from \"../utils/organizationCabinet\";",
            "buildFallbackOrganizationSummary,",
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
            "handleCreateGroup",
            "handleSaveGroup",
            "handleDeleteGroup",
            "handleCreateGroupEnrollments",
            "courseSearchQuery",
            "handleCourseSearchQueryChange",
            "courseSearchLoading",
            "courseSearchResults",
            "handleSearchCourseCandidates",
            "handleSelectCourse",
            "groupEnrollmentForm",
            "handleGroupEnrollmentFormChange",
            "assigningGroupCourse",
            "groupEnrollmentError",
            "groupEnrollmentResult",
            "groupEnrollmentsLoading",
            "groupEnrollmentsError",
            "setGroupEnrollmentSearchQuery",
            "setGroupEnrollmentStatusFilter",
            "groupEnrollments",
            "mergeUniqueEnrollments",
            "groupEnrollmentsRefreshKey",
            "visibleGroupEnrollments",
            "groupEnrollmentSearchQuery",
            "groupEnrollmentStatusFilter",
            "enrollmentMatchesFilters",
            "hasActiveEnrollmentFilters",
            "groupEnrollmentFiltersActive",
            "setGroupEnrollmentsRefreshKey",
            "deletingGroupEnrollmentId",
            "groupEnrollmentDeleteMessage",
            "handleDeleteGroupEnrollment",
            "membersLoading",
            "membersError",
            "memberSearchQuery",
            "setMemberSearchQuery",
            "memberSearchLoading",
            "memberSearchResults",
            "memberUserId",
            "setMemberUserId",
            "addingMember",
            "memberActionError",
            "memberActionMessage",
            "members",
            "deletingMemberId",
            
            "handleSearchMemberCandidates",
            "exclude_group_id",
            "handleAddMember",
            "handleDeleteMember",
            "sortOrganizationUsers",
            "buildOrganizationUserFromMember",
            "organizationUserMatchesQuery",
            "Удалить",
            "OrganizationCabinetNextSteps",
            "OrganizationCabinetHeroSection",
            "OrganizationCabinetErrorAlert",
            "OrganizationCabinetGroupsWorkspace",
            "groupsWorkspaceProps",
            "../utils/organizationCabinetProps",
            "buildGroupsWorkspaceProps({",
            "groupListProps",
            "buildGroupListProps({",
            "<OrganizationCabinetGroupsWorkspace {...groupsWorkspaceProps} />",
            "<OrganizationCabinetGroupsWorkspace",
            "../components/organization/OrganizationCabinetGroupsWorkspace",
            "<OrganizationCabinetErrorAlert error={error} />",
            "../components/organization/OrganizationCabinetErrorAlert",
            "heroSectionProps",
            "buildHeroSectionProps({",
            "<OrganizationCabinetHeroSection {...heroSectionProps} />",
            "<OrganizationCabinetHeroSection",
            "../components/organization/OrganizationCabinetHeroSection",
            "<OrganizationCabinetNextSteps />",
            "../components/organization/OrganizationCabinetNextSteps",
            "cabinetStatsProps",
            "buildCabinetStatsProps({",
            "<OrganizationCabinetStats {...cabinetStatsProps} />",
            "selectedGroupAsideSectionProps",
            "selectedGroupAsideProps: selectedGroupAsideSectionProps",
            "buildSelectedGroupAsideSectionProps({",
            "buildFallbackOrganizationSummary({",
            "buildInactiveGroupsCount,",
            "buildInactiveGroupsCount({",
            "buildActiveGroupsCount,",
            "buildActiveGroupsCount(groups)",
            "groupDeleteMessage",
            "organizationUsersSectionProps",
            "buildOrganizationUsersSectionProps({",
            "<OrganizationUsersSection {...organizationUsersSectionProps} />",
            "groupCreateSectionProps",
            "buildGroupCreateSectionProps({",
            "<OrganizationGroupCreateSection {...groupCreateSectionProps} />",
            "organizationProfileSectionProps",
            "buildOrganizationProfileSectionProps({",
            "<OrganizationProfileSection {...organizationProfileSectionProps} />",
        ],
    )

    require_not_contains(
        "frontend/src/pages/OrganizationCabinetPage.jsx",
        [
            "function buildHeroSectionProps",
            "function buildCabinetStatsProps",
            "function buildOrganizationProfileSectionProps",
            "function buildOrganizationUsersSectionProps",
            "function buildGroupCreateSectionProps",
            "function buildGroupListProps",
            "function buildGroupsWorkspaceProps",
            "function buildSelectedGroupAsideSectionProps",
            "function buildFallbackOrganizationSummary",
            "function buildInactiveGroupsCount",
            "function buildActiveGroupsCount",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetNextSteps.jsx",
        [
            "export function OrganizationCabinetNextSteps",
            "Следующие разделы кабинета ЮЛ",
            "корпоративные заявки на обучение",
            "массовые назначения",
            "документы по сотрудникам",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetHeroSection.jsx",
        [
            "export function OrganizationCabinetHeroSection",
            "Кабинет организации",
            "OrganizationCabinetHero",
            "heroUserLabel",
            "handleCatalogClick",
            "catalogButtonLabel",
            "logoutButtonLabel",
            "Управление обучением сотрудников",
            "Роль: представитель ЮЛ",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetErrorAlert.jsx",
        [
            "export function OrganizationCabinetErrorAlert",
            "if (!error)",
            "return null",
            "rounded-3xl bg-red-50",
            "{error}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetLoadingState.jsx",
        [
            "export function OrganizationCabinetLoadingState",
            "Загружаем кабинет организации",
            "rounded-3xl bg-white",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetEmptyGroupsState.jsx",
        [
            "export function OrganizationCabinetEmptyGroupsState",
            "EmptyState",
            "Учебные группы пока не созданы",
            "После добавления групп они появятся",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetGroupsWorkspace.jsx",
        [
            "export function OrganizationCabinetGroupsWorkspace",
            "shouldShowEmptyGroupsState",
            "groupListProps",
            "selectedGroupAsideProps",
            "<OrganizationSelectedGroupAside {...selectedGroupAsideProps} />",
            "<OrganizationGroupListSection {...groupListProps} />",
            "if (shouldShowEmptyGroupsState)",
            "OrganizationCabinetLoadingState",
            "OrganizationCabinetEmptyGroupsState",
            "OrganizationGroupListSection",
            "OrganizationSelectedGroupAside",
            "if (loading)",
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

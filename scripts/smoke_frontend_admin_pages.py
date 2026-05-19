from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{relative_path} is missing required fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def require_occurs(relative_path: str, fragment: str, minimum: int) -> None:
    text = read_text(relative_path)
    count = text.count(fragment)

    if count < minimum:
        print(f"{relative_path} has too few occurrences of required fragment:")
        print(f" - fragment: {fragment}")
        print(f" - expected at least: {minimum}")
        print(f" - actual: {count}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/api/client.js",
        [
            "getAdminWorklistSummary(filters = {})",
            "/api/v1/admin/worklist-summary",
            "Object.entries(filters).forEach",
            "params.set(key, value)",
        ],
    )

    require_contains(
        "frontend/src/pages/DocumentsPage.jsx",
        [
            "documents_user_id: filters.user_id",
            "documents_enrollment_id: filters.enrollment_id",
            "documents_document_type: filters.document_type",
            "documents_q: filters.q",
            "getAdminWorklistSummary({",
        ],
    )

    require_contains(
        "frontend/src/pages/AdminEnrollmentsPage.jsx",
        [
            "enrollments_user_id: activeFilters.user_id",
            "enrollments_course_id: activeFilters.course_id",
            "enrollments_learning_group_id: activeFilters.learning_group_id",
            "enrollments_q: activeFilters.q",
        ],
    )

    documents_text = read_text("frontend/src/pages/DocumentsPage.jsx")
    forbidden_documents_counter_fragments = [
        "getAdminDocuments(counterFilters)",
        "getAdminDocuments(actionRequiredCounterFilters)",
    ]

    for fragment in forbidden_documents_counter_fragments:
        if fragment in documents_text:
            raise SystemExit(
                f"frontend/src/pages/DocumentsPage.jsx still loads counter list: {fragment}"
            )

    enrollments_text = read_text("frontend/src/pages/AdminEnrollmentsPage.jsx")
    forbidden_enrollments_counter_fragments = [
        "getAdminEnrollments(countFilters)",
        "getAdminEnrollments(actionRequiredCountFilters)",
    ]

    for fragment in forbidden_enrollments_counter_fragments:
        if fragment in enrollments_text:
            raise SystemExit(
                f"frontend/src/pages/AdminEnrollmentsPage.jsx still loads counter list: {fragment}"
            )

    forbidden_dead_counter_helpers = [
        ("frontend/src/pages/DocumentsPage.jsx", "function calculateDocumentStatusCounts"),
        ("frontend/src/pages/AdminEnrollmentsPage.jsx", "function calculateStatusCounts"),
    ]

    for relative_path, fragment in forbidden_dead_counter_helpers:
        if fragment in read_text(relative_path):
            raise SystemExit(f"{relative_path} still contains dead counter helper: {fragment}")

    require_contains(
        "frontend/src/pages/DocumentsPage.jsx",
        [
            "getDocumentActionRequiredHint",
            "document-action-required-hint",
            "document-attention-fields",
            "getDocumentAttentionItems",
            "getDocumentAttentionTone",
            "documentAttentionTone.panelClass",
            "documentAttentionTone.badgeClass",
            "bg-red-50 text-red-800 ring-red-200",
            "bg-amber-50 text-amber-900 ring-amber-200",
            "Что требует внимания",
            "document-attention-count",
            "Пунктов внимания:",
            "documentAttentionItems.length",
            "Публикация: черновик нужно доработать или опубликовать.",
            "Файл: опубликованный документ недоступен для скачивания.",
            "document-action-required-primary-action",
            "documents-action-required-banner",
            "documents-worklist-summary-note",
            "Счётчики быстрых фильтров рассчитаны по текущим фильтрам страницы.",
            "Включён режим контроля документов",
            "Показать все документы",
            "Доработать документ",
            "Загрузить файл",
            "Связанное назначение",
            "Документы назначения",
            "enrollment_id: documentItem.enrollment_id",
            "user_id: documentItem.user_id || \"\"",
            "course_id: documentItem.course_id || \"\"",
            "Требуется публикация или доработка черновика",
            "Требуется файл для опубликованного документа",
            "getAdminWorklistSummary",
            "documentsSummary.total",
            "documentsSummary.action_required",
        ],
    )

    require_contains(
        "frontend/src/pages/AdminEnrollmentsPage.jsx",
        [
            "getEnrollmentActionRequiredHint",
            "enrollment-action-required-hint",
            "enrollment-action-required-primary-action",
            "enrollment-action-required-documents-link",
            "enrollments-action-required-banner",
            "enrollments-worklist-summary-note",
            "Счётчики быстрых фильтров рассчитаны по текущим фильтрам страницы.",
            "Включён режим контроля назначений",
            "Показать все назначения",
            "Проверить назначение",
            "Открыть документы",
            "action_required: \"true\",",
            "Назначение ожидает старта обучения",
            "Завершённое обучение ожидает документ",
            "Назначения, требующие действия, не найдены",
            "getAdminWorklistSummary",
            "enrollmentsSummary.total",
            "enrollmentsSummary.action_required",
        ],
    )

    require_contains(
        "frontend/src/hooks/useAdminDataLoader.js",
        [
            "getAdminDashboardSummary,",
            "getAdminDashboardSummary()",
            "dashboardSummary",
        ],
    )

    loader_text = read_text("frontend/src/hooks/useAdminDataLoader.js")
    forbidden_loader_fragments = [
        "getAdminCourses({ limit: 300 })",
        "getAdminEnrollments({ limit: 300 })",
        "getAdminDocuments({ limit: 300 })",
    ]

    for fragment in forbidden_loader_fragments:
        if fragment in loader_text:
            raise SystemExit(
                f"frontend/src/hooks/useAdminDataLoader.js still loads large Dashboard list: {fragment}"
            )

    documents_text = read_text("frontend/src/pages/DocumentsPage.jsx")
    forbidden_documents_counter_fragments = [
        "getAdminDocuments(counterFilters)",
        "getAdminDocuments(actionRequiredCounterFilters)",
    ]

    for fragment in forbidden_documents_counter_fragments:
        if fragment in documents_text:
            raise SystemExit(
                f"frontend/src/pages/DocumentsPage.jsx still loads counter list: {fragment}"
            )

    enrollments_text = read_text("frontend/src/pages/AdminEnrollmentsPage.jsx")
    forbidden_enrollments_counter_fragments = [
        "getAdminEnrollments(countFilters)",
        "getAdminEnrollments(actionRequiredCountFilters)",
    ]

    for fragment in forbidden_enrollments_counter_fragments:
        if fragment in enrollments_text:
            raise SystemExit(
                f"frontend/src/pages/AdminEnrollmentsPage.jsx still loads counter list: {fragment}"
            )

    require_contains(
        "frontend/src/pages/DashboardPage.jsx",
        [
            "export function DashboardPage({",
            "email,",
            "password,",
            "loading,",
            "adminLoading,",
            "error,",
            "user,",
            "rbac,",
            "adminData,",
            "dashboardSummary",
            "summaryNumber",
            "usersTotalCount",
            "documentsTotalCount",
            "priorityActions",
            "urgentPriorityActions",
            "displayedPriorityActions",
            "DashboardTaskCard",
            "dashboardTaskCards",
            "totalDashboardTasksCount",
            "dashboardTasksStatusText",
            "dashboard-work-tasks-status",
            "Есть рабочие задачи:",
            "Все рабочие задачи закрыты.",
            "Всего задач:",
            "dashboard-work-tasks",
            "dashboard-documents-task",
            "dashboard-enrollments-task",
            "testId={task.testId}",
            "Рабочие задачи",
            "Главные действия администратора по документам и назначениям.",
            "Разобрать документы",
            "Разобрать назначения",
            "WorkCenterActionCard",
            "Рабочий центр администратора",
            "adminDataLoadedAt,",
            "onEmailChange,",
            "onPasswordChange,",
            "onLogin,",
            "onLogout,",
            "onRbacCheck,",
            "onRefreshAdminData,",
            "SectionCard",
            "onRefreshAdminData",
            "actionRequiredEnrollmentsCount",
            "actionRequiredDocumentsCount",
            "Назначения требуют действия",
            "Документы требуют действия",
            "buildEnrollmentsPath({ action_required: \"true\" })",
            "buildDocumentsPath({ action_required: \"true\" })",
            "onRbacCheck",
            "onLogout",
        ],
    )

    require_contains(
        "frontend/src/pages/UsersPage.jsx",
        [
            "export function UsersPage({",
            "user,",
            "users,",
            "roles,",
            "organizations,",
            "loading,",
            "selectedUser,",
            "selectedUserLoading,",
            "selectedUserError,",
            "onOpenUser,",
            "onCloseUser,",
            "onCreateUser,",
            "onUpdateUser,",
            "onResetUserPassword,",
            "onActivateUser,",
            "onDeactivateUser,",
            "onAssignUserRole,",
            "onRemoveUserRole,",
            "onRefreshAdminData,",
            "useLocation();",
            "useNavigate();",
            "new URLSearchParams(search)",
            "normalizeSearchValue",
            "AdminPageActions",
            "AdminFilterPanel",
            "AdminCreatePanel",
            "UserForm",
            "UserDetailPanel",
            "SmallTable",
            "selectedRowId={selectedUser?.id}",
            "onOpenUser(row.id)",
            "buildEnrollmentsPath",
            "buildDocumentsPath",
        ],
    )

    require_contains(
        "frontend/src/pages/OrganizationsPage.jsx",
        [
            "export function OrganizationsPage({",
            "user,",
            "organizations,",
            "loading,",
            "selectedOrganization,",
            "selectedOrganizationLoading,",
            "selectedOrganizationError,",
            "onOpenOrganization,",
            "onCloseOrganization,",
            "onCreateOrganization,",
            "onUpdateOrganization,",
            "onDeleteOrganization,",
            "onRefreshAdminData,",
            "useLocation();",
            "useNavigate();",
            "getOrganizationFiltersFromSearch",
            "AdminPageActions",
            "AdminCreatePanel",
            "AdminFilterPanel",
            "OrganizationForm",
            "OrganizationDetailPanel",
            "SmallTable",
            "selectedRowId={selectedOrganization?.id}",
            "onOpenOrganization(row.id)",
            "buildOrganizationsPath",
            "buildGroupsPath",
            "buildEnrollmentsPath",
        ],
    )

    require_contains(
        "frontend/src/pages/GroupsPage.jsx",
        [
            "getAdminUsers,",
            "getOrgLearningGroupMembers,",
            "addOrgLearningGroupMember,",
            "removeOrgLearningGroupMember,",
            "function LearningGroupForm({",
            "function LearningGroupMembersPanel({ groupDetail })",
            "async function reloadMemberData()",
            "Promise.all([",
            "getOrgLearningGroupMembers(groupDetail.id)",
            "getAdminUsers()",
            "async function handleAddMember(event)",
            "addOrgLearningGroupMember(groupDetail.id",
            "async function handleRemoveMember(userId, userEmail)",
            "removeOrgLearningGroupMember(groupDetail.id, userId)",
            "export function GroupsPage({",
            "user,",
            "groups,",
            "organizations,",
            "loading,",
            "selectedGroup,",
            "selectedGroupLoading,",
            "selectedGroupError,",
            "onOpenGroup,",
            "onCloseGroup,",
            "onCreateGroup,",
            "onUpdateGroup,",
            "onDeleteGroup,",
            "onRefreshAdminData,",
            "useLocation();",
            "useNavigate();",
            "getGroupFiltersFromSearch",
            "calculateGroupCounts",
            "AdminPageActions",
            "AdminCreatePanel",
            "AdminFilterPanel",
            "LearningGroupForm",
            "LearningGroupMembersPanel",
            "SmallTable",
            "selectedRowId={selectedGroup?.id}",
            "onOpenGroup(row.id)",
            "buildGroupsPath",
            "buildEnrollmentsPath",
        ],
    )

    require_contains(
        "frontend/src/pages/RolesPage.jsx",
        [
            "const SYSTEM_ROLE_CODES = new Set([",
            "function isSystemRole(role)",
            "function roleMatchesSearch(role, query)",
            "function roleMatchesType(role, filter)",
            "const ROLE_TYPE_FILTERS = [",
            "function getRoleFiltersFromSearch(search)",
            "function calculateRoleCounts(items)",
            "function RolesSummaryCards({ roles, permissions, roleCounts })",
            "function RolesWorkflowPanel({ roles, permissions, roleCounts })",
            "export function RolesPage({",
            "roles,",
            "permissions,",
            "selectedRole,",
            "onOpenRole,",
            "onCreateRole,",
            "onUpdateRole,",
            "onDeleteRole,",
            "onAssignRolePermission,",
            "onRemoveRolePermission,",
            "useLocation();",
            "useNavigate();",
            "AdminPageActions",
            "AdminCreatePanel",
            "RoleForm",
            "AdminFilterPanel",
            "AdminQuickFilterButtons",
            "SmallTable",
            "selectedRowId={selectedRole?.id}",
            "onOpenRole(row.id)",
            "buildUsersPath({ role_id: row.id })",
            "buildPermissionsPath({ q: row.code })",
            "RoleDetailPanel",
        ],
    )

    require_contains(
        "frontend/src/pages/PermissionsPage.jsx",
        [
            "const ALL_PERMISSION_GROUPS = \"all\";",
            "function getPermissionGroup(permission)",
            "function getPermissionSearchText(permission)",
            "function getPermissionGroupTone(group)",
            "function getPermissionFiltersFromSearch(search)",
            "function calculatePermissionGroupCounts(items)",
            "function PermissionsSummaryCards({ permissions, permissionGroups, permissionGroupCounts })",
            "function PermissionsWorkflowPanel({ permissionGroupCounts })",
            "export function PermissionsPage({",
            "permissions,",
            "selectedPermission,",
            "selectedPermissionLoading,",
            "selectedPermissionError,",
            "onOpenPermission,",
            "onClosePermission,",
            "onRefreshAdminData,",
            "useLocation();",
            "useNavigate();",
            "AdminPageActions",
            "AdminFilterPanel",
            "AdminQuickFilterButtons",
            "SmallTable",
            "selectedRowId={selectedPermission?.id}",
            "onOpenPermission(row.id)",
            "buildRolesPath({ q: row.code })",
            "PermissionDetailPanel",
        ],
    )

    require_contains(
        "frontend/src/pages/AuditPage.jsx",
        [
            "const DEFAULT_FILTERS = {",
            "function normalizeFilters(filters)",
            "function getAuditFiltersFromSearch(search)",
            "function getLimitNumber(filters)",
            "function getAuditFilterPayload(filters)",
            "function getActionTone(action)",
            "function getEntityTone(entityType)",
            "function calculateAuditCounts(events)",
            "function AuditSummaryCards({ auditCounts, filters })",
            "function AuditWorkflowPanel({ auditCounts })",
            "export function AuditPage({",
            "auditEvents,",
            "selectedAuditEvent,",
            "selectedAuditEventLoading,",
            "selectedAuditEventError,",
            "onOpenAuditEvent,",
            "onCloseAuditEvent,",
            "onApplyAuditFilters,",
            "useLocation();",
            "useNavigate();",
            "async function applyAuditFilters(nextFilters)",
            "await onApplyAuditFilters(payload);",
            "async function navigateToAuditFilters(nextFilters",
            "async function handleQuickFilter(field, value)",
            "async function handleSubmit(event)",
            "async function handleReset()",
            "QuickValueFilters",
            "SmallTable",
            "selectedRowId={selectedAuditEvent?.id}",
            "onOpenAuditEvent(row.id)",
            "buildEntityAdminPath(row)",
            "buildAuditPath({",
            "AuditEventDetailPanel",
        ],
    )

    require_contains(
        "frontend/src/pages/AdminCoursesPage.jsx",
        [
            "activateAdminCourse,",
            "createAdminCourse,",
            "deactivateAdminCourse,",
            "deleteAdminCourse,",
            "getAdminCourses,",
            "updateAdminCourse",
            "const COURSE_ACTIVE_FILTERS = [",
            "const EMPTY_COURSE_FORM = {",
            "const EMPTY_EDIT_FORM = {",
            "function normalizeHoursInput(value)",
            "function getCourseFiltersFromSearch(search)",
            "function calculateCourseCounts(items)",
            "function buildEditForm(course)",
            "function getCourseStatusTone(course)",
            "function getCourseStatusLabel(course)",
            "function formatCourseApiError(err, fallback)",
            "function CourseFormFields({ values, onChange, prefix = \"\" })",
            "function CourseCard({",
            "export function AdminCoursesPage()",
            "useLocation();",
            "useNavigate();",
            "const [courses, setCourses] = useState([]);",
            "const [courseCounts, setCourseCounts] = useState({",
            "const [showCreateForm, setShowCreateForm] = useState(false);",
            "getAdminCourses",
            "createAdminCourse",
            "updateAdminCourse",
            "async function handleToggleActive",
            "activateAdminCourse",
            "deactivateAdminCourse",
            "deleteAdminCourse",
            "AdminPageActions",
            "AdminCreatePanel",
            "AdminFilterPanel",
            "AdminQuickFilterButtons",
            "AdminEmptyState",
            "CourseCard",
            "buildCoursesPath",
            "buildEnrollmentsPath",
        ],
    )

    require_contains(
        "frontend/src/pages/AdminEnrollmentsPage.jsx",
        [
            "createAdminEnrollment,",
            "createAdminGroupEnrollments,",
            "deleteAdminEnrollment,",
            "getAdminCourses,",
            "getAdminEnrollments,",
            "getAdminOrganizations,",
            "getAdminUsers,",
            "getOrgLearningGroupMembers,",
            "getOrgLearningGroups,",
            "updateAdminEnrollment,",
            "const ENROLLMENT_STATUSES = [",
            "const ENROLLMENT_STATUS_FILTERS = [",
            "const ENROLLMENT_API_ERROR_MESSAGES = {",
            "function getStatusLabel(value)",
            "function formatEnrollmentApiError(err, fallback)",
            "function getEnrollmentFiltersFromSearch(search)",
            "function getStatusTone(value)",
            "function getUserRoleCodes(user)",
            "function isLearnerUser(user)",
            "function isAdminUser(user)",
            "function getUserRoleLabel(user)",
            "function buildUserLabel(user)",
            "function buildCourseLabel(course)",
            "function buildOrganizationsMap(organizations)",
            "function buildGroupsMap(groups)",
            "function groupHasMember(groupId, userId, membersByGroupId)",
            "function buildGroupLabel(group, organizationsById = {})",
            "function getAvailableGroups(",
            "function buildEditForm(enrollment)",
            "function normalizeDateTime(value)",
            "function EnrollmentSummaryCards({ statusCounts, users, courses, groups })",
            "function EnrollmentWorkflowPanel({ statusCounts, courses, groups })",
            "export function AdminEnrollmentsPage()",
            "useLocation();",
            "useNavigate();",
            "const [enrollments, setEnrollments] = useState([]);",
            "showActionRequiredOnly",
            "setFilterActionRequired(\"\")",
            "actionRequiredCount",
            "visibleEnrollments",
            "\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0439: {visibleEnrollments.length}",
            r'{"\u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f"}: {actionRequiredCount}',
            "data-testid=\"enrollments-action-required-filter\"",
            r"\u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
            "actionRequiredCount",
            "action_required: overrides.action_required ?? filterActionRequired",
            "const [users, setUsers] = useState([]);",
            "const [courses, setCourses] = useState([]);",
            "const [organizations, setOrganizations] = useState([]);",
            "const [groups, setGroups] = useState([]);",
            "const [bulkForm, setBulkForm] = useState({",
            "const [editForm, setEditForm] = useState({",
            "getAdminEnrollments",
            "getAdminUsers",
            "getAdminCourses",
            "getAdminOrganizations",
            "getOrgLearningGroups",
            "getOrgLearningGroupMembers",
            "createAdminEnrollment",
            "createAdminGroupEnrollments",
            "updateAdminEnrollment",
            "deleteAdminEnrollment",
            "AdminQuickFilterButtons",
            "AdminEmptyState",
            "buildCoursesPath",
            "buildDocumentsPath",
            "buildEnrollmentsPath",
            "buildGroupsPath",
        ],
    )

    require_occurs("frontend/src/pages/UsersPage.jsx", "useMemo(", 3)
    require_occurs("frontend/src/pages/OrganizationsPage.jsx", "useMemo(", 2)
    require_occurs("frontend/src/pages/GroupsPage.jsx", "useMemo(", 4)
    require_occurs("frontend/src/pages/RolesPage.jsx", "useMemo(", 3)
    require_occurs("frontend/src/pages/PermissionsPage.jsx", "useMemo(", 3)
    require_occurs("frontend/src/pages/AuditPage.jsx", "useMemo(", 3)
    require_occurs("frontend/src/pages/AdminCoursesPage.jsx", "useState(", 8)
    require_occurs("frontend/src/pages/AdminEnrollmentsPage.jsx", "useState(", 10)

    print("Frontend admin pages behavior smoke passed")


if __name__ == "__main__":
    main()

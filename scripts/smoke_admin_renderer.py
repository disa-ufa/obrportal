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


def main() -> None:
    require_contains(
        "frontend/src/routes/AdminPageRenderer.jsx",
        [
            "const AuditPage = lazyNamed(() => import(\"../pages/AuditPage\"), \"AuditPage\");",
            "const DashboardPage = lazyNamed(() => import(\"../pages/DashboardPage\"), \"DashboardPage\");",
            "const AdminCoursesPage = lazyNamed(() => import(\"../pages/AdminCoursesPage\"), \"AdminCoursesPage\");",
            "const AdminEnrollmentsPage = lazyNamed(() => import(\"../pages/AdminEnrollmentsPage\"), \"AdminEnrollmentsPage\");",
            "const DocumentsPage = lazyNamed(() => import(\"../pages/DocumentsPage\"), \"DocumentsPage\");",
            "const GroupsPage = lazyNamed(() => import(\"../pages/GroupsPage\"), \"GroupsPage\");",
            "const OrganizationsPage = lazyNamed(() => import(\"../pages/OrganizationsPage\"), \"OrganizationsPage\");",
            "const PermissionsPage = lazyNamed(() => import(\"../pages/PermissionsPage\"), \"PermissionsPage\");",
            "const RolesPage = lazyNamed(() => import(\"../pages/RolesPage\"), \"RolesPage\");",
            "const UsersPage = lazyNamed(() => import(\"../pages/UsersPage\"), \"UsersPage\");",
            'import { getAdminPageFromPathname } from "../utils/adminRoutes";',
            "export function AdminPageRenderer({",
            "locationPathname,",
            "currentPage,",
            "adminData,",
            "adminDataLoadedAt,",
            "selectedUser,",
            "selectedOrganization,",
            "selectedGroup,",
            "selectedRole,",
            "selectedPermission,",
            "selectedAuditEvent,",
            "handleOpenUser,",
            "handleOpenOrganization,",
            "handleOpenGroup,",
            "handleOpenRole,",
            "handleOpenPermission,",
            "handleOpenAuditEvent,",
            "handleCreateUser,",
            "handleUpdateUser,",
            "handleCreateOrganization,",
            "handleUpdateOrganization,",
            "handleDeleteOrganization,",
            "handleCreateGroup,",
            "handleUpdateGroup,",
            "handleDeleteGroup,",
            "handleCreateRole,",
            "handleUpdateRole,",
            "handleDeleteRole,",
            "handleAssignRolePermission,",
            "handleRemoveRolePermission,",
            "handleApplyAuditFilters,",
            "const page = getAdminPageFromPathname(locationPathname) || currentPage;",
            'if (page === "courses")',
            "content = <AdminCoursesPage onRefreshCourses={refreshAdminCourses} />;",
            'if (page === "enrollments")',
            "content = <AdminEnrollmentsPage onRefreshEnrollments={refreshAdminEnrollments} />;",
            'if (page === "users")',
            "<UsersPage",
            "users={adminData.users}",
            "roles={adminData.roles}",
            "organizations={adminData.organizations}",
            "onOpenUser={handleOpenUser}",
            "onCreateUser={handleCreateUser}",
            "onUpdateUser={handleUpdateUser}",
            "onResetUserPassword={handleResetUserPassword}",
            "onActivateUser={handleActivateUser}",
            "onDeactivateUser={handleDeactivateUser}",
            "onAssignUserRole={handleAssignUserRole}",
            "onRemoveUserRole={handleRemoveUserRole}",
            'if (page === "organizations")',
            "<OrganizationsPage",
            "organizations={adminData.organizations}",
            "onOpenOrganization={handleOpenOrganization}",
            "onCreateOrganization={handleCreateOrganization}",
            "onUpdateOrganization={handleUpdateOrganization}",
            "onDeleteOrganization={handleDeleteOrganization}",
            'if (page === "groups")',
            "<GroupsPage",
            "groups={adminData.groups}",
            "onOpenGroup={handleOpenGroup}",
            "onCreateGroup={handleCreateGroup}",
            "onUpdateGroup={handleUpdateGroup}",
            "onDeleteGroup={handleDeleteGroup}",
            'if (page === "roles")',
            "<RolesPage",
            "roles={adminData.roles}",
            "permissions={adminData.permissions}",
            "onOpenRole={handleOpenRole}",
            "onCreateRole={handleCreateRole}",
            "onUpdateRole={handleUpdateRole}",
            "onDeleteRole={handleDeleteRole}",
            "onAssignRolePermission={handleAssignRolePermission}",
            "onRemoveRolePermission={handleRemoveRolePermission}",
            'if (page === "permissions")',
            "<PermissionsPage",
            "permissions={adminData.permissions}",
            "onOpenPermission={handleOpenPermission}",
            'if (page === "documents")',
            "content = <DocumentsPage onRefreshDocuments={refreshAdminDocuments} />;",
            'if (page === "audit")',
            "<AuditPage",
            "auditEvents={adminData.auditEvents}",
            "onOpenAuditEvent={handleOpenAuditEvent}",
            "onApplyAuditFilters={handleApplyAuditFilters}",
            "<DashboardPage",
            "rbac={rbac}",
            "adminData={adminData}",
            "adminDataLoadedAt={adminDataLoadedAt}",
            "onRbacCheck={handleRbacCheck}",
            "onRefreshAdminData={loadAdminData}",
        ],
    )

    require_contains(
        "frontend/src/utils/adminRoutes.js",
        [
            "export const ADMIN_ROUTE_ITEMS = [",
            'key: "dashboard"',
            'path: "/admin"',
            'key: "users"',
            'path: "/admin/users"',
            'key: "organizations"',
            'path: "/admin/organizations"',
            'key: "groups"',
            'path: "/admin/groups"',
            'key: "courses"',
            'path: "/admin/courses"',
            'key: "enrollments"',
            'path: "/admin/enrollments"',
            'key: "documents"',
            'path: "/admin/documents"',
            'key: "roles"',
            'path: "/admin/roles"',
            'key: "permissions"',
            'path: "/admin/permissions"',
            'key: "audit"',
            'path: "/admin/audit-events"',
            "export function isAdminPathname(pathname)",
            'return pathname === "/admin" || pathname.startsWith("/admin/");',
            "export const ADMIN_ROUTE_PAGE_MAP = ADMIN_ROUTE_ITEMS.reduce",
            "export function getAdminPageFromPathname(pathname)",
            "return ADMIN_ROUTE_PAGE_MAP[pathname] || null;",
            "export function getAdminPathForPage(pageKey)",
            'return ADMIN_ROUTE_ITEMS.find((item) => item.key === pageKey)?.path || "/admin";',
        ],
    )

    require_contains(
        "frontend/src/components/layout/AppShell.jsx",
        [
            'import { ADMIN_ROUTE_ITEMS } from "../../utils/adminRoutes";',
            "export function AppShell",
            "currentPage",
            "onPageChange",
            "adminDataLoadedAt",
            "counts",
            "ADMIN_ROUTE_ITEMS",
            "onPageChange(item.key)",
        ],
    )

    require_contains(
        "frontend/src/App.jsx",
        [
            'import { AdminPageRenderer } from "./routes/AdminPageRenderer";',
            'import { useAdminDataLoader } from "./hooks/useAdminDataLoader";',
            "const [rbac, setRbac] = useState(null);",
            "const [adminData, setAdminData] = useState(EMPTY_ADMIN_DATA);",
            "const [adminDataLoadedAt, setAdminDataLoadedAt] = useState(\"\");",
            "handleNavigateAdminPage,",
            "loadAdminData,",
            "useAdminDataLoader({",
            "useAdminSelections();",
            "useAdminDetailActions({",
            "useAdminAuditActions({",
            "useAdminEntityActions({",
            "const adminPageRendererProps = {",
            "locationPathname: location.pathname,",
            "currentPage,",
            "rbac,",
            "adminData,",
            "adminDataLoadedAt,",
            "handleRbacCheck,",
            "loadAdminData,",
            "selectedUser,",
            "selectedOrganization,",
            "selectedGroup,",
            "selectedRole,",
            "selectedPermission,",
            "selectedAuditEvent,",
            "handleOpenUser,",
            "handleOpenOrganization,",
            "handleOpenGroup,",
            "handleOpenRole,",
            "handleOpenPermission,",
            "handleOpenAuditEvent,",
            "handleCreateUser,",
            "handleUpdateUser,",
            "handleCreateOrganization,",
            "handleUpdateOrganization,",
            "handleDeleteOrganization,",
            "handleCreateGroup,",
            "handleUpdateGroup,",
            "handleDeleteGroup,",
            "handleCreateRole,",
            "handleUpdateRole,",
            "handleDeleteRole,",
            "handleAssignRolePermission,",
            "handleRemoveRolePermission,",
            "handleApplyAuditFilters,",
            "<AdminPageRenderer {...adminPageRendererProps} />",
            "currentPage={activeAdminPage}",
            "onPageChange={handleNavigateAdminPage}",
            "adminDataLoadedAt={adminDataLoadedAt}",
            "users: adminData.users.length",
            "organizations: adminData.organizations.length",
            "groups: adminData.groups.length",
            "courses: adminData.courses.length",
            "enrollments: adminData.enrollments.length",
            "documents: adminData.documents.length",
            "roles: adminData.roles.length",
            "permissions: adminData.permissions.length",
            "auditEvents: adminData.auditEvents.length",
        ],
    )

    print("Admin renderer behavior smoke passed")


if __name__ == "__main__":
    main()

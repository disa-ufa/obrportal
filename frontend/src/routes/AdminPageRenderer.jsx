import { lazy, Suspense } from "react";
import { getAdminPageFromPathname } from "../utils/adminRoutes";
import { getAdminLessonStudioRouteParams } from "../utils/adminRoutes";

function lazyNamed(loader, exportName) {
  return lazy(() =>
    loader().then((module) => ({
      default: module[exportName],
    }))
  );
}

const AuditPage = lazyNamed(() => import("../pages/AuditPage"), "AuditPage");
const DashboardPage = lazyNamed(() => import("../pages/DashboardPage"), "DashboardPage");
const AdminCoursesPage = lazyNamed(() => import("../pages/AdminCoursesPage"), "AdminCoursesPage");
const LessonStudioPage = lazyNamed(() => import("../pages/LessonStudioPage"), "LessonStudioPage");
const LearnerImportsPage = lazyNamed(() => import("../pages/LearnerImportsPage"), "LearnerImportsPage");
const AdminEnrollmentsPage = lazyNamed(() => import("../pages/AdminEnrollmentsPage"), "AdminEnrollmentsPage");
const DocumentsPage = lazyNamed(() => import("../pages/DocumentsPage"), "DocumentsPage");
const GroupsPage = lazyNamed(() => import("../pages/GroupsPage"), "GroupsPage");
const OrganizationsPage = lazyNamed(() => import("../pages/OrganizationsPage"), "OrganizationsPage");
const PermissionsPage = lazyNamed(() => import("../pages/PermissionsPage"), "PermissionsPage");
const RolesPage = lazyNamed(() => import("../pages/RolesPage"), "RolesPage");
const UsersPage = lazyNamed(() => import("../pages/UsersPage"), "UsersPage");

function AdminPageLoadingFallback() {
  return (
    <div
      data-testid="admin-page-loading-state"
      className="rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200"
    >
      Загружаем административный раздел...
    </div>
  );
}

export function AdminPageRenderer({
  locationPathname,
  currentPage,
  email,
  password,
  authLoading,
  initializingAuth,
  adminLoading,
  error,
  user,
  rbac,
  adminData,
  adminDataLoadedAt,
  setEmail,
  setPassword,
  handleLogin,
  handleLogout,
  handleRbacCheck,
  loadAdminData,
  refreshAdminRoles,
  refreshAdminPermissions,
  refreshAdminAuditEvents,
  refreshAdminDocuments,
  refreshAdminEnrollments,
  refreshAdminCourses,
  refreshAdminGroups,
  refreshAdminOrganizations,
  refreshAdminUsers,
  selectedUser,
  selectedUserLoading,
  selectedUserError,
  handleOpenUser,
  clearSelectedUser,
  handleCreateUser,
  handleUpdateUser,
  handleResetUserPassword,
  handleActivateUser,
  handleDeactivateUser,
  handleAssignUserRole,
  handleRemoveUserRole,
  selectedOrganization,
  selectedOrganizationLoading,
  selectedOrganizationError,
  handleOpenOrganization,
  clearSelectedOrganization,
  handleCreateOrganization,
  handleUpdateOrganization,
  handleDeleteOrganization,
  selectedGroup,
  selectedGroupLoading,
  selectedGroupError,
  handleOpenGroup,
  clearSelectedGroup,
  handleCreateGroup,
  handleUpdateGroup,
  handleDeleteGroup,
  selectedRole,
  selectedRoleLoading,
  selectedRoleError,
  handleOpenRole,
  clearSelectedRole,
  handleCreateRole,
  handleUpdateRole,
  handleDeleteRole,
  handleAssignRolePermission,
  handleRemoveRolePermission,
  selectedPermission,
  selectedPermissionLoading,
  selectedPermissionError,
  handleOpenPermission,
  clearSelectedPermission,
  selectedAuditEvent,
  selectedAuditEventLoading,
  selectedAuditEventError,
  handleOpenAuditEvent,
  clearSelectedAuditEvent,
  handleApplyAuditFilters,
}) {
  const page = getAdminPageFromPathname(locationPathname) || currentPage;
  const lessonStudioRouteParams = getAdminLessonStudioRouteParams(locationPathname);

  let content;

  if (lessonStudioRouteParams) {
    content = <LessonStudioPage lessonId={lessonStudioRouteParams.lessonId} />;
  } else if (page === "courses") {
    content = <AdminCoursesPage onRefreshCourses={refreshAdminCourses} />;
  } else if (page === "enrollments") {
    content = <AdminEnrollmentsPage onRefreshEnrollments={refreshAdminEnrollments} />;
  } else if (page === "learnerImports") {
    content = <LearnerImportsPage />;
  } else if (page === "users") {
    content = (
      <UsersPage
        user={user}
        users={adminData.users}
        roles={adminData.roles}
        organizations={adminData.organizations}
        loading={adminLoading}
        selectedUser={selectedUser}
        selectedUserLoading={selectedUserLoading}
        selectedUserError={selectedUserError}
        onOpenUser={handleOpenUser}
        onCloseUser={clearSelectedUser}
        onCreateUser={handleCreateUser}
        onUpdateUser={handleUpdateUser}
        onResetUserPassword={handleResetUserPassword}
        onActivateUser={handleActivateUser}
        onDeactivateUser={handleDeactivateUser}
        onAssignUserRole={handleAssignUserRole}
        onRemoveUserRole={handleRemoveUserRole}
        onRefreshAdminData={loadAdminData}
        onRefreshUsers={refreshAdminUsers}
      />
    );
  } else if (page === "organizations") {
    content = (
      <OrganizationsPage
        user={user}
        organizations={adminData.organizations}
        loading={adminLoading}
        selectedOrganization={selectedOrganization}
        selectedOrganizationLoading={selectedOrganizationLoading}
        selectedOrganizationError={selectedOrganizationError}
        onOpenOrganization={handleOpenOrganization}
        onCloseOrganization={clearSelectedOrganization}
        onCreateOrganization={handleCreateOrganization}
        onUpdateOrganization={handleUpdateOrganization}
        onDeleteOrganization={handleDeleteOrganization}
        onRefreshAdminData={loadAdminData}
        onRefreshOrganizations={refreshAdminOrganizations}
      />
    );
  } else if (page === "groups") {
    content = (
      <GroupsPage
        user={user}
        groups={adminData.groups}
        organizations={adminData.organizations}
        loading={adminLoading}
        selectedGroup={selectedGroup}
        selectedGroupLoading={selectedGroupLoading}
        selectedGroupError={selectedGroupError}
        onOpenGroup={handleOpenGroup}
        onCloseGroup={clearSelectedGroup}
        onCreateGroup={handleCreateGroup}
        onUpdateGroup={handleUpdateGroup}
        onDeleteGroup={handleDeleteGroup}
        onRefreshAdminData={loadAdminData}
        onRefreshGroups={refreshAdminGroups}
      />
    );
  } else if (page === "roles") {
    content = (
      <RolesPage
        user={user}
        roles={adminData.roles}
        permissions={adminData.permissions}
        loading={adminLoading}
        selectedRole={selectedRole}
        selectedRoleLoading={selectedRoleLoading}
        selectedRoleError={selectedRoleError}
        onOpenRole={handleOpenRole}
        onCloseRole={clearSelectedRole}
        onCreateRole={handleCreateRole}
        onUpdateRole={handleUpdateRole}
        onDeleteRole={handleDeleteRole}
        onRefreshAdminData={loadAdminData}
        onRefreshRoles={refreshAdminRoles}
        onAssignRolePermission={handleAssignRolePermission}
        onRemoveRolePermission={handleRemoveRolePermission}
      />
    );
  } else if (page === "permissions") {
    content = (
      <PermissionsPage
        user={user}
        permissions={adminData.permissions}
        loading={adminLoading}
        selectedPermission={selectedPermission}
        selectedPermissionLoading={selectedPermissionLoading}
        selectedPermissionError={selectedPermissionError}
        onOpenPermission={handleOpenPermission}
        onClosePermission={clearSelectedPermission}
        onRefreshAdminData={loadAdminData}
        onRefreshPermissions={refreshAdminPermissions}
      />
    );
  } else if (page === "documents") {
    content = <DocumentsPage onRefreshDocuments={refreshAdminDocuments} />;
  } else if (page === "audit") {
    content = (
      <AuditPage
        user={user}
        auditEvents={adminData.auditEvents}
        loading={adminLoading}
        selectedAuditEvent={selectedAuditEvent}
        selectedAuditEventLoading={selectedAuditEventLoading}
        selectedAuditEventError={selectedAuditEventError}
        onOpenAuditEvent={handleOpenAuditEvent}
        onCloseAuditEvent={clearSelectedAuditEvent}
        onApplyAuditFilters={handleApplyAuditFilters}
        onRefreshAuditEvents={refreshAdminAuditEvents}
      />
    );
  } else {
    content = (
      <DashboardPage
        email={email}
        password={password}
        loading={authLoading || initializingAuth}
        adminLoading={adminLoading}
        error={error}
        user={user}
        rbac={rbac}
        adminData={adminData}
        adminDataLoadedAt={adminDataLoadedAt}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRbacCheck={handleRbacCheck}
        onRefreshAdminData={loadAdminData}
      />
    );
  }

  return (
    <Suspense fallback={<AdminPageLoadingFallback />}>
      {content}
    </Suspense>
  );
}

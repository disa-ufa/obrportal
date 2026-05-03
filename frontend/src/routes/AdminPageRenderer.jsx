import { AuditPage } from "../pages/AuditPage";
import { DashboardPage } from "../pages/DashboardPage";
import { AdminCoursesPage } from "../pages/AdminCoursesPage";
import { AdminEnrollmentsPage } from "../pages/AdminEnrollmentsPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { GroupsPage } from "../pages/GroupsPage";
import { OrganizationsPage } from "../pages/OrganizationsPage";
import { PermissionsPage } from "../pages/PermissionsPage";
import { RolesPage } from "../pages/RolesPage";
import { UsersPage } from "../pages/UsersPage";
import { getAdminPageFromPathname } from "../utils/adminRoutes";

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

  if (page === "courses") {
    return <AdminCoursesPage />;
  }

  if (page === "enrollments") {
    return <AdminEnrollmentsPage />;
  }

  if (page === "users") {
    return (
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
      />
    );
  }

  if (page === "organizations") {
    return (
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
      />
    );
  }

  if (page === "groups") {
    return (
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
      />
    );
  }

  if (page === "roles") {
    return (
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
        onAssignRolePermission={handleAssignRolePermission}
        onRemoveRolePermission={handleRemoveRolePermission}
      />
    );
  }

  if (page === "permissions") {
    return (
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
      />
    );
  }

  if (page === "documents") {
    return <DocumentsPage />;
  }

  if (page === "audit") {
    return (
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
      />
    );
  }

  return (
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

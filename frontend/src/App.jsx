import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { PublicShell } from "./components/layout/PublicShell";
import {
  EMPTY_ADMIN_DATA,
  getNowLabel,
  sortOrganizations,
  sortRoles,
  sortUsers,
} from "./utils/adminState";
import { AdminNotFoundPage } from "./pages/AdminNotFoundPage";
import { PublicRoutes } from "./routes/PublicRoutes";
import { AdminPageRenderer } from "./routes/AdminPageRenderer";
import { useAdminSelections } from "./hooks/useAdminSelections";
import { useAdminEntityActions } from "./hooks/useAdminEntityActions";
import { useAdminDetailActions } from "./hooks/useAdminDetailActions";
import { useAdminAuditActions } from "./hooks/useAdminAuditActions";
import { useSystemStatus } from "./hooks/useSystemStatus";
import { useAdminDataLoader } from "./hooks/useAdminDataLoader";
import { usePendingEnrollment } from "./hooks/usePendingEnrollment";
import { useAuthFlow } from "./hooks/useAuthFlow";
import { usePublicRegistrationStatus } from "./hooks/usePublicRegistrationStatus";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { usePageMeta } from "./hooks/usePageMeta";
import { useAppRouteState } from "./hooks/useAppRouteState";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const {
    health,
    ready,
    loadSystemStatus,
  } = useSystemStatus();
  const {
    publicRegistrationEnabled,
    publicRegistrationLoading,
  } = usePublicRegistrationStatus();

  const [rbac, setRbac] = useState(null);
  const [adminData, setAdminData] = useState(EMPTY_ADMIN_DATA);
  const [adminDataLoadedAt, setAdminDataLoadedAt] = useState("");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [error, setError] = useState("");

  const {
    completePendingEnrollmentIfNeeded,
  } = usePendingEnrollment({
    setError,
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [initializingAuth, setInitializingAuth] = useState(true);

  const {
    handleNavigatePublicPage,
    handleNavigateAdminPage,
    handleOpenPublicCourse,
  } = useAppNavigation({
    setCurrentPage,
  });

  const {
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
  } = useAdminDataLoader({
    setAdminData,
    setAdminDataLoadedAt,
    setAdminLoading,
    setError,
  });

  const {
    openSelection,
    selectedUser,
    setSelectedUser,
    selectedUserLoading,
    setSelectedUserLoading,
    selectedUserError,
    setSelectedUserError,
    clearSelectedUser,

    selectedOrganization,
    setSelectedOrganization,
    selectedOrganizationLoading,
    setSelectedOrganizationLoading,
    selectedOrganizationError,
    setSelectedOrganizationError,
    clearSelectedOrganization,

    selectedGroup,
    setSelectedGroup,
    selectedGroupLoading,
    setSelectedGroupLoading,
    selectedGroupError,
    setSelectedGroupError,
    clearSelectedGroup,

    selectedRole,
    setSelectedRole,
    selectedRoleLoading,
    setSelectedRoleLoading,
    selectedRoleError,
    setSelectedRoleError,
    clearSelectedRole,

    selectedPermission,
    setSelectedPermission,
    selectedPermissionLoading,
    setSelectedPermissionLoading,
    selectedPermissionError,
    setSelectedPermissionError,
    clearSelectedPermission,

    selectedAuditEvent,
    setSelectedAuditEvent,
    selectedAuditEventLoading,
    setSelectedAuditEventLoading,
    selectedAuditEventError,
    setSelectedAuditEventError,
    clearSelectedAuditEvent,
    clearAllSelections,
  } = useAdminSelections();

  const {
    bootstrapAuthState,
    handleRegister,
    handleLogin,
    handleRbacCheck,
    handleLogout,
  } = useAuthFlow({
    email,
    password,
    setUser,
    setRbac,
    setAdminData,
    setAdminDataLoadedAt,
    setCurrentPage,
    setError,
    setAuthLoading,
    setAdminLoading,
    setInitializingAuth,
    clearAllSelections,
    loadAdminData,
    completePendingEnrollmentIfNeeded,
  });

  const {
    handleOpenUser,
    handleOpenOrganization,
    handleOpenGroup,
    handleOpenRole,
    handleOpenPermission,
    handleOpenAuditEvent,
  } = useAdminDetailActions({
    openSelection,

    setSelectedUser,
    setSelectedUserLoading,
    setSelectedUserError,

    setSelectedOrganization,
    setSelectedOrganizationLoading,
    setSelectedOrganizationError,

    setSelectedGroup,
    setSelectedGroupLoading,
    setSelectedGroupError,

    setSelectedRole,
    setSelectedRoleLoading,
    setSelectedRoleError,

    setSelectedPermission,
    setSelectedPermissionLoading,
    setSelectedPermissionError,

    setSelectedAuditEvent,
    setSelectedAuditEventLoading,
    setSelectedAuditEventError,
  });

  const {
    handleApplyAuditFilters,
  } = useAdminAuditActions({
    setAdminData,
    setAdminDataLoadedAt,
    setAdminLoading,
    setError,
    clearSelectedAuditEvent,
    getNowLabel,
  });

  const {
    handleCreateUser,
    handleUpdateUser,
    handleResetUserPassword,
    handleInviteUser,
    handleActivateUser,
    handleDeactivateUser,
    handleAssignUserRole,
    handleRemoveUserRole,

    handleCreateOrganization,
    handleUpdateOrganization,
    handleDeleteOrganization,

    handleCreateGroup,
    handleUpdateGroup,
    handleDeleteGroup,

    handleCreateRole,
    handleUpdateRole,
    handleDeleteRole,
    handleAssignRolePermission,
    handleRemoveRolePermission,
  } = useAdminEntityActions({
    setAdminData,
    setSelectedUser,
    setSelectedOrganization,
    setSelectedGroup,
    selectedGroup,
    clearSelectedGroup,
    setSelectedRole,
    selectedRole,
    clearSelectedRole,
    clearSelectedOrganization,
  });

  const location = usePageMeta();

  useEffect(() => {
    loadSystemStatus();
    bootstrapAuthState();
  }, []);

  const {
    isAdminRoute,
    adminRoutePage,
    isUnknownAdminRoute,
    activeAdminPage,
    currentPublicPage,
    isAdmin,
    authBadgeText,
    authBadgeTone,
  } = useAppRouteState({
    pathname: location.pathname,
    currentPage,
    user,
    initializingAuth,
  });

  const adminPageRendererProps = {
    locationPathname: location.pathname,
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
    handleInviteUser,
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
  };

  const adminPageContent = isUnknownAdminRoute ? (
    <AdminNotFoundPage
      pathname={location.pathname}
      onOpenDashboard={() => handleNavigateAdminPage("dashboard")}
    />
  ) : (
    <AdminPageRenderer {...adminPageRendererProps} />
  );

  if (isAdminRoute) {
    if (initializingAuth) {
      return (
        <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
          <div className="mx-auto max-w-3xl rounded-shell bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            {"\u0418\u043d\u0438\u0446\u0438\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u0441\u0435\u0441\u0441\u0438\u0438..."}
          </div>
        </main>
      );
    }

    if (!isAdmin) {
      return <Navigate to="/login" replace />;
    }

    return (
      <AppShell
        health={health}
        ready={ready}
        user={user}
        isAdmin={isAdmin}
        authBadgeText={authBadgeText}
        authBadgeTone={authBadgeTone}
        currentPage={activeAdminPage}
        onPageChange={handleNavigateAdminPage}
        adminLoading={adminLoading}
        adminDataLoadedAt={adminDataLoadedAt}
        counts={{
          users: adminData.users.length,
          organizations: adminData.organizations.length,
          groups: adminData.groups.length,
          courses: adminData.courses.length,
          enrollments: adminData.enrollments.length,
          documents: adminData.documents.length,
          roles: adminData.roles.length,
          permissions: adminData.permissions.length,
          auditEvents: adminData.auditEvents.length,
        }}
      >
        {adminPageContent}
      </AppShell>
    );
  }

  return (
    <PublicShell
      user={user}
      isAdmin={isAdmin}
      initializingAuth={initializingAuth}
      currentPage={currentPublicPage}
      onPageChange={handleNavigatePublicPage}
      onLogout={handleLogout}
      publicRegistrationEnabled={publicRegistrationEnabled}
    >
      <PublicRoutes
        email={email}
        password={password}
        error={error}
        authLoading={authLoading}
        initializingAuth={initializingAuth}
        user={user}
        isAdmin={isAdmin}
        publicRegistrationEnabled={publicRegistrationEnabled}
        publicRegistrationLoading={publicRegistrationLoading}
        setEmail={setEmail}
        setPassword={setPassword}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
        handleRegister={handleRegister}
        handleNavigatePublicPage={handleNavigatePublicPage}
        handleOpenPublicCourse={handleOpenPublicCourse}
      />
    </PublicShell>
  );
}

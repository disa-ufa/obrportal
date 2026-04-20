import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import {
  checkAdminRbac,
  clearToken,
  createAdminOrganization,
  getAdminAuditEventDetail,
  getAdminAuditEvents,
  getAdminOrganizationDetail,
  getAdminOrganizations,
  getAdminPermissionDetail,
  getAdminPermissions,
  getAdminRoleDetail,
  getAdminRoles,
  getAdminUserDetail,
  getAdminUsers,
  getCurrentUser,
  getHealth,
  getReady,
  getStoredToken,
  login,
  updateAdminOrganization,
} from "./api/client";
import { AuditPage } from "./pages/AuditPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrganizationsPage } from "./pages/OrganizationsPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { RolesPage } from "./pages/RolesPage";
import { UsersPage } from "./pages/UsersPage";

const EMPTY_ADMIN_DATA = {
  users: [],
  organizations: [],
  roles: [],
  permissions: [],
  auditEvents: [],
};

function userHasRole(user, roleCode) {
  return user?.roles?.some((role) => role.code === roleCode) || false;
}

function getNowLabel() {
  return new Date().toLocaleString("ru-RU");
}

function sortOrganizations(organizations) {
  return [...organizations].sort((left, right) =>
    left.name.localeCompare(right.name, "ru-RU")
  );
}

export default function App() {
  const [email, setEmail] = useState("admin@obrportal.local");
  const [password, setPassword] = useState("Admin123Local2026!");
  const [user, setUser] = useState(null);
  const [health, setHealth] = useState(null);
  const [ready, setReady] = useState(null);
  const [rbac, setRbac] = useState(null);
  const [adminData, setAdminData] = useState(EMPTY_ADMIN_DATA);
  const [adminDataLoadedAt, setAdminDataLoadedAt] = useState("");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [initializingAuth, setInitializingAuth] = useState(true);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [selectedUserError, setSelectedUserError] = useState("");

  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [selectedOrganizationLoading, setSelectedOrganizationLoading] = useState(false);
  const [selectedOrganizationError, setSelectedOrganizationError] = useState("");

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedRoleLoading, setSelectedRoleLoading] = useState(false);
  const [selectedRoleError, setSelectedRoleError] = useState("");

  const [selectedPermission, setSelectedPermission] = useState(null);
  const [selectedPermissionLoading, setSelectedPermissionLoading] = useState(false);
  const [selectedPermissionError, setSelectedPermissionError] = useState("");

  const [selectedAuditEvent, setSelectedAuditEvent] = useState(null);
  const [selectedAuditEventLoading, setSelectedAuditEventLoading] = useState(false);
  const [selectedAuditEventError, setSelectedAuditEventError] = useState("");

  async function loadSystemStatus() {
    try {
      const [healthData, readyData] = await Promise.all([
        getHealth(),
        getReady(),
      ]);

      setHealth(healthData);
      setReady(readyData);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadAdminData() {
    setAdminLoading(true);
    setError("");

    try {
      const [users, organizations, roles, permissions, auditEvents] = await Promise.all([
        getAdminUsers(),
        getAdminOrganizations(),
        getAdminRoles(),
        getAdminPermissions(),
        getAdminAuditEvents(),
      ]);

      setAdminData({
        users,
        organizations,
        roles,
        permissions,
        auditEvents,
      });
      setAdminDataLoadedAt(getNowLabel());
    } catch (err) {
      setError(`${err.status || ""} ${err.message}`);
      setAdminData(EMPTY_ADMIN_DATA);
      setAdminDataLoadedAt("");
    } finally {
      setAdminLoading(false);
    }
  }

  async function bootstrapAuthState() {
    setInitializingAuth(true);

    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setAdminData(EMPTY_ADMIN_DATA);
      setAdminDataLoadedAt("");
      setInitializingAuth(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (userHasRole(currentUser, "admin")) {
        await loadAdminData();
      }
    } catch {
      clearToken();
      setUser(null);
      setRbac(null);
      setAdminData(EMPTY_ADMIN_DATA);
      setAdminDataLoadedAt("");
      clearSelectedUser();
      clearSelectedOrganization();
      clearSelectedRole();
      clearSelectedPermission();
      clearSelectedAuditEvent();
    } finally {
      setInitializingAuth(false);
    }
  }

  useEffect(() => {
    loadSystemStatus();
    bootstrapAuthState();
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setAuthLoading(true);
    setError("");
    setRbac(null);
    clearSelectedUser();
    clearSelectedOrganization();
    clearSelectedRole();
    clearSelectedPermission();
    clearSelectedAuditEvent();

    try {
      await login(email, password);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (userHasRole(currentUser, "admin")) {
        await loadAdminData();
      } else {
        setAdminData(EMPTY_ADMIN_DATA);
        setAdminDataLoadedAt("");
      }
    } catch (err) {
      setError(err.message);
      setUser(null);
      setAdminData(EMPTY_ADMIN_DATA);
      setAdminDataLoadedAt("");
    } finally {
      setAuthLoading(false);
      setInitializingAuth(false);
    }
  }

  async function handleRbacCheck() {
    setAuthLoading(true);
    setError("");

    try {
      const data = await checkAdminRbac();
      setRbac(data);
    } catch (err) {
      setError(`${err.status || ""} ${err.message}`);
      setRbac(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleOpenUser(userId) {
    setSelectedUser(null);
    setSelectedUserError("");
    setSelectedUserLoading(true);

    try {
      const detail = await getAdminUserDetail(userId);
      setSelectedUser(detail);
    } catch (err) {
      setSelectedUserError(`${err.status || ""} ${err.message}`);
    } finally {
      setSelectedUserLoading(false);
    }
  }

  async function handleOpenOrganization(organizationId) {
    setSelectedOrganization(null);
    setSelectedOrganizationError("");
    setSelectedOrganizationLoading(true);

    try {
      const detail = await getAdminOrganizationDetail(organizationId);
      setSelectedOrganization(detail);
    } catch (err) {
      setSelectedOrganizationError(`${err.status || ""} ${err.message}`);
    } finally {
      setSelectedOrganizationLoading(false);
    }
  }

  async function handleCreateOrganization(payload) {
    const created = await createAdminOrganization(payload);

    setAdminData((current) => ({
      ...current,
      organizations: sortOrganizations([
        ...current.organizations.filter((organization) => organization.id !== created.id),
        created,
      ]),
    }));
    setSelectedOrganization(created);

    return created;
  }

  async function handleUpdateOrganization(organizationId, payload) {
    const updated = await updateAdminOrganization(organizationId, payload);

    setAdminData((current) => ({
      ...current,
      organizations: sortOrganizations(
        current.organizations.map((organization) =>
          organization.id === updated.id ? updated : organization
        )
      ),
    }));

    setSelectedOrganization(updated);

    return updated;
  }

  async function handleOpenRole(roleId) {
    setSelectedRole(null);
    setSelectedRoleError("");
    setSelectedRoleLoading(true);

    try {
      const detail = await getAdminRoleDetail(roleId);
      setSelectedRole(detail);
    } catch (err) {
      setSelectedRoleError(`${err.status || ""} ${err.message}`);
    } finally {
      setSelectedRoleLoading(false);
    }
  }

  async function handleOpenPermission(permissionId) {
    setSelectedPermission(null);
    setSelectedPermissionError("");
    setSelectedPermissionLoading(true);

    try {
      const detail = await getAdminPermissionDetail(permissionId);
      setSelectedPermission(detail);
    } catch (err) {
      setSelectedPermissionError(`${err.status || ""} ${err.message}`);
    } finally {
      setSelectedPermissionLoading(false);
    }
  }

  async function handleOpenAuditEvent(auditEventId) {
    setSelectedAuditEvent(null);
    setSelectedAuditEventError("");
    setSelectedAuditEventLoading(true);

    try {
      const detail = await getAdminAuditEventDetail(auditEventId);
      setSelectedAuditEvent(detail);
    } catch (err) {
      setSelectedAuditEventError(`${err.status || ""} ${err.message}`);
    } finally {
      setSelectedAuditEventLoading(false);
    }
  }

  function clearSelectedUser() {
    setSelectedUser(null);
    setSelectedUserLoading(false);
    setSelectedUserError("");
  }

  function clearSelectedOrganization() {
    setSelectedOrganization(null);
    setSelectedOrganizationLoading(false);
    setSelectedOrganizationError("");
  }

  function clearSelectedRole() {
    setSelectedRole(null);
    setSelectedRoleLoading(false);
    setSelectedRoleError("");
  }

  function clearSelectedPermission() {
    setSelectedPermission(null);
    setSelectedPermissionLoading(false);
    setSelectedPermissionError("");
  }

  function clearSelectedAuditEvent() {
    setSelectedAuditEvent(null);
    setSelectedAuditEventLoading(false);
    setSelectedAuditEventError("");
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setRbac(null);
    setAdminData(EMPTY_ADMIN_DATA);
    setAdminDataLoadedAt("");
    setCurrentPage("dashboard");
    setError("");
    setAuthLoading(false);
    setAdminLoading(false);
    setInitializingAuth(false);
    clearSelectedUser();
    clearSelectedOrganization();
    clearSelectedRole();
    clearSelectedPermission();
    clearSelectedAuditEvent();
  }

  function renderCurrentPage() {
    if (currentPage === "users") {
      return (
        <UsersPage
          user={user}
          users={adminData.users}
          loading={adminLoading}
          selectedUser={selectedUser}
          selectedUserLoading={selectedUserLoading}
          selectedUserError={selectedUserError}
          onOpenUser={handleOpenUser}
          onCloseUser={clearSelectedUser}
        />
      );
    }

    if (currentPage === "organizations") {
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
        />
      );
    }

    if (currentPage === "roles") {
      return (
        <RolesPage
          user={user}
          roles={adminData.roles}
          loading={adminLoading}
          selectedRole={selectedRole}
          selectedRoleLoading={selectedRoleLoading}
          selectedRoleError={selectedRoleError}
          onOpenRole={handleOpenRole}
          onCloseRole={clearSelectedRole}
        />
      );
    }

    if (currentPage === "permissions") {
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
        />
      );
    }

    if (currentPage === "audit") {
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

  const isAdmin = userHasRole(user, "admin");
  const authBadgeText = initializingAuth
    ? "initializing"
    : user
      ? "authenticated"
      : "guest";

  const authBadgeTone = initializingAuth
    ? "amber"
    : user
      ? "blue"
      : "gray";

  return (
    <AppShell
      health={health}
      ready={ready}
      user={user}
      isAdmin={isAdmin}
      authBadgeText={authBadgeText}
      authBadgeTone={authBadgeTone}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      adminLoading={adminLoading}
      adminDataLoadedAt={adminDataLoadedAt}
      counts={{
        users: adminData.users.length,
        organizations: adminData.organizations.length,
        roles: adminData.roles.length,
        permissions: adminData.permissions.length,
        auditEvents: adminData.auditEvents.length,
      }}
    >
      {renderCurrentPage()}
    </AppShell>
  );
}

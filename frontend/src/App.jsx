import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { PublicShell } from "./components/layout/PublicShell";
import {
  activateAdminUser,
  assignAdminRolePermission,
  assignAdminUserRole,
  checkAdminRbac,
  clearToken,
  createAdminOrganization,
  createAdminRole,
  createAdminUser,
  createOrgLearningGroup,
  deleteAdminOrganization,
  deleteOrgLearningGroup,
  deleteAdminRole,
  deactivateAdminUser,
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
  getOrgLearningGroupDetail,
  getOrgLearningGroups,
  getReady,
  getStoredToken,
  login,
  removeAdminRolePermission,
  removeAdminUserRole,
  resetAdminUserPassword,
  updateAdminOrganization,
  updateAdminRole,
  updateAdminUser,
  updateOrgLearningGroup,
} from "./api/client";
import { AuditPage } from "./pages/AuditPage";
import { AuthPage } from "./pages/AuthPage";
import { CatalogPage } from "./pages/CatalogPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { ContactsPage } from "./pages/ContactsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FaqPage } from "./pages/FaqPage";
import { GroupsPage } from "./pages/GroupsPage";
import { HomePage } from "./pages/HomePage";
import { OfferPage } from "./pages/OfferPage";
import { OrganizationInfoPage } from "./pages/OrganizationInfoPage";
import { OrganizationsPage } from "./pages/OrganizationsPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { PublicInfoPage } from "./pages/PublicInfoPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { RolesPage } from "./pages/RolesPage";
import { UsersPage } from "./pages/UsersPage";
import { VerifyDocumentPage } from "./pages/VerifyDocumentPage";

const EMPTY_ADMIN_DATA = {
  users: [],
  organizations: [],
  groups: [],
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

function sortGroups(groups) {
  return [...groups].sort((left, right) =>
    left.name.localeCompare(right.name, "ru-RU")
  );
}

function sortUsers(users) {
  return [...users].sort((left, right) =>
    left.email.localeCompare(right.email, "ru-RU")
  );
}

function sortRoles(roles) {
  return [...roles].sort((left, right) =>
    left.code.localeCompare(right.code, "ru-RU")
  );
}

const PUBLIC_PAGES = new Set([
  "home",
  "catalog",
  "course-detail",
  "organization-info",
  "verify-document",
  "contacts",
  "faq",
  "privacy",
  "offer",
  "login",
]);

export default function App() {
  const [email, setEmail] = useState("admin@obrportal.local");
  const [password, setPassword] = useState("Admin123Local2026!");
  const [user, setUser] = useState(null);
  const [health, setHealth] = useState(null);
  const [ready, setReady] = useState(null);
  const [rbac, setRbac] = useState(null);
  const [adminData, setAdminData] = useState(EMPTY_ADMIN_DATA);
  const [adminDataLoadedAt, setAdminDataLoadedAt] = useState("");
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedPublicCourseId, setSelectedPublicCourseId] = useState(null);
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

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupLoading, setSelectedGroupLoading] = useState(false);
  const [selectedGroupError, setSelectedGroupError] = useState("");

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
      const [users, organizations, groups, roles, permissions, auditEvents] = await Promise.all([
        getAdminUsers(),
        getAdminOrganizations(),
        getOrgLearningGroups(),
        getAdminRoles(),
        getAdminPermissions(),
        getAdminAuditEvents(),
      ]);

      setAdminData({
        users,
        organizations,
        groups: sortGroups(groups),
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
        setCurrentPage("dashboard");
        await loadAdminData();
      } else {
        setCurrentPage("home");
      }
    } catch {
      clearToken();
      setUser(null);
      setRbac(null);
      setAdminData(EMPTY_ADMIN_DATA);
      setAdminDataLoadedAt("");
      clearSelectedUser();
      clearSelectedOrganization();
      clearSelectedGroup();
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

  function handleOpenPublicCourse(courseId) {
    setSelectedPublicCourseId(courseId);
    setCurrentPage("course-detail");
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthLoading(true);
    setError("");
    setRbac(null);
    clearSelectedUser();
    clearSelectedOrganization();
    clearSelectedGroup();
    clearSelectedRole();
    clearSelectedPermission();
    clearSelectedAuditEvent();

    try {
      await login(email, password);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (userHasRole(currentUser, "admin")) {
        setCurrentPage("dashboard");
        await loadAdminData();
      } else {
        setCurrentPage("home");
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

  async function handleCreateUser(payload) {
    const created = await createAdminUser(payload);

    setAdminData((current) => ({
      ...current,
      users: sortUsers([
        ...current.users.filter((item) => item.id !== created.id),
        created,
      ]),
    }));

    setSelectedUser(created);

    return created;
  }

  async function handleUpdateUser(userId, payload) {
    const updated = await updateAdminUser(userId, payload);

    setAdminData((current) => ({
      ...current,
      users: sortUsers(
        current.users.map((item) =>
          item.id === updated.id ? updated : item
        )
      ),
    }));

    setSelectedUser(updated);

    return updated;
  }

  async function handleResetUserPassword(userId, password) {
    const updated = await resetAdminUserPassword(userId, password);

    setAdminData((current) => ({
      ...current,
      users: sortUsers(
        current.users.map((item) =>
          item.id === updated.id ? updated : item
        )
      ),
    }));

    setSelectedUser(updated);

    return updated;
  }

  async function handleActivateUser(userId) {
    const updated = await activateAdminUser(userId);

    setAdminData((current) => ({
      ...current,
      users: sortUsers(
        current.users.map((item) =>
          item.id === updated.id ? updated : item
        )
      ),
    }));

    setSelectedUser(updated);

    return updated;
  }

  async function handleDeactivateUser(userId) {
    const updated = await deactivateAdminUser(userId);

    setAdminData((current) => ({
      ...current,
      users: sortUsers(
        current.users.map((item) =>
          item.id === updated.id ? updated : item
        )
      ),
    }));

    setSelectedUser(updated);

    return updated;
  }

  async function handleAssignUserRole(userId, payload) {
    const updated = await assignAdminUserRole(userId, payload);

    setAdminData((current) => ({
      ...current,
      users: sortUsers(
        current.users.map((item) =>
          item.id === updated.id ? updated : item
        )
      ),
    }));

    setSelectedUser(updated);

    return updated;
  }

  async function handleRemoveUserRole(userId, userRoleId) {
    const updated = await removeAdminUserRole(userId, userRoleId);

    setAdminData((current) => ({
      ...current,
      users: sortUsers(
        current.users.map((item) =>
          item.id === updated.id ? updated : item
        )
      ),
    }));

    setSelectedUser(updated);

    return updated;
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

  async function handleDeleteOrganization(organizationId) {
    const deleted = await deleteAdminOrganization(organizationId);

    setAdminData((current) => ({
      ...current,
      organizations: current.organizations.filter((organization) => organization.id !== organizationId),
    }));

    clearSelectedOrganization();

    return deleted;
  }

  async function handleOpenGroup(groupId) {
    setSelectedGroup(null);
    setSelectedGroupError("");
    setSelectedGroupLoading(true);

    try {
      const detail = await getOrgLearningGroupDetail(groupId);
      setSelectedGroup(detail);
    } catch (err) {
      setSelectedGroupError(`${err.status || ""} ${err.message}`);
    } finally {
      setSelectedGroupLoading(false);
    }
  }

  async function handleCreateGroup(payload) {
    const created = await createOrgLearningGroup(payload);

    setAdminData((current) => ({
      ...current,
      groups: sortGroups([
        ...current.groups.filter((group) => group.id !== created.id),
        created,
      ]),
    }));

    setSelectedGroup(created);

    return created;
  }

  async function handleUpdateGroup(groupId, payload) {
    const updated = await updateOrgLearningGroup(groupId, payload);

    setAdminData((current) => ({
      ...current,
      groups: sortGroups(
        current.groups.map((group) =>
          group.id === updated.id ? updated : group
        )
      ),
    }));

    setSelectedGroup(updated);

    return updated;
  }

  async function handleDeleteGroup(groupId) {
    const deleted = await deleteOrgLearningGroup(groupId);

    setAdminData((current) => ({
      ...current,
      groups: sortGroups(current.groups.filter((group) => group.id !== groupId)),
    }));

    if (selectedGroup?.id === groupId) {
      clearSelectedGroup();
    }

    return deleted;
  }

  async function handleCreateRole(payload) {
    const created = await createAdminRole(payload);

    setAdminData((current) => ({
      ...current,
      roles: sortRoles([
        ...current.roles.filter((role) => role.id !== created.id),
        created,
      ]),
    }));

    setSelectedRole(created);

    return created;
  }

  async function handleUpdateRole(roleId, payload) {
    const updated = await updateAdminRole(roleId, payload);

    setAdminData((current) => ({
      ...current,
      roles: sortRoles(
        current.roles.map((role) =>
          role.id === updated.id ? updated : role
        )
      ),
    }));

    setSelectedRole(updated);

    return updated;
  }



  async function handleDeleteRole(roleId) {
    const deleted = await deleteAdminRole(roleId);

    setAdminData((current) => ({
      ...current,
      roles: sortRoles(current.roles.filter((role) => role.id !== roleId)),
    }));

    if (selectedRole?.id === roleId) {
      clearSelectedRole();
    }

    return deleted;
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

  async function handleAssignRolePermission(roleId, payload) {
    const updated = await assignAdminRolePermission(roleId, payload);
    setSelectedRole(updated);

    return updated;
  }

  async function handleRemoveRolePermission(roleId, rolePermissionId) {
    const updated = await removeAdminRolePermission(roleId, rolePermissionId);
    setSelectedRole(updated);

    return updated;
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

  async function handleApplyAuditFilters(filters) {
    setAdminLoading(true);
    setError("");
    clearSelectedAuditEvent();

    try {
      const auditEvents = await getAdminAuditEvents(filters);

      setAdminData((current) => ({
        ...current,
        auditEvents,
      }));
      setAdminDataLoadedAt(getNowLabel());

      return auditEvents;
    } catch (err) {
      setError(`${err.status || ""} ${err.message}`);
      throw err;
    } finally {
      setAdminLoading(false);
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

  function clearSelectedGroup() {
    setSelectedGroup(null);
    setSelectedGroupLoading(false);
    setSelectedGroupError("");
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
    setCurrentPage("home");
    setError("");
    setAuthLoading(false);
    setAdminLoading(false);
    setInitializingAuth(false);
    clearSelectedUser();
    clearSelectedOrganization();
    clearSelectedGroup();
    clearSelectedRole();
    clearSelectedPermission();
    clearSelectedAuditEvent();
  }

  function renderCurrentPage() {
    if (currentPage === "home") {
      return <HomePage onPageChange={setCurrentPage} onOpenCourse={handleOpenPublicCourse} />;
    }

    if (currentPage === "catalog") {
      return <CatalogPage onPageChange={setCurrentPage} onOpenCourse={handleOpenPublicCourse} />;
    }

    if (currentPage === "course-detail") {
      return (
        <CourseDetailPage
          courseId={selectedPublicCourseId}
          onPageChange={setCurrentPage}
          onOpenCourse={handleOpenPublicCourse}
        />
      );
    }

    if (currentPage === "organization-info") {
      return <OrganizationInfoPage onPageChange={setCurrentPage} />;
    }

    if (currentPage === "verify-document") {
      return <VerifyDocumentPage onPageChange={setCurrentPage} />;
    }

    if (currentPage === "contacts") {
      return <ContactsPage onPageChange={setCurrentPage} />;
    }

    if (currentPage === "faq") {
      return <FaqPage onPageChange={setCurrentPage} />;
    }

    if (currentPage === "privacy") {
      return <PrivacyPage onPageChange={setCurrentPage} />;
    }

    if (currentPage === "offer") {
      return <OfferPage onPageChange={setCurrentPage} />;
    }

    if (currentPage === "login") {
      return (
        <AuthPage
          email={email}
          password={password}
          loading={authLoading || initializingAuth}
          error={error}
          user={user}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      );
    }
    if (currentPage === "users") {
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
          onDeleteOrganization={handleDeleteOrganization}
          onRefreshAdminData={loadAdminData}
        />
      );
    }

    if (currentPage === "groups") {
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

    if (currentPage === "roles") {
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
          onRefreshAdminData={loadAdminData}
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

  const pageContent = renderCurrentPage();
  const isPublicPage = PUBLIC_PAGES.has(currentPage);
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

  return isPublicPage ? (
    <PublicShell
      user={user}
      isAdmin={isAdmin}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
    >
      {pageContent}
    </PublicShell>
  ) : (
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
        groups: adminData.groups.length,
        roles: adminData.roles.length,
        permissions: adminData.permissions.length,
        auditEvents: adminData.auditEvents.length,
      }}
    >
      {pageContent}
    </AppShell>
  );
}

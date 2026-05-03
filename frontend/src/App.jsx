import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { PublicShell } from "./components/layout/PublicShell";
import {
  activateAdminUser,
  assignAdminRolePermission,
  assignAdminUserRole,
  checkAdminRbac,
  clearToken,
  enrollAccountCourse,
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
  getAdminCourses,
  getAdminDocuments,
  getAdminEnrollments,
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
  getPublicCourseDetail,
  getReady,
  getStoredToken,
  storeToken,
  login,
  registerUser,
  removeAdminRolePermission,
  removeAdminUserRole,
  resetAdminUserPassword,
  updateAdminOrganization,
  updateAdminRole,
  updateAdminUser,
  updateOrgLearningGroup,
} from "./api/client";
import { getAdminPageFromPathname, getAdminPathForPage, isAdminPathname } from "./utils/adminRoutes";
import {
  buildPublicMeta,
  ensureMetaDescriptionTag,
  getPublicPageFromPathname,
  PUBLIC_ROUTE_MAP,
} from "./utils/publicRoutes";
import {
  EMPTY_ADMIN_DATA,
  getNowLabel,
  sortGroups,
  sortOrganizations,
  sortRoles,
  sortUsers,
  userHasRole,
} from "./utils/adminState";
import { AdminNotFoundPage } from "./pages/AdminNotFoundPage";
import { PublicRoutes } from "./routes/PublicRoutes";
import { AdminPageRenderer } from "./routes/AdminPageRenderer";

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

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const meta = isAdminPathname(location.pathname)
      ? {
          title: "Административный контур — ObrPortal",
          description: "Административный контур образовательной платформы с управлением пользователями, организациями, группами и RBAC.",
        }
      : buildPublicMeta(location.pathname);

    document.title = meta.title;
    const metaDescriptionTag = ensureMetaDescriptionTag();
    metaDescriptionTag.setAttribute("content", meta.description);
  }, [location.pathname]);

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
      const [
        users,
        organizations,
        groups,
        courses,
        enrollments,
        documents,
        roles,
        permissions,
        auditEvents,
      ] = await Promise.all([
        getAdminUsers(),
        getAdminOrganizations(),
        getOrgLearningGroups(),
        getAdminCourses({ limit: 300 }),
        getAdminEnrollments({ limit: 300 }),
        getAdminDocuments({ limit: 300 }),
        getAdminRoles(),
        getAdminPermissions(),
        getAdminAuditEvents(),
      ]);

      setAdminData({
        users,
        organizations,
        groups: sortGroups(groups),
        courses,
        enrollments,
        documents,
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
        setCurrentPage("account");
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

  function handleNavigatePublicPage(pageKey) {
    if (pageKey === "dashboard" || pageKey === "admin") {
      navigate("/admin");
      return;
    }

    navigate(PUBLIC_ROUTE_MAP[pageKey] || "/");
  }

  function handleNavigateAdminPage(pageKey) {
    const path = getAdminPathForPage(pageKey);

    setCurrentPage(pageKey);
    navigate(path);
  }

  function handleOpenPublicCourse(courseSlug) {
    navigate(`/courses/${courseSlug}`);
  }

  function getPendingEnrollmentSlug() {
    try {
      return localStorage.getItem("obrportal_pending_enrollment_slug") || "";
    } catch {
      return "";
    }
  }

  function clearPendingEnrollmentSlug() {
    try {
      localStorage.removeItem("obrportal_pending_enrollment_slug");
    } catch {
      // localStorage может быть недоступен в приватном режиме или тестовой среде
    }
  }

  function setAccountEnrollmentNotice(notice) {
    try {
      sessionStorage.setItem("obrportal_account_notice", JSON.stringify(notice));
    } catch {
      // sessionStorage может быть недоступен в приватном режиме или тестовой среде
    }
  }

  async function completePendingEnrollmentIfNeeded() {
    const pendingSlug = getPendingEnrollmentSlug();

    if (!pendingSlug) {
      return null;
    }

    try {
      const course = await getPublicCourseDetail(pendingSlug);
      await enrollAccountCourse(course.id);
      clearPendingEnrollmentSlug();
      setAccountEnrollmentNotice({
        tone: "green",
        title: "Запись на курс",
        message: "Вы успешно записаны на выбранную программу. Курс добавлен в личный кабинет.",
      });

      return {
        status: "created",
        slug: pendingSlug,
      };
    } catch (err) {
      if (err.status === 409) {
        clearPendingEnrollmentSlug();
        setAccountEnrollmentNotice({
          tone: "green",
          title: "Курс уже назначен",
          message: "Вы уже были записаны на выбранную программу. Курс доступен в личном кабинете.",
        });

        return {
          status: "already_enrolled",
          slug: pendingSlug,
        };
      }

      if (err.status === 404) {
        clearPendingEnrollmentSlug();
        setAccountEnrollmentNotice({
          tone: "red",
          title: "Курс не найден",
          message: "Выбранная программа больше не опубликована или была отключена администратором.",
        });

        return {
          status: "not_found",
          slug: pendingSlug,
        };
      }

      setError(`${err.status || ""} ${err.message || "Не удалось автоматически записать на выбранную программу."}`.trim());

      return {
        status: "failed",
        slug: pendingSlug,
      };
    }
  }

  async function handleRegister(payload) {
    setAuthLoading(true);
    setError("");

    try {
      const tokenResponse = await registerUser(payload);
      storeToken(tokenResponse.access_token);

      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (userHasRole(currentUser, "admin")) {
        setCurrentPage("dashboard");
        await loadAdminData();
        navigate("/admin", { replace: true });
      } else {
        setAdminData(EMPTY_ADMIN_DATA);
        setAdminDataLoadedAt("");
        await completePendingEnrollmentIfNeeded();
        navigate("/account", { replace: true });
      }

      return currentUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
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
        navigate("/admin", { replace: true });
      } else {
        setAdminData(EMPTY_ADMIN_DATA);
        setAdminDataLoadedAt("");
        await completePendingEnrollmentIfNeeded();
        navigate("/account", { replace: true });
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
    setCurrentPage("dashboard");
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

  const isAdminRoute = isAdminPathname(location.pathname);
  const adminRoutePage = getAdminPageFromPathname(location.pathname);
  const isUnknownAdminRoute = isAdminRoute && !adminRoutePage;

  const adminPageContent = isUnknownAdminRoute ? (
    <AdminNotFoundPage
      pathname={location.pathname}
      onOpenDashboard={() => handleNavigateAdminPage("dashboard")}
    />
  ) : (
    <AdminPageRenderer
      locationPathname={location.pathname}
      currentPage={currentPage}
      email={email}
      password={password}
      authLoading={authLoading}
      initializingAuth={initializingAuth}
      adminLoading={adminLoading}
      error={error}
      user={user}
      rbac={rbac}
      adminData={adminData}
      adminDataLoadedAt={adminDataLoadedAt}
      setEmail={setEmail}
      setPassword={setPassword}
      handleLogin={handleLogin}
      handleLogout={handleLogout}
      handleRbacCheck={handleRbacCheck}
      loadAdminData={loadAdminData}
      selectedUser={selectedUser}
      selectedUserLoading={selectedUserLoading}
      selectedUserError={selectedUserError}
      handleOpenUser={handleOpenUser}
      clearSelectedUser={clearSelectedUser}
      handleCreateUser={handleCreateUser}
      handleUpdateUser={handleUpdateUser}
      handleResetUserPassword={handleResetUserPassword}
      handleActivateUser={handleActivateUser}
      handleDeactivateUser={handleDeactivateUser}
      handleAssignUserRole={handleAssignUserRole}
      handleRemoveUserRole={handleRemoveUserRole}
      selectedOrganization={selectedOrganization}
      selectedOrganizationLoading={selectedOrganizationLoading}
      selectedOrganizationError={selectedOrganizationError}
      handleOpenOrganization={handleOpenOrganization}
      clearSelectedOrganization={clearSelectedOrganization}
      handleCreateOrganization={handleCreateOrganization}
      handleUpdateOrganization={handleUpdateOrganization}
      handleDeleteOrganization={handleDeleteOrganization}
      selectedGroup={selectedGroup}
      selectedGroupLoading={selectedGroupLoading}
      selectedGroupError={selectedGroupError}
      handleOpenGroup={handleOpenGroup}
      clearSelectedGroup={clearSelectedGroup}
      handleCreateGroup={handleCreateGroup}
      handleUpdateGroup={handleUpdateGroup}
      handleDeleteGroup={handleDeleteGroup}
      selectedRole={selectedRole}
      selectedRoleLoading={selectedRoleLoading}
      selectedRoleError={selectedRoleError}
      handleOpenRole={handleOpenRole}
      clearSelectedRole={clearSelectedRole}
      handleCreateRole={handleCreateRole}
      handleUpdateRole={handleUpdateRole}
      handleDeleteRole={handleDeleteRole}
      handleAssignRolePermission={handleAssignRolePermission}
      handleRemoveRolePermission={handleRemoveRolePermission}
      selectedPermission={selectedPermission}
      selectedPermissionLoading={selectedPermissionLoading}
      selectedPermissionError={selectedPermissionError}
      handleOpenPermission={handleOpenPermission}
      clearSelectedPermission={clearSelectedPermission}
      selectedAuditEvent={selectedAuditEvent}
      selectedAuditEventLoading={selectedAuditEventLoading}
      selectedAuditEventError={selectedAuditEventError}
      handleOpenAuditEvent={handleOpenAuditEvent}
      clearSelectedAuditEvent={clearSelectedAuditEvent}
      handleApplyAuditFilters={handleApplyAuditFilters}
    />
  );

  const activeAdminPage = adminRoutePage || currentPage;
  const currentPublicPage = getPublicPageFromPathname(location.pathname);
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

  if (isAdminRoute) {
    if (initializingAuth) {
      return (
        <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
          <div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            Инициализация сессии...
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
      currentPage={currentPublicPage}
      onPageChange={handleNavigatePublicPage}
    >
      <PublicRoutes
        email={email}
        password={password}
        error={error}
        authLoading={authLoading}
        initializingAuth={initializingAuth}
        user={user}
        isAdmin={isAdmin}
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

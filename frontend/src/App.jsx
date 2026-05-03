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
import { useAdminSelections } from "./hooks/useAdminSelections";
import {
  removeAdminCollectionItem,
  replaceAdminCollectionItem,
  upsertAdminCollectionItem,
} from "./utils/adminCollectionState";

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
      clearAllSelections();
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
    clearAllSelections();

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
    return openSelection({
      setValue: setSelectedUser,
      setLoading: setSelectedUserLoading,
      setError: setSelectedUserError,
      load: () => getAdminUserDetail(userId),
    });
  }

  async function handleCreateUser(payload) {
    const created = await createAdminUser(payload);

    upsertAdminCollectionItem(setAdminData, "users", created, sortUsers);
    setSelectedUser(created);

    return created;
  }

  async function handleUpdateUser(userId, payload) {
    const updated = await updateAdminUser(userId, payload);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleResetUserPassword(userId, password) {
    const updated = await resetAdminUserPassword(userId, password);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleActivateUser(userId) {
    const updated = await activateAdminUser(userId);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleDeactivateUser(userId) {
    const updated = await deactivateAdminUser(userId);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleAssignUserRole(userId, payload) {
    const updated = await assignAdminUserRole(userId, payload);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleRemoveUserRole(userId, userRoleId) {
    const updated = await removeAdminUserRole(userId, userRoleId);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleOpenOrganization(organizationId) {
    return openSelection({
      setValue: setSelectedOrganization,
      setLoading: setSelectedOrganizationLoading,
      setError: setSelectedOrganizationError,
      load: () => getAdminOrganizationDetail(organizationId),
    });
  }

  async function handleCreateOrganization(payload) {
    const created = await createAdminOrganization(payload);

    upsertAdminCollectionItem(setAdminData, "organizations", created, sortOrganizations);
    setSelectedOrganization(created);

    return created;
  }

  async function handleUpdateOrganization(organizationId, payload) {
    const updated = await updateAdminOrganization(organizationId, payload);

    replaceAdminCollectionItem(setAdminData, "organizations", updated, sortOrganizations);
    setSelectedOrganization(updated);

    return updated;
  }

  async function handleDeleteOrganization(organizationId) {
    const deleted = await deleteAdminOrganization(organizationId);

    removeAdminCollectionItem(setAdminData, "organizations", organizationId);
    clearSelectedOrganization();

    return deleted;
  }

  async function handleOpenGroup(groupId) {
    return openSelection({
      setValue: setSelectedGroup,
      setLoading: setSelectedGroupLoading,
      setError: setSelectedGroupError,
      load: () => getOrgLearningGroupDetail(groupId),
    });
  }

  async function handleCreateGroup(payload) {
    const created = await createOrgLearningGroup(payload);

    upsertAdminCollectionItem(setAdminData, "groups", created, sortGroups);
    setSelectedGroup(created);

    return created;
  }

  async function handleUpdateGroup(groupId, payload) {
    const updated = await updateOrgLearningGroup(groupId, payload);

    replaceAdminCollectionItem(setAdminData, "groups", updated, sortGroups);
    setSelectedGroup(updated);

    return updated;
  }

  async function handleDeleteGroup(groupId) {
    const deleted = await deleteOrgLearningGroup(groupId);

    removeAdminCollectionItem(setAdminData, "groups", groupId, sortGroups);

    if (selectedGroup?.id === groupId) {
      clearSelectedGroup();
    }

    return deleted;
  }

  async function handleCreateRole(payload) {
    const created = await createAdminRole(payload);

    upsertAdminCollectionItem(setAdminData, "roles", created, sortRoles);
    setSelectedRole(created);

    return created;
  }

  async function handleUpdateRole(roleId, payload) {
    const updated = await updateAdminRole(roleId, payload);

    replaceAdminCollectionItem(setAdminData, "roles", updated, sortRoles);
    setSelectedRole(updated);

    return updated;
  }

  async function handleDeleteRole(roleId) {
    const deleted = await deleteAdminRole(roleId);

    removeAdminCollectionItem(setAdminData, "roles", roleId, sortRoles);

    if (selectedRole?.id === roleId) {
      clearSelectedRole();
    }

    return deleted;
  }

  async function handleOpenRole(roleId) {
    return openSelection({
      setValue: setSelectedRole,
      setLoading: setSelectedRoleLoading,
      setError: setSelectedRoleError,
      load: () => getAdminRoleDetail(roleId),
    });
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
    return openSelection({
      setValue: setSelectedPermission,
      setLoading: setSelectedPermissionLoading,
      setError: setSelectedPermissionError,
      load: () => getAdminPermissionDetail(permissionId),
    });
  }

  async function handleOpenAuditEvent(auditEventId) {
    return openSelection({
      setValue: setSelectedAuditEvent,
      setLoading: setSelectedAuditEventLoading,
      setError: setSelectedAuditEventError,
      load: () => getAdminAuditEventDetail(auditEventId),
    });
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
    clearAllSelections();
  }

  const isAdminRoute = isAdminPathname(location.pathname);
  const adminRoutePage = getAdminPageFromPathname(location.pathname);
  const isUnknownAdminRoute = isAdminRoute && !adminRoutePage;

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
  };

  const adminPageContent = isUnknownAdminRoute ? (
    <AdminNotFoundPage
      pathname={location.pathname}
      onOpenDashboard={() => handleNavigateAdminPage("dashboard")}
    />
  ) : (
    <AdminPageRenderer {...adminPageRendererProps} />
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

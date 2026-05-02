import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
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
import { PUBLIC_COURSES } from "./data/publicCourses";
import { getAdminPageFromPathname, getAdminPathForPage } from "./utils/adminRoutes";
import { AuditPage } from "./pages/AuditPage";
import { AccountPage } from "./pages/AccountPage";
import { AuthPage } from "./pages/AuthPage";
import { CatalogPage } from "./pages/CatalogPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { ContactsPage } from "./pages/ContactsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminCoursesPage } from "./pages/AdminCoursesPage";
import { AdminEnrollmentsPage } from "./pages/AdminEnrollmentsPage";
import { AdminNotFoundPage } from "./pages/AdminNotFoundPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { FaqPage } from "./pages/FaqPage";
import { GroupsPage } from "./pages/GroupsPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OfferPage } from "./pages/OfferPage";
import { OrganizationInfoPage } from "./pages/OrganizationInfoPage";
import { OrganizationsPage } from "./pages/OrganizationsPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RolesPage } from "./pages/RolesPage";
import { UsersPage } from "./pages/UsersPage";
import { VerifyDocumentPage } from "./pages/VerifyDocumentPage";

const EMPTY_ADMIN_DATA = {
  users: [],
  organizations: [],
  groups: [],
  courses: [],
  enrollments: [],
  documents: [],
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

const PUBLIC_ROUTE_MAP = {
  home: "/",
  catalog: "/catalog",
  "organization-info": "/organization-info",
  "verify-document": "/verify-document",
  contacts: "/contacts",
  faq: "/faq",
  privacy: "/privacy",
  offer: "/offer",
  login: "/login",
  register: "/register",
  account: "/account",
};

function getPublicPageFromPathname(pathname) {
  if (pathname === "/") return "home";
  if (pathname === "/catalog") return "catalog";
  if (pathname.startsWith("/courses/")) return "course-detail";
  if (pathname === "/organization-info") return "organization-info";
  if (pathname === "/verify-document") return "verify-document";
  if (pathname.startsWith("/verify/")) return "verify-document";
  if (pathname === "/contacts") return "contacts";
  if (pathname === "/faq") return "faq";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/offer") return "offer";
  if (pathname === "/login") return "login";
  if (pathname === "/register") return "register";
  if (pathname === "/account") return "account";
  return "not-found";
}

function CourseDetailPublicRoute({ onPageChange, onOpenCourse, user }) {
  const { slug } = useParams();

  return (
    <CourseDetailPage
      courseSlug={slug}
      onPageChange={onPageChange}
      onOpenCourse={onOpenCourse}
      user={user}
    />
  );
}


function VerifyDocumentCodeRoute({ onPageChange }) {
  const { code } = useParams();

  return <VerifyDocumentPage onPageChange={onPageChange} initialCode={code || ""} />;
}

function ensureMetaDescriptionTag() {
  let element = document.querySelector('meta[name="description"]');

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", "description");
    document.head.appendChild(element);
  }

  return element;
}

function buildPublicMeta(pathname) {
  if (pathname === "/") {
    return {
      title: "ObrPortal — образовательная платформа",
      description:
        "Публичный сайт образовательной платформы: каталог программ, сведения об организации, проверка документов и правовые страницы.",
    };
  }

  if (pathname === "/catalog") {
    return {
      title: "Каталог программ — ObrPortal",
      description:
        "Публичный каталог образовательных программ с карточками курсов, стоимостью, форматом обучения и итоговыми документами.",
    };
  }

  if (pathname.startsWith("/courses/")) {
    const slug = pathname.replace(/^\/courses\//, "").replace(/\/$/, "");
    const course = PUBLIC_COURSES.find((item) => item.slug === slug);

    if (course) {
      return {
        title: `${course.title} — ObrPortal`,
        description: `${course.title}. Формат: ${course.format}. Объем: ${course.hours} часов. Итоговый документ: ${course.document}.`,
      };
    }

    return {
      title: "Карточка курса — ObrPortal",
      description:
        "Описание образовательной программы, условий обучения, итоговой аттестации и итогового документа.",
    };
  }

  if (pathname === "/organization-info") {
    return {
      title: "Сведения об образовательной организации — ObrPortal",
      description:
        "Официальный публичный раздел со сведениями об образовательной организации, документах, программах и контактных данных.",
    };
  }

  if (pathname === "/verify-document" || pathname.startsWith("/verify/")) {
    return {
      title: "Проверка документа — ObrPortal",
      description:
        "Публичная проверка подлинности итогового документа по номеру или безопасному идентификатору.",
    };
  }

  if (pathname === "/contacts") {
    return {
      title: "Контакты — ObrPortal",
      description:
        "Публичные контакты образовательной платформы для физических лиц, юридических лиц и обращений по документам.",
    };
  }

  if (pathname === "/faq") {
    return {
      title: "FAQ — ObrPortal",
      description:
        "Частые вопросы по курсам, обучению, итоговым документам, проверке подлинности и работе платформы.",
    };
  }

  if (pathname === "/privacy") {
    return {
      title: "Политика обработки персональных данных — ObrPortal",
      description:
        "Публичная политика обработки персональных данных: цели, состав данных, правовые основания и права субъекта.",
    };
  }

  if (pathname === "/offer") {
    return {
      title: "Оферта — ObrPortal",
      description:
        "Публичная оферта образовательной платформы: предмет услуги, порядок акцепта, оплата, доступ к обучению и ответственность сторон.",
    };
  }

  if (pathname === "/login") {
    return {
      title: "Вход — ObrPortal",
      description:
        "Публичная точка входа в образовательную платформу для пользователей и административных ролей.",
    };
  }

  if (pathname === "/register") {
    return {
      title: "Регистрация — ObrPortal",
      description:
        "Публичная страница регистрации пользователя. На текущем этапе это UX-экран для будущего signup flow.",
    };
  }

  if (pathname === "/account") {
    return {
      title: "Личный кабинет — ObrPortal",
      description:
        "Личный кабинет пользователя образовательной платформы с будущими разделами программ, обучения и документов.",
    };
  }

  return {
    title: "Страница не найдена — ObrPortal",
    description:
      "Запрошенная страница не найдена. Вернитесь на главную, в каталог программ или в обязательные публичные разделы.",
  };
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
    const meta = location.pathname === "/admin" || location.pathname.startsWith("/admin/")
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

  function renderCurrentPage() {
    const page = getAdminPageFromPathname(location.pathname) || currentPage;

    if (page === "home") {
      return <HomePage onPageChange={handleNavigatePublicPage} onOpenCourse={handleOpenPublicCourse} />;
    }

    if (page === "catalog") {
      return <CatalogPage onPageChange={handleNavigatePublicPage} onOpenCourse={handleOpenPublicCourse} user={user} />;
    }

    if (page === "course-detail") {
      return (
        <CourseDetailPage
          courseSlug={null}
          onPageChange={handleNavigatePublicPage}
          onOpenCourse={handleOpenPublicCourse}
        />
      );
    }

    if (page === "organization-info") {
      return <OrganizationInfoPage onPageChange={handleNavigatePublicPage} />;
    }

    if (page === "verify-document") {
      return <VerifyDocumentPage onPageChange={handleNavigatePublicPage} />;
    }

    if (page === "contacts") {
      return <ContactsPage onPageChange={handleNavigatePublicPage} />;
    }

    if (page === "faq") {
      return <FaqPage onPageChange={handleNavigatePublicPage} />;
    }

    if (page === "privacy") {
      return <PrivacyPage onPageChange={handleNavigatePublicPage} />;
    }

    if (page === "offer") {
      return <OfferPage onPageChange={handleNavigatePublicPage} />;
    }

    if (page === "login") {
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

  const isAdminRoute = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const adminRoutePage = getAdminPageFromPathname(location.pathname);
  const isUnknownAdminRoute = isAdminRoute && !adminRoutePage;

  const adminPageContent = isUnknownAdminRoute ? (
    <AdminNotFoundPage
      pathname={location.pathname}
      onOpenDashboard={() => handleNavigateAdminPage("dashboard")}
    />
  ) : renderCurrentPage();

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
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              onPageChange={handleNavigatePublicPage}
              onOpenCourse={handleOpenPublicCourse}
            />
          }
        />
        <Route
          path="/catalog"
          element={
            <CatalogPage
              onPageChange={handleNavigatePublicPage}
              onOpenCourse={handleOpenPublicCourse}
              user={user}
            />
          }
        />
        <Route
          path="/courses/:slug"
          element={
            <CourseDetailPublicRoute
              onPageChange={handleNavigatePublicPage}
              onOpenCourse={handleOpenPublicCourse}
              user={user}
            />
          }
        />
        <Route
          path="/organization-info"
          element={<OrganizationInfoPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/verify/:code"
          element={<VerifyDocumentCodeRoute onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/verify-document"
          element={<VerifyDocumentPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/contacts"
          element={<ContactsPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/faq"
          element={<FaqPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/privacy"
          element={<PrivacyPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/offer"
          element={<OfferPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/login"
          element={
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
              onPageChange={handleNavigatePublicPage}
            />
          }
        />
        <Route
          path="/register"
          element={
            <RegisterPage
              onPageChange={handleNavigatePublicPage}
              onRegister={handleRegister}
              loading={authLoading || initializingAuth}
              error={error}
            />
          }
        />
        <Route
          path="/account"
          element={
            user ? (
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : (
                <AccountPage
                  user={user}
                  onPageChange={handleNavigatePublicPage}
                  onLogout={handleLogout}
                  onOpenCourse={handleOpenPublicCourse}
                />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
          <Route
            path="/admin/documents"
            element={
              user ? (
                isAdmin ? (
                  <DocumentsPage />
                ) : (
                  <Navigate to="/account" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        <Route path="*" element={<NotFoundPage onPageChange={handleNavigatePublicPage} />} />
      </Routes>
    </PublicShell>
  );
}

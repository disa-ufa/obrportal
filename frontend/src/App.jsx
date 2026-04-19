import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import {
  checkAdminRbac,
  clearToken,
  getAdminAuditEvents,
  getAdminPermissions,
  getAdminRoles,
  getAdminUsers,
  getCurrentUser,
  getHealth,
  getReady,
  getStoredToken,
  login,
} from "./api/client";
import { AuditPage } from "./pages/AuditPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { RolesPage } from "./pages/RolesPage";
import { UsersPage } from "./pages/UsersPage";

const EMPTY_ADMIN_DATA = {
  users: [],
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
      const [users, roles, permissions, auditEvents] = await Promise.all([
        getAdminUsers(),
        getAdminRoles(),
        getAdminPermissions(),
        getAdminAuditEvents(),
      ]);

      setAdminData({
        users,
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
  }

  function renderCurrentPage() {
    if (currentPage === "users") {
      return (
        <UsersPage
          user={user}
          users={adminData.users}
          loading={adminLoading}
        />
      );
    }

    if (currentPage === "roles") {
      return (
        <RolesPage
          user={user}
          roles={adminData.roles}
          loading={adminLoading}
        />
      );
    }

    if (currentPage === "permissions") {
      return (
        <PermissionsPage
          user={user}
          permissions={adminData.permissions}
          loading={adminLoading}
        />
      );
    }

    if (currentPage === "audit") {
      return (
        <AuditPage
          user={user}
          auditEvents={adminData.auditEvents}
          loading={adminLoading}
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
        roles: adminData.roles.length,
        permissions: adminData.permissions.length,
        auditEvents: adminData.auditEvents.length,
      }}
    >
      {renderCurrentPage()}
    </AppShell>
  );
}

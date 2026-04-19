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

export default function App() {
  const [email, setEmail] = useState("admin@obrportal.local");
  const [password, setPassword] = useState("Admin123Local2026!");
  const [user, setUser] = useState(null);
  const [health, setHealth] = useState(null);
  const [ready, setReady] = useState(null);
  const [rbac, setRbac] = useState(null);
  const [adminData, setAdminData] = useState(EMPTY_ADMIN_DATA);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  async function loadAdminData({ silent = false } = {}) {
    if (!silent) {
      setLoading(true);
    }

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
    } catch (err) {
      setError(`${err.status || ""} ${err.message}`);
      setAdminData(EMPTY_ADMIN_DATA);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function bootstrapAuthState() {
    setInitializingAuth(true);

    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setAdminData(EMPTY_ADMIN_DATA);
      setInitializingAuth(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (userHasRole(currentUser, "admin")) {
        await loadAdminData({ silent: true });
      }
    } catch {
      clearToken();
      setUser(null);
      setRbac(null);
      setAdminData(EMPTY_ADMIN_DATA);
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
    setLoading(true);
    setError("");
    setRbac(null);

    try {
      await login(email, password);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (userHasRole(currentUser, "admin")) {
        await loadAdminData({ silent: true });
      } else {
        setAdminData(EMPTY_ADMIN_DATA);
      }
    } catch (err) {
      setError(err.message);
      setUser(null);
      setAdminData(EMPTY_ADMIN_DATA);
    } finally {
      setLoading(false);
      setInitializingAuth(false);
    }
  }

  async function handleRbacCheck() {
    setLoading(true);
    setError("");

    try {
      const data = await checkAdminRbac();
      setRbac(data);
    } catch (err) {
      setError(`${err.status || ""} ${err.message}`);
      setRbac(null);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setRbac(null);
    setAdminData(EMPTY_ADMIN_DATA);
    setCurrentPage("dashboard");
    setError("");
    setInitializingAuth(false);
  }

  function renderCurrentPage() {
    if (currentPage === "users") {
      return <UsersPage user={user} users={adminData.users} />;
    }

    if (currentPage === "roles") {
      return <RolesPage user={user} roles={adminData.roles} />;
    }

    if (currentPage === "permissions") {
      return <PermissionsPage user={user} permissions={adminData.permissions} />;
    }

    if (currentPage === "audit") {
      return <AuditPage user={user} auditEvents={adminData.auditEvents} />;
    }

    return (
      <DashboardPage
        email={email}
        password={password}
        loading={loading || initializingAuth}
        error={error}
        user={user}
        rbac={rbac}
        adminData={adminData}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRbacCheck={handleRbacCheck}
        onRefreshAdminData={() => loadAdminData()}
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

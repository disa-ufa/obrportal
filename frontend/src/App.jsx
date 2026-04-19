import { useEffect, useState } from "react";
import { AdminReadOnlyPanel } from "./components/admin/AdminReadOnlyPanel";
import { RbacResult } from "./components/admin/RbacResult";
import { AuthPanel } from "./components/auth/AuthPanel";
import { CurrentUserCard } from "./components/auth/CurrentUserCard";
import { StatusBadge } from "./components/ui/StatusBadge";
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
  const [activeTab, setActiveTab] = useState("users");
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
    setError("");
    setInitializingAuth(false);
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
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                ObrPortal · Stage 6
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Admin read-only panel
              </h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                Первый рабочий back-office shell: вход, JWT, /auth/me, RBAC-check,
                пользователи, роли, права и audit events из реального backend API.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={health?.status === "ok" ? "green" : "red"}>
                health: {health?.status || "unknown"}
              </StatusBadge>
              <StatusBadge tone={ready?.status === "ok" ? "green" : "red"}>
                ready: {ready?.status || "unknown"}
              </StatusBadge>
              <StatusBadge tone={authBadgeTone}>
                {authBadgeText}
              </StatusBadge>
              {isAdmin && <StatusBadge tone="amber">admin</StatusBadge>}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <AuthPanel
            email={email}
            password={password}
            loading={loading || initializingAuth}
            error={error}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />

          <CurrentUserCard
            user={user}
            loading={loading || initializingAuth}
            onRbacCheck={handleRbacCheck}
            onRefreshAdminData={() => loadAdminData()}
          />
        </div>

        <RbacResult rbac={rbac} />

        <AdminReadOnlyPanel
          user={user}
          adminData={adminData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </main>
  );
}

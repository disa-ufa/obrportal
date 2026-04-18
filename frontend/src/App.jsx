import { useEffect, useState } from "react";
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

function StatusBadge({ children, tone = "gray" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    gray: "bg-slate-50 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function SmallTable({ columns, rows, emptyText }) {
  if (!rows?.length) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 ring-1 ring-slate-200">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-2xl ring-1 ring-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, index) => (
            <tr key={row.id || `${row.code}-${index}`}>
              {columns.map((column) => (
                <td key={column.key} className="max-w-xs whitespace-nowrap px-4 py-3 text-slate-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [email, setEmail] = useState("admin@obrportal.local");
  const [password, setPassword] = useState("Admin123Local2026!");
  const [user, setUser] = useState(null);
  const [health, setHealth] = useState(null);
  const [ready, setReady] = useState(null);
  const [rbac, setRbac] = useState(null);
  const [adminData, setAdminData] = useState({
    users: [],
    roles: [],
    permissions: [],
    auditEvents: [],
  });
  const [activeTab, setActiveTab] = useState("users");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function loadMe() {
    if (!getStoredToken()) {
      return;
    }

    try {
      const data = await getCurrentUser();
      setUser(data);
    } catch {
      clearToken();
      setUser(null);
    }
  }

  async function loadAdminData() {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSystemStatus();
    loadMe();
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
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    setAdminData({
      users: [],
      roles: [],
      permissions: [],
      auditEvents: [],
    });
    setError("");
  }

  const isAdmin = user?.roles?.some((role) => role.code === "admin");

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
              <StatusBadge tone={user ? "blue" : "gray"}>
                {user ? "authenticated" : "guest"}
              </StatusBadge>
              {isAdmin && <StatusBadge tone="amber">admin</StatusBadge>}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="Вход администратора"
            subtitle="Тестовый пользователь создан через seed_admin.py."
          >
            <form className="space-y-4" onSubmit={handleLogin}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Пароль</span>
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Загрузка..." : "Войти и загрузить admin API"}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Выйти
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Текущий пользователь">
            {!user ? (
              <p className="text-slate-600">
                Пользователь ещё не авторизован.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-sm text-slate-500">Email</div>
                  <div className="font-semibold">{user.email}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-sm text-slate-500">ФИО</div>
                  <div className="font-semibold">{user.full_name || "—"}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-700">Роли</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <StatusBadge key={role.code} tone="blue">
                        {role.code}
                      </StatusBadge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRbacCheck}
                    disabled={loading}
                    className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                  >
                    Проверить admin RBAC
                  </button>

                  <button
                    type="button"
                    onClick={loadAdminData}
                    disabled={loading}
                    className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    Обновить admin API
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard title="RBAC result">
          {!rbac ? (
            <p className="text-slate-600">
              RBAC-проверка ещё не запускалась.
            </p>
          ) : (
            <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">
              {JSON.stringify(rbac, null, 2)}
            </pre>
          )}
        </SectionCard>

        <SectionCard
          title="Admin API"
          subtitle="Read-only данные из backend: users, roles, permissions, audit-events."
        >
          {!user ? (
            <p className="text-slate-600">
              Войдите под admin, чтобы загрузить служебные данные.
            </p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {[
                  ["users", `Пользователи (${adminData.users.length})`],
                  ["roles", `Роли (${adminData.roles.length})`],
                  ["permissions", `Права (${adminData.permissions.length})`],
                  ["audit", `Аудит (${adminData.auditEvents.length})`],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                      activeTab === key
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === "users" && (
                <SmallTable
                  emptyText="Пользователей нет."
                  rows={adminData.users}
                  columns={[
                    { key: "email", title: "Email" },
                    { key: "full_name", title: "ФИО" },
                    {
                      key: "roles",
                      title: "Роли",
                      render: (row) => row.roles.map((role) => role.code).join(", "),
                    },
                    {
                      key: "is_active",
                      title: "Активен",
                      render: (row) => row.is_active ? "да" : "нет",
                    },
                  ]}
                />
              )}

              {activeTab === "roles" && (
                <SmallTable
                  emptyText="Ролей нет."
                  rows={adminData.roles}
                  columns={[
                    { key: "code", title: "Код" },
                    { key: "name", title: "Название" },
                    { key: "description", title: "Описание" },
                  ]}
                />
              )}

              {activeTab === "permissions" && (
                <SmallTable
                  emptyText="Прав нет."
                  rows={adminData.permissions}
                  columns={[
                    { key: "code", title: "Код" },
                    { key: "name", title: "Название" },
                  ]}
                />
              )}

              {activeTab === "audit" && (
                <SmallTable
                  emptyText="Событий аудита нет."
                  rows={adminData.auditEvents}
                  columns={[
                    { key: "action", title: "Действие" },
                    { key: "entity_type", title: "Сущность" },
                    {
                      key: "payload",
                      title: "Payload",
                      render: (row) => JSON.stringify(row.payload),
                    },
                    { key: "created_at", title: "Дата" },
                  ]}
                />
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}

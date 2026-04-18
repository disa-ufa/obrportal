import { useEffect, useState } from "react";
import {
  checkAdminRbac,
  clearToken,
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
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function App() {
  const [email, setEmail] = useState("admin@obrportal.local");
  const [password, setPassword] = useState("Admin123Local2026!");
  const [user, setUser] = useState(null);
  const [health, setHealth] = useState(null);
  const [ready, setReady] = useState(null);
  const [rbac, setRbac] = useState(null);
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
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                ObrPortal · Stage 6
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Auth/RBAC frontend shell
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                Первый рабочий контур входа: frontend отправляет логин в backend,
                получает JWT, читает /auth/me и проверяет защищённый RBAC endpoint.
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
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold">Вход администратора</h2>
            <p className="mt-2 text-sm text-slate-600">
              Тестовый пользователь создан через seed_admin.py.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
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
                  {loading ? "Проверяем..." : "Войти"}
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
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold">Текущий пользователь</h2>

            {!user ? (
              <p className="mt-4 text-slate-600">
                Пользователь ещё не авторизован.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
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

                <button
                  type="button"
                  onClick={handleRbacCheck}
                  disabled={loading}
                  className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Проверить admin RBAC
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold">RBAC result</h2>

          {!rbac ? (
            <p className="mt-4 text-slate-600">
              RBAC-проверка ещё не запускалась.
            </p>
          ) : (
            <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">
              {JSON.stringify(rbac, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </main>
  );
}

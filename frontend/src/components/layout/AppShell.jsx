import { StatusBadge } from "../ui/StatusBadge";

const NAV_ITEMS = [
  { key: "dashboard", label: "Обзор" },
  { key: "users", label: "Пользователи" },
  { key: "roles", label: "Роли" },
  { key: "permissions", label: "Права" },
  { key: "audit", label: "Аудит" },
];

export function AppShell({
  health,
  ready,
  user,
  isAdmin,
  authBadgeText,
  authBadgeTone,
  currentPage,
  onPageChange,
  counts,
  children,
}) {
  function getCount(key) {
    if (key === "users") return counts.users;
    if (key === "roles") return counts.roles;
    if (key === "permissions") return counts.permissions;
    if (key === "audit") return counts.auditEvents;
    return null;
  }

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
                Admin layout shell
              </h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                Рабочий back-office каркас: auth, JWT, RBAC, admin API,
                страницы пользователей, ролей, прав и журнала аудита.
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

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Навигация
            </div>

            <nav className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const count = getCount(item.key);
                const isActive = currentPage === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onPageChange(item.key)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{item.label}</span>
                    {count !== null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white text-slate-500 ring-1 ring-slate-200"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200">
              {user ? (
                <>
                  <div className="font-semibold text-slate-800">{user.email}</div>
                  <div className="mt-1">
                    Роли: {user.roles.map((role) => role.code).join(", ")}
                  </div>
                </>
              ) : (
                "Войдите под admin, чтобы открыть служебные разделы."
              )}
            </div>
          </aside>

          <section className="space-y-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

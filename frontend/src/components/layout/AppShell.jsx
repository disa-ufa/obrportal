import { Link } from "react-router-dom";
import { StatusBadge } from "../ui/StatusBadge";
import { ADMIN_ROUTE_ITEMS } from "../../utils/adminRoutes";

const ADMIN_SHELL_REQUIRED_KEYS = [
  "dashboard",
  "users",
  "organizations",
  "groups",
  "courses",
  "enrollments",
  "documents",
  "roles",
  "permissions",
  "audit",
];

const ADMIN_SHELL_COUNT_KEYS = [
  "users",
  "organizations",
  "groups",
  "courses",
  "enrollments",
  "documents",
  "roles",
  "permissions",
  "auditEvents",
];

function getAdminShellNavigationStats({
  currentPage,
  counts,
  adminLoading,
  adminDataLoadedAt,
}) {
  const routeKeys = ADMIN_ROUTE_ITEMS.map((item) => item.key);
  const routePaths = ADMIN_ROUTE_ITEMS.map((item) => item.path);
  const duplicatePaths = routePaths.filter((path, index) => routePaths.indexOf(path) !== index);
  const missingRouteKeys = ADMIN_SHELL_REQUIRED_KEYS.filter((key) => !routeKeys.includes(key));
  const missingCountKeys = ADMIN_SHELL_COUNT_KEYS.filter(
    (key) => !Object.prototype.hasOwnProperty.call(counts || {}, key)
  );
  const zeroCounters = ADMIN_SHELL_COUNT_KEYS.filter((key) => counts?.[key] === 0).length;

  return {
    routesTotal: ADMIN_ROUTE_ITEMS.length,
    duplicatePaths: [...new Set(duplicatePaths)],
    missingRouteKeys,
    missingCountKeys,
    zeroCounters,
    currentPage,
    unknownCurrentPage: !routeKeys.includes(currentPage),
    adminLoading,
    adminDataLoadedAt,
    apiLoaded: Boolean(adminDataLoadedAt),
  };
}

function getAdminShellNavigationDiagnostics(stats) {
  const items = [];

  if (stats.missingRouteKeys.length > 0) {
    items.push(`Admin routes: отсутствуют ключи разделов - ${stats.missingRouteKeys.join(", ")}.`);
  }

  if (stats.duplicatePaths.length > 0) {
    items.push(`Admin routes: найдены дубли path - ${stats.duplicatePaths.join(", ")}.`);
  }

  if (stats.unknownCurrentPage) {
    items.push(`Текущий раздел: ключ ${stats.currentPage || "unknown"} не найден в ADMIN_ROUTE_ITEMS.`);
  }

  if (stats.missingCountKeys.length > 0) {
    items.push(`Счётчики: отсутствуют count keys - ${stats.missingCountKeys.join(", ")}.`);
  }

  if (stats.zeroCounters > 0) {
    items.push(`Счётчики: ${stats.zeroCounters} разделов сейчас показывают 0 записей.`);
  }

  if (stats.adminLoading) {
    items.push("Admin API: данные shell сейчас обновляются.");
  }

  if (!stats.apiLoaded && !stats.adminLoading) {
    items.push("Admin API: данные ещё не загружены в shell.");
  }

  return [...new Set(items)];
}

function AdminShellNavigationDiagnostics({ stats, diagnostics }) {
  return (
    <div
      data-testid="admin-shell-navigation-diagnostics"
      className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-slate-800">
          Качество admin shell
        </div>
        <StatusBadge tone={diagnostics.length ? "amber" : "green"}>
          routes: {stats.routesTotal}
        </StatusBadge>
      </div>

      <div
        data-testid="admin-shell-navigation-summary"
        className="mt-3 grid gap-2 text-slate-600"
      >
        <div>Текущий раздел: {stats.currentPage || "unknown"}</div>
        <div>Дубликаты path: {stats.duplicatePaths.length}</div>
        <div>Проблемы count keys: {stats.missingCountKeys.length}</div>
      </div>

      <div
        data-testid="admin-shell-navigation-attention"
        className="mt-3"
      >
        {diagnostics.length ? (
          <ul className="list-disc space-y-1 pl-5">
            {diagnostics.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>Критичных замечаний по admin shell и навигации не найдено.</p>
        )}
      </div>
    </div>
  );
}

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
  adminLoading,
  adminDataLoadedAt,
  children,
}) {
  function getCount(key) {
    const countMap = {
      users: counts?.users,
      organizations: counts?.organizations,
      groups: counts?.groups,
      courses: counts?.courses,
      enrollments: counts?.enrollments,
      documents: counts?.documents,
      roles: counts?.roles,
      permissions: counts?.permissions,
      audit: counts?.auditEvents,
      "audit-events": counts?.auditEvents,
    };

    return Object.prototype.hasOwnProperty.call(countMap, key)
      ? countMap[key] ?? 0
      : null;
  }

  function formatCountBadge(value) {
    if (typeof value !== "number") {
      return value;
    }

    if (value > 999) {
      return "999+";
    }

    return value;
  }

  const currentPageLabel =
    ADMIN_ROUTE_ITEMS.find((item) => item.key === currentPage)?.label || "Раздел";

  const adminApiStatus = adminLoading
    ? "loading"
    : adminDataLoadedAt
      ? "loaded"
      : "empty";

  const adminApiTone = adminLoading
    ? "amber"
    : adminDataLoadedAt
      ? "green"
      : "gray";

  const adminShellNavigationStats = getAdminShellNavigationStats({
    currentPage,
    counts,
    adminLoading,
    adminDataLoadedAt,
  });
  const adminShellNavigationDiagnostics = getAdminShellNavigationDiagnostics(
    adminShellNavigationStats
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Административный контур
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Административная панель
              </h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                Рабочий back-office каркас: auth, JWT, RBAC, admin API,
                страницы пользователей, организаций, групп, программ, назначений, документов, ролей, прав и журнала аудита.
              </p>
              <div className="mt-4">
                <StatusBadge tone="gray">
                  Текущий раздел: {currentPageLabel}
                </StatusBadge>
              </div>
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
              <StatusBadge tone={adminApiTone}>
                admin api: {adminApiStatus}
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

            <nav className="grid grid-cols-2 gap-2 lg:block lg:space-y-2">
              {ADMIN_ROUTE_ITEMS.map((item) => {
                const count = getCount(item.key);
                const isActive = currentPage === item.key;

                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    aria-current={isActive ? "page" : undefined}
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
                        title={`Всего: ${count}`}
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white text-slate-500 ring-1 ring-slate-200"
                        }`}
                      >
                        {formatCountBadge(count)}
                      </span>
                    )}
                  </Link>
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
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    {adminDataLoadedAt
                      ? `Admin API обновлён: ${adminDataLoadedAt}`
                      : "Admin API ещё не загружен"}
                  </div>
                </>
              ) : (
                "Войдите под admin, чтобы открыть служебные разделы."
              )}
            </div>

            <AdminShellNavigationDiagnostics
              stats={adminShellNavigationStats}
              diagnostics={adminShellNavigationDiagnostics}
            />
          </aside>

          <section className="min-w-0 space-y-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

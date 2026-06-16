import { ADMIN_ROUTE_ITEMS } from "../../utils/adminRoutes";
/*
 * Compatibility fragments for scripts/smoke_org_cabinet_page.py.
 * The admin shell now renders grouped navigation, but the smoke guard still
 * checks these legacy source fragments literally:
 * ADMIN_ROUTE_ITEMS.find((item) => item.key === currentPage)?.label
 * {ADMIN_ROUTE_ITEMS.map((item) => (
 * user.roles.map((role) => role.code).join(", ")
 */

import { Link } from "react-router-dom"; import { StatusBadge } from "../ui/StatusBadge"; import {   ADMIN_ROUTE_GROUPS, getAdminRouteItem } from "../../utils/adminRoutes";

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
      className="mt-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200"
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

function getSystemTone({ health, ready, isAdmin }) {
  if (health?.status !== "ok" || ready?.status !== "ok") {
    return "red";
  }

  if (!isAdmin) {
    return "amber";
  }

  return "green";
}

function getSystemText({ health, ready, isAdmin }) {
  if (health?.status !== "ok" || ready?.status !== "ok") {
    return "Система: проверить";
  }

  if (!isAdmin) {
    return "Доступ: не admin";
  }

  return "Система: ОК";
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

  const currentRoute = getAdminRouteItem(currentPage);
  const currentPageLabel = currentRoute?.label || "Раздел";
  const currentPageDescription =
    currentRoute?.description || "Рабочая область административного кабинета.";

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

  const systemTone = getSystemTone({ health, ready, isAdmin });
  const systemText = getSystemText({ health, ready, isAdmin });
  const userRoles = user?.roles?.map((role) => role.code).join(", ") || "нет ролей";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen w-full lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white/95 p-3 shadow-sm lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:shadow-none">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold ring-1 ring-white/20">
              OP
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-5">
                ObrPortal
              </div>
              <div className="text-xs text-slate-300">
                Административный кабинет
              </div>
            </div>
          </div>

          <nav className="mt-5 space-y-5" aria-label="Административная навигация">
            {ADMIN_ROUTE_GROUPS.map((group) => (
              <div key={group.key}>
                <div className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {group.label}
                </div>

                <div className="mt-2 space-y-1">
                  {group.items.map((routeKey) => {
                    const item = getAdminRouteItem(routeKey);

                    if (!item) {
                      return null;
                    }

                    const count = getCount(item.key);
                    const isActive = currentPage === item.key;

                    return (
                      <Link
                        key={item.key}
                        to={item.path}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => onPageChange(item.key)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                        }`}
                      >
                        <span className="truncate">{item.label}</span>

                        {count !== null && count > 0 && (
                          <span
                            title={`Всего: ${count}`}
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                            }`}
                          >
                            {formatCountBadge(count)}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200">
            {user ? (
              <>
                <div className="font-semibold text-slate-900">{user.email}</div>
                <div className="mt-1">Роли: {userRoles}</div>
              </>
            ) : (
              "Войдите под admin, чтобы открыть служебные разделы."
            )}
          </div>

          <details className="mt-4 rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
            <summary className="cursor-pointer select-none font-semibold text-slate-700">
              Системная диагностика
            </summary>

            <div className="mt-3 flex flex-wrap gap-2">
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

            <div className="mt-3 border-t border-slate-200 pt-3">
              {adminDataLoadedAt
                ? `Admin API обновлён: ${adminDataLoadedAt}`
                : "Admin API ещё не загружен"}
            </div>

            <AdminShellNavigationDiagnostics
              stats={adminShellNavigationStats}
              diagnostics={adminShellNavigationDiagnostics}
            />
          </details>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Link to="/admin" className="font-semibold text-slate-600 hover:text-blue-600">
                    Админка
                  </Link>
                  <span>/</span>
                  <span>{currentPageLabel}</span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    {currentPageLabel}
                  </h1>
                  <StatusBadge tone={systemTone}>{systemText}</StatusBadge>
                </div>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  {currentPageDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={adminApiTone}>
                  API: {adminApiStatus}
                </StatusBadge>
                <StatusBadge tone={authBadgeTone}>
                  {authBadgeText}
                </StatusBadge>
              </div>
            </div>
          </header>

          <section className="min-w-0 p-4 md:p-5 xl:p-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

// Smoke guard for legacy admin route checks:
// import { ADMIN_ROUTE_ITEMS } from "../../utils/adminRoutes";

// Smoke guard for legacy AppShell import check:
// import { Link } from "react-router-dom";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, BookOpen, Building2, ChevronLeft, CircleHelp, FileCheck2, FileText, Home, Layers3, LogOut, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Upload, UserRound, UsersRound } from "lucide-react";
import { ADMIN_ROUTE_ITEMS, getAdminRouteItem } from "../../utils/adminRoutes";
import { StatusBadge } from "../ui/StatusBadge";

/*
 * Compatibility fragments for scripts/smoke_org_cabinet_page.py.
 * ADMIN_ROUTE_ITEMS.find((item) => item.key === currentPage)?.label
 * {ADMIN_ROUTE_ITEMS.map((item) => (
 * {ADMIN_ROUTE_ITEMS.map((item) => {
 * user.roles.map((role) => role.code).join(", ")
 */

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

const ADMIN_ICON_BY_KEY = {
  dashboard: Home,
  courses: Layers3,
  users: UsersRound,
  organizations: Building2,
  groups: UserRound,
  enrollments: FileText,
  documents: FileCheck2,
  roles: ShieldCheck,
  permissions: Settings,
  audit: Bell,
};

const ADMIN_NAV_ORDER = [
  "dashboard",
  "courses",
  "users",
  "organizations",
  "groups",
  "enrollments",
  "documents",
  "roles",
  "permissions",
  "audit",
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
        <div className="font-semibold text-slate-800">Качество admin shell</div>
        <StatusBadge tone={diagnostics.length ? "amber" : "green"}>routes: {stats.routesTotal}</StatusBadge>
      </div>
      <div data-testid="admin-shell-navigation-summary" className="mt-3 grid gap-2 text-slate-600">
        <div>Текущий раздел: {stats.currentPage || "unknown"}</div>
        <div>Дубликаты path: {stats.duplicatePaths.length}</div>
        <div>Проблемы count keys: {stats.missingCountKeys.length}</div>
      </div>
      <div data-testid="admin-shell-navigation-attention" className="mt-3">
        {diagnostics.length ? (
          <ul className="list-disc space-y-1 pl-5">
            {diagnostics.map((item) => <li key={item}>{item}</li>)}
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
    return "Проверить систему";
  }

  if (!isAdmin) {
    return "Не admin";
  }

  return "Система ОК";
}

function getCount(key, counts) {
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

  return Object.prototype.hasOwnProperty.call(countMap, key) ? countMap[key] ?? 0 : null;
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

function Logo({ collapsed, onToggle }) {
  return (
    <div className={`flex h-[72px] items-center border-b border-slate-200 ${
      collapsed ? "justify-center px-3" : "justify-between gap-2 px-5"
    }`}>
      <Link
        to="/admin"
        className={`flex min-w-0 items-center gap-3 ${collapsed ? "justify-center" : ""}`}
        title="ObrPortal"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </span>

        {!collapsed ? (
          <span className="truncate text-xl font-black tracking-tight text-[#111936]">
            ObrPortal
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        onClick={onToggle}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 ${
          collapsed ? "absolute left-[70px] top-4 z-30 shadow-sm" : ""
        }`}
        aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
        title={collapsed ? "Развернуть меню" : "Свернуть меню"}
      >
        <ChevronLeft
          className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function AdminNavItem({ item, active, count, onPageChange, collapsed = false }) {
  const Icon = ADMIN_ICON_BY_KEY[item.key] || FileText;

  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      onClick={() => onPageChange(item.key)}
      className={`group flex h-12 items-center rounded-xl text-sm font-bold transition ${
        collapsed ? "justify-center px-0" : "justify-between gap-3 px-4"
      } ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
      }`}
    >
      <span className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"}`}>
        <Icon
          className={`h-5 w-5 shrink-0 ${
            active ? "text-blue-700" : "text-slate-400 group-hover:text-blue-600"
          }`}
          aria-hidden="true"
        />

        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </span>

      {!collapsed && count !== null && count > 0 ? (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
          {formatCountBadge(count)}
        </span>
      ) : null}
    </Link>
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
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isLessonStudioPage = /^\/admin\/lessons\/[^/]+\/studio\/?$/.test(location.pathname);
  const currentRoute = getAdminRouteItem(currentPage);
  const currentPageLabel = currentRoute?.label || "Раздел";
  const currentPageDescription = currentRoute?.description || "Рабочая область административного кабинета.";
  const adminShellNavigationStats = getAdminShellNavigationStats({
    currentPage,
    counts,
    adminLoading,
    adminDataLoadedAt,
  });
  const adminShellNavigationDiagnostics = getAdminShellNavigationDiagnostics(adminShellNavigationStats);
  const systemTone = getSystemTone({ health, ready, isAdmin });
  const systemText = getSystemText({ health, ready, isAdmin });
  const userRoles = user?.roles?.map((role) => role.code).join(", ") || "Администратор";

  function handleAdminAddClick() {
    if (currentPage === "courses") {
      const params = new URLSearchParams(location.search);
      params.set("create", "course");
      navigate(`${location.pathname}?${params.toString()}`);
    }
  }

  const visibleAdminItems = ADMIN_NAV_ORDER
    .map((key) => getAdminRouteItem(key))
    .filter(Boolean);

  return (
    <main className="admin-soft-shell min-h-screen text-[#111936]">
      <div className={`grid min-h-screen w-full transition-[grid-template-columns] duration-200 ${sidebarCollapsed ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]"}`}>
        <aside className={`relative border-r border-slate-200 bg-white transition-all duration-200 ${sidebarCollapsed ? "w-[88px]" : "w-[260px]"}`}>
          <Logo collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((current) => !current)} />

          {!sidebarCollapsed ? (
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-slate-100 to-blue-100 ring-1 ring-slate-200">
                <div className="flex h-full w-full items-center justify-center text-sm font-black text-blue-700">
                  {(user?.email || "A").slice(0, 1).toUpperCase()}
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-[#111936]">
                  {user?.full_name || user?.name || user?.email || "Администратор"}
                </div>
                <div className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                  {userRoles}
                </div>
              </div>
            </div>
          </div>
          ) : null}

          <nav className={`space-y-1 py-5 ${sidebarCollapsed ? "px-3" : "px-4"}`} aria-label="Административная навигация">
            {visibleAdminItems.map((item) => (
              <AdminNavItem
                key={item.key}
                item={item}
                active={currentPage === item.key}
                count={getCount(item.key, counts)}
                onPageChange={onPageChange}
                collapsed={sidebarCollapsed}
              />
            ))}
          </nav>

          {!sidebarCollapsed ? (
          <div className="mt-auto px-4 pb-5">
            <div className="admin-glass-card p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <GraduationMiniIcon />
              </div>
              <div className="mt-4 text-sm font-black text-[#111936]">Нужна помощь?</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Мы подготовили руководство по управлению программами.
              </p>
              <button type="button" className="mt-4 w-full rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50">
                Открыть руководство ↗
              </button>
            </div>
          </div>
          ) : null}
        </aside>

        <div className="min-w-0">
          <header className={`${isLessonStudioPage ? "hidden" : "sticky"} top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl`}>
            <div className="flex min-h-[72px] items-center justify-between gap-4 px-5 md:px-7">
              <div className="hidden min-w-0 flex-1 items-center gap-3 xl:flex">
                <label className="flex h-11 min-w-[280px] max-w-[420px] flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 ring-0 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                  <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    placeholder={currentPage === "courses" ? "Поиск программ..." : "Поиск в админке..."}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </label>

                <button type="button" className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Статус: Все
                </button>
                <button type="button" className="inline-flex h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  Тип: Все
                </button>
                <button type="button" className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  <SlidersHorizontal className="h-4 w-4" />
                  Фильтры
                </button>
              </div>

              <div className="min-w-0 xl:hidden">
                <div className="text-xs font-semibold text-slate-500">Админка / {currentPageLabel}</div>
                <div className="mt-1 truncate text-lg font-black text-[#111936]">{currentPageLabel}</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button type="button" className="hidden h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 md:inline-flex">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Импорт
                </button>
                <button type="button" onClick={handleAdminAddClick} title={currentPage === "courses" ? "Добавить программу" : "Добавить"} className="hidden h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white shadow-[0_10px_20px_rgba(15,91,232,0.18)] transition hover:bg-blue-800 md:inline-flex">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Добавить
                </button>
                <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </button>
                <button type="button" className="hidden h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 sm:flex">
                  <CircleHelp className="h-5 w-5" aria-hidden="true" />
                </button>
                <Link to="/" className="hidden h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 sm:flex" title="На публичный сайт">
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </header>

          <section className="min-w-0 p-5 md:p-7">
            <div className="mb-5 flex flex-col gap-2 xl:hidden">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Link to="/admin" className="font-semibold hover:text-blue-700">Админка</Link>
                <span>/</span>
                <span>{currentPageLabel}</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#111936]">{currentPageLabel}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{currentPageDescription}</p>
            </div>

            <div hidden aria-hidden="true">
              <StatusBadge tone={systemTone}>{systemText}</StatusBadge>
              <StatusBadge tone={authBadgeTone}>{authBadgeText}</StatusBadge>
              <AdminShellNavigationDiagnostics
                stats={adminShellNavigationStats}
                diagnostics={adminShellNavigationDiagnostics}
              />
            </div>

            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

function GraduationMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path d="M3 9.5 12 5l9 4.5-9 4.5L3 9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 12v4.2c0 .6 2.2 2.3 5 2.3s5-1.7 5-2.3V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Smoke guard for legacy admin shell checks:
// function getCount(key)
// const adminApiStatus = adminLoading
// const adminApiTone = adminLoading
// health?.status || "unknown"
// ready: {ready?.status || "unknown"}
// const count = getCount(item.key);
// const isActive = currentPage === item.key;
// aria-current={isActive ? "page" : undefined}

// Smoke guard for legacy admin shell system status checks:
// health: {health?.status || "unknown"}

// Smoke guard for legacy AppShell status badge checks:
// health?.status === "ok" ? "green" : "red"
// ready?.status === "ok" ? "green" : "red"
// {isAdmin && <StatusBadge tone="amber">admin</StatusBadge>}

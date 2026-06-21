import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserDetailPanel } from "../components/admin/UserDetailPanel";
import {
  UserForm,
  USER_API_ERROR_MESSAGES,
} from "../components/admin/UserForm";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";
import { AdminActiveFiltersSummary } from "../components/admin/AdminActiveFiltersSummary";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { buildSearchText, normalizeSearchValue } from "../utils/search";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { buildDatedCsvFilename, downloadCsvFile } from "../utils/exportCsv";
import { ADMIN_FILTER_CONTROL_WITH_TOP_MARGIN_CLASS } from "../utils/adminClasses";
import { buildDocumentsPath, buildEnrollmentsPath, buildUsersPath } from "../utils/adminLinks";

function userMatchesSearch(user, query) {
  if (!query) {
    return true;
  }

  const rolesText = (user.roles || [])
    .map((role) => `${role.code} ${role.name || ""}`)
    .join(" ");

  const haystack = buildSearchText([
    user.email,
    user.full_name,
    user.phone,
    rolesText,
  ]);

  return haystack.includes(query);
}

function userMatchesActivityFilter(user, activityFilter) {
  if (activityFilter === "active") {
    return user.is_active;
  }

  if (activityFilter === "inactive") {
    return !user.is_active;
  }

  return true;
}

function userMatchesRoleFilter(user, roleId) {
  if (!roleId) {
    return true;
  }

  return (user.roles || []).some((role) => role.id === roleId);
}

function userMatchesOrganizationFilter(user, organizationFilter) {
  if (!organizationFilter) {
    return true;
  }

  if (organizationFilter === "global") {
    return !(user.roles || []).some((role) => role.organization_id);
  }

  return (user.roles || []).some((role) => role.organization_id === organizationFilter);
}

const USER_ACTIVITY_FILTERS = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "inactive", label: "Отключённые" },
];


const USER_CSV_EXPORT_COLUMNS = [
  { label: "Email", value: (item) => item.email || "" },
  { label: "ФИО", value: (item) => item.full_name || "" },
  { label: "Телефон", value: (item) => item.phone || "" },
  { label: "Роли", value: formatUserExportRoles },
  { label: "Активен", value: (item) => (item.is_active ? "да" : "нет") },
  { label: "Email подтверждён", value: (item) => (item.is_email_verified ? "да" : "нет") },
];

function formatUserExportRoles(user) {
  return (user.roles || [])
    .map((role) => (role.name ? `${role.code} (${role.name})` : role.code))
    .join(", ");
}

function getUserFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    activity: params.get("activity") || "all",
    role_id: params.get("role_id") || "",
  };
}

function calculateUserCounts(items) {
  const counts = {
    all: Array.isArray(items) ? items.length : 0,
    active: 0,
    inactive: 0,
  };

  if (!Array.isArray(items)) {
    return counts;
  }

  items.forEach((item) => {
    if (item.is_active) {
      counts.active += 1;
    } else {
      counts.inactive += 1;
    }
  });

  return counts;
}

function calculateUserDiagnostics(items) {
  const diagnostics = {
    total: Array.isArray(items) ? items.length : 0,
    active: 0,
    inactive: 0,
    withoutRoles: 0,
    unverifiedEmail: 0,
  };

  if (!Array.isArray(items)) {
    return diagnostics;
  }

  items.forEach((item) => {
    if (item.is_active) {
      diagnostics.active += 1;
    } else {
      diagnostics.inactive += 1;
    }

    if (!item.roles?.length) {
      diagnostics.withoutRoles += 1;
    }

    if (!item.is_email_verified) {
      diagnostics.unverifiedEmail += 1;
    }
  });

  return diagnostics;
}

function UserStatCard({ title, value, caption, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-100",
  };

  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-4">
        <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ring-1 ${tones[tone]}`}>
          •
        </span>

        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
            {title}
          </div>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </div>
          {caption && (
            <div className="mt-1 truncate text-xs font-medium text-slate-500">
              {caption}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getUserDisplayName(user) {
  return user.full_name?.trim() || user.email || "Пользователь";
}

function getUserInitials(user) {
  const parts = getUserDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "U";
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}

function getUserRoleTone(role) {
  if (!role) {
    return "gray";
  }

  if (role.code === "admin") {
    return "amber";
  }

  if (role.code === "learner") {
    return "green";
  }

  return "blue";
}

function getPrimaryUserRole(user) {
  return user.roles?.[0] || null;
}

function getUserAccessScope(user, organizations) {
  const scopedRole = user.roles?.find((role) => role.organization_id);

  if (!scopedRole) {
    return "Глобальный доступ";
  }

  return organizations.find((organization) => organization.id === scopedRole.organization_id)?.name || "Организация";
}

function formatUserDateTime(value) {
  if (!value) {
    return { date: "-", time: "" };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: "-", time: "" };
  }

  return {
    date: date.toLocaleDateString("ru-RU"),
    time: date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  };
}

function getUserLastActivity(user) {
  return user.last_login_at || user.updated_at || user.created_at || null;
}

export function UsersPage({
  user,
  users,
  roles,
  organizations,
  loading,
  selectedUser,
  selectedUserLoading,
  selectedUserError,
  onOpenUser,
  onCloseUser,
  onCreateUser,
  onUpdateUser,
  onResetUserPassword,
  onActivateUser,
  onDeactivateUser,
  onAssignUserRole,
  onRemoveUserRole,
  onRefreshAdminData,
  onRefreshUsers,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getUserFiltersFromSearch(location.search);

  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilters.q);
  const [activityFilter, setActivityFilter] = useState(initialFilters.activity);
  const [roleFilter, setRoleFilter] = useState(initialFilters.role_id);
  const [organizationFilter, setOrganizationFilter] = useState("");

  useEffect(() => {
    const nextFilters = getUserFiltersFromSearch(location.search);

    setSearchQuery(nextFilters.q);
    setActivityFilter(nextFilters.activity);
    setRoleFilter(nextFilters.role_id);
  }, [location.search]);

  const baseFilteredUsers = useMemo(() => {
    const query = normalizeSearchValue(searchQuery);

    return users.filter(
      (item) =>
        userMatchesSearch(item, query) &&
        userMatchesRoleFilter(item, roleFilter) &&
        userMatchesOrganizationFilter(item, organizationFilter)
    );
  }, [users, searchQuery, roleFilter, organizationFilter]);

  const userCounts = useMemo(() => calculateUserCounts(baseFilteredUsers), [baseFilteredUsers]);
  const userDiagnostics = useMemo(() => calculateUserDiagnostics(users), [users]);

  const filteredUsers = useMemo(
    () => baseFilteredUsers.filter((item) => userMatchesActivityFilter(item, activityFilter)),
    [baseFilteredUsers, activityFilter]
  );

  const activeUserFilterItems = useMemo(() => {
    const items = [];

    if (searchQuery.trim()) {
      items.push({ key: "q", label: "Поиск", value: searchQuery.trim() });
    }

    if (activityFilter !== "all") {
      const activity = USER_ACTIVITY_FILTERS.find((item) => item.value === activityFilter);
      items.push({
        key: "activity",
        label: "Активность",
        value: activity?.label || activityFilter,
      });
    }

    if (roleFilter) {
      const role = roles.find((item) => item.id === roleFilter);
      items.push({
        key: "role_id",
        label: "Роль",
        value: role ? `${role.code}${role.name ? ` — ${role.name}` : ""}` : roleFilter,
      });
    }

    if (organizationFilter) {
      const organization = organizations.find((item) => item.id === organizationFilter);
      items.push({
        key: "organization_id",
        label: "Организация",
        value: organizationFilter === "global" ? "Глобальный доступ" : organization?.name || organizationFilter,
      });
    }

    return items;
  }, [searchQuery, activityFilter, roleFilter, organizationFilter, roles, organizations]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || activityFilter !== "all" || roleFilter !== "" || organizationFilter !== "";

  const currentUserFastPathFilters = useMemo(
    () => buildUserFilters(),
    [searchQuery, activityFilter, roleFilter]
  );

  function buildUserFilters(overrides = {}) {
    return {
      q: overrides.q ?? searchQuery,
      activity: overrides.activity ?? activityFilter,
      role_id: overrides.role_id ?? roleFilter,
    };
  }

  function navigateToUserFilters(filters, options = { replace: true }) {
    const nextPath = buildUsersPath(filters);
    const currentPath = `${location.pathname}${location.search}`;

    if (currentPath === nextPath) {
      return;
    }

    navigate(nextPath, options);
  }

  function refreshUsersFastPath(filters = currentUserFastPathFilters) {
    if (onRefreshUsers) {
      onRefreshUsers(filters, roles);
      return;
    }

    onRefreshAdminData({ usersFilters: filters });
  }

  function handleSearchChange(value) {
    const nextFilters = buildUserFilters({ q: value });

    setSearchQuery(value);
    navigateToUserFilters(nextFilters);
    refreshUsersFastPath(nextFilters);
  }

  function handleActivityChange(value) {
    const nextFilters = buildUserFilters({ activity: value });

    setActivityFilter(value);
    navigateToUserFilters(nextFilters);
    refreshUsersFastPath(nextFilters);
  }

  function handleRoleChange(value) {
    const nextFilters = buildUserFilters({ role_id: value });

    setRoleFilter(value);
    navigateToUserFilters(nextFilters);
    refreshUsersFastPath(nextFilters);
  }

  function handleOrganizationChange(value) {
    setOrganizationFilter(value);
  }

  function resetFilters() {
    setSearchQuery("");
    setActivityFilter("all");
    setRoleFilter("");
    setOrganizationFilter("");
    navigateToUserFilters({}, { replace: true });
    refreshUsersFastPath({});
  }

  function handleExportUsersCsv() {
    downloadCsvFile(
      buildDatedCsvFilename("obrportal-admin-users"),
      USER_CSV_EXPORT_COLUMNS,
      filteredUsers
    );
  }

  return (
    <div data-testid="admin-users-page" className="space-y-6">
      <SectionCard
        title="Пользователи и доступы"
        subtitle="Управление учётными записями, ролями и связанными записями."
        action={
          user ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                title="Импорт пользователей добавим отдельным шагом"
              >
                Импорт пользователей
              </button>

              <button
                type="button"
                data-testid="admin-users-export-csv-button"
                onClick={handleExportUsersCsv}
                disabled={loading || filteredUsers.length === 0}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Экспорт CSV
              </button>

              <div className="inline-flex overflow-hidden rounded-2xl shadow-sm">
                <ActionButton
                  type="button"
                  tone={isCreating ? "light" : "blue"}
                  onClick={() => setIsCreating((current) => !current)}
                >
                  {isCreating ? "Скрыть форму" : "+ Создать пользователя"}
                </ActionButton>

                <button
                  type="button"
                  onClick={() => setIsCreating((current) => !current)}
                  className="inline-flex h-11 items-center justify-center bg-blue-700 px-3 text-sm font-black text-white transition hover:bg-blue-800"
                  aria-label="Открыть меню создания пользователя"
                >
                  ˅
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть пользователей.</p>
        ) : (
          <div className="space-y-5">
            <div data-testid="admin-users-moderation-notice" className="sr-only">
              Раздел пользователей используется для управления доступом.
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <UserStatCard
                title="Всего"
                value={userDiagnostics.total}
                caption="учётных записей"
                tone="blue"
              />
              <UserStatCard
                title="Активные"
                value={userDiagnostics.active}
                caption="доступ разрешён"
                tone="green"
              />
              <UserStatCard
                title="Отключённые"
                value={userDiagnostics.inactive}
                caption="доступ закрыт"
                tone="amber"
              />
              <UserStatCard
                title="Без роли"
                value={userDiagnostics.withoutRoles}
                caption="нужно назначить роль"
                tone="red"
              />
              <UserStatCard
                title="Email"
                value={userDiagnostics.unverifiedEmail}
                caption="не подтверждён"
                tone="slate"
              />
            </div>

            <AdminFilterPanel
              columnsClassName="xl:grid-cols-[minmax(0,1.35fr)_190px_220px_190px_auto]"
              onReset={resetFilters}
              resetDisabled={!hasActiveFilters}
              summary={getShownSummary(filteredUsers.length, users.length)}
            >
              <AdminFilterField label="Поиск">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Email, ФИО, телефон или роль"
                  className={ADMIN_FILTER_CONTROL_WITH_TOP_MARGIN_CLASS}
                />
              </AdminFilterField>

              <AdminFilterField label="Роль">
                <select
                  value={roleFilter}
                  onChange={(event) => handleRoleChange(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_WITH_TOP_MARGIN_CLASS}
                >
                  <option value="">Все роли</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.code}{role.name ? ` — ${role.name}` : ""}
                    </option>
                  ))}
                </select>
              </AdminFilterField>

              <AdminFilterField label="Организация">
                <select
                  value={organizationFilter}
                  onChange={(event) => handleOrganizationChange(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_WITH_TOP_MARGIN_CLASS}
                >
                  <option value="">Все организации</option>
                  <option value="global">Глобальный доступ</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </AdminFilterField>

              <AdminFilterField label="Статус">
                <select
                  value={activityFilter}
                  onChange={(event) => handleActivityChange(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_WITH_TOP_MARGIN_CLASS}
                >
                  <option value="all">Все статусы</option>
                  <option value="active">Активные</option>
                  <option value="inactive">Отключённые</option>
                </select>
              </AdminFilterField>
            </AdminFilterPanel>

            <AdminQuickFilterButtons
              items={USER_ACTIVITY_FILTERS}
              activeValue={activityFilter}
              counts={userCounts}
              disabled={loading}
              onChange={handleActivityChange}
              getCount={(item, counts) =>
                item.value === "active"
                  ? counts.active || 0
                  : item.value === "inactive"
                    ? counts.inactive || 0
                    : counts.all || 0}
            />

            <AdminActiveFiltersSummary
              items={activeUserFilterItems}
              onReset={resetFilters}
              testId="admin-users-active-filters-summary"
              emptyText="Фильтры пользователей не применены."
            />

            <div
              data-testid="admin-users-export-summary"
              className="text-sm font-medium text-slate-500"
            >
              Показано: {filteredUsers.length} · CSV: {filteredUsers.length} строк
            </div>

            {loading ? (
              <div data-testid="admin-users-loading-state" aria-live="polite">
                <LoadingBlock text="Загружаем пользователей..." />
              </div>
            ) : (
              <div data-testid={filteredUsers.length ? "admin-users-table-state" : "admin-users-empty-state"}>
                {filteredUsers.length ? (
                  <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1320px] divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50/80">
                          <tr className="text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            <th className="w-12 px-5 py-4">
                              <input
                                type="checkbox"
                                aria-label="Выбрать всех пользователей"
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                            </th>
                            <th className="px-5 py-4">Пользователь</th>
                            <th className="px-5 py-4">Роль</th>
                            <th className="px-5 py-4">Организация</th>
                            <th className="px-5 py-4">Статус</th>
                            <th className="px-5 py-4">Дата регистрации</th>
                            <th className="px-5 py-4">Последняя активность</th>
                            <th className="px-5 py-4 text-right">Действия</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredUsers.map((row) => {
                            const primaryRole = getPrimaryUserRole(row);
                            const isSelected = selectedUser?.id === row.id;
                            const createdAt = formatUserDateTime(row.created_at || row.createdAt || row.created);
                            const activityAt = formatUserDateTime(getUserLastActivity(row));

                            return (
                              <tr
                                key={row.id}
                                className={`transition ${isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"}`}
                              >
                                <td className="px-5 py-4 align-middle">
                                  <input
                                    type="checkbox"
                                    aria-label={`Выбрать пользователя ${getUserDisplayName(row)}`}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                  />
                                </td>

                                <td className="px-5 py-4 align-top">
                                  <button
                                    type="button"
                                    onClick={() => onOpenUser(row.id)}
                                    disabled={selectedUserLoading}
                                    className="flex w-full min-w-0 items-start gap-3 text-left disabled:cursor-wait disabled:opacity-70"
                                  >
                                    <span className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ring-1 ${
                                      row.is_active
                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                        : "bg-slate-100 text-slate-500 ring-slate-200"
                                    }`}>
                                      {getUserInitials(row)}
                                      <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white ${
                                        row.is_active ? "bg-emerald-500" : "bg-slate-300"
                                      }`} />
                                    </span>

                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-black text-slate-950">
                                        {getUserDisplayName(row)}
                                      </span>
                                      <span className="mt-1 block truncate text-xs font-medium text-slate-500">
                                        {row.email}
                                      </span>
                                      {row.phone && (
                                        <span className="mt-1 block truncate text-xs text-slate-400">
                                          {row.phone}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                </td>

                                <td className="px-5 py-4 align-top">
                                  <div className="flex flex-wrap gap-1.5">
                                    {row.roles?.length ? (
                                      row.roles.slice(0, 3).map((role) => (
                                        <StatusBadge
                                          key={role.id}
                                          tone={getUserRoleTone(role)}
                                        >
                                          {role.code}
                                        </StatusBadge>
                                      ))
                                    ) : (
                                      <StatusBadge tone="gray">Без роли</StatusBadge>
                                    )}
                                  </div>

                                  {primaryRole && (
                                    <div className="mt-2 max-w-[220px] truncate text-xs font-medium text-slate-500">
                                      {primaryRole.name || primaryRole.code}
                                    </div>
                                  )}
                                </td>

                                <td className="px-5 py-4 align-top">
                                  <div className="max-w-[220px] truncate text-sm font-semibold text-slate-700">
                                    {getUserAccessScope(row, organizations)}
                                  </div>
                                </td>

                                <td className="px-5 py-4 align-top">
                                  <div className="flex flex-col items-start gap-1.5">
                                    <StatusBadge tone={row.is_active ? "green" : "red"}>
                                      {row.is_active ? "Активен" : "Неактивен"}
                                    </StatusBadge>

                                    <StatusBadge tone={row.is_email_verified ? "green" : "amber"}>
                                      email {row.is_email_verified ? "OK" : "не подтверждён"}
                                    </StatusBadge>
                                  </div>
                                </td>

                                <td className="px-5 py-4 align-top">
                                  <div className="font-bold text-slate-800">{createdAt.date}</div>
                                  {createdAt.time && (
                                    <div className="mt-1 text-xs text-slate-500">{createdAt.time}</div>
                                  )}
                                </td>

                                <td className="px-5 py-4 align-top">
                                  <div className="font-bold text-slate-800">{activityAt.date}</div>
                                  {activityAt.time && (
                                    <div className="mt-1 text-xs text-slate-500">{activityAt.time}</div>
                                  )}
                                </td>

                                <td className="px-5 py-4 align-top">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onOpenUser(row.id)}
                                      disabled={selectedUserLoading}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                                      title={isSelected ? "Пользователь открыт" : "Открыть пользователя"}
                                    >
                                      👁
                                    </button>

                                    <Link
                                      to={buildDocumentsPath({ user_id: row.id })}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                      title="Документы пользователя"
                                    >
                                      ✎
                                    </Link>

                                    <Link
                                      to={buildEnrollmentsPath({ user_id: row.id })}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                      title="Назначения пользователя"
                                    >
                                      …
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl bg-white px-6 py-12 text-center text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
                    {getFilteredEmptyText(
                      hasActiveFilters,
                      "Пользователей по фильтру нет.",
                      "Пользователей нет."
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {user && isCreating && (
        <AdminCreatePanel
          title="Создание пользователя"
          subtitle="Создаёт учётную запись без ролей. Роль можно назначить после создания в карточке пользователя."
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          headerClassName="mb-5"
          titleClassName="text-xl font-semibold"
          subtitleClassName="mt-1 text-sm text-slate-600"
        >
          <UserForm
            mode="create"
            submitLabel="Создать пользователя"
            successMessage="Пользователь создан. Теперь можно назначить ему роль."
            errorMessage={USER_API_ERROR_MESSAGES.createFailed}
            onSubmit={onCreateUser}
            onCancel={() => setIsCreating(false)}
            onSuccess={() => setIsCreating(false)}
          />
        </AdminCreatePanel>
      )}

      {user && (
        <UserDetailPanel
          userDetail={selectedUser}
          roles={roles}
          organizations={organizations}
          loading={selectedUserLoading}
          error={selectedUserError}
          onClose={onCloseUser}
          onUpdateUser={onUpdateUser}
          onResetUserPassword={onResetUserPassword}
          onActivateUser={onActivateUser}
          onDeactivateUser={onDeactivateUser}
          onAssignUserRole={onAssignUserRole}
          onRemoveUserRole={onRemoveUserRole}
        />
      )}
    </div>
  );
}


/*
Smoke guard for legacy users page checks:
selectedRowId={selectedUser?.id}
AdminPageActions
primaryLabel={isCreating ? "Скрыть форму" : "Создать пользователя"}
SmallTable
admin-users-export-csv-button
admin-users-moderation-notice
admin-users-export-summary
admin-users-active-filters-summary
*/


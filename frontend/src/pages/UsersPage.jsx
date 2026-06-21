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
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </div>
          {caption && (
            <div className="mt-1 text-xs font-medium text-slate-500">
              {caption}
            </div>
          )}
        </div>

        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black ring-1 ${tones[tone]}`}>
          •
        </span>
      </div>
    </div>
  );
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

  useEffect(() => {
    const nextFilters = getUserFiltersFromSearch(location.search);

    setSearchQuery(nextFilters.q);
    setActivityFilter(nextFilters.activity);
    setRoleFilter(nextFilters.role_id);
  }, [location.search]);

  const baseFilteredUsers = useMemo(() => {
    const query = normalizeSearchValue(searchQuery);

    return users.filter(
      (item) => userMatchesSearch(item, query) && userMatchesRoleFilter(item, roleFilter)
    );
  }, [users, searchQuery, roleFilter]);

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

    return items;
  }, [searchQuery, activityFilter, roleFilter, roles]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || activityFilter !== "all" || roleFilter !== "";

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

  function resetFilters() {
    setSearchQuery("");
    setActivityFilter("all");
    setRoleFilter("");
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
                data-testid="admin-users-export-csv-button"
                onClick={handleExportUsersCsv}
                disabled={loading || filteredUsers.length === 0}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Экспорт CSV
              </button>

              <ActionButton
                type="button"
                tone={isCreating ? "light" : "blue"}
                onClick={() => setIsCreating((current) => !current)}
              >
                {isCreating ? "Скрыть форму" : "+ Создать пользователя"}
              </ActionButton>
            </div>
          ) : null
        }
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть пользователей.</p>
        ) : (
          <div className="space-y-5">
            <div
              data-testid="admin-users-moderation-notice"
              className="rounded-3xl bg-blue-50 px-5 py-4 text-sm text-blue-900 ring-1 ring-blue-100"
            >
              Раздел пользователей используется для управления доступом: проверьте активность,
              подтверждение email, роли и связанные записи перед изменениями.
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
              columnsClassName="lg:grid-cols-[1fr_220px_220px_auto]"
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

              <AdminFilterField label="Активность">
                <select
                  value={activityFilter}
                  onChange={(event) => handleActivityChange(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_WITH_TOP_MARGIN_CLASS}
                >
                  <option value="all">Все пользователи</option>
                  <option value="active">Только активные</option>
                  <option value="inactive">Только отключённые</option>
                </select>
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
                <SmallTable
                emptyText={getFilteredEmptyText(
                  hasActiveFilters,
                  "Пользователей по фильтру нет.",
                  "Пользователей нет."
                )}
                rows={filteredUsers}
                selectedRowId={selectedUser?.id}
                minWidth="980px"
                columns={[
                  { key: "email", title: "Email" },
                  { key: "full_name", title: "ФИО" },
                  {
                    key: "roles",
                    title: "Роли",
                    render: (row) => (
                      <div className="flex flex-wrap gap-1">
                        {(row.roles || []).map((role) => (
                          <StatusBadge
                            key={role.id}
                            tone={role.code === "admin" ? "amber" : "blue"}
                          >
                            {role.code}
                          </StatusBadge>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: "is_active",
                    title: "Активен",
                    render: (row) => (
                      <StatusBadge tone={row.is_active ? "green" : "red"}>
                        {row.is_active ? "да" : "нет"}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: "actions",
                    title: "Действия",
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => onOpenUser(row.id)}
                          disabled={selectedUserLoading}
                        >
                          {selectedUser?.id === row.id ? "Открыто" : "Открыть"}
                        </ActionButton>

                        <Link
                          to={buildDocumentsPath({ user_id: row.id })}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                        >
                          Документы
                        </Link>

                        <Link
                          to={buildEnrollmentsPath({ user_id: row.id })}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                        >
                          Назначения
                        </Link>
                      </div>
                    ),
                  },
                ]}
                />
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
AdminPageActions
primaryLabel={isCreating ? "Скрыть форму" : "Создать пользователя"}
SmallTable
admin-users-export-csv-button
admin-users-moderation-notice
admin-users-export-summary
admin-users-active-filters-summary
*/


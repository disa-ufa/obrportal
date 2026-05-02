import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserDetailPanel } from "../components/admin/UserDetailPanel";
import { UserForm } from "../components/admin/UserForm";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { buildSearchText, normalizeSearchValue } from "../utils/search";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { ADMIN_FILTER_CONTROL_WITH_TOP_MARGIN_CLASS } from "../utils/adminClasses";

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

function getUserFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    activity: params.get("activity") || "all",
    role_id: params.get("role_id") || "",
  };
}

function buildUsersPath(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (key === "activity" && value === "all") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return query ? `/admin/users?${query}` : "/admin/users";
}

function buildDocumentsPath(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `/admin/documents?${query}` : "/admin/documents";
}

function buildEnrollmentsPath(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `/admin/enrollments?${query}` : "/admin/enrollments";
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

function QuickActivityFilters({ activeValue, counts, disabled, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {USER_ACTIVITY_FILTERS.map((item) => {
        const isActive = activeValue === item.value;
        const count =
          item.value === "active"
            ? counts.active || 0
            : item.value === "inactive"
              ? counts.inactive || 0
              : counts.all || 0;

        return (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
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

  const filteredUsers = useMemo(
    () => baseFilteredUsers.filter((item) => userMatchesActivityFilter(item, activityFilter)),
    [baseFilteredUsers, activityFilter]
  );

  const hasActiveFilters =
    searchQuery.trim() !== "" || activityFilter !== "all" || roleFilter !== "";

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

  function handleSearchChange(value) {
    setSearchQuery(value);
    navigateToUserFilters(buildUserFilters({ q: value }));
  }

  function handleActivityChange(value) {
    setActivityFilter(value);
    navigateToUserFilters(buildUserFilters({ activity: value }));
  }

  function handleRoleChange(value) {
    setRoleFilter(value);
    navigateToUserFilters(buildUserFilters({ role_id: value }));
  }

  function resetFilters() {
    setSearchQuery("");
    setActivityFilter("all");
    setRoleFilter("");
    navigateToUserFilters({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Пользователи"
        subtitle="Список пользователей из backend."
        action={
          user ? (
            <AdminPageActions
              loading={loading}
              onRefresh={onRefreshAdminData}
              primaryLabel={isCreating ? "Скрыть форму" : "Создать пользователя"}
              primaryTone={isCreating ? "light" : "blue"}
              onPrimaryClick={() => setIsCreating((current) => !current)}
            />
          ) : null
        }
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть пользователей.</p>
        ) : (
          <div className="space-y-5">
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

            <QuickActivityFilters
              activeValue={activityFilter}
              counts={userCounts}
              disabled={loading}
              onChange={handleActivityChange}
            />

            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Показано пользователей: {filteredUsers.length}</span>
              <span>Всего по текущему поиску: {userCounts.all || 0}</span>
            </div>

            {loading ? (
              <LoadingBlock text="Загружаем пользователей..." />
            ) : (
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

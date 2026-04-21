import { useMemo, useState } from "react";
import { UserDetailPanel } from "../components/admin/UserDetailPanel";
import { UserForm } from "../components/admin/UserForm";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function userMatchesSearch(user, query) {
  if (!query) {
    return true;
  }

  const rolesText = (user.roles || [])
    .map((role) => `${role.code} ${role.name || ""}`)
    .join(" ");

  const haystack = [
    user.email,
    user.full_name,
    user.phone,
    rolesText,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

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
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");

  const filteredUsers = useMemo(() => {
    const query = normalizeSearch(searchQuery);

    return users.filter((item) =>
      userMatchesSearch(item, query) &&
      userMatchesActivityFilter(item, activityFilter)
    );
  }, [users, searchQuery, activityFilter]);

  function resetFilters() {
    setSearchQuery("");
    setActivityFilter("all");
  }

  const filtersAreActive = searchQuery.trim() !== "" || activityFilter !== "all";

  return (
    <div className="space-y-6">
      <SectionCard
        title="Пользователи"
        subtitle="Список пользователей из backend."
        action={
          user ? (
            <div className="flex flex-wrap justify-end gap-2">
              <ActionButton
                type="button"
                tone="light"
                onClick={onRefreshAdminData}
                disabled={loading}
              >
                {loading ? "Обновляем..." : "Обновить"}
              </ActionButton>

              <ActionButton
                type="button"
                tone={isCreating ? "light" : "blue"}
                onClick={() => setIsCreating((current) => !current)}
                disabled={loading}
              >
                {isCreating ? "Скрыть форму" : "Создать пользователя"}
              </ActionButton>
            </div>
          ) : null
        }
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть пользователей.</p>
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Поиск
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Email, ФИО, телефон или роль"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Активность
                  </span>
                  <select
                    value={activityFilter}
                    onChange={(event) => setActivityFilter(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="all">Все пользователи</option>
                    <option value="active">Только активные</option>
                    <option value="inactive">Только отключённые</option>
                  </select>
                </label>

                <ActionButton
                  type="button"
                  tone="light"
                  onClick={resetFilters}
                  disabled={!filtersAreActive}
                >
                  Сбросить
                </ActionButton>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Показано: {filteredUsers.length} из {users.length}
              </div>
            </div>

            {loading ? (
              <LoadingBlock text="Загружаем пользователей..." />
            ) : (
              <SmallTable
                emptyText="Пользователей по фильтру нет."
                rows={filteredUsers}
                selectedRowId={selectedUser?.id}
                minWidth="820px"
                columns={[
                  { key: "email", title: "Email" },
                  { key: "full_name", title: "ФИО" },
                  {
                    key: "roles",
                    title: "Роли",
                    render: (row) => (
                      <div className="flex flex-wrap gap-1">
                        {row.roles.map((role) => (
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
                      <ActionButton
                        onClick={() => onOpenUser(row.id)}
                        disabled={selectedUserLoading}
                      >
                        {selectedUser?.id === row.id ? "Открыто" : "Открыть"}
                      </ActionButton>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </SectionCard>

      {user && isCreating && (
        <SectionCard
          title="Создание пользователя"
          subtitle="Создаёт учётную запись без ролей. Роль можно назначить после создания в карточке пользователя."
        >
          <UserForm
            mode="create"
            submitLabel="Создать пользователя"
            successMessage="Пользователь создан. Теперь можно назначить ему роль."
            onSubmit={onCreateUser}
            onCancel={() => setIsCreating(false)}
            onSuccess={() => setIsCreating(false)}
          />
        </SectionCard>
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

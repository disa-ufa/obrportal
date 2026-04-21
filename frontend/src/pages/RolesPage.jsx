import { useMemo, useState } from "react";
import { RoleDetailPanel } from "../components/admin/RoleDetailPanel";
import { RoleForm } from "../components/admin/RoleForm";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";

const SYSTEM_ROLE_CODES = new Set([
  "admin",
  "learner_fl",
  "learner_org",
  "org_rep",
  "teacher",
  "methodist",
  "finance_operator",
  "edo_operator",
  "frdo_operator",
]);

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function isSystemRole(role) {
  return SYSTEM_ROLE_CODES.has(role.code);
}

function roleMatchesSearch(role, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    role.code,
    role.name,
    role.description,
  ].map(normalizeText).join(" ");

  return haystack.includes(query);
}

function roleMatchesType(role, filter) {
  if (filter === "system") {
    return isSystemRole(role);
  }

  if (filter === "custom") {
    return !isSystemRole(role);
  }

  if (filter === "admin") {
    return role.code === "admin";
  }

  return true;
}

function FilterLabel({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function RolesPage({
  user,
  roles,
  permissions,
  loading,
  selectedRole,
  selectedRoleLoading,
  selectedRoleError,
  onOpenRole,
  onCloseRole,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onRefreshAdminData,
  onAssignRolePermission,
  onRemoveRolePermission,
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleTypeFilter, setRoleTypeFilter] = useState("all");

  const normalizedSearchQuery = normalizeText(searchQuery);

  const filteredRoles = useMemo(
    () => roles.filter((role) =>
      roleMatchesSearch(role, normalizedSearchQuery) &&
      roleMatchesType(role, roleTypeFilter)
    ),
    [roles, normalizedSearchQuery, roleTypeFilter]
  );

  const hasActiveFilters = normalizedSearchQuery || roleTypeFilter !== "all";

  function resetFilters() {
    setSearchQuery("");
    setRoleTypeFilter("all");
  }

  async function handleCreateRole(payload) {
    const created = await onCreateRole(payload);
    setShowCreateForm(false);

    return created;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Роли"
        subtitle="Базовые и пользовательские роли RBAC."
        action={user ? (
          <AdminPageActions
            loading={loading}
            onRefresh={onRefreshAdminData}
            primaryLabel={showCreateForm ? "Скрыть форму" : "Создать роль"}
            primaryTone={showCreateForm ? "light" : "blue"}
            onPrimaryClick={() => setShowCreateForm((current) => !current)}
          />
        ) : null}
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть роли.</p>
        ) : (
          <div className="space-y-5">
            {showCreateForm && (
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Новая роль
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    После создания роль можно открыть и назначить ей permissions.
                  </p>
                </div>

                <RoleForm
                  submitLabel="Создать роль"
                  successMessage="Роль создана."
                  onSubmit={handleCreateRole}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
            )}

            <AdminFilterPanel
              columnsClassName="lg:grid-cols-[1fr_260px_auto]"
              onReset={resetFilters}
              resetDisabled={!hasActiveFilters}
              summary={`Показано: ${filteredRoles.length} из ${roles.length}`}
            >
              <FilterLabel label="Поиск">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Код, название или описание"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </FilterLabel>

              <FilterLabel label="Тип роли">
                <select
                  value={roleTypeFilter}
                  onChange={(event) => setRoleTypeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="all">Все роли</option>
                  <option value="system">Системные</option>
                  <option value="custom">Пользовательские</option>
                  <option value="admin">Только admin</option>
                </select>
              </FilterLabel>
            </AdminFilterPanel>

            {loading ? (
              <LoadingBlock text="Загружаем роли..." />
            ) : (
              <SmallTable
                emptyText="Ролей по фильтру нет."
                rows={filteredRoles}
                selectedRowId={selectedRole?.id}
                minWidth="860px"
                columns={[
                  {
                    key: "code",
                    title: "Код",
                    render: (row) => (
                      <StatusBadge tone={row.code === "admin" ? "amber" : "blue"}>
                        {row.code}
                      </StatusBadge>
                    ),
                  },
                  { key: "name", title: "Название" },
                  { key: "description", title: "Описание" },
                  {
                    key: "kind",
                    title: "Тип",
                    render: (row) => (
                      <StatusBadge tone={isSystemRole(row) ? "green" : "gray"}>
                        {isSystemRole(row) ? "системная" : "пользовательская"}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: "actions",
                    title: "Действия",
                    render: (row) => (
                      <ActionButton
                        onClick={() => onOpenRole(row.id)}
                        disabled={selectedRoleLoading}
                      >
                        {selectedRole?.id === row.id ? "Открыто" : "Открыть"}
                      </ActionButton>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </SectionCard>

      {user && (
        <RoleDetailPanel
          roleDetail={selectedRole}
          permissions={permissions}
          loading={selectedRoleLoading}
          error={selectedRoleError}
          onClose={onCloseRole}
          onUpdateRole={onUpdateRole}
          onDeleteRole={onDeleteRole}
          onAssignPermission={onAssignRolePermission}
          onRemovePermission={onRemoveRolePermission}
        />
      )}
    </div>
  );
}

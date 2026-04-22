import { useMemo, useState } from "react";
import { RoleDetailPanel } from "../components/admin/RoleDetailPanel";
import { RoleForm } from "../components/admin/RoleForm";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { buildSearchText, normalizeSearchValue } from "../utils/search";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { ADMIN_FILTER_CONTROL_SUBTLE_CLASS } from "../utils/adminClasses";

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

function isSystemRole(role) {
  return SYSTEM_ROLE_CODES.has(role.code);
}

function roleMatchesSearch(role, query) {
  if (!query) {
    return true;
  }

  const haystack = buildSearchText([
    role.code,
    role.name,
    role.description,
  ]);

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

  const normalizedSearchQuery = normalizeSearchValue(searchQuery);

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
              <AdminCreatePanel
                title="Новая роль"
                subtitle="После создания роль можно открыть и назначить ей permissions."
                className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                titleClassName="text-sm font-semibold text-slate-900"
                subtitleClassName="mt-1 text-xs text-slate-600"
              >
                <RoleForm
                  submitLabel="Создать роль"
                  successMessage="Роль создана."
                  onSubmit={handleCreateRole}
                  onCancel={() => setShowCreateForm(false)}
                />
              </AdminCreatePanel>
            )}

            <AdminFilterPanel
              columnsClassName="lg:grid-cols-[1fr_260px_auto]"
              onReset={resetFilters}
              resetDisabled={!hasActiveFilters}
              summary={getShownSummary(filteredRoles.length, roles.length)}
            >
              <AdminFilterField label="Поиск" className="block space-y-2" labelClassName="tracking-[0.2em]">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Код, название или описание"
                  className={ADMIN_FILTER_CONTROL_SUBTLE_CLASS}
                />
              </AdminFilterField>

              <AdminFilterField label="Тип роли" className="block space-y-2" labelClassName="tracking-[0.2em]">
                <select
                  value={roleTypeFilter}
                  onChange={(event) => setRoleTypeFilter(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_SUBTLE_CLASS}
                >
                  <option value="all">Все роли</option>
                  <option value="system">Системные</option>
                  <option value="custom">Пользовательские</option>
                  <option value="admin">Только admin</option>
                </select>
              </AdminFilterField>
            </AdminFilterPanel>

            {loading ? (
              <LoadingBlock text="Загружаем роли..." />
            ) : (
              <SmallTable
                emptyText={getFilteredEmptyText(
                  hasActiveFilters,
                  "Ролей по фильтру нет.",
                  "Ролей нет."
                )}
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

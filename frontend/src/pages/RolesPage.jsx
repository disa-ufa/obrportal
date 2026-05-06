import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RoleDetailPanel } from "../components/admin/RoleDetailPanel";
import {
  RoleForm,
  ROLE_API_ERROR_MESSAGES,
} from "../components/admin/RoleForm";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { AdminSummaryCard, AdminWorkflowLink } from "../components/admin/AdminWorkCenter";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { buildSearchText, normalizeSearchValue } from "../utils/search";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { ADMIN_FILTER_CONTROL_SUBTLE_CLASS } from "../utils/adminClasses";
import { TABLE_LINK_CLASS, buildPermissionsPath, buildRolesPath, buildUsersPath } from "../utils/adminLinks";

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

  const permissionsText = (role.permissions || [])
    .map((permission) => `${permission.code || ""} ${permission.name || ""}`)
    .join(" ");

  const haystack = buildSearchText([
    role.code,
    role.name,
    role.description,
    permissionsText,
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

const ROLE_TYPE_FILTERS = [
  { value: "all", label: "Все" },
  { value: "system", label: "Системные" },
  { value: "custom", label: "Пользовательские" },
  { value: "admin", label: "Admin" },
];

function getRoleFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    type: params.get("type") || "all",
  };
}

function calculateRoleCounts(items) {
  const counts = {
    all: Array.isArray(items) ? items.length : 0,
    system: 0,
    custom: 0,
    admin: 0,
  };

  if (!Array.isArray(items)) {
    return counts;
  }

  items.forEach((role) => {
    if (isSystemRole(role)) {
      counts.system += 1;
    } else {
      counts.custom += 1;
    }

    if (role.code === "admin") {
      counts.admin += 1;
    }
  });

  return counts;
}

function RolesSummaryCards({ roles, permissions, roleCounts }) {
  const assignedPermissionCodes = new Set();

  roles.forEach((role) => {
    (role.permissions || []).forEach((permission) => {
      if (permission.code) {
        assignedPermissionCodes.add(permission.code);
      }
    });
  });

  const unassignedPermissionsCount = permissions.filter(
    (permission) => permission.code && !assignedPermissionCodes.has(permission.code)
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard
        title="Всего ролей"
        value={roleCounts.all || 0}
        hint="Системные и пользовательские роли RBAC."
        to={buildRolesPath()}
      />
      <AdminSummaryCard
        title="Системные"
        value={roleCounts.system || 0}
        hint="Защищённые базовые роли платформы."
        to={buildRolesPath({ type: "system" })}
      />
      <AdminSummaryCard
        title="Пользовательские"
        value={roleCounts.custom || 0}
        hint="Роли, которые можно настраивать под процессы."
        to={buildRolesPath({ type: "custom" })}
      />
      <AdminSummaryCard
        title="Свободные права"
        value={unassignedPermissionsCount}
        hint="Permissions без привязки к ролям."
        to={buildPermissionsPath()}
      />
    </div>
  );
}

function RolesWorkflowPanel({ roles, permissions, roleCounts }) {
  const adminRole = roles.find((role) => role.code === "admin");
  const firstCustomRole = roles.find((role) => !isSystemRole(role));
  const adminPermissionsCount = permissions.filter((permission) =>
    String(permission.code || "").startsWith("admin.")
  ).length;

  return (
    <SectionCard
      title="Рабочие сценарии"
      subtitle="Быстрые переходы для проверки ролей, пользователей и набора прав."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminWorkflowLink
          title="Проверить admin"
          description={`Открыть admin-роль и связанные права: ${roleCounts.admin || 0}.`}
          to={buildRolesPath({ type: "admin" })}
        />
        <AdminWorkflowLink
          title="Пользователи admin"
          description="Посмотреть пользователей, которым назначена административная роль."
          to={adminRole ? buildUsersPath({ role_id: adminRole.id }) : buildUsersPath({ q: "admin" })}
        />
        <AdminWorkflowLink
          title="Admin permissions"
          description={`Проверить группу admin.*: ${adminPermissionsCount}.`}
          to={buildPermissionsPath({ group: "admin" })}
        />
        <AdminWorkflowLink
          title="Настроить custom"
          description={
            firstCustomRole
              ? `Открыть пользовательские роли: ${roleCounts.custom || 0}.`
              : "Пока пользовательских ролей нет — можно создать первую."
          }
          to={buildRolesPath({ type: "custom" })}
        />
      </div>
    </SectionCard>
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
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getRoleFiltersFromSearch(location.search);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilters.q);
  const [roleTypeFilter, setRoleTypeFilter] = useState(initialFilters.type);

  useEffect(() => {
    const nextFilters = getRoleFiltersFromSearch(location.search);

    setSearchQuery(nextFilters.q);
    setRoleTypeFilter(nextFilters.type);
  }, [location.search]);

  const normalizedSearchQuery = normalizeSearchValue(searchQuery);

  const baseFilteredRoles = useMemo(
    () => roles.filter((role) => roleMatchesSearch(role, normalizedSearchQuery)),
    [roles, normalizedSearchQuery]
  );

  const roleCounts = useMemo(() => calculateRoleCounts(baseFilteredRoles), [baseFilteredRoles]);

  const filteredRoles = useMemo(
    () => baseFilteredRoles.filter((role) => roleMatchesType(role, roleTypeFilter)),
    [baseFilteredRoles, roleTypeFilter]
  );

  const hasActiveFilters = Boolean(normalizedSearchQuery) || roleTypeFilter !== "all";

  function buildRoleFilters(overrides = {}) {
    return {
      q: overrides.q ?? searchQuery,
      type: overrides.type ?? roleTypeFilter,
    };
  }

  function navigateToRoleFilters(filters, options = { replace: true }) {
    const nextPath = buildRolesPath(filters);
    const currentPath = `${location.pathname}${location.search}`;

    if (currentPath === nextPath) {
      return;
    }

    navigate(nextPath, options);
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
    navigateToRoleFilters(buildRoleFilters({ q: value }));
  }

  function handleRoleTypeChange(value) {
    setRoleTypeFilter(value);
    navigateToRoleFilters(buildRoleFilters({ type: value }));
  }

  function resetFilters() {
    setSearchQuery("");
    setRoleTypeFilter("all");
    navigateToRoleFilters({}, { replace: true });
  }

  async function handleCreateRole(payload) {
    const created = await onCreateRole(payload);
    setShowCreateForm(false);

    return created;
  }

  return (
    <div className="space-y-6">
      {user && (
        <>
          <RolesSummaryCards
            roles={roles}
            permissions={permissions}
            roleCounts={roleCounts}
          />

          <RolesWorkflowPanel
            roles={roles}
            permissions={permissions}
            roleCounts={roleCounts}
          />
        </>
      )}

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
            errorMessage={ROLE_API_ERROR_MESSAGES.createFailed}
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
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Код, название или описание"
                  className={ADMIN_FILTER_CONTROL_SUBTLE_CLASS}
                />
              </AdminFilterField>

              <AdminFilterField label="Тип роли" className="block space-y-2" labelClassName="tracking-[0.2em]">
                <select
                  value={roleTypeFilter}
                  onChange={(event) => handleRoleTypeChange(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_SUBTLE_CLASS}
                >
                  <option value="all">Все роли</option>
                  <option value="system">Системные</option>
                  <option value="custom">Пользовательские</option>
                  <option value="admin">Только admin</option>
                </select>
              </AdminFilterField>
            </AdminFilterPanel>

            <AdminQuickFilterButtons
              items={ROLE_TYPE_FILTERS}
              activeValue={roleTypeFilter}
              counts={roleCounts}
              disabled={loading}
              onChange={handleRoleTypeChange}
            />

            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Показано ролей: {filteredRoles.length}</span>
              <span>Всего по текущему поиску: {roleCounts.all || 0}</span>
            </div>

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
                minWidth="980px"
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
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => onOpenRole(row.id)}
                          disabled={selectedRoleLoading}
                        >
                          {selectedRole?.id === row.id ? "Открыто" : "Открыть"}
                        </ActionButton>

                        <Link
                          to={buildUsersPath({ role_id: row.id })}
                          className={TABLE_LINK_CLASS}
                        >
                          Пользователи
                        </Link>

                        <Link
                          to={buildPermissionsPath({ q: row.code })}
                          className={TABLE_LINK_CLASS}
                        >
                          Права
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

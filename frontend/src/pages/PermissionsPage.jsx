import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PermissionDetailPanel } from "../components/admin/PermissionDetailPanel";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { AdminSummaryCard, AdminWorkflowLink } from "../components/admin/AdminWorkCenter";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { normalizeSearchValue } from "../utils/search";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { ADMIN_FILTER_CONTROL_SOFT_CLASS } from "../utils/adminClasses";
import { TABLE_LINK_CLASS, buildPermissionsPath, buildRolesPath } from "../utils/adminLinks";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";

const ALL_PERMISSION_GROUPS = "all";

function getPermissionGroup(permission) {
  const code = permission?.code || "";
  const [group] = code.split(".");

  return group || "other";
}

function getPermissionSearchText(permission) {
  const rolesText = (permission.roles || [])
    .map((role) => `${role.code || ""} ${role.name || ""}`)
    .join(" ");

  return normalizeSearchValue([
    permission.code,
    permission.name,
    permission.description,
    getPermissionGroup(permission),
    rolesText,
  ].filter(Boolean).join(" "));
}

function getPermissionGroupTone(group) {
  if (group === "admin") {
    return "amber";
  }

  if (group === "audit") {
    return "blue";
  }

  return "gray";
}

function getPermissionFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    group: params.get("group") || ALL_PERMISSION_GROUPS,
  };
}

function calculatePermissionGroupCounts(items) {
  const counts = {
    [ALL_PERMISSION_GROUPS]: Array.isArray(items) ? items.length : 0,
  };

  if (!Array.isArray(items)) {
    return counts;
  }

  items.forEach((permission) => {
    const group = getPermissionGroup(permission);
    counts[group] = (counts[group] || 0) + 1;
  });

  return counts;
}

function PermissionsSummaryCards({ permissions, permissionGroups, permissionGroupCounts }) {
  const roleAssignmentsCount = permissions.reduce(
    (total, permission) => total + (permission.roles || []).length,
    0
  );
  const permissionsWithoutRolesCount = permissions.filter(
    (permission) => (permission.roles || []).length === 0
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard
        title="Всего прав"
        value={permissionGroupCounts[ALL_PERMISSION_GROUPS] || 0}
        hint="Все permissions, доступные в RBAC."
        to={buildPermissionsPath()}
      />
      <AdminSummaryCard
        title="Группы прав"
        value={permissionGroups.length}
        hint="Логические группы по префиксу кода."
      />
      <AdminSummaryCard
        title="Привязки к ролям"
        value={roleAssignmentsCount}
        hint="Сколько связей permission → role уже настроено."
        to={buildRolesPath()}
      />
      <AdminSummaryCard
        title="Без ролей"
        value={permissionsWithoutRolesCount}
        hint="Права, которые пока не назначены ни одной роли."
      />
    </div>
  );
}

function PermissionsWorkflowPanel({ permissionGroupCounts }) {
  return (
    <SectionCard
      title="Рабочие сценарии"
      subtitle="Быстрые переходы для аудита прав и связей RBAC."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminWorkflowLink
          title="Admin permissions"
          description={`Проверить группу admin.*: ${permissionGroupCounts.admin || 0}.`}
          to={buildPermissionsPath({ group: "admin" })}
        />
        <AdminWorkflowLink
          title="Audit permissions"
          description={`Проверить группу audit.*: ${permissionGroupCounts.audit || 0}.`}
          to={buildPermissionsPath({ group: "audit" })}
        />
        <AdminWorkflowLink
          title="Роли с admin.*"
          description="Найти роли, в которых используются административные права."
          to={buildRolesPath({ q: "admin." })}
        />
        <AdminWorkflowLink
          title="Все роли"
          description="Перейти к настройке ролей и назначению permissions."
          to={buildRolesPath()}
        />
      </div>
    </SectionCard>
  );
}


export function PermissionsPage({
  user,
  permissions,
  loading,
  selectedPermission,
  selectedPermissionLoading,
  selectedPermissionError,
  onOpenPermission,
  onClosePermission,
  onRefreshAdminData,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getPermissionFiltersFromSearch(location.search);

  const [search, setSearch] = useState(initialFilters.q);
  const [groupFilter, setGroupFilter] = useState(initialFilters.group);

  useEffect(() => {
    const nextFilters = getPermissionFiltersFromSearch(location.search);

    setSearch(nextFilters.q);
    setGroupFilter(nextFilters.group);
  }, [location.search]);

  const permissionGroups = useMemo(() => {
    return Array.from(
      new Set(permissions.map((permission) => getPermissionGroup(permission)))
    ).sort((left, right) => left.localeCompare(right, "ru-RU"));
  }, [permissions]);

  const baseFilteredPermissions = useMemo(() => {
    const query = normalizeSearchValue(search);

    return permissions.filter(
      (permission) => !query || getPermissionSearchText(permission).includes(query)
    );
  }, [permissions, search]);

  const permissionGroupCounts = useMemo(
    () => calculatePermissionGroupCounts(baseFilteredPermissions),
    [baseFilteredPermissions]
  );

  const filteredPermissions = useMemo(() => {
    return baseFilteredPermissions.filter(
      (permission) =>
        groupFilter === ALL_PERMISSION_GROUPS || getPermissionGroup(permission) === groupFilter
    );
  }, [baseFilteredPermissions, groupFilter]);

  const hasActiveFilters = Boolean(search.trim()) || groupFilter !== ALL_PERMISSION_GROUPS;

  function buildPermissionFilters(overrides = {}) {
    return {
      q: overrides.q ?? search,
      group: overrides.group ?? groupFilter,
    };
  }

  function navigateToPermissionFilters(filters, options = { replace: true }) {
    const nextPath = buildPermissionsPath(filters);
    const currentPath = `${location.pathname}${location.search}`;

    if (currentPath === nextPath) {
      return;
    }

    navigate(nextPath, options);
  }

  function handleSearchChange(value) {
    setSearch(value);
    navigateToPermissionFilters(buildPermissionFilters({ q: value }));
  }

  function handleGroupChange(value) {
    setGroupFilter(value);
    navigateToPermissionFilters(buildPermissionFilters({ group: value }));
  }

  function resetFilters() {
    setSearch("");
    setGroupFilter(ALL_PERMISSION_GROUPS);
    navigateToPermissionFilters({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      {user && (
        <>
          <PermissionsSummaryCards
            permissions={permissions}
            permissionGroups={permissionGroups}
            permissionGroupCounts={permissionGroupCounts}
          />

          <PermissionsWorkflowPanel
            permissionGroupCounts={permissionGroupCounts}
          />
        </>
      )}

      <SectionCard
        title="Права"
        subtitle="Read-only список permissions."
        action={user ? (
          <AdminPageActions
            loading={loading}
            onRefresh={onRefreshAdminData}
          />
        ) : null}
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть права.</p>
        ) : loading ? (
          <LoadingBlock text="Загружаем права..." />
        ) : (
          <div className="space-y-5">
            <AdminFilterPanel
              columnsClassName="lg:grid-cols-[1fr_260px_auto]"
              onReset={resetFilters}
              resetDisabled={!hasActiveFilters}
              summary={getShownSummary(filteredPermissions.length, permissions.length)}
            >
              <AdminFilterField label="Поиск" className="block space-y-2" labelClassName="tracking-[0.18em]">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Код, название или описание"
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                />
              </AdminFilterField>

              <AdminFilterField label="Группа" className="block space-y-2" labelClassName="tracking-[0.18em]">
                <select
                  value={groupFilter}
                  onChange={(event) => handleGroupChange(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                >
                  <option value={ALL_PERMISSION_GROUPS}>Все группы</option>
                  {permissionGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </AdminFilterField>
            </AdminFilterPanel>

            <AdminQuickFilterButtons
              items={[
                { value: ALL_PERMISSION_GROUPS, label: "Все" },
                ...permissionGroups.map((group) => ({ value: group, label: group })),
              ]}
              activeValue={groupFilter}
              counts={permissionGroupCounts}
              disabled={loading}
              onChange={handleGroupChange}
            />

            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Показано прав: {filteredPermissions.length}</span>
              <span>Всего по текущему поиску: {permissionGroupCounts[ALL_PERMISSION_GROUPS] || 0}</span>
            </div>

            <SmallTable
              emptyText={getFilteredEmptyText(
                hasActiveFilters,
                "Прав по фильтру нет.",
                "Прав нет."
              )}
              rows={filteredPermissions}
              selectedRowId={selectedPermission?.id}
              minWidth="960px"
              columns={[
                {
                  key: "code",
                  title: "Код",
                  render: (row) => (
                    <StatusBadge tone="blue">
                      {row.code}
                    </StatusBadge>
                  ),
                },
                {
                  key: "group",
                  title: "Группа",
                  render: (row) => {
                    const group = getPermissionGroup(row);

                    return (
                      <StatusBadge tone={getPermissionGroupTone(group)}>
                        {group}
                      </StatusBadge>
                    );
                  },
                },
                { key: "name", title: "Название" },
                { key: "description", title: "Описание" },
                {
                  key: "actions",
                  title: "Действия",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        onClick={() => onOpenPermission(row.id)}
                        disabled={selectedPermissionLoading}
                      >
                        {selectedPermission?.id === row.id ? "Открыто" : "Открыть"}
                      </ActionButton>

                      <Link
                        to={buildRolesPath({ q: row.code })}
                        className={TABLE_LINK_CLASS}
                      >
                        Роли
                      </Link>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </SectionCard>

      {user && (
        <PermissionDetailPanel
          permissionDetail={selectedPermission}
          loading={selectedPermissionLoading}
          error={selectedPermissionError}
          onClose={onClosePermission}
        />
      )}
    </div>
  );
}

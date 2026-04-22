import { useMemo, useState } from "react";
import { PermissionDetailPanel } from "../components/admin/PermissionDetailPanel";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { normalizeSearchValue } from "../utils/search";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { ADMIN_FILTER_CONTROL_SOFT_CLASS } from "../utils/adminClasses";

const ALL_PERMISSION_GROUPS = "all";

function getPermissionGroup(permission) {
  const code = permission?.code || "";
  const [group] = code.split(".");

  return group || "other";
}

function getPermissionSearchText(permission) {
  return normalizeSearchValue([
    permission.code,
    permission.name,
    permission.description,
    getPermissionGroup(permission),
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
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState(ALL_PERMISSION_GROUPS);

  const permissionGroups = useMemo(() => {
    return Array.from(
      new Set(permissions.map((permission) => getPermissionGroup(permission)))
    ).sort((left, right) => left.localeCompare(right, "ru-RU"));
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    const query = normalizeSearchValue(search);

    return permissions.filter((permission) => {
      const matchesSearch = !query || getPermissionSearchText(permission).includes(query);
      const matchesGroup = groupFilter === ALL_PERMISSION_GROUPS
        || getPermissionGroup(permission) === groupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [permissions, search, groupFilter]);

  const hasActiveFilters = Boolean(search.trim()) || groupFilter !== ALL_PERMISSION_GROUPS;

  function resetFilters() {
    setSearch("");
    setGroupFilter(ALL_PERMISSION_GROUPS);
  }

  return (
    <div className="space-y-6">
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
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Код, название или описание"
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                />
              </AdminFilterField>

              <AdminFilterField label="Группа" className="block space-y-2" labelClassName="tracking-[0.18em]">
                <select
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
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
                    <ActionButton
                      onClick={() => onOpenPermission(row.id)}
                      disabled={selectedPermissionLoading}
                    >
                      {selectedPermission?.id === row.id ? "Открыто" : "Открыть"}
                    </ActionButton>
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

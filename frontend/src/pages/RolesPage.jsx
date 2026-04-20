import { RoleDetailPanel } from "../components/admin/RoleDetailPanel";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";

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
  onAssignRolePermission,
  onRemoveRolePermission,
}) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Роли"
        subtitle="Базовые роли RBAC."
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть роли.</p>
        ) : loading ? (
          <LoadingBlock text="Загружаем роли..." />
        ) : (
          <SmallTable
            emptyText="Ролей нет."
            rows={roles}
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
      </SectionCard>

      {user && (
        <RoleDetailPanel
          roleDetail={selectedRole}
          permissions={permissions}
          loading={selectedRoleLoading}
          error={selectedRoleError}
          onClose={onCloseRole}
          onAssignPermission={onAssignRolePermission}
          onRemovePermission={onRemoveRolePermission}
        />
      )}
    </div>
  );
}

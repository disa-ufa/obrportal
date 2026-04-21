import { useState } from "react";
import { RoleDetailPanel } from "../components/admin/RoleDetailPanel";
import { RoleForm } from "../components/admin/RoleForm";
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
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onAssignRolePermission,
  onRemoveRolePermission,
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);

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
          <ActionButton
            tone={showCreateForm ? "light" : "blue"}
            onClick={() => setShowCreateForm((current) => !current)}
          >
            {showCreateForm ? "Скрыть форму" : "Создать роль"}
          </ActionButton>
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

            {loading ? (
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

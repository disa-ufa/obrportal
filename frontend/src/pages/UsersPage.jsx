import { useState } from "react";
import { UserDetailPanel } from "../components/admin/UserDetailPanel";
import { UserForm } from "../components/admin/UserForm";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";

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
}) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Пользователи"
        subtitle="Список пользователей из backend."
        action={
          user ? (
            <ActionButton
              type="button"
              tone={isCreating ? "light" : "blue"}
              onClick={() => setIsCreating((current) => !current)}
              disabled={loading}
            >
              {isCreating ? "Скрыть форму" : "Создать пользователя"}
            </ActionButton>
          ) : null
        }
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть пользователей.</p>
        ) : loading ? (
          <LoadingBlock text="Загружаем пользователей..." />
        ) : (
          <SmallTable
            emptyText="Пользователей нет."
            rows={users}
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

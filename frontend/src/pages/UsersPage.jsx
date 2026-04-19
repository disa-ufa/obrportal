import { UserDetailPanel } from "../components/admin/UserDetailPanel";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";

export function UsersPage({
  user,
  users,
  loading,
  selectedUser,
  selectedUserLoading,
  selectedUserError,
  onOpenUser,
  onCloseUser,
}) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Пользователи"
        subtitle="Read-only список пользователей из backend."
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть пользователей.</p>
        ) : loading ? (
          <LoadingBlock text="Загружаем пользователей..." />
        ) : (
          <SmallTable
            emptyText="Пользователей нет."
            rows={users}
            columns={[
              { key: "email", title: "Email" },
              { key: "full_name", title: "ФИО" },
              {
                key: "roles",
                title: "Роли",
                render: (row) => row.roles.map((role) => role.code).join(", "),
              },
              {
                key: "is_active",
                title: "Активен",
                render: (row) => row.is_active ? "да" : "нет",
              },
              {
                key: "actions",
                title: "Действия",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => onOpenUser(row.id)}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Открыть
                  </button>
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      {user && (
        <UserDetailPanel
          userDetail={selectedUser}
          loading={selectedUserLoading}
          error={selectedUserError}
          onClose={onCloseUser}
        />
      )}
    </div>
  );
}

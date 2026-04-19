import { SectionCard } from "../ui/SectionCard";
import { SmallTable } from "../ui/SmallTable";

export function AdminReadOnlyPanel({
  user,
  adminData,
  activeTab,
  onTabChange,
}) {
  return (
    <SectionCard
      title="Admin API"
      subtitle="Read-only данные из backend: users, roles, permissions, audit-events."
    >
      {!user ? (
        <p className="text-slate-600">
          Войдите под admin, чтобы загрузить служебные данные.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {[
              ["users", `Пользователи (${adminData.users.length})`],
              ["roles", `Роли (${adminData.roles.length})`],
              ["permissions", `Права (${adminData.permissions.length})`],
              ["audit", `Аудит (${adminData.auditEvents.length})`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  activeTab === key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "users" && (
            <SmallTable
              emptyText="Пользователей нет."
              rows={adminData.users}
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
              ]}
            />
          )}

          {activeTab === "roles" && (
            <SmallTable
              emptyText="Ролей нет."
              rows={adminData.roles}
              columns={[
                { key: "code", title: "Код" },
                { key: "name", title: "Название" },
                { key: "description", title: "Описание" },
              ]}
            />
          )}

          {activeTab === "permissions" && (
            <SmallTable
              emptyText="Прав нет."
              rows={adminData.permissions}
              columns={[
                { key: "code", title: "Код" },
                { key: "name", title: "Название" },
              ]}
            />
          )}

          {activeTab === "audit" && (
            <SmallTable
              emptyText="Событий аудита нет."
              rows={adminData.auditEvents}
              columns={[
                { key: "action", title: "Действие" },
                { key: "entity_type", title: "Сущность" },
                {
                  key: "payload",
                  title: "Payload",
                  render: (row) => JSON.stringify(row.payload),
                },
                { key: "created_at", title: "Дата" },
              ]}
            />
          )}
        </div>
      )}
    </SectionCard>
  );
}

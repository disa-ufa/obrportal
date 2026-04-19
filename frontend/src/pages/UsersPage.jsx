import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";

export function UsersPage({ user, users }) {
  return (
    <SectionCard
      title="Пользователи"
      subtitle="Read-only список пользователей из backend."
    >
      {!user ? (
        <p className="text-slate-600">Войдите под admin, чтобы увидеть пользователей.</p>
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
          ]}
        />
      )}
    </SectionCard>
  );
}

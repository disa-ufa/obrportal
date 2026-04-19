import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";

export function RolesPage({ user, roles }) {
  return (
    <SectionCard
      title="Роли"
      subtitle="Базовые роли RBAC."
    >
      {!user ? (
        <p className="text-slate-600">Войдите под admin, чтобы увидеть роли.</p>
      ) : (
        <SmallTable
          emptyText="Ролей нет."
          rows={roles}
          columns={[
            { key: "code", title: "Код" },
            { key: "name", title: "Название" },
            { key: "description", title: "Описание" },
          ]}
        />
      )}
    </SectionCard>
  );
}

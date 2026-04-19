import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";

export function PermissionsPage({ user, permissions }) {
  return (
    <SectionCard
      title="Права"
      subtitle="Permissions, используемые в backend RBAC."
    >
      {!user ? (
        <p className="text-slate-600">Войдите под admin, чтобы увидеть права.</p>
      ) : (
        <SmallTable
          emptyText="Прав нет."
          rows={permissions}
          columns={[
            { key: "code", title: "Код" },
            { key: "name", title: "Название" },
          ]}
        />
      )}
    </SectionCard>
  );
}

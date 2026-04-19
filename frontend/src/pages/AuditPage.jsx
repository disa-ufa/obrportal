import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";

export function AuditPage({ user, auditEvents }) {
  return (
    <SectionCard
      title="Аудит"
      subtitle="Последние события audit_events."
    >
      {!user ? (
        <p className="text-slate-600">Войдите под admin, чтобы увидеть аудит.</p>
      ) : (
        <SmallTable
          emptyText="Событий аудита нет."
          rows={auditEvents}
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
    </SectionCard>
  );
}

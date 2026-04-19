import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";

function AuditPayload({ payload }) {
  return (
    <pre className="max-w-xl overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

export function AuditPage({ user, auditEvents, loading }) {
  return (
    <SectionCard
      title="Аудит"
      subtitle="Последние события audit_events."
    >
      {!user ? (
        <p className="text-slate-600">Войдите под admin, чтобы увидеть аудит.</p>
      ) : loading ? (
        <LoadingBlock text="Загружаем аудит..." />
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
              render: (row) => <AuditPayload payload={row.payload} />,
            },
            { key: "created_at", title: "Дата" },
          ]}
        />
      )}
    </SectionCard>
  );
}

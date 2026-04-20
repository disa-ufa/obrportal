import { AuditEventDetailPanel } from "../components/admin/AuditEventDetailPanel";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ru-RU");
}

export function AuditPage({
  user,
  auditEvents,
  loading,
  selectedAuditEvent,
  selectedAuditEventLoading,
  selectedAuditEventError,
  onOpenAuditEvent,
  onCloseAuditEvent,
}) {
  return (
    <div className="space-y-6">
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
            selectedRowId={selectedAuditEvent?.id}
            minWidth="980px"
            columns={[
              {
                key: "action",
                title: "Действие",
                render: (row) => (
                  <StatusBadge tone="blue">
                    {row.action}
                  </StatusBadge>
                ),
              },
              { key: "entity_type", title: "Сущность" },
              { key: "entity_id", title: "ID сущности" },
              { key: "ip_address", title: "IP" },
              {
                key: "created_at",
                title: "Дата",
                render: (row) => formatDate(row.created_at),
              },
              {
                key: "actions",
                title: "Действия",
                render: (row) => (
                  <ActionButton
                    onClick={() => onOpenAuditEvent(row.id)}
                    disabled={selectedAuditEventLoading}
                  >
                    {selectedAuditEvent?.id === row.id ? "Открыто" : "Открыть"}
                  </ActionButton>
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      {user && (
        <AuditEventDetailPanel
          auditEventDetail={selectedAuditEvent}
          loading={selectedAuditEventLoading}
          error={selectedAuditEventError}
          onClose={onCloseAuditEvent}
        />
      )}
    </div>
  );
}

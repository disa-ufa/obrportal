import { Alert } from "../ui/Alert";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";

function Field({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ru-RU");
}

function PayloadBlock({ payload }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100 ring-1 ring-slate-800">
      {JSON.stringify(payload || {}, null, 2)}
    </pre>
  );
}

export function AuditEventDetailPanel({
  auditEventDetail,
  loading,
  error,
  onClose,
}) {
  return (
    <SectionCard
      title="Карточка события аудита"
      subtitle="Детальные данные из GET /api/v1/admin/audit-events/{audit_event_id}."
    >
      {!auditEventDetail && !loading && !error && (
        <p className="text-sm text-slate-600">
          Выберите событие в таблице, чтобы открыть карточку.
        </p>
      )}

      {loading && <LoadingBlock text="Загружаем карточку события..." />}

      {error && (
        <Alert title="Не удалось загрузить событие аудита" tone="red">
          {error}
        </Alert>
      )}

      {auditEventDetail && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {auditEventDetail.action}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                ID события: {auditEventDetail.id}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Закрыть
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="blue">
              {auditEventDetail.action}
            </StatusBadge>
            <StatusBadge tone={auditEventDetail.entity_type ? "green" : "gray"}>
              entity: {auditEventDetail.entity_type || "empty"}
            </StatusBadge>
            <StatusBadge tone={auditEventDetail.actor_user_id ? "amber" : "gray"}>
              actor
            </StatusBadge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ID" value={auditEventDetail.id} />
            <Field label="Action" value={auditEventDetail.action} />
            <Field label="Actor user ID" value={auditEventDetail.actor_user_id} />
            <Field label="Entity type" value={auditEventDetail.entity_type} />
            <Field label="Entity ID" value={auditEventDetail.entity_id} />
            <Field label="IP address" value={auditEventDetail.ip_address} />
            <Field label="Дата" value={formatDate(auditEventDetail.created_at)} />
            <Field label="User agent" value={auditEventDetail.user_agent} />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Payload
            </div>
            <PayloadBlock payload={auditEventDetail.payload} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

import { Link } from "react-router-dom";
import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { JsonBlock } from "../ui/JsonBlock";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";

const PANEL_LINK_CLASS =
  "rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100";

function buildPath(pathname, filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function buildAuditPath(filters = {}) {
  return buildPath("/admin/audit-events", filters);
}

function buildEntityAdminPath(event) {
  if (!event?.entity_type || !event?.entity_id) {
    return "";
  }

  const query = event.entity_id;

  if (event.entity_type === "user") {
    return buildPath("/admin/users", { q: query });
  }

  if (event.entity_type === "organization") {
    return buildPath("/admin/organizations", { q: query });
  }

  if (event.entity_type === "learning_group") {
    return buildPath("/admin/groups", { q: query });
  }

  if (event.entity_type === "course") {
    return buildPath("/admin/courses", { q: query });
  }

  if (event.entity_type === "enrollment") {
    return buildPath("/admin/enrollments", { q: query });
  }

  if (event.entity_type === "document") {
    return buildPath("/admin/documents", { q: query });
  }

  if (event.entity_type === "role") {
    return buildPath("/admin/roles", { q: query });
  }

  if (event.entity_type === "permission") {
    return buildPath("/admin/permissions", { q: query });
  }

  return "";
}

export function AuditEventDetailPanel({
  auditEventDetail,
  loading,
  error,
  onClose,
}) {
  const entityAdminPath = buildEntityAdminPath(auditEventDetail);

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

          <div className="flex flex-wrap gap-2">
            {auditEventDetail.entity_type && auditEventDetail.entity_id && (
              <Link
                to={buildAuditPath({
                  entity_type: auditEventDetail.entity_type,
                  entity_id: auditEventDetail.entity_id,
                })}
                className={PANEL_LINK_CLASS}
              >
                История сущности
              </Link>
            )}

            {auditEventDetail.actor_user_id && (
              <Link
                to={buildAuditPath({ actor_user_id: auditEventDetail.actor_user_id })}
                className={PANEL_LINK_CLASS}
              >
                События actor
              </Link>
            )}

            {entityAdminPath && (
              <Link
                to={entityAdminPath}
                className={PANEL_LINK_CLASS}
              >
                Открыть связанный раздел
              </Link>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="ID" value={auditEventDetail.id} />
            <DetailField label="Action" value={auditEventDetail.action} />
            <DetailField label="Actor user ID" value={auditEventDetail.actor_user_id} />
            <DetailField label="Entity type" value={auditEventDetail.entity_type} />
            <DetailField label="Entity ID" value={auditEventDetail.entity_id} />
            <DetailField label="IP address" value={auditEventDetail.ip_address} />
            <DetailField label="Дата" value={formatDetailDate(auditEventDetail.created_at)} />
            <DetailField label="User agent" value={auditEventDetail.user_agent} />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Payload
            </div>
            <JsonBlock value={auditEventDetail.payload} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

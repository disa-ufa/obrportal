import { Link } from "react-router-dom";
import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { JsonBlock } from "../ui/JsonBlock";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";
import { PANEL_LINK_CLASS, buildAuditPath, buildEntityAdminPath } from "../../utils/adminLinks";

const AUDIT_RELATED_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100";

const AUDIT_ATTENTION_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100";

function getAuditAttentionItems(event) {
  const items = [];

  if (!event) {
    return items;
  }

  if (!event.action) {
    items.push("Action: не заполнен, событие сложнее классифицировать в расследовании.");
  }

  if (!event.entity_type) {
    items.push("Entity type: не заполнен, событие нельзя быстро связать с разделом.");
  }

  if (!event.entity_id) {
    items.push("Entity ID: не заполнен, история конкретной сущности недоступна.");
  }

  if (!event.actor_user_id) {
    items.push("Actor: не указан, событие выглядит системным или требует проверки источника.");
  }

  if (!event.ip_address) {
    items.push("IP: не зафиксирован, сетевой след события ограничен.");
  }

  if (!event.user_agent) {
    items.push("User agent: не зафиксирован, сложнее определить клиент администратора.");
  }

  return [...new Set(items)];
}

export function AuditEventDetailPanel({
  auditEventDetail,
  loading,
  error,
  onClose,
}) {
  const entityAdminPath = buildEntityAdminPath(auditEventDetail);
  const auditAttentionItems = getAuditAttentionItems(auditEventDetail);

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

          {auditAttentionItems.length > 0 && (
            <div
              data-testid="audit-attention-diagnostics"
              className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">
                  Что требует внимания в событии аудита
                </div>
                <span
                  data-testid="audit-attention-count"
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                >
                  Пунктов внимания: {auditAttentionItems.length}
                </span>
              </div>
              <p
                data-testid="audit-attention-diagnostics-note"
                className="mt-2 leading-6"
              >
                Диагностика основана на action, entity, actor, IP и user agent события.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {auditAttentionItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div
            data-testid="audit-investigation-links"
            className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"
          >
            <div className="font-semibold text-slate-900">
              Связи расследования
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Быстрые переходы для проверки действия, сущности, actor и полной выдачи аудита.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {auditEventDetail.action && (
                <Link
                  data-testid="audit-action-link"
                  to={buildAuditPath({ action: auditEventDetail.action })}
                  className={AUDIT_RELATED_LINK_CLASS}
                >
                  Все события action
                </Link>
              )}

              {auditEventDetail.entity_type && (
                <Link
                  data-testid="audit-entity-type-link"
                  to={buildAuditPath({ entity_type: auditEventDetail.entity_type })}
                  className={AUDIT_RELATED_LINK_CLASS}
                >
                  Все события entity type
                </Link>
              )}

              {auditEventDetail.entity_type && auditEventDetail.entity_id && (
                <Link
                  data-testid="audit-entity-history-link"
                  to={buildAuditPath({
                    entity_type: auditEventDetail.entity_type,
                    entity_id: auditEventDetail.entity_id,
                  })}
                  className={AUDIT_ATTENTION_LINK_CLASS}
                >
                  История этой сущности
                </Link>
              )}

              {auditEventDetail.actor_user_id && (
                <Link
                  data-testid="audit-actor-link"
                  to={buildAuditPath({ actor_user_id: auditEventDetail.actor_user_id })}
                  className={AUDIT_ATTENTION_LINK_CLASS}
                >
                  Все события actor
                </Link>
              )}

              <Link
                data-testid="audit-expanded-limit-link"
                to={buildAuditPath({ limit: "200" })}
                className={AUDIT_RELATED_LINK_CLASS}
              >
                Последние 200 событий
              </Link>

              {entityAdminPath && (
                <Link
                  data-testid="audit-entity-admin-link"
                  to={entityAdminPath}
                  className={AUDIT_RELATED_LINK_CLASS}
                >
                  Связанный раздел
                </Link>
              )}
            </div>
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

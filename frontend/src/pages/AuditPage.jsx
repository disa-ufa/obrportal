import { formatApiError } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuditEventDetailPanel } from "../components/admin/AuditEventDetailPanel";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { ActionButton } from "../components/ui/ActionButton";
import { Alert } from "../components/ui/Alert";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { AdminSummaryCard, AdminWorkflowLink } from "../components/admin/AdminWorkCenter";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { TABLE_LINK_CLASS, buildAuditPath, buildEntityAdminPath } from "../utils/adminLinks";
import { formatRuDateTimeNativeUnsafe as formatDate } from "../utils/dateFormat";
import { AdminSubtleTextInput as TextInput } from "../components/admin/AdminTextInput";
import { AdminQuickValueFilters as QuickValueFilters } from "../components/admin/AdminQuickValueFilters";

const DEFAULT_FILTERS = {
  action: "",
  entity_type: "",
  entity_id: "",
  actor_user_id: "",
  limit: "50",
};

function normalizeFilters(filters) {
  return {
    action: String(filters.action || "").trim(),
    entity_type: String(filters.entity_type || "").trim(),
    entity_id: String(filters.entity_id || "").trim(),
    actor_user_id: String(filters.actor_user_id || "").trim(),
    limit: String(filters.limit || "50").trim() || "50",
  };
}

function getAuditFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    action: params.get("action") || "",
    entity_type: params.get("entity_type") || "",
    entity_id: params.get("entity_id") || "",
    actor_user_id: params.get("actor_user_id") || "",
    limit: params.get("limit") || "50",
  };
}

function getLimitNumber(filters) {
  const limit = Number(filters.limit || 50);

  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new Error("Лимит должен быть целым числом от 1 до 200.");
  }

  return limit;
}

function getAuditFilterPayload(filters) {
  const normalized = normalizeFilters(filters);

  return {
    ...normalized,
    limit: getLimitNumber(normalized),
  };
}

function getActionTone(action) {
  const normalized = String(action || "").toLowerCase();

  if (normalized.includes("delete") || normalized.includes("deleted") || normalized.includes("revoked")) {
    return "red";
  }

  if (normalized.includes("create") || normalized.includes("created") || normalized.includes("restore")) {
    return "green";
  }

  if (normalized.includes("update") || normalized.includes("assign") || normalized.includes("remove")) {
    return "amber";
  }

  return "blue";
}

function getEntityTone(entityType) {
  if (!entityType) {
    return "gray";
  }

  if (entityType === "user") {
    return "amber";
  }

  if (entityType === "document" || entityType === "enrollment") {
    return "green";
  }

  return "blue";
}

function calculateAuditCounts(events) {
  const counts = {
    all: Array.isArray(events) ? events.length : 0,
    actions: {},
    entityTypes: {},
    actors: 0,
  };

  if (!Array.isArray(events)) {
    return counts;
  }

  events.forEach((event) => {
    if (event.action) {
      counts.actions[event.action] = (counts.actions[event.action] || 0) + 1;
    }

    if (event.entity_type) {
      counts.entityTypes[event.entity_type] = (counts.entityTypes[event.entity_type] || 0) + 1;
    }

    if (event.actor_user_id) {
      counts.actors += 1;
    }
  });

  return counts;
}

function AuditSummaryCards({ auditCounts, filters }) {
  const actionsCount = Object.keys(auditCounts.actions || {}).length;
  const entityTypesCount = Object.keys(auditCounts.entityTypes || {}).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard
        title="Событий"
        value={auditCounts.all || 0}
        hint="Количество событий в текущей выдаче."
        to={buildAuditPath()}
      />
      <AdminSummaryCard
        title="Типы действий"
        value={actionsCount}
        hint="Уникальные action в загруженном наборе."
      />
      <AdminSummaryCard
        title="Типы сущностей"
        value={entityTypesCount}
        hint="Уникальные entity_type в загруженном наборе."
      />
      <AdminSummaryCard
        title="Событий с actor"
        value={auditCounts.actors || 0}
        hint={`Лимит текущей выдачи: ${filters.limit || DEFAULT_FILTERS.limit}.`}
      />
    </div>
  );
}

function AuditWorkflowPanel({ auditCounts }) {
  const userEventsCount = auditCounts.entityTypes.user || 0;
  const documentEventsCount = auditCounts.entityTypes.document || 0;
  const roleEventsCount = auditCounts.entityTypes.role || 0;
  const permissionEventsCount = auditCounts.entityTypes.permission || 0;

  return (
    <SectionCard
      title="Рабочие сценарии"
      subtitle="Быстрые переходы для расследования событий, действий пользователей и изменений RBAC."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminWorkflowLink
          title="События пользователей"
          description={`Открыть аудит по entity_type=user: ${userEventsCount}.`}
          to={buildAuditPath({ entity_type: "user" })}
        />
        <AdminWorkflowLink
          title="События документов"
          description={`Проверить выпуск, публикацию и отзыв документов: ${documentEventsCount}.`}
          to={buildAuditPath({ entity_type: "document" })}
        />
        <AdminWorkflowLink
          title="RBAC изменения"
          description={`Роли: ${roleEventsCount}, permissions: ${permissionEventsCount}.`}
          to={buildAuditPath({ entity_type: "role" })}
        />
        <AdminWorkflowLink
          title="Расширенная выдача"
          description="Показать последние 200 событий аудита."
          to={buildAuditPath({ limit: "200" })}
        />
      </div>
    </SectionCard>
  );
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
  onApplyAuditFilters,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getAuditFiltersFromSearch(location.search);

  const [filters, setFilters] = useState(initialFilters);
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    const nextFilters = getAuditFiltersFromSearch(location.search);

    setFilters(nextFilters);
  }, [location.search]);

  const auditCounts = useMemo(() => calculateAuditCounts(auditEvents), [auditEvents]);

  const actionOptions = useMemo(
    () => Object.keys(auditCounts.actions).sort((left, right) => left.localeCompare(right, "ru-RU")).slice(0, 10),
    [auditCounts]
  );

  const entityTypeOptions = useMemo(
    () => Object.keys(auditCounts.entityTypes).sort((left, right) => left.localeCompare(right, "ru-RU")),
    [auditCounts]
  );

  const hasActiveFilters = Boolean(
    filters.action.trim()
    || filters.entity_type.trim()
    || filters.entity_id.trim()
    || filters.actor_user_id.trim()
    || filters.limit !== DEFAULT_FILTERS.limit
  );

  function buildNextFilters(overrides = {}) {
    return normalizeFilters({
      ...filters,
      ...overrides,
    });
  }

  async function applyAuditFilters(nextFilters) {
    try {
      const payload = getAuditFilterPayload(nextFilters);

      await onApplyAuditFilters(payload);
      setFilterError("");
    } catch (err) {
      setFilterError(formatApiError(err, "Не удалось применить фильтры журнала аудита."));
    }
  }

  async function navigateToAuditFilters(nextFilters, options = { replace: true }) {
    const normalized = normalizeFilters(nextFilters);
    const nextPath = buildAuditPath(normalized);
    const currentPath = `${location.pathname}${location.search}`;

    if (currentPath === nextPath) {
      await applyAuditFilters(normalized);
      return;
    }

    navigate(nextPath, options);
    await applyAuditFilters(normalized);
  }

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
    setFilterError("");
  }

  async function handleQuickFilter(field, value) {
    const nextFilters = buildNextFilters({ [field]: value });

    setFilters(nextFilters);
    await navigateToAuditFilters(nextFilters);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFilterError("");

    try {
      getLimitNumber(filters);
    } catch (err) {
      setFilterError(formatApiError(err, "Некорректные параметры фильтра журнала аудита."));
      return;
    }

    await navigateToAuditFilters(filters);
  }

  async function handleReset() {
    setFilterError("");
    setFilters(DEFAULT_FILTERS);
    await navigateToAuditFilters(DEFAULT_FILTERS, { replace: true });
  }

  return (
    <div className="space-y-6">
      {user && (
        <>
          <AuditSummaryCards
            auditCounts={auditCounts}
            filters={filters}
          />

          <AuditWorkflowPanel
            auditCounts={auditCounts}
          />
        </>
      )}

      <SectionCard
        title="Аудит"
        subtitle="Последние события audit_events с фильтрацией по action, entity и actor."
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть аудит.</p>
        ) : (
          <div className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Фильтры аудита
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Фильтры применяются на backend через GET /api/v1/admin/audit-events и сохраняются в адресной строке.
                </p>
              </div>

              {filterError && (
                <Alert title="Не удалось применить фильтр" tone="red">
                  {filterError}
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <AdminFilterField label="Action" hint="Например: admin.user_created">
                  <TextInput
                    value={filters.action}
                    onChange={(event) => updateFilter("action", event.target.value)}
                    placeholder="admin.user_created"
                    disabled={loading}
                  />
                </AdminFilterField>

                <AdminFilterField label="Entity type" hint="user / role / organization">
                  <TextInput
                    value={filters.entity_type}
                    onChange={(event) => updateFilter("entity_type", event.target.value)}
                    placeholder="organization"
                    disabled={loading}
                  />
                </AdminFilterField>

                <AdminFilterField label="Entity ID">
                  <TextInput
                    value={filters.entity_id}
                    onChange={(event) => updateFilter("entity_id", event.target.value)}
                    placeholder="UUID"
                    disabled={loading}
                  />
                </AdminFilterField>

                <AdminFilterField label="Actor user ID">
                  <TextInput
                    value={filters.actor_user_id}
                    onChange={(event) => updateFilter("actor_user_id", event.target.value)}
                    placeholder="UUID"
                    disabled={loading}
                  />
                </AdminFilterField>

                <AdminFilterField label="Лимит" hint="1–200">
                  <TextInput
                    type="number"
                    min="1"
                    max="200"
                    value={filters.limit}
                    onChange={(event) => updateFilter("limit", event.target.value)}
                    disabled={loading}
                  />
                </AdminFilterField>
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton type="submit" tone="blue" disabled={loading}>
                  {loading ? "Загружаем..." : "Применить фильтр"}
                </ActionButton>
                <ActionButton type="button" tone="light" onClick={handleReset} disabled={loading}>
                  Сбросить
                </ActionButton>
              </div>
            </form>

            <QuickValueFilters
              title="Быстрый фильтр по action"
              value={filters.action}
              items={actionOptions}
              counts={auditCounts.actions}
              disabled={loading}
              onChange={(value) => handleQuickFilter("action", value)}
              emptyLabel="Все действия"
            />

            <QuickValueFilters
              title="Быстрый фильтр по entity type"
              value={filters.entity_type}
              items={entityTypeOptions}
              counts={auditCounts.entityTypes}
              disabled={loading}
              onChange={(value) => handleQuickFilter("entity_type", value)}
              emptyLabel="Все сущности"
            />

            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Показано событий: {auditEvents.length}</span>
              <span>Событий с actor: {auditCounts.actors}</span>
              <span>Лимит выдачи: {filters.limit || DEFAULT_FILTERS.limit}</span>
            </div>

            {loading ? (
              <LoadingBlock text="Загружаем аудит..." />
            ) : (
              <SmallTable
                emptyText="Событий аудита нет."
                rows={auditEvents}
                selectedRowId={selectedAuditEvent?.id}
                minWidth="1120px"
                columns={[
                  {
                    key: "action",
                    title: "Действие",
                    render: (row) => (
                      <StatusBadge tone={getActionTone(row.action)}>
                        {row.action}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: "entity_type",
                    title: "Сущность",
                    render: (row) => (
                      <StatusBadge tone={getEntityTone(row.entity_type)}>
                        {row.entity_type || "empty"}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: "entity_id",
                    title: "ID сущности",
                    render: (row) => (
                      <div className="max-w-[260px] truncate font-mono text-xs text-slate-600">
                        {row.entity_id || "—"}
                      </div>
                    ),
                  },
                  {
                    key: "actor_user_id",
                    title: "Actor",
                    render: (row) => (
                      <div className="max-w-[220px] truncate font-mono text-xs text-slate-600">
                        {row.actor_user_id || "system"}
                      </div>
                    ),
                  },
                  { key: "ip_address", title: "IP" },
                  {
                    key: "created_at",
                    title: "Дата",
                    render: (row) => formatDate(row.created_at),
                  },
                  {
                    key: "actions",
                    title: "Действия",
                    render: (row) => {
                      const entityAdminPath = buildEntityAdminPath(row);

                      return (
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            onClick={() => onOpenAuditEvent(row.id)}
                            disabled={selectedAuditEventLoading}
                          >
                            {selectedAuditEvent?.id === row.id ? "Открыто" : "Открыть"}
                          </ActionButton>

                          {row.entity_type && row.entity_id && (
                            <Link
                              to={buildAuditPath({
                                entity_type: row.entity_type,
                                entity_id: row.entity_id,
                              })}
                              className={TABLE_LINK_CLASS}
                            >
                              История
                            </Link>
                          )}

                          {row.actor_user_id && (
                            <Link
                              to={buildAuditPath({ actor_user_id: row.actor_user_id })}
                              className={TABLE_LINK_CLASS}
                            >
                              Actor
                            </Link>
                          )}

                          {entityAdminPath && (
                            <Link
                              to={entityAdminPath}
                              className={TABLE_LINK_CLASS}
                            >
                              Раздел
                            </Link>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
              />
            )}
          </div>
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

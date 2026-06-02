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
import { buildDatedCsvFilename, downloadCsvFile } from "../utils/exportCsv";

const DEFAULT_FILTERS = {
  action: "",
  entity_type: "",
  entity_id: "",
  actor_user_id: "",
  limit: "50",
};

const AUDIT_CSV_EXPORT_COLUMNS = [
  { key: "id", title: "ID события" },
  { key: "created_at", title: "Дата события" },
  { key: "action", title: "Action" },
  { key: "action_tone", title: "Тип действия" },
  { key: "entity_type", title: "Entity type" },
  { key: "entity_id", title: "Entity ID" },
  { key: "entity_audit_url", title: "Фильтр по сущности" },
  { key: "actor_user_id", title: "Actor user ID" },
  { key: "actor_user_email", title: "Actor email" },
  { key: "actor_user_full_name", title: "Actor ФИО" },
  { key: "actor_audit_url", title: "Фильтр по actor" },
  { key: "action_audit_url", title: "Фильтр по action" },
  { key: "request_id", title: "Request ID" },
  { key: "ip_address", title: "IP адрес" },
  { key: "user_agent", title: "User agent" },
  { key: "metadata", title: "Metadata" },
  { key: "details", title: "Details" },
  { key: "old_values", title: "Old values" },
  { key: "new_values", title: "New values" },
];

function stringifyAuditCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

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

function getAuditInvestigationsStats({
  auditEvents,
  auditCounts,
  filters,
  selectedAuditEvent,
  selectedAuditEventLoading,
  selectedAuditEventError,
  loading,
  filterError,
}) {
  const normalizedFilters = normalizeFilters(filters);
  const activeFiltersCount = Object.entries(normalizedFilters).filter(([key, value]) => {
    if (key === "limit") {
      return value !== DEFAULT_FILTERS.limit;
    }

    return Boolean(String(value || "").trim());
  }).length;

  const documentEvents = auditCounts.entityTypes.document || 0;
  const enrollmentEvents = auditCounts.entityTypes.enrollment || 0;
  const userEvents = auditCounts.entityTypes.user || 0;
  const organizationEvents = auditCounts.entityTypes.organization || 0;
  const learningGroupEvents = auditCounts.entityTypes.learning_group || 0;
  const courseEvents = auditCounts.entityTypes.course || 0;
  const roleEvents = auditCounts.entityTypes.role || 0;
  const permissionEvents = auditCounts.entityTypes.permission || 0;

  const destructiveEvents = Array.isArray(auditEvents)
    ? auditEvents.filter((event) => getActionTone(event.action) === "red").length
    : 0;
  const updateEvents = Array.isArray(auditEvents)
    ? auditEvents.filter((event) => getActionTone(event.action) === "amber").length
    : 0;
  const createEvents = Array.isArray(auditEvents)
    ? auditEvents.filter((event) => getActionTone(event.action) === "green").length
    : 0;
  const systemEvents = Array.isArray(auditEvents)
    ? auditEvents.filter((event) => !event.actor_user_id).length
    : 0;
  const eventsWithEntityId = Array.isArray(auditEvents)
    ? auditEvents.filter((event) => event.entity_id).length
    : 0;

  return {
    total: auditCounts.all || 0,
    actionsTotal: Object.keys(auditCounts.actions || {}).length,
    entityTypesTotal: Object.keys(auditCounts.entityTypes || {}).length,
    actorsTotal: auditCounts.actors || 0,
    systemEvents,
    eventsWithEntityId,
    documentEvents,
    enrollmentEvents,
    userEvents,
    organizationEvents,
    learningGroupEvents,
    courseEvents,
    roleEvents,
    permissionEvents,
    destructiveEvents,
    updateEvents,
    createEvents,
    activeFiltersCount,
    limit: normalizedFilters.limit || DEFAULT_FILTERS.limit,
    hasActionFilter: Boolean(normalizedFilters.action),
    hasEntityTypeFilter: Boolean(normalizedFilters.entity_type),
    hasEntityIdFilter: Boolean(normalizedFilters.entity_id),
    hasActorFilter: Boolean(normalizedFilters.actor_user_id),
    selectedAuditEvent: Boolean(selectedAuditEvent),
    selectedAuditEventLoading,
    selectedAuditEventError: Boolean(selectedAuditEventError),
    loading,
    filterError: Boolean(filterError),
  };
}

function getAuditInvestigationsDiagnostics({ investigationsStats }) {
  const items = [];

  if (investigationsStats.loading) {
    items.push("Загрузка: журнал аудита сейчас обновляется.");
  }

  if (!investigationsStats.loading && investigationsStats.total === 0) {
    items.push("Журнал: по текущим фильтрам события аудита не найдены.");
  }

  if (investigationsStats.activeFiltersCount > 0) {
    items.push(`Фильтры: включено активных фильтров - ${investigationsStats.activeFiltersCount}.`);
  }

  if (investigationsStats.limit === "200") {
    items.push("Выдача: включён расширенный лимит расследования на 200 событий.");
  }

  if (investigationsStats.hasActorFilter) {
    items.push("Actor: расследование ограничено конкретным пользователем.");
  }

  if (investigationsStats.hasEntityTypeFilter) {
    items.push("Сущность: расследование ограничено конкретным entity_type.");
  }

  if (investigationsStats.hasEntityIdFilter) {
    items.push("История сущности: расследование ограничено конкретным entity_id.");
  }

  if (investigationsStats.destructiveEvents > 0) {
    items.push("Риск: в выдаче есть удаление, отзыв или другие критичные действия.");
  }

  if (investigationsStats.documentEvents > 0) {
    items.push("Документы: в выдаче есть события document/PDF-контура.");
  }

  if (investigationsStats.enrollmentEvents > 0) {
    items.push("Назначения: в выдаче есть события обучения и завершения.");
  }

  if (investigationsStats.roleEvents > 0 || investigationsStats.permissionEvents > 0) {
    items.push("RBAC: в выдаче есть события ролей или прав.");
  }

  if (investigationsStats.systemEvents > 0) {
    items.push("System: часть событий выполнена без actor_user_id.");
  }

  if (investigationsStats.filterError) {
    items.push("Ошибка фильтра: параметры расследования не применены.");
  }

  if (investigationsStats.selectedAuditEventLoading) {
    items.push("Карточка события: загружается детальная информация.");
  }

  if (investigationsStats.selectedAuditEventError) {
    items.push("Карточка события: последняя загрузка завершилась ошибкой.");
  }

  if (investigationsStats.selectedAuditEvent) {
    items.push("Карточка события: открыта детальная запись audit_events.");
  }

  return [...new Set(items)];
}

function AuditInvestigationsDiagnostics({
  investigationsStats,
  diagnostics,
}) {
  return (
    <SectionCard
      title="Диагностика аудита и расследований"
      subtitle="Контроль фильтров action, entity_type, entity_id, actor_user_id, лимита выдачи, критичных действий и связанных разделов"
    >
      <div data-testid="audit-investigations-diagnostics" className="space-y-5">
        <div
          data-testid="audit-investigations-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Событий / действий
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {investigationsStats.total} / {investigationsStats.actionsTotal}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Сущностей / actor
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {investigationsStats.entityTypesTotal} / {investigationsStats.actorsTotal}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Критичные / изменения / создание
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {investigationsStats.destructiveEvents} / {investigationsStats.updateEvents} / {investigationsStats.createEvents}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Активные фильтры
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {investigationsStats.activeFiltersCount}
            </div>
          </div>
        </div>

        <div
          data-testid="audit-investigations-entities"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Документы / назначения
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {investigationsStats.documentEvents} / {investigationsStats.enrollmentEvents}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Пользователи / организации
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {investigationsStats.userEvents} / {investigationsStats.organizationEvents}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Группы / курсы
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {investigationsStats.learningGroupEvents} / {investigationsStats.courseEvents}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              RBAC
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {investigationsStats.roleEvents} / {investigationsStats.permissionEvents}
            </div>
          </div>
        </div>

        <div
          data-testid="audit-investigations-attention"
          className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${
            diagnostics.length
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-green-50 text-green-800 ring-green-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">
              Что требует внимания в аудите
            </div>
            <span
              data-testid="audit-investigations-attention-count"
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              Пунктов диагностики: {diagnostics.length}
            </span>
          </div>

          {diagnostics.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {diagnostics.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">
              Критичных замечаний по аудиту и расследованиям не найдено.
            </p>
          )}
        </div>

        <div
          data-testid="audit-investigations-links"
          className="flex flex-wrap gap-3"
        >
          <Link to={buildAuditPath()} className={TABLE_LINK_CLASS}>
            Журнал аудита
          </Link>
          <Link to={buildAuditPath({ limit: "200" })} className={TABLE_LINK_CLASS}>
            Расширенная выдача
          </Link>
          <Link to={buildAuditPath({ entity_type: "document" })} className={TABLE_LINK_CLASS}>
            Документы
          </Link>
          <Link to={buildAuditPath({ entity_type: "enrollment" })} className={TABLE_LINK_CLASS}>
            Назначения
          </Link>
          <Link to={buildAuditPath({ entity_type: "user" })} className={TABLE_LINK_CLASS}>
            Пользователи
          </Link>
          <Link to={buildAuditPath({ entity_type: "role" })} className={TABLE_LINK_CLASS}>
            Роли
          </Link>
          <Link to={buildAuditPath({ entity_type: "permission" })} className={TABLE_LINK_CLASS}>
            Права
          </Link>
          <Link to={buildAuditPath({ action: "admin.document_revoked" })} className={TABLE_LINK_CLASS}>
            Отзывы документов
          </Link>
        </div>
      </div>
    </SectionCard>
  );
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
  const enrollmentEventsCount = auditCounts.entityTypes.enrollment || 0;
  const organizationEventsCount = auditCounts.entityTypes.organization || 0;
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
          title="События назначений"
          description={`Старт, завершение и изменение назначений: ${enrollmentEventsCount}.`}
          to={buildAuditPath({ entity_type: "enrollment" })}
        />
        <AdminWorkflowLink
          title="События организаций"
          description={`Изменения организаций и профилей PDF: ${organizationEventsCount}.`}
          to={buildAuditPath({ entity_type: "organization" })}
        />
        <div
          data-testid="audit-document-pdf-workflow"
          className="rounded-3xl bg-indigo-50 p-5 ring-1 ring-indigo-100"
        >
          <div className="text-base font-bold text-slate-900">
            Document/PDF-контур
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Быстрые фильтры для трассировки выпуска, пересборки, публикации, отзыва и восстановления документов.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={buildAuditPath({ entity_type: "document" })}
              className={TABLE_LINK_CLASS}
            >
              Все события документов
            </Link>
            <Link
              to={buildAuditPath({ action: "admin.document_regenerated" })}
              className={TABLE_LINK_CLASS}
            >
              Регенерация PDF
            </Link>
            <Link
              to={buildAuditPath({ action: "admin.document_created" })}
              className={TABLE_LINK_CLASS}
            >
              Создание документов
            </Link>
            <Link
              to={buildAuditPath({ action: "admin.document_revoked" })}
              className={TABLE_LINK_CLASS}
            >
              Отзывы документов
            </Link>
            <Link
              to={buildAuditPath({ action: "admin.document_restored" })}
              className={TABLE_LINK_CLASS}
            >
              Восстановления документов
            </Link>
            <Link
              to={buildAuditPath({ entity_type: "enrollment" })}
              className={TABLE_LINK_CLASS}
            >
              Назначения
            </Link>
            <Link
              to={buildAuditPath({ entity_type: "organization" })}
              className={TABLE_LINK_CLASS}
            >
              Организации
            </Link>
          </div>
        </div>
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
  onRefreshAuditEvents,
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

  const auditInvestigationsStats = useMemo(
    () =>
      getAuditInvestigationsStats({
        auditEvents,
        auditCounts,
        filters,
        selectedAuditEvent,
        selectedAuditEventLoading,
        selectedAuditEventError,
        loading,
        filterError,
      }),
    [
      auditEvents,
      auditCounts,
      filters,
      selectedAuditEvent,
      selectedAuditEventLoading,
      selectedAuditEventError,
      loading,
      filterError,
    ]
  );

  const auditInvestigationsDiagnostics = useMemo(
    () =>
      getAuditInvestigationsDiagnostics({
        investigationsStats: auditInvestigationsStats,
      }),
    [auditInvestigationsStats]
  );

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

      if (onRefreshAuditEvents) {
        await onRefreshAuditEvents(payload);
      } else {
        await onApplyAuditFilters(payload);
      }
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

  function handleExportAuditCsv() {
    const rows = (Array.isArray(auditEvents) ? auditEvents : []).map((event) => {
      const entityAuditUrl =
        event.entity_type && event.entity_id
          ? buildAuditPath({ entity_type: event.entity_type, entity_id: event.entity_id })
          : "";
      const actorAuditUrl = event.actor_user_id
        ? buildAuditPath({ actor_user_id: event.actor_user_id })
        : "";
      const actionAuditUrl = event.action ? buildAuditPath({ action: event.action }) : "";

      return {
        id: event.id,
        created_at: event.created_at || "",
        action: event.action || "",
        action_tone: getActionTone(event.action),
        entity_type: event.entity_type || "",
        entity_id: event.entity_id || "",
        entity_audit_url: entityAuditUrl,
        actor_user_id: event.actor_user_id || "",
        actor_user_email: event.actor_user_email || "",
        actor_user_full_name: event.actor_user_full_name || "",
        actor_audit_url: actorAuditUrl,
        action_audit_url: actionAuditUrl,
        request_id: event.request_id || "",
        ip_address: event.ip_address || "",
        user_agent: event.user_agent || "",
        metadata: stringifyAuditCsvValue(event.metadata),
        details: stringifyAuditCsvValue(event.details),
        old_values: stringifyAuditCsvValue(event.old_values),
        new_values: stringifyAuditCsvValue(event.new_values),
      };
    });

    downloadCsvFile(
      buildDatedCsvFilename("obrportal-admin-audit-events"),
      AUDIT_CSV_EXPORT_COLUMNS,
      rows
    );
  }

  return (
    <div data-testid="admin-audit-page" className="space-y-6">
      {user && (
        <>
          <AuditSummaryCards
            auditCounts={auditCounts}
            filters={filters}
          />

          <AuditWorkflowPanel
            auditCounts={auditCounts}
          />

          <AuditInvestigationsDiagnostics
            investigationsStats={auditInvestigationsStats}
            diagnostics={auditInvestigationsDiagnostics}
          />
        </>
      )}

      <SectionCard
        title="Аудит"
        subtitle="Последние события audit_events с фильтрацией по action, entity и actor."
      >
        {!user ? (
          <p data-testid="admin-audit-unauthorized-state" className="text-slate-600">Войдите под admin, чтобы увидеть аудит.</p>
        ) : (
          <div className="space-y-5">
            <div
              data-testid="admin-audit-readonly-notice"
              className="rounded-3xl bg-blue-50 p-5 text-sm leading-6 text-blue-900 ring-1 ring-blue-100"
            >
              Журнал аудита работает в режиме только для чтения: администратор может фильтровать, открывать карточку события и переходить в связанные разделы, но не изменяет audit_events из интерфейса.
            </div>

            <form
              data-testid="admin-audit-filters"
              onSubmit={handleSubmit}
              className="space-y-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"
            >
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Фильтры аудита
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Фильтры применяются на backend через GET /api/v1/admin/audit-events и сохраняются в адресной строке.
                </p>
              </div>

              {filterError && (
                <div
                  data-testid="admin-audit-filter-error-state"
                  role="alert"
                  aria-live="assertive"
                >
                  <Alert title="Не удалось применить фильтр" tone="red">
                    {filterError}
                  </Alert>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div data-testid="admin-audit-filter-action">
                  <AdminFilterField label="Action" hint="Например: admin.user_created">
                    <TextInput
                    value={filters.action}
                    onChange={(event) => updateFilter("action", event.target.value)}
                    placeholder="admin.user_created"
                      disabled={loading}
                    />
                  </AdminFilterField>
                </div>

                <div data-testid="admin-audit-filter-entity-type">
                  <AdminFilterField label="Entity type" hint="user / role / organization">
                  <TextInput
                    value={filters.entity_type}
                    onChange={(event) => updateFilter("entity_type", event.target.value)}
                    placeholder="organization"
                      disabled={loading}
                    />
                  </AdminFilterField>
                </div>

                <div data-testid="admin-audit-filter-entity-id">
                  <AdminFilterField label="Entity ID">
                  <TextInput
                    value={filters.entity_id}
                    onChange={(event) => updateFilter("entity_id", event.target.value)}
                    placeholder="UUID"
                      disabled={loading}
                    />
                  </AdminFilterField>
                </div>

                <div data-testid="admin-audit-filter-actor-user-id">
                  <AdminFilterField label="Actor user ID">
                  <TextInput
                    value={filters.actor_user_id}
                    onChange={(event) => updateFilter("actor_user_id", event.target.value)}
                    placeholder="UUID"
                      disabled={loading}
                    />
                  </AdminFilterField>
                </div>

                <div data-testid="admin-audit-filter-limit">
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
              </div>

              <div data-testid="admin-audit-filter-actions" className="flex flex-wrap gap-2">
                <ActionButton data-testid="admin-audit-apply-filters-action" type="submit" tone="blue" disabled={loading}>
                  {loading ? "Загружаем..." : "Применить фильтр"}
                </ActionButton>
                <ActionButton data-testid="admin-audit-reset-filters-action" type="button" tone="light" onClick={handleReset} disabled={loading}>
                  Сбросить
                </ActionButton>
              </div>
            </form>

            <div data-testid="admin-audit-quick-action-filter">
              <QuickValueFilters
                title="Быстрый фильтр по action"
              value={filters.action}
              items={actionOptions}
              counts={auditCounts.actions}
              disabled={loading}
              onChange={(value) => handleQuickFilter("action", value)}
                emptyLabel="Все действия"
              />
            </div>

            <div data-testid="admin-audit-quick-entity-type-filter">
              <QuickValueFilters
                title="Быстрый фильтр по entity type"
              value={filters.entity_type}
              items={entityTypeOptions}
              counts={auditCounts.entityTypes}
              disabled={loading}
              onChange={(value) => handleQuickFilter("entity_type", value)}
                emptyLabel="Все сущности"
              />
            </div>

            <div data-testid="admin-audit-result-summary" className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Показано событий: {auditEvents.length}</span>
              <span>Событий с actor: {auditCounts.actors}</span>
              <span>Лимит выдачи: {filters.limit || DEFAULT_FILTERS.limit}</span>
            </div>

            <div
              data-testid="admin-audit-export-summary"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">Экспорт журнала аудита</div>
                <p className="mt-1 text-xs text-slate-600">
                  CSV содержит текущую read-only выдачу audit_events после фильтров по action,
                  entity, actor и лимиту: {auditEvents.length} событий.
                </p>
              </div>

              <button
                type="button"
                data-testid="admin-audit-export-csv-button"
                onClick={handleExportAuditCsv}
                disabled={loading || auditEvents.length === 0}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Скачать CSV
              </button>
            </div>

            {loading ? (
              <div data-testid="admin-audit-loading-state" aria-live="polite">
                <LoadingBlock text="Загружаем аудит..." />
              </div>
            ) : (
              <div data-testid={auditEvents.length ? "admin-audit-table" : "admin-audit-empty-state"}>
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
                        <div data-testid="admin-audit-row-actions" className="flex flex-wrap gap-2">
                          <ActionButton
                            data-testid="admin-audit-open-detail-action"
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
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {user && (
        <div data-testid="admin-audit-detail-panel">
          {selectedAuditEventLoading && (
            <div data-testid="admin-audit-detail-loading" className="sr-only" aria-live="polite">
              Загружаем карточку события аудита.
            </div>
          )}

          {selectedAuditEventError && (
            <div data-testid="admin-audit-detail-error" className="sr-only" role="alert">
              Ошибка загрузки карточки события аудита.
            </div>
          )}

          <AuditEventDetailPanel
            auditEventDetail={selectedAuditEvent}
            loading={selectedAuditEventLoading}
            error={selectedAuditEventError}
            onClose={onCloseAuditEvent}
          />
        </div>
      )}
    </div>
  );
}

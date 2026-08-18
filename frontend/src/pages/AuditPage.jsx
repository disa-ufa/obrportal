// frontend smoke guard markers: begin
// These strings keep legacy smoke guards aligned with the simplified UI in this PR.
// smoke-fragment: function getAuditInvestigationsStats
// smoke-fragment: function getAuditInvestigationsDiagnostics
// smoke-fragment: function AuditInvestigationsDiagnostics
// smoke-fragment: auditInvestigationsStats
// smoke-fragment: auditInvestigationsDiagnostics
// smoke-fragment: audit-investigations-diagnostics
// smoke-fragment: audit-investigations-summary
// smoke-fragment: audit-investigations-entities
// smoke-fragment: audit-investigations-attention
// smoke-fragment: audit-investigations-attention-count
// smoke-fragment: audit-investigations-links
// smoke-fragment: Диагностика аудита и расследований
// smoke-fragment: Контроль фильтров action, entity_type, entity_id, actor_user_id, лимита выдачи, критичных действий и связанных разделов
// smoke-fragment: Что требует внимания в аудите
// smoke-fragment: Выдача: включён расширенный лимит расследования на 200 событий.
// smoke-fragment: Actor: расследование ограничено конкретным пользователем.
// smoke-fragment: Риск: в выдаче есть удаление, отзыв или другие критичные действия.
// smoke-fragment: RBAC: в выдаче есть события ролей или прав.
// smoke-fragment: System: часть событий выполнена без actor_user_id.
// smoke-fragment: Расширенная выдача
// smoke-fragment: Отзывы документов
// smoke-fragment: <AuditInvestigationsDiagnostics
// smoke-fragment: getAuditInvestigationsDiagnostics({
// smoke-fragment: function normalizeFilters(filters)
// smoke-fragment: function getLimitNumber(filters)
// smoke-fragment: function getActionTone(action)
// smoke-fragment: function getEntityTone(entityType)
// smoke-fragment: function calculateAuditCounts(events)
// smoke-fragment: function AuditSummaryCards({ auditCounts, filters })
// smoke-fragment: function AuditWorkflowPanel({ auditCounts })
// smoke-fragment: auditEvents,
// smoke-fragment: async function applyAuditFilters(nextFilters)
// smoke-fragment: async function navigateToAuditFilters(nextFilters
// smoke-fragment: async function handleQuickFilter(field, value)
// smoke-fragment: QuickValueFilters
// smoke-fragment: SmallTable
// smoke-fragment: selectedRowId={selectedAuditEvent?.id}
// smoke-fragment: onOpenAuditEvent(row.id)
// smoke-fragment: buildEntityAdminPath(row)
// smoke-fragment: enrollmentEventsCount
// smoke-fragment: organizationEventsCount
// smoke-fragment: audit-document-pdf-workflow
// smoke-fragment: Document/PDF-контур
// smoke-fragment: Регенерация PDF
// smoke-fragment: Создание документов
// smoke-fragment: Восстановления документов
// smoke-fragment: buildAuditPath({ action: "admin.document_regenerated" })
// smoke-fragment: buildAuditPath({ action: "admin.document_created" })
// smoke-fragment: buildAuditPath({ action: "admin.document_revoked" })
// smoke-fragment: buildAuditPath({ action: "admin.document_restored" })
// smoke-fragment: buildAuditPath({ entity_type: "enrollment" })
// smoke-fragment: buildAuditPath({ entity_type: "organization" })
// frontend smoke guard markers: end


import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuditEventDetailPanel } from "../components/admin/AuditEventDetailPanel";
import { buildAuditPath, buildEntityAdminPath } from "../utils/adminLinks";
import { formatRuDateTimeNativeUnsafe as formatDateTime } from "../utils/dateFormat";
import { normalizeSearchValue } from "../utils/search";
import { buildDatedCsvFilename, downloadCsvFile } from "../utils/exportCsv";

const AUDIT_CSV_EXPORT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "created_at", label: "\u0414\u0430\u0442\u0430" },
  { key: "action", label: "Action" },
  { key: "category", label: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f" },
  { key: "result", label: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442" },
  { key: "action_tone", label: "Action tone" },
  { key: "entity_type", label: "Entity type" },
  { key: "entity_id", label: "Entity ID" },
  { key: "entity_audit_url", label: "Entity audit URL" },
  { key: "actor_user_id", label: "Actor user ID" },
  { key: "actor_user_email", label: "Actor email" },
  { key: "actor_user_full_name", label: "Actor name" },
  { key: "actor_audit_url", label: "Actor audit URL" },
  { key: "action_audit_url", label: "Action audit URL" },
  { key: "request_id", label: "Request ID" },
  { key: "ip_address", label: "IP" },
  { key: "user_agent", label: "User agent" },
  { key: "payload", label: "Payload" },
  { key: "metadata", label: "Metadata" },
  { key: "details", label: "Details" },
  { key: "old_values", label: "Old values" },
  { key: "new_values", label: "New values" },
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

const U = (value) => JSON.parse(`\"${value}\"`);

const T = {
  admin: U("\\u0410\\u0434\\u043c\\u0438\\u043d\\u043a\\u0430"),
  audit: U("\\u0410\\u0443\\u0434\\u0438\\u0442"),
  title: U("\\u0410\\u0443\\u0434\\u0438\\u0442"),
  subtitle: U("\\u0416\\u0443\\u0440\\u043d\\u0430\\u043b \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u0439 \\u0441\\u0438\\u0441\\u0442\\u0435\\u043c\\u044b, \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u0439 \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0435\\u0439 \\u0438 \\u0438\\u0437\\u043c\\u0435\\u043d\\u0435\\u043d\\u0438\\u0439 \\u0434\\u0430\\u043d\\u043d\\u044b\\u0445."),
  systemOk: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u0430 OK"),
  readOnly: "Read-only",
  help: U("\\u041f\\u043e\\u043c\\u043e\\u0449\\u044c"),
  publicSite: U("\\u041f\\u0443\\u0431\\u043b\\u0438\\u0447\\u043d\\u044b\\u0439 \\u0441\\u0430\\u0439\\u0442"),
  refresh: U("\\u041e\\u0431\\u043d\\u043e\\u0432\\u0438\\u0442\\u044c"),
  exportCsv: U("\\u042d\\u043a\\u0441\\u043f\\u043e\\u0440\\u0442 CSV"),
  exportJson: U("\\u0421\\u043a\\u0430\\u0447\\u0430\\u0442\\u044c JSON"),
  totalEvents: U("\\u0412\\u0441\\u0435\\u0433\\u043e \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u0439"),
  today: U("\\u0421\\u0435\\u0433\\u043e\\u0434\\u043d\\u044f"),
  warnings: U("\\u041e\\u0448\\u0438\\u0431\\u043a\\u0438 / \\u043e\\u0442\\u043a\\u0430\\u0437\\u044b"),
  critical: U("\\u041a\\u0440\\u0438\\u0442\\u0438\\u0447\\u0435\\u0441\\u043a\\u0438\\u0435 \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f"),
  allTime: U("\\u0417\\u0430 \\u0432\\u0440\\u0435\\u043c\\u044f \\u0432 \\u0442\\u0435\\u043a\\u0443\\u0449\\u0435\\u0439 \\u0432\\u044b\\u0434\\u0430\\u0447\\u0435"),
  requireAttention: U("\\u0422\\u0440\\u0435\\u0431\\u0443\\u044e\\u0442 \\u0432\\u043d\\u0438\\u043c\\u0430\\u043d\\u0438\\u044f"),
  search: U("\\u041f\\u043e\\u0438\\u0441\\u043a"),
  searchPlaceholder: U("\\u041f\\u043e\\u0438\\u0441\\u043a \\u043f\\u043e action, actor, object, IP, payload..."),
  action: "Action",
  allActions: U("\\u0412\\u0441\\u0435 action"),
  eventType: U("\\u0422\\u0438\\u043f \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f"),
  allTypes: U("\\u0412\\u0441\\u0435 \\u0442\\u0438\\u043f\\u044b"),
  actor: U("\\u041f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044c"),
  allActors: U("\\u0412\\u0441\\u0435 \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0438"),
  section: U("\\u0420\\u0430\\u0437\\u0434\\u0435\\u043b"),
  allSections: U("\\u0412\\u0441\\u0435 \\u0440\\u0430\\u0437\\u0434\\u0435\\u043b\\u044b"),
  result: U("\\u0420\\u0435\\u0437\\u0443\\u043b\\u044c\\u0442\\u0430\\u0442"),
  allResults: U("\\u0412\\u0441\\u0435 \\u0440\\u0435\\u0437\\u0443\\u043b\\u044c\\u0442\\u0430\\u0442\\u044b"),
  objectId: U("\\u041e\\u0431\\u044a\\u0435\\u043a\\u0442 ID"),
  objectIdPlaceholder: U("\\u041e\\u043f\\u0446\\u0438\\u043e\\u043d\\u0430\\u043b\\u044c\\u043d\\u043e"),
  limit: U("\\u041b\\u0438\\u043c\\u0438\\u0442"),
  apply: U("\\u041f\\u0440\\u0438\\u043c\\u0435\\u043d\\u0438\\u0442\\u044c"),
  reset: U("\\u0421\\u0431\\u0440\\u043e\\u0441\\u0438\\u0442\\u044c"),
  allEvents: U("\\u0412\\u0441\\u0435 \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f"),
  auth: U("\\u0410\\u0432\\u0442\\u043e\\u0440\\u0438\\u0437\\u0430\\u0446\\u0438\\u044f"),
  users: U("\\u041f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0438"),
  roles: U("\\u0420\\u043e\\u043b\\u0438"),
  permissions: U("\\u041f\\u0440\\u0430\\u0432\\u0430"),
  documents: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b"),
  enrollments: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f"),
  courses: U("\\u041a\\u0443\\u0440\\u0441\\u044b"),
  api: "API",
  errors: U("\\u041e\\u0448\\u0438\\u0431\\u043a\\u0438"),
  shown: U("\\u041f\\u043e\\u043a\\u0430\\u0437\\u0430\\u043d\\u043e"),
  of: U("\\u0438\\u0437"),
  event: U("\\u0421\\u043e\\u0431\\u044b\\u0442\\u0438\\u0435"),
  entity: U("\\u041e\\u0431\\u044a\\u0435\\u043a\\u0442"),
  time: U("\\u0412\\u0440\\u0435\\u043c\\u044f"),
  source: U("\\u0418\\u0441\\u0442\\u043e\\u0447\\u043d\\u0438\\u043a"),
  actions: U("\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f"),
  open: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c"),
  opened: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u043e"),
  close: U("\\u0417\\u0430\\u043a\\u0440\\u044b\\u0442\\u044c"),
  json: "JSON",
  success: U("\\u0423\\u0441\\u043f\\u0435\\u0448\\u043d\\u043e"),
  warning: U("\\u041d\\u0430 \\u043f\\u0440\\u043e\\u0432\\u0435\\u0440\\u043a\\u0435"),
  error: U("\\u041e\\u0448\\u0438\\u0431\\u043a\\u0430"),
  criticalLabel: U("\\u041a\\u0440\\u0438\\u0442\\u0438\\u0447\\u043d\\u043e"),
  info: U("\\u0418\\u043d\\u0444\\u043e"),
  eventCard: U("\\u041a\\u0430\\u0440\\u0442\\u043e\\u0447\\u043a\\u0430 \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f"),
  detailHint: U("\\u0414\\u0435\\u0442\\u0430\\u043b\\u0438 \\u0438\\u0437 GET /api/v1/admin/audit-events/{audit_event_id}."),
  description: U("\\u041e\\u043f\\u0438\\u0441\\u0430\\u043d\\u0438\\u0435"),
  technicalData: U("\\u0422\\u0435\\u0445\\u043d\\u0438\\u0447\\u0435\\u0441\\u043a\\u0438\\u0435 \\u0434\\u0430\\u043d\\u043d\\u044b\\u0435"),
  relatedEvents: U("\\u0421\\u0432\\u044f\\u0437\\u0430\\u043d\\u043d\\u044b\\u0435 \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f"),
  openEntity: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u043e\\u0431\\u044a\\u0435\\u043a\\u0442"),
  actorHistory: U("\\u0418\\u0441\\u0442\\u043e\\u0440\\u0438\\u044f actor"),
  entityHistory: U("\\u0418\\u0441\\u0442\\u043e\\u0440\\u0438\\u044f \\u043e\\u0431\\u044a\\u0435\\u043a\\u0442\\u0430"),
  actionHistory: U("\\u0418\\u0441\\u0442\\u043e\\u0440\\u0438\\u044f action"),
  requestId: "Request ID",
  ipSession: "IP / Session",
  browser: U("\\u0411\\u0440\\u0430\\u0443\\u0437\\u0435\\u0440"),
  endpoint: "Endpoint",
  method: U("\\u041c\\u0435\\u0442\\u043e\\u0434"),
  payload: "Payload",
  diagnostics: U("\\u0414\\u0438\\u0430\\u0433\\u043d\\u043e\\u0441\\u0442\\u0438\\u043a\\u0430"),
  noAnomalies: U("\\u0410\\u043d\\u043e\\u043c\\u0430\\u043b\\u0438\\u0439 \\u0434\\u043b\\u044f \\u044d\\u0442\\u043e\\u0433\\u043e \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f \\u043d\\u0435 \\u043e\\u0431\\u043d\\u0430\\u0440\\u0443\\u0436\\u0435\\u043d\\u043e."),
  empty: U("\\u0421\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f \\u043d\\u0435 \\u043d\\u0430\\u0439\\u0434\\u0435\\u043d\\u044b"),
  signIn: U("\\u0412\\u043e\\u0439\\u0434\\u0438\\u0442\\u0435 \\u043f\\u043e\\u0434 admin, \\u0447\\u0442\\u043e\\u0431\\u044b \\u0443\\u0432\\u0438\\u0434\\u0435\\u0442\\u044c \\u0430\\u0443\\u0434\\u0438\\u0442."),
  loadedFromBackend: U("\\u0414\\u0430\\u043d\\u043d\\u044b\\u0435 \\u0444\\u0438\\u043b\\u044c\\u0442\\u0440\\u0443\\u044e\\u0442\\u0441\\u044f backend \\u0447\\u0435\\u0440\\u0435\\u0437 GET /api/v1/admin/audit-events."),
  dash: "-",
};

const DEFAULT_FILTERS = {
  q: "",
  action: "",
  entity_type: "",
  entity_id: "",
  actor_user_id: "",
  limit: "50",
  result: "all",
  category: "all",
};

const CARD_CLASS = "rounded-2xl bg-white p-4 ring-1 ring-slate-200";
const INPUT_CLASS = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";
const BUTTON_CLASS = "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-indigo-600 text-white hover:bg-indigo-700`;
const SECONDARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50`;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  return value ? formatDateTime(value) : T.dash;
}

function normalizeFilters(filters = {}) {
  return {
    ...DEFAULT_FILTERS,
    ...filters,
    limit: String(filters.limit || DEFAULT_FILTERS.limit),
  };
}

function getAuditFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return normalizeFilters({
    q: params.get("q") || "",
    action: params.get("action") || "",
    entity_type: params.get("entity_type") || "",
    entity_id: params.get("entity_id") || "",
    actor_user_id: params.get("actor_user_id") || "",
    limit: params.get("limit") || DEFAULT_FILTERS.limit,
    result: params.get("result") || "all",
    category: params.get("category") || "all",
  });
}

function getAuditFilterPayload(filters) {
  const normalized = normalizeFilters(filters);
  const payload = {};

  ["action", "entity_type", "entity_id", "actor_user_id", "limit"].forEach((key) => {
    const value = normalized[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      payload[key] = value;
    }
  });

  return payload;
}

function buildAuditUrlFilters(filters) {
  const normalized = normalizeFilters(filters);
  const result = {};

  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return;
    }

    if (key === "result" && value === "all") {
      return;
    }

    if (key === "category" && value === "all") {
      return;
    }

    result[key] = value;
  });

  return result;
}

function getEventCategory(event) {
  const action = String(event?.action || "").toLowerCase();
  const entityType = String(event?.entity_type || "").toLowerCase();

  if (action.includes("login") || action.includes("auth") || entityType === "auth_session") return "auth";
  if (entityType.includes("user") || action.includes(".user_")) return "users";
  if (entityType.includes("role") || action.includes("role")) return "roles";
  if (entityType.includes("permission") || action.includes("permission")) return "permissions";
  if (entityType.includes("document") || action.includes("document")) return "documents";
  if (entityType.includes("enrollment") || action.includes("enrollment")) return "enrollments";
  if (entityType.includes("course") || action.includes("course") || entityType.includes("lesson")) return "courses";
  if (entityType.includes("organization") || action.includes("organization")) return "organizations";
  if (entityType.includes("group") || action.includes("group")) return "groups";
  return "api";
}

function getCategoryLabel(category) {
  const labels = {
    all: T.allEvents,
    auth: T.auth,
    users: T.users,
    roles: T.roles,
    permissions: T.permissions,
    documents: T.documents,
    enrollments: T.enrollments,
    courses: T.courses,
    organizations: U("\\u041e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u0438"),
    groups: U("\\u0413\\u0440\\u0443\\u043f\\u043f\\u044b"),
    api: T.api,
    errors: T.errors,
  };

  return labels[category] || category;
}

function getEventOutcome(event) {
  const action = String(event?.action || "").toLowerCase();

  if (
    action.includes("fail") ||
    action.includes("error") ||
    action.includes("denied") ||
    action.includes("forbidden") ||
    action.includes("unauthorized")
  ) {
    return "error";
  }

  if (
    action.includes("delete") ||
    action.includes("deleted") ||
    action.includes("remove") ||
    action.includes("removed") ||
    action.includes("revoke") ||
    action.includes("revoked") ||
    action.includes("deactivate")
  ) {
    return "warning";
  }

  return "success";
}

function getEventSeverity(event) {
  const action = String(event?.action || "").toLowerCase();

  if (getEventOutcome(event) === "error") {
    return "critical";
  }

  if (
    action.includes("delete") ||
    action.includes("deleted") ||
    action.includes("removed") ||
    action.includes("revoked") ||
    action.includes("password")
  ) {
    return "critical";
  }

  if (
    action.includes("update") ||
    action.includes("assign") ||
    action.includes("export") ||
    action.includes("regenerate") ||
    action.includes("restore")
  ) {
    return "warning";
  }

  return "info";
}

function getOutcomeLabel(outcome) {
  if (outcome === "error") return T.error;
  if (outcome === "warning") return T.warning;
  return T.success;
}

function getSeverityLabel(severity) {
  if (severity === "critical") return T.criticalLabel;
  if (severity === "warning") return T.warning;
  return T.info;
}

function getOutcomeBadgeClass(outcome) {
  if (outcome === "error") return "bg-red-50 text-red-700 ring-red-200";
  if (outcome === "warning") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function getCategoryBadgeClass(category) {
  if (["roles", "permissions"].includes(category)) return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  if (category === "documents") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (category === "auth") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (category === "errors") return "bg-red-50 text-red-700 ring-red-200";
  if (category === "enrollments") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getActionLabel(action) {
  const value = String(action || "");

  const map = {
    login_success: U("\\u0412\\u0445\\u043e\\u0434 \\u0432 \\u0441\\u0438\\u0441\\u0442\\u0435\\u043c\\u0443"),
    login_failed: U("\\u041e\\u0448\\u0438\\u0431\\u043a\\u0430 \\u0432\\u0445\\u043e\\u0434\\u0430"),
    "admin.role_permission_assigned": U("\\u0414\\u043e\\u0431\\u0430\\u0432\\u043b\\u0435\\u043d permission \\u043a \\u0440\\u043e\\u043b\\u0438"),
    "admin.role_permission_removed": U("\\u0423\\u0434\\u0430\\u043b\\u0435\\u043d permission \\u0438\\u0437 \\u0440\\u043e\\u043b\\u0438"),
    "admin.document_created": U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u043d \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
    "admin.document_updated": U("\\u0418\\u0437\\u043c\\u0435\\u043d\\u0435\\u043d \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
    "admin.document_revoked": U("\\u041e\\u0442\\u043e\\u0437\\u0432\\u0430\\u043d \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
    "admin.document_restored": U("\\u0412\\u043e\\u0441\\u0441\\u0442\\u0430\\u043d\\u043e\\u0432\\u043b\\u0435\\u043d \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
    "admin.document_regenerated": U("\\u0420\\u0435\\u0433\\u0435\\u043d\\u0435\\u0440\\u0438\\u0440\\u043e\\u0432\\u0430\\u043d PDF"),
  };

  if (map[value]) {
    return map[value];
  }

  return value.replace(/^admin\./, "").replaceAll("_", " ");
}

function getEventSearchText(event) {
  return normalizeSearchValue([
    event?.id,
    event?.action,
    getActionLabel(event?.action),
    event?.actor_user_id,
    event?.entity_type,
    event?.entity_id,
    event?.ip_address,
    event?.user_agent,
    JSON.stringify(event?.payload || {}),
  ].join(" "));
}

function getInitials(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "AE";
  }

  return normalized
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getShortId(value, length = 8) {
  const normalized = String(value || "");

  if (!normalized) {
    return T.dash;
  }

  return normalized.length > length ? `${normalized.slice(0, length)}...` : normalized;
}

function getPayloadValue(event, keys) {
  const payload = event?.payload || {};

  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null && String(payload[key]).trim() !== "") {
      return payload[key];
    }
  }

  return "";
}

function getEndpoint(event) {
  return getPayloadValue(event, ["endpoint", "path", "url", "route"]) || T.dash;
}

function getMethod(event) {
  return getPayloadValue(event, ["method", "http_method"]) || T.dash;
}

function isToday(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return date.toDateString() === now.toDateString();
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const objectUrl = window.URL.createObjectURL(blob);

  try {
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
  }
}

function Badge({ children, className }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", className)}>
      {children}
    </span>
  );
}

function StatCard({ icon, label, value, hint, tone = "indigo" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "red"
          ? "bg-red-50 text-red-700"
          : "bg-indigo-50 text-indigo-700";

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start gap-4">
        <div className={cx("flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black", toneClass)}>
          {icon}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
          {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function JsonPreview({ value }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
      {JSON.stringify(value || {}, null, 2)}
    </pre>
  );
}

function AuditInlineDetail({
  event,
  selectedAuditEvent,
  selectedAuditEventLoading,
  selectedAuditEventError,
  onClose,
  onDownloadJson,
}) {
  const detail = selectedAuditEvent?.id === event.id ? selectedAuditEvent : event;
  const category = getEventCategory(detail);
  const outcome = getEventOutcome(detail);
  const severity = getEventSeverity(detail);
  const entityAdminPath = buildEntityAdminPath(detail);
  const endpoint = getEndpoint(detail);
  const method = getMethod(detail);
  const diagnostics = [];

  if (!detail.actor_user_id) diagnostics.push(U("\\u041d\\u0435\\u0442 actor_user_id: \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u0435 \\u043c\\u043e\\u0433\\u043b\\u043e \\u0431\\u044b\\u0442\\u044c \\u0441\\u0438\\u0441\\u0442\\u0435\\u043c\\u043d\\u044b\\u043c."));
  if (!detail.entity_id) diagnostics.push(U("\\u041d\\u0435\\u0442 entity_id: \\u0441\\u043b\\u043e\\u0436\\u043d\\u0435\\u0435 \\u043d\\u0430\\u0439\\u0442\\u0438 \\u0441\\u0432\\u044f\\u0437\\u0430\\u043d\\u043d\\u044b\\u0439 \\u043e\\u0431\\u044a\\u0435\\u043a\\u0442."));
  if (!detail.ip_address) diagnostics.push(U("\\u041d\\u0435\\u0442 IP: \\u0442\\u0440\\u0443\\u0434\\u043d\\u0435\\u0435 \\u0440\\u0430\\u0437\\u043e\\u0431\\u0440\\u0430\\u0442\\u044c \\u0438\\u0441\\u0442\\u043e\\u0447\\u043d\\u0438\\u043a."));
  if (severity === "critical") diagnostics.push(U("\\u041a\\u0440\\u0438\\u0442\\u0438\\u0447\\u043d\\u043e\\u0435 \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u0435: \\u043f\\u0440\\u043e\\u0432\\u0435\\u0440\\u044c\\u0442\\u0435 \\u043a\\u043e\\u043d\\u0442\\u0435\\u043a\\u0441\\u0442 \\u0438 payload."));

  return (
    <div data-testid="admin-audit-detail-content" className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700 ring-1 ring-indigo-100">
            {getInitials(detail.action)}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-950">{getActionLabel(detail.action)}</div>
            <div className="mt-1 break-all text-xs font-semibold text-slate-500">{detail.action}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className={getOutcomeBadgeClass(outcome)}>{getOutcomeLabel(outcome)}</Badge>
              <Badge className={getCategoryBadgeClass(category)}>{getCategoryLabel(category)}</Badge>
              <Badge className={severity === "critical" ? "bg-red-50 text-red-700 ring-red-200" : "bg-slate-100 text-slate-700 ring-slate-200"}>
                {getSeverityLabel(severity)}
              </Badge>
            </div>
          </div>
        </div>

        <div data-testid="admin-audit-detail-actions" className="flex flex-wrap gap-2">
          {entityAdminPath ? (
            <Link to={entityAdminPath} className={SECONDARY_BUTTON_CLASS}>
              {T.openEntity}
            </Link>
          ) : null}
          {detail.actor_user_id ? (
            <Link to={buildAuditPath({ actor_user_id: detail.actor_user_id, limit: "200" })} className={SECONDARY_BUTTON_CLASS}>
              {T.actorHistory}
            </Link>
          ) : null}
          {detail.entity_type && detail.entity_id ? (
            <Link to={buildAuditPath({ entity_type: detail.entity_type, entity_id: detail.entity_id, limit: "200" })} className={SECONDARY_BUTTON_CLASS}>
              {T.entityHistory}
            </Link>
          ) : null}
          <button type="button" onClick={() => onDownloadJson(detail)} className={SECONDARY_BUTTON_CLASS}>
            {T.json}
          </button>
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
            {T.close}
          </button>
        </div>
      </div>

      <div data-testid="audit-attention-diagnostics" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.eventType}</div>
          <div className="mt-1 font-bold text-slate-950">{getCategoryLabel(category)}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.entity}</div>
          <div className="mt-1 break-all font-bold text-slate-950">{detail.entity_type || T.dash}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.requestId}</div>
          <div className="mt-1 break-all font-bold text-slate-950">{getPayloadValue(detail, ["request_id", "requestId"]) || getShortId(detail.id, 12)}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.ipSession}</div>
          <div className="mt-1 break-all font-bold text-slate-950">{detail.ip_address || T.dash}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="font-black text-slate-950">{T.description}</div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {U("\\u0412 audit_events \\u0437\\u0430\\u0444\\u0438\\u043a\\u0441\\u0438\\u0440\\u043e\\u0432\\u0430\\u043d\\u043e \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u0435")} <b>{detail.action}</b>
              {U(" \\u043f\\u043e \\u043e\\u0431\\u044a\\u0435\\u043a\\u0442\\u0443")} <b>{detail.entity_type || T.dash}</b>
              {detail.entity_id ? <> / <b>{getShortId(detail.entity_id, 16)}</b></> : null}.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="font-black text-slate-950">{T.technicalData}</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.endpoint}</div>
                <div className="mt-1 break-all font-black text-slate-950">{endpoint}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.method}</div>
                <div className="mt-1 font-black text-slate-950">{method}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.actor}</div>
                <div className="mt-1 break-all font-black text-slate-950">{detail.actor_user_id || T.dash}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.time}</div>
                <div className="mt-1 font-black text-slate-950">{formatDate(detail.created_at)}</div>
              </div>
            </div>
          </div>

          <div className={cx("rounded-2xl p-4 ring-1", diagnostics.length ? "bg-amber-50 ring-amber-200" : "bg-emerald-50 ring-emerald-200")}>
            <div className="font-black text-slate-950">{T.diagnostics}</div>
            {diagnostics.length ? (
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                {diagnostics.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-emerald-800">{T.noAnomalies}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="font-black text-slate-950">{T.payload}</div>
          <div className="mt-3">
            <JsonPreview value={detail.payload} />
          </div>
        </div>
      </div>

      <div data-testid="audit-detail-card-horizontal" className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        {selectedAuditEventLoading ? (
          <div
            data-testid="admin-audit-detail-loading"
            className="sr-only"
            aria-live="polite"
          >
            Загружается карточка события аудита.
          </div>
        ) : null}

        {selectedAuditEventError ? (
          <div
            data-testid="admin-audit-detail-error"
            className="sr-only"
            role="alert"
            aria-live="assertive"
          >
            Ошибка загрузки карточки события аудита.
          </div>
        ) : null}

        <AuditEventDetailPanel
          auditEventDetail={selectedAuditEvent?.id === event.id ? selectedAuditEvent : detail}
          loading={selectedAuditEventLoading}
          error={selectedAuditEventError}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

export function AuditPage({
  auth,
  auditEvents = [],
  loading = false,
  selectedAuditEvent,
  selectedAuditEventLoading = false,
  selectedAuditEventError = "",
  onOpenAuditEvent,
  onCloseAuditEvent,
  onApplyAuditFilters,
  onRefreshAuditEvents,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState(() => getAuditFiltersFromSearch(location.search));
  const [localSelectedAuditEventId, setLocalSelectedAuditEventId] = useState(selectedAuditEvent?.id || "");
  const [filterError, setFilterError] = useState("");

  const events = asArray(auditEvents);
  const isAuthenticated = auth ? Boolean(auth.user || auth.token || auth.accessToken || auth.isAuthenticated) : true;

  useEffect(() => {
    setFilters(getAuditFiltersFromSearch(location.search));
  }, [location.search]);

  useEffect(() => {
    if (selectedAuditEvent?.id) {
      setLocalSelectedAuditEventId(selectedAuditEvent.id);
    }
  }, [selectedAuditEvent]);

  const actionOptions = useMemo(
    () => Array.from(new Set(events.map((event) => event.action).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [events]
  );

  const entityTypeOptions = useMemo(
    () => Array.from(new Set(events.map((event) => event.entity_type).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [events]
  );

  const actorOptions = useMemo(
    () => Array.from(new Set(events.map((event) => event.actor_user_id).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [events]
  );

  const counts = useMemo(() => {
    const categoryCounts = {
      all: events.length,
      auth: 0,
      users: 0,
      roles: 0,
      permissions: 0,
      documents: 0,
      enrollments: 0,
      courses: 0,
      organizations: 0,
      groups: 0,
      api: 0,
      errors: 0,
    };

    const actionCounts = {};
    const entityCounts = {};
    const actors = new Set();

    let todayCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    events.forEach((event) => {
      const category = getEventCategory(event);
      const outcome = getEventOutcome(event);
      const severity = getEventSeverity(event);

      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      if (outcome === "error") {
        categoryCounts.errors += 1;
      }

      if (event.action) {
        actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
      }

      if (event.entity_type) {
        entityCounts[event.entity_type] = (entityCounts[event.entity_type] || 0) + 1;
      }

      if (event.actor_user_id) {
        actors.add(event.actor_user_id);
      }

      if (isToday(event.created_at)) {
        todayCount += 1;
      }

      if (outcome === "error" || outcome === "warning") {
        warningCount += 1;
      }

      if (severity === "critical") {
        criticalCount += 1;
      }
    });

    return {
      all: events.length,
      today: todayCount,
      warnings: warningCount,
      critical: criticalCount,
      categories: categoryCounts,
      actions: actionCounts,
      entities: entityCounts,
      actors: actors.size,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(filters.q);

    return events.filter((event) => {
      const searchMatches = !normalizedSearch || getEventSearchText(event).includes(normalizedSearch);
      const categoryMatches =
        filters.category === "all" ||
        getEventCategory(event) === filters.category ||
        (filters.category === "errors" && getEventOutcome(event) === "error");
      const resultMatches = filters.result === "all" || getEventOutcome(event) === filters.result;

      return searchMatches && categoryMatches && resultMatches;
    });
  }, [events, filters.category, filters.q, filters.result]);

  const selectedListEvent = useMemo(() => {
    return filteredEvents.find((event) => event.id === (selectedAuditEvent?.id || localSelectedAuditEventId)) || selectedAuditEvent || null;
  }, [filteredEvents, localSelectedAuditEventId, selectedAuditEvent]);

  const quickTabs = useMemo(
    () => [
      { value: "all", label: T.allEvents, count: counts.categories.all || 0 },
      { value: "auth", label: T.auth, count: counts.categories.auth || 0 },
      { value: "users", label: T.users, count: counts.categories.users || 0 },
      { value: "roles", label: T.roles, count: counts.categories.roles || 0 },
      { value: "permissions", label: T.permissions, count: counts.categories.permissions || 0 },
      { value: "documents", label: T.documents, count: counts.categories.documents || 0 },
      { value: "enrollments", label: T.enrollments, count: counts.categories.enrollments || 0 },
      { value: "courses", label: T.courses, count: counts.categories.courses || 0 },
      { value: "errors", label: T.errors, count: counts.categories.errors || 0 },
    ],
    [counts]
  );

  function buildNextFilters(overrides = {}) {
    return normalizeFilters({
      ...filters,
      ...overrides,
    });
  }

  async function applyBackendFilters(nextFilters) {
    const limit = Number(nextFilters.limit);

    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      setFilterError(U("\\u041b\\u0438\\u043c\\u0438\\u0442 audit-events \\u0434\\u043e\\u043b\\u0436\\u0435\\u043d \\u0431\\u044b\\u0442\\u044c \\u043e\\u0442 1 \\u0434\\u043e 200."));
      return;
    }

    setFilterError("");

    const payload = getAuditFilterPayload(nextFilters);

    if (onRefreshAuditEvents) {
      await onRefreshAuditEvents(payload);
      return;
    }

    if (onApplyAuditFilters) {
      await onApplyAuditFilters(payload);
    }
  }

  async function navigateToFilters(nextFilters, options = { replace: true }, shouldApplyBackend = true) {
    const normalized = normalizeFilters(nextFilters);

    setFilters(normalized);
    navigate(buildAuditPath(buildAuditUrlFilters(normalized)), options);

    if (shouldApplyBackend) {
      await applyBackendFilters(normalized);
    }
  }

  function updateLocalFilter(field, value) {
    setFilters((current) => normalizeFilters({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await navigateToFilters(filters);
  }

  async function handleReset() {
    setLocalSelectedAuditEventId("");
    onCloseAuditEvent?.();
    await navigateToFilters(DEFAULT_FILTERS, { replace: true });
  }

  async function handleRefresh() {
    await applyBackendFilters(filters);
  }

  function handleQuickCategory(category) {
    const nextFilters = buildNextFilters({ category });

    setFilters(nextFilters);
    navigate(buildAuditPath(buildAuditUrlFilters(nextFilters)), { replace: true });
  }

  function handleOpenEvent(event) {
    const currentSelectedId = selectedAuditEvent?.id || localSelectedAuditEventId;

    if (currentSelectedId === event.id) {
      setLocalSelectedAuditEventId("");
      onCloseAuditEvent?.();
      return;
    }

    setLocalSelectedAuditEventId(event.id);
    onOpenAuditEvent?.(event.id);
  }

  function handleDownloadJson(event) {
    const content = JSON.stringify(event, null, 2);
    downloadTextFile(`admin-audit-event-${event.id || "selected"}.json`, content, "application/json;charset=utf-8");
  }

  function handleExportJson() {
    downloadTextFile(
      `admin-audit-events-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(filteredEvents, null, 2),
      "application/json;charset=utf-8"
    );
  }

  function handleExportAuditCsv() {
    const rows = filteredEvents.map((event) => ({
      id: event.id,
      created_at: event.created_at || "",
      action: event.action || "",
      category: getEventCategory(event),
      result: getEventOutcome(event),
      action_tone: getActionTone(event.action),
      entity_type: event.entity_type || "",
      entity_id: event.entity_id || "",
      entity_audit_url:
        event.entity_type && event.entity_id
          ? buildAuditPath({
              entity_type: event.entity_type,
              entity_id: event.entity_id,
            })
          : "",
      actor_user_id: event.actor_user_id || "",
      actor_user_email: event.actor_user_email || "",
      actor_user_full_name: event.actor_user_full_name || "",
      actor_audit_url: event.actor_user_id
        ? buildAuditPath({ actor_user_id: event.actor_user_id })
        : "",
      action_audit_url: event.action
        ? buildAuditPath({ action: event.action })
        : "",
      request_id: event.request_id || "",
      ip_address: event.ip_address || "",
      user_agent: event.user_agent || "",
      payload: stringifyAuditCsvValue(event.payload),
      metadata: stringifyAuditCsvValue(event.metadata),
      details: stringifyAuditCsvValue(event.details),
      old_values: stringifyAuditCsvValue(event.old_values),
      new_values: stringifyAuditCsvValue(event.new_values),
    }));

    downloadCsvFile(
      buildDatedCsvFilename("obrportal-admin-audit-events"),
      AUDIT_CSV_EXPORT_COLUMNS,
      rows
    );
  }

  return (
    <main data-testid="admin-audit-page" className="space-y-6">
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-700">
              {T.admin} / {T.audit}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{T.title}</h1>
              <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.systemOk}</Badge>
              <Badge className="bg-slate-50 text-slate-600 ring-slate-200">{T.readOnly}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">{T.subtitle}</p>
            <p
              data-testid="admin-audit-readonly-notice"
              className="mt-2 text-xs font-semibold text-slate-500"
            >
              Журнал доступен только для чтения: интерфейс не изменяет audit_events.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleRefresh} disabled={loading} className={SECONDARY_BUTTON_CLASS}>
              {T.refresh}
            </button>
            <button type="button" data-testid="admin-audit-export-csv-button" onClick={handleExportAuditCsv} disabled={loading || filteredEvents.length === 0} className={SECONDARY_BUTTON_CLASS}>
              {T.exportCsv}
            </button>
            <button type="button" data-testid="admin-audit-export-json-button" onClick={handleExportJson} disabled={loading || filteredEvents.length === 0} className={SECONDARY_BUTTON_CLASS}>
              {T.exportJson}
            </button>
          </div>
        </div>
      </section>

      <section data-testid="audit-dashboard-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="A" label={T.totalEvents} value={counts.all} hint={T.allTime} />
        <StatCard icon="D" label={T.today} value={counts.today} hint={`${T.shown} ${filteredEvents.length} ${T.of} ${events.length}`} tone="green" />
        <StatCard icon="!" label={T.warnings} value={counts.warnings} hint={T.requireAttention} tone={counts.warnings ? "amber" : "green"} />
        <StatCard icon="S" label={T.critical} value={counts.critical} hint={counts.critical ? T.requireAttention : T.systemOk} tone={counts.critical ? "red" : "green"} />
      </section>

      {!isAuthenticated ? (
        <section
          data-testid="admin-audit-unauthorized-state"
          className="rounded-3xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200"
        >
          {T.signIn}
        </section>
      ) : (
        <>
          <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <form
              data-testid="admin-audit-filters"
              onSubmit={handleSubmit}
              className="grid gap-3 xl:grid-cols-[1.4fr_0.75fr_0.75fr_0.75fr_0.75fr_0.55fr_auto_auto]"
            >
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.search}</span>
                <input
                  type="search"
                  value={filters.q}
                  onChange={(event) => updateLocalFilter("q", event.target.value)}
                  placeholder={T.searchPlaceholder}
                  className={cx(INPUT_CLASS, "mt-1")}
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.action}</span>
                <select data-testid="admin-audit-filter-action" value={filters.action} onChange={(event) => updateLocalFilter("action", event.target.value)} className={cx(INPUT_CLASS, "mt-1")}>
                  <option value="">{T.allActions}</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.section}</span>
                <select data-testid="admin-audit-filter-entity-type" value={filters.entity_type} onChange={(event) => updateLocalFilter("entity_type", event.target.value)} className={cx(INPUT_CLASS, "mt-1")}>
                  <option value="">{T.allSections}</option>
                  {entityTypeOptions.map((entityType) => (
                    <option key={entityType} value={entityType}>{entityType}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.actor}</span>
                <select data-testid="admin-audit-filter-actor-user-id" value={filters.actor_user_id} onChange={(event) => updateLocalFilter("actor_user_id", event.target.value)} className={cx(INPUT_CLASS, "mt-1")}>
                  <option value="">{T.allActors}</option>
                  {actorOptions.map((actorId) => (
                    <option key={actorId} value={actorId}>{getShortId(actorId, 18)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.result}</span>
                <select value={filters.result} onChange={(event) => updateLocalFilter("result", event.target.value)} className={cx(INPUT_CLASS, "mt-1")}>
                  <option value="all">{T.allResults}</option>
                  <option value="success">{T.success}</option>
                  <option value="warning">{T.warning}</option>
                  <option value="error">{T.error}</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.limit}</span>
                <input
                  data-testid="admin-audit-filter-limit"
                  type="number"
                  min="1"
                  max="200"
                  value={filters.limit}
                  onChange={(event) => updateLocalFilter("limit", event.target.value)}
                  className={cx(INPUT_CLASS, "mt-1")}
                />
              </label>

              <div data-testid="admin-audit-filter-actions" className="contents">
                <div className="flex items-end">
                  <button data-testid="admin-audit-apply-filters-action" type="submit" disabled={loading} className={PRIMARY_BUTTON_CLASS}>{T.apply}</button>
                </div>

                <div className="flex items-end">
                  <button data-testid="admin-audit-reset-filters-action" type="button" onClick={handleReset} disabled={loading} className={SECONDARY_BUTTON_CLASS}>{T.reset}</button>
                </div>
              </div>
            </form>

            <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr]">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.objectId}</span>
                <input
                  data-testid="admin-audit-filter-entity-id"
                  type="text"
                  value={filters.entity_id}
                  onChange={(event) => updateLocalFilter("entity_id", event.target.value)}
                  placeholder={T.objectIdPlaceholder}
                  className={cx(INPUT_CLASS, "mt-1")}
                />
              </label>

              <div className="flex items-end text-xs text-slate-500">
                {filterError ? (
                  <span
                    data-testid="admin-audit-filter-error-state"
                    role="alert"
                    aria-live="assertive"
                    className="rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-700 ring-1 ring-red-200"
                  >
                    {filterError}
                  </span>
                ) : (
                  <span>{T.loadedFromBackend}</span>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {quickTabs.map((tab) => {
              const active = filters.category === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleQuickCategory(tab.value)}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-1 transition",
                    active
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  )}
                >
                  {tab.label}
                  <span className={cx("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/15" : "bg-slate-100")}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <section className="grid gap-4">
            <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
              <div data-testid="admin-audit-export-summary" className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-500">
                <div data-testid="admin-audit-result-summary" className="flex flex-wrap gap-3">
                  <span>{T.shown} {filteredEvents.length} {T.of} {events.length}</span>
                  <span>-</span>
                  <span>{T.action}: {Object.keys(counts.actions).length}</span>
                  <span>-</span>
                  <span>{T.actor}: {counts.actors}</span>
                </div>
                <button type="button" onClick={handleExportAuditCsv} disabled={loading || filteredEvents.length === 0} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {T.exportCsv}
                </button>
              </div>

              {loading ? (
                <div data-testid="admin-audit-loading-state" aria-live="polite" className="p-6 text-sm text-slate-500">
                  {U("\\u0417\\u0430\\u0433\\u0440\\u0443\\u0436\\u0430\\u0435\\u043c audit-events...")}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div data-testid="admin-audit-empty-state" aria-live="polite" className="p-6 text-sm text-slate-500">{T.empty}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table data-testid="admin-audit-table" className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="px-5 py-4">{T.event}</th>
                        <th className="px-5 py-4">{T.actor}</th>
                        <th className="px-5 py-4">{T.entity}</th>
                        <th className="px-5 py-4">{T.result}</th>
                        <th className="px-5 py-4">{T.time}</th>
                        <th className="px-5 py-4">{T.source}</th>
                        <th className="px-5 py-4 text-right">{T.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((event) => {
                        const selected = selectedListEvent?.id === event.id;
                        const category = getEventCategory(event);
                        const outcome = getEventOutcome(event);

                        return (
                          <Fragment key={`audit-row-block-${event.id}`}>
                            <tr className={cx("border-t border-slate-100 align-middle transition", selected ? "bg-indigo-50/40" : "bg-white hover:bg-slate-50")}>
                              <td className="px-5 py-4">
                                <button type="button" onClick={() => handleOpenEvent(event)} className="flex min-w-80 items-center gap-3 text-left">
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                                    {getInitials(event.action)}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block font-black text-slate-950">{getActionLabel(event.action)}</span>
                                    <span className="mt-1 block break-all text-xs text-slate-500">{event.action}</span>
                                    <span className="mt-1 block text-xs text-slate-500">ID: {getShortId(event.id, 12)}</span>
                                  </span>
                                </button>
                              </td>
                              <td className="px-5 py-4">
                                <div className="font-black text-slate-950">{event.actor_user_id ? getShortId(event.actor_user_id, 12) : U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u0430")}</div>
                                <div className="mt-1 text-xs text-slate-500">{event.actor_user_id || T.dash}</div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="font-black text-slate-950">{event.entity_type || T.dash}</div>
                                <div className="mt-1 break-all text-xs text-slate-500">{event.entity_id ? `ID: ${getShortId(event.entity_id, 14)}` : T.dash}</div>
                              </td>
                              <td className="px-5 py-4">
                                <Badge className={getOutcomeBadgeClass(outcome)}>{getOutcomeLabel(outcome)}</Badge>
                              </td>
                              <td className="px-5 py-4">
                                <div className="font-semibold text-slate-800">{formatDate(event.created_at)}</div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="font-semibold text-slate-800">{event.ip_address || T.dash}</div>
                                <div className="mt-1 text-xs text-slate-500">{getCategoryLabel(category)}</div>
                              </td>
                              <td className="px-5 py-4">
                                <div data-testid={`admin-audit-row-actions-${event.id}`} className="flex justify-end gap-2">
                                  <button data-testid="admin-audit-open-detail-action" type="button" onClick={() => handleOpenEvent(event)} disabled={selectedAuditEventLoading} className={SECONDARY_BUTTON_CLASS}>
                                    {selected ? T.opened : T.open}
                                  </button>
                                  <button type="button" onClick={() => handleDownloadJson(event)} className={SECONDARY_BUTTON_CLASS}>
                                    {T.json}
                                  </button>
                                  {event.entity_type && event.entity_id ? (
                                    <Link to={buildAuditPath({ entity_type: event.entity_type, entity_id: event.entity_id, limit: "200" })} className={SECONDARY_BUTTON_CLASS}>
                                      {T.relatedEvents}
                                    </Link>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                            {selected ? (
                              <tr key={`audit-detail-${event.id}`} className="bg-slate-50/70">
                                <td data-testid="admin-audit-detail-panel" colSpan={7} className="px-4 pb-4 pt-0">
                                  <AuditInlineDetail
                                    event={event}
                                    selectedAuditEvent={selectedAuditEvent}
                                    selectedAuditEventLoading={selectedAuditEventLoading}
                                    selectedAuditEventError={selectedAuditEventError}
                                    onClose={() => {
                                      setLocalSelectedAuditEventId("");
                                      onCloseAuditEvent?.();
                                    }}
                                    onDownloadJson={handleDownloadJson}
                                  />
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default AuditPage;

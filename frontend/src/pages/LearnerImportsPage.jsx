import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyAdminLearnerImport,
  getAdminCourses,
  getAdminLearnerImportDetail,
  getAdminLearnerImports,
  getAdminOrganizations,
  getOrgLearningGroups,
  uploadAdminLearnerImport,
} from "../api/client";
import { formatApiError } from "../utils/apiErrors";

const DASH = "—";

function formatDateTime(value) {
  if (!value) {
    return DASH;
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusTone(status) {
  if (status === "parsed" || status === "applied") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "failed" || status === "invalid" || status === "error") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (status === "processing") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function getStatusLabel(status) {
  const labels = {
    parsed: "Проверен",
    applied: "Применён",
    valid: "Валидная",
    invalid: "Ошибка",
    error: "Ошибка",
    failed: "Сбой",
    processing: "Обработка",
    draft: "Черновик",
  };

  return labels[status] || status || "Неизвестно";
}



function csvEscape(value) {
  const textValue = value === null || value === undefined ? "" : String(value);
  return `"${textValue.replaceAll('"', '""')}"`;
}

function formatValidationError(message) {
  const normalized = `${message || ""}`.trim();
  const lower = normalized.toLowerCase();

  if (lower === "full_name is required." || lower === "full_name is required") {
    return "ФИО обязательно.";
  }

  if (lower === "email is invalid." || lower === "email is invalid") {
    return "Некорректный email.";
  }

  if (lower === "phone is invalid." || lower === "phone is invalid") {
    return "Некорректный телефон.";
  }

  if (lower === "snils is invalid." || lower === "snils is invalid") {
    return "Некорректный СНИЛС.";
  }

  return normalized || DASH;
}

async function copyTextToClipboard(value) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const element = document.createElement("textarea");
  element.value = value;
  element.setAttribute("readonly", "readonly");
  element.style.position = "fixed";
  element.style.left = "-9999px";
  document.body.appendChild(element);
  element.select();
  document.execCommand("copy");
  document.body.removeChild(element);
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusTone(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function SummaryCard({ label, value, tone = "slate" }) {
  const toneClass = {
    slate: "bg-white text-slate-900 ring-slate-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    red: "bg-rose-50 text-rose-800 ring-rose-200",
    blue: "bg-blue-50 text-blue-800 ring-blue-200",
  }[tone] || "bg-white text-slate-900 ring-slate-200";

  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}


function WorkflowStep({ number, title, description }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white shadow-sm">
        {number}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-black text-slate-950">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{description}</div>
      </div>
    </div>
  );
}


function getEntityLabel(items, id, fallback = DASH) {
  if (!id) {
    return fallback;
  }

  const found = items.find((item) => String(item.id) === String(id));
  return found?.title || found?.name || found?.short_name || found?.slug || id || fallback;
}

function getImportContextParts(item, courses, organizations, learningGroups) {
  if (!item) {
    return [];
  }

  return [
    ["Курс", getEntityLabel(courses, item.course_id)],
    ["Орг.", getEntityLabel(organizations, item.organization_id)],
    ["Группа", getEntityLabel(learningGroups, item.learning_group_id)],
  ];
}

function ImportContextCell({ item, courses, organizations, learningGroups }) {
  const parts = getImportContextParts(item, courses, organizations, learningGroups).filter(([, value]) => value && value !== DASH);

  if (!parts.length) {
    return <span className="text-slate-400">{DASH}</span>;
  }

  return (
    <div className="space-y-0.5 text-xs leading-5 text-slate-600">
      {parts.map(([label, value]) => (
        <div key={label} className="max-w-[220px] truncate">
          <span className="font-black text-slate-500">{label}:</span> {value}
        </div>
      ))}
    </div>
  );
}


function getRowName(row) {
  const data = row.normalized_data_json || {};
  const compositeName = [data.last_name, data.first_name, data.middle_name].filter(Boolean).join(" ").trim();
  return data.full_name || compositeName || "(пусто)";
}

function getRowContact(row) {
  const data = row.normalized_data_json || {};
  return data.email || data.phone || DASH;
}

function getImportRowContextParts(row, selectedImport, courses, organizations, learningGroups) {
  const data = row.normalized_data_json || {};

  return [
    ["Курс", getEntityLabel(courses, selectedImport?.course_id, data.program_title || data.course_title || DASH)],
    ["Орг.", getEntityLabel(organizations, selectedImport?.organization_id)],
    ["Группа", getEntityLabel(learningGroups, selectedImport?.learning_group_id)],
  ];
}

function ImportRowContextCell({ row, selectedImport, courses, organizations, learningGroups }) {
  const parts = getImportRowContextParts(row, selectedImport, courses, organizations, learningGroups).filter(([, value]) => value && value !== DASH);

  if (!parts.length) {
    return <span className="text-slate-400">{DASH}</span>;
  }

  return (
    <div className="space-y-0.5 text-xs leading-5 text-slate-600">
      {parts.map(([label, value]) => (
        <div key={label} className="max-w-[240px] truncate">
          <span className="font-black text-slate-500">{label}:</span> {value}
        </div>
      ))}
    </div>
  );
}

function safeJsonPreview(value) {
  if (!value || typeof value !== "object") {
    return DASH;
  }

  const entries = Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && `${item}`.trim() !== "")
    .slice(0, 4);

  if (!entries.length) {
    return DASH;
  }

  return entries.map(([key, item]) => `${key}: ${item}`).join("; ");
}

export function getImportInvitationEmailDeliveryLabel(status) {
  if (status === "sent") {
    return "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E";
  }

  if (status === "failed") {
    return "\u041E\u0448\u0438\u0431\u043A\u0430";
  }

  if (status === "skipped") {
    return "\u041D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u043B\u043E\u0441\u044C";
  }

  return "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E";
}

function getImportInvitationEmailDeliveryClassName(status) {
  if (status === "sent") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "failed") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "skipped") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-50 text-slate-600 ring-slate-200";
}


export function getPreflightClassificationLabel(
  classification
) {
  const labels = {
    new_user: "\u041d\u043e\u0432\u044b\u0439 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c",
    existing_inactive_user: "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c",
    existing_active_user: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c",
    existing_enrollment: "\u0423\u0436\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d \u043d\u0430 \u043a\u0443\u0440\u0441",
    identity_conflict: "\u041a\u043e\u043d\u0444\u043b\u0438\u043a\u0442 \u043b\u0438\u0447\u043d\u043e\u0441\u0442\u0438",
    invalid_row: "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0442\u0440\u043e\u043a\u0438",
  };

  return labels[classification] || classification || DASH;
}

function getPreflightClassificationTone(
  classification
) {
  if (classification === "new_user") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (
    classification === "existing_inactive_user"
    || classification === "existing_active_user"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (classification === "existing_enrollment") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (
    classification === "identity_conflict"
    || classification === "invalid_row"
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function getPreflightActionLabel(action) {
  const labels = {
    create: "\u0431\u0443\u0434\u0435\u0442 \u0441\u043e\u0437\u0434\u0430\u043d\u043e",
    created: "\u0431\u0443\u0434\u0435\u0442 \u0441\u043e\u0437\u0434\u0430\u043d\u043e",
    update: "\u0431\u0443\u0434\u0435\u0442 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e",
    updated: "\u0431\u0443\u0434\u0435\u0442 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e",
    reuse: "\u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044e\u0449\u0435\u0435",
    existing: "\u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044e\u0449\u0435\u0435",
    unchanged: "\u0431\u0435\u0437 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439",
    no_change: "\u0431\u0435\u0437 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439",
    skip: "\u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f",
    skipped: "\u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f",
    not_required: "\u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f",
    conflict: "\u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u043e \u043a\u043e\u043d\u0444\u043b\u0438\u043a\u0442\u043e\u043c",
    blocked: "\u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u043e",
  };

  return labels[action] || action || DASH;
}

function getPreflightNotificationLabel(action) {
  const labels = {
    password_setup_invitation: "\u043f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u0434\u043b\u044f \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u043f\u0430\u0440\u043e\u043b\u044f",
    new_course_notification: "\u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435 \u043e \u043d\u043e\u0432\u043e\u043c \u043a\u0443\u0440\u0441\u0435",
    not_required: "\u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f",
    skipped: "\u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u0442\u0441\u044f",
  };

  return labels[action] || action || DASH;
}

function getPreflightRowActionSummary(item) {
  if (!item) {
    return DASH;
  }

  return [
    `\u0410\u043a\u043a\u0430\u0443\u043d\u0442: ${getPreflightActionLabel(item.user_action)}`,
    `\u041f\u0440\u043e\u0444\u0438\u043b\u044c: ${getPreflightActionLabel(item.profile_action)}`,
    `\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435: ${getPreflightActionLabel(item.enrollment_action)}`,
    `\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435: ${getPreflightNotificationLabel(item.notification_action)}`,
  ].join(" \u00b7 ");
}

function PreflightClassificationPill({
  classification,
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${getPreflightClassificationTone(classification)}`}
    >
      {getPreflightClassificationLabel(classification)}
    </span>
  );
}

export function LearnerImportsPage() {
  const [imports, setImports] = useState([]);
  const [selectedImport, setSelectedImport] = useState(null);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [courses, setCourses] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [learningGroups, setLearningGroups] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [learningGroupId, setLearningGroupId] = useState("");
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applyingImportId, setApplyingImportId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedInvitationKey, setCopiedInvitationKey] = useState("");
  const [rowFilter, setRowFilter] = useState("all");

  const selectedRows = selectedImport?.rows || [];
  const selectedPreflight = selectedImport?.preflight || null;
  const selectedPreflightAttentionCount =
    (selectedPreflight?.identity_conflicts_count || 0)
    + (selectedPreflight?.invalid_rows_count || 0);
  const canApplySelectedImport = selectedImport?.status === "parsed" && (selectedImport?.valid_rows || 0) > 0;
  const selectedImportIsApplying = selectedImport?.id && applyingImportId === selectedImport.id;

  const selectedPreflightRowsByKey = useMemo(() => {
    const result = new Map();
    const rows = selectedImport?.preflight?.rows || [];

    rows.forEach((item) => {
      if (item.row_id) {
        result.set(`row_id:${item.row_id}`, item);
      }

      if (
        item.row_number !== undefined
        && item.row_number !== null
      ) {
        result.set(
          `row_number:${item.row_number}`,
          item
        );
      }
    });

    return result;
  }, [selectedImport]);

  const totals = useMemo(() => {
    return imports.reduce(
      (acc, item) => {
        acc.totalRows += item.total_rows || 0;
        acc.validRows += item.valid_rows || 0;
        acc.invalidRows += item.invalid_rows || 0;
        return acc;
      },
      { totalRows: 0, validRows: 0, invalidRows: 0 }
    );
  }, [imports]);

  const readyToApplyCount = useMemo(() => {
    return imports.filter((item) => item.status === "parsed" && (item.valid_rows || 0) > 0).length;
  }, [imports]);

  const visibleSelectedRows = useMemo(() => {
    if (rowFilter === "valid") {
      return selectedRows.filter((row) => row.status === "valid");
    }

    if (rowFilter === "invalid") {
      return selectedRows.filter((row) => row.status !== "valid");
    }

    return selectedRows;
  }, [rowFilter, selectedRows]);

  const selectedImportHasErrors = useMemo(() => {
    return selectedRows.some((row) => row.validation_errors_json?.length);
  }, [selectedRows]);

  async function loadImports(overrides = {}) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminLearnerImports({
        q: overrides.q ?? query,
        status: overrides.status ?? statusFilter,
        limit: 100,
      });
      setImports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(formatApiError(err, "Не удалось загрузить импорты слушателей."));
    } finally {
      setLoading(false);
    }
  }

  async function openImport(batchId) {
    if (!batchId) {
      return;
    }

    setSelectedImportId(batchId);
    setDetailLoading(true);
    setError("");

    try {
      const detail = await getAdminLearnerImportDetail(batchId);
      setSelectedImport(detail);
    } catch (err) {
      setError(formatApiError(err, "Не удалось открыть импорт."));
      setSelectedImport(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleApplySelectedImport() {
    if (!selectedImport?.id) {
      return;
    }

    setApplyingImportId(selectedImport.id);
    setError("");
    setNotice("");

    try {
      const applied = await applyAdminLearnerImport(selectedImport.id);
      const invitationCount = Array.isArray(applied.invitations) ? applied.invitations.length : 0;
      const courseNotificationCount = Array.isArray(applied.course_notifications) ? applied.course_notifications.length : 0;

      setSelectedImport(applied);
      setCopiedInvitationKey("");
      setNotice(
        `\u0418\u043c\u043f\u043e\u0440\u0442 \u043f\u0440\u0438\u043c\u0435\u043d\u0451\u043d: \u0441\u043e\u0437\u0434\u0430\u043d\u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439 ${applied.created_users_count}, \u043f\u0440\u043e\u0444\u0438\u043b\u0435\u0439 ${applied.created_profiles_count}, \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0439 ${applied.created_enrollments_count}.${invitationCount ? ` \u0421\u0441\u044b\u043b\u043e\u043a \u0430\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u0438: ${invitationCount}.` : ""}${courseNotificationCount ? ` \u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0439 \u043e \u043a\u0443\u0440\u0441\u0435: ${courseNotificationCount}.` : ""}`
      );
      setStatusFilter("");
      await loadImports({ status: "" });
    } catch (err) {
      setError(formatApiError(err, "Не удалось применить импорт."));
    } finally {
      setApplyingImportId("");
    }
  }

  async function handleCopyImportInvitation(invitation) {
    if (!invitation?.setup_url) {
      return;
    }

    const key = invitation.row_id || invitation.user_id || invitation.email || invitation.setup_url;

    try {
      await copyTextToClipboard(invitation.setup_url);
      setCopiedInvitationKey(key);
      setNotice(`Ссылка приглашения для ${invitation.email || "пользователя"} скопирована.`);
    } catch {
      setCopiedInvitationKey("");
      setError("Не удалось скопировать ссылку. Скопируйте её вручную из блока приглашений.");
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Выберите CSV или XLSX файл для импорта.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const created = await uploadAdminLearnerImport(file, {
        notes,
        course_id: courseId,
        organization_id: organizationId,
        learning_group_id: learningGroupId,
      });
      setNotice(`Импорт загружен: ${created.valid_rows} валидных строк, ${created.invalid_rows} строк с ошибками.`);
      setFile(null);
      setNotes("");
      await loadImports();
      await openImport(created.id);
    } catch (err) {
      setError(formatApiError(err, "Не удалось загрузить импорт."));
    } finally {
      setUploading(false);
    }
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    loadImports();
  }

  function downloadSelectedImportErrors() {
    if (!selectedImport) {
      return;
    }

    const errorRows = selectedRows.filter((row) => row.validation_errors_json?.length);

    if (!errorRows.length) {
      return;
    }

    const lines = [
      [
        "Номер строки",
        "ФИО",
        "Email/телефон",
        "Ошибки",
        "Данные",
      ].map(csvEscape).join(";"),
      ...errorRows.map((row) =>
        [
          row.row_number,
          getRowName(row),
          getRowContact(row),
          row.validation_errors_json.map(formatValidationError).join(" | "),
          JSON.stringify(row.normalized_data_json || {}),
        ].map(csvEscape).join(";")
      ),
    ];

    const blob = new Blob([String.fromCharCode(0xfeff) + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedImport.source_filename || "learner-import"}.errors.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const loadImportReferences = useCallback(async () => {
    setReferenceLoading(true);

    try {
      const [coursesData, organizationsData, groupsData] = await Promise.all([
        getAdminCourses({ limit: 300 }),
        getAdminOrganizations(),
        getOrgLearningGroups({ limit: 300 }),
      ]);

      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setOrganizations(Array.isArray(organizationsData) ? organizationsData : []);
      setLearningGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (err) {
      setError(formatApiError(err, "Не удалось загрузить курсы, организации и группы."));
    } finally {
      setReferenceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImports();
    loadImportReferences();
  }, [loadImportReferences]);

  return (
    <div className="space-y-6" data-testid="admin-learner-imports-page">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Админка / Импорт слушателей</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Импорт слушателей</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Загрузите CSV или XLSX файл, проверьте распознанные строки и ошибки перед созданием профилей, назначений и документов.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadImports()}
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Обновляем..." : "Обновить список"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <WorkflowStep number="1" title="Загрузить файл" description="CSV/XLSX и контекст назначения" />
          <div className="hidden items-center text-2xl text-slate-300 lg:flex">→</div>
          <WorkflowStep number="2" title="Проверить строки" description="Валидация и просмотр ошибок" />
          <div className="hidden items-center text-2xl text-slate-300 lg:flex">→</div>
          <WorkflowStep number="3" title="Применить импорт" description="Создать профили и назначения" />
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
            {notice}
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Файлов" value={imports.length} tone="blue" />
        <SummaryCard label="Валидных строк" value={totals.validRows} tone="green" />
        <SummaryCard label="Строк с ошибками" value={totals.invalidRows} tone="red" />
        <SummaryCard label="Готово к применению" value={readyToApplyCount} tone="blue" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-6">
          <form onSubmit={handleUpload} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-black text-slate-950">Загрузить файл</h2>
            <p className="mt-1 text-sm text-slate-600">
              Поддерживаются .csv и .xlsx. На этом шаге данные только проверяются и сохраняются как batch импорта.
            </p>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Файл импорта
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>

            <div className="grid gap-3">
              <label className="block text-sm font-semibold text-slate-800">
                Курс для назначения
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  disabled={referenceLoading}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Без назначения на курс</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title || course.slug || course.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Организация
                <select
                  value={organizationId}
                  onChange={(event) => {
                    const nextOrganizationId = event.target.value;
                    setOrganizationId(nextOrganizationId);

                    const selectedGroup = learningGroups.find((group) => group.id === learningGroupId);
                    if (selectedGroup && nextOrganizationId && selectedGroup.organization_id !== nextOrganizationId) {
                      setLearningGroupId("");
                    }
                  }}
                  disabled={referenceLoading}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Без организации</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name || organization.short_name || organization.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Группа
                <select
                  value={learningGroupId}
                  onChange={(event) => {
                    const nextGroupId = event.target.value;
                    setLearningGroupId(nextGroupId);

                    const selectedGroup = learningGroups.find((group) => group.id === nextGroupId);
                    if (selectedGroup?.organization_id) {
                      setOrganizationId(selectedGroup.organization_id);
                    }
                  }}
                  disabled={referenceLoading}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Без группы</option>
                  {learningGroups
                    .filter((group) => !organizationId || group.organization_id === organizationId)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name || group.title || group.id}
                      </option>
                    ))}
                </select>
              </label>

              <p className="text-xs leading-relaxed text-slate-500">
                Если выбрать курс, после применения импорта будут созданы назначения. Организация и группа необязательны.
              </p>
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Примечание
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Например: первый курс, группа июль 2026"
                className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </label>

            <button
              type="submit"
              disabled={uploading}
              className="mt-5 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Загружаем..." : "Загрузить и проверить"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">История импортов</h2>
                <p className="mt-1 text-sm text-slate-600">Последние загруженные файлы и сводка проверки строк.</p>
              </div>
              {loading ? <span className="text-sm text-slate-500">Загрузка...</span> : null}
            </div>

            <form
              onSubmit={handleApplyFilters}
              data-testid="learner-import-history-filters"
              className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]"
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по файлу или примечанию"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Все статусы</option>
                <option value="parsed">Проверен</option>
                <option value="applied">Применён</option>
                <option value="draft">Черновик</option>
                <option value="processing">Обработка</option>
                <option value="failed">Сбой</option>
              </select>

              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                Фильтр
              </button>
            </form>

            <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Файл</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Контекст</th>
                    <th className="px-4 py-3">Строки</th>
                    <th className="px-4 py-3">Ошибки</th>
                    <th className="px-4 py-3">Дата</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {imports.length ? imports.map((item) => (
                    <tr key={item.id} className={selectedImportId === item.id ? "bg-blue-50/60" : ""}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.source_filename || "Без имени"}</div>
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-500">{item.notes || DASH}</div>
                      </td>
                      <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                      <td className="px-4 py-3">
                        <ImportContextCell
                          item={item}
                          courses={courses}
                          organizations={organizations}
                          learningGroups={learningGroups}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="font-semibold">{item.valid_rows}</span> / {item.total_rows}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.invalid_rows}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(item.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openImport(item.id)}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                        Импорты пока не найдены.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Детали импорта</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Выберите импорт в таблице, чтобы посмотреть распознанные строки и ошибки.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {detailLoading ? <span className="text-sm text-slate-500">Загрузка...</span> : null}

                {selectedImport ? (
                  <button
                    type="button"
                    onClick={handleApplySelectedImport}
                    disabled={!canApplySelectedImport || selectedImportIsApplying}
                    title={
                      selectedImport.status === "applied"
                        ? "Импорт уже применён"
                        : canApplySelectedImport
                          ? "Создать или обновить пользователей и профили по валидным строкам"
                          : "Нет валидных строк для применения"
                    }
                    className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {selectedImportIsApplying ? "Применяем..." : "Применить импорт"}
                  </button>
                ) : null}
              </div>
            </div>

            {selectedImport ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <SummaryCard label="Всего" value={selectedImport.total_rows} />
                  <SummaryCard label="Валидных" value={selectedImport.valid_rows} tone="green" />
                  <SummaryCard label="С ошибками" value={selectedImport.invalid_rows} tone="red" />
                  <SummaryCard label="Статус" value={getStatusLabel(selectedImport.status)} tone="blue" />
                </div>

                {selectedPreflight ? (
                  <div
                    data-testid="learner-import-preflight-card"
                    className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-blue-950">
                          {"\u041f\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430"}
                        </div>
                        <p className="mt-1 max-w-3xl text-xs leading-5 text-blue-800">
                          {"\u0420\u0430\u0441\u0447\u0451\u0442 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u0447\u0442\u043e \u0431\u0443\u0434\u0435\u0442 \u0441\u0434\u0435\u043b\u0430\u043d\u043e \u0434\u043b\u044f \u043a\u0430\u0436\u0434\u043e\u0439 \u0441\u0442\u0440\u043e\u043a\u0438 \u043f\u043e\u0441\u043b\u0435 \u043d\u0430\u0436\u0430\u0442\u0438\u044f \u00ab\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c \u0438\u043c\u043f\u043e\u0440\u0442\u00bb."}
                        </p>
                      </div>

                      <span
                        data-testid="learner-import-preflight-attention-count"
                        className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                          selectedPreflightAttentionCount
                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        }`}
                      >
                        {selectedPreflightAttentionCount
                          ? `\u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f: ${selectedPreflightAttentionCount}`
                          : "\u041a\u0440\u0438\u0442\u0438\u0447\u043d\u044b\u0445 \u043a\u043e\u043d\u0444\u043b\u0438\u043a\u0442\u043e\u0432 \u043d\u0435\u0442"}
                      </span>
                    </div>

                    <div
                      data-testid="learner-import-preflight-summary"
                      className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                    >
                      <SummaryCard
                        label={"\u041d\u043e\u0432\u044b\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438"}
                        value={selectedPreflight.new_users_count || 0}
                        tone="blue"
                      />
                      <SummaryCard
                        label={"\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u044b"}
                        value={selectedPreflight.existing_inactive_users_count || 0}
                        tone="green"
                      />
                      <SummaryCard
                        label={"\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u044b"}
                        value={selectedPreflight.existing_active_users_count || 0}
                        tone="green"
                      />
                      <SummaryCard
                        label={"\u0423\u0436\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u044b"}
                        value={selectedPreflight.existing_enrollments_count || 0}
                      />
                      <SummaryCard
                        label={"\u041a\u043e\u043d\u0444\u043b\u0438\u043a\u0442\u044b \u043b\u0438\u0447\u043d\u043e\u0441\u0442\u0438"}
                        value={selectedPreflight.identity_conflicts_count || 0}
                        tone="red"
                      />
                      <SummaryCard
                        label={"\u041d\u0435\u0432\u0430\u043b\u0438\u0434\u043d\u044b\u0435 \u0441\u0442\u0440\u043e\u043a\u0438"}
                        value={selectedPreflight.invalid_rows_count || 0}
                        tone="red"
                      />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <SummaryCard
                        label={"\u041d\u043e\u0432\u044b\u0435 \u043f\u0440\u043e\u0444\u0438\u043b\u0438"}
                        value={selectedPreflight.new_profiles_count || 0}
                      />
                      <SummaryCard
                        label={"\u041e\u0431\u043d\u043e\u0432\u043b\u044f\u0435\u043c\u044b\u0435 \u043f\u0440\u043e\u0444\u0438\u043b\u0438"}
                        value={selectedPreflight.updated_profiles_count || 0}
                      />
                      <SummaryCard
                        label={"\u041d\u043e\u0432\u044b\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f"}
                        value={selectedPreflight.new_enrollments_count || 0}
                        tone="blue"
                      />
                      <SummaryCard
                        label={"\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430 \u043f\u0430\u0440\u043e\u043b\u044f"}
                        value={selectedPreflight.password_setup_invitations_count || 0}
                        tone="green"
                      />
                      <SummaryCard
                        label={"\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f \u043e \u043a\u0443\u0440\u0441\u0435"}
                        value={selectedPreflight.new_course_notifications_count || 0}
                        tone="green"
                      />
                    </div>
                  </div>
                ) : selectedImport.status === "applied" ? (
                  <div
                    data-testid="learner-import-apply-result-card"
                    className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200"
                  >
                    <div className="text-sm font-black text-emerald-950">
                      {"\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u0440\u0438\u043c\u0435\u043d\u0435\u043d\u0438\u044f"}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <SummaryCard
                        label={"\u0421\u043e\u0437\u0434\u0430\u043d\u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439"}
                        value={selectedImport.created_users_count || 0}
                        tone="green"
                      />
                      <SummaryCard
                        label={"\u0421\u043e\u0437\u0434\u0430\u043d\u043e \u043f\u0440\u043e\u0444\u0438\u043b\u0435\u0439"}
                        value={selectedImport.created_profiles_count || 0}
                        tone="green"
                      />
                      <SummaryCard
                        label={"\u0421\u043e\u0437\u0434\u0430\u043d\u043e \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0439"}
                        value={selectedImport.created_enrollments_count || 0}
                        tone="green"
                      />
                    </div>
                  </div>
                ) : null}


                {selectedImport.invitations?.length ? (
                  <div
                    data-testid="learner-import-invitations-card"
                    className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-emerald-950">
                          {"\u0421\u0441\u044b\u043b\u043a\u0438 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438 \u043f\u0430\u0440\u043e\u043b\u044f"}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-emerald-800">
                          {"\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u0440\u0430\u0437\u0443 \u043f\u043e\u0441\u043b\u0435 \u043f\u0440\u0438\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0438\u043c\u043f\u043e\u0440\u0442\u0430. \u0415\u0441\u043b\u0438 SMTP \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d, \u0441\u0441\u044b\u043b\u043a\u0438 \u043d\u0443\u0436\u043d\u043e \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0432\u0440\u0443\u0447\u043d\u0443\u044e."}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                        {selectedImport.invitations.length}
                      </span>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-emerald-100">
                      <table className="min-w-full divide-y divide-emerald-100 text-sm">
                        <thead className="bg-emerald-50/70 text-left text-xs font-bold uppercase tracking-wide text-emerald-700">
                          <tr>
                            <th className="px-4 py-3">{"\u0421\u0442\u0440\u043e\u043a\u0430"}</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Email-\u0441\u0442\u0430\u0442\u0443\u0441</th>
                            <th className="px-4 py-3">{"\u0421\u0441\u044b\u043b\u043a\u0430"}</th>
                            <th className="px-4 py-3 text-right">{"\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100">
                          {selectedImport.invitations.map((invitation) => {
                            const key = invitation.row_id || invitation.user_id || invitation.email || invitation.setup_url;
                            const isCopied = copiedInvitationKey === key;

                            return (
                              <tr key={key}>
                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  {invitation.row_number || "-"}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {invitation.email || "-"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${getImportInvitationEmailDeliveryClassName(invitation.email_delivery_status)}`}
                                  >
                                    {getImportInvitationEmailDeliveryLabel(invitation.email_delivery_status)}
                                  </span>
                                  {invitation.email_delivery_error ? (
                                    <div className="mt-1 text-xs text-red-600">
                                      {invitation.email_delivery_error}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="max-w-md px-4 py-3">
                                  <div className="break-all rounded-xl bg-slate-50 p-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
                                    {invitation.setup_url}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyImportInvitation(invitation)}
                                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
                                  >
                                    {isCopied ? "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e" : "\u041a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {selectedImport.course_notifications?.length ? (
                  <div
                    data-testid="learner-import-course-notifications-card"
                    className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-blue-950">
                          {"\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f \u043e \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0438 \u043a\u0443\u0440\u0441\u0430"}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-blue-800">
                          {"\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438 \u043f\u0438\u0441\u0435\u043c \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u043c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f\u043c, \u043a\u043e\u0442\u043e\u0440\u044b\u043c \u0431\u044b\u043b \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d \u043d\u043e\u0432\u044b\u0439 \u043a\u0443\u0440\u0441."}
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">
                        {selectedImport.course_notifications.length}
                      </span>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-blue-100">
                      <table className="min-w-full divide-y divide-blue-100 text-sm">
                        <thead className="bg-blue-50/70 text-left text-xs font-bold uppercase tracking-wide text-blue-700">
                          <tr>
                            <th className="px-4 py-3">
                              {"\u0421\u0442\u0440\u043e\u043a\u0430"}
                            </th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">
                              {"\u041a\u0443\u0440\u0441"}
                            </th>
                            <th className="px-4 py-3">
                              Email-{"\u0441\u0442\u0430\u0442\u0443\u0441"}
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-blue-100">
                          {selectedImport.course_notifications.map((notification) => {
                            const key =
                              notification.row_id
                              || notification.user_id
                              || notification.email
                              || notification.course_id;

                            return (
                              <tr key={key}>
                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  {notification.row_number || DASH}
                                </td>

                                <td className="px-4 py-3 text-slate-700">
                                  {notification.email || DASH}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-800">
                                    {notification.course_title || DASH}
                                  </div>

                                  {notification.course_id ? (
                                    <div className="mt-1 text-xs text-slate-400">
                                      {notification.course_id}
                                    </div>
                                  ) : null}
                                </td>

                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${getImportInvitationEmailDeliveryClassName(notification.email_delivery_status)}`}
                                  >
                                    {getImportInvitationEmailDeliveryLabel(notification.email_delivery_status)}
                                  </span>

                                  {notification.email_delivery_detail ? (
                                    <div className="mt-1 text-xs text-slate-500">
                                      {notification.email_delivery_detail}
                                    </div>
                                  ) : null}

                                  {notification.email_delivery_error ? (
                                    <div className="mt-1 text-xs font-semibold text-red-600">
                                      {notification.email_delivery_error}
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}


                                <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
                  <button
                    type="button"
                    onClick={downloadSelectedImportErrors}
                    disabled={!selectedImportHasErrors}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:ring-slate-200"
                  >
                    Скачать ошибки CSV
                  </button>

                  <div className="grid grid-cols-3 overflow-hidden rounded-2xl bg-slate-100 p-1 text-xs font-black text-slate-600">
                    {[
                      ["all", `Все строки (${selectedRows.length})`],
                      ["valid", `Валидные (${selectedImport.valid_rows || 0})`],
                      ["invalid", `С ошибками (${selectedImport.invalid_rows || 0})`],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRowFilter(key)}
                        className={`rounded-xl px-3 py-2 transition ${rowFilter === key ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/70"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

<div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">№</th>
                        <th className="px-4 py-3">Статус</th>
                        <th
                          data-testid="learner-import-preflight-row-decision"
                          className="px-4 py-3"
                        >
                          {"\u0420\u0435\u0448\u0435\u043d\u0438\u0435"}
                        </th>
                        <th className="px-4 py-3">ФИО / Email</th>
                        <th className="px-4 py-3">Контекст</th>
                        <th className="px-4 py-3">Ошибки</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {visibleSelectedRows.map((row) => {
                        const preflightRow =
                          selectedPreflightRowsByKey.get(`row_id:${row.id}`)
                          || selectedPreflightRowsByKey.get(`row_number:${row.row_number}`);
                        const appliedRowOutcome = row.classification ? row : null;
                        const decisionRow = preflightRow || appliedRowOutcome;

                        return (
                          <tr key={row.id}>
                            <td className="px-4 py-3 font-semibold text-slate-700">{row.row_number}</td>
                            <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                            <td className="min-w-[260px] px-4 py-3">
                              {decisionRow ? (
                                <div className="space-y-2">
                                  <PreflightClassificationPill
                                    classification={decisionRow.classification}
                                  />
                                  <div className="text-xs leading-5 text-slate-600">
                                    {getPreflightRowActionSummary(decisionRow)}
                                  </div>
                                  {decisionRow.email_delivery_status ? (
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className="font-semibold text-slate-500">
                                        {"\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430:"}
                                      </span>
                                      <span
                                        data-testid="learner-import-row-delivery-status"
                                        className={`inline-flex rounded-full px-2.5 py-1 font-black ring-1 ${getImportInvitationEmailDeliveryClassName(decisionRow.email_delivery_status)}`}
                                      >
                                        {getImportInvitationEmailDeliveryLabel(decisionRow.email_delivery_status)}
                                      </span>
                                    </div>
                                  ) : null}
                                  {decisionRow.email_delivery_detail ? (
                                    <div className="text-xs leading-5 text-slate-500">
                                      {decisionRow.email_delivery_detail}
                                    </div>
                                  ) : null}
                                  {decisionRow.email_delivery_error ? (
                                    <div className="rounded-xl bg-rose-50 p-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
                                      {decisionRow.email_delivery_error}
                                    </div>
                                  ) : null}
                                  {decisionRow.error_message ? (
                                    <div className="rounded-xl bg-rose-50 p-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
                                      {decisionRow.error_message}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-slate-400">{DASH}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{getRowName(row)}</div>
                              <div className="mt-1 text-xs text-slate-500">{getRowContact(row)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <ImportRowContextCell
                                row={row}
                                selectedImport={selectedImport}
                                courses={courses}
                                organizations={organizations}
                                learningGroups={learningGroups}
                              />
                            </td>
                            <td className="px-4 py-3">
                              {row.validation_errors_json?.length ? (
                                <ul className="list-disc space-y-1 pl-5 text-rose-700">
                                  {row.validation_errors_json.map((item) => <li key={item}>{formatValidationError(item)}</li>)}
                                </ul>
                              ) : (
                                <span className="text-slate-400">{DASH}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-slate-500">
                  Показано строк: {visibleSelectedRows.length} из {selectedRows.length}.
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200">
                Детали импорта не выбраны.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

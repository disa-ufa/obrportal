import { getApiErrorMessage } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createAdminDocument,
  deleteAdminDocument,
  downloadAdminDocument,
  getAdminCourses,
  getAdminDocuments,
  getAdminEnrollments,
  getAdminUsers,
  getAdminWorklistSummary,
  updateAdminDocument,
} from "../api/client";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";
import { Alert } from "../components/ui/Alert";
import { DocumentVerificationQrBlock } from "../components/documents/DocumentVerificationQrBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { AdminSummaryCard, AdminWorkflowLink } from "../components/admin/AdminWorkCenter";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { buildDocumentVerificationPath } from "../utils/documentVerification";
import {
  buildCoursesPath,
  buildDocumentsPath,
  buildEnrollmentsPath,
} from "../utils/adminLinks";

const DOCUMENT_STATUSES = [
  { value: "available", label: "Доступен" },
  { value: "draft", label: "Черновик" },
  { value: "revoked", label: "Отозван" },
];

const DOCUMENT_API_ERROR_MESSAGES = {
  loadFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b.",
  createFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442.",
  updateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442.",
  statusChangeFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.",
  downloadFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u0430\u0447\u0430\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442.",
  deleteFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442.",
  accessDenied: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c\u0438.",
  notFound: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0438\u043b\u0438 \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0439 \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.",
  duplicateNumber: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0441 \u0442\u0430\u043a\u0438\u043c \u043d\u043e\u043c\u0435\u0440\u043e\u043c \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  invalidStatus: "\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.",
  invalidRevocationReason: "\u041f\u0440\u0438\u0447\u0438\u043d\u0443 \u043e\u0442\u0437\u044b\u0432\u0430 \u043c\u043e\u0436\u043d\u043e \u0443\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0434\u043b\u044f \u043e\u0442\u043e\u0437\u0432\u0430\u043d\u043d\u044b\u0445 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432.",
  revocationReasonRequired: "\u0414\u043b\u044f \u043e\u0442\u0437\u044b\u0432\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443.",
  fileRequiredForPublish: "\u041d\u0435\u043b\u044c\u0437\u044f \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0431\u0435\u0437 \u0444\u0430\u0439\u043b\u0430. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u0430\u0439\u043b.",
  fileNotFound: "\u0424\u0430\u0439\u043b \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0432 \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0435.",
  fileTypeNotAllowed: "\u041d\u0435\u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u044b\u0439 \u0442\u0438\u043f \u0444\u0430\u0439\u043b\u0430. \u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u044b PDF, DOC, DOCX, JPG, JPEG \u0438 PNG.",
  invalidRequest: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0435\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.",
};


function getDocumentStatusLabel(status) {
  return DOCUMENT_STATUSES.find((item) => item.value === status)?.label || status || "-";
}
function formatDocumentApiError(err, fallback) {
  const status = err?.status ? `${err.status}` : "";
  const message = getApiErrorMessage(err);
  const normalizedMessage = message.toLowerCase();

  let readableMessage = fallback;

  if (status === "403") {
    readableMessage = DOCUMENT_API_ERROR_MESSAGES.accessDenied;
  } else if (status === "404") {
    readableMessage = normalizedMessage.includes("file")
      ? DOCUMENT_API_ERROR_MESSAGES.fileNotFound
      : DOCUMENT_API_ERROR_MESSAGES.notFound;
  } else if (status === "409" && normalizedMessage.includes("number")) {
    readableMessage = DOCUMENT_API_ERROR_MESSAGES.duplicateNumber;
  } else if (status === "422" && normalizedMessage.includes("status")) {
    readableMessage = DOCUMENT_API_ERROR_MESSAGES.invalidStatus;
  } else if (
    normalizedMessage.includes("revocation reason is allowed only for revoked documents")
  ) {
    readableMessage = DOCUMENT_API_ERROR_MESSAGES.invalidRevocationReason;
  } else if (
    status === "422" &&
    normalizedMessage.includes("revocation") &&
    normalizedMessage.includes("reason")
  ) {
    readableMessage = DOCUMENT_API_ERROR_MESSAGES.revocationReasonRequired;
  } else if (
    normalizedMessage.includes("extension") ||
    normalizedMessage.includes("file type") ||
    normalizedMessage.includes("allowed")
  ) {
    readableMessage = DOCUMENT_API_ERROR_MESSAGES.fileTypeNotAllowed;
  } else if (status === "422") {
    readableMessage = DOCUMENT_API_ERROR_MESSAGES.invalidRequest;
  } else if (message) {
    readableMessage = message;
  }

  return `${status} ${readableMessage}`.trim();
}

function getDocumentStatusTone(status) {
  switch (status) {
    case "available":
      return "bg-green-50 text-green-700 ring-green-200";
    case "draft":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "revoked":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function isDocumentActionRequired(documentItem) {
  if (!documentItem) {
    return false;
  }

  if (documentItem.status === "revoked") {
    return true;
  }

  if (documentItem.status === "draft") {
    return true;
  }

  return documentItem.status === "available" && !documentItem.file_available;
}

function getDocumentActionRequiredHint(documentItem) {
  if (!isDocumentActionRequired(documentItem)) {
    return null;
  }

  if (documentItem.status === "revoked") {
    return {
      title: "Требуется проверка отозванного документа",
      description: "Проверьте причину отзыва, историю изменений и при необходимости восстановите документ после корректировки.",
      toneClass: "bg-red-50 text-red-800 ring-red-200",
      actionLabel: "Проверить отзыв",
    };
  }

  if (documentItem.status === "draft") {
    return {
      title: "Требуется публикация или доработка черновика",
      description: "Проверьте данные документа, загрузите файл при необходимости и переведите документ в доступные.",
      toneClass: "bg-amber-50 text-amber-800 ring-amber-200",
      actionLabel: "Доработать документ",
    };
  }

  return {
    title: "Требуется файл для опубликованного документа",
    description: "Документ опубликован, но файл не загружен. Слушатель и публичная проверка не смогут получить корректный PDF.",
    toneClass: "bg-amber-50 text-amber-800 ring-amber-200",
    actionLabel: "Загрузить файл",
  };
}


function calculateDocumentStatusCounts(items) {
  const counts = {
    all: Array.isArray(items) ? items.length : 0,
    available: 0,
    draft: 0,
    revoked: 0,
  };

  if (!Array.isArray(items)) {
    return counts;
  }

  items.forEach((item) => {
    if (Object.prototype.hasOwnProperty.call(counts, item.status)) {
      counts[item.status] += 1;
    }
  });

  return counts;
}

function getLearnerVisibilityLabel(documentItem) {
  if (documentItem.status === "available" && documentItem.file_available) {
    return "Слушатель может скачать";
  }

  if (documentItem.status === "available" && !documentItem.file_available) {
    return "Нужен файл для скачивания";
  }

  if (documentItem.file_available) {
    return "Файл скрыт от слушателя";
  }

  return "Файл не загружен";
}

function getLearnerVisibilityTone(documentItem) {
  if (documentItem.status === "available" && documentItem.file_available) {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (documentItem.file_available) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}


function isGeneratedCompletionDocument(documentItem) {
  const documentNumber = String(documentItem.document_number || "");

  return Boolean(
    documentItem.enrollment_id &&
      documentItem.file_available &&
      documentNumber.startsWith("AUTO-")
  );
}

function canPublishGeneratedCompletionDocument(documentItem) {
  return documentItem.status === "draft" && isGeneratedCompletionDocument(documentItem);
}

function getAdminDocumentDownloadLabel(documentItem) {
  if (isGeneratedCompletionDocument(documentItem)) {
    return "Скачать PDF";
  }

  return "Скачать файл";
}

function getGeneratedCompletionNotice(documentItem) {
  if (canPublishGeneratedCompletionDocument(documentItem)) {
    return {
      title: "Итоговый PDF уже сформирован",
      text: "Документ создан автоматически после завершения обучения. Его можно опубликовать без повторной загрузки файла.",
      toneClass: "bg-green-50 text-green-800 ring-green-200",
    };
  }

  if (documentItem.status === "available") {
    return {
      title: "Итоговый PDF опубликован",
      text: "Слушатель может скачать документ, а публичная проверка подтверждает его по номеру или коду.",
      toneClass: "bg-blue-50 text-blue-800 ring-blue-200",
    };
  }

  if (documentItem.status === "revoked") {
    return {
      title: "Итоговый PDF отозван",
      text: "Документ остаётся в реестре, но публичная проверка показывает, что он отозван.",
      toneClass: "bg-red-50 text-red-800 ring-red-200",
    };
  }

  return {
    title: "Итоговый PDF скрыт от слушателя",
    text: "Файл есть в приватном хранилище, но скачивание и публичное подтверждение станут доступными только после публикации.",
    toneClass: "bg-amber-50 text-amber-800 ring-amber-200",
  };
}

function getEnrollmentOptionLabel(enrollment) {
  const courseTitle = enrollment.course_title || "Программа без названия";
  const status = getEnrollmentStatusLabel(enrollment.status);
  const group = enrollment.learning_group_name ? ` · ${enrollment.learning_group_name}` : "";
  const organization = enrollment.organization_name ? ` · ${enrollment.organization_name}` : "";

  return `${courseTitle} · ${status}${group}${organization}`;
}

function getDocumentFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    user_id: params.get("user_id") || "",
    enrollment_id: params.get("enrollment_id") || "",
    status: params.get("status") || "",
    document_type: params.get("document_type") || "",
    q: params.get("q") || "",
    action_required: params.get("action_required") === "true" ? "true" : "",
  };
}

function getCourseOptionLabel(course) {
  const title = course.title || "Программа без названия";
  const hours = course.hours ? ` / ${course.hours} ч.` : "";
  const format = course.format ? ` / ${course.format}` : "";
  const documentType = course.document_type ? ` / ${course.document_type}` : "";

  return `${title}${hours}${format}${documentType}`;
}

function getEnrollmentStatusLabel(status) {
  const labels = {
    active: "В процессе",
    assigned: "Назначен",
    in_progress: "В процессе",
    completed: "Завершён",
    cancelled: "Отменён",
  };

  return labels[status] || status || "-";
}

function getRevocationActorLabel(documentItem) {
  const name = documentItem.revoked_by_user_full_name || "";
  const email = documentItem.revoked_by_user_email || "";

  if (name && email) {
    return `${name} / ${email}`;
  }

  return name || email || "-";
}

function buildEditForm(documentItem) {
  return {
    title: documentItem.title || "",
    document_type: documentItem.document_type || "",
    document_number: documentItem.document_number || "",
    status: documentItem.status || "available",
    revocation_reason: documentItem.revocation_reason || "",
    course_id: documentItem.course_id || "",
    enrollment_id: documentItem.enrollment_id || "",
  };
}

function DocumentsSummaryCards({ documentStatusCounts, documents, courses, enrollments }) {
  const filesCount = documents.filter((documentItem) => documentItem.file_available).length;
  const completedEnrollmentsCount = enrollments.filter(
    (enrollment) => enrollment.status === "completed"
  ).length;
  const activeCoursesCount = courses.filter((course) => course.is_active).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard
        title="Всего документов"
        value={documentStatusCounts.all || 0}
        hint="По текущему набору фильтров без учёта статуса."
        to={buildDocumentsPath()}
      />
      <AdminSummaryCard
        title="Доступные"
        value={documentStatusCounts.available || 0}
        hint="Опубликованы для слушателей."
        to={buildDocumentsPath({ status: "available" })}
      />
      <AdminSummaryCard
        title="Черновики"
        value={documentStatusCounts.draft || 0}
        hint="Требуют проверки или публикации."
        to={buildDocumentsPath({ status: "draft" })}
      />
      <AdminSummaryCard
        title="Файлы / курсы / завершения"
        value={`${filesCount}/${activeCoursesCount}/${completedEnrollmentsCount}`}
        hint="Видимые файлы / активные курсы / completed назначения."
      />
    </div>
  );
}

function DocumentsWorkflowPanel({ documentStatusCounts, courses, enrollments }) {
  const firstActiveCourse = courses.find((course) => course.is_active) || courses[0];
  const firstCompletedEnrollment = enrollments.find(
    (enrollment) => enrollment.status === "completed"
  );

  return (
    <SectionCard
      title="Рабочие сценарии"
      subtitle="Быстрые переходы для публикации, проверки и выпуска документов."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminWorkflowLink
          title="Опубликовать черновики"
          description={`Открыть draft документы: ${documentStatusCounts.draft || 0}.`}
          to={buildDocumentsPath({ status: "draft" })}
        />
        <AdminWorkflowLink
          title="Проверить доступные"
          description={`Открыть документы, видимые слушателям: ${documentStatusCounts.available || 0}.`}
          to={buildDocumentsPath({ status: "available" })}
        />
        <AdminWorkflowLink
          title="Разобрать отозванные"
          description={`Открыть revoked документы: ${documentStatusCounts.revoked || 0}.`}
          to={buildDocumentsPath({ status: "revoked" })}
        />
        <AdminWorkflowLink
          title="Завершённые назначения"
          description="Перейти к назначениям, из которых выпускаются итоговые документы."
          to={
            firstCompletedEnrollment
              ? buildEnrollmentsPath({
                  status: "completed",
                  course_id: firstCompletedEnrollment.course_id,
                })
              : buildCoursesPath(firstActiveCourse ? { q: firstActiveCourse.slug || firstActiveCourse.title } : {})
          }
        />
      </div>
    </SectionCard>
  );
}


export function DocumentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getDocumentFiltersFromSearch(location.search);
  const [documents, setDocuments] = useState([]);
  const [documentStatusCounts, setDocumentStatusCounts] = useState({
    all: 0,
    available: 0,
    draft: 0,
    revoked: 0,
  });
  const [documentActionRequiredCount, setDocumentActionRequiredCount] = useState(0);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const [filterUserId, setFilterUserId] = useState(initialFilters.user_id);
  const [filterEnrollmentId, setFilterEnrollmentId] = useState(initialFilters.enrollment_id);
  const [filterStatus, setFilterStatus] = useState(initialFilters.status);
  const [filterDocumentType, setFilterDocumentType] = useState(initialFilters.document_type);
  const [filterQuery, setFilterQuery] = useState(initialFilters.q);
  const [filterActionRequired, setFilterActionRequired] = useState(initialFilters.action_required);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSavingId, setEditSavingId] = useState("");
  const [downloadSavingId, setDownloadSavingId] = useState("");
  const [deleteSavingId, setDeleteSavingId] = useState("");
  const [statusSavingKey, setStatusSavingKey] = useState("");
  const [revokingDocumentId, setRevokingDocumentId] = useState("");
  const [revocationReason, setRevocationReason] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    user_id: "",
    title: "",
    document_type: "Сертификат",
    document_number: "",
    status: "available",
    revocation_reason: "",
    course_id: "",
    enrollment_id: "",
  });
  const [file, setFile] = useState(null);

  const [editingDocumentId, setEditingDocumentId] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    document_type: "",
    document_number: "",
    status: "available",
    revocation_reason: "",
    course_id: "",
    enrollment_id: "",
  });
  const [editFile, setEditFile] = useState(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === form.user_id) || null,
    [form.user_id, users]
  );
  const selectedUserEnrollments = useMemo(
    () => enrollments.filter((enrollment) => enrollment.user_id === form.user_id),
    [enrollments, form.user_id]
  );

  const selectedEnrollment = useMemo(
    () => enrollments.find((enrollment) => enrollment.id === form.enrollment_id) || null,
    [enrollments, form.enrollment_id]
  );

  const selectedCourse = useMemo(() => {
    const selectedCourseId = selectedEnrollment?.course_id || form.course_id;

    return courses.find((course) => course.id === selectedCourseId) || null;
  }, [courses, form.course_id, selectedEnrollment]);


  const selectedFilterEnrollment = useMemo(
    () => enrollments.find((enrollment) => enrollment.id === filterEnrollmentId) || null,
    [enrollments, filterEnrollmentId]
  );

  const showActionRequiredOnly = filterActionRequired === "true";
  const displayedDocuments = documents;

  useEffect(() => {
    if (!filterEnrollmentId || !selectedFilterEnrollment) {
      return;
    }

    setForm((current) => {
      const hasManualDocumentData =
        Boolean(current.title.trim()) ||
        Boolean(current.document_number.trim()) ||
        Boolean(file);

      if (hasManualDocumentData && current.enrollment_id !== filterEnrollmentId) {
        return current;
      }

      return {
        ...current,
        user_id: selectedFilterEnrollment.user_id || current.user_id,
        enrollment_id: selectedFilterEnrollment.id,
        course_id: selectedFilterEnrollment.course_id || current.course_id,
      };
    });
  }, [filterEnrollmentId, selectedFilterEnrollment, file]);

  function buildDocumentFilters(overrides = {}) {
    return {
      user_id: overrides.user_id ?? filterUserId,
      enrollment_id: overrides.enrollment_id ?? filterEnrollmentId,
      status: overrides.status ?? filterStatus,
      document_type: overrides.document_type ?? filterDocumentType,
      q: overrides.q ?? filterQuery,
      action_required: overrides.action_required ?? filterActionRequired,
    };
  }

  function getDocumentFilterPath(overrides = {}) {
    return buildDocumentsPath({
      ...buildDocumentFilters(),
      ...overrides,
    });
  }

  function getEnrollmentFilterPath(filters = {}) {
    return buildEnrollmentsPath(filters);
  }

  async function navigateToDocumentFilters(filters, options = {}) {
    const nextPath = buildDocumentsPath(filters);
    const currentPath = `${location.pathname}${location.search}`;

    if (currentPath === nextPath) {
      await loadData(filters);
      return;
    }

    navigate(nextPath, options);
  }

  async function loadData(nextFilters = null) {
    try {
      setLoading(true);
      setError("");

      const filters = nextFilters ?? buildDocumentFilters();
      const activeFilters = { limit: 300, ...filters };

      const [
        documentsResponse,
        usersResponse,
        coursesResponse,
        enrollmentsResponse,
        worklistSummaryResponse,
      ] = await Promise.all([
        getAdminDocuments(activeFilters),
        getAdminUsers(),
        getAdminCourses({ limit: 300 }),
        getAdminEnrollments({ limit: 300 }),
        getAdminWorklistSummary({
          documents_user_id: filters.user_id,
          documents_enrollment_id: filters.enrollment_id,
          documents_document_type: filters.document_type,
          documents_q: filters.q,
        }),
      ]);

      const documentsSummary = worklistSummaryResponse?.documents || {};

      setDocuments(Array.isArray(documentsResponse) ? documentsResponse : []);
      setDocumentStatusCounts({
        all: documentsSummary.total || 0,
        available: documentsSummary.available || 0,
        draft: documentsSummary.draft || 0,
        revoked: documentsSummary.revoked || 0,
      });
      setDocumentActionRequiredCount(documentsSummary.action_required || 0);
      setUsers(Array.isArray(usersResponse) ? usersResponse : []);
      setCourses(Array.isArray(coursesResponse) ? coursesResponse : []);
      setEnrollments(Array.isArray(enrollmentsResponse) ? enrollmentsResponse : []);
    } catch (err) {
      setError(formatDocumentApiError(err, DOCUMENT_API_ERROR_MESSAGES.loadFailed));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const nextFilters = getDocumentFiltersFromSearch(location.search);

    setFilterUserId(nextFilters.user_id);
    setFilterEnrollmentId(nextFilters.enrollment_id);
    setFilterStatus(nextFilters.status);
    setFilterDocumentType(nextFilters.document_type);
    setFilterQuery(nextFilters.q);
    setFilterActionRequired(nextFilters.action_required);

    loadData(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  function updateField(field, value) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "user_id") {
        next.course_id = "";
        next.enrollment_id = "";
      }

      if (field === "enrollment_id" && value) {
        const enrollment = enrollments.find((item) => item.id === value);

        if (enrollment?.course_id) {
          next.course_id = enrollment.course_id;
        }
      }

      if (field === "status" && value !== "revoked") {
        next.revocation_reason = "";
      }

      return next;
    });
  }

  function updateEditField(field, value) {
    setEditForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "enrollment_id" && value) {
        const enrollment = enrollments.find((item) => item.id === value);

        if (enrollment?.course_id) {
          next.course_id = enrollment.course_id;
        }
      }

      if (field === "status" && value !== "revoked") {
        next.revocation_reason = "";
      }

      return next;
    });
  }

  function resetForm() {
    setForm({
      user_id: "",
      title: "",
      document_type: "Сертификат",
      document_number: "",
      status: "available",
      revocation_reason: "",
      course_id: "",
      enrollment_id: "",
    });
    setFile(null);

    const input = document.getElementById("admin-document-file");
    if (input) {
      input.value = "";
    }
  }

  function resetEditState() {
    setEditingDocumentId("");
    setEditForm({
      title: "",
      document_type: "",
      document_number: "",
      status: "available",
      revocation_reason: "",
      course_id: "",
      enrollment_id: "",
    });
    setEditFile(null);

    const input = document.getElementById("admin-document-edit-file");
    if (input) {
      input.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.user_id) {
      setError("Выберите пользователя для документа.");
      return;
    }

    if (!form.title.trim()) {
      setError("Введите название документа.");
      return;
    }

    if (!form.document_type.trim()) {
      setError("Введите тип документа.");
      return;
    }

    if (form.status === "revoked" && !form.revocation_reason.trim()) {
      setError("\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443 \u043e\u0442\u0437\u044b\u0432\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = new FormData();
      payload.append("user_id", form.user_id);
      payload.append("title", form.title.trim());
      payload.append("document_type", form.document_type.trim());
      payload.append("status", form.status);

      if (form.status === "revoked" && form.revocation_reason.trim()) {
        payload.append("revocation_reason", form.revocation_reason.trim());
      }

      if (form.course_id) {
        payload.append("course_id", form.course_id);
      }

      if (form.enrollment_id) {
        payload.append("enrollment_id", form.enrollment_id);
      }

      if (form.document_number.trim()) {
        payload.append("document_number", form.document_number.trim());
      }

      if (file) {
        payload.append("file", file);
      }

      const created = await createAdminDocument(payload);

      setSuccessMessage(`Документ создан: ${created.document_number}`);
      resetForm();
      await loadData(buildDocumentFilters());
    } catch (err) {
      setError(formatDocumentApiError(err, DOCUMENT_API_ERROR_MESSAGES.createFailed));
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit(documentItem) {
    setError("");
    setSuccessMessage("");
    setEditingDocumentId(documentItem.id);
    setEditForm(buildEditForm(documentItem));
    setEditFile(null);

    const input = document.getElementById("admin-document-edit-file");
    if (input) {
      input.value = "";
    }
  }

  async function handleEditSubmit(event, documentId) {
    event.preventDefault();

    if (!editForm.title.trim()) {
      setError("Введите название документа.");
      return;
    }

    if (!editForm.document_type.trim()) {
      setError("Введите тип документа.");
      return;
    }

    if (editForm.status === "revoked" && !editForm.revocation_reason.trim()) {
      setError("\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443 \u043e\u0442\u0437\u044b\u0432\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.");
      return;
    }

    try {
      setEditSavingId(documentId);
      setError("");
      setSuccessMessage("");

      const payload = new FormData();
      payload.append("title", editForm.title.trim());
      payload.append("document_type", editForm.document_type.trim());
      payload.append("document_number", editForm.document_number.trim());
      payload.append("status", editForm.status);

      if (editForm.status === "revoked" && editForm.revocation_reason.trim()) {
        payload.append("revocation_reason", editForm.revocation_reason.trim());
      }
      payload.append("course_id", editForm.course_id);
      payload.append("enrollment_id", editForm.enrollment_id);

      if (editFile) {
        payload.append("file", editFile);
      }

      const updated = await updateAdminDocument(documentId, payload);

      setSuccessMessage(`Документ обновлён: ${updated.document_number}`);
      resetEditState();
      await loadData(buildDocumentFilters());
    } catch (err) {
      setError(formatDocumentApiError(err, DOCUMENT_API_ERROR_MESSAGES.updateFailed));
    } finally {
      setEditSavingId("");
    }
  }

  function handleStartRevoke(documentItem) {
    setError("");
    setSuccessMessage("");
    setRevokingDocumentId(documentItem.id);
    setRevocationReason(documentItem.revocation_reason || "");
  }

  function handleCancelRevoke() {
    setRevokingDocumentId("");
    setRevocationReason("");
  }

  async function handleConfirmRevoke(documentItem) {
    if (!revocationReason.trim()) {
      setError("\u041e\u0442\u0437\u044b\u0432 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043f\u0440\u0438\u0447\u0438\u043d\u0443.");
      return;
    }

    await handleQuickStatusUpdate(documentItem, "revoked", revocationReason);
    handleCancelRevoke();
  }

  async function handleQuickStatusUpdate(documentItem, nextStatus, revocationReasonOverride = null) {
    if (nextStatus === "available" && !documentItem.file_available) {
      setError("Нельзя опубликовать документ без файла. Сначала загрузите файл в режиме редактирования.");
      return;
    }

    let revocationReason = "";

    if (nextStatus === "revoked") {
      revocationReason = (revocationReasonOverride || "").trim();

      if (!revocationReason) {
        setError("\u041e\u0442\u0437\u044b\u0432 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043f\u0440\u0438\u0447\u0438\u043d\u0443.");
        return;
      }
    }

    try {
      setStatusSavingKey(`${documentItem.id}:${nextStatus}`);
      setError("");
      setSuccessMessage("");

      const payload = new FormData();
      payload.append("status", nextStatus);

      if (nextStatus === "revoked") {
        payload.append("revocation_reason", revocationReason);
      }

      const updated = await updateAdminDocument(documentItem.id, payload);

      setSuccessMessage(
        `Статус документа ${updated.document_number} изменён: ${getDocumentStatusLabel(updated.status)}`
      );
      await loadData(buildDocumentFilters());
    } catch (err) {
      setError(formatDocumentApiError(err, DOCUMENT_API_ERROR_MESSAGES.statusChangeFailed));
    } finally {
      setStatusSavingKey("");
    }
  }

  async function handleAdminDownload(documentItem) {
    if (!documentItem.file_available) {
      setError("Файл документа недоступен для скачивания.");
      return;
    }

    try {
      setDownloadSavingId(documentItem.id);
      setError("");
      setSuccessMessage("");

      await downloadAdminDocument(documentItem.id);
    } catch (err) {
      setError(formatDocumentApiError(err, DOCUMENT_API_ERROR_MESSAGES.downloadFailed));
    } finally {
      setDownloadSavingId("");
    }
  }

  async function handleDelete(documentItem) {
    const confirmed = window.confirm(
      `Удалить документ ${documentItem.document_number}? Действие нельзя отменить.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleteSavingId(documentItem.id);
      setError("");
      setSuccessMessage("");

      await deleteAdminDocument(documentItem.id);

      if (editingDocumentId === documentItem.id) {
        resetEditState();
      }

      setSuccessMessage(`Документ удалён: ${documentItem.document_number}`);
      await loadData(buildDocumentFilters());
    } catch (err) {
      setError(formatDocumentApiError(err, DOCUMENT_API_ERROR_MESSAGES.deleteFailed));
    } finally {
      setDeleteSavingId("");
    }
  }

  async function handleApplyFilter(event) {
    event.preventDefault();
    await navigateToDocumentFilters(buildDocumentFilters());
  }

  async function handleQuickStatusFilter(nextStatus) {
    setFilterStatus(nextStatus);
    await navigateToDocumentFilters(buildDocumentFilters({ status: nextStatus }));
  }

  async function handleClearEnrollmentFilter() {
    setFilterEnrollmentId("");
    await navigateToDocumentFilters(buildDocumentFilters({ enrollment_id: "" }), { replace: true });
  }

  async function handleClearActionRequiredFilter() {
    setFilterActionRequired("");
    await navigateToDocumentFilters(buildDocumentFilters({ action_required: "" }), { replace: true });
  }

  async function handleToggleActionRequiredFilter() {
    const nextActionRequired = showActionRequiredOnly ? "" : "true";
    setFilterActionRequired(nextActionRequired);
    await navigateToDocumentFilters(buildDocumentFilters({ action_required: nextActionRequired }));
  }

  async function handleResetFilter() {
    setFilterUserId("");
    setFilterEnrollmentId("");
    setFilterStatus("");
    setFilterDocumentType("");
    setFilterQuery("");
    setFilterActionRequired("");
    await navigateToDocumentFilters({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Администрирование
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Документы пользователей
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Загрузка, редактирование и публикация сертификатов, удостоверений и других файлов.
          Черновик виден в личном кабинете слушателя, но скачать файл можно только после публикации документа
          со статусом «Доступен».
        </p>
      </section>

      {error && (
        <Alert title="Ошибка" tone="red">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert title="Готово" tone="green">
          {successMessage}
        </Alert>
      )}

      <DocumentsSummaryCards
        documentStatusCounts={documentStatusCounts}
        documents={documents}
        courses={courses}
        enrollments={enrollments}
      />

      <DocumentsWorkflowPanel
        documentStatusCounts={documentStatusCounts}
        courses={courses}
        enrollments={enrollments}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)]">
        <SectionCard title="Загрузить документ" subtitle="Файл будет сохранён в приватное хранилище">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Пользователь
              </span>
              <select
                value={form.user_id}
                onChange={(event) => updateField("user_id", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Выберите пользователя</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}{user.full_name ? ` — ${user.full_name}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedUser && (
              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-100">
                Документ будет назначен пользователю:{" "}
                <span className="font-semibold">{selectedUser.email}</span>
              </div>
            )}
            {selectedUser && (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Назначенная программа
                </span>
                <select
                  value={form.enrollment_id}
                  onChange={(event) => updateField("enrollment_id", event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Без привязки к назначению</option>
                  {selectedUserEnrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {getEnrollmentOptionLabel(enrollment)}
                    </option>
                  ))}
                </select>
                {selectedUserEnrollments.length === 0 && (
                  <span className="mt-2 block text-xs text-amber-700">
                    У выбранного пользователя пока нет назначенных программ.
                  </span>
                )}
              </label>
            )}

            {selectedUser && (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Программа / курс
                </span>
                <select
                  value={form.course_id}
                  onChange={(event) => updateField("course_id", event.target.value)}
                  disabled={Boolean(form.enrollment_id)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Без привязки к курсу</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {getCourseOptionLabel(course)}
                    </option>
                  ))}
                </select>
                {form.enrollment_id && selectedCourse && (
                  <span className="mt-2 block text-xs text-slate-500">
                    Курс выбран автоматически по назначенной программе: {selectedCourse.title}
                  </span>
                )}
              </label>
            )}

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Название документа
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Например: Сертификат о прохождении программы"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Тип документа
                </span>
                <input
                  type="text"
                  value={form.document_type}
                  onChange={(event) => updateField("document_type", event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Статус
                </span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {DOCUMENT_STATUSES.map((statusItem) => (
                    <option key={statusItem.value} value={statusItem.value}>
                      {statusItem.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {form.status === "revoked" && (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {"\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u043e\u0442\u0437\u044b\u0432\u0430"}
                </span>
                <textarea
                  value={form.revocation_reason}
                  onChange={(event) => updateField("revocation_reason", event.target.value)}
                  rows={3}
                  placeholder={"\u041a\u0440\u0430\u0442\u043a\u043e \u0443\u043a\u0430\u0436\u0438\u0442\u0435, \u043f\u043e\u0447\u0435\u043c\u0443 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d"}
                  className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <span className="mt-2 block text-xs text-slate-500">
                  {"\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u0431\u0443\u0434\u0435\u0442 \u0432\u0438\u0434\u043d\u0430 \u0432 \u0430\u0434\u043c\u0438\u043d\u0441\u043a\u043e\u043c \u0440\u0435\u0435\u0441\u0442\u0440\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432."}
                </span>
              </label>
            )}


            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Номер документа
              </span>
              <input
                type="text"
                value={form.document_number}
                onChange={(event) => updateField("document_number", event.target.value)}
                placeholder="Можно оставить пустым — номер сгенерируется автоматически"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Файл
              </span>
              <input
                id="admin-document-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
              <span className="mt-2 block text-xs text-slate-500">
                Допустимые форматы: PDF, DOC, DOCX, JPG, PNG.
              </span>
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Сохраняем..." : "Создать документ"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Очистить
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Список документов" subtitle="Документы из /api/v1/admin/documents">
          {filterEnrollmentId && (
            <div className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-blue-100">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">
                    Включён фильтр по назначению
                  </div>
                  <div className="mt-1 text-blue-800">
                    {selectedFilterEnrollment
                      ? `${selectedFilterEnrollment.user_email} → ${selectedFilterEnrollment.course_title}`
                      : `ID назначения: ${filterEnrollmentId}`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearEnrollmentFilter}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
                >
                  Показать все документы
                </button>
              </div>
            </div>
          )}

          <div className="mb-5 flex flex-wrap gap-2">
            {[
              { value: "", label: "Все", count: documentStatusCounts.all },
              ...DOCUMENT_STATUSES.map((statusItem) => ({
                ...statusItem,
                count: documentStatusCounts[statusItem.value] || 0,
              })),
            ].map((item) => {
              const isActive = filterStatus === item.value;

              return (
                <button
                  key={item.value || "all"}
                  type="button"
                  onClick={() => handleQuickStatusFilter(item.value)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                    isActive
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            data-testid="documents-worklist-summary-note"
            className="mb-5 text-xs text-slate-500"
          >
            Счётчики быстрых фильтров рассчитаны по текущим фильтрам страницы.
          </div>

          <div className="mb-5">
            <button
              type="button"
              data-testid="documents-action-required-filter"
              onClick={handleToggleActionRequiredFilter}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                showActionRequiredOnly
                  ? "bg-amber-600 text-white ring-amber-600"
                  : "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100"
              }`}
            >
              <span>{"\u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f"}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  showActionRequiredOnly ? "bg-white/20 text-white" : "bg-white text-amber-800"
                }`}
              >
                {documentActionRequiredCount}
              </span>
            </button>
          </div>

          {showActionRequiredOnly && (
            <div
              data-testid="documents-action-required-banner"
              className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">
                    Включён режим контроля документов
                  </div>
                  <p className="mt-1 leading-6 text-amber-800">
                    Показаны только черновики, отозванные документы и опубликованные записи без файла.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClearActionRequiredFilter}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
                >
                  Показать все документы
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleApplyFilter} className="mb-5 grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]">
            <input
              type="search"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Поиск: номер, код, название, e-mail, ФИО"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <select
              value={filterUserId}
              onChange={(event) => setFilterUserId(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Все пользователи</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}{user.full_name ? ` — ${user.full_name}` : ""}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Все статусы</option>
              {DOCUMENT_STATUSES.map((statusItem) => (
                <option key={statusItem.value} value={statusItem.value}>
                  {statusItem.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={filterDocumentType}
              onChange={(event) => setFilterDocumentType(event.target.value)}
              placeholder="Тип документа"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Применить
            </button>

            <button
              type="button"
              onClick={handleResetFilter}
              className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Сбросить
            </button>
          </form>

          <div className="mb-5 flex flex-wrap gap-3 text-sm text-slate-500">
            <span>Показано документов: {displayedDocuments.length}</span>
            <span>Всего по текущим фильтрам: {documentStatusCounts.all || 0}</span>
            <span>Требуют действия: {documentActionRequiredCount}</span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загружаем документы...
            </div>
          ) : displayedDocuments.length === 0 ? (
            <AdminEmptyState
              title={
                showActionRequiredOnly
                  ? "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b, \u0442\u0440\u0435\u0431\u0443\u044e\u0449\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f, \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b"
                  : "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b"
              }
              description={
                showActionRequiredOnly
                  ? "\u0412\u0441\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0432\u044b\u0431\u043e\u0440\u043a\u0435 \u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u044e\u0442 \u0441\u0440\u043e\u0447\u043d\u043e\u0433\u043e \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f."
                  : "\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u044f\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440 \u043f\u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044e, \u0441\u0442\u0430\u0442\u0443\u0441\u0443, \u0442\u0438\u043f\u0443 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0438\u043b\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043f\u0435\u0440\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442."
              }
              resetLabel={
                showActionRequiredOnly
                  ? "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b"
                  : "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440"
              }
              onReset={showActionRequiredOnly ? handleClearActionRequiredFilter : handleResetFilter}
            />
          ) : (
            <div className="space-y-4">
              {displayedDocuments.map((documentItem) => {
                const isEditing = editingDocumentId === documentItem.id;
                const isEditSaving = editSavingId === documentItem.id;
                const isDownloadSaving = downloadSavingId === documentItem.id;
                const isDeleteSaving = deleteSavingId === documentItem.id;
                const isPublishing = statusSavingKey === `${documentItem.id}:available`;
                const isDrafting = statusSavingKey === `${documentItem.id}:draft`;
                const isRevoking = statusSavingKey === `${documentItem.id}:revoked`;
                const isRevokingFormOpen = revokingDocumentId === documentItem.id;
                const showMissingFileActionHint =
                  !documentItem.file_available && documentItem.status !== "available";
                const isGeneratedCompletion = isGeneratedCompletionDocument(documentItem);
                const canPublishGeneratedCompletion = canPublishGeneratedCompletionDocument(documentItem);
                const generatedCompletionNotice = isGeneratedCompletion
                  ? getGeneratedCompletionNotice(documentItem)
                  : null;
                const verificationTarget =
                  documentItem.verification_code || documentItem.document_number || "";
                const verificationPath = verificationTarget
                  ? buildDocumentVerificationPath(verificationTarget)
                  : "";
                const documentCourse =
                  courses.find((course) => course.id === documentItem.course_id) || null;
                const documentActionHint = getDocumentActionRequiredHint(documentItem);

                return (
                  <article
                    key={documentItem.id}
                    className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-200"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getDocumentStatusTone(
                          documentItem.status
                        )}`}
                      >
                        {getDocumentStatusLabel(documentItem.status)}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                        {documentItem.document_type}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                        {isGeneratedCompletion ? "PDF сформирован" : documentItem.file_available ? "Файл загружен" : "Без файла"}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getLearnerVisibilityTone(
                          documentItem
                        )}`}
                      >
                        {getLearnerVisibilityLabel(documentItem)}
                      </span>
                    </div>

                    {!isEditing ? (
                      <>
                        <div className="mt-4">
                          <h2 className="text-xl font-bold text-slate-900">
                            {documentItem.title}
                          </h2>
                          <div className="mt-1 text-sm text-slate-500">
                            {documentItem.document_number}
                          </div>
                          <div className="mt-1 break-all text-xs font-semibold text-blue-700">
                            Код проверки: {documentItem.verification_code || "—"}
                          </div>
                        </div>

                        <div
                          data-testid="document-state-panel"
                          className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200 md:grid-cols-4"
                        >
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {"\u0421\u0442\u0430\u0442\u0443\u0441"}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {getDocumentStatusLabel(documentItem.status)}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {"\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c"}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {getLearnerVisibilityLabel(documentItem)}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {"\u0424\u0430\u0439\u043b / PDF"}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {isGeneratedCompletion
                                ? "\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 PDF \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d"
                                : documentItem.file_available
                                  ? "\u0424\u0430\u0439\u043b \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d"
                                  : "\u0424\u0430\u0439\u043b \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d"}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {"\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430"}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {documentItem.status === "available"
                                ? "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0430"
                                : documentItem.status === "revoked"
                                  ? "\u0421\u043a\u0440\u044b\u0442\u0430: \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d"
                                  : "\u0421\u043a\u0440\u044b\u0442\u0430 \u0434\u043e \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438"}
                            </div>
                          </div>
                        </div>

                        {documentActionHint && (
                          <div
                            data-testid="document-action-required-hint"
                            className={`mt-4 rounded-2xl p-4 text-sm ring-1 ${documentActionHint.toneClass}`}
                          >
                            <div className="font-semibold">
                              {documentActionHint.title}
                            </div>
                            <p className="mt-1 leading-6">
                              {documentActionHint.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                data-testid="document-action-required-primary-action"
                                onClick={() => handleStartEdit(documentItem)}
                                disabled={isEditSaving || isDeleteSaving}
                                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {documentActionHint.actionLabel}
                              </button>

                              {documentItem.enrollment_id && (
                                <>
                                  <Link
                                    to={buildDocumentsPath({
                                      enrollment_id: documentItem.enrollment_id,
                                      action_required: "true",
                                    })}
                                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                                  >
                                    Документы назначения
                                  </Link>

                                  <Link
                                    to={buildEnrollmentsPath({
                                      action_required: "true",
                                      user_id: documentItem.user_id || "",
                                      course_id: documentItem.course_id || "",
                                    })}
                                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                                  >
                                    Связанное назначение
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {generatedCompletionNotice && (
                          <div className={`mt-4 rounded-2xl p-4 text-sm ring-1 ${generatedCompletionNotice.toneClass}`}>
                            <div className="font-semibold">
                              {generatedCompletionNotice.title}
                            </div>
                            <p className="mt-1 leading-6">
                              {generatedCompletionNotice.text}
                            </p>

                            {(canPublishGeneratedCompletion ||
                              (documentItem.status === "available" && verificationPath)) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {canPublishGeneratedCompletion && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusUpdate(documentItem, "available")}
                                    disabled={isPublishing || isDeleteSaving}
                                    className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isPublishing ? "Публикуем..." : "Опубликовать без загрузки файла"}
                                  </button>
                                )}

                                {documentItem.status === "available" && verificationPath && (
                                  <a
                                    href={verificationPath}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                                  >
                                    Проверить публичную ссылку
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {documentItem.status === "revoked" && (
                          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
                            <div className="font-semibold">
                              {"\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d"}
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-red-600">
                                  {"\u0414\u0430\u0442\u0430 \u043e\u0442\u0437\u044b\u0432\u0430"}
                                </div>
                                <div className="mt-1 font-semibold">
                                  {formatDateTime(documentItem.revoked_at)}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-red-600">
                                  {"\u041a\u0442\u043e \u043e\u0442\u043e\u0437\u0432\u0430\u043b"}
                                </div>
                                <div className="mt-1 font-semibold">
                                  {getRevocationActorLabel(documentItem)}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-red-600">
                                  {"\u041f\u0440\u0438\u0447\u0438\u043d\u0430"}
                                </div>
                                <div className="mt-1 font-semibold">
                                  {documentItem.revocation_reason || "-"}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}



                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Пользователь
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {documentItem.user_email}
                            </div>
                            {documentItem.user_full_name && (
                              <div className="mt-1 text-slate-600">
                                {documentItem.user_full_name}
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Курс
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {documentItem.course_title || "-"}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Назначение
                            </div>
                            {documentItem.enrollment_id ? (
                              <div className="mt-2 space-y-1">
                                <div className="font-semibold text-slate-900">
                                  {getEnrollmentStatusLabel(documentItem.enrollment_status)}
                                </div>
                                <div className="text-slate-600">
                                  {documentItem.organization_name || "Организация не указана"}
                                </div>
                                <div className="text-slate-500">
                                  {documentItem.learning_group_name || "Группа не указана"}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 font-semibold text-slate-900">
                                Без привязки к назначению
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Создан
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(documentItem.created_at)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Обновлён
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(documentItem.updated_at)}
                            </div>
                          </div>
                        </div>

                        {documentItem.status === "available" ? (
                          <DocumentVerificationQrBlock
                            code={documentItem.verification_code}
                            documentNumber={documentItem.document_number}
                            containerId={`admin-document-qr-${documentItem.id}`}
                            title="QR-код проверки"
                            description="QR-код можно использовать для размещения на документе или отправки слушателю."
                            showPublicLink
                            showCopyLink
                            publicLinkLabel="Публичная проверка"
                            className="mt-5"
                          />
                        ) : (
                          <div
                            data-testid="document-verification-hidden-note"
                            className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200"
                          >
                            <div className="font-semibold text-slate-800">
                              {documentItem.status === "revoked"
                                ? "Публичная проверка скрыта: документ отозван"
                                : "Публичная проверка скрыта до публикации"}
                            </div>
                            <div className="mt-1">
                              {documentItem.status === "revoked"
                                ? "QR-код и публичная ссылка не показываются для отозванного документа."
                                : "QR-код и публичная ссылка появятся после перевода документа в статус «Доступен»."}
                            </div>
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(documentItem)}
                            disabled={isDeleteSaving}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Редактировать
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAdminDownload(documentItem)}
                            disabled={!documentItem.file_available || isDownloadSaving || isDeleteSaving}
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDownloadSaving ? "Скачиваем..." : getAdminDocumentDownloadLabel(documentItem)}
                          </button>

                          {documentItem.user_id && (
                            <Link
                              to={getDocumentFilterPath({
                                user_id: documentItem.user_id,
                                enrollment_id: "",
                                status: "",
                                document_type: "",
                                q: "",
                              })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Документы слушателя
                            </Link>
                          )}

                          {documentItem.enrollment_id && (
                            <Link
                              to={getDocumentFilterPath({
                                user_id: "",
                                enrollment_id: documentItem.enrollment_id,
                                status: "",
                                document_type: "",
                                q: "",
                              })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Документы назначения
                            </Link>
                          )}

                          {documentItem.user_id && (
                            <Link
                              to={getEnrollmentFilterPath({
                                user_id: documentItem.user_id,
                              })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Назначения слушателя
                            </Link>
                          )}

                          {documentItem.course_id && (
                            <Link
                              to={getEnrollmentFilterPath({
                                course_id: documentItem.course_id,
                              })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Назначения курса
                            </Link>
                          )}

                          {documentCourse?.slug && (
                            <Link
                              to={`/courses/${encodeURIComponent(documentCourse.slug)}`}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Курс
                            </Link>
                          )}

                          {documentItem.status === "revoked" && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(documentItem, "available")}
                              disabled={!documentItem.file_available || isPublishing || isDeleteSaving}
                              className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isPublishing ? "\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u0430\u0432\u043b\u0438\u0432\u0430\u0435\u043c..." : "\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c"}
                            </button>
                          )}

                          {documentItem.status !== "available" && documentItem.status !== "revoked" && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(documentItem, "available")}
                              disabled={!documentItem.file_available || isPublishing || isDeleteSaving}
                              className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isPublishing ? "Публикуем..." : "Опубликовать"}
                            </button>
                          )}

                          {documentItem.status === "available" && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(documentItem, "draft")}
                              disabled={isDrafting || isDeleteSaving}
                              className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDrafting ? "Снимаем..." : "В черновик"}
                            </button>
                          )}

                          {documentItem.status !== "revoked" && (
                            <button
                              type="button"
                              onClick={() => handleStartRevoke(documentItem)}
                              disabled={isRevoking || isDeleteSaving}
                              className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isRevoking ? "Отзываем..." : "Отозвать"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(documentItem)}
                            disabled={isDeleteSaving}
                            className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleteSaving ? "Удаляем..." : "Удалить"}
                          </button>
                        </div>

                        {showMissingFileActionHint && (
                          <div
                            data-testid="document-missing-file-action-hint"
                            className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200"
                          >
                            <div className="font-semibold">
                              {"\u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430: \u0444\u0430\u0439\u043b \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d"}
                            </div>
                            <div className="mt-1">
                              {"\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435, \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u0430\u0439\u043b \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430, \u0437\u0430\u0442\u0435\u043c \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u0443\u0439\u0442\u0435 \u0438\u043b\u0438 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442."}
                            </div>
                          </div>
                        )}


                        {isRevokingFormOpen && (
                          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
                                Причина отзыва
                              </span>
                              <textarea
                                value={revocationReason}
                                onChange={(event) => setRevocationReason(event.target.value)}
                                rows={3}
                                placeholder="Кратко укажите причину отзыва документа"
                                className="mt-2 min-h-24 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                              />
                            </label>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleConfirmRevoke(documentItem)}
                                disabled={isRevoking || isDeleteSaving}
                                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isRevoking ? "Отзываем..." : "Подтвердить отзыв"}
                              </button>

                              <button
                                type="button"
                                onClick={handleCancelRevoke}
                                disabled={isRevoking}
                                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <form
                        onSubmit={(event) => handleEditSubmit(event, documentItem.id)}
                        className="mt-5 space-y-4 rounded-[2rem] bg-white p-5 ring-1 ring-blue-100"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Название
                            </span>
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(event) => updateEditField("title", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Тип документа
                            </span>
                            <input
                              type="text"
                              value={editForm.document_type}
                              onChange={(event) => updateEditField("document_type", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Статус
                            </span>
                            <select
                              value={editForm.status}
                              onChange={(event) => updateEditField("status", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            >
                              {DOCUMENT_STATUSES.map((statusItem) => (
                                <option key={statusItem.value} value={statusItem.value}>
                                  {statusItem.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          {editForm.status === "revoked" && (
                            <label className="block md:col-span-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {"\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u043e\u0442\u0437\u044b\u0432\u0430"}
                              </span>
                              <textarea
                                value={editForm.revocation_reason}
                                onChange={(event) => updateEditField("revocation_reason", event.target.value)}
                                rows={3}
                                placeholder={"\u041a\u0440\u0430\u0442\u043a\u043e \u0443\u043a\u0430\u0436\u0438\u0442\u0435, \u043f\u043e\u0447\u0435\u043c\u0443 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d"}
                                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                              />
                            </label>
                          )}


                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Номер документа
                            </span>
                            <input
                              type="text"
                              value={editForm.document_number}
                              onChange={(event) => updateEditField("document_number", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Назначенная программа
                            </span>
                            <select
                              value={editForm.enrollment_id}
                              onChange={(event) => updateEditField("enrollment_id", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            >
                              <option value="">Без привязки к назначению</option>
                              {enrollments
                                .filter((enrollment) => enrollment.user_id === documentItem.user_id)
                                .map((enrollment) => (
                                  <option key={enrollment.id} value={enrollment.id}>
                                    {getEnrollmentOptionLabel(enrollment)}
                                  </option>
                                ))}
                            </select>
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Программа / курс
                            </span>
                            <select
                              value={editForm.course_id}
                              onChange={(event) => updateEditField("course_id", event.target.value)}
                              disabled={Boolean(editForm.enrollment_id)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                            >
                              <option value="">Без привязки к курсу</option>
                              {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                  {getCourseOptionLabel(course)}
                                </option>
                              ))}
                            </select>
                            {editForm.enrollment_id && (
                              <span className="mt-2 block text-xs text-slate-500">
                                Курс синхронизируется с выбранной назначенной программой.
                              </span>
                            )}
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Заменить файл
                            </span>
                            <input
                              id="admin-document-edit-file"
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(event) => setEditFile(event.target.files?.[0] || null)}
                              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <span className="mt-2 block text-xs text-slate-500">
                              Чтобы слушатель мог скачать документ, загрузите файл и установите статус «Доступен».
                            </span>
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isEditSaving}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isEditSaving ? "Сохраняем..." : "Сохранить"}
                          </button>
                          <button
                            type="button"
                            onClick={resetEditState}
                            disabled={isEditSaving}
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

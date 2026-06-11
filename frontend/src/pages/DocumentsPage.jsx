import { getApiErrorMessage, getApiErrorStatus, getSafeApiErrorMessage } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createAdminDocument,
  deleteAdminDocument,
  downloadAdminDocument,
  downloadAdminDocumentGenerationEvent,
  getAdminCourses,
  getAdminOrganizations,
  getAdminDocuments,
  getAdminDocumentGenerationEvents,
  getAdminEnrollments,
  getAdminUsers,
  getAdminWorklistSummary,
  regenerateAdminDocument,
  updateAdminDocument,
} from "../api/client";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";
import { Alert } from "../components/ui/Alert";
import { DocumentVerificationQrBlock } from "../components/documents/DocumentVerificationQrBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { AdminSummaryCard, AdminWorkflowLink } from "../components/admin/AdminWorkCenter";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminActiveFiltersSummary } from "../components/admin/AdminActiveFiltersSummary";
import { buildDocumentVerificationPath } from "../utils/documentVerification";
import {
  buildAuditPath,
  buildCoursesPath,
  buildDocumentsPath,
  buildEnrollmentsPath,
  buildOrganizationsPath,
} from "../utils/adminLinks";
import { buildDatedCsvFilename, downloadCsvFile } from "../utils/exportCsv";

const DOCUMENT_STATUSES = [
  { value: "available", label: "Доступен" },
  { value: "draft", label: "Черновик" },
  { value: "revoked", label: "Отозван" },
];

const DOCUMENT_CSV_STATUS_LABELS = {
  available: "Доступен",
  draft: "Черновик",
  revoked: "Отозван",
};

const DOCUMENT_CSV_EXPORT_COLUMNS = [
  { key: "id", title: "ID" },
  { key: "document_number", title: "Номер документа" },
  { key: "verification_code", title: "Код проверки" },
  { key: "title", title: "Название" },
  { key: "document_type", title: "Тип документа" },
  { key: "status", title: "Статус" },
  { key: "status_label", title: "Статус, название" },
  { key: "file_available", title: "Файл доступен" },
  { key: "generated_pdf", title: "PDF сформирован" },
  { key: "generation_source", title: "Источник генерации" },
  { key: "generation_template_version", title: "Версия шаблона" },
  { key: "user_id", title: "ID пользователя" },
  { key: "user_email", title: "Email пользователя" },
  { key: "user_full_name", title: "ФИО пользователя" },
  { key: "course_id", title: "ID курса" },
  { key: "course_title", title: "Курс" },
  { key: "course_slug", title: "Slug курса" },
  { key: "enrollment_id", title: "ID назначения" },
  { key: "enrollment_status", title: "Статус назначения" },
  { key: "enrollment_status_label", title: "Статус назначения, название" },
  { key: "organization_id", title: "ID организации" },
  { key: "organization_name", title: "Организация" },
  { key: "learning_group_id", title: "ID группы" },
  { key: "learning_group_name", title: "Учебная группа" },
  { key: "action_required", title: "Требует действия" },
  { key: "verification_url", title: "Публичная проверка" },
  { key: "documents_filter_url", title: "Фильтр документов" },
  { key: "audit_url", title: "Аудит документа" },
  { key: "revoked_at", title: "Дата отзыва" },
  { key: "revocation_reason", title: "Причина отзыва" },
  { key: "created_at", title: "Создано" },
  { key: "updated_at", title: "Обновлено" },
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
  const status = getApiErrorStatus(err);
  const message = getApiErrorMessage(err);
  const safeMessage = getSafeApiErrorMessage(message, fallback);
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
    readableMessage = safeMessage;
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

function getDocumentAttentionItems(documentItem) {
  const items = [];

  if (!documentItem) {
    return items;
  }

  const documentNumber = String(documentItem.document_number || "");
  const isAutoGeneratedCompletion = Boolean(
    documentItem.enrollment_id && documentNumber.startsWith("AUTO-")
  );

  if (documentItem.status === "revoked") {
    items.push("Отзыв: проверьте причину и возможность восстановления.");

    if (documentItem.revocation_reason) {
      items.push(`Причина отзыва: ${documentItem.revocation_reason}`);
    } else {
      items.push("Причина отзыва: не указана, заполните её для прозрачного аудита.");
    }

    if (!documentItem.revoked_at) {
      items.push("Дата отзыва: не зафиксирована, проверьте историю аудита.");
    }
  }

  if (documentItem.status === "draft") {
    items.push("Публикация: черновик нужно доработать или опубликовать.");

    if (documentItem.file_available) {
      items.push("Файл: черновик уже содержит файл, можно проверить и опубликовать.");
    } else {
      items.push("Файл: черновик пока без файла, загрузите PDF/скан перед публикацией.");
    }
  }

  if (documentItem.status === "available" && !documentItem.file_available) {
    items.push("Файл: опубликованный документ недоступен для скачивания.");
  }

  if (isAutoGeneratedCompletion && !documentItem.generated_at) {
    items.push("Паспорт генерации: нет даты генерации PDF, пересоберите документ.");
  }

  if (isAutoGeneratedCompletion && !documentItem.generation_template_version) {
    items.push("Паспорт генерации: версия шаблона не зафиксирована, пересоберите PDF.");
  }

  if (documentItem.enrollment_id && !documentItem.organization_id) {
    items.push("Организация: назначение без организации, PDF использует fallback-настройки.");
  }

  return [...new Set(items)];
}

function getDocumentAttentionTone(documentItem) {
  if (documentItem.status === "revoked") {
    return {
      panelClass: "bg-red-50 text-red-800 ring-red-200",
      badgeClass: "bg-white text-red-800 ring-red-200",
    };
  }

  return {
    panelClass: "bg-amber-50 text-amber-900 ring-amber-200",
    badgeClass: "bg-white text-amber-800 ring-amber-200",
  };
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
    organization_id: params.get("organization_id") || "",
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

function getDocumentGenerationSourceLabel(source) {
  const labels = {
    auto_completion: "Автоматически при завершении обучения",
    admin_regenerate: "Ручная пересборка администратором",
    legacy_completion: "Ранее сформированный PDF",
  };

  return labels[source] || source || "—";
}

function getDocumentGenerationActorLabel(documentItem) {
  const name = documentItem.generated_by_user_full_name || "";
  const email = documentItem.generated_by_user_email || "";

  if (name && email) {
    return `${name} / ${email}`;
  }

  return name || email || "Система";
}

function getDocumentGenerationEventActorLabel(event) {
  const name = event.generated_by_user_full_name || "";
  const email = event.generated_by_user_email || "";

  if (name && email) {
    return `${name} / ${email}`;
  }

  return name || email || "Система";
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

function countDocumentsWhere(items, predicate) {
  return Array.isArray(items) ? items.filter(predicate).length : 0;
}

function getAdminDocumentRegistryStats({
  documents,
  documentStatusCounts,
  documentActionRequiredCount,
  filters,
}) {
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return {
    total: documentStatusCounts.all || documents.length || 0,
    displayed: documents.length,
    available: documentStatusCounts.available || 0,
    draft: documentStatusCounts.draft || 0,
    revoked: documentStatusCounts.revoked || 0,
    actionRequired: documentActionRequiredCount || 0,
    withFiles: countDocumentsWhere(documents, (documentItem) => documentItem.file_available),
    withoutFiles: countDocumentsWhere(documents, (documentItem) => !documentItem.file_available),
    generatedPdf: countDocumentsWhere(documents, isGeneratedCompletionDocument),
    publishableGeneratedPdf: countDocumentsWhere(documents, canPublishGeneratedCompletionDocument),
    completionLinked: countDocumentsWhere(documents, (documentItem) => documentItem.enrollment_id),
    verificationReady: countDocumentsWhere(
      documents,
      (documentItem) => documentItem.document_number || documentItem.verification_code
    ),
    activeFiltersCount,
    filters,
  };
}

function getAdminDocumentRegistryDiagnostics({
  documents,
  registryStats,
  error,
  successMessage,
  loading,
  saving,
  editSavingId,
  downloadSavingId,
  regenerateSavingId,
  generationEventsLoadingId,
  generationEventDownloadSavingId,
  deleteSavingId,
  statusSavingKey,
  revokingDocumentId,
}) {
  const items = [];

  if (loading) {
    items.push("Загрузка: реестр документов сейчас обновляется.");
  }

  if (!loading && registryStats.displayed === 0) {
    items.push("Реестр: по текущим фильтрам документы не найдены.");
  }

  if (registryStats.activeFiltersCount > 0) {
    items.push(`Фильтры: включено активных фильтров — ${registryStats.activeFiltersCount}.`);
  }

  if (registryStats.draft > 0) {
    items.push("Публикация: есть черновики документов, требующие проверки или публикации.");
  }

  if (registryStats.revoked > 0) {
    items.push("Отзыв: есть отозванные документы, проверьте причину и аудит.");
  }

  if (registryStats.actionRequired > 0) {
    items.push("Контроль: есть документы в режиме action_required.");
  }

  if (registryStats.withoutFiles > 0) {
    items.push("Файлы: в текущей выборке есть документы без файла.");
  }

  if (registryStats.generatedPdf > 0) {
    items.push("PDF: в текущей выборке есть автоматически сформированные итоговые PDF.");
  }

  if (registryStats.publishableGeneratedPdf > 0) {
    items.push("Публикация PDF: есть сформированные итоговые PDF-черновики, готовые к публикации.");
  }

  if (registryStats.completionLinked > 0) {
    items.push("Связь с обучением: есть документы, привязанные к назначениям.");
  }

  if (registryStats.verificationReady < registryStats.displayed) {
    items.push("Публичная проверка: часть документов не имеет номера или кода проверки.");
  }

  if (saving) {
    items.push("Создание: выполняется сохранение нового документа.");
  }

  if (editSavingId) {
    items.push("Редактирование: выполняется обновление документа.");
  }

  if (downloadSavingId || generationEventDownloadSavingId) {
    items.push("Скачивание: выполняется загрузка файла или версии PDF.");
  }

  if (regenerateSavingId) {
    items.push("Регенерация PDF: выполняется пересборка итогового документа.");
  }

  if (generationEventsLoadingId) {
    items.push("История PDF: загружается список версий генерации.");
  }

  if (statusSavingKey) {
    items.push("Статус: выполняется публикация, перевод в черновик, отзыв или восстановление.");
  }

  if (revokingDocumentId) {
    items.push("Отзыв: открыт ввод причины отзыва документа.");
  }

  if (deleteSavingId) {
    items.push("Удаление: выполняется удаление документа.");
  }

  if (error) {
    items.push("Ошибка: последняя операция с реестром документов завершилась ошибкой.");
  }

  if (successMessage) {
    items.push("Готово: последняя операция с документом завершилась успешно.");
  }

  return [...new Set(items)];
}

function AdminDocumentRegistryDiagnostics({
  registryStats,
  diagnostics,
  getDocumentFilterPath,
  getEnrollmentFilterPath,
}) {
  return (
    <SectionCard
      title="Диагностика административного реестра документов"
      subtitle="Контроль фильтров, статусов, файлов, PDF, публикации, отзыва, восстановления и action_required"
    >
      <div data-testid="admin-document-registry-diagnostics" className="space-y-5">
        <div
          data-testid="admin-document-registry-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Всего / показано
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {registryStats.total} / {registryStats.displayed}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Draft / available / revoked
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {registryStats.draft} / {registryStats.available} / {registryStats.revoked}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Требуют действия
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {registryStats.actionRequired}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Активные фильтры
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {registryStats.activeFiltersCount}
            </div>
          </div>
        </div>

        <div
          data-testid="admin-document-registry-quality"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Файлы / без файла
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {registryStats.withFiles} / {registryStats.withoutFiles}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Авто PDF
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {registryStats.generatedPdf}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              PDF к публикации
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {registryStats.publishableGeneratedPdf}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Номер/код проверки
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {registryStats.verificationReady}
            </div>
          </div>
        </div>

        <div
          data-testid="admin-document-registry-attention"
          className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${
            diagnostics.length
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-green-50 text-green-800 ring-green-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">
              Что требует внимания в административном реестре
            </div>
            <span
              data-testid="admin-document-registry-attention-count"
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
              Критичных замечаний по административному реестру документов не найдено.
            </p>
          )}
        </div>

        <div
          data-testid="admin-document-registry-links"
          className="flex flex-wrap gap-3"
        >
          <Link
            to={getDocumentFilterPath({ status: "draft" })}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Черновики
          </Link>

          <Link
            to={getDocumentFilterPath({ status: "available" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Опубликованные
          </Link>

          <Link
            to={getDocumentFilterPath({ status: "revoked" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Отозванные
          </Link>

          <Link
            to={getDocumentFilterPath({ action_required: "true" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Требуют действия
          </Link>

          <Link
            to={getEnrollmentFilterPath({ status: "completed" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Завершённые назначения
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}


const LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS = {
  stage: "Stage 79.3 - Learner Documents UX Foundation",
  title: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f",
  subtitle: "\u041f\u043e\u043d\u044f\u0442\u043d\u0430\u044f \u0432\u0438\u0442\u0440\u0438\u043d\u0430 \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0445 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432: \u0447\u0442\u043e \u0443\u0436\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e, \u043a\u0430\u043a\u0438\u0435 \u043a\u0443\u0440\u0441\u044b \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u044b, \u0433\u0434\u0435 \u0441\u043a\u0430\u0447\u0430\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0438 \u043a\u0430\u043a \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0435\u0433\u043e \u043f\u043e\u0434\u043b\u0438\u043d\u043d\u043e\u0441\u0442\u044c.",
  availableDocuments: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  completedCourses: "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u044b\u0435 \u043a\u0443\u0440\u0441\u044b",
  pendingDocuments: "\u041e\u0436\u0438\u0434\u0430\u044e\u0442 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  verificationReady: "\u0413\u043e\u0442\u043e\u0432\u044b \u043a \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0435",
  emptyTitle: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u043f\u043e\u043a\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b",
  emptyText: "\u041f\u043e\u0441\u043b\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043a\u0443\u0440\u0441\u0430 \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c \u0438\u043b\u0438 \u0431\u0443\u0434\u0435\u0442 \u0432\u0438\u0434\u0435\u043d \u0447\u0435\u0440\u0435\u0437 \u0444\u0438\u043b\u044c\u0442\u0440 \u043f\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u043e\u043c\u0443 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044e.",
  completedHandoffTitle: "\u0421\u0432\u044f\u0437\u043a\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u043e\u0433\u043e \u043a\u0443\u0440\u0441\u0430 \u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  completedHandoffReady: "\u0414\u043b\u044f \u0447\u0430\u0441\u0442\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u044b\u0445 \u043a\u0443\u0440\u0441\u043e\u0432 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b. \u0418\u0445 \u043c\u043e\u0436\u043d\u043e \u0441\u043a\u0430\u0447\u0430\u0442\u044c \u0438\u043b\u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043f\u043e \u043d\u043e\u043c\u0435\u0440\u0443/\u043a\u043e\u0434\u0443.",
  completedHandoffWaiting: "\u0415\u0441\u0442\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u044b\u0435 \u043a\u0443\u0440\u0441\u044b \u0431\u0435\u0437 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043d\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0444\u0438\u043b\u044c\u0442\u0440 \u043f\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u044b\u043c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f\u043c \u0438\u043b\u0438 \u0434\u043e\u0436\u0434\u0438\u0442\u0435\u0441\u044c \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438.",
  actionDocuments: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  actionCompleted: "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u044b\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f",
  actionVerify: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
  actionAll: "\u0412\u0441\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  unknownCourse: "\u041a\u0443\u0440\u0441 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d",
  loadingText: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b, \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u044b\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u044b \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438.",
  errorText: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0441\u043e\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u0435 \u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0443.",
  primaryDocumentTitle: "\u0411\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0439 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
  genericDocument: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
  documentNumber: "\u041d\u043e\u043c\u0435\u0440",
  verificationCode: "\u041a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
  createdAt: "\u0421\u043e\u0437\u0434\u0430\u043d",
};

function getLearnerDocumentCourseTitle(documentItem, courses, enrollments) {
  if (documentItem.course_title) {
    return documentItem.course_title;
  }

  const enrollment = enrollments.find((item) => item.id === documentItem.enrollment_id) || null;
  const courseId = documentItem.course_id || enrollment?.course_id || "";
  const course = courses.find((item) => item.id === courseId) || null;

  return course?.title || LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.unknownCourse;
}

function getLearnerDocumentsUXStats({ documents, enrollments }) {
  const availableDocuments = documents.filter(
    (documentItem) => documentItem.status === "available" && documentItem.file_available
  );
  const completedEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === "completed"
  );
  const documentEnrollmentIds = new Set(
    documents.map((documentItem) => documentItem.enrollment_id).filter(Boolean)
  );
  const pendingCompletedEnrollments = completedEnrollments.filter(
    (enrollment) => !documentEnrollmentIds.has(enrollment.id)
  );
  const verificationReadyDocuments = availableDocuments.filter(
    (documentItem) => documentItem.document_number || documentItem.verification_code
  );

  return {
    availableDocuments,
    completedEnrollments,
    pendingCompletedEnrollments,
    verificationReadyDocuments,
  };
}

function LearnerDocumentsUXFoundationPanel({
  documents,
  courses,
  enrollments,
  loading,
  error,
  getDocumentFilterPath,
  getEnrollmentFilterPath,
}) {
  const stats = getLearnerDocumentsUXStats({ documents, enrollments });
  const primaryDocument = stats.availableDocuments[0] || null;
  const hasAnyLearnerSignal =
    stats.availableDocuments.length > 0 ||
    stats.completedEnrollments.length > 0 ||
    stats.pendingCompletedEnrollments.length > 0;

  const handoffText =
    stats.pendingCompletedEnrollments.length > 0
      ? LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.completedHandoffWaiting
      : LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.completedHandoffReady;

  return (
    <SectionCard
      title={LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.title}
      subtitle={LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.subtitle}
    >
      <div data-testid="learner-documents-ux-foundation-panel" className="space-y-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.stage}
        </div>

        <div
          data-testid="learner-documents-ux-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.availableDocuments}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.availableDocuments.length}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.completedCourses}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.completedEnrollments.length}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.pendingDocuments}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.pendingCompletedEnrollments.length}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.verificationReady}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.verificationReadyDocuments.length}
            </div>
          </div>
        </div>

        {loading ? (
          <div
            data-testid="learner-documents-ux-loading-state"
            className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-100"
          >
            {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.loadingText}
          </div>
        ) : null}

        {error ? (
          <div
            data-testid="learner-documents-ux-error-state"
            className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-700 ring-1 ring-red-200"
          >
            {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.errorText}
          </div>
        ) : null}

        {!loading && !error && !hasAnyLearnerSignal ? (
          <div
            data-testid="learner-documents-ux-empty-state"
            className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700 ring-1 ring-slate-200"
          >
            <div className="font-semibold text-slate-900">
              {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.emptyTitle}
            </div>
            <p className="mt-2">{LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.emptyText}</p>
          </div>
        ) : null}

        {hasAnyLearnerSignal ? (
          <div
            data-testid="learner-documents-completed-handoff"
            className={`rounded-2xl p-5 text-sm leading-6 ring-1 ${
              stats.pendingCompletedEnrollments.length > 0
                ? "bg-amber-50 text-amber-900 ring-amber-200"
                : "bg-green-50 text-green-800 ring-green-200"
            }`}
          >
            <div className="font-semibold text-slate-900">
              {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.completedHandoffTitle}
            </div>
            <p className="mt-2">{handoffText}</p>
          </div>
        ) : null}

        {primaryDocument ? (
          <div
            data-testid="learner-documents-primary-document-card"
            className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.primaryDocumentTitle}
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {primaryDocument.title || primaryDocument.document_type || LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.genericDocument}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {getLearnerDocumentCourseTitle(primaryDocument, courses, enrollments)}
                </div>
              </div>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getDocumentStatusTone(primaryDocument.status)}`}>
                {getDocumentStatusLabel(primaryDocument.status)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.documentNumber}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {primaryDocument.document_number || "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.verificationCode}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {primaryDocument.verification_code || "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.createdAt}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDateTime(primaryDocument.created_at)}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div
          data-testid="learner-documents-ux-actions"
          className="flex flex-wrap gap-3"
        >
          <Link
            data-testid="learner-documents-available-action"
            to={getDocumentFilterPath({ status: "available" })}
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.actionDocuments}
          </Link>

          <Link
            data-testid="learner-documents-completed-action"
            to={getEnrollmentFilterPath({ status: "completed" })}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.actionCompleted}
          </Link>

          <Link
            data-testid="learner-documents-verify-action"
            to={
              primaryDocument?.verification_code || primaryDocument?.document_number
                ? buildDocumentVerificationPath(
                    primaryDocument.verification_code || primaryDocument.document_number
                  )
                : "/verify-document"
            }
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.actionVerify}
          </Link>

          <Link
            data-testid="learner-documents-all-action"
            to={getDocumentFilterPath({ status: "", action_required: "" })}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            {LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS.actionAll}
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}

const LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS = {
  stage: "Stage 79.5 - Learner Document Download UX Integration",
  title: "- - -",
  subtitle: "- -, - - - - - - -, - - - - ? - - -.",
  ready: "- ? -",
  available: "- -",
  waiting: "- -",
  completed: "- -",
  verifyReady: "- -",
  primaryTitle: "- - ? -",
  noReadyTitle: "- - ?? - ? -",
  noReadyText: "- - - -, - - - -. - - - - - ? - - -.",
  downloadAction: "- / - -",
  availableAction: "- - -",
  completedAction: "- -",
  verifyAction: "- -",
  allAction: "- -",
  fileStatus: "-",
  fileReady: "-",
  fileWaiting: "-",
  documentNumber: "-",
  verificationCode: "- -",
  createdAt: "-",
  course: "-",
  genericDocument: "-",
  emptyValue: "-",
};

function getLearnerDocumentDownloadUrl(documentItem) {
  return (
    documentItem.download_url ||
    documentItem.file_url ||
    documentItem.public_url ||
    documentItem.url ||
    ""
  );
}

function isLearnerDocumentDownloadReady(documentItem) {
  return documentItem.status === "available" && Boolean(documentItem.file_available);
}

function getLearnerDocumentDownloadStats({ documents, enrollments }) {
  const availableDocuments = documents.filter(
    (documentItem) => documentItem.status === "available"
  );
  const downloadableDocuments = availableDocuments.filter(isLearnerDocumentDownloadReady);
  const completedEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === "completed"
  );

  const documentEnrollmentIds = new Set(
    documents.map((documentItem) => documentItem.enrollment_id).filter(Boolean)
  );
  const waitingCompletedEnrollments = completedEnrollments.filter(
    (enrollment) => !documentEnrollmentIds.has(enrollment.id)
  );

  const verificationReadyDocuments = availableDocuments.filter(
    (documentItem) => documentItem.document_number || documentItem.verification_code
  );

  return {
    availableDocuments,
    downloadableDocuments,
    completedEnrollments,
    waitingCompletedEnrollments,
    verificationReadyDocuments,
  };
}

function LearnerDocumentDownloadUXPanel({
  documents,
  courses,
  enrollments,
  getDocumentFilterPath,
  getEnrollmentFilterPath,
}) {
  const stats = getLearnerDocumentDownloadStats({ documents, enrollments });
  const primaryDocument = stats.downloadableDocuments[0] || stats.availableDocuments[0] || null;
  const primaryDownloadUrl = primaryDocument ? getLearnerDocumentDownloadUrl(primaryDocument) : "";
  const primaryVerificationValue =
    primaryDocument?.verification_code || primaryDocument?.document_number || "";
  const primaryTone = primaryDocument
    ? getDocumentStatusTone(primaryDocument.status)
    : "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <SectionCard
      title={LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.title}
      subtitle={LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.subtitle}
    >
      <div data-testid="learner-document-download-ux-panel" className="space-y-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.stage}
        </div>

        <div
          data-testid="learner-document-download-ux-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div
            data-testid="learner-document-download-ready-count"
            className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.ready}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.downloadableDocuments.length}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.available}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.availableDocuments.length}
            </div>
          </div>

          <div
            data-testid="learner-document-download-pending-count"
            className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.waiting}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.waitingCompletedEnrollments.length}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.verifyReady}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.verificationReadyDocuments.length}
            </div>
          </div>
        </div>

        {primaryDocument ? (
          <div
            data-testid="learner-document-download-primary-card"
            className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.primaryTitle}
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {primaryDocument.title || primaryDocument.document_type || LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.genericDocument}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {getLearnerDocumentCourseTitle(primaryDocument, courses, enrollments)}
                </div>
              </div>

              <span className={"rounded-full px-3 py-1 text-xs font-semibold ring-1 " + primaryTone}>
                {getDocumentStatusLabel(primaryDocument.status)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.fileStatus}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {primaryDocument.file_available
                    ? LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.fileReady
                    : LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.fileWaiting}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.documentNumber}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {primaryDocument.document_number || LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.emptyValue}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.verificationCode}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {primaryDocument.verification_code || LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.emptyValue}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.createdAt}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDateTime(primaryDocument.created_at)}
                </div>
              </div>
            </div>

            <div
              data-testid="learner-document-download-actions"
              className="mt-5 flex flex-wrap gap-3"
            >
              {primaryDownloadUrl ? (
                <a
                  data-testid="learner-document-download-open-action"
                  href={primaryDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.downloadAction}
                </a>
              ) : (
                <Link
                  data-testid="learner-document-download-open-action"
                  to={getDocumentFilterPath({ status: "available" })}
                  className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.availableAction}
                </Link>
              )}

              <Link
                data-testid="learner-document-download-verify-action"
                to={
                  primaryVerificationValue
                    ? buildDocumentVerificationPath(primaryVerificationValue)
                    : "/verify-document"
                }
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.verifyAction}
              </Link>

              <Link
                data-testid="learner-document-download-documents-action"
                to={getDocumentFilterPath({ status: "available" })}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.availableAction}
              </Link>
            </div>
          </div>
        ) : (
          <div
            data-testid="learner-document-download-empty-state"
            className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700 ring-1 ring-slate-200"
          >
            <div className="font-semibold text-slate-900">
              {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.noReadyTitle}
            </div>
            <p className="mt-2">{LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.noReadyText}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            data-testid="learner-document-download-completed-action"
            to={getEnrollmentFilterPath({ status: "completed" })}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.completedAction}
          </Link>

          <Link
            data-testid="learner-document-download-all-action"
            to={getDocumentFilterPath({ status: "", action_required: "" })}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            {LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS.allAction}
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}



const STAGE82_ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW =
  "stage82_18_admin_generated_document_publication_workflow";

const ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS = {
  stage: "Stage 82.18 · Generated Document Publication Workflow",
  title: "Очередь публикации автоматически сформированных документов",
  subtitle:
    "Быстрый рабочий блок для итоговых PDF, которые уже сформированы после завершения курса и ждут публикации.",
  readyTitle: "Готовы к публикации",
  readyHint: "Черновики с уже сформированным PDF. Их можно опубликовать без загрузки файла.",
  waitingTitle: "Ждут проверки",
  waitingHint: "Документ есть, но пока не готов к публикации. Проверьте файл, статус или пересоберите PDF.",
  publishedTitle: "Опубликованы",
  publishedHint: "Документы уже доступны слушателям для скачивания и публичной проверки.",
  revokedTitle: "Отозваны",
  revokedHint: "Документы нельзя использовать как действующие.",
  emptyTitle: "Нет автоматически сформированных документов в текущей выборке",
  emptyText:
    "Когда слушатель завершит курс, итоговый PDF появится здесь как черновик и попадёт в очередь публикации.",
  publishAction: "Опубликовать PDF",
  publishingAction: "Публикуем...",
  showReadyAction: "Показать готовые черновики",
  showAllGeneratedAction: "Показать авто PDF",
  showPublishedAction: "Показать опубликованные",
  documentAuditAction: "Аудит документа",
  enrollmentAction: "Назначение",
  userDocumentsAction: "Документы слушателя",
};

function getGeneratedDocumentPublicationWorkflowStats(documents = []) {
  const generatedDocuments = documents.filter(isGeneratedCompletionDocument);
  const readyDrafts = generatedDocuments.filter(canPublishGeneratedCompletionDocument);
  const waitingDrafts = generatedDocuments.filter(
    (documentItem) =>
      documentItem.status === "draft" && !canPublishGeneratedCompletionDocument(documentItem)
  );
  const publishedDocuments = generatedDocuments.filter(
    (documentItem) => documentItem.status === "available"
  );
  const revokedDocuments = generatedDocuments.filter(
    (documentItem) => documentItem.status === "revoked"
  );

  return {
    generatedDocuments,
    readyDrafts,
    waitingDrafts,
    publishedDocuments,
    revokedDocuments,
    total: generatedDocuments.length,
    readyCount: readyDrafts.length,
    waitingCount: waitingDrafts.length,
    publishedCount: publishedDocuments.length,
    revokedCount: revokedDocuments.length,
  };
}

function getGeneratedDocumentPublicationWorkflowTone(stats) {
  if (stats.readyCount > 0) {
    return "bg-amber-50 text-amber-900 ring-amber-200";
  }

  if (stats.waitingCount > 0 || stats.revokedCount > 0) {
    return "bg-slate-50 text-slate-700 ring-slate-200";
  }

  if (stats.publishedCount > 0) {
    return "bg-green-50 text-green-800 ring-green-200";
  }

  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function getGeneratedDocumentPublicationWorkflowFocusText(stats) {
  if (stats.readyCount > 0) {
    return `${stats.readyCount} автоматически сформированных PDF готовы к публикации.`;
  }

  if (stats.waitingCount > 0) {
    return `${stats.waitingCount} автоматически сформированных PDF требуют проверки перед публикацией.`;
  }

  if (stats.publishedCount > 0) {
    return `${stats.publishedCount} автоматически сформированных PDF уже опубликованы.`;
  }

  return ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.emptyText;
}

function GeneratedDocumentPublicationWorkflowPanel({
  documents,
  loading,
  getDocumentFilterPath,
  getEnrollmentFilterPath,
  onPublishDocument,
  statusSavingKey,
  deleteSavingId,
}) {
  const stats = getGeneratedDocumentPublicationWorkflowStats(documents);
  const readyPreviewItems = stats.readyDrafts.slice(0, 3);
  const panelTone = getGeneratedDocumentPublicationWorkflowTone(stats);

  return (
    <SectionCard
      title={ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.title}
      subtitle={ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.subtitle}
    >
      <div
        data-testid="admin-generated-document-publication-workflow"
        data-stage={STAGE82_ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW}
        data-generated-publication-total={stats.total}
        data-generated-publication-ready={stats.readyCount}
        data-generated-publication-waiting={stats.waitingCount}
        data-generated-publication-published={stats.publishedCount}
        className="space-y-5"
      >
        <div
          data-testid="admin-generated-document-publication-workflow-focus"
          className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${panelTone}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide">
            {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.stage}
          </div>
          <div className="mt-1 font-semibold text-slate-900">
            {loading
              ? "Обновляем очередь публикации..."
              : getGeneratedDocumentPublicationWorkflowFocusText(stats)}
          </div>
        </div>

        <div
          data-testid="admin-generated-document-publication-workflow-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
            <div className="text-xs font-semibold uppercase tracking-wide">
              {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.readyTitle}
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.readyCount}</div>
            <p className="mt-1 text-sm leading-6">
              {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.readyHint}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-slate-700 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide">
              {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.waitingTitle}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{stats.waitingCount}</div>
            <p className="mt-1 text-sm leading-6">
              {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.waitingHint}
            </p>
          </div>

          <div className="rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-200">
            <div className="text-xs font-semibold uppercase tracking-wide">
              {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.publishedTitle}
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.publishedCount}</div>
            <p className="mt-1 text-sm leading-6">
              {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.publishedHint}
            </p>
          </div>

          <div className="rounded-2xl bg-red-50 p-4 text-red-800 ring-1 ring-red-200">
            <div className="text-xs font-semibold uppercase tracking-wide">
              {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.revokedTitle}
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.revokedCount}</div>
            <p className="mt-1 text-sm leading-6">
              {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.revokedHint}
            </p>
          </div>
        </div>

        <div
          data-testid="admin-generated-document-publication-workflow-actions"
          className="flex flex-wrap gap-3"
        >
          <Link
            to={getDocumentFilterPath({ status: "draft", action_required: "true", q: "AUTO-" })}
            className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.showReadyAction}
          </Link>

          <Link
            to={getDocumentFilterPath({ status: "", action_required: "", q: "AUTO-" })}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.showAllGeneratedAction}
          </Link>

          <Link
            to={getDocumentFilterPath({ status: "available", action_required: "", q: "AUTO-" })}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.showPublishedAction}
          </Link>
        </div>

        {readyPreviewItems.length > 0 ? (
          <div
            data-testid="admin-generated-document-publication-ready-list"
            className="space-y-3"
          >
            {readyPreviewItems.map((documentItem) => {
              const isPublishing = statusSavingKey === `${documentItem.id}:available`;
              const isDeleteSaving = deleteSavingId === documentItem.id;

              return (
                <div
                  key={documentItem.id}
                  data-testid="admin-generated-document-publication-ready-item"
                  className="rounded-2xl bg-white p-4 ring-1 ring-amber-200"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getDocumentStatusTone(documentItem.status)}`}>
                          {getDocumentStatusLabel(documentItem.status)}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200">
                          PDF сформирован
                        </span>
                      </div>

                      <div className="mt-3 text-lg font-bold text-slate-900">
                        {documentItem.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {documentItem.document_number}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {documentItem.course_title || "Курс не указан"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Сформирован: {formatDateTime(documentItem.generated_at)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        data-testid="admin-generated-document-publication-publish-action"
                        onClick={() => onPublishDocument(documentItem)}
                        disabled={isPublishing || isDeleteSaving}
                        className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPublishing
                          ? ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.publishingAction
                          : ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.publishAction}
                      </button>

                      {documentItem.enrollment_id && (
                        <Link
                          to={getEnrollmentFilterPath({
                            status: "completed",
                            user_id: documentItem.user_id || "",
                          })}
                          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                        >
                          {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.enrollmentAction}
                        </Link>
                      )}

                      {documentItem.user_id && (
                        <Link
                          to={getDocumentFilterPath({
                            user_id: documentItem.user_id,
                            status: "",
                            action_required: "",
                            q: "",
                          })}
                          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                        >
                          {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.userDocumentsAction}
                        </Link>
                      )}

                      <Link
                        to={buildAuditPath({ entity_type: "document", entity_id: documentItem.id })}
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                      >
                        {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.documentAuditAction}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            data-testid="admin-generated-document-publication-empty"
            className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200"
          >
            <div className="font-semibold text-slate-900">
              {ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.emptyTitle}
            </div>
            <p className="mt-1">{ADMIN_GENERATED_DOCUMENT_PUBLICATION_WORKFLOW_LABELS.emptyText}</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
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
  const { onRefreshDocuments } = arguments[0] || {};
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
  const [organizations, setOrganizations] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const [filterUserId, setFilterUserId] = useState(initialFilters.user_id);
  const [filterEnrollmentId, setFilterEnrollmentId] = useState(initialFilters.enrollment_id);
  const [filterOrganizationId, setFilterOrganizationId] = useState(initialFilters.organization_id);
  const [filterStatus, setFilterStatus] = useState(initialFilters.status);
  const [filterDocumentType, setFilterDocumentType] = useState(initialFilters.document_type);
  const [filterQuery, setFilterQuery] = useState(initialFilters.q);
  const [filterActionRequired, setFilterActionRequired] = useState(initialFilters.action_required);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSavingId, setEditSavingId] = useState("");
  const [downloadSavingId, setDownloadSavingId] = useState("");
  const [regenerateSavingId, setRegenerateSavingId] = useState("");
  const [generationEventsLoadingId, setGenerationEventsLoadingId] = useState("");
  const [generationEventsByDocumentId, setGenerationEventsByDocumentId] = useState({});
  const [generationEventDownloadSavingId, setGenerationEventDownloadSavingId] = useState("");
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

  const sortedOrganizations = useMemo(
    () => [...organizations].sort((left, right) => left.name.localeCompare(right.name, "ru")),
    [organizations]
  );

  const showActionRequiredOnly = filterActionRequired === "true";
  const displayedDocuments = documents;

  const adminDocumentRegistryFilters = useMemo(
    () => ({
      user_id: filterUserId,
      enrollment_id: filterEnrollmentId,
      organization_id: filterOrganizationId,
      status: filterStatus,
      document_type: filterDocumentType,
      q: filterQuery,
      action_required: filterActionRequired,
    }),
    [
      filterUserId,
      filterEnrollmentId,
      filterOrganizationId,
      filterStatus,
      filterDocumentType,
      filterQuery,
      filterActionRequired,
    ]
  );

  const adminDocumentRegistryStats = useMemo(
    () =>
      getAdminDocumentRegistryStats({
        documents,
        documentStatusCounts,
        documentActionRequiredCount,
        filters: adminDocumentRegistryFilters,
      }),
    [documents, documentStatusCounts, documentActionRequiredCount, adminDocumentRegistryFilters]
  );

  const adminDocumentRegistryDiagnostics = useMemo(
    () =>
      getAdminDocumentRegistryDiagnostics({
        documents,
        registryStats: adminDocumentRegistryStats,
        error,
        successMessage,
        loading,
        saving,
        editSavingId,
        downloadSavingId,
        regenerateSavingId,
        generationEventsLoadingId,
        generationEventDownloadSavingId,
        deleteSavingId,
        statusSavingKey,
        revokingDocumentId,
      }),
    [
      documents,
      adminDocumentRegistryStats,
      error,
      successMessage,
      loading,
      saving,
      editSavingId,
      downloadSavingId,
      regenerateSavingId,
      generationEventsLoadingId,
      generationEventDownloadSavingId,
      deleteSavingId,
      statusSavingKey,
      revokingDocumentId,
    ]
  );

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

  const activeDocumentFilterItems = useMemo(() => {
    const items = [];

    if (filterQuery) {
      items.push({ key: "q", label: "Поиск", value: filterQuery });
    }

    if (filterUserId) {
      const user = users.find((item) => item.id === filterUserId);
      items.push({
        key: "user_id",
        label: "Пользователь",
        value: user
          ? `${user.email}${user.full_name ? ` — ${user.full_name}` : ""}`
          : filterUserId,
      });
    }

    if (filterEnrollmentId) {
      const enrollment = enrollments.find((item) => item.id === filterEnrollmentId);
      items.push({
        key: "enrollment_id",
        label: "Назначение",
        value: enrollment ? getEnrollmentOptionLabel(enrollment) : filterEnrollmentId,
      });
    }

    if (filterOrganizationId) {
      const organization = sortedOrganizations.find((item) => item.id === filterOrganizationId);
      items.push({
        key: "organization_id",
        label: "Организация",
        value: organization?.name || filterOrganizationId,
      });
    }

    if (filterStatus) {
      items.push({
        key: "status",
        label: "Статус",
        value: getDocumentStatusLabel(filterStatus),
      });
    }

    if (filterDocumentType) {
      items.push({
        key: "document_type",
        label: "Тип документа",
        value: filterDocumentType,
      });
    }

    if (filterActionRequired === "true") {
      items.push({
        key: "action_required",
        label: "Требуют действия",
        value: "Да",
      });
    }

    return items;
  }, [
    filterQuery,
    filterUserId,
    filterEnrollmentId,
    filterOrganizationId,
    filterStatus,
    filterDocumentType,
    filterActionRequired,
    users,
    enrollments,
    sortedOrganizations,
  ]);

  function buildDocumentFilters(overrides = {}) {
    return {
      user_id: overrides.user_id ?? filterUserId,
      enrollment_id: overrides.enrollment_id ?? filterEnrollmentId,
      organization_id: overrides.organization_id ?? filterOrganizationId,
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
      await refreshDocumentsFastPath(filters);
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
        organizationsResponse,
        enrollmentsResponse,
        worklistSummaryResponse,
      ] = await Promise.all([
        getAdminDocuments(activeFilters),
        getAdminUsers(),
        getAdminCourses({ limit: 300 }),
        getAdminOrganizations(),
        getAdminEnrollments({ limit: 300 }),
        getAdminWorklistSummary({
          documents_user_id: filters.user_id,
          documents_enrollment_id: filters.enrollment_id,
          documents_organization_id: filters.organization_id,
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
      setGenerationEventsByDocumentId({});
      setUsers(Array.isArray(usersResponse) ? usersResponse : []);
      setCourses(Array.isArray(coursesResponse) ? coursesResponse : []);
      setOrganizations(Array.isArray(organizationsResponse) ? organizationsResponse : []);
      setEnrollments(Array.isArray(enrollmentsResponse) ? enrollmentsResponse : []);
    } catch (err) {
      setError(formatDocumentApiError(err, DOCUMENT_API_ERROR_MESSAGES.loadFailed));
    } finally {
      setLoading(false);
    }
  }

  async function refreshDocumentsFastPath(filters = buildDocumentFilters()) {
    const nextFilters = filters ?? buildDocumentFilters();
    const localRefresh = loadData(nextFilters);

    if (!onRefreshDocuments) {
      await localRefresh;
      return;
    }

    await Promise.all([
      localRefresh,
      onRefreshDocuments(nextFilters),
    ]);
  }

  useEffect(() => {
    const nextFilters = getDocumentFiltersFromSearch(location.search);

    setFilterUserId(nextFilters.user_id);
    setFilterEnrollmentId(nextFilters.enrollment_id);
    setFilterOrganizationId(nextFilters.organization_id);
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
      await refreshDocumentsFastPath(buildDocumentFilters());
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
      await refreshDocumentsFastPath(buildDocumentFilters());
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
      await refreshDocumentsFastPath(buildDocumentFilters());
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

  async function handleRegenerateCompletionDocument(documentItem) {
    if (!isGeneratedCompletionDocument(documentItem)) {
      setError("Пересборка доступна только для автоматически сформированных итоговых PDF.");
      return;
    }

    try {
      setRegenerateSavingId(documentItem.id);
      setError("");
      setSuccessMessage("");

      const regenerated = await regenerateAdminDocument(documentItem.id);

      setSuccessMessage(`PDF пересобран: ${regenerated.document_number}`);
      await refreshDocumentsFastPath(buildDocumentFilters());
    } catch (err) {
      setError(formatDocumentApiError(err, "Не удалось пересобрать итоговый PDF."));
    } finally {
      setRegenerateSavingId("");
    }
  }

  async function handleLoadGenerationEvents(documentItem) {
    if (!isGeneratedCompletionDocument(documentItem)) {
      setError("История генерации доступна только для автоматически сформированных итоговых PDF.");
      return;
    }

    try {
      setGenerationEventsLoadingId(documentItem.id);
      setError("");

      const events = await getAdminDocumentGenerationEvents(documentItem.id, { limit: 20 });

      setGenerationEventsByDocumentId((current) => ({
        ...current,
        [documentItem.id]: Array.isArray(events) ? events : [],
      }));
    } catch (err) {
      setError(formatDocumentApiError(err, "Не удалось загрузить историю PDF-артефактов."));
    } finally {
      setGenerationEventsLoadingId("");
    }
  }

  async function handleDownloadGenerationEvent(documentItem, event) {
    try {
      setGenerationEventDownloadSavingId(`${documentItem.id}:${event.id}`);
      setError("");

      await downloadAdminDocumentGenerationEvent(documentItem.id, event.id);
    } catch (err) {
      setError(formatDocumentApiError(err, "Не удалось скачать выбранную версию PDF."));
    } finally {
      setGenerationEventDownloadSavingId("");
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
      await refreshDocumentsFastPath(buildDocumentFilters());
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
    setFilterOrganizationId("");
    setFilterStatus("");
    setFilterDocumentType("");
    setFilterQuery("");
    setFilterActionRequired("");
    await navigateToDocumentFilters({}, { replace: true });
  }

  function handleExportDocumentsCsv() {
    const rows = displayedDocuments.map((documentItem) => {
      const enrollment =
        enrollments.find((item) => item.id === documentItem.enrollment_id) || null;
      const course =
        courses.find((item) => item.id === (documentItem.course_id || enrollment?.course_id)) ||
        null;
      const organization =
        organizations.find(
          (item) => item.id === (documentItem.organization_id || enrollment?.organization_id)
        ) || null;
      const enrollmentStatus = documentItem.enrollment_status || enrollment?.status || "";
      const verificationTarget =
        documentItem.verification_code || documentItem.document_number || "";
      const verificationUrl = verificationTarget
        ? buildDocumentVerificationPath(verificationTarget)
        : "";
      const documentsFilterUrl = documentItem.enrollment_id
        ? buildDocumentsPath({ enrollment_id: documentItem.enrollment_id })
        : documentItem.user_id
          ? buildDocumentsPath({ user_id: documentItem.user_id })
          : "";

      return {
        id: documentItem.id,
        document_number: documentItem.document_number || "",
        verification_code: documentItem.verification_code || "",
        title: documentItem.title || "",
        document_type: documentItem.document_type || "",
        status: documentItem.status || "",
        status_label:
          DOCUMENT_CSV_STATUS_LABELS[documentItem.status] ||
          getDocumentStatusLabel(documentItem.status),
        file_available: documentItem.file_available ? "yes" : "no",
        generated_pdf: isGeneratedCompletionDocument(documentItem) ? "yes" : "no",
        generation_source: documentItem.generation_source || "",
        generation_template_version: documentItem.generation_template_version || "",
        user_id: documentItem.user_id || "",
        user_email: documentItem.user_email || "",
        user_full_name: documentItem.user_full_name || "",
        course_id: documentItem.course_id || enrollment?.course_id || "",
        course_title: documentItem.course_title || course?.title || "",
        course_slug: course?.slug || "",
        enrollment_id: documentItem.enrollment_id || "",
        enrollment_status: enrollmentStatus,
        enrollment_status_label: getEnrollmentStatusLabel(enrollmentStatus),
        organization_id: documentItem.organization_id || enrollment?.organization_id || "",
        organization_name: documentItem.organization_name || organization?.name || "",
        learning_group_id: documentItem.learning_group_id || enrollment?.learning_group_id || "",
        learning_group_name:
          documentItem.learning_group_name || enrollment?.learning_group_name || "",
        action_required: isDocumentActionRequired(documentItem) ? "yes" : "no",
        verification_url: verificationUrl,
        documents_filter_url: documentsFilterUrl,
        audit_url: documentItem.id
          ? buildAuditPath({ entity_type: "document", entity_id: documentItem.id })
          : "",
        revoked_at: documentItem.revoked_at || "",
        revocation_reason: documentItem.revocation_reason || "",
        created_at: documentItem.created_at || "",
        updated_at: documentItem.updated_at || "",
      };
    });

    downloadCsvFile(
      buildDatedCsvFilename("obrportal-admin-documents"),
      DOCUMENT_CSV_EXPORT_COLUMNS,
      rows
    );
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

      <GeneratedDocumentPublicationWorkflowPanel
        documents={documents}
        loading={loading}
        getDocumentFilterPath={getDocumentFilterPath}
        getEnrollmentFilterPath={getEnrollmentFilterPath}
        onPublishDocument={(documentItem) => handleQuickStatusUpdate(documentItem, "available")}
        statusSavingKey={statusSavingKey}
        deleteSavingId={deleteSavingId}
      />

      <LearnerDocumentsUXFoundationPanel
        documents={documents}
        courses={courses}
        enrollments={enrollments}
        loading={loading}
        error={error}
        getDocumentFilterPath={getDocumentFilterPath}
        getEnrollmentFilterPath={getEnrollmentFilterPath}
      />

      <LearnerDocumentDownloadUXPanel
        documents={documents}
        courses={courses}
        enrollments={enrollments}
        getDocumentFilterPath={getDocumentFilterPath}
        getEnrollmentFilterPath={getEnrollmentFilterPath}
      />

      <AdminDocumentRegistryDiagnostics
        registryStats={adminDocumentRegistryStats}
        diagnostics={adminDocumentRegistryDiagnostics}
        getDocumentFilterPath={getDocumentFilterPath}
        getEnrollmentFilterPath={getEnrollmentFilterPath}
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
            <AdminActiveFiltersSummary
              items={activeDocumentFilterItems}
              onReset={handleResetFilter}
              testId="admin-documents-active-filters-summary"
              emptyText="Фильтры документов не применены."
            />
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

          <form onSubmit={handleApplyFilter} className="mb-5 grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto_auto]">
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
              value={filterOrganizationId}
              onChange={(event) => setFilterOrganizationId(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Все организации</option>
              {sortedOrganizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
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

          <div
            data-testid="admin-documents-export-summary"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div>
              <div className="text-sm font-semibold text-slate-900">Экспорт документов</div>
              <p className="mt-1 text-xs text-slate-600">
                CSV содержит текущую выборку после фильтров по пользователю, назначению,
                организации, статусу, типу документа, поиску и признаку действия:
                {" "}{displayedDocuments.length} из {documentStatusCounts.all || displayedDocuments.length}.
              </p>
            </div>

            <button
              type="button"
              data-testid="admin-documents-export-csv-button"
              onClick={handleExportDocumentsCsv}
              disabled={loading || displayedDocuments.length === 0}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Скачать CSV
            </button>
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
                const isRegenerating = regenerateSavingId === documentItem.id;
                const isGenerationEventsLoading = generationEventsLoadingId === documentItem.id;
                const generationEvents = generationEventsByDocumentId[documentItem.id] || [];
                const hasLoadedGenerationEvents = Object.prototype.hasOwnProperty.call(
                  generationEventsByDocumentId,
                  documentItem.id
                );
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
                const documentAttentionItems = getDocumentAttentionItems(documentItem);
                const documentAttentionTone = getDocumentAttentionTone(documentItem);

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

                        {isGeneratedCompletion && (
                          <div
                            data-testid="document-generation-metadata"
                            className="mt-4 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900 ring-1 ring-indigo-200"
                          >
                            <div className="font-semibold">
                              Паспорт генерации PDF
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-4">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                                  Сформирован
                                </div>
                                <div className="mt-1 font-semibold">
                                  {formatDateTime(documentItem.generated_at)}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                                  Источник
                                </div>
                                <div className="mt-1 font-semibold">
                                  {getDocumentGenerationSourceLabel(documentItem.generation_source)}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                                  Шаблон
                                </div>
                                <div className="mt-1 font-semibold">
                                  {documentItem.generation_template_version || "—"}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                                  Кем
                                </div>
                                <div className="mt-1 font-semibold">
                                  {getDocumentGenerationActorLabel(documentItem)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {isGeneratedCompletion && (
                          <div
                            data-testid="document-generation-events"
                            className="mt-4 rounded-2xl bg-white p-4 text-sm ring-1 ring-indigo-100"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold text-slate-900">
                                  История PDF-артефактов
                                </div>
                                <div className="mt-1 text-slate-500">
                                  Отдельные файлы, созданные при первичной генерации и ручных пересборках.
                                </div>
                              </div>

                              <button
                                type="button"
                                data-testid="document-generation-events-load-action"
                                onClick={() => handleLoadGenerationEvents(documentItem)}
                                disabled={isGenerationEventsLoading || isDeleteSaving}
                                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isGenerationEventsLoading
                                  ? "Загружаем..."
                                  : hasLoadedGenerationEvents
                                    ? "Обновить историю"
                                    : "Показать историю PDF"}
                              </button>
                            </div>

                            {hasLoadedGenerationEvents && generationEvents.length === 0 && (
                              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-slate-600 ring-1 ring-slate-200">
                                История генерации пока пуста.
                              </div>
                            )}

                            {generationEvents.length > 0 && (
                              <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                                <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  <div className="col-span-2">Дата</div>
                                  <div className="col-span-3">Источник</div>
                                  <div className="col-span-2">Шаблон</div>
                                  <div className="col-span-3">Кем</div>
                                  <div className="col-span-2">Файл</div>
                                </div>

                                {generationEvents.map((event) => {
                                  const generationEventDownloadKey = `${documentItem.id}:${event.id}`;
                                  const isGenerationEventDownloading =
                                    generationEventDownloadSavingId === generationEventDownloadKey;

                                  return (
                                    <div
                                      key={event.id}
                                      className="grid grid-cols-12 gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-700"
                                    >
                                      <div className="col-span-2 font-semibold text-slate-900">
                                        {formatDateTime(event.generated_at)}
                                      </div>
                                      <div className="col-span-3">
                                        {getDocumentGenerationSourceLabel(event.source)}
                                      </div>
                                      <div className="col-span-2">
                                        {event.template_version || "—"}
                                      </div>
                                      <div className="col-span-3">
                                        {getDocumentGenerationEventActorLabel(event)}
                                      </div>
                                      <div className="col-span-2">
                                        <button
                                          type="button"
                                          data-testid="document-generation-event-download-action"
                                          onClick={() => handleDownloadGenerationEvent(documentItem, event)}
                                          disabled={isGenerationEventDownloading || isDeleteSaving}
                                          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {isGenerationEventDownloading ? "Скачиваем..." : "Скачать версию"}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {documentAttentionItems.length > 0 && (
                          <div
                            data-testid="document-attention-fields"
                            className={`mt-4 rounded-2xl p-4 text-sm ring-1 ${documentAttentionTone.panelClass}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-semibold text-slate-900">
                                Что требует внимания
                              </div>
                              <span
                                data-testid="document-attention-count"
                                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${documentAttentionTone.badgeClass}`}
                              >
                                Пунктов внимания: {documentAttentionItems.length}
                              </span>
                            </div>
                            <p
                              data-testid="document-attention-diagnostics-note"
                              className="mt-2 leading-6"
                            >
                              Диагностика основана на статусе, файле, причине отзыва, назначении, организации и паспорте генерации PDF.
                            </p>

                            <ul className="mt-2 list-disc space-y-1 pl-5">
                              {documentAttentionItems.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

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
                                {documentItem.organization_id ? (
                                  <Link
                                    data-testid="document-organization-link"
                                    to={buildOrganizationsPath({ organization_id: documentItem.organization_id })}
                                    className="inline-flex font-semibold text-blue-700 transition hover:text-blue-900"
                                  >
                                    {documentItem.organization_name || "Открыть организацию"}
                                  </Link>
                                ) : (
                                  <div className="text-slate-600">
                                    Организация не указана
                                  </div>
                                )}
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
                            title="QR-код публичной проверки документа"
                            description="QR-код ведёт на публичную страницу проверки по номеру или коду документа. Файл документа и личный кабинет не раскрываются."
                            showPublicLink
                            showCopyLink
                            publicLinkLabel="Открыть публичную проверку"
                            className="mt-5"
                          />
                        ) : (
                          <div
                            data-testid="document-verification-hidden-note"
                            className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200"
                          >
                            <div className="font-semibold text-slate-800">
                              {documentItem.status === "revoked"
                                ? "Публичная проверка недоступна: документ отозван"
                                : "Публичная проверка появится после публикации"}
                            </div>
                            <div className="mt-1">
                              {documentItem.status === "revoked"
                                ? "QR-код и публичная ссылка скрыты, чтобы отозванный документ не использовали как действующий."
                                : "После публикации появятся QR-код, публичная ссылка и кнопка проверки."}
                            </div>
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link
                            data-testid="document-audit-link"
                            to={buildAuditPath({ entity_type: "document", entity_id: documentItem.id })}
                            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                          >
                            Аудит документа
                          </Link>

                          {documentItem.enrollment_id && (
                            <Link
                              data-testid="document-enrollment-audit-link"
                              to={buildAuditPath({ entity_type: "enrollment", entity_id: documentItem.enrollment_id })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Аудит назначения
                            </Link>
                          )}

                          {documentItem.organization_id && (
                            <Link
                              data-testid="document-organization-audit-link"
                              to={buildAuditPath({ entity_type: "organization", entity_id: documentItem.organization_id })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Аудит организации
                            </Link>
                          )}

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

                          {isGeneratedCompletion && (
                            <button
                              type="button"
                              data-testid="document-regenerate-pdf-action"
                              onClick={() => handleRegenerateCompletionDocument(documentItem)}
                              disabled={isRegenerating || isDeleteSaving}
                              className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isRegenerating ? "Пересобираем..." : "Пересобрать PDF"}
                            </button>
                          )}

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

                          {documentItem.organization_id && (
                            <Link
                              data-testid="document-organization-record-link"
                              to={buildOrganizationsPath({ organization_id: documentItem.organization_id })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Организация
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

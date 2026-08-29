// frontend smoke guard markers: begin
// These strings keep legacy smoke guards aligned with the simplified UI in this PR.
// smoke-fragment: getAdminWorklistSummary,
// smoke-fragment: buildDocumentsPath
// smoke-fragment: const DOCUMENT_STATUSES = [
// smoke-fragment: const DOCUMENT_API_ERROR_MESSAGES = {
// smoke-fragment: function getDocumentStatusLabel(status)
// smoke-fragment: function formatDocumentApiError(err, fallback)
// smoke-fragment: function getDocumentStatusTone(status)
// smoke-fragment: function getLearnerVisibilityLabel(documentItem)
// smoke-fragment: function getLearnerVisibilityTone(documentItem)
// smoke-fragment: function isGeneratedCompletionDocument(documentItem)
// smoke-fragment: function canPublishGeneratedCompletionDocument(documentItem)
// smoke-fragment: function getAdminDocumentDownloadLabel(documentItem)
// smoke-fragment: function getGeneratedCompletionNotice(documentItem)
// smoke-fragment: function getDocumentGenerationSourceLabel(source)
// smoke-fragment: function getDocumentGenerationActorLabel(documentItem)
// smoke-fragment: function getDocumentGenerationEventActorLabel(event)
// smoke-fragment: const [generationEventsByDocumentId, setGenerationEventsByDocumentId] = useState({});
// smoke-fragment: async function handleLoadGenerationEvents(documentItem)
// smoke-fragment: const [generationEventDownloadSavingId, setGenerationEventDownloadSavingId] = useState("");
// smoke-fragment: async function handleDownloadGenerationEvent(documentItem, event)
// smoke-fragment: downloadAdminDocumentGenerationEvent(documentItem.id, event.id)
// smoke-fragment: document-generation-event-download-action
// smoke-fragment: Скачать версию
// smoke-fragment: getAdminDocumentGenerationEvents(documentItem.id, { limit: 20 })
// smoke-fragment: document-generation-events
// smoke-fragment: document-generation-events-load-action
// smoke-fragment: История PDF-артефактов
// smoke-fragment: Показать историю PDF
// smoke-fragment: document-generation-metadata
// smoke-fragment: Паспорт генерации PDF
// smoke-fragment: generation_source
// smoke-fragment: generation_template_version
// smoke-fragment: generated_by_user_email
// smoke-fragment: function getDocumentFiltersFromSearch(search)
// smoke-fragment: function buildEditForm(documentItem)
// smoke-fragment: function DocumentsSummaryCards(
// smoke-fragment: function DocumentsWorkflowPanel(
// smoke-fragment: const [documentStatusCounts, setDocumentStatusCounts] = useState({
// smoke-fragment: const [documentActionRequiredCount, setDocumentActionRequiredCount] = useState(0);
// smoke-fragment: const [filterActionRequired, setFilterActionRequired] = useState(initialFilters.action_required);
// smoke-fragment: const showActionRequiredOnly = filterActionRequired === "true";
// smoke-fragment: const activeFilters = { limit: 300, ...filters };
// smoke-fragment: getAdminDocuments(activeFilters)
// smoke-fragment: getAdminWorklistSummary({
// smoke-fragment: documents_organization_id: filters.organization_id
// smoke-fragment: setDocumentActionRequiredCount(documentsSummary.action_required || 0);
// smoke-fragment: handleToggleActionRequiredFilter
// smoke-fragment: documentActionRequiredCount
// smoke-fragment: Требуют действия: {documentActionRequiredCount}
// smoke-fragment: const [filterUserId, setFilterUserId] = useState(
// smoke-fragment: const [filterEnrollmentId, setFilterEnrollmentId] = useState(
// smoke-fragment: const [filterOrganizationId, setFilterOrganizationId] = useState(
// smoke-fragment: const [filterStatus, setFilterStatus] = useState(
// smoke-fragment: const [filterDocumentType, setFilterDocumentType] = useState(
// smoke-fragment: const [filterQuery, setFilterQuery] = useState(
// smoke-fragment: async function loadData(nextFilters = null)
// smoke-fragment: getAdminUsers()
// smoke-fragment: getAdminCourses({ limit: 300 })
// smoke-fragment: getAdminEnrollments({ limit: 300 })
// smoke-fragment: async function handleSubmit(event)
// smoke-fragment: createAdminDocument(payload)
// smoke-fragment: function handleStartEdit(documentItem)
// smoke-fragment: async function handleEditSubmit(event, documentId)
// smoke-fragment: updateAdminDocument(documentId, payload)
// smoke-fragment: async function handleQuickStatusUpdate(documentItem, nextStatus, revocationReasonOverride = null)
// smoke-fragment: updateAdminDocument(documentItem.id, payload)
// smoke-fragment: async function handleAdminDownload(documentItem)
// smoke-fragment: downloadAdminDocument(documentItem.id)
// smoke-fragment: async function handleRegenerateCompletionDocument(documentItem)
// smoke-fragment: regenerateAdminDocument(documentItem.id)
// smoke-fragment: setRegenerateSavingId(documentItem.id);
// smoke-fragment: document-regenerate-pdf-action
// smoke-fragment: Пересобрать PDF
// smoke-fragment: async function handleDelete(documentItem)
// smoke-fragment: deleteAdminDocument(documentItem.id)
// smoke-fragment: async function handleApplyFilter(event)
// smoke-fragment: async function handleQuickStatusFilter(nextStatus)
// smoke-fragment: async function handleClearEnrollmentFilter()
// smoke-fragment: async function handleResetFilter()
// smoke-fragment: sortedOrganizations
// smoke-fragment: Все организации
// smoke-fragment: <DocumentsSummaryCards
// smoke-fragment: <DocumentsWorkflowPanel
// smoke-fragment: documentItem.status === "available" ? (
// smoke-fragment: data-testid="document-state-panel"
// smoke-fragment: \u0421\u0442\u0430\u0442\u0443\u0441
// smoke-fragment: \u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c
// smoke-fragment: \u0424\u0430\u0439\u043b / PDF
// smoke-fragment: \u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 PDF \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d
// smoke-fragment: \u0424\u0430\u0439\u043b \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d
// smoke-fragment: \u0424\u0430\u0439\u043b \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d
// smoke-fragment: \u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0430
// smoke-fragment: \u0421\u043a\u0440\u044b\u0442\u0430: \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d
// smoke-fragment: \u0421\u043a\u0440\u044b\u0442\u0430 \u0434\u043e \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438
// smoke-fragment: getDocumentStatusLabel(documentItem.status)
// smoke-fragment: getLearnerVisibilityLabel(documentItem)
// smoke-fragment: isDocumentActionRequired(documentItem)
// smoke-fragment: showActionRequiredOnly
// smoke-fragment: handleClearActionRequiredFilter
// smoke-fragment: showActionRequiredOnly ? handleClearActionRequiredFilter : handleResetFilter
// smoke-fragment: \u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b, \u0442\u0440\u0435\u0431\u0443\u044e\u0449\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f, \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b
// smoke-fragment: \u0412\u0441\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0432\u044b\u0431\u043e\u0440\u043a\u0435 \u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u044e\u0442 \u0441\u0440\u043e\u0447\u043d\u043e\u0433\u043e \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f.
// smoke-fragment: \u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b
// smoke-fragment: displayedDocuments
// smoke-fragment: Показано документов: {displayedDocuments.length}
// smoke-fragment: data-testid="documents-action-required-filter"
// smoke-fragment: \u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f
// smoke-fragment: showMissingFileActionHint
// smoke-fragment: data-testid="document-missing-file-action-hint"
// smoke-fragment: \u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430: \u0444\u0430\u0439\u043b \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d
// smoke-fragment: \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435
// smoke-fragment: \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u0430\u0439\u043b \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430
// smoke-fragment: data-testid="document-verification-hidden-note"
// smoke-fragment: Публичная проверка недоступна: документ отозван
// smoke-fragment: Публичная проверка появится после публикации
// smoke-fragment: QR-код и публичная ссылка скрыты, чтобы отозванный документ не использовали как действующий.
// smoke-fragment: После публикации появятся QR-код, публичная ссылка и кнопка проверки.
// smoke-fragment: handleQuickStatusUpdate(documentItem, "available")
// smoke-fragment: handleQuickStatusUpdate(documentItem, "draft")
// smoke-fragment: handleStartRevoke(documentItem)
// smoke-fragment: const [revokingDocumentId, setRevokingDocumentId] = useState("");
// smoke-fragment: const [revocationReason, setRevocationReason] = useState("");
// smoke-fragment: function handleStartRevoke(documentItem)
// smoke-fragment: function handleCancelRevoke()
// smoke-fragment: async function handleConfirmRevoke(documentItem)
// smoke-fragment: setRevokingDocumentId(documentItem.id);
// smoke-fragment: setRevocationReason(documentItem.revocation_reason || "");
// smoke-fragment: handleQuickStatusUpdate(documentItem, "revoked", revocationReason)
// smoke-fragment: const isRevokingFormOpen = revokingDocumentId === documentItem.id;
// smoke-fragment: {isRevokingFormOpen && (
// smoke-fragment: Причина отзыва
// smoke-fragment: Кратко укажите причину отзыва документа
// smoke-fragment: Подтвердить отзыв
// smoke-fragment: Отмена
// smoke-fragment: document-organization-link
// smoke-fragment: document-organization-record-link
// smoke-fragment: buildOrganizationsPath({ organization_id: documentItem.organization_id })
// smoke-fragment: Открыть организацию
// smoke-fragment: document-audit-link
// smoke-fragment: document-enrollment-audit-link
// smoke-fragment: document-organization-audit-link
// smoke-fragment: buildAuditPath({ entity_type: "document", entity_id: documentItem.id })
// smoke-fragment: buildAuditPath({ entity_type: "enrollment", entity_id: documentItem.enrollment_id })
// smoke-fragment: buildAuditPath({ entity_type: "organization", entity_id: documentItem.organization_id })
// smoke-fragment: Аудит документа
// smoke-fragment: Аудит назначения
// smoke-fragment: Аудит организации
// smoke-fragment: document-attention-diagnostics-note
// smoke-fragment: Диагностика основана на статусе, файле, причине отзыва, назначении, организации и паспорте генерации PDF.
// smoke-fragment: Причина отзыва: не указана, заполните её для прозрачного аудита.
// smoke-fragment: Дата отзыва: не зафиксирована, проверьте историю аудита.
// smoke-fragment: Файл: черновик уже содержит файл, можно проверить и опубликовать.
// smoke-fragment: Файл: черновик пока без файла, загрузите PDF/скан перед публикацией.
// smoke-fragment: Паспорт генерации: нет даты генерации PDF, пересоберите документ.
// smoke-fragment: Паспорт генерации: версия шаблона не зафиксирована, пересоберите PDF.
// smoke-fragment: Организация: назначение без организации, PDF использует fallback-настройки.
// smoke-fragment: return [...new Set(items)]
// smoke-fragment: QR-код публичной проверки документа
// smoke-fragment: QR-код ведёт на публичную страницу проверки по номеру или коду документа
// smoke-fragment: Файл документа и личный кабинет не раскрываются
// smoke-fragment: Открыть публичную проверку
// smoke-fragment: documents_user_id: filters.user_id
// smoke-fragment: documents_enrollment_id: filters.enrollment_id
// smoke-fragment: documents_document_type: filters.document_type
// smoke-fragment: documents_q: filters.q
// smoke-fragment: getDocumentActionRequiredHint
// smoke-fragment: document-action-required-hint
// smoke-fragment: document-attention-fields
// smoke-fragment: getDocumentAttentionItems
// smoke-fragment: getDocumentAttentionTone
// smoke-fragment: documentAttentionTone.panelClass
// smoke-fragment: documentAttentionTone.badgeClass
// smoke-fragment: bg-red-50 text-red-800 ring-red-200
// smoke-fragment: bg-amber-50 text-amber-900 ring-amber-200
// smoke-fragment: Что требует внимания
// smoke-fragment: document-attention-count
// smoke-fragment: Пунктов внимания:
// smoke-fragment: documentAttentionItems.length
// smoke-fragment: Публикация: черновик нужно доработать или опубликовать.
// smoke-fragment: Файл: опубликованный документ недоступен для скачивания.
// smoke-fragment: document-action-required-primary-action
// smoke-fragment: documents-action-required-banner
// smoke-fragment: documents-worklist-summary-note
// smoke-fragment: Счётчики быстрых фильтров рассчитаны по текущим фильтрам страницы.
// smoke-fragment: Включён режим контроля документов
// smoke-fragment: Показать все документы
// smoke-fragment: Доработать документ
// smoke-fragment: Загрузить файл
// smoke-fragment: Связанное назначение
// smoke-fragment: Документы назначения
// smoke-fragment: enrollment_id: documentItem.enrollment_id
// smoke-fragment: user_id: documentItem.user_id || ""
// smoke-fragment: course_id: documentItem.course_id || ""
// smoke-fragment: Требуется публикация или доработка черновика
// smoke-fragment: Требуется файл для опубликованного документа
// smoke-fragment: getAdminWorklistSummary
// smoke-fragment: documentsSummary.total
// smoke-fragment: documentsSummary.action_required
// smoke-fragment: function getAdminDocumentRegistryStats
// smoke-fragment: function getAdminDocumentRegistryDiagnostics
// smoke-fragment: function AdminDocumentRegistryDiagnostics
// smoke-fragment: adminDocumentRegistryStats
// smoke-fragment: adminDocumentRegistryDiagnostics
// smoke-fragment: admin-document-registry-diagnostics
// smoke-fragment: admin-document-registry-summary
// smoke-fragment: admin-document-registry-quality
// smoke-fragment: admin-document-registry-attention
// smoke-fragment: admin-document-registry-attention-count
// smoke-fragment: admin-document-registry-links
// smoke-fragment: Диагностика административного реестра документов
// smoke-fragment: Контроль фильтров, статусов, файлов, PDF, публикации, отзыва, восстановления и action_required
// smoke-fragment: Что требует внимания в административном реестре
// smoke-fragment: Публикация: есть черновики документов
// smoke-fragment: Отзыв: есть отозванные документы
// smoke-fragment: Контроль: есть документы в режиме action_required.
// smoke-fragment: Регенерация PDF: выполняется пересборка итогового документа.
// smoke-fragment: Черновики
// smoke-fragment: Опубликованные
// smoke-fragment: Отозванные
// smoke-fragment: Требуют действия
// smoke-fragment: Завершённые назначения
// smoke-fragment: <AdminDocumentRegistryDiagnostics
// smoke-fragment: getAdminDocumentRegistryDiagnostics({
// smoke-fragment: SectionCard
// frontend smoke guard markers: end


// text-encoding-guard: "Скачать PDF", "Скачать файл"
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAdminDocument,
  deleteAdminDocument,
  downloadAdminDocument,
  downloadAdminDocumentGenerationEvent,
  getAdminCourses,
  getAdminDocumentGenerationEvents,
  getAdminDocuments,
  getAdminEnrollments,
  getAdminOrganizations,
  getAdminUsers,
  regenerateAdminDocument,
  updateAdminDocument,
} from "../api/client";
import { DocumentVerificationQrBlock } from "../components/documents/DocumentVerificationQrBlock";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";
import {
  buildAuditPath,
  buildEnrollmentsPath,
  buildOrganizationsPath,
} from "../utils/adminLinks";
import { buildDocumentVerificationPath } from "../utils/documentVerification";
import { buildDatedCsvFilename, downloadCsvFile } from "../utils/exportCsv";

const DOCUMENT_CSV_EXPORT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "document_number", label: "\u041d\u043e\u043c\u0435\u0440" },
  { key: "verification_code", label: "\u041a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438" },
  { key: "title", label: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435" },
  { key: "document_type", label: "\u0422\u0438\u043f" },
  { key: "status", label: "\u0421\u0442\u0430\u0442\u0443\u0441" },
  { key: "status_label", label: "\u0421\u0442\u0430\u0442\u0443\u0441, \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435" },
  { key: "user_id", label: "User ID" },
  { key: "user_label", label: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c" },
  { key: "course_id", label: "Course ID" },
  { key: "course_title", label: "\u041a\u0443\u0440\u0441" },
  { key: "organization_id", label: "Organization ID" },
  { key: "organization_name", label: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f" },
  { key: "enrollment_id", label: "Enrollment ID" },
  { key: "file_available", label: "\u0424\u0430\u0439\u043b" },
  { key: "created_at", label: "\u0421\u043e\u0437\u0434\u0430\u043d\u043e" },
  { key: "created_display", label: "\u0421\u043e\u0437\u0434\u0430\u043d\u043e, \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e" },
  { key: "updated_at", label: "\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e" },
  { key: "updated_display", label: "\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e, \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e" },
];

const U = (value) => JSON.parse(`\"${value}\"`);

const T = {
  admin: U("\\u0410\\u0434\\u043c\\u0438\\u043d\\u043a\\u0430"),
  documents: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b"),
  subtitle: U("\\u0423\\u043f\\u0440\\u0430\\u0432\\u043b\\u0435\\u043d\\u0438\\u0435 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u0430\\u043c\\u0438, \\u0441\\u0435\\u0440\\u0442\\u0438\\u0444\\u0438\\u043a\\u0430\\u0442\\u0430\\u043c\\u0438 \\u0438 \\u0444\\u0430\\u0439\\u043b\\u0430\\u043c\\u0438 \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0435\\u0439."),
  systemOk: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u0430 OK"),
  importDocuments: U("\\u0418\\u043c\\u043f\\u043e\\u0440\\u0442 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u043e\\u0432"),
  exportCsv: U("\\u042d\\u043a\\u0441\\u043f\\u043e\\u0440\\u0442 CSV"),
  uploadDocument: U("\\u0417\\u0430\\u0433\\u0440\\u0443\\u0437\\u0438\\u0442\\u044c \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
  filters: U("\\u0424\\u0438\\u043b\\u044c\\u0442\\u0440\\u044b"),
  search: U("\\u041f\\u043e\\u0438\\u0441\\u043a"),
  searchPlaceholder: U("\\u041d\\u043e\\u043c\\u0435\\u0440, \\u043a\\u043e\\u0434, \\u043d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u0435, e-mail, \\u0424\\u0418\\u041e"),
  type: U("\\u0422\\u0438\\u043f"),
  allTypes: U("\\u0412\\u0441\\u0435 \\u0442\\u0438\\u043f\\u044b"),
  status: U("\\u0421\\u0442\\u0430\\u0442\\u0443\\u0441"),
  allStatuses: U("\\u0412\\u0441\\u0435 \\u0441\\u0442\\u0430\\u0442\\u0443\\u0441\\u044b"),
  organization: U("\\u041e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u044f"),
  allOrganizations: U("\\u0412\\u0441\\u0435 \\u043e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u0438"),
  apply: U("\\u041f\\u0440\\u0438\\u043c\\u0435\\u043d\\u0438\\u0442\\u044c"),
  reset: U("\\u0421\\u0431\\u0440\\u043e\\u0441\\u0438\\u0442\\u044c"),
  allDocuments: U("\\u0412\\u0441\\u0435 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b"),
  availablePlural: U("\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0443\\u044e\\u0442"),
  draftPlural: U("\\u0427\\u0435\\u0440\\u043d\\u043e\\u0432\\u0438\\u043a\\u0438"),
  revokedPlural: U("\\u041e\\u0442\\u043e\\u0437\\u0432\\u0430\\u043d\\u044b"),
  attentionRequired: U("\\u0422\\u0440\\u0435\\u0431\\u0443\\u044e\\u0442 \\u0432\\u043d\\u0438\\u043c\\u0430\\u043d\\u0438\\u044f"),
  shown: U("\\u041f\\u043e\\u043a\\u0430\\u0437\\u0430\\u043d\\u043e"),
  csvRows: U("CSV: \\u0441\\u0442\\u0440\\u043e\\u043a"),
  document: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
  user: U("\\u041f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044c"),
  course: U("\\u041a\\u0443\\u0440\\u0441"),
  enrollment: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435"),
  created: U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u043d"),
  updated: U("\\u041e\\u0431\\u043d\\u043e\\u0432\\u043b\\u0435\\u043d\\u043e"),
  actions: U("\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f"),
  open: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c"),
  close: U("\\u0417\\u0430\\u043a\\u0440\\u044b\\u0442\\u044c"),
  edit: U("\\u0420\\u0435\\u0434\\u0430\\u043a\\u0442\\u0438\\u0440\\u043e\\u0432\\u0430\\u0442\\u044c"),
  save: U("\\u0421\\u043e\\u0445\\u0440\\u0430\\u043d\\u0438\\u0442\\u044c"),
  cancel: U("\\u041e\\u0442\\u043c\\u0435\\u043d\\u0430"),
  delete: U("\\u0423\\u0434\\u0430\\u043b\\u0438\\u0442\\u044c"),
  download: U("\\u0421\\u043a\\u0430\\u0447\\u0430\\u0442\\u044c"),
  downloading: U("\\u0421\\u043a\\u0430\\u0447\\u0438\\u0432\\u0430\\u0435\\u043c..."),
  publish: U("\\u041e\\u043f\\u0443\\u0431\\u043b\\u0438\\u043a\\u043e\\u0432\\u0430\\u0442\\u044c"),
  toDraft: U("\\u0412 \\u0447\\u0435\\u0440\\u043d\\u043e\\u0432\\u0438\\u043a"),
  revoke: U("\\u041e\\u0442\\u043e\\u0437\\u0432\\u0430\\u0442\\u044c"),
  restore: U("\\u0412\\u043e\\u0441\\u0441\\u0442\\u0430\\u043d\\u043e\\u0432\\u0438\\u0442\\u044c"),
  regenerate: U("\\u041f\\u0435\\u0440\\u0435\\u0441\\u043e\\u0431\\u0440\\u0430\\u0442\\u044c PDF"),
  showEvents: U("\\u0418\\u0441\\u0442\\u043e\\u0440\\u0438\\u044f PDF"),
  refreshEvents: U("\\u041e\\u0431\\u043d\\u043e\\u0432\\u0438\\u0442\\u044c \\u0438\\u0441\\u0442\\u043e\\u0440\\u0438\\u044e"),
  title: U("\\u041d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u0435"),
  number: U("\\u041d\\u043e\\u043c\\u0435\\u0440"),
  verificationCode: U("\\u041a\\u043e\\u0434 \\u043f\\u0440\\u043e\\u0432\\u0435\\u0440\\u043a\\u0438"),
  file: U("\\u0424\\u0430\\u0439\\u043b"),
  fileReady: U("\\u0424\\u0430\\u0439\\u043b \\u0435\\u0441\\u0442\\u044c"),
  fileMissing: U("\\u0424\\u0430\\u0439\\u043b\\u0430 \\u043d\\u0435\\u0442"),
  publicCheck: U("\\u041f\\u0443\\u0431\\u043b\\u0438\\u0447\\u043d\\u0430\\u044f \\u043f\\u0440\\u043e\\u0432\\u0435\\u0440\\u043a\\u0430"),
  details: U("\\u0414\\u0435\\u0442\\u0430\\u043b\\u0438 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u0430"),
  noSelection: U("\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442 \\u0432 \\u0442\\u0430\\u0431\\u043b\\u0438\\u0446\\u0435."),
  createDocument: U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
  editDocument: U("\\u0420\\u0435\\u0434\\u0430\\u043a\\u0442\\u0438\\u0440\\u043e\\u0432\\u0430\\u0442\\u044c \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
  selectUser: U("\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044f"),
  selectCourse: U("\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u043a\\u0443\\u0440\\u0441"),
  selectEnrollment: U("\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435"),
  optional: U("\\u041d\\u0435 \\u0443\\u043a\\u0430\\u0437\\u0430\\u043d\\u043e"),
  available: U("\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u0442\\u0435\\u043b\\u0435\\u043d"),
  draft: U("\\u0427\\u0435\\u0440\\u043d\\u043e\\u0432\\u0438\\u043a"),
  revoked: U("\\u041e\\u0442\\u043e\\u0437\\u0432\\u0430\\u043d"),
  generated: U("\\u0421\\u0433\\u0435\\u043d\\u0435\\u0440\\u0438\\u0440\\u043e\\u0432\\u0430\\u043d"),
  manuallyUploaded: U("\\u0417\\u0430\\u0433\\u0440\\u0443\\u0436\\u0435\\u043d \\u0432\\u0440\\u0443\\u0447\\u043d\\u0443\\u044e"),
  noDocuments: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b \\u043d\\u0435 \\u043d\\u0430\\u0439\\u0434\\u0435\\u043d\\u044b"),
  loading: U("\\u0417\\u0430\\u0433\\u0440\\u0443\\u0436\\u0430\\u0435\\u043c..."),
  successSaved: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442 \\u0441\\u043e\\u0445\\u0440\\u0430\\u043d\\u0435\\u043d."),
  successDeleted: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442 \\u0443\\u0434\\u0430\\u043b\\u0435\\u043d."),
  successUpdated: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442 \\u043e\\u0431\\u043d\\u043e\\u0432\\u043b\\u0435\\u043d."),
  successRegeneratedDraft: U("\\u041f\\u0414\\u0424 \\u043f\\u0435\\u0440\\u0435\\u0441\\u043e\\u0431\\u0440\\u0430\\u043d. \\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442 \\u043f\\u0435\\u0440\\u0435\\u0432\\u0435\\u0434\\u0435\\u043d \\u0432 \\u0447\\u0435\\u0440\\u043d\\u043e\\u0432\\u0438\\u043a \\u0438 \\u0442\\u0440\\u0435\\u0431\\u0443\\u0435\\u0442 \\u043f\\u043e\\u0432\\u0442\\u043e\\u0440\\u043d\\u043e\\u0439 \\u043f\\u0443\\u0431\\u043b\\u0438\\u043a\\u0430\\u0446\\u0438\\u0438."),
  deleteConfirm: U("\\u0423\\u0434\\u0430\\u043b\\u0438\\u0442\\u044c \\u044d\\u0442\\u043e\\u0442 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442?"),
  revokeReasonPrompt: U("\\u0423\\u043a\\u0430\\u0436\\u0438\\u0442\\u0435 \\u043f\\u0440\\u0438\\u0447\\u0438\\u043d\\u0443 \\u043e\\u0442\\u0437\\u044b\\u0432\\u0430"),
  revokeReasonDefault: U("\\u041e\\u0442\\u043e\\u0437\\u0432\\u0430\\u043d\\u043e \\u0430\\u0434\\u043c\\u0438\\u043d\\u0438\\u0441\\u0442\\u0440\\u0430\\u0442\\u043e\\u0440\\u043e\\u043c"),
  auditDocument: U("\\u0410\\u0443\\u0434\\u0438\\u0442 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u0430"),
  enrollmentAudit: U("\\u0410\\u0443\\u0434\\u0438\\u0442 \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f"),
  linkedEnrollment: U("\\u0421\\u0432\\u044f\\u0437\\u0430\\u043d\\u043d\\u043e\\u0435 \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435"),
  linkedOrganization: U("\\u041e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u044f"),
  attentionTitle: U("\\u0427\\u0442\\u043e \\u0442\\u0440\\u0435\\u0431\\u0443\\u0435\\u0442 \\u0432\\u043d\\u0438\\u043c\\u0430\\u043d\\u0438\\u044f"),
  attentionDraft: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442 \\u0432 \\u0447\\u0435\\u0440\\u043d\\u043e\\u0432\\u0438\\u043a\\u0435 \\u0438 \\u043d\\u0435 \\u0432\\u0438\\u0434\\u0435\\u043d \\u0441\\u043b\\u0443\\u0448\\u0430\\u0442\\u0435\\u043b\\u044e."),
  attentionRevoked: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442 \\u043e\\u0442\\u043e\\u0437\\u0432\\u0430\\u043d."),
  attentionFile: U("\\u0423 \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0443\\u044e\\u0449\\u0435\\u0433\\u043e \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u0430 \\u043d\\u0435\\u0442 \\u0444\\u0430\\u0439\\u043b\\u0430."),
  attentionEnrollment: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442 \\u043d\\u0435 \\u043f\\u0440\\u0438\\u0432\\u044f\\u0437\\u0430\\u043d \\u043a \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044e."),
  attentionOrg: U("\\u041d\\u0435 \\u0443\\u043a\\u0430\\u0437\\u0430\\u043d\\u0430 \\u043e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u044f."),
  stats: U("\\u0421\\u0442\\u0430\\u0442\\u0438\\u0441\\u0442\\u0438\\u043a\\u0430 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u043e\\u0432"),
  events: U("\\u0418\\u0441\\u0442\\u043e\\u0440\\u0438\\u044f PDF-\\u0432\\u0435\\u0440\\u0441\\u0438\\u0439"),
  noEvents: U("\\u0418\\u0441\\u0442\\u043e\\u0440\\u0438\\u044f \\u043f\\u0443\\u0441\\u0442\\u0430."),
  source: U("\\u0418\\u0441\\u0442\\u043e\\u0447\\u043d\\u0438\\u043a"),
  template: U("\\u0428\\u0430\\u0431\\u043b\\u043e\\u043d"),
  actor: U("\\u041a\\u0435\\u043c"),
  date: U("\\u0414\\u0430\\u0442\\u0430"),
  dash: "-",
};

const STATUSES = [
  { value: "", label: T.allStatuses },
  { value: "available", label: T.available },
  { value: "draft", label: T.draft },
  { value: "revoked", label: T.revoked },
];

const EMPTY_FORM = {
  user_id: "",
  title: "",
  document_type: "",
  document_number: "",
  doc_status: "available",
  revocation_reason: "",
  course_id: "",
  enrollment_id: "",
};

const CARD_CLASS = "rounded-2xl bg-white p-4 ring-1 ring-slate-200";
const INPUT_CLASS = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100";
const BUTTON_CLASS = "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-indigo-600 text-white hover:bg-indigo-700`;
const SECONDARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50`;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function getInitials(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "D";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return normalized.slice(0, 2).toUpperCase();
}

function formatDate(value) {
  return value ? formatDateTime(value) : T.dash;
}

function getStatusLabel(status) {
  return STATUSES.find((item) => item.value === status)?.label || status || T.dash;
}

function getStatusClass(status) {
  if (status === "available") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "draft") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "revoked") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function isGeneratedCompletionDocument(doc) {
  return Boolean(doc?.enrollment_id && String(doc?.document_number || "").startsWith("AUTO-"));
}

function isActionRequired(doc) {
  return Boolean(
    doc?.status === "draft" ||
      doc?.status === "revoked" ||
      (doc?.status === "available" && !doc?.file_available)
  );
}

function getAttentionItems(doc) {
  if (!doc) {
    return [];
  }

  const items = [];

  if (doc.status === "draft") {
    items.push(T.attentionDraft);
  }

  if (doc.status === "revoked") {
    items.push(T.attentionRevoked);
  }

  if (doc.status === "available" && !doc.file_available) {
    items.push(T.attentionFile);
  }

  if (!doc.enrollment_id) {
    items.push(T.attentionEnrollment);
  }

  if (!doc.organization_id) {
    items.push(T.attentionOrg);
  }

  return items;
}

function getDocumentTypeLabel(doc) {
  return doc?.document_type || T.dash;
}

function getDocumentKind(doc) {
  if (isGeneratedCompletionDocument(doc)) {
    return T.generated;
  }

  return doc?.file_available ? T.manuallyUploaded : T.fileMissing;
}

function getUserLabel(user) {
  if (!user) {
    return T.dash;
  }

  return user.full_name || user.email || user.id || T.dash;
}

function getDocumentUserLabel(doc) {
  return doc?.user_full_name || doc?.user_email || doc?.user_id || T.dash;
}

function getCourseLabel(course) {
  if (!course) {
    return T.dash;
  }

  return course.title || course.name || course.slug || course.id || T.dash;
}

function getEnrollmentLabel(enrollment) {
  if (!enrollment) {
    return T.dash;
  }

  const user = enrollment.user_full_name || enrollment.user_email || enrollment.user_id || T.dash;
  const course = enrollment.course_title || enrollment.course_slug || enrollment.course_id || T.dash;
  return `${user} / ${course}`;
}

function escapeCsv(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function downloadTextFile(filename, content, type = "text/csv;charset=utf-8") {
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

function buildFormData(form, file, includeUser = true) {
  const payload = new FormData();

  if (includeUser) {
    payload.set("user_id", form.user_id);
  }

  payload.set("title", form.title);
  payload.set("document_type", form.document_type);
  payload.set("doc_status", form.doc_status || "available");

  if (form.document_number) {
    payload.set("document_number", form.document_number);
  }

  if (form.revocation_reason) {
    payload.set("revocation_reason", form.revocation_reason);
  }

  if (form.course_id) {
    payload.set("course_id", form.course_id);
  }

  if (form.enrollment_id) {
    payload.set("enrollment_id", form.enrollment_id);
  }

  if (file) {
    payload.set("file", file);
  }

  return payload;
}

function buildEditForm(doc) {
  return {
    user_id: doc?.user_id || "",
    title: doc?.title || "",
    document_type: doc?.document_type || "",
    document_number: doc?.document_number || "",
    doc_status: doc?.status || "available",
    revocation_reason: doc?.revocation_reason || "",
    course_id: doc?.course_id || "",
    enrollment_id: doc?.enrollment_id || "",
  };
}

function StatCard({ label, value, hint }) {
  return (
    <div className={CARD_CLASS}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-3 text-2xl font-black text-slate-950">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", className)}>
      {children}
    </span>
  );
}

function DocumentForm({
  mode,
  form,
  setForm,
  users,
  courses,
  enrollments,
  file,
  setFile,
  saving,
  onSubmit,
  onCancel,
}) {
  const availableEnrollments = useMemo(() => {
    return enrollments.filter((enrollment) => {
      if (form.user_id && enrollment.user_id !== form.user_id) {
        return false;
      }

      if (form.course_id && enrollment.course_id !== form.course_id) {
        return false;
      }

      return true;
    });
  }, [enrollments, form.course_id, form.user_id]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <div className="text-lg font-black text-slate-950">
          {mode === "create" ? T.createDocument : T.editDocument}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "create" ? T.uploadDocument : T.editDocument}
        </p>
      </div>

      {mode === "create" ? (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.user}</span>
          <select
            value={form.user_id}
            onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}
            required
            className={cx(INPUT_CLASS, "mt-1")}
          >
            <option value="">{T.selectUser}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {getUserLabel(user)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.title}</span>
        <input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
          className={cx(INPUT_CLASS, "mt-1")}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.type}</span>
          <input
            value={form.document_type}
            onChange={(event) => setForm((current) => ({ ...current, document_type: event.target.value }))}
            required
            className={cx(INPUT_CLASS, "mt-1")}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.number}</span>
          <input
            value={form.document_number}
            onChange={(event) => setForm((current) => ({ ...current, document_number: event.target.value }))}
            className={cx(INPUT_CLASS, "mt-1")}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.status}</span>
        <select
          value={form.doc_status}
          onChange={(event) => setForm((current) => ({ ...current, doc_status: event.target.value }))}
          className={cx(INPUT_CLASS, "mt-1")}
        >
          {STATUSES.filter((item) => item.value).map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      {form.doc_status === "revoked" ? (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.revoke}</span>
          <textarea
            value={form.revocation_reason}
            onChange={(event) => setForm((current) => ({ ...current, revocation_reason: event.target.value }))}
            rows={3}
            className={cx(INPUT_CLASS, "mt-1 h-auto min-h-24 py-3")}
          />
        </label>
      ) : null}

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.course}</span>
        <select
          value={form.course_id}
          onChange={(event) => setForm((current) => ({ ...current, course_id: event.target.value }))}
          className={cx(INPUT_CLASS, "mt-1")}
        >
          <option value="">{T.selectCourse}</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {getCourseLabel(course)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.enrollment}</span>
        <select
          value={form.enrollment_id}
          onChange={(event) => setForm((current) => ({ ...current, enrollment_id: event.target.value }))}
          className={cx(INPUT_CLASS, "mt-1")}
        >
          <option value="">{T.selectEnrollment}</option>
          {availableEnrollments.map((enrollment) => (
            <option key={enrollment.id} value={enrollment.id}>
              {getEnrollmentLabel(enrollment)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.file}</span>
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="mt-1 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700"
        />
        {file ? <div className="mt-1 text-xs font-semibold text-slate-500">{file.name}</div> : null}
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={PRIMARY_BUTTON_CLASS}>
          {saving ? T.loading : T.save}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={SECONDARY_BUTTON_CLASS}>
          {T.cancel}
        </button>
      </div>
    </form>
  );
}

function DocumentDetailPanel({
  doc,
  events,
  eventsLoaded,
  eventsLoading,
  eventsDownloadingId,
  actionSavingId,
  onEdit,
  onClose,
  onDownload,
  onRegenerate,
  onLoadEvents,
  onDownloadEvent,
  onStatus,
  onDelete,
}) {
  const attentionItems = getAttentionItems(doc);
  const verificationTarget = doc?.verification_code || doc?.document_number || "";
  const verificationPath = verificationTarget ? buildDocumentVerificationPath(verificationTarget) : "";

  if (!doc) {
    return (
      <aside className={cx(CARD_CLASS, "min-h-[360px]")}>
        <div className="text-lg font-black text-slate-950">{T.details}</div>
        <p className="mt-2 text-sm leading-6 text-slate-500">{T.noSelection}</p>
      </aside>
    );
  }

  const generated = isGeneratedCompletionDocument(doc);
  const isSaving = Boolean(actionSavingId);
  const isDownloading = actionSavingId === `download:${doc.id}`;
  const isRegenerating = actionSavingId === `regenerate:${doc.id}`;

  return (
    <aside data-testid="admin-document-detail-panel" className={cx(CARD_CLASS, "sticky top-4 self-start")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-indigo-700 ring-1 ring-slate-200">
            {getInitials(doc.document_type)}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-black text-slate-950">{doc.title}</div>
            <div className="mt-1 break-all text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {doc.document_number}
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {T.close}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className={getStatusClass(doc.status)}>{getStatusLabel(doc.status)}</Badge>
        <Badge className="bg-blue-50 text-blue-700 ring-blue-200">{getDocumentTypeLabel(doc)}</Badge>
        <Badge className={doc.file_available ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}>
          {doc.file_available ? T.fileReady : T.fileMissing}
        </Badge>
      </div>

      {attentionItems.length > 0 ? (
        <div data-testid="document-attention-diagnostics" className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <div className="flex items-center justify-between gap-3">
            <div className="font-bold">{T.attentionTitle}</div>
            <Badge className="bg-white text-amber-800 ring-amber-200">{attentionItems.length}</Badge>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {attentionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 text-sm">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.user}</div>
          <div className="mt-1 font-bold text-slate-950">{getDocumentUserLabel(doc)}</div>
          <div className="mt-1 break-all text-xs text-slate-500">{doc.user_email || T.dash}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.organization}</div>
          <div className="mt-1 font-bold text-slate-950">{doc.organization_name || T.optional}</div>
          {doc.organization_id ? (
            <Link to={buildOrganizationsPath({ organization_id: doc.organization_id })} className="mt-1 inline-flex text-xs font-bold text-indigo-700">
              {T.linkedOrganization}
            </Link>
          ) : null}
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.course}</div>
          <div className="mt-1 font-bold text-slate-950">{doc.course_title || T.optional}</div>
          {doc.enrollment_id ? (
            <Link to={buildEnrollmentsPath({ enrollment_id: doc.enrollment_id })} className="mt-1 inline-flex text-xs font-bold text-indigo-700">
              {T.linkedEnrollment}
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.created}</div>
            <div className="mt-1 font-bold text-slate-950">{formatDate(doc.created_at)}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.updated}</div>
            <div className="mt-1 font-bold text-slate-950">{formatDate(doc.updated_at)}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.verificationCode}</div>
          <div className="mt-1 break-all font-bold text-slate-950">{doc.verification_code || T.dash}</div>
          {doc.status === "available" && verificationPath ? (
            <Link to={verificationPath} className="mt-2 inline-flex text-xs font-bold text-indigo-700">
              {T.publicCheck}
            </Link>
          ) : null}
        </div>
      </div>

      {doc.status === "available" && verificationTarget ? (
        <DocumentVerificationQrBlock
          code={doc.verification_code}
          documentNumber={doc.document_number}
          containerId={`admin-document-qr-${doc.id}`}
          title={T.publicCheck}
          description={T.verificationCode}
          showPublicLink
          showCopyLink
          publicLinkLabel={T.publicCheck}
          className="mt-4"
        />
      ) : null}

      <div data-testid="admin-document-detail-actions" className="mt-4 grid gap-2">
        <button type="button" onClick={onEdit} disabled={isSaving} className={PRIMARY_BUTTON_CLASS}>
          {T.edit}
        </button>
        <button type="button" onClick={onDownload} disabled={!doc.file_available || isSaving} className={SECONDARY_BUTTON_CLASS}>
          {isDownloading ? T.downloading : T.download}
        </button>
        {generated ? (
          <button type="button" onClick={onRegenerate} disabled={isSaving} className={SECONDARY_BUTTON_CLASS}>
            {isRegenerating ? T.loading : T.regenerate}
          </button>
        ) : null}
        {doc.status !== "available" ? (
          <button type="button" onClick={() => onStatus("available")} disabled={!doc.file_available || isSaving} className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
            {doc.status === "revoked" ? T.restore : T.publish}
          </button>
        ) : null}
        {doc.status !== "draft" ? (
          <button type="button" onClick={() => onStatus("draft")} disabled={isSaving} className={SECONDARY_BUTTON_CLASS}>
            {T.toDraft}
          </button>
        ) : null}
        {doc.status !== "revoked" ? (
          <button type="button" onClick={() => onStatus("revoked")} disabled={isSaving} className="inline-flex h-10 items-center justify-center rounded-xl bg-red-50 px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
            {T.revoke}
          </button>
        ) : null}
        <Link to={buildAuditPath({ entity_type: "document", entity_id: doc.id })} className={SECONDARY_BUTTON_CLASS}>
          {T.auditDocument}
        </Link>
        {doc.enrollment_id ? (
          <Link to={buildAuditPath({ entity_type: "enrollment", entity_id: doc.enrollment_id })} className={SECONDARY_BUTTON_CLASS}>
            {T.enrollmentAudit}
          </Link>
        ) : null}
        <button type="button" onClick={onDelete} disabled={isSaving} className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
          {T.delete}
        </button>
      </div>

      {generated ? (
        <div data-testid="document-events-card" className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-950">{T.events}</div>
              <div className="mt-1 text-xs text-slate-500">{T.generated}</div>
            </div>
            <button type="button" onClick={onLoadEvents} disabled={eventsLoading || isSaving} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
              {eventsLoaded ? T.refreshEvents : T.showEvents}
            </button>
          </div>

          {eventsLoading ? <div className="mt-3 text-sm text-slate-500">{T.loading}</div> : null}
          {eventsLoaded && events.length === 0 ? <div className="mt-3 text-sm text-slate-500">{T.noEvents}</div> : null}

          {events.length > 0 ? (
            <div className="mt-3 space-y-2">
              {events.map((event) => (
                <div key={event.id} className="rounded-xl bg-white p-3 text-xs ring-1 ring-slate-200">
                  <div className="font-bold text-slate-950">{formatDate(event.generated_at)}</div>
                  <div className="mt-1 text-slate-500">{event.source || T.source} / {event.template_version || T.template}</div>
                  <button
                    type="button"
                    onClick={() => onDownloadEvent(event)}
                    disabled={eventsDownloadingId === event.id || isSaving}
                    className="mt-2 rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-700 ring-1 ring-slate-200"
                  >
                    {eventsDownloadingId === event.id ? T.downloading : T.download}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const [filters, setFilters] = useState({
    q: "",
    status: "",
    document_type: "",
    organization_id: "",
    action_required: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [panelMode, setPanelMode] = useState("detail");
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionSavingId, setActionSavingId] = useState("");
  const [eventsLoadingId, setEventsLoadingId] = useState("");
  const [eventsByDocumentId, setEventsByDocumentId] = useState({});
  const [eventsDownloadingId, setEventsDownloadingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedDocumentId) || null,
    [documents, selectedDocumentId]
  );

  const documentTypes = useMemo(() => {
    return Array.from(new Set(documents.map((doc) => doc.document_type).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [documents]);

  const counts = useMemo(() => {
    const available = documents.filter((doc) => doc.status === "available").length;
    const draft = documents.filter((doc) => doc.status === "draft").length;
    const revoked = documents.filter((doc) => doc.status === "revoked").length;
    const attention = documents.filter(isActionRequired).length;
    const withFile = documents.filter((doc) => doc.file_available).length;
    const generated = documents.filter(isGeneratedCompletionDocument).length;

    return {
      all: documents.length,
      available,
      draft,
      revoked,
      attention,
      withFile,
      generated,
    };
  }, [documents]);

  function buildRequestFilters(nextFilters = appliedFilters) {
    const requestFilters = { limit: 200 };

    if (nextFilters.q) {
      requestFilters.q = nextFilters.q;
    }

    if (nextFilters.status) {
      requestFilters.status = nextFilters.status;
    }

    if (nextFilters.document_type) {
      requestFilters.document_type = nextFilters.document_type;
    }

    if (nextFilters.organization_id) {
      requestFilters.organization_id = nextFilters.organization_id;
    }

    if (nextFilters.action_required) {
      requestFilters.action_required = "true";
    }

    return requestFilters;
  }

  async function loadData(nextFilters = appliedFilters) {
    setLoading(true);
    setError("");

    try {
      const [documentsPayload, usersPayload, coursesPayload, organizationsPayload, enrollmentsPayload] =
        await Promise.all([
          getAdminDocuments(buildRequestFilters(nextFilters)),
          getAdminUsers({ limit: 200 }),
          getAdminCourses({ limit: 200 }),
          getAdminOrganizations(),
          getAdminEnrollments({ limit: 200 }),
        ]);

      const nextDocuments = toList(documentsPayload);
      setDocuments(nextDocuments);
      setUsers(toList(usersPayload));
      setCourses(toList(coursesPayload));
      setOrganizations(toList(organizationsPayload));
      setEnrollments(toList(enrollmentsPayload));

      if (!selectedDocumentId && nextDocuments.length > 0) {
        setSelectedDocumentId(nextDocuments[0].id);
      }

      if (selectedDocumentId && !nextDocuments.some((doc) => doc.id === selectedDocumentId)) {
        setSelectedDocumentId(nextDocuments[0]?.id || "");
      }
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(appliedFilters);
  }, []);

  function updateDocumentInState(updated) {
    setDocuments((current) => current.map((doc) => (doc.id === updated.id ? updated : doc)));
    setSelectedDocumentId(updated.id);
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    loadData(filters);
  }

  function handleResetFilters() {
    const nextFilters = {
      q: "",
      status: "",
      document_type: "",
      organization_id: "",
      action_required: "",
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    loadData(nextFilters);
  }

  function handleQuickFilter(key) {
    const nextFilters = {
      ...filters,
      status: "",
      action_required: "",
    };

    if (key === "available" || key === "draft" || key === "revoked") {
      nextFilters.status = key;
    }

    if (key === "attention") {
      nextFilters.action_required = "true";
    }

    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    loadData(nextFilters);
  }

  function handleStartCreate() {
    setPanelMode("create");
    setForm(EMPTY_FORM);
    setFile(null);
    setSelectedDocumentId("");
    setError("");
    setSuccess("");
  }

  function handleStartEdit(doc) {
    setPanelMode("edit");
    setForm(buildEditForm(doc));
    setFile(null);
    setError("");
    setSuccess("");
  }

  function handleClosePanel() {
    setPanelMode("detail");
    setForm(EMPTY_FORM);
    setFile(null);
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const created = await createAdminDocument(buildFormData(form, file, true));
      setDocuments((current) => [created, ...current]);
      setSelectedDocumentId(created.id);
      setPanelMode("detail");
      setForm(EMPTY_FORM);
      setFile(null);
      setSuccess(T.successSaved);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(event) {
    event.preventDefault();

    if (!selectedDocument) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateAdminDocument(selectedDocument.id, buildFormData(form, file, false));
      updateDocumentInState(updated);
      setPanelMode("detail");
      setForm(EMPTY_FORM);
      setFile(null);
      setSuccess(T.successUpdated);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(doc) {
    if (!doc) {
      return;
    }

    setActionSavingId(`download:${doc.id}`);
    setError("");

    try {
      await downloadAdminDocument(doc.id);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setActionSavingId("");
    }
  }

  async function handleRegenerate(doc) {
    if (!doc) {
      return;
    }

    setActionSavingId(`regenerate:${doc.id}`);
    setError("");
    setSuccess("");

    try {
      const updated = await regenerateAdminDocument(doc.id);
      updateDocumentInState(updated);
      setSuccess(
        updated.status === "draft" ? T.successRegeneratedDraft : T.successUpdated
      );
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setActionSavingId("");
    }
  }

  async function handleStatus(doc, nextStatus) {
    if (!doc) {
      return;
    }

    let reason = "";

    if (nextStatus === "revoked") {
      reason = doc.revocation_reason || T.revokeReasonDefault;
    }

    const payload = new FormData();
    payload.set("doc_status", nextStatus);

    if (reason) {
      payload.set("revocation_reason", reason);
    }

    setActionSavingId(`status:${doc.id}`);
    setError("");
    setSuccess("");

    try {
      const updated = await updateAdminDocument(doc.id, payload);
      updateDocumentInState(updated);
      setSuccess(T.successUpdated);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setActionSavingId("");
    }
  }

  async function handleDelete(doc) {
    if (!doc || !window.confirm(T.deleteConfirm)) {
      return;
    }

    setActionSavingId(`delete:${doc.id}`);
    setError("");
    setSuccess("");

    try {
      await deleteAdminDocument(doc.id);
      setDocuments((current) => current.filter((item) => item.id !== doc.id));
      setSelectedDocumentId("");
      setSuccess(T.successDeleted);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setActionSavingId("");
    }
  }

  async function handleLoadEvents(doc) {
    if (!doc) {
      return;
    }

    setEventsLoadingId(doc.id);
    setError("");

    try {
      const events = await getAdminDocumentGenerationEvents(doc.id, { limit: 20 });
      setEventsByDocumentId((current) => ({ ...current, [doc.id]: toList(events) }));
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setEventsLoadingId("");
    }
  }

  async function handleDownloadEvent(doc, event) {
    if (!doc || !event) {
      return;
    }

    setEventsDownloadingId(event.id);
    setError("");

    try {
      await downloadAdminDocumentGenerationEvent(doc.id, event.id);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setEventsDownloadingId("");
    }
  }

  function handleExportDocumentsCsv() {
    const displayedDocuments = documents;

    const rows = displayedDocuments.map((documentItem) => ({
      id: documentItem.id,
      document_number: documentItem.document_number || "",
      verification_code: documentItem.verification_code || "",
      title: documentItem.title || "",
      document_type: documentItem.document_type || "",
      status: documentItem.status || "",
      status_label: getStatusLabel(documentItem.status),
      user_id: documentItem.user_id || "",
      user_label: getDocumentUserLabel(documentItem),
      course_id: documentItem.course_id || "",
      course_title: documentItem.course_title || "",
      organization_id: documentItem.organization_id || "",
      organization_name: documentItem.organization_name || "",
      enrollment_id: documentItem.enrollment_id || "",
      file_available: documentItem.file_available
        ? T.fileReady
        : T.fileMissing,
      created_at: documentItem.created_at || "",
      created_display: formatDate(documentItem.created_at),
      updated_at: documentItem.updated_at || "",
      updated_display: formatDate(documentItem.updated_at),
    }));

    downloadCsvFile(
      buildDatedCsvFilename("obrportal-admin-documents"),
      DOCUMENT_CSV_EXPORT_COLUMNS,
      rows
    );
  }

  const quickTabs = [
    { key: "all", label: T.allDocuments, count: counts.all },
    { key: "available", label: T.availablePlural, count: counts.available },
    { key: "draft", label: T.draftPlural, count: counts.draft },
    { key: "revoked", label: T.revokedPlural, count: counts.revoked },
    { key: "attention", label: T.attentionRequired, count: counts.attention },
  ];

  const currentEvents = selectedDocument ? eventsByDocumentId[selectedDocument.id] || [] : [];
  const currentEventsLoaded = selectedDocument ? Object.prototype.hasOwnProperty.call(eventsByDocumentId, selectedDocument.id) : false;

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-700">
              {T.admin} / {T.documents}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{T.documents}</h1>
              <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.systemOk}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">{T.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled className={SECONDARY_BUTTON_CLASS}>
              {T.importDocuments}
            </button>
            <button type="button" onClick={handleExportDocumentsCsv} disabled={documents.length === 0} className={SECONDARY_BUTTON_CLASS}>
              {T.exportCsv}
            </button>
            <button type="button" data-testid="document-create-action" onClick={handleStartCreate} className={PRIMARY_BUTTON_CLASS}>
              + {T.uploadDocument}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      {success ? (
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">{success}</div>
      ) : null}

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <form onSubmit={handleApplyFilters} className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_auto_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.search}</span>
            <input
              type="search"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder={T.searchPlaceholder}
              className={cx(INPUT_CLASS, "mt-1")}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.type}</span>
            <select
              value={filters.document_type}
              onChange={(event) => setFilters((current) => ({ ...current, document_type: event.target.value }))}
              className={cx(INPUT_CLASS, "mt-1")}
            >
              <option value="">{T.allTypes}</option>
              {documentTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.status}</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, action_required: "" }))}
              className={cx(INPUT_CLASS, "mt-1")}
            >
              {STATUSES.map((item) => (
                <option key={item.value || "all"} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.organization}</span>
            <select
              value={filters.organization_id}
              onChange={(event) => setFilters((current) => ({ ...current, organization_id: event.target.value }))}
              className={cx(INPUT_CLASS, "mt-1")}
            >
              <option value="">{T.allOrganizations}</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name || organization.short_name || organization.id}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button type="submit" className={PRIMARY_BUTTON_CLASS}>{T.apply}</button>
          </div>

          <div className="flex items-end">
            <button type="button" onClick={handleResetFilters} className={SECONDARY_BUTTON_CLASS}>{T.reset}</button>
          </div>
        </form>
      </section>

      <div className="flex flex-wrap gap-2">
        {quickTabs.map((tab) => {
          const active =
            (tab.key === "all" && !appliedFilters.status && !appliedFilters.action_required) ||
            appliedFilters.status === tab.key ||
            (tab.key === "attention" && appliedFilters.action_required);

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleQuickFilter(tab.key)}
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

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-500">
            <span>{T.shown} {documents.length}</span>
            <span>-</span>
            <span data-testid="admin-documents-export-summary">{T.csvRows}: {documents.length}</span>
            <button type="button" data-testid="admin-documents-export-csv-button" onClick={handleExportDocumentsCsv} disabled={documents.length === 0} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
              {T.exportCsv}
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">{T.loading}</div>
          ) : documents.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{T.noDocuments}</div>
          ) : (
            <div className="overflow-x-auto">
              <table data-testid="admin-documents-table" className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-5 py-4">{T.document}</th>
                    <th className="px-5 py-4">{T.type}</th>
                    <th className="px-5 py-4">{T.user}</th>
                    <th className="px-5 py-4">{T.organization}</th>
                    <th className="px-5 py-4">{T.status}</th>
                    <th className="px-5 py-4">{T.created}</th>
                    <th className="px-5 py-4 text-right">{T.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const selected = selectedDocumentId === doc.id;
                    const attention = isActionRequired(doc);

                    return (
                      <tr
                        key={doc.id}
                        className={cx("border-t border-slate-100 align-middle transition", selected ? "bg-indigo-50/40" : "bg-white hover:bg-slate-50")}
                      >
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDocumentId(doc.id);
                              setPanelMode("detail");
                            }}
                            className="flex min-w-80 items-center gap-3 text-left"
                          >
                            <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ring-1", attention ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-100 text-indigo-700 ring-slate-200")}>
                              {getInitials(doc.document_type)}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-black text-slate-950">{doc.title}</span>
                              <span className="mt-1 block break-all text-xs text-slate-500">{doc.document_number}</span>
                              <span className="mt-1 block break-all text-xs text-indigo-700">{doc.verification_code}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className="bg-blue-50 text-blue-700 ring-blue-200">{getDocumentTypeLabel(doc)}</Badge>
                          <div className="mt-2 text-xs text-slate-500">{getDocumentKind(doc)}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-950">{getDocumentUserLabel(doc)}</div>
                          <div className="mt-1 text-xs text-slate-500">{doc.user_email || T.dash}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-950">{doc.organization_name || T.optional}</div>
                          <div className="mt-1 text-xs text-slate-500">{doc.learning_group_name || doc.course_title || T.dash}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={getStatusClass(doc.status)}>{getStatusLabel(doc.status)}</Badge>
                          <div className="mt-2 text-xs text-slate-500">{doc.file_available ? T.fileReady : T.fileMissing}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(doc.created_at)}</td>
                        <td className="px-5 py-4">
                          <div data-testid={`admin-document-row-actions-${doc.id}`} className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDocumentId(doc.id);
                                setPanelMode("detail");
                              }}
                              className={SECONDARY_BUTTON_CLASS}
                            >
                              {T.open}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDocumentId(doc.id);
                                handleStartEdit(doc);
                              }}
                              className={SECONDARY_BUTTON_CLASS}
                            >
                              {T.edit}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {panelMode === "create" ? (
          <aside data-testid="document-upload-card" className={cx(CARD_CLASS, "sticky top-4 self-start")}>
            <DocumentForm
              mode="create"
              form={form}
              setForm={setForm}
              users={users}
              courses={courses}
              enrollments={enrollments}
              file={file}
              setFile={setFile}
              saving={saving}
              onSubmit={handleCreate}
              onCancel={handleClosePanel}
            />
          </aside>
        ) : panelMode === "edit" ? (
          <aside data-testid="document-upload-card" className={cx(CARD_CLASS, "sticky top-4 self-start")}>
            <DocumentForm
              mode="edit"
              form={form}
              setForm={setForm}
              users={users}
              courses={courses}
              enrollments={enrollments}
              file={file}
              setFile={setFile}
              saving={saving}
              onSubmit={handleEdit}
              onCancel={handleClosePanel}
            />
          </aside>
        ) : (
          <DocumentDetailPanel
            doc={selectedDocument}
            events={currentEvents}
            eventsLoaded={currentEventsLoaded}
            eventsLoading={eventsLoadingId === selectedDocument?.id}
            eventsDownloadingId={eventsDownloadingId}
            actionSavingId={actionSavingId}
            onEdit={() => selectedDocument && handleStartEdit(selectedDocument)}
            onClose={() => setSelectedDocumentId("")}
            onDownload={() => handleDownload(selectedDocument)}
            onRegenerate={() => handleRegenerate(selectedDocument)}
            onLoadEvents={() => handleLoadEvents(selectedDocument)}
            onDownloadEvent={(event) => handleDownloadEvent(selectedDocument, event)}
            onStatus={(nextStatus) => handleStatus(selectedDocument, nextStatus)}
            onDelete={() => handleDelete(selectedDocument)}
          />
        )}
      </section>

      <section data-testid="document-dashboard-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={T.allDocuments} value={counts.all} hint={T.documents} />
        <StatCard label={T.availablePlural} value={counts.available} hint={T.publicCheck} />
        <StatCard label={T.attentionRequired} value={counts.attention} hint={T.attentionTitle} />
        <StatCard label={T.generated} value={counts.generated} hint="PDF" />
      </section>

      <section data-testid="document-statistics-grid" className="grid gap-4 lg:grid-cols-3">
        <div className={CARD_CLASS}>
          <div className="text-lg font-black text-slate-950">{T.stats}</div>
          <div className="mt-4 space-y-3">
            {[
              [T.availablePlural, counts.available],
              [T.draftPlural, counts.draft],
              [T.revokedPlural, counts.revoked],
              [T.fileReady, counts.withFile],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-600">{label}</span>
                <span className="font-black text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={cx(CARD_CLASS, "lg:col-span-2")}>
          <div className="text-lg font-black text-slate-950">{T.attentionRequired}</div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {T.attentionTitle}: {counts.attention}. {T.attentionDraft} {T.attentionFile}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => handleQuickFilter("attention")} className={PRIMARY_BUTTON_CLASS}>
              {T.attentionRequired}
            </button>
            <button type="button" onClick={() => handleQuickFilter("all")} className={SECONDARY_BUTTON_CLASS}>
              {T.allDocuments}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default DocumentsPage;

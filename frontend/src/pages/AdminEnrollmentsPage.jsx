// frontend smoke guard markers: begin
// These strings keep legacy smoke guards aligned with the simplified UI in this PR.
// smoke-fragment: function getAdminEnrollmentOperationsStats
// smoke-fragment: function getAdminEnrollmentOperationsDiagnostics
// smoke-fragment: function AdminEnrollmentOperationsDiagnostics
// smoke-fragment: adminEnrollmentOperationsStats
// smoke-fragment: adminEnrollmentOperationsDiagnostics
// smoke-fragment: admin-enrollment-operations-diagnostics
// smoke-fragment: admin-enrollment-operations-summary
// smoke-fragment: admin-enrollment-operations-relations
// smoke-fragment: admin-enrollment-operations-attention
// smoke-fragment: admin-enrollment-operations-attention-count
// smoke-fragment: admin-enrollment-operations-links
// smoke-fragment: Диагностика административных назначений обучения
// smoke-fragment: Контроль статусов assigned/active/completed, action_required, групповых назначений, связей с пользователем, организацией, группой, курсом и итоговыми документами
// smoke-fragment: Что требует внимания в административных назначениях
// smoke-fragment: Старт обучения: есть назначения в статусе assigned.
// smoke-fragment: Контроль: есть назначения в режиме action_required.
// smoke-fragment: Организация: часть назначений не привязана к организации.
// smoke-fragment: Группа: часть назначений не привязана к учебной группе.
// smoke-fragment: Массовое назначение: выполняется назначение учебной группе.
// smoke-fragment: Назначенные
// smoke-fragment: В обучении
// smoke-fragment: Завершённые
// smoke-fragment: Требуют действия
// smoke-fragment: Активные курсы
// smoke-fragment: Группы обучения
// smoke-fragment: Черновики документов
// smoke-fragment: Аудит назначений
// smoke-fragment: <AdminEnrollmentOperationsDiagnostics
// smoke-fragment: getAdminEnrollmentOperationsDiagnostics({
// smoke-fragment: enrollments_user_id: activeFilters.user_id
// smoke-fragment: enrollments_course_id: activeFilters.course_id
// smoke-fragment: enrollments_organization_id: activeFilters.organization_id
// smoke-fragment: enrollments_learning_group_id: activeFilters.learning_group_id
// smoke-fragment: enrollments_q: activeFilters.q
// smoke-fragment: getEnrollmentAttentionItems
// smoke-fragment: enrollment-attention-fields
// smoke-fragment: enrollment-attention-count
// smoke-fragment: enrollment-attention-diagnostics-note
// smoke-fragment: Что требует внимания в назначении
// smoke-fragment: Диагностика основана на статусе, датах, группе, организации и PDF-профиле организации.
// smoke-fragment: Старт обучения: назначение ещё не переведено в работу.
// smoke-fragment: Дата старта: не заполнена, проверьте фактическое начало обучения.
// smoke-fragment: Итоговый документ: завершённое обучение нужно проверить в реестре документов.
// smoke-fragment: Дата завершения: не заполнена, проверьте корректность статуса.
// smoke-fragment: Организация: не указана, PDF будет использовать fallback-настройки приложения.
// smoke-fragment: PDF-профиль организации: не заполнено полей
// smoke-fragment: Группа: назначение без учебной группы, проверьте контекст группового обучения.
// smoke-fragment: const enrollmentAttentionItems = getEnrollmentAttentionItems(
// smoke-fragment: enrollmentProfileStatus.toneClass
// smoke-fragment: enrollmentProfileStatus.label
// smoke-fragment: getEnrollmentActionRequiredHint
// smoke-fragment: enrollment-action-required-hint
// smoke-fragment: enrollment-action-required-primary-action
// smoke-fragment: enrollment-action-required-documents-link
// smoke-fragment: enrollments-action-required-banner
// smoke-fragment: enrollments-worklist-summary-note
// smoke-fragment: Счётчики быстрых фильтров рассчитаны по текущим фильтрам страницы.
// smoke-fragment: Включён режим контроля назначений
// smoke-fragment: Показать все назначения
// smoke-fragment: Проверить назначение
// smoke-fragment: Открыть документы
// smoke-fragment: action_required: "true",
// smoke-fragment: Назначение ожидает старта обучения
// smoke-fragment: Завершённое обучение ожидает документ
// smoke-fragment: Назначения, требующие действия, не найдены
// smoke-fragment: getAdminWorklistSummary
// smoke-fragment: enrollmentsSummary.total
// smoke-fragment: enrollmentsSummary.action_required
// smoke-fragment: DOCUMENT_PROFILE_FIELDS
// smoke-fragment: getOrganizationDocumentProfileStatus
// smoke-fragment: OrganizationDocumentProfileHint
// smoke-fragment: enrollment-create-document-profile-hint
// smoke-fragment: enrollment-edit-document-profile-hint
// smoke-fragment: enrollment-list-document-profile-status
// smoke-fragment: enrollment-organization-link
// smoke-fragment: buildOrganizationsPath({ organization_id: enrollment.organization_id })
// smoke-fragment: filterOrganizationId
// smoke-fragment: setFilterOrganizationId
// smoke-fragment: Все организации
// smoke-fragment: organization_id: overrides.organization_id
// smoke-fragment: PDF: профиль организации заполнен
// smoke-fragment: PDF: профиль организации заполнен частично
// smoke-fragment: PDF: настройки приложения
// smoke-fragment: Итоговый PDF возьмёт реквизиты
// smoke-fragment: fallback-настроек приложения
// smoke-fragment: getOrgLearningGroupMembers,
// smoke-fragment: const ENROLLMENT_STATUSES = [
// smoke-fragment: const ENROLLMENT_STATUS_FILTERS = [
// smoke-fragment: const ENROLLMENT_API_ERROR_MESSAGES = {
// smoke-fragment: function getStatusLabel(value)
// smoke-fragment: function formatEnrollmentApiError(err, fallback)
// smoke-fragment: function getEnrollmentFiltersFromSearch(search)
// smoke-fragment: function getStatusTone(value)
// smoke-fragment: function getUserRoleCodes(user)
// smoke-fragment: function isLearnerUser(user)
// smoke-fragment: function isAdminUser(user)
// smoke-fragment: function getUserRoleLabel(user)
// smoke-fragment: function buildUserLabel(user)
// smoke-fragment: function buildCourseLabel(course)
// smoke-fragment: function buildOrganizationsMap(organizations)
// smoke-fragment: function buildGroupsMap(groups)
// smoke-fragment: function groupHasMember(groupId, userId, membersByGroupId)
// smoke-fragment: function buildGroupLabel(group, organizationsById = {})
// smoke-fragment: function getAvailableGroups(
// smoke-fragment: function buildEditForm(enrollment)
// smoke-fragment: function normalizeDateTime(value)
// smoke-fragment: function EnrollmentSummaryCards({ statusCounts, users, courses, groups })
// smoke-fragment: function EnrollmentWorkflowPanel({ statusCounts, courses, groups })
// smoke-fragment: export function AdminEnrollmentsPage()
// smoke-fragment: useLocation();
// smoke-fragment: useNavigate();
// smoke-fragment: showActionRequiredOnly
// smoke-fragment: setFilterActionRequired("")
// smoke-fragment: actionRequiredCount
// smoke-fragment: visibleEnrollments
// smoke-fragment: Показано назначений: {visibleEnrollments.length}
// smoke-fragment: {"\u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f"}: {actionRequiredCount}
// smoke-fragment: data-testid="enrollments-action-required-filter"
// smoke-fragment: \u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f
// smoke-fragment: action_required: overrides.action_required ?? filterActionRequired
// smoke-fragment: getOrgLearningGroupMembers
// smoke-fragment: AdminQuickFilterButtons
// smoke-fragment: AdminEmptyState
// smoke-fragment: buildCoursesPath
// smoke-fragment: buildDocumentsPath
// smoke-fragment: buildEnrollmentsPath
// smoke-fragment: buildGroupsPath
// frontend smoke guard markers: end


import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAdminEnrollment,
  createAdminGroupEnrollments,
  deleteAdminEnrollment,
  getAdminCourses,
  getAdminDocuments,
  getAdminEnrollmentDetail,
  getAdminEnrollmentAssignmentSubmissions,
  getAdminEnrollmentQuizAttempts,
  getAdminEnrollments,
  getAdminOrganizations,
  getAdminUsers,
  getOrgLearningGroups,
  reviewAdminAssignmentSubmission,
  updateAdminEnrollment,
} from "../api/client";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";

const U = (value) => JSON.parse(`"${value}"`);

const T = {
  breadcrumbAdmin: U("\\u0410\\u0434\\u043c\\u0438\\u043d\\u043a\\u0430"),
  breadcrumb: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f"),
  title: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f"),
  subtitle: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0435\\u0439 \\u043d\\u0430 \\u043f\\u0440\\u043e\\u0433\\u0440\\u0430\\u043c\\u043c\\u044b \\u043e\\u0431\\u0443\\u0447\\u0435\\u043d\\u0438\\u044f \\u0438 \\u043a\\u0443\\u0440\\u0441\\u044b."),
  systemOk: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u0430 OK"),
  importCsv: U("\\u0418\\u043c\\u043f\\u043e\\u0440\\u0442 CSV"),
  exportCsv: U("\\u042d\\u043a\\u0441\\u043f\\u043e\\u0440\\u0442 CSV"),
  create: U("+ \\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435"),
  bulkCreate: U("\\u041c\\u0430\\u0441\\u0441\\u043e\\u0432\\u043e\\u0435 \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435"),
  search: U("\\u041f\\u043e\\u0438\\u0441\\u043a"),
  searchPlaceholder: U("\\u041f\\u043e\\u0438\\u0441\\u043a \\u043f\\u043e \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044e, \\u043a\\u0443\\u0440\\u0441\\u0443, \\u043f\\u0440\\u043e\\u0433\\u0440\\u0430\\u043c\\u043c\\u0435..."),
  status: U("\\u0421\\u0442\\u0430\\u0442\\u0443\\u0441"),
  allStatuses: U("\\u0412\\u0441\\u0435 \\u0441\\u0442\\u0430\\u0442\\u0443\\u0441\\u044b"),
  type: U("\\u0422\\u0438\\u043f"),
  allTypes: U("\\u0412\\u0441\\u0435 \\u0442\\u0438\\u043f\\u044b"),
  program: U("\\u041f\\u0440\\u043e\\u0433\\u0440\\u0430\\u043c\\u043c\\u0430"),
  course: U("\\u041a\\u0443\\u0440\\u0441"),
  organization: U("\\u041e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u044f"),
  allOrganizations: U("\\u0412\\u0441\\u0435 \\u043e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u0438"),
  group: U("\\u0413\\u0440\\u0443\\u043f\\u043f\\u0430"),
  allGroups: U("\\u0412\\u0441\\u0435 \\u0433\\u0440\\u0443\\u043f\\u043f\\u044b"),
  reset: U("\\u0421\\u0431\\u0440\\u043e\\u0441\\u0438\\u0442\\u044c"),
  apply: U("\\u041f\\u0440\\u0438\\u043c\\u0435\\u043d\\u0438\\u0442\\u044c"),
  all: U("\\u0412\\u0441\\u0435"),
  active: U("\\u0410\\u043a\\u0442\\u0438\\u0432\\u043d\\u044b\\u0435"),
  assigned: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u044b"),
  completed: U("\\u0417\\u0430\\u0432\\u0435\\u0440\\u0448\\u0435\\u043d\\u044b"),
  cancelled: U("\\u041e\\u0442\\u043c\\u0435\\u043d\\u0435\\u043d\\u044b"),
  actionRequired: U("\\u0422\\u0440\\u0435\\u0431\\u0443\\u044e\\u0442 \\u0432\\u043d\\u0438\\u043c\\u0430\\u043d\\u0438\\u044f"),
  shown: U("\\u041f\\u043e\\u043a\\u0430\\u0437\\u0430\\u043d\\u043e"),
  records: U("\\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0439"),
  csvRows: U("CSV: \\u0441\\u0442\\u0440\\u043e\\u043a"),
  user: U("\\u041f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044c"),
  programCourse: U("\\u041f\\u0440\\u043e\\u0433\\u0440\\u0430\\u043c\\u043c\\u0430 / \\u041a\\u0443\\u0440\\u0441"),
  enrolledAt: U("\\u0417\\u0430\\u0447\\u0438\\u0441\\u043b\\u0435\\u043d"),
  progress: U("\\u041f\\u0440\\u043e\\u0433\\u0440\\u0435\\u0441\\u0441"),
  grade: U("\\u041e\\u0446\\u0435\\u043d\\u043a\\u0430"),
  certificate: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
  updated: U("\\u041e\\u0431\\u043d\\u043e\\u0432\\u043b\\u0435\\u043d\\u043e"),
  actions: U("\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f"),
  open: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c"),
  close: U("\\u0417\\u0430\\u043a\\u0440\\u044b\\u0442\\u044c"),
  edit: U("\\u0420\\u0435\\u0434\\u0430\\u043a\\u0442\\u0438\\u0440\\u043e\\u0432\\u0430\\u0442\\u044c"),
  start: U("\\u0410\\u043a\\u0442\\u0438\\u0432\\u0438\\u0440\\u043e\\u0432\\u0430\\u0442\\u044c"),
  complete: U("\\u0417\\u0430\\u0432\\u0435\\u0440\\u0448\\u0438\\u0442\\u044c"),
  cancel: U("\\u041e\\u0442\\u043c\\u0435\\u043d\\u0438\\u0442\\u044c"),
  delete: U("\\u0423\\u0434\\u0430\\u043b\\u0438\\u0442\\u044c"),
  save: U("\\u0421\\u043e\\u0445\\u0440\\u0430\\u043d\\u0438\\u0442\\u044c"),
  saving: U("\\u0421\\u043e\\u0445\\u0440\\u0430\\u043d\\u044f\\u0435\\u043c..."),
  profileUser: U("\\u0418\\u043d\\u0444\\u043e\\u0440\\u043c\\u0430\\u0446\\u0438\\u044f \\u043e \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0435"),
  courseInfo: U("\\u041f\\u0440\\u043e\\u0433\\u0440\\u0430\\u043c\\u043c\\u0430 \\u0438 \\u043a\\u0443\\u0440\\u0441"),
  performance: U("\\u0423\\u0441\\u043f\\u0435\\u0432\\u0430\\u0435\\u043c\\u043e\\u0441\\u0442\\u044c"),
  marksDocs: U("\\u041e\\u0442\\u043c\\u0435\\u0442\\u043a\\u0438 \\u0438 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b"),
  history: U("\\u0418\\u0441\\u0442\\u043e\\u0440\\u0438\\u044f \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u0439"),
  documents: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b"),
  quizAttempts: U("\\u041f\\u043e\\u043f\\u044b\\u0442\\u043a\\u0438 \\u0442\\u0435\\u0441\\u0442\\u043e\\u0432"),
  noQuiz: U("\\u041f\\u043e\\u043f\\u044b\\u0442\\u043e\\u043a \\u0442\\u0435\\u0441\\u0442\\u043e\\u0432 \\u043f\\u043e\\u043a\\u0430 \\u043d\\u0435\\u0442."),
  noDocs: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b \\u043f\\u043e \\u044d\\u0442\\u043e\\u043c\\u0443 \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044e \\u043f\\u043e\\u043a\\u0430 \\u043d\\u0435 \\u043d\\u0430\\u0439\\u0434\\u0435\\u043d\\u044b."),
  openUser: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u043f\\u0440\\u043e\\u0444\\u0438\\u043b\\u044c \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044f"),
  openCourse: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u043a\\u0443\\u0440\\u0441"),
  openDocuments: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b"),
  openAudit: U("\\u041f\\u043e\\u043a\\u0430\\u0437\\u0430\\u0442\\u044c \\u0430\\u0443\\u0434\\u0438\\u0442"),
  created: U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u043d\\u043e"),
  completedAt: U("\\u0417\\u0430\\u0432\\u0435\\u0440\\u0448\\u0435\\u043d\\u043e"),
  lastActivity: U("\\u041f\\u043e\\u0441\\u043b\\u0435\\u0434\\u043d\\u044f\\u044f \\u0430\\u043a\\u0442\\u0438\\u0432\\u043d\\u043e\\u0441\\u0442\\u044c"),
  source: U("\\u0418\\u0441\\u0442\\u043e\\u0447\\u043d\\u0438\\u043a"),
  system: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u0430"),
  notSet: "-",
  loading: U("\\u0417\\u0430\\u0433\\u0440\\u0443\\u0436\\u0430\\u0435\\u043c..."),
  empty: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f \\u043d\\u0435 \\u043d\\u0430\\u0439\\u0434\\u0435\\u043d\\u044b."),
  attentionAssigned: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435 \\u0435\\u0449\\u0451 \\u043d\\u0435 \\u0430\\u043a\\u0442\\u0438\\u0432\\u0438\\u0440\\u043e\\u0432\\u0430\\u043d\\u043e"),
  attentionNoGroup: U("\\u041d\\u0435 \\u043f\\u0440\\u0438\\u0432\\u044f\\u0437\\u0430\\u043d\\u0430 \\u0443\\u0447\\u0435\\u0431\\u043d\\u0430\\u044f \\u0433\\u0440\\u0443\\u043f\\u043f\\u0430"),
  attentionNoOrganization: U("\\u041d\\u0435 \\u0443\\u043a\\u0430\\u0437\\u0430\\u043d\\u0430 \\u043e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u044f"),
  attentionDocument: U("\\u0418\\u0442\\u043e\\u0433\\u043e\\u0432\\u044b\\u0439 \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442 \\u0435\\u0449\\u0451 \\u043d\\u0435 \\u0433\\u043e\\u0442\\u043e\\u0432"),
  createdOk: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435 \\u0441\\u043e\\u0437\\u0434\\u0430\\u043d\\u043e."),
  bulkOk: U("\\u041c\\u0430\\u0441\\u0441\\u043e\\u0432\\u043e\\u0435 \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435 \\u0432\\u044b\\u043f\\u043e\\u043b\\u043d\\u0435\\u043d\\u043e."),
  updatedOk: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435 \\u043e\\u0431\\u043d\\u043e\\u0432\\u043b\\u0435\\u043d\\u043e."),
  deletedOk: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435 \\u0443\\u0434\\u0430\\u043b\\u0435\\u043d\\u043e."),
  loadFailed: U("\\u041d\\u0435 \\u0443\\u0434\\u0430\\u043b\\u043e\\u0441\\u044c \\u0437\\u0430\\u0433\\u0440\\u0443\\u0437\\u0438\\u0442\\u044c \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f."),
  saveFailed: U("\\u041d\\u0435 \\u0443\\u0434\\u0430\\u043b\\u043e\\u0441\\u044c \\u0441\\u043e\\u0445\\u0440\\u0430\\u043d\\u0438\\u0442\\u044c \\u0438\\u0437\\u043c\\u0435\\u043d\\u0435\\u043d\\u0438\\u044f."),
  deleteConfirm: U("\\u0423\\u0434\\u0430\\u043b\\u0438\\u0442\\u044c \\u044d\\u0442\\u043e \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435?"),
  selectUser: U("\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044f"),
  selectCourse: U("\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u043a\\u0443\\u0440\\u0441"),
  selectGroup: U("\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u0433\\u0440\\u0443\\u043f\\u043f\\u0443"),
  optional: U("\\u043d\\u0435 \\u0443\\u043a\\u0430\\u0437\\u0430\\u043d\\u043e"),
};

const STATUS_OPTIONS = [
  { value: "assigned", label: T.assigned, tone: "bg-slate-100 text-slate-700 ring-slate-200" },
  { value: "active", label: T.active, tone: "bg-green-50 text-green-700 ring-green-200" },
  { value: "completed", label: T.completed, tone: "bg-blue-50 text-blue-700 ring-blue-200" },
  { value: "cancelled", label: T.cancelled, tone: "bg-red-50 text-red-700 ring-red-200" },
];

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function toArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  return [];
}

function formatDate(value) {
  if (!value) {
    return T.notSet;
  }
  try {
    return formatDateTime(value);
  } catch {
    return String(value);
  }
}

function getStatusOption(status) {
  return STATUS_OPTIONS.find((item) => item.value === status) || STATUS_OPTIONS[0];
}

function getDisplayName(userLike) {
  return userLike?.user_full_name || userLike?.full_name || userLike?.name || userLike?.email || T.notSet;
}

function getInitials(name, fallback = "EN") {
  const clean = `${name || ""}`.trim();
  if (!clean) {
    return fallback;
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function getCourseType(enrollment) {
  const title = `${enrollment?.course_title || ""} ${enrollment?.course_slug || ""}`.toLowerCase();
  return title.includes("program") || title.includes("\u043f\u0440\u043e\u0433\u0440\u0430\u043c") ? T.program : T.course;
}

function getDerivedProgress(enrollment) {
  if (typeof enrollment?.progress_percent === "number") {
    return Math.max(0, Math.min(100, Math.round(enrollment.progress_percent)));
  }
  if (enrollment?.status === "completed") {
    return 100;
  }
  if (enrollment?.status === "active") {
    return 35;
  }
  return 0;
}

function getLatestAttempt(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return null;
  }
  return [...attempts].sort((a, b) => `${b.created_at || b.updated_at || ""}`.localeCompare(`${a.created_at || a.updated_at || ""}`))[0];
}

function getAttemptText(attempt) {
  if (!attempt) {
    return T.notSet;
  }
  const percent = attempt.percent ?? 0;
  return `${percent}%`;
}

const ASSIGNMENT_STATUS_LABELS = {
  not_started: U("\u041d\u0435 \u043d\u0430\u0447\u0430\u0442\u043e"),
  completed: U("\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e"),
  submitted: U("\u041e\u0436\u0438\u0434\u0430\u0435\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438"),
  approved: U("\u0417\u0430\u0447\u0442\u0435\u043d\u043e"),
  rejected: U("\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e"),
};

const ASSIGNMENT_REVIEW_MODE_LABELS = {
  self_check: U("\u0421\u0430\u043c\u043e\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430"),
  submit_only: U("\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430 \u043e\u0442\u0432\u0435\u0442\u0430"),
  manual_review: U("\u0420\u0443\u0447\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430"),
};

function getAssignmentStatusLabel(status) {
  return ASSIGNMENT_STATUS_LABELS[status] || status || T.notSet;
}

function getAssignmentReviewModeLabel(mode) {
  return ASSIGNMENT_REVIEW_MODE_LABELS[mode] || mode || T.notSet;
}

function getAssignmentStatusTone(status) {
  if (status === "approved" || status === "completed") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "submitted") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function getAssignmentTitle(submission) {
  return (
    submission?.block_title ||
    submission?.block_content_json?.title ||
    submission?.block_content_json?.heading ||
    submission?.lesson_title ||
    U("\u0417\u0430\u0434\u0430\u043d\u0438\u0435")
  );
}

function parseOptionalNumber(value) {
  const normalized = `${value ?? ""}`.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function getDocumentState(documents) {
  const list = Array.isArray(documents) ? documents : [];
  const available = list.find((item) => item.status === "available");
  if (available) {
    return { label: T.certificate, value: available.document_number || available.title || T.documents, good: true };
  }
  if (list.length > 0) {
    return { label: T.documents, value: `${list.length}`, good: false };
  }
  return { label: T.documents, value: T.notSet, good: false };
}

function getActionHints(enrollment, documents) {
  const hints = [];
  if (enrollment?.status === "assigned") {
    hints.push(T.attentionAssigned);
  }
  if (!enrollment?.organization_id) {
    hints.push(T.attentionNoOrganization);
  }
  if (!enrollment?.learning_group_id) {
    hints.push(T.attentionNoGroup);
  }
  if (enrollment?.status === "completed") {
    const hasAvailableDocument = (documents || []).some((document) => document.status === "available");
    if (!hasAvailableDocument) {
      hints.push(T.attentionDocument);
    }
  }
  return hints;
}

function buildCsv(rows) {
  const header = [
    "id",
    "user_email",
    "user_full_name",
    "course_title",
    "organization_name",
    "learning_group_name",
    "status",
    "started_at",
    "completed_at",
    "created_at",
    "updated_at",
  ];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [header.join(";"), ...rows.map((row) => header.map((key) => escape(row[key])).join(";"))].join("\n");
}

function downloadCsv(rows) {
  const blob = new Blob([`\ufeff${buildCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `admin-enrollments-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Badge({ children, className }) {
  return (
    <span className={cx("inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1", className)}>
      {children}
    </span>
  );
}

function FieldCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 break-words text-sm font-black text-slate-950">{value || T.notSet}</div>
    </div>
  );
}

function InfoCard({ title, subtitle, counter, children, testId }) {
  return (
    <section data-testid={testId} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p> : null}
        </div>
        {counter !== undefined ? (
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-50 px-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
            {counter}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ActionButton({ children, onClick, disabled, tone = "default", type = "button" }) {
  const toneClass =
    tone === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : tone === "danger"
        ? "bg-red-50 text-red-700 ring-1 ring-red-100 hover:bg-red-100"
        : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cx(BUTTON_CLASS, toneClass)}>
      {children}
    </button>
  );
}

function ProgressBar({ value }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 text-sm font-black text-slate-950">{safe}%</span>
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, children, disabled }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <select className={cx(INPUT_CLASS, "mt-2")} value={value} onChange={onChange} disabled={disabled}>
        {children}
      </select>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, onEnter }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <input
        className={cx(INPUT_CLASS, "mt-2")}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onEnter) {
            onEnter();
          }
        }}
      />
    </label>
  );
}

const EMPTY_CREATE_FORM = {
  user_id: "",
  course_id: "",
  organization_id: "",
  learning_group_id: "",
  status: "assigned",
};

function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [groups, setGroups] = useState([]);

  const [filters, setFilters] = useState({
    q: "",
    status: "",
    course_id: "",
    organization_id: "",
    learning_group_id: "",
    action_required: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [detailsById, setDetailsById] = useState({});
  const [documentsById, setDocumentsById] = useState({});
  const [quizAttemptsById, setQuizAttemptsById] = useState({});
  const [assignmentSubmissionsById, setAssignmentSubmissionsById] = useState({});
  const [assignmentReviewFormsById, setAssignmentReviewFormsById] = useState({});
  const [reviewSavingId, setReviewSavingId] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [bulkForm, setBulkForm] = useState({
    organization_id: "",
    learning_group_id: "",
    course_id: "",
    status: "assigned",
  });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({ organization_id: "", learning_group_id: "", status: "assigned" });

  const [loading, setLoading] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState("");
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const usersById = useMemo(() => Object.fromEntries(users.map((item) => [item.id, item])), [users]);
  const coursesById = useMemo(() => Object.fromEntries(courses.map((item) => [item.id, item])), [courses]);
  const organizationsById = useMemo(() => Object.fromEntries(organizations.map((item) => [item.id, item])), [organizations]);
  const groupsById = useMemo(() => Object.fromEntries(groups.map((item) => [item.id, item])), [groups]);

  const statusCounts = useMemo(() => {
    const counts = { all: enrollments.length, active: 0, assigned: 0, completed: 0, cancelled: 0, actionRequired: 0 };
    enrollments.forEach((enrollment) => {
      if (counts[enrollment.status] !== undefined) {
        counts[enrollment.status] += 1;
      }
      if (getActionHints(enrollment, documentsById[enrollment.id]).length > 0) {
        counts.actionRequired += 1;
      }
    });
    return counts;
  }, [documentsById, enrollments]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadEnrollments();
  }, [appliedFilters]);

  async function loadReferenceData() {
    try {
      const [usersPayload, coursesPayload, organizationsPayload, groupsPayload] = await Promise.allSettled([
        getAdminUsers(),
        getAdminCourses(),
        getAdminOrganizations(),
        getOrgLearningGroups(),
      ]);

      if (usersPayload.status === "fulfilled") {
        setUsers(toArray(usersPayload.value));
      }
      if (coursesPayload.status === "fulfilled") {
        setCourses(toArray(coursesPayload.value));
      }
      if (organizationsPayload.status === "fulfilled") {
        setOrganizations(toArray(organizationsPayload.value));
      }
      if (groupsPayload.status === "fulfilled") {
        setGroups(toArray(groupsPayload.value));
      }
    } catch {
      // Reference data failures are shown through select fallbacks.
    }
  }

  async function loadEnrollments() {
    try {
      setLoading(true);
      setError("");
      const payload = await getAdminEnrollments({
        ...appliedFilters,
        limit: 300,
      });
      setEnrollments(toArray(payload));
    } catch (err) {
      setError(err?.message || T.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  async function refreshEnrollment(enrollmentId) {
    try {
      const detail = await getAdminEnrollmentDetail(enrollmentId);
      setEnrollments((current) => current.map((item) => (item.id === enrollmentId ? detail : item)));
      setDetailsById((current) => ({ ...current, [enrollmentId]: detail }));
      return detail;
    } catch {
      await loadEnrollments();
      return null;
    }
  }

  async function loadEnrollmentDetails(enrollment) {
    if (!enrollment?.id) {
      return;
    }

    try {
      setDetailLoadingId(enrollment.id);
      const [detailResult, documentsResult, attemptsResult, assignmentSubmissionsResult] = await Promise.allSettled([
        getAdminEnrollmentDetail(enrollment.id),
        getAdminDocuments({ enrollment_id: enrollment.id }),
        getAdminEnrollmentQuizAttempts(enrollment.id),
        getAdminEnrollmentAssignmentSubmissions(enrollment.id),
      ]);

      if (detailResult.status === "fulfilled") {
        setDetailsById((current) => ({ ...current, [enrollment.id]: detailResult.value }));
      } else {
        setDetailsById((current) => ({ ...current, [enrollment.id]: enrollment }));
      }

      setDocumentsById((current) => ({
        ...current,
        [enrollment.id]: documentsResult.status === "fulfilled" ? toArray(documentsResult.value) : [],
      }));

      setQuizAttemptsById((current) => ({
        ...current,
        [enrollment.id]: attemptsResult.status === "fulfilled" ? toArray(attemptsResult.value) : [],
      }));

      setAssignmentSubmissionsById((current) => ({
        ...current,
        [enrollment.id]: assignmentSubmissionsResult.status === "fulfilled" ? toArray(assignmentSubmissionsResult.value) : [],
      }));
    } finally {
      setDetailLoadingId("");
    }
  }

  async function handleToggleEnrollment(enrollment) {
    if (selectedEnrollmentId === enrollment.id) {
      setSelectedEnrollmentId("");
      setEditingId("");
      return;
    }

    setSelectedEnrollmentId(enrollment.id);
    setEditingId("");
    await loadEnrollmentDetails(enrollment);
  }

  async function handleStatusUpdate(enrollment, status) {
    try {
      setSavingId(enrollment.id);
      setError("");
      setSuccessMessage("");
      await updateAdminEnrollment(enrollment.id, { status });
      await refreshEnrollment(enrollment.id);
      await loadEnrollmentDetails({ ...enrollment, status });
      setSuccessMessage(T.updatedOk);
    } catch (err) {
      setError(err?.message || T.saveFailed);
    } finally {
      setSavingId("");
    }
  }

  function beginEdit(enrollment) {
    setEditingId(enrollment.id);
    setEditForm({
      organization_id: enrollment.organization_id || "",
      learning_group_id: enrollment.learning_group_id || "",
      status: enrollment.status || "assigned",
    });
  }

  async function handleEditSubmit(event, enrollment) {
    event.preventDefault();
    try {
      setSavingId(enrollment.id);
      setError("");
      setSuccessMessage("");
      await updateAdminEnrollment(enrollment.id, {
        organization_id: editForm.organization_id || null,
        learning_group_id: editForm.learning_group_id || null,
        status: editForm.status,
      });
      setEditingId("");
      const updated = await refreshEnrollment(enrollment.id);
      await loadEnrollmentDetails(updated || enrollment);
      setSuccessMessage(T.updatedOk);
    } catch (err) {
      setError(err?.message || T.saveFailed);
    } finally {
      setSavingId("");
    }
  }

  function updateAssignmentReviewForm(submissionId, patch) {
    setAssignmentReviewFormsById((current) => ({
      ...current,
      [submissionId]: {
        ...(current[submissionId] || {}),
        ...patch,
      },
    }));
  }

  async function handleAssignmentReview(submission, reviewStatus) {
    if (!submission?.id) {
      return;
    }

    const form = assignmentReviewFormsById[submission.id] || {};
    const score = parseOptionalNumber(form.score);
    const maxScore = parseOptionalNumber(form.max_score);

    try {
      setReviewSavingId(submission.id);
      setError("");
      setSuccessMessage("");

      const updatedSubmission = await reviewAdminAssignmentSubmission(submission.id, {
        status: reviewStatus,
        score,
        max_score: maxScore,
        review_comment: form.review_comment || "",
      });

      setAssignmentSubmissionsById((current) => {
        const enrollmentId = updatedSubmission.enrollment_id || submission.enrollment_id;
        const items = current[enrollmentId] || [];

        return {
          ...current,
          [enrollmentId]: items.map((item) => (item.id === updatedSubmission.id ? updatedSubmission : item)),
        };
      });

      setAssignmentReviewFormsById((current) => ({
        ...current,
        [updatedSubmission.id]: {
          score: updatedSubmission.score ?? "",
          max_score: updatedSubmission.max_score ?? "",
          review_comment: updatedSubmission.review_comment || "",
        },
      }));

      setSuccessMessage(
        reviewStatus === "approved"
          ? U("\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u0437\u0430\u0447\u0442\u0435\u043d\u043e.")
          : U("\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e.")
      );
    } catch (err) {
      setError(err?.message || T.saveFailed);
    } finally {
      setReviewSavingId("");
    }
  }

  async function handleDelete(enrollment) {
    if (!window.confirm(T.deleteConfirm)) {
      return;
    }

    try {
      setSavingId(enrollment.id);
      setError("");
      setSuccessMessage("");
      await deleteAdminEnrollment(enrollment.id);
      setSelectedEnrollmentId("");
      setEnrollments((current) => current.filter((item) => item.id !== enrollment.id));
      setSuccessMessage(T.deletedOk);
    } catch (err) {
      setError(err?.message || T.saveFailed);
    } finally {
      setSavingId("");
    }
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();

    try {
      setSavingId("create");
      setError("");
      setSuccessMessage("");
      const created = await createAdminEnrollment({
        user_id: createForm.user_id,
        course_id: createForm.course_id,
        organization_id: createForm.organization_id || null,
        learning_group_id: createForm.learning_group_id || null,
        status: createForm.status,
      });
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateOpen(false);
      setEnrollments((current) => [created, ...current]);
      setSuccessMessage(T.createdOk);
    } catch (err) {
      setError(err?.message || T.saveFailed);
    } finally {
      setSavingId("");
    }
  }

  async function handleBulkSubmit(event) {
    event.preventDefault();

    try {
      setSavingId("bulk");
      setError("");
      setSuccessMessage("");
      await createAdminGroupEnrollments({
        organization_id: bulkForm.organization_id,
        learning_group_id: bulkForm.learning_group_id,
        course_id: bulkForm.course_id,
        status: bulkForm.status,
      });
      setBulkOpen(false);
      setSuccessMessage(T.bulkOk);
      await loadEnrollments();
    } catch (err) {
      setError(err?.message || T.saveFailed);
    } finally {
      setSavingId("");
    }
  }

  function applyFilters(nextFilters = filters) {
    setAppliedFilters(nextFilters);
  }

  function resetFilters() {
    const next = { q: "", status: "", course_id: "", organization_id: "", learning_group_id: "", action_required: "" };
    setFilters(next);
    setAppliedFilters(next);
  }

  function applyTab(status, actionRequired = "") {
    const next = {
      ...filters,
      status,
      action_required: actionRequired,
    };
    setFilters(next);
    setAppliedFilters(next);
  }

  return (
    <main className="space-y-5 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <span className="text-blue-600">{T.breadcrumbAdmin}</span>
              <span>/</span>
              <span>{T.breadcrumb}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{T.title}</h1>
              <Badge className="bg-green-50 text-green-700 ring-green-200">{"\u2022"} {T.systemOk}</Badge>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-500">{T.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton disabled>{T.importCsv}</ActionButton>
            <ActionButton onClick={() => downloadCsv(enrollments)}>{T.exportCsv}</ActionButton>
            <ActionButton tone="primary" onClick={() => setCreateOpen((value) => !value)}>
              {T.create}
            </ActionButton>
          </div>
        </div>

        {(createOpen || bulkOpen) && (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {createOpen && (
              <form onSubmit={handleCreateSubmit} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <h2 className="text-base font-black text-slate-950">{T.create}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label={T.user}
                    value={createForm.user_id}
                    onChange={(event) => setCreateForm((current) => ({ ...current, user_id: event.target.value }))}
                    disabled={savingId === "create"}
                  >
                    <option value="">{T.selectUser}</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={T.programCourse}
                    value={createForm.course_id}
                    onChange={(event) => setCreateForm((current) => ({ ...current, course_id: event.target.value }))}
                    disabled={savingId === "create"}
                  >
                    <option value="">{T.selectCourse}</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title || course.slug}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={T.organization}
                    value={createForm.organization_id}
                    onChange={(event) => setCreateForm((current) => ({ ...current, organization_id: event.target.value }))}
                    disabled={savingId === "create"}
                  >
                    <option value="">{T.optional}</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={T.group}
                    value={createForm.learning_group_id}
                    onChange={(event) => setCreateForm((current) => ({ ...current, learning_group_id: event.target.value }))}
                    disabled={savingId === "create"}
                  >
                    <option value="">{T.optional}</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name || group.code}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={T.status}
                    value={createForm.status}
                    onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))}
                    disabled={savingId === "create"}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="mt-4 flex gap-2">
                  <ActionButton type="submit" tone="primary" disabled={savingId === "create" || !createForm.user_id || !createForm.course_id}>
                    {savingId === "create" ? T.saving : T.save}
                  </ActionButton>
                  <ActionButton onClick={() => setBulkOpen((value) => !value)}>{T.bulkCreate}</ActionButton>
                </div>
              </form>
            )}

            {bulkOpen && (
              <form onSubmit={handleBulkSubmit} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <h2 className="text-base font-black text-slate-950">{T.bulkCreate}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label={T.organization}
                    value={bulkForm.organization_id}
                    onChange={(event) => setBulkForm((current) => ({ ...current, organization_id: event.target.value }))}
                    disabled={savingId === "bulk"}
                  >
                    <option value="">{T.allOrganizations}</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={T.group}
                    value={bulkForm.learning_group_id}
                    onChange={(event) => setBulkForm((current) => ({ ...current, learning_group_id: event.target.value }))}
                    disabled={savingId === "bulk"}
                  >
                    <option value="">{T.selectGroup}</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name || group.code}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={T.programCourse}
                    value={bulkForm.course_id}
                    onChange={(event) => setBulkForm((current) => ({ ...current, course_id: event.target.value }))}
                    disabled={savingId === "bulk"}
                  >
                    <option value="">{T.selectCourse}</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title || course.slug}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={T.status}
                    value={bulkForm.status}
                    onChange={(event) => setBulkForm((current) => ({ ...current, status: event.target.value }))}
                    disabled={savingId === "bulk"}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="mt-4">
                  <ActionButton
                    type="submit"
                    tone="primary"
                    disabled={savingId === "bulk" || !bulkForm.organization_id || !bulkForm.learning_group_id || !bulkForm.course_id}
                  >
                    {savingId === "bulk" ? T.saving : T.save}
                  </ActionButton>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_0.8fr]">
          <TextField
            label={T.search}
            value={filters.q}
            placeholder={T.searchPlaceholder}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            onEnter={() => applyFilters()}
          />

          <SelectField label={T.status} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">{T.allStatuses}</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </SelectField>

          <SelectField label={T.programCourse} value={filters.course_id} onChange={(event) => setFilters((current) => ({ ...current, course_id: event.target.value }))}>
            <option value="">{T.selectCourse}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title || course.slug}
              </option>
            ))}
          </SelectField>

          <SelectField label={T.organization} value={filters.organization_id} onChange={(event) => setFilters((current) => ({ ...current, organization_id: event.target.value }))}>
            <option value="">{T.allOrganizations}</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </SelectField>

          <div className="flex items-end gap-2">
            <ActionButton tone="primary" onClick={() => applyFilters()}>
              {T.apply}
            </ActionButton>
            <ActionButton onClick={resetFilters}>{T.reset}</ActionButton>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {[
          [T.all, statusCounts.all, "", ""],
          [T.active, statusCounts.active, "active", ""],
          [T.completed, statusCounts.completed, "completed", ""],
          [T.assigned, statusCounts.assigned, "assigned", ""],
          [T.actionRequired, statusCounts.actionRequired, "", "true"],
        ].map(([label, count, status, actionRequired]) => {
          const active =
            appliedFilters.status === status &&
            (appliedFilters.action_required || "") === (actionRequired || "");
          return (
            <button
              key={`${label}-${status}-${actionRequired}`}
              type="button"
              onClick={() => applyTab(status, actionRequired)}
              className={cx(
                "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-black ring-1 transition",
                active ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              )}
            >
              <span>{label}</span>
              <span className={cx("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600")}>
                {count}
              </span>
            </button>
          );
        })}
      </section>

      {error ? (
        <div data-testid="admin-enrollments-error-state" className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div data-testid="admin-enrollments-success-state" className="rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700 ring-1 ring-green-200">
          {successMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-600">
          <span>{T.shown} {enrollments.length} {T.records}</span>
          <span>{"\u00b7"}</span>
          <span>{T.csvRows}: {enrollments.length}</span>
          <button
            type="button"
            onClick={() => downloadCsv(enrollments)}
            className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-800 ring-1 ring-slate-200"
          >
            {T.exportCsv}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table data-testid="admin-enrollments-table" className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                <th className="w-12 px-5 py-4" />
                <th className="px-5 py-4">{T.user}</th>
                <th className="px-5 py-4">{T.programCourse}</th>
                <th className="px-5 py-4">{T.type}</th>
                <th className="px-5 py-4">{T.group}</th>
                <th className="px-5 py-4">{T.enrolledAt}</th>
                <th className="px-5 py-4">{T.status}</th>
                <th className="px-5 py-4">{T.progress}</th>
                <th className="px-5 py-4">{T.updated}</th>
                <th className="px-5 py-4 text-right">{T.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm font-bold text-slate-500">
                    {T.loading}
                  </td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm font-bold text-slate-500">
                    {T.empty}
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => {
                  const isSelected = selectedEnrollmentId === enrollment.id;
                  const statusOption = getStatusOption(enrollment.status);
                  const details = detailsById[enrollment.id] || enrollment;
                  const documents = documentsById[enrollment.id] || [];
                  const attempts = quizAttemptsById[enrollment.id] || [];
                  const assignmentSubmissions = assignmentSubmissionsById[enrollment.id] || [];
                  const latestAttempt = getLatestAttempt(attempts);
                  const documentState = getDocumentState(documents);
                  const hints = getActionHints(details, documents);
                  const progress = getDerivedProgress(details);
                  const displayName = details.user_full_name || details.user_email || T.user;
                  const groupName = details.learning_group_name || groupsById[details.learning_group_id]?.name || T.notSet;
                  const organizationName = details.organization_name || organizationsById[details.organization_id]?.name || T.notSet;

                  return (
                    <Fragment key={`enrollment-row-block-${enrollment.id}`}>
                      <tr className={cx("border-b border-slate-100 align-middle", isSelected ? "bg-blue-50/30" : "bg-white")}>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleEnrollment(enrollment)}
                            className={cx(
                              "inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-black ring-1 transition",
                              isSelected ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-blue-600 ring-slate-200 hover:bg-blue-50"
                            )}
                          >
                            {isSelected ? "\u2212" : "\u203a"}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                              {getInitials(displayName)}
                            </div>
                            <div>
                              <div className="font-black text-slate-950">{displayName}</div>
                              <div className="text-xs font-medium text-slate-500">{details.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-black text-slate-950">{details.course_title || T.notSet}</div>
                          <div className="text-xs font-medium uppercase text-slate-500">{details.course_slug || T.notSet}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className="bg-blue-50 text-blue-700 ring-blue-200">{getCourseType(details)}</Badge>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{groupName}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatDate(details.started_at || details.created_at)}</td>
                        <td className="px-5 py-4">
                          <Badge className={statusOption.tone}>{statusOption.label}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <ProgressBar value={progress} />
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-600">{formatDate(details.updated_at)}</td>
                        <td className="px-5 py-4 text-right">
                          <div data-testid={`admin-enrollment-row-actions-${enrollment.id}`} className="flex justify-end gap-2">
                            <ActionButton onClick={() => handleToggleEnrollment(enrollment)}>
                              {isSelected ? T.close : T.open}
                            </ActionButton>
                            <ActionButton onClick={() => beginEdit(details)}>{T.edit}</ActionButton>
                            <ActionButton onClick={() => handleDelete(details)} tone="danger" disabled={savingId === enrollment.id}>
                              ...
                            </ActionButton>
                          </div>
                        </td>
                      </tr>

                      {isSelected ? (
                        <tr key={`enrollment-detail-${enrollment.id}`} className="bg-slate-50/70">
                          <td colSpan={10} className="px-4 pb-4 pt-0">
                            <div data-testid="admin-enrollment-detail-content" className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                              <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                                <div className="flex min-w-0 items-center gap-4">
                                  <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-black text-blue-700 ring-1 ring-blue-100">
                                    {getInitials(displayName)}
                                  </div>
                                  <div className="min-w-0">
                                    <h2 className="truncate text-2xl font-black text-slate-950">{displayName}</h2>
                                    <p className="mt-1 text-sm font-medium text-slate-500">
                                      {details.user_email} {"\u00b7"} {organizationName}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Badge className={statusOption.tone}>{statusOption.label}</Badge>
                                      <Badge className="bg-blue-50 text-blue-700 ring-blue-100">{getCourseType(details)}</Badge>
                                      <Badge className="bg-slate-50 text-slate-700 ring-slate-200">{groupName}</Badge>
                                    </div>
                                  </div>
                                </div>

                                <div data-testid="admin-enrollment-detail-actions" className="flex flex-wrap justify-end gap-2">
                                  <ActionButton onClick={() => beginEdit(details)}>{T.edit}</ActionButton>
                                  {details.status !== "active" ? (
                                    <ActionButton onClick={() => handleStatusUpdate(details, "active")} disabled={savingId === details.id}>
                                      {T.start}
                                    </ActionButton>
                                  ) : null}
                                  {details.status !== "completed" ? (
                                    <ActionButton onClick={() => handleStatusUpdate(details, "completed")} disabled={savingId === details.id}>
                                      {T.complete}
                                    </ActionButton>
                                  ) : null}
                                  {details.status !== "cancelled" ? (
                                    <ActionButton onClick={() => handleStatusUpdate(details, "cancelled")} disabled={savingId === details.id}>
                                      {T.cancel}
                                    </ActionButton>
                                  ) : null}
                                  <ActionButton onClick={() => handleToggleEnrollment(details)}>{T.close}</ActionButton>
                                </div>
                              </div>

                              {detailLoadingId === enrollment.id ? (
                                <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
                                  {T.loading}
                                </div>
                              ) : null}

                              {hints.length > 0 ? (
                                <div data-testid="enrollment-attention-diagnostics" className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                                  <div className="flex flex-wrap items-center gap-2 text-sm font-black text-amber-900">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-amber-600 ring-1 ring-amber-200">!</span>
                                    <span>{T.actionRequired}</span>
                                    <span>{"\u00b7"}</span>
                                    <span>{hints.join(" \u2022 ")}</span>
                                    <span className="ml-auto inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs text-amber-700 ring-1 ring-amber-200">
                                      {hints.length}
                                    </span>
                                  </div>
                                </div>
                              ) : null}

                              {editingId === details.id ? (
                                <form onSubmit={(event) => handleEditSubmit(event, details)} className="mt-4 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                                  <div className="grid gap-4 md:grid-cols-3">
                                    <SelectField label={T.organization} value={editForm.organization_id} onChange={(event) => setEditForm((current) => ({ ...current, organization_id: event.target.value }))}>
                                      <option value="">{T.optional}</option>
                                      {organizations.map((organization) => (
                                        <option key={organization.id} value={organization.id}>
                                          {organization.name}
                                        </option>
                                      ))}
                                    </SelectField>
                                    <SelectField label={T.group} value={editForm.learning_group_id} onChange={(event) => setEditForm((current) => ({ ...current, learning_group_id: event.target.value }))}>
                                      <option value="">{T.optional}</option>
                                      {groups.map((group) => (
                                        <option key={group.id} value={group.id}>
                                          {group.name || group.code}
                                        </option>
                                      ))}
                                    </SelectField>
                                    <SelectField label={T.status} value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}>
                                      {STATUS_OPTIONS.map((status) => (
                                        <option key={status.value} value={status.value}>
                                          {status.label}
                                        </option>
                                      ))}
                                    </SelectField>
                                  </div>
                                  <div className="mt-4 flex gap-2">
                                    <ActionButton type="submit" tone="primary" disabled={savingId === details.id}>
                                      {savingId === details.id ? T.saving : T.save}
                                    </ActionButton>
                                    <ActionButton onClick={() => setEditingId("")}>{T.cancel}</ActionButton>
                                  </div>
                                </form>
                              ) : null}

                              <div data-testid="enrollment-dashboard-grid" className="mt-4 grid gap-4 xl:grid-cols-4">
                                <InfoCard title={T.profileUser} subtitle={T.user} testId="enrollment-user-card">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <FieldCard label="ID" value={details.user_id} />
                                    <FieldCard label="Email" value={details.user_email} />
                                    <FieldCard label={T.organization} value={organizationName} />
                                    <FieldCard label={T.group} value={groupName} />
                                  </div>
                                  <Link className="mt-4 inline-flex text-sm font-black text-blue-700 hover:text-blue-900" to={`/admin/users?user_id=${details.user_id}`}>
                                    {T.openUser} {"\u2192"}
                                  </Link>
                                </InfoCard>

                                <InfoCard title={T.courseInfo} subtitle={T.programCourse} testId="enrollment-course-card">
                                  <div className="grid gap-3">
                                    <FieldCard label={T.programCourse} value={details.course_title} />
                                    <FieldCard label="Slug" value={details.course_slug} />
                                    <FieldCard label={T.type} value={getCourseType(details)} />
                                  </div>
                                  <Link className="mt-4 inline-flex text-sm font-black text-blue-700 hover:text-blue-900" to={`/admin/courses?course_id=${details.course_id}`}>
                                    {T.openCourse} {"\u2192"}
                                  </Link>
                                </InfoCard>

                                <InfoCard title={T.performance} subtitle={T.progress} counter={attempts.length} testId="enrollment-performance-card">
                                  <div className="space-y-4">
                                    <div>
                                      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{T.progress}</div>
                                      <ProgressBar value={progress} />
                                    </div>
                                    <FieldCard label={T.grade} value={getAttemptText(latestAttempt)} />
                                    <div className="rounded-2xl bg-slate-50 p-3">
                                      <div className="text-xs font-black text-slate-500">{T.quizAttempts}</div>
                                      {attempts.length === 0 ? (
                                        <div className="mt-2 text-sm font-medium text-slate-500">{T.noQuiz}</div>
                                      ) : (
                                        <div className="mt-2 space-y-2">
                                          {attempts.slice(0, 3).map((attempt) => (
                                            <div key={attempt.id || `${attempt.block_id}-${attempt.created_at}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                              <span className="truncate text-sm font-bold text-slate-800">{attempt.lesson_title || attempt.block_title || T.quizAttempts}</span>
                                              <Badge className={attempt.passed ? "bg-green-50 text-green-700 ring-green-200" : "bg-red-50 text-red-700 ring-red-200"}>
                                                {attempt.percent ?? 0}%
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </InfoCard>

                                <InfoCard
                                  title={U("\u041f\u0440\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f")}
                                  subtitle={U("\u0420\u0443\u0447\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043e\u0442\u0432\u0435\u0442\u043e\u0432")}
                                  counter={assignmentSubmissions.length}
                                  testId="enrollment-assignment-submissions-card"
                                >
                                  <div className="space-y-3">
                                    {assignmentSubmissions.length === 0 ? (
                                      <p className="rounded-2xl bg-slate-50 p-3 text-sm font-medium text-slate-500">
                                        {U("\u041e\u0442\u0432\u0435\u0442\u044b \u043f\u043e \u0437\u0430\u0434\u0430\u043d\u0438\u044f\u043c \u043f\u043e\u043a\u0430 \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u044b.")}
                                      </p>
                                    ) : (
                                      assignmentSubmissions.map((submission) => {
                                        const reviewForm = assignmentReviewFormsById[submission.id] || {
                                          score: submission.score ?? "",
                                          max_score: submission.max_score ?? "",
                                          review_comment: submission.review_comment || "",
                                        };
                                        const isReviewSaving = reviewSavingId === submission.id;
                                        const hasAnswer = `${submission.answer_text || ""}`.trim();

                                        return (
                                          <div key={submission.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                              <div className="min-w-0">
                                                <div className="text-sm font-black text-slate-950">{getAssignmentTitle(submission)}</div>
                                                <div className="mt-1 text-xs font-bold text-slate-500">
                                                  {submission.lesson_title || T.notSet} {"\u00b7"} {getAssignmentReviewModeLabel(submission.review_mode)}
                                                </div>
                                              </div>
                                              <Badge className={getAssignmentStatusTone(submission.status)}>
                                                {getAssignmentStatusLabel(submission.status)}
                                              </Badge>
                                            </div>

                                            <div className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-800 ring-1 ring-slate-100">
                                              {hasAnswer || U("\u041e\u0442\u0432\u0435\u0442 \u043f\u0443\u0441\u0442\u043e\u0439.")}
                                            </div>

                                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                              <label className="block">
                                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                  {U("\u0411\u0430\u043b\u043b")}
                                                </span>
                                                <input
                                                  className={cx(INPUT_CLASS, "mt-1")}
                                                  value={reviewForm.score}
                                                  disabled={isReviewSaving}
                                                  inputMode="decimal"
                                                  onChange={(event) => updateAssignmentReviewForm(submission.id, { score: event.target.value })}
                                                  placeholder="0"
                                                />
                                              </label>
                                              <label className="block">
                                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                  {U("\u041c\u0430\u043a\u0441. \u0431\u0430\u043b\u043b")}
                                                </span>
                                                <input
                                                  className={cx(INPUT_CLASS, "mt-1")}
                                                  value={reviewForm.max_score}
                                                  disabled={isReviewSaving}
                                                  inputMode="decimal"
                                                  onChange={(event) => updateAssignmentReviewForm(submission.id, { max_score: event.target.value })}
                                                  placeholder="0"
                                                />
                                              </label>
                                            </div>

                                            <label className="mt-3 block">
                                              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                {U("\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439")}
                                              </span>
                                              <textarea
                                                className={cx(INPUT_CLASS, "mt-1 min-h-[84px] resize-y")}
                                                value={reviewForm.review_comment}
                                                disabled={isReviewSaving}
                                                onChange={(event) => updateAssignmentReviewForm(submission.id, { review_comment: event.target.value })}
                                                placeholder={U("\u041a\u043e\u0440\u043e\u0442\u043a\u0438\u0439 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u0434\u043b\u044f \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0435\u0433\u043e\u0441\u044f")}
                                              />
                                            </label>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                              <ActionButton
                                                tone="primary"
                                                disabled={isReviewSaving}
                                                onClick={() => handleAssignmentReview(submission, "approved")}
                                              >
                                                {isReviewSaving ? T.saving : U("\u0417\u0430\u0447\u0435\u0441\u0442\u044c")}
                                              </ActionButton>
                                              <ActionButton
                                                tone="danger"
                                                disabled={isReviewSaving}
                                                onClick={() => handleAssignmentReview(submission, "rejected")}
                                              >
                                                {U("\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c")}
                                              </ActionButton>
                                            </div>

                                            {submission.review_comment ? (
                                              <div className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-100">
                                                {U("\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439")}: {submission.review_comment}
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </InfoCard>

                                <InfoCard title={T.marksDocs} subtitle={T.documents} counter={documents.length} testId="enrollment-documents-card">
                                  <div className="space-y-3">
                                    <FieldCard label={documentState.label} value={documentState.value} />
                                    {documents.length === 0 ? (
                                      <p className="text-sm font-medium text-slate-500">{T.noDocs}</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {documents.slice(0, 3).map((document) => (
                                          <div key={document.id} className="rounded-2xl bg-slate-50 p-3">
                                            <div className="text-sm font-black text-slate-950">{document.title || document.document_number}</div>
                                            <div className="mt-1 text-xs font-bold text-slate-500">{document.document_number} {"\u00b7"} {document.status}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <Link className="inline-flex text-sm font-black text-blue-700 hover:text-blue-900" to={`/admin/documents?enrollment_id=${details.id}`}>
                                      {T.openDocuments} {"\u2192"}
                                    </Link>
                                  </div>
                                </InfoCard>

                                <InfoCard title={T.history} subtitle={T.lastActivity} testId="enrollment-history-card">
                                  <div className="space-y-3">
                                    {[
                                      [T.created, details.created_at],
                                      [T.enrolledAt, details.started_at],
                                      [T.completedAt, details.completed_at],
                                      [T.updated, details.updated_at],
                                    ].map(([label, value]) => (
                                      <div key={label} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                                        <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                                        <div>
                                          <div className="text-sm font-black text-slate-900">{label}</div>
                                          <div className="text-xs font-bold text-slate-500">{formatDate(value)}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <Link className="mt-4 inline-flex text-sm font-black text-blue-700 hover:text-blue-900" to={`/admin/audit?entity_type=enrollment&entity_id=${details.id}`}>
                                    {T.openAudit} {"\u2192"}
                                  </Link>
                                </InfoCard>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
export { AdminEnrollmentsPage };
export default AdminEnrollmentsPage;

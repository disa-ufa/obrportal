import React from "react";

import { buildDatedCsvFilename, downloadCsvFile } from "../../utils/exportCsv";

const STAGE82_ORGANIZATION_LEARNING_OVERVIEW =
  "stage82_20_organization_learning_overview";

const ORGANIZATION_LEARNING_OVERVIEW_LABELS = {
  stage: "Stage 82.20 · Organization Learning Overview",
  title: "Общая сводка обучения",
  subtitle:
    "Сводка по всем назначениям доступных организаций: обучение, завершение и итоговые документы без перехода в каждую группу.",
  refresh: "Обновить сводку",
  empty: "Назначения по доступным организациям пока не найдены.",
  errorFallback: "Не удалось загрузить общую сводку обучения.",
};

const STAGE82_ORGANIZATION_LEARNING_ATTENTION_FILTERS =
  "stage82_21_organization_learning_attention_filters";

const ORGANIZATION_LEARNING_ATTENTION_LABELS = {
  stage: "Stage 82.21 · Organization Learning Attention Filters",
  title: "Быстрые списки по сводке",
  subtitle:
    "Списки помогают быстро перейти от цифр к конкретным слушателям и группам, где требуется внимание.",
  empty: "По выбранному списку пока нет назначений.",
  openGroup: "Открыть группу",
  verify: "Проверить документ",
};

const STAGE82_ORGANIZATION_ATTENTION_CSV_EXPORT =
  "stage82_22_organization_attention_csv_export";

const ORGANIZATION_ATTENTION_CSV_EXPORT_LABELS = {
  exportButton: "Скачать CSV",
  exportEmpty: "Нет данных для выгрузки",
};

const STAGE82_ORGANIZATION_ATTENTION_SHOW_MORE =
  "stage82_24_organization_attention_show_more";

const ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT = 8;

const ORGANIZATION_ATTENTION_SHOW_MORE_LABELS = {
  showMore: "Показать ещё",
  showAll: "Показать все",
  collapse: "Свернуть",
  summary: "Показано",
};

const STAGE82_ORGANIZATION_ATTENTION_CARD_DETAILS =
  "stage82_25_organization_attention_card_details";

const ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS = {
  status: "Статус",
  email: "Email",
  completedAt: "Завершено",
  documentNumber: "Документ",
  verificationCode: "Код проверки",
  noEmail: "email не указан",
  noDate: "дата не указана",
  emptyValue: "—",
};

const STAGE82_ORGANIZATION_ATTENTION_DOCUMENT_ACTIONS =
  "stage82_26_organization_attention_document_actions";

const ORGANIZATION_ATTENTION_DOCUMENT_ACTION_LABELS = {
  copyDocumentNumber: "Скопировать номер",
  copyVerificationCode: "Скопировать код",
  copied: "Скопировано",
};

const STAGE82_ORGANIZATION_ATTENTION_REASON_BADGES =
  "stage82_28_organization_attention_reason_badges";

const ORGANIZATION_ATTENTION_REASON_BADGE_LABELS = {
  noDocument: "Нет документа",
  notCompleted: "Обучение не завершено",
  noEmail: "Нет email",
  unpublishedDocument: "Документ не опубликован",
  revokedDocument: "Документ отозван",
  publishedDocument: "Документ опубликован",
};

const STAGE82_ORGANIZATION_ATTENTION_EXPORT_REASONS =
  "stage82_29_organization_attention_export_reasons";

const ORGANIZATION_ATTENTION_EXPORT_REASON_LABELS = {
  reasonsColumn: "Причины",
};

const STAGE82_ORGANIZATION_ATTENTION_REASON_FILTERS =
  "stage82_30_organization_attention_reason_filters";

const ORGANIZATION_ATTENTION_REASON_FILTER_LABELS = {
  title: "Фильтр по причинам",
  allReasons: "Все причины",
};

const ORGANIZATION_ATTENTION_REASON_FILTERS = [
  { id: "all", label: ORGANIZATION_ATTENTION_REASON_FILTER_LABELS.allReasons },
  { id: "no_email", label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.noEmail },
  { id: "not_completed", label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.notCompleted },
  { id: "no_document", label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.noDocument },
  {
    id: "unpublished_document",
    label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.unpublishedDocument,
  },
  { id: "revoked_document", label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.revokedDocument },
  { id: "published_document", label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.publishedDocument },
];

const STAGE82_ORGANIZATION_ATTENTION_REASON_FILTER_PERSISTENCE =
  "stage82_31_organization_attention_reason_filter_persistence";

const ORGANIZATION_ATTENTION_REASON_FILTER_STORAGE_KEY =
  "obrportal.organization.attention.reasonFilters.v1";

const STAGE82_ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY =
  "stage82_32_organization_attention_active_filter_summary";

const ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY_LABELS = {
  title: "Активные фильтры быстрого списка",
  quickList: "Список",
  reason: "Причина",
  found: "Найдено",
  resetReason: "Сбросить причину",
  resetQuickList: "Сбросить быстрый список",
};

const STAGE82_ORGANIZATION_ATTENTION_REASON_EMPTY_STATE =
  "stage82_33_organization_attention_reason_empty_state";

const ORGANIZATION_ATTENTION_REASON_EMPTY_STATE_LABELS = {
  resetReason: "Сбросить причину",
};

const STAGE82_ORGANIZATION_OVERVIEW_SEARCH_FILTERS =
  "stage82_23_organization_overview_search_filters";

const ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS = {
  searchPlaceholder: "Поиск по слушателю, email, курсу, группе или организации",
  allLearning: "Все статусы обучения",
  allDocuments: "Все статусы документов",
  reset: "Сбросить фильтры",
  clearSearch: "Очистить поиск",
  activeFilters: "Активные фильтры",
  searchFilter: "Поиск",
  learningFilter: "Обучение",
  documentFilter: "Документы",
};

const STAGE82_ORGANIZATION_OVERVIEW_FILTER_PERSISTENCE =
  "stage82_27_organization_overview_filter_persistence";

const ORGANIZATION_OVERVIEW_FILTER_STORAGE_KEY =
  "obrportal.organization.overview.filters.v1";

const ORGANIZATION_OVERVIEW_LEARNING_STATUS_FILTERS = [
  { id: "all", label: ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS.allLearning },
  { id: "assigned", label: "Назначено" },
  { id: "active", label: "В процессе" },
  { id: "completed", label: "Завершено" },
];

const ORGANIZATION_OVERVIEW_DOCUMENT_STATUS_FILTERS = [
  { id: "all", label: ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS.allDocuments },
  { id: "missing", label: "Документ не сформирован" },
  { id: "draft", label: "PDF в черновике" },
  { id: "available", label: "Опубликовано" },
  { id: "revoked", label: "Отозвано" },
];

const ORGANIZATION_LEARNING_ATTENTION_FILTERS = [
  {
    id: "completed_without_document",
    label: "Завершили без документа",
    description: "Курс завершён, но итоговый документ ещё не сформирован.",
    tone: "amber",
    predicate: (enrollment) => enrollment.status === "completed" && !enrollment.document,
  },
  {
    id: "draft_documents",
    label: "PDF в черновике",
    description: "Документ сформирован, но ещё ждёт публикации.",
    tone: "amber",
    predicate: (enrollment) => enrollment.document?.status === "draft",
  },
  {
    id: "available_documents",
    label: "Опубликовано",
    description: "Документ доступен для публичной проверки.",
    tone: "green",
    predicate: (enrollment) => enrollment.document?.status === "available",
  },
  {
    id: "revoked_documents",
    label: "Отозвано",
    description: "Документ был отозван и требует проверки причины.",
    tone: "red",
    predicate: (enrollment) => enrollment.document?.status === "revoked",
  },
  {
    id: "active_learning",
    label: "В процессе",
    description: "Назначения, по которым обучение ещё не завершено.",
    tone: "blue",
    predicate: (enrollment) =>
      enrollment.status === "active" ||
      enrollment.status === "in_progress" ||
      enrollment.status === "assigned",
  },
];

const ORGANIZATION_LEARNING_ATTENTION_EXPORT_COLUMNS = [
  { key: "filter", label: "Список" },
  { key: "learner", label: "Слушатель" },
  { key: "learner_email", label: "Email слушателя" },
  { key: "organization", label: "Организация" },
  { key: "group", label: "Учебная группа" },
  { key: "course", label: "Курс" },
  { key: "enrollment_status", label: "Статус обучения" },
  { key: "document_status", label: "Статус документа" },
  { key: "document_number", label: "Номер документа" },
  { key: "verification_code", label: "Код проверки" },
  { key: "public_verify_path", label: "Публичная ссылка" },
  { key: "reasons", label: ORGANIZATION_ATTENTION_EXPORT_REASON_LABELS.reasonsColumn },
  { key: "completed_at", label: "Дата завершения" },
];

function countWhere(items, predicate) {
  return items.filter(predicate).length;
}

function getEnrollmentDocumentStatus(enrollment) {
  return enrollment.document?.status || "missing";
}

function buildOrganizationLearningOverviewStats(enrollments = []) {
  const assignedCount = countWhere(enrollments, (item) => item.status === "assigned");
  const inProgressCount = countWhere(
    enrollments,
    (item) => item.status === "in_progress" || item.status === "active"
  );
  const completedCount = countWhere(enrollments, (item) => item.status === "completed");
  const documentDraftCount = countWhere(
    enrollments,
    (item) => getEnrollmentDocumentStatus(item) === "draft"
  );
  const documentAvailableCount = countWhere(
    enrollments,
    (item) => getEnrollmentDocumentStatus(item) === "available"
  );
  const documentRevokedCount = countWhere(
    enrollments,
    (item) => getEnrollmentDocumentStatus(item) === "revoked"
  );
  const completedWithoutDocumentCount = countWhere(
    enrollments,
    (item) => item.status === "completed" && !item.document
  );

  return {
    totalCount: enrollments.length,
    assignedCount,
    inProgressCount,
    completedCount,
    documentDraftCount,
    documentAvailableCount,
    documentRevokedCount,
    completedWithoutDocumentCount,
  };
}

function getAttentionFilterToneClass(tone, selected = false) {
  if (tone === "green") {
    return selected
      ? "bg-green-600 text-white ring-green-600"
      : "bg-green-50 text-green-800 ring-green-200";
  }

  if (tone === "amber") {
    return selected
      ? "bg-amber-500 text-white ring-amber-500"
      : "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (tone === "red") {
    return selected
      ? "bg-red-600 text-white ring-red-600"
      : "bg-red-50 text-red-800 ring-red-200";
  }

  if (tone === "blue") {
    return selected
      ? "bg-blue-600 text-white ring-blue-600"
      : "bg-blue-50 text-blue-800 ring-blue-200";
  }

  return selected
    ? "bg-slate-900 text-white ring-slate-900"
    : "bg-slate-50 text-slate-700 ring-slate-200";
}

function getEnrollmentLearnerLabel(enrollment) {
  return enrollment.user_full_name || enrollment.user_email || enrollment.user_id || "Слушатель";
}

function getEnrollmentCourseLabel(enrollment) {
  return enrollment.course_title || enrollment.course_slug || enrollment.course_id || "Курс";
}

function getEnrollmentGroupLabel(enrollment) {
  return enrollment.learning_group_name || "Без учебной группы";
}

function getEnrollmentStatusLabel(status) {
  if (status === "assigned") {
    return "Назначено";
  }

  if (status === "active" || status === "in_progress") {
    return "В процессе";
  }

  if (status === "completed") {
    return "Завершено";
  }

  return status || "";
}

function formatEnrollmentDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("ru-RU");
}

function getEnrollmentDocumentLabel(enrollment) {
  if (!enrollment.document) {
    return "Документ не сформирован";
  }

  if (enrollment.document.status === "available") {
    return "Документ опубликован";
  }

  if (enrollment.document.status === "draft") {
    return "Документ в черновике";
  }

  if (enrollment.document.status === "revoked") {
    return "Документ отозван";
  }

  return "Документ есть";
}

function normalizeOverviewSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function enrollmentMatchesOverviewSearch(enrollment, query) {
  const normalizedQuery = normalizeOverviewSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    getEnrollmentLearnerLabel(enrollment),
    enrollment.user_email,
    enrollment.organization_name,
    getEnrollmentGroupLabel(enrollment),
    getEnrollmentCourseLabel(enrollment),
    getEnrollmentStatusLabel(enrollment.status),
    getEnrollmentDocumentLabel(enrollment),
    enrollment.document?.document_number,
    enrollment.document?.verification_code,
  ]
    .map(normalizeOverviewSearchText)
    .join(" ");

  return haystack.includes(normalizedQuery);
}

function enrollmentMatchesOverviewLearningStatus(enrollment, statusFilter) {
  if (!statusFilter || statusFilter === "all") {
    return true;
  }

  if (statusFilter === "active") {
    return (
      enrollment.status === "active" ||
      enrollment.status === "in_progress" ||
      enrollment.status === "assigned"
    );
  }

  return enrollment.status === statusFilter;
}

function enrollmentMatchesOverviewDocumentStatus(enrollment, documentFilter) {
  if (!documentFilter || documentFilter === "all") {
    return true;
  }

  return getEnrollmentDocumentStatus(enrollment) === documentFilter;
}

function filterOrganizationLearningOverviewEnrollments(enrollments = [], filters = {}) {
  return enrollments.filter(
    (enrollment) =>
      enrollmentMatchesOverviewSearch(enrollment, filters.searchQuery) &&
      enrollmentMatchesOverviewLearningStatus(enrollment, filters.learningStatusFilter) &&
      enrollmentMatchesOverviewDocumentStatus(enrollment, filters.documentStatusFilter)
  );
}

function getOrganizationOverviewFilterOptionLabel(options, value) {
  return options.find((option) => option.id === value)?.label || value;
}

function readOrganizationOverviewStoredFilters() {
  const fallback = {
    searchQuery: "",
    learningStatusFilter: "all",
    documentStatusFilter: "all",
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(
      ORGANIZATION_OVERVIEW_FILTER_STORAGE_KEY
    );

    if (!storedValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(storedValue);
    const learningFilterIds = new Set(
      ORGANIZATION_OVERVIEW_LEARNING_STATUS_FILTERS.map((filter) => filter.id)
    );
    const documentFilterIds = new Set(
      ORGANIZATION_OVERVIEW_DOCUMENT_STATUS_FILTERS.map((filter) => filter.id)
    );

    return {
      searchQuery: String(parsedValue.searchQuery || ""),
      learningStatusFilter: learningFilterIds.has(parsedValue.learningStatusFilter)
        ? parsedValue.learningStatusFilter
        : fallback.learningStatusFilter,
      documentStatusFilter: documentFilterIds.has(parsedValue.documentStatusFilter)
        ? parsedValue.documentStatusFilter
        : fallback.documentStatusFilter,
    };
  } catch {
    return fallback;
  }
}

function saveOrganizationOverviewStoredFilters(filters) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      ORGANIZATION_OVERVIEW_FILTER_STORAGE_KEY,
      JSON.stringify(filters)
    );
  } catch {}
}

function formatOrganizationAttentionDate(value) {
  if (!value) {
    return ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.noDate;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.noDate;
  }

  return date.toLocaleDateString("ru-RU");
}

function getOrganizationAttentionEmailLabel(enrollment) {
  return enrollment.user_email || ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.noEmail;
}

function getOrganizationAttentionDocumentNumberLabel(enrollment) {
  return (
    enrollment.document?.document_number ||
    ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.emptyValue
  );
}

function getOrganizationAttentionVerificationCodeLabel(enrollment) {
  return (
    enrollment.document?.verification_code ||
    ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.emptyValue
  );
}

function getOrganizationAttentionReasonBadgeToneClass(tone) {
  if (tone === "green") {
    return "bg-green-50 text-green-800 ring-green-200";
  }

  if (tone === "amber") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (tone === "red") {
    return "bg-red-50 text-red-800 ring-red-200";
  }

  if (tone === "blue") {
    return "bg-blue-50 text-blue-800 ring-blue-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function buildOrganizationAttentionReasonBadges(enrollment) {
  const badges = [];

  if (!enrollment.user_email) {
    badges.push({
      id: "no_email",
      label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.noEmail,
      tone: "slate",
    });
  }

  if (enrollment.status !== "completed") {
    badges.push({
      id: "not_completed",
      label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.notCompleted,
      tone: "blue",
    });
  }

  if (!enrollment.document) {
    badges.push({
      id: "no_document",
      label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.noDocument,
      tone: "amber",
    });

    return badges;
  }

  if (enrollment.document.status === "draft") {
    badges.push({
      id: "unpublished_document",
      label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.unpublishedDocument,
      tone: "amber",
    });
  }

  if (enrollment.document.status === "revoked") {
    badges.push({
      id: "revoked_document",
      label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.revokedDocument,
      tone: "red",
    });
  }

  if (enrollment.document.status === "available") {
    badges.push({
      id: "published_document",
      label: ORGANIZATION_ATTENTION_REASON_BADGE_LABELS.publishedDocument,
      tone: "green",
    });
  }

  return badges;
}

function formatOrganizationAttentionReasonBadgesForExport(enrollment) {
  return buildOrganizationAttentionReasonBadges(enrollment)
    .map((badge) => badge.label)
    .join("; ");
}

function enrollmentMatchesOrganizationAttentionReasonFilter(enrollment, reasonFilterId) {
  if (!reasonFilterId || reasonFilterId === "all") {
    return true;
  }

  return buildOrganizationAttentionReasonBadges(enrollment).some(
    (badge) => badge.id === reasonFilterId
  );
}

function buildOrganizationAttentionReasonFilterCounts(enrollments = []) {
  const counters = { all: enrollments.length };

  ORGANIZATION_ATTENTION_REASON_FILTERS.forEach((filter) => {
    if (filter.id === "all") {
      return;
    }

    counters[filter.id] = countWhere(enrollments, (enrollment) =>
      enrollmentMatchesOrganizationAttentionReasonFilter(enrollment, filter.id)
    );
  });

  return counters;
}

function normalizeOrganizationAttentionReasonFilterId(reasonFilterId) {
  const availableReasonFilterIds = new Set(
    ORGANIZATION_ATTENTION_REASON_FILTERS.map((filter) => filter.id)
  );

  return availableReasonFilterIds.has(reasonFilterId) ? reasonFilterId : "all";
}

function readOrganizationAttentionStoredReasonFilters() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(
      ORGANIZATION_ATTENTION_REASON_FILTER_STORAGE_KEY
    );

    if (!storedValue) {
      return {};
    }

    const parsedValue = JSON.parse(storedValue);

    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch {
    return {};
  }
}

function readOrganizationAttentionStoredReasonFilter(attentionFilterId) {
  const storedFilters = readOrganizationAttentionStoredReasonFilters();

  return normalizeOrganizationAttentionReasonFilterId(storedFilters[attentionFilterId]);
}

function saveOrganizationAttentionStoredReasonFilter(attentionFilterId, reasonFilterId) {
  if (typeof window === "undefined" || !attentionFilterId) {
    return;
  }

  try {
    const storedFilters = readOrganizationAttentionStoredReasonFilters();

    window.localStorage.setItem(
      ORGANIZATION_ATTENTION_REASON_FILTER_STORAGE_KEY,
      JSON.stringify({
        ...storedFilters,
        [attentionFilterId]: normalizeOrganizationAttentionReasonFilterId(reasonFilterId),
      })
    );
  } catch {}
}

function buildOrganizationLearningAttentionFilterCounts(enrollments = []) {
  return ORGANIZATION_LEARNING_ATTENTION_FILTERS.reduce((accumulator, filter) => {
    accumulator[filter.id] = countWhere(enrollments, filter.predicate);
    return accumulator;
  }, {});
}

function buildOrganizationLearningAttentionItems(enrollments = [], filterId) {
  const filter =
    ORGANIZATION_LEARNING_ATTENTION_FILTERS.find((item) => item.id === filterId) ||
    ORGANIZATION_LEARNING_ATTENTION_FILTERS[0];

  return enrollments
    .filter(filter.predicate)
    .sort((left, right) => {
      const groupCompare = getEnrollmentGroupLabel(left).localeCompare(
        getEnrollmentGroupLabel(right),
        "ru"
      );

      if (groupCompare !== 0) {
        return groupCompare;
      }

      return getEnrollmentLearnerLabel(left).localeCompare(
        getEnrollmentLearnerLabel(right),
        "ru"
      );
    });
}

function getOrganizationAttentionReasonEmptyStateText(selectedFilter, selectedReasonFilter) {
  if (!selectedReasonFilter || selectedReasonFilter.id === "all") {
    return ORGANIZATION_LEARNING_ATTENTION_LABELS.empty;
  }

  return `По причине «${selectedReasonFilter.label}» в списке «${selectedFilter.label}» записей нет.`;
}

function buildOrganizationLearningAttentionExportRows(enrollments = [], filter) {
  return enrollments.map((enrollment) => ({
    filter: filter?.label || "",
    learner: getEnrollmentLearnerLabel(enrollment),
    learner_email: enrollment.user_email || "",
    organization: enrollment.organization_name || "",
    group: getEnrollmentGroupLabel(enrollment),
    course: getEnrollmentCourseLabel(enrollment),
    enrollment_status: getEnrollmentStatusLabel(enrollment.status),
    document_status: getEnrollmentDocumentLabel(enrollment),
    document_number: enrollment.document?.document_number || "",
    verification_code: enrollment.document?.verification_code || "",
    public_verify_path: enrollment.document?.public_verify_path || "",
    reasons: formatOrganizationAttentionReasonBadgesForExport(enrollment),
    completed_at: formatEnrollmentDateTime(enrollment.completed_at),
  }));
}

function buildOrganizationLearningOverviewGroups(enrollments = []) {
  const groupMap = new Map();

  enrollments.forEach((enrollment) => {
    const groupKey = enrollment.learning_group_id || "__without_group__";
    const current = groupMap.get(groupKey) || {
      id: enrollment.learning_group_id || "",
      name: enrollment.learning_group_name || "Без учебной группы",
      organizationName: enrollment.organization_name || "Организация не указана",
      enrollments: [],
    };

    current.enrollments.push(enrollment);
    groupMap.set(groupKey, current);
  });

  return Array.from(groupMap.values())
    .map((group) => ({
      ...group,
      stats: buildOrganizationLearningOverviewStats(group.enrollments),
    }))
    .sort((left, right) => right.stats.totalCount - left.stats.totalCount);
}

function OrganizationLearningAttentionFiltersPanel({
  enrollments,
  selectedGroupId,
  onSelectGroup,
}) {
  const [selectedFilterId, setSelectedFilterId] = React.useState(
    ORGANIZATION_LEARNING_ATTENTION_FILTERS[0].id
  );
  const counts = buildOrganizationLearningAttentionFilterCounts(enrollments);
  const selectedFilter =
    ORGANIZATION_LEARNING_ATTENTION_FILTERS.find((filter) => filter.id === selectedFilterId) ||
    ORGANIZATION_LEARNING_ATTENTION_FILTERS[0];
  const [visibleLimit, setVisibleLimit] = React.useState(
    ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT
  );
  const [copiedActionId, setCopiedActionId] = React.useState("");
  const [selectedReasonFilterId, setSelectedReasonFilterId] = React.useState(() =>
    readOrganizationAttentionStoredReasonFilter(ORGANIZATION_LEARNING_ATTENTION_FILTERS[0].id)
  );
  const selectedItems = buildOrganizationLearningAttentionItems(enrollments, selectedFilter.id);
  const reasonFilterCounts = buildOrganizationAttentionReasonFilterCounts(selectedItems);
  const selectedReasonFilter =
    ORGANIZATION_ATTENTION_REASON_FILTERS.find(
      (filter) => filter.id === selectedReasonFilterId
    ) || ORGANIZATION_ATTENTION_REASON_FILTERS[0];
  const reasonFilteredItems = selectedItems.filter((enrollment) =>
    enrollmentMatchesOrganizationAttentionReasonFilter(enrollment, selectedReasonFilter.id)
  );

  React.useEffect(() => {
    setSelectedReasonFilterId(readOrganizationAttentionStoredReasonFilter(selectedFilter.id));
  }, [selectedFilter.id]);

  React.useEffect(() => {
    setVisibleLimit(ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT);
  }, [selectedFilterId, selectedReasonFilterId, enrollments]);

  const visibleItems = reasonFilteredItems.slice(0, visibleLimit);
  const hiddenItemsCount = Math.max(reasonFilteredItems.length - visibleItems.length, 0);
  const canShowMore = hiddenItemsCount > 0;
  const canCollapse =
    visibleLimit > ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT &&
    reasonFilteredItems.length > ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT;
  const clipboardSupported =
    typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText);

  function handleCopyOrganizationAttentionDocumentAction(actionId, value) {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue || !clipboardSupported) {
      return;
    }

    navigator.clipboard
      .writeText(normalizedValue)
      .then(() => {
        setCopiedActionId(actionId);
        setTimeout(() => {
          setCopiedActionId((currentActionId) =>
            currentActionId === actionId ? "" : currentActionId
          );
        }, 1600);
      })
      .catch(() => {});
  }

  function handleSelectOrganizationAttentionReasonFilter(reasonFilterId) {
    const normalizedReasonFilterId = normalizeOrganizationAttentionReasonFilterId(reasonFilterId);

    setSelectedReasonFilterId(normalizedReasonFilterId);
    saveOrganizationAttentionStoredReasonFilter(selectedFilter.id, normalizedReasonFilterId);
  }

  function handleResetOrganizationAttentionReasonFilter() {
    handleSelectOrganizationAttentionReasonFilter("all");
  }

  function handleResetOrganizationAttentionQuickFilter() {
    const defaultAttentionFilterId = ORGANIZATION_LEARNING_ATTENTION_FILTERS[0].id;

    setSelectedFilterId(defaultAttentionFilterId);
    setSelectedReasonFilterId(readOrganizationAttentionStoredReasonFilter(defaultAttentionFilterId));
    setVisibleLimit(ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT);
  }

  function handleExportSelectedFilter() {
    if (reasonFilteredItems.length === 0) {
      return;
    }

    downloadCsvFile(
      buildDatedCsvFilename(`organization-attention-${selectedFilter.id}`),
      ORGANIZATION_LEARNING_ATTENTION_EXPORT_COLUMNS,
      buildOrganizationLearningAttentionExportRows(reasonFilteredItems, selectedFilter)
    );
  }

  return (
    <div
      data-testid="organization-learning-attention-filters"
      data-stage={STAGE82_ORGANIZATION_LEARNING_ATTENTION_FILTERS}
      data-selected-filter={selectedFilter.id}
      data-selected-filter-count={counts[selectedFilter.id] || 0}
      data-stage-export={STAGE82_ORGANIZATION_ATTENTION_CSV_EXPORT}
      data-export-count={reasonFilteredItems.length}
      data-stage-show-more={STAGE82_ORGANIZATION_ATTENTION_SHOW_MORE}
      data-visible-count={visibleItems.length}
      data-hidden-count={hiddenItemsCount}
      data-stage-document-actions={STAGE82_ORGANIZATION_ATTENTION_DOCUMENT_ACTIONS}
      data-stage-reason-badges={STAGE82_ORGANIZATION_ATTENTION_REASON_BADGES}
      data-stage-export-reasons={STAGE82_ORGANIZATION_ATTENTION_EXPORT_REASONS}
      data-stage-reason-filters={STAGE82_ORGANIZATION_ATTENTION_REASON_FILTERS}
      data-stage-reason-filter-persistence={
        STAGE82_ORGANIZATION_ATTENTION_REASON_FILTER_PERSISTENCE
      }
      data-reason-filter-storage-key={ORGANIZATION_ATTENTION_REASON_FILTER_STORAGE_KEY}
      data-stage-active-filter-summary={
        STAGE82_ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY
      }
      data-stage-reason-empty-state={STAGE82_ORGANIZATION_ATTENTION_REASON_EMPTY_STATE}
      data-active-summary-count={reasonFilteredItems.length}
      data-selected-reason-filter={selectedReasonFilter.id}
      data-selected-reason-filter-count={reasonFilterCounts[selectedReasonFilter.id] || 0}
      className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {ORGANIZATION_LEARNING_ATTENTION_LABELS.stage}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-950">
        {ORGANIZATION_LEARNING_ATTENTION_LABELS.title}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        {ORGANIZATION_LEARNING_ATTENTION_LABELS.subtitle}
      </p>

      <div data-testid="organization-learning-attention-filter-buttons" className="mt-4 flex flex-wrap gap-2">
        {ORGANIZATION_LEARNING_ATTENTION_FILTERS.map((filter) => {
          const selected = filter.id === selectedFilter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedFilterId(filter.id)}
              data-testid="organization-learning-attention-filter-button"
              data-filter-id={filter.id}
              className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 transition ${getAttentionFilterToneClass(filter.tone, selected)}`}
            >
              {filter.label}: {counts[filter.id] || 0}
            </button>
          );
        })}
      </div>

      <div
        data-testid="organization-learning-attention-active-filter-summary"
        data-stage={STAGE82_ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY}
        data-active-quick-filter={selectedFilter.id}
        data-active-reason-filter={selectedReasonFilter.id}
        data-active-filtered-count={reasonFilteredItems.length}
        className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200"
      >
        <div className="text-xs font-bold text-slate-700">
          {ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY_LABELS.title}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span
            data-testid="organization-learning-attention-active-quick-filter"
            className="rounded-full bg-slate-50 px-3 py-1 font-semibold ring-1 ring-slate-200"
          >
            {ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY_LABELS.quickList}:{" "}
            {selectedFilter.label}
          </span>
          <span
            data-testid="organization-learning-attention-active-reason-filter"
            className="rounded-full bg-slate-50 px-3 py-1 font-semibold ring-1 ring-slate-200"
          >
            {ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY_LABELS.reason}:{" "}
            {selectedReasonFilter.label}
          </span>
          <span
            data-testid="organization-learning-attention-active-filtered-count"
            className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white"
          >
            {ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY_LABELS.found}:{" "}
            {reasonFilteredItems.length}
          </span>
          <button
            type="button"
            onClick={handleResetOrganizationAttentionReasonFilter}
            disabled={selectedReasonFilter.id === "all"}
            data-testid="organization-learning-attention-reset-reason-filter"
            className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-300"
          >
            {ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY_LABELS.resetReason}
          </button>
          <button
            type="button"
            onClick={handleResetOrganizationAttentionQuickFilter}
            disabled={selectedFilter.id === ORGANIZATION_LEARNING_ATTENTION_FILTERS[0].id}
            data-testid="organization-learning-attention-reset-quick-filter"
            className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-300"
          >
            {ORGANIZATION_ATTENTION_ACTIVE_FILTER_SUMMARY_LABELS.resetQuickList}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-950">{selectedFilter.label}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              {selectedFilter.description}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getAttentionFilterToneClass(selectedFilter.tone)}`}>
              {counts[selectedFilter.id] || 0}
            </span>
            <button
              type="button"
              onClick={handleExportSelectedFilter}
              disabled={reasonFilteredItems.length === 0}
              data-testid="organization-learning-attention-export-button"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
            >
              {reasonFilteredItems.length === 0
                ? ORGANIZATION_ATTENTION_CSV_EXPORT_LABELS.exportEmpty
                : ORGANIZATION_ATTENTION_CSV_EXPORT_LABELS.exportButton}
            </button>
          </div>
        </div>

        <div
          data-testid="organization-learning-attention-reason-filters"
          data-stage={STAGE82_ORGANIZATION_ATTENTION_REASON_FILTERS}
          className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
        >
          <div className="text-xs font-bold text-slate-700">
            {ORGANIZATION_ATTENTION_REASON_FILTER_LABELS.title}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ORGANIZATION_ATTENTION_REASON_FILTERS.map((filter) => {
              const reasonSelected = filter.id === selectedReasonFilter.id;
              const reasonCount = reasonFilterCounts[filter.id] || 0;
              const disabled = filter.id !== "all" && reasonCount === 0;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => handleSelectOrganizationAttentionReasonFilter(filter.id)}
                  disabled={disabled}
                  data-testid="organization-learning-attention-reason-filter-button"
                  data-reason-filter-id={filter.id}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    reasonSelected
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100"
                  } disabled:bg-slate-100 disabled:text-slate-300 disabled:ring-slate-100`}
                >
                  {filter.label}: {reasonCount}
                </button>
              );
            })}
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div
            data-testid="organization-learning-attention-empty"
            data-stage={STAGE82_ORGANIZATION_ATTENTION_REASON_EMPTY_STATE}
            data-empty-reason-filter={selectedReasonFilter.id}
            data-empty-quick-filter={selectedFilter.id}
            className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-100"
          >
            <div data-testid="organization-learning-attention-empty-message">
              {getOrganizationAttentionReasonEmptyStateText(selectedFilter, selectedReasonFilter)}
            </div>

            {selectedReasonFilter.id !== "all" && (
              <button
                type="button"
                onClick={handleResetOrganizationAttentionReasonFilter}
                data-testid="organization-learning-attention-empty-reset-reason"
                className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                {ORGANIZATION_ATTENTION_REASON_EMPTY_STATE_LABELS.resetReason}
              </button>
            )}
          </div>
        ) : (
          <div data-testid="organization-learning-attention-items" className="mt-4 grid gap-2">
            {visibleItems.map((enrollment) => {
              const canOpenGroup = Boolean(enrollment.learning_group_id && onSelectGroup);
              const groupSelected =
                enrollment.learning_group_id && enrollment.learning_group_id === selectedGroupId;
              const hasDocumentNumber = Boolean(enrollment.document?.document_number);
              const hasVerificationCode = Boolean(enrollment.document?.verification_code);
              const documentNumberActionId = `document-number-${enrollment.id}`;
              const verificationCodeActionId = `verification-code-${enrollment.id}`;
              const reasonBadges = buildOrganizationAttentionReasonBadges(enrollment);

              return (
                <div
                  key={enrollment.id}
                  data-testid="organization-learning-attention-item"
                  data-stage-card-details={STAGE82_ORGANIZATION_ATTENTION_CARD_DETAILS}
                  data-learning-status={enrollment.status || ""}
                  data-document-status={getEnrollmentDocumentStatus(enrollment)}
                  data-stage-document-actions={STAGE82_ORGANIZATION_ATTENTION_DOCUMENT_ACTIONS}
                  data-stage-reason-badges={STAGE82_ORGANIZATION_ATTENTION_REASON_BADGES}
                  data-reason-count={reasonBadges.length}
                  className="rounded-2xl bg-slate-50 p-3 text-xs ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">
                        {getEnrollmentLearnerLabel(enrollment)}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {getEnrollmentCourseLabel(enrollment)}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {getEnrollmentGroupLabel(enrollment)}
                      </div>
                      <div className="mt-1 font-semibold text-slate-600">
                        {getEnrollmentDocumentLabel(enrollment)}
                      </div>

                      {reasonBadges.length > 0 && (
                        <div
                          data-testid="organization-learning-attention-reason-badges"
                          data-stage={STAGE82_ORGANIZATION_ATTENTION_REASON_BADGES}
                          className="mt-3 flex flex-wrap gap-2"
                        >
                          {reasonBadges.map((badge) => (
                            <span
                              key={badge.id}
                              data-testid="organization-learning-attention-reason-badge"
                              data-reason-id={badge.id}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${getOrganizationAttentionReasonBadgeToneClass(
                                badge.tone
                              )}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}

                      <div
                        data-testid="organization-learning-attention-card-details"
                        data-stage={STAGE82_ORGANIZATION_ATTENTION_CARD_DETAILS}
                        className="mt-3 grid gap-2 sm:grid-cols-2"
                      >
                        <span className="rounded-xl bg-white px-3 py-2 font-semibold text-slate-600 ring-1 ring-slate-200">
                          {ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.status}:{" "}
                          {getEnrollmentStatusLabel(enrollment.status)}
                        </span>
                        <span className="rounded-xl bg-white px-3 py-2 font-semibold text-slate-600 ring-1 ring-slate-200">
                          {ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.email}:{" "}
                          {getOrganizationAttentionEmailLabel(enrollment)}
                        </span>
                        <span className="rounded-xl bg-white px-3 py-2 font-semibold text-slate-600 ring-1 ring-slate-200">
                          {ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.completedAt}:{" "}
                          {formatOrganizationAttentionDate(enrollment.completed_at)}
                        </span>
                        <span className="rounded-xl bg-white px-3 py-2 font-semibold text-slate-600 ring-1 ring-slate-200">
                          {ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.documentNumber}:{" "}
                          {getOrganizationAttentionDocumentNumberLabel(enrollment)}
                        </span>
                        <span className="rounded-xl bg-white px-3 py-2 font-semibold text-slate-600 ring-1 ring-slate-200 sm:col-span-2">
                          {ORGANIZATION_ATTENTION_CARD_DETAIL_LABELS.verificationCode}:{" "}
                          {getOrganizationAttentionVerificationCodeLabel(enrollment)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {hasDocumentNumber && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyOrganizationAttentionDocumentAction(
                              documentNumberActionId,
                              enrollment.document?.document_number
                            )
                          }
                          disabled={!clipboardSupported}
                          data-testid="organization-learning-attention-copy-document-number-button"
                          data-stage={STAGE82_ORGANIZATION_ATTENTION_DOCUMENT_ACTIONS}
                          className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:text-slate-300"
                        >
                          {copiedActionId === documentNumberActionId
                            ? ORGANIZATION_ATTENTION_DOCUMENT_ACTION_LABELS.copied
                            : ORGANIZATION_ATTENTION_DOCUMENT_ACTION_LABELS.copyDocumentNumber}
                        </button>
                      )}

                      {hasVerificationCode && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyOrganizationAttentionDocumentAction(
                              verificationCodeActionId,
                              enrollment.document?.verification_code
                            )
                          }
                          disabled={!clipboardSupported}
                          data-testid="organization-learning-attention-copy-verification-code-button"
                          data-stage={STAGE82_ORGANIZATION_ATTENTION_DOCUMENT_ACTIONS}
                          className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:text-slate-300"
                        >
                          {copiedActionId === verificationCodeActionId
                            ? ORGANIZATION_ATTENTION_DOCUMENT_ACTION_LABELS.copied
                            : ORGANIZATION_ATTENTION_DOCUMENT_ACTION_LABELS.copyVerificationCode}
                        </button>
                      )}

                      {enrollment.document?.public_verify_path && (
                        <a
                          href={enrollment.document.public_verify_path}
                          data-testid="organization-learning-attention-verify-link"
                          data-stage={STAGE82_ORGANIZATION_ATTENTION_DOCUMENT_ACTIONS}
                          className="rounded-full bg-green-600 px-3 py-1.5 font-semibold text-white transition hover:bg-green-700"
                        >
                          {ORGANIZATION_LEARNING_ATTENTION_LABELS.verify}
                        </a>
                      )}
                      {canOpenGroup && (
                        <button
                          type="button"
                          onClick={() => onSelectGroup(enrollment.learning_group_id)}
                          className="rounded-full bg-white px-3 py-1.5 font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                        >
                          {groupSelected ? "Группа открыта" : ORGANIZATION_LEARNING_ATTENTION_LABELS.openGroup}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reasonFilteredItems.length > ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT && (
          <div
            data-testid="organization-learning-attention-show-more"
            data-stage={STAGE82_ORGANIZATION_ATTENTION_SHOW_MORE}
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-xs ring-1 ring-slate-100"
          >
            <span
              data-testid="organization-learning-attention-visible-summary"
              className="font-semibold text-slate-500"
            >
              {ORGANIZATION_ATTENTION_SHOW_MORE_LABELS.summary}: {visibleItems.length} из{" "}
              {selectedItems.length}
            </span>

            <div className="flex flex-wrap gap-2">
              {canShowMore && (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleLimit((currentLimit) =>
                      Math.min(
                        currentLimit + ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT,
                        selectedItems.length
                      )
                    )
                  }
                  data-testid="organization-learning-attention-show-more-button"
                  className="rounded-full bg-white px-3 py-1.5 font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                >
                  {ORGANIZATION_ATTENTION_SHOW_MORE_LABELS.showMore}{" "}
                  {Math.min(ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT, hiddenItemsCount)}
                </button>
              )}

              {canShowMore && (
                <button
                  type="button"
                  onClick={() => setVisibleLimit(selectedItems.length)}
                  data-testid="organization-learning-attention-show-all-button"
                  className="rounded-full bg-slate-900 px-3 py-1.5 font-semibold text-white transition hover:bg-slate-700"
                >
                  {ORGANIZATION_ATTENTION_SHOW_MORE_LABELS.showAll}
                </button>
              )}

              {canCollapse && (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleLimit(ORGANIZATION_ATTENTION_INITIAL_VISIBLE_COUNT)
                  }
                  data-testid="organization-learning-attention-collapse-button"
                  className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  {ORGANIZATION_ATTENTION_SHOW_MORE_LABELS.collapse}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewStatCard({ label, value, hint, tone = "slate" }) {
  const toneClass =
    tone === "green"
      ? "ring-green-100 bg-green-50 text-green-800"
      : tone === "amber"
        ? "ring-amber-100 bg-amber-50 text-amber-800"
        : tone === "red"
          ? "ring-red-100 bg-red-50 text-red-800"
          : tone === "blue"
            ? "ring-blue-100 bg-blue-50 text-blue-800"
            : "ring-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs leading-5 opacity-75">{hint}</div>}
    </div>
  );
}

export function OrganizationLearningOverviewPanel({
  enrollments,
  loading,
  error,
  selectedGroupId,
  onSelectGroup,
  onRefresh,
}) {
  const safeEnrollments = Array.isArray(enrollments) ? enrollments : [];
  const [storedOverviewFilters] = React.useState(() =>
    readOrganizationOverviewStoredFilters()
  );
  const [searchQuery, setSearchQuery] = React.useState(
    storedOverviewFilters.searchQuery
  );
  const [learningStatusFilter, setLearningStatusFilter] = React.useState(
    storedOverviewFilters.learningStatusFilter
  );
  const [documentStatusFilter, setDocumentStatusFilter] = React.useState(
    storedOverviewFilters.documentStatusFilter
  );

  React.useEffect(() => {
    saveOrganizationOverviewStoredFilters({
      searchQuery,
      learningStatusFilter,
      documentStatusFilter,
    });
  }, [searchQuery, learningStatusFilter, documentStatusFilter]);

  const activeOverviewFilterLabels = [
    searchQuery.trim()
      ? `${ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS.searchFilter}: ${searchQuery.trim()}`
      : "",
    learningStatusFilter !== "all"
      ? `${ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS.learningFilter}: ${getOrganizationOverviewFilterOptionLabel(
          ORGANIZATION_OVERVIEW_LEARNING_STATUS_FILTERS,
          learningStatusFilter
        )}`
      : "",
    documentStatusFilter !== "all"
      ? `${ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS.documentFilter}: ${getOrganizationOverviewFilterOptionLabel(
          ORGANIZATION_OVERVIEW_DOCUMENT_STATUS_FILTERS,
          documentStatusFilter
        )}`
      : "",
  ].filter(Boolean);

  const filteredEnrollments = React.useMemo(
    () =>
      filterOrganizationLearningOverviewEnrollments(safeEnrollments, {
        searchQuery,
        learningStatusFilter,
        documentStatusFilter,
      }),
    [safeEnrollments, searchQuery, learningStatusFilter, documentStatusFilter]
  );
  const hasOverviewFilters =
    searchQuery.trim() ||
    learningStatusFilter !== "all" ||
    documentStatusFilter !== "all";
  const stats = buildOrganizationLearningOverviewStats(filteredEnrollments);
  const groups = buildOrganizationLearningOverviewGroups(filteredEnrollments).slice(0, 6);

  return (
    <section
      data-testid="organization-learning-overview"
      data-stage={STAGE82_ORGANIZATION_LEARNING_OVERVIEW}
      data-total-enrollments={stats.totalCount}
      data-completed-enrollments={stats.completedCount}
      data-document-drafts={stats.documentDraftCount}
      data-document-available={stats.documentAvailableCount}
      data-stage-search={STAGE82_ORGANIZATION_OVERVIEW_SEARCH_FILTERS}
      data-filtered-enrollments={filteredEnrollments.length}
      data-stage-filter-persistence={STAGE82_ORGANIZATION_OVERVIEW_FILTER_PERSISTENCE}
      data-active-filter-count={activeOverviewFilterLabels.length}
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {ORGANIZATION_LEARNING_OVERVIEW_LABELS.stage}
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {ORGANIZATION_LEARNING_OVERVIEW_LABELS.title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {ORGANIZATION_LEARNING_OVERVIEW_LABELS.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
        >
          {loading ? "Обновляем..." : ORGANIZATION_LEARNING_OVERVIEW_LABELS.refresh}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {error || ORGANIZATION_LEARNING_OVERVIEW_LABELS.errorFallback}
        </div>
      )}

      <div
        data-testid="organization-learning-overview-search-filters"
        data-stage={STAGE82_ORGANIZATION_OVERVIEW_SEARCH_FILTERS}
        className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Поиск
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS.searchPlaceholder}
              data-testid="organization-learning-overview-search-input"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 pr-32 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              disabled={!searchQuery.trim()}
              data-testid="organization-learning-overview-clear-search"
              data-stage={STAGE82_ORGANIZATION_OVERVIEW_FILTER_PERSISTENCE}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 disabled:text-slate-300"
            >
              {ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS.clearSearch}
            </button>
          </div>
        </label>

        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Обучение
          <select
            value={learningStatusFilter}
            onChange={(event) => setLearningStatusFilter(event.target.value)}
            data-testid="organization-learning-overview-learning-filter"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {ORGANIZATION_OVERVIEW_LEARNING_STATUS_FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Документы
          <select
            value={documentStatusFilter}
            onChange={(event) => setDocumentStatusFilter(event.target.value)}
            data-testid="organization-learning-overview-document-filter"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {ORGANIZATION_OVERVIEW_DOCUMENT_STATUS_FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setLearningStatusFilter("all");
              setDocumentStatusFilter("all");
            }}
            disabled={!hasOverviewFilters}
            data-testid="organization-learning-overview-filter-reset"
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:text-slate-300"
          >
            {ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS.reset}
          </button>
          <div
            data-testid="organization-learning-overview-filter-summary"
            className="text-xs font-semibold text-slate-500"
          >
            Показано: {filteredEnrollments.length} из {safeEnrollments.length}
          </div>
        </div>

        {activeOverviewFilterLabels.length > 0 && (
          <div
            data-testid="organization-learning-overview-active-filter-chips"
            data-stage={STAGE82_ORGANIZATION_OVERVIEW_FILTER_PERSISTENCE}
            className="lg:col-span-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3"
          >
            <span className="text-xs font-semibold text-slate-500">
              {ORGANIZATION_OVERVIEW_SEARCH_FILTER_LABELS.activeFilters}:
            </span>
            {activeOverviewFilterLabels.map((filterLabel) => (
              <span
                key={filterLabel}
                data-testid="organization-learning-overview-active-filter-chip"
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
              >
                {filterLabel}
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        data-testid="organization-learning-overview-summary"
        className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <OverviewStatCard
          label="Всего назначений"
          value={stats.totalCount}
          hint="По всем доступным организациям"
        />
        <OverviewStatCard
          label="В процессе"
          value={stats.inProgressCount}
          hint={`${stats.assignedCount} ещё назначено`}
          tone="blue"
        />
        <OverviewStatCard
          label="Завершено"
          value={stats.completedCount}
          hint={`${stats.completedWithoutDocumentCount} без документа`}
          tone="green"
        />
        <OverviewStatCard
          label="Документы"
          value={stats.documentAvailableCount}
          hint={`${stats.documentDraftCount} черновиков / ${stats.documentRevokedCount} отозвано`}
          tone={stats.documentDraftCount > 0 ? "amber" : "slate"}
        />
      </div>

      <OrganizationLearningAttentionFiltersPanel
        enrollments={filteredEnrollments}
        selectedGroupId={selectedGroupId}
        onSelectGroup={onSelectGroup}
      />

      {loading && safeEnrollments.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
          Загружаем общую сводку...
        </div>
      ) : groups.length === 0 ? (
        <div
          data-testid="organization-learning-overview-empty"
          className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100"
        >
          {ORGANIZATION_LEARNING_OVERVIEW_LABELS.empty}
        </div>
      ) : (
        <div data-testid="organization-learning-overview-groups" className="mt-5 grid gap-3">
          {groups.map((group) => {
            const selected = group.id && group.id === selectedGroupId;
            const canOpenGroup = Boolean(group.id && onSelectGroup);

            return (
              <div
                key={group.id || group.name}
                data-testid="organization-learning-overview-group"
                className={`rounded-2xl p-4 ring-1 ${
                  selected ? "bg-blue-50 ring-blue-200" : "bg-slate-50 ring-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{group.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{group.organizationName}</div>
                  </div>
                  {canOpenGroup && (
                    <button
                      type="button"
                      onClick={() => onSelectGroup(group.id)}
                      className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                    >
                      {selected ? "Открыта" : "Открыть группу"}
                    </button>
                  )}
                </div>

                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                  <span className="rounded-full bg-white px-3 py-2 font-semibold text-slate-700 ring-1 ring-slate-200">
                    Всего: {group.stats.totalCount}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-2 font-semibold text-blue-700 ring-1 ring-blue-100">
                    В процессе: {group.stats.inProgressCount}
                  </span>
                  <span className="rounded-full bg-green-50 px-3 py-2 font-semibold text-green-700 ring-1 ring-green-100">
                    Завершено: {group.stats.completedCount}
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-2 font-semibold text-amber-700 ring-1 ring-amber-100">
                    Черновики PDF: {group.stats.documentDraftCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

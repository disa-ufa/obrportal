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
  const selectedItems = buildOrganizationLearningAttentionItems(enrollments, selectedFilter.id);
  const visibleItems = selectedItems.slice(0, 8);

  function handleExportSelectedFilter() {
    if (selectedItems.length === 0) {
      return;
    }

    downloadCsvFile(
      buildDatedCsvFilename(`organization-attention-${selectedFilter.id}`),
      ORGANIZATION_LEARNING_ATTENTION_EXPORT_COLUMNS,
      buildOrganizationLearningAttentionExportRows(selectedItems, selectedFilter)
    );
  }

  return (
    <div
      data-testid="organization-learning-attention-filters"
      data-stage={STAGE82_ORGANIZATION_LEARNING_ATTENTION_FILTERS}
      data-selected-filter={selectedFilter.id}
      data-selected-filter-count={counts[selectedFilter.id] || 0}
      data-stage-export={STAGE82_ORGANIZATION_ATTENTION_CSV_EXPORT}
      data-export-count={selectedItems.length}
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
              disabled={selectedItems.length === 0}
              data-testid="organization-learning-attention-export-button"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
            >
              {selectedItems.length === 0
                ? ORGANIZATION_ATTENTION_CSV_EXPORT_LABELS.exportEmpty
                : ORGANIZATION_ATTENTION_CSV_EXPORT_LABELS.exportButton}
            </button>
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div
            data-testid="organization-learning-attention-empty"
            className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-100"
          >
            {ORGANIZATION_LEARNING_ATTENTION_LABELS.empty}
          </div>
        ) : (
          <div data-testid="organization-learning-attention-items" className="mt-4 grid gap-2">
            {visibleItems.map((enrollment) => {
              const canOpenGroup = Boolean(enrollment.learning_group_id && onSelectGroup);
              const groupSelected =
                enrollment.learning_group_id && enrollment.learning_group_id === selectedGroupId;

              return (
                <div
                  key={enrollment.id}
                  data-testid="organization-learning-attention-item"
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
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {enrollment.document?.public_verify_path && (
                        <a
                          href={enrollment.document.public_verify_path}
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
  const stats = buildOrganizationLearningOverviewStats(safeEnrollments);
  const groups = buildOrganizationLearningOverviewGroups(safeEnrollments).slice(0, 6);

  return (
    <section
      data-testid="organization-learning-overview"
      data-stage={STAGE82_ORGANIZATION_LEARNING_OVERVIEW}
      data-total-enrollments={stats.totalCount}
      data-completed-enrollments={stats.completedCount}
      data-document-drafts={stats.documentDraftCount}
      data-document-available={stats.documentAvailableCount}
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
        enrollments={safeEnrollments}
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

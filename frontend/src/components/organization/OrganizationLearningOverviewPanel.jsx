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

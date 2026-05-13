export function OrganizationGroupEnrollmentsHeader({
  groupEnrollmentsLoading,
  visibleGroupEnrollments,
  groupEnrollments,
  setGroupEnrollmentsRefreshKey,
}) {
  const refreshButtonLabel = groupEnrollmentsLoading ? "Обновляем..." : "Обновить";
  const counterLabel = `${visibleGroupEnrollments.length} / ${groupEnrollments.length}`;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-sm font-bold text-slate-950">Назначения группы</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">
          Курсы, уже назначенные участникам выбранной учебной группы.
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setGroupEnrollmentsRefreshKey((current) => current + 1)}
          disabled={groupEnrollmentsLoading}
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {refreshButtonLabel}
        </button>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
          {counterLabel}
        </span>
      </div>
    </div>
  );
}

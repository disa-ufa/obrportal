import {
  formatDate,
  formatEnrollmentStatus,
} from "../../utils/organizationCabinet";

export function OrganizationGroupEnrollmentsSection({
  groupEnrollmentsLoading,
  groupEnrollmentsError,
  groupEnrollmentDeleteMessage,
  groupEnrollmentSearchQuery,
  setGroupEnrollmentSearchQuery,
  groupEnrollmentStatusFilter,
  setGroupEnrollmentStatusFilter,
  groupEnrollmentFiltersActive,
  setGroupEnrollmentsRefreshKey,
  groupEnrollments,
  visibleGroupEnrollments,
  deletingGroupEnrollmentId,
  handleDeleteGroupEnrollment,
}) {
  return (
    <>
      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
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
              {groupEnrollmentsLoading ? "Обновляем..." : "Обновить"}
            </button>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
              {visibleGroupEnrollments.length} / {groupEnrollments.length}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input
            value={groupEnrollmentSearchQuery}
            onChange={(event) => setGroupEnrollmentSearchQuery(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            placeholder="Поиск по курсу, участнику или email"
          />
          <select
            value={groupEnrollmentStatusFilter}
            onChange={(event) => setGroupEnrollmentStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          >
            <option value="">Все статусы</option>
            <option value="assigned">Назначен</option>
            <option value="in_progress">В процессе</option>
            <option value="completed">Завершён</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setGroupEnrollmentSearchQuery("");
              setGroupEnrollmentStatusFilter("");
            }}
            disabled={!groupEnrollmentFiltersActive}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
          >
            Сбросить
          </button>
        </div>

        {groupEnrollmentDeleteMessage && (
          <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200">
            {groupEnrollmentDeleteMessage}
          </div>
        )}

        {groupEnrollmentsError && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
            {groupEnrollmentsError}
          </div>
        )}

        {groupEnrollmentsLoading ? (
          <div className="mt-3 text-sm text-slate-500">Загружаем назначения...</div>
        ) : groupEnrollments.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
            У выбранной группы пока нет назначенных курсов.
          </div>
        ) : visibleGroupEnrollments.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
            По заданным фильтрам назначений не найдено.
          </div>
        ) : (
          <div className="mt-3 grid gap-2">
            {visibleGroupEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200"
              >
                <div className="font-semibold text-slate-950">
                  {enrollment.course_title || enrollment.course_slug || enrollment.course_id}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Участник: {enrollment.user_full_name || enrollment.user_email || enrollment.user_id}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Статус: {formatEnrollmentStatus(enrollment.status)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Создано: {formatDate(enrollment.created_at)}
                </div>
                {enrollment.status === "assigned" && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGroupEnrollment(enrollment)}
                    disabled={deletingGroupEnrollmentId === enrollment.id}
                    className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {deletingGroupEnrollmentId === enrollment.id ? "Снимаем..." : "Снять назначение"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

import { shortId } from "../../utils/organizationCabinet";

export function OrganizationGroupCourseAssignmentForm({
  handleCreateGroupEnrollments,
  courseSearchQuery,
  handleCourseSearchQueryChange,
  handleSearchCourseCandidates,
  courseSearchLoading,
  courseSearchResults,
  handleSelectCourse,
  groupEnrollmentForm,
  handleGroupEnrollmentFormChange,
  assigningGroupCourse,
  groupEnrollmentError,
  groupEnrollmentResult,
}) {
  return (
    <form
        onSubmit={handleCreateGroupEnrollments}
        className="mt-4 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"
      >
        <div className="text-sm font-bold text-slate-950">Назначить курс группе</div>
        <div className="mt-1 text-xs leading-5 text-slate-600">
          Курс будет назначен всем активным участникам выбранной группы. Уже существующие назначения будут пропущены.
        </div>

        <div className="mt-3 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={courseSearchQuery}
              onChange={handleCourseSearchQueryChange}
              className="min-w-0 flex-1 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Название, код или описание курса"
            />
            <button
              type="button"
              onClick={handleSearchCourseCandidates}
              disabled={courseSearchLoading}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
            >
              {courseSearchLoading ? "Ищем..." : "Найти курс"}
            </button>
          </div>

          {courseSearchResults.length > 0 && (
            <div className="grid gap-2">
              {courseSearchResults.map((course) => {
                const active = groupEnrollmentForm.course_id === course.id;

                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => handleSelectCourse(course)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm ring-1 transition ${
                      active
                        ? "bg-blue-100 text-blue-950 ring-blue-300"
                        : "bg-white text-slate-700 ring-blue-100 hover:bg-blue-50"
                    }`}
                  >
                    <span className="block font-semibold">
                      {course.title || course.slug || course.id}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {course.slug || shortId(course.id)}
                      {course.hours ? ` · ${course.hours} ч.` : ""}
                      {course.format ? ` · ${course.format}` : ""}
                      {course.document_type ? ` · ${course.document_type}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {groupEnrollmentForm.course_id && (
            <div className="rounded-2xl bg-white px-4 py-3 text-xs text-blue-900 ring-1 ring-blue-100">
              Выбранный курс:{" "}
              <span className="font-semibold">
                {courseSearchQuery || shortId(groupEnrollmentForm.course_id)}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              name="status"
              value={groupEnrollmentForm.status}
              onChange={handleGroupEnrollmentFormChange}
              className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="assigned">Назначен</option>
              <option value="in_progress">В процессе</option>
              <option value="completed">Завершён</option>
            </select>

            <button
              type="submit"
              disabled={assigningGroupCourse || !groupEnrollmentForm.course_id}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {assigningGroupCourse ? "Назначаем..." : "Назначить"}
            </button>
          </div>
        </div>

        {groupEnrollmentError && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
            {groupEnrollmentError}
          </div>
        )}

        {groupEnrollmentResult && (
          <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-blue-100">
            <div className="font-semibold text-slate-950">Результат назначения</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Создано:</span>{" "}
                <span className="font-semibold text-slate-950">
                  {groupEnrollmentResult.created_count}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Пропущено:</span>{" "}
                <span className="font-semibold text-slate-950">
                  {groupEnrollmentResult.skipped_count}
                </span>
              </div>
            </div>

            {Array.isArray(groupEnrollmentResult.skipped) &&
              groupEnrollmentResult.skipped.length > 0 && (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Пропущенные участники
                  </div>
                  <div className="mt-2 grid gap-2">
                    {groupEnrollmentResult.skipped.slice(0, 5).map((item) => (
                      <div key={item.user_id} className="text-xs text-slate-600">
                        {item.user_full_name || item.user_email || item.user_id} — уже назначен
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
    </form>
  );
}

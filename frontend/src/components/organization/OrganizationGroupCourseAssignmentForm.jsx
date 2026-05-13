import { OrganizationGroupCourseAssignmentResult } from "./OrganizationGroupCourseAssignmentResult";
import { OrganizationGroupCoursePicker } from "./OrganizationGroupCoursePicker";

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
  const canAssignCourse = Boolean(groupEnrollmentForm.course_id) && !assigningGroupCourse;

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
        <OrganizationGroupCoursePicker
          courseSearchQuery={courseSearchQuery}
          handleCourseSearchQueryChange={handleCourseSearchQueryChange}
          handleSearchCourseCandidates={handleSearchCourseCandidates}
          courseSearchLoading={courseSearchLoading}
          courseSearchResults={courseSearchResults}
          handleSelectCourse={handleSelectCourse}
          groupEnrollmentForm={groupEnrollmentForm}
        />

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
            disabled={!canAssignCourse}
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
        <OrganizationGroupCourseAssignmentResult
          groupEnrollmentResult={groupEnrollmentResult}
        />
      )}
    </form>
  );
}

import { shortId } from "../../utils/organizationCabinet";
import { OrganizationGroupCourseOption } from "./OrganizationGroupCourseOption";

export function OrganizationGroupCoursePicker({
  courseSearchQuery,
  handleCourseSearchQueryChange,
  handleSearchCourseCandidates,
  courseSearchLoading,
  courseSearchResults,
  handleSelectCourse,
  groupEnrollmentForm,
}) {
  const selectedCourseId = groupEnrollmentForm.course_id;
  const selectedCourseLabel = courseSearchQuery || shortId(selectedCourseId);
  const hasCourseSearchResults = courseSearchResults.length > 0;

  return (
    <>
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

      {hasCourseSearchResults && (
        <div className="grid gap-2">
          {courseSearchResults.map((course) => (
            <OrganizationGroupCourseOption
              key={course.id}
              course={course}
              active={selectedCourseId === course.id}
              onSelect={handleSelectCourse}
            />
          ))}
        </div>
      )}

      {selectedCourseId && (
        <div className="rounded-2xl bg-white px-4 py-3 text-xs text-blue-900 ring-1 ring-blue-100">
          Выбранный курс:{" "}
          <span className="font-semibold">
            {selectedCourseLabel}
          </span>
        </div>
      )}
    </>
  );
}

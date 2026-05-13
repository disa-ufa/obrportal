import { OrganizationGroupCourseAssignmentResult } from "./OrganizationGroupCourseAssignmentResult";
import { OrganizationGroupCourseAssignmentError } from "./OrganizationGroupCourseAssignmentError";
import { OrganizationGroupCourseAssignmentActions } from "./OrganizationGroupCourseAssignmentActions";
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

        <OrganizationGroupCourseAssignmentActions
          groupEnrollmentForm={groupEnrollmentForm}
          handleGroupEnrollmentFormChange={handleGroupEnrollmentFormChange}
          assigningGroupCourse={assigningGroupCourse}
          canAssignCourse={canAssignCourse}
        />
      </div>

      <OrganizationGroupCourseAssignmentError
        groupEnrollmentError={groupEnrollmentError}
      />

      {groupEnrollmentResult && (
        <OrganizationGroupCourseAssignmentResult
          groupEnrollmentResult={groupEnrollmentResult}
        />
      )}
    </form>
  );
}

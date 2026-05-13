import { LearningGroupEditForm } from "./OrganizationCabinetForms";
import { OrganizationGroupCourseAssignmentForm } from "./OrganizationGroupCourseAssignmentForm";
import { OrganizationGroupEnrollmentsSection } from "./OrganizationGroupEnrollmentsSection";

export function OrganizationSelectedGroupContent({
  selectedGroup,
  handleSaveGroup,
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
      <LearningGroupEditForm
        group={selectedGroup}
        onSave={handleSaveGroup}
      />

      <OrganizationGroupCourseAssignmentForm
        handleCreateGroupEnrollments={handleCreateGroupEnrollments}
        courseSearchQuery={courseSearchQuery}
        handleCourseSearchQueryChange={handleCourseSearchQueryChange}
        handleSearchCourseCandidates={handleSearchCourseCandidates}
        courseSearchLoading={courseSearchLoading}
        courseSearchResults={courseSearchResults}
        handleSelectCourse={handleSelectCourse}
        groupEnrollmentForm={groupEnrollmentForm}
        handleGroupEnrollmentFormChange={handleGroupEnrollmentFormChange}
        assigningGroupCourse={assigningGroupCourse}
        groupEnrollmentError={groupEnrollmentError}
        groupEnrollmentResult={groupEnrollmentResult}
      />

      <OrganizationGroupEnrollmentsSection
        groupEnrollmentsLoading={groupEnrollmentsLoading}
        groupEnrollmentsError={groupEnrollmentsError}
        groupEnrollmentDeleteMessage={groupEnrollmentDeleteMessage}
        groupEnrollmentSearchQuery={groupEnrollmentSearchQuery}
        setGroupEnrollmentSearchQuery={setGroupEnrollmentSearchQuery}
        groupEnrollmentStatusFilter={groupEnrollmentStatusFilter}
        setGroupEnrollmentStatusFilter={setGroupEnrollmentStatusFilter}
        groupEnrollmentFiltersActive={groupEnrollmentFiltersActive}
        setGroupEnrollmentsRefreshKey={setGroupEnrollmentsRefreshKey}
        groupEnrollments={groupEnrollments}
        visibleGroupEnrollments={visibleGroupEnrollments}
        deletingGroupEnrollmentId={deletingGroupEnrollmentId}
        handleDeleteGroupEnrollment={handleDeleteGroupEnrollment}
      />
    </>
  );
}

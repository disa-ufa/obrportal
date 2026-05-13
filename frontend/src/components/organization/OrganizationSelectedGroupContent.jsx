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
  const groupEditProps = {
    group: selectedGroup,
    onSave: handleSaveGroup,
  };

  const courseAssignmentProps = {
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
  };

  const groupEnrollmentsProps = {
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
  };

  return (
    <>
      <LearningGroupEditForm {...groupEditProps} />

      <OrganizationGroupCourseAssignmentForm {...courseAssignmentProps} />

      <OrganizationGroupEnrollmentsSection {...groupEnrollmentsProps} />
    </>
  );
}

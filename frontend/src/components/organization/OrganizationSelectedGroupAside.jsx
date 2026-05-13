import { OrganizationSelectedGroupPanelHeader } from "./OrganizationCabinetForms";
import { OrganizationSelectedGroupContent } from "./OrganizationSelectedGroupContent";
import { OrganizationGroupMembersSection } from "./OrganizationGroupMembersSection";

export function OrganizationSelectedGroupAside({
  selectedGroup,
  organizations,
  deletingGroupId,
  groupDeleteError,
  groupDeleteMessage,
  handleDeleteGroup,
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
  membersLoading,
  membersError,
  memberSearchQuery,
  setMemberSearchQuery,
  memberSearchLoading,
  handleSearchMemberCandidates,
  memberSearchResults,
  memberUserId,
  setMemberUserId,
  addingMember,
  handleAddMember,
  memberActionError,
  memberActionMessage,
  members,
  deletingMemberId,
  handleDeleteMember,
}) {
  const hasSelectedGroup = Boolean(selectedGroup);

  const panelHeaderProps = {
    selectedGroup,
    organizations,
    deletingGroupId,
    groupDeleteError,
    groupDeleteMessage,
    onDeleteGroup: handleDeleteGroup,
  };

  const selectedGroupContentProps = {
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
  };

  const groupMembersSectionProps = {
    selectedGroup,
    membersLoading,
    membersError,
    memberSearchQuery,
    setMemberSearchQuery,
    memberSearchLoading,
    handleSearchMemberCandidates,
    memberSearchResults,
    memberUserId,
    setMemberUserId,
    addingMember,
    handleAddMember,
    memberActionError,
    memberActionMessage,
    members,
    deletingMemberId,
    handleDeleteMember,
  };

  return (
    <aside className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <OrganizationSelectedGroupPanelHeader {...panelHeaderProps} />

      {hasSelectedGroup && (
        <OrganizationSelectedGroupContent {...selectedGroupContentProps} />
      )}

      <OrganizationGroupMembersSection {...groupMembersSectionProps} />
    </aside>
  );
}

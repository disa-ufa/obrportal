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

  return (
    <aside className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <OrganizationSelectedGroupPanelHeader
        selectedGroup={selectedGroup}
        organizations={organizations}
        deletingGroupId={deletingGroupId}
        groupDeleteError={groupDeleteError}
        groupDeleteMessage={groupDeleteMessage}
        onDeleteGroup={handleDeleteGroup}
      />

      {hasSelectedGroup && (
        <OrganizationSelectedGroupContent
          selectedGroup={selectedGroup}
          handleSaveGroup={handleSaveGroup}
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
      )}

      <OrganizationGroupMembersSection
        selectedGroup={selectedGroup}
        membersLoading={membersLoading}
        membersError={membersError}
        memberSearchQuery={memberSearchQuery}
        setMemberSearchQuery={setMemberSearchQuery}
        memberSearchLoading={memberSearchLoading}
        handleSearchMemberCandidates={handleSearchMemberCandidates}
        memberSearchResults={memberSearchResults}
        memberUserId={memberUserId}
        setMemberUserId={setMemberUserId}
        addingMember={addingMember}
        handleAddMember={handleAddMember}
        memberActionError={memberActionError}
        memberActionMessage={memberActionMessage}
        members={members}
        deletingMemberId={deletingMemberId}
        handleDeleteMember={handleDeleteMember}
      />
    </aside>
  );
}

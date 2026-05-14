export function buildHeroSectionProps({ heroUserLabel, onPageChange, onLogout }) {
  return {
    heroUserLabel,
    onPageChange,
    onLogout,
  };
}

export function buildCabinetStatsProps({
  summary,
  organizations,
  groups,
  activeGroupsCount,
  inactiveGroupsCount,
  selectedGroup,
  selectedGroupId,
  members,
}) {
  return {
    summary,
    organizations,
    groups,
    activeGroupsCount,
    inactiveGroupsCount,
    selectedGroup,
    selectedGroupId,
    members,
  };
}

export function buildOrganizationProfileSectionProps({
  organizations,
  onSaveOrganization,
}) {
  return {
    organizations,
    onSaveOrganization,
  };
}

export function buildOrganizationUsersSectionProps({
  organizations,
  organizationUsers,
  organizationUsersQuery,
  organizationUsersLoading,
  organizationUsersError,
  organizationUsersMessage,
  addingOrganizationUserId,
  selectedGroupId,
  onSearchOrganizationUsers,
  onAddOrganizationUserToSelectedGroup,
  setOrganizationUsersQuery,
  setOrganizationUsers,
  setOrganizationUsersError,
}) {
  return {
    organizations,
    organizationUsers,
    organizationUsersQuery,
    organizationUsersLoading,
    organizationUsersError,
    organizationUsersMessage,
    addingOrganizationUserId,
    selectedGroupId,
    onSearchOrganizationUsers,
    onAddOrganizationUserToSelectedGroup,
    setOrganizationUsersQuery,
    setOrganizationUsers,
    setOrganizationUsersError,
  };
}

export function buildGroupCreateSectionProps({
  organizations,
  groupForm,
  creatingGroup,
  groupActionError,
  groupActionMessage,
  onCreateGroup,
  onGroupFormChange,
}) {
  return {
    organizations,
    groupForm,
    creatingGroup,
    groupActionError,
    groupActionMessage,
    onCreateGroup,
    onGroupFormChange,
  };
}

export function buildGroupListProps({
  groups,
  selectedGroupId,
  onSelectGroup,
}) {
  return {
    groups,
    selectedGroupId,
    onSelectGroup,
  };
}

export function buildGroupsWorkspaceProps({
  loading,
  hasGroups,
  groupListProps,
  selectedGroupAsideProps,
}) {
  return {
    loading,
    hasGroups,
    groupListProps,
    selectedGroupAsideProps,
  };
}

export function buildSelectedGroupAsideSectionProps({
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
  return {
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
  };
}

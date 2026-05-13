import { OrganizationGroupMemberAddForm } from "./OrganizationGroupMemberAddForm";
import { OrganizationGroupMembersList } from "./OrganizationGroupMembersList";

export function OrganizationGroupMembersSection({
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
}) {
  const hasSelectedGroup = Boolean(selectedGroup);

  const memberAddFormProps = {
    handleAddMember,
    memberSearchQuery,
    setMemberSearchQuery,
    memberSearchLoading,
    handleSearchMemberCandidates,
    memberSearchResults,
    memberUserId,
    setMemberUserId,
    addingMember,
    memberActionError,
    memberActionMessage,
  };

  const membersListProps = {
    membersLoading,
    membersError,
    members,
    deletingMemberId,
    handleDeleteMember,
  };

  return (
    <>
      {hasSelectedGroup && (
        <OrganizationGroupMemberAddForm {...memberAddFormProps} />
      )}

      <OrganizationGroupMembersList {...membersListProps} />
    </>
  );
}

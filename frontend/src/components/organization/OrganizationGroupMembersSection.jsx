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
  return (
    <>
      {selectedGroup && (
        <OrganizationGroupMemberAddForm
          handleAddMember={handleAddMember}
          memberSearchQuery={memberSearchQuery}
          setMemberSearchQuery={setMemberSearchQuery}
          memberSearchLoading={memberSearchLoading}
          handleSearchMemberCandidates={handleSearchMemberCandidates}
          memberSearchResults={memberSearchResults}
          memberUserId={memberUserId}
          setMemberUserId={setMemberUserId}
          addingMember={addingMember}
          memberActionError={memberActionError}
          memberActionMessage={memberActionMessage}
        />
      )}

      <OrganizationGroupMembersList
        membersLoading={membersLoading}
        membersError={membersError}
        members={members}
        deletingMemberId={deletingMemberId}
        handleDeleteMember={handleDeleteMember}
      />
    </>
  );
}

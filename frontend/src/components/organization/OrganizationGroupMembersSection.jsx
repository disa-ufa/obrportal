import { OrganizationGroupMemberAddForm } from "./OrganizationGroupMemberAddForm";
import { OrganizationGroupMemberCard } from "./OrganizationGroupMemberCard";

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

      {membersError && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {membersError}
        </div>
      )}

      {membersLoading ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Загружаем участников...
        </div>
      ) : members.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          В выбранной группе пока нет участников.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {members.map((member) => (
            <OrganizationGroupMemberCard
              key={member.id}
              member={member}
              deletingMemberId={deletingMemberId}
              handleDeleteMember={handleDeleteMember}
            />
          ))}
        </div>
      )}
    </>
  );
}

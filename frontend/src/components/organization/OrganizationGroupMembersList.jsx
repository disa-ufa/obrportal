import { OrganizationGroupMemberCard } from "./OrganizationGroupMemberCard";

export function OrganizationGroupMembersList({
  membersLoading,
  membersError,
  members,
  deletingMemberId,
  handleDeleteMember,
}) {
  const hasMembers = members.length > 0;
  const memberCardProps = {
    deletingMemberId,
    handleDeleteMember,
  };

  return (
    <>
      {membersError && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {membersError}
        </div>
      )}

      {membersLoading ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Загружаем участников...
        </div>
      ) : !hasMembers ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          В выбранной группе пока нет участников.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {members.map((member) => (
            <OrganizationGroupMemberCard
              key={member.id}
              member={member}
              {...memberCardProps}
            />
          ))}
        </div>
      )}
    </>
  );
}

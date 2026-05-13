import {
  formatDate,
  formatUserOrganizations,
  formatUserRoles,
} from "../../utils/organizationCabinet";
import { OrganizationGroupMemberAddForm } from "./OrganizationGroupMemberAddForm";

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
            <div
              key={member.id}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div className="font-semibold text-slate-950">
                {member.user_full_name || member.user_email || member.user_id}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {member.user_email || "Email не указан"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Добавлен: {formatDate(member.created_at)}
              </div>
              {formatUserOrganizations(member.user_organizations) && (
                <div className="mt-2 text-xs text-slate-500">
                  Организация: {formatUserOrganizations(member.user_organizations)}
                </div>
              )}
              {formatUserRoles(member.user_roles) && (
                <div className="mt-1 text-xs text-slate-500">
                  Роли: {formatUserRoles(member.user_roles)}
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDeleteMember(member)}
                disabled={deletingMemberId === member.id}
                className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {deletingMemberId === member.id ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

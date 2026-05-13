import {
  formatDate,
  formatUserOrganizations,
  formatUserRoles,
} from "../../utils/organizationCabinet";

export function OrganizationGroupMemberCard({
  member,
  deletingMemberId,
  handleDeleteMember,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
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
  );
}

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
  const memberTitle = member.user_full_name || member.user_email || member.user_id;
  const memberEmail = member.user_email || "Email не указан";
  const createdAtLabel = formatDate(member.created_at);
  const organizationLabel = formatUserOrganizations(member.user_organizations);
  const roleLabel = formatUserRoles(member.user_roles);
  const isDeleting = deletingMemberId === member.id;
  const deleteButtonLabel = isDeleting ? "Удаляем..." : "Удалить";

  function handleDeleteClick() {
    handleDeleteMember(member);
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="font-semibold text-slate-950">
        {memberTitle}
      </div>
      <div className="mt-1 text-sm text-slate-500">
        {memberEmail}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        Добавлен: {createdAtLabel}
      </div>
      {organizationLabel && (
        <div className="mt-2 text-xs text-slate-500">
          Организация: {organizationLabel}
        </div>
      )}
      {roleLabel && (
        <div className="mt-1 text-xs text-slate-500">
          Роли: {roleLabel}
        </div>
      )}
      <button
        type="button"
        onClick={handleDeleteClick}
        disabled={isDeleting}
        className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-400"
      >
        {deleteButtonLabel}
      </button>
    </div>
  );
}

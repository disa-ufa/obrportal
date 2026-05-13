import {
  formatUserOrganizations,
  formatUserRoles,
} from "../../utils/organizationCabinet";

export function OrganizationGroupMemberCandidateCard({
  candidate,
  active,
  setMemberUserId,
}) {
  const organizationLabel = formatUserOrganizations(
    candidate.organizations,
    candidate.organization_ids,
  );
  const roleLabel = formatUserRoles(candidate.roles);

  return (
    <button
      type="button"
      onClick={() => setMemberUserId(candidate.id)}
      className={`rounded-2xl px-4 py-3 text-left text-sm ring-1 transition ${
        active
          ? "bg-blue-50 text-blue-900 ring-blue-200"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className="block font-semibold">
        {candidate.full_name || candidate.email}
      </span>
      <span className="mt-1 block text-xs text-slate-500">
        {candidate.email}
      </span>
      {organizationLabel && (
        <span className="mt-2 block text-xs text-slate-500">
          Организация: {organizationLabel}
        </span>
      )}
      {roleLabel && (
        <span className="mt-1 block text-xs text-slate-500">
          Роли: {roleLabel}
        </span>
      )}
    </button>
  );
}

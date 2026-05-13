import { OrganizationGroupMemberCandidateCard } from "./OrganizationGroupMemberCandidateCard";


export function OrganizationGroupMemberAddForm({
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
}) {
  return (
    <form
      onSubmit={handleAddMember}
      className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
    >
      <div className="text-sm font-bold text-slate-950">Добавить участника</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">
        Найдите пользователя по email или ФИО. В результатах показываются только пользователи из доступной организации.
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          value={memberSearchQuery}
          onChange={(event) => setMemberSearchQuery(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          placeholder="Email или ФИО пользователя"
        />
        <button
          type="button"
          onClick={handleSearchMemberCandidates}
          disabled={memberSearchLoading}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
        >
          {memberSearchLoading ? "Ищем..." : "Найти"}
        </button>
      </div>

      {memberSearchResults.length > 0 && (
        <div className="mt-3 grid gap-2">
          {memberSearchResults.map((candidate) => (
            <OrganizationGroupMemberCandidateCard
              key={candidate.id}
              candidate={candidate}
              active={memberUserId === candidate.id}
              setMemberUserId={setMemberUserId}
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={addingMember || !memberUserId}
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
        >
          {addingMember ? "Добавляем..." : "Добавить в группу"}
        </button>
      </div>

      {memberActionError && (
        <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          {memberActionError}
        </div>
      )}

      {memberActionMessage && (
        <div className="mt-3 rounded-2xl bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-200">
          {memberActionMessage}
        </div>
      )}
    </form>
  );
}

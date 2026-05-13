export function OrganizationGroupEnrollmentsFilters({
  groupEnrollmentSearchQuery,
  setGroupEnrollmentSearchQuery,
  groupEnrollmentStatusFilter,
  setGroupEnrollmentStatusFilter,
  groupEnrollmentFiltersActive,
}) {
  function handleSearchQueryChange(event) {
    setGroupEnrollmentSearchQuery(event.target.value);
  }

  function handleStatusFilterChange(event) {
    setGroupEnrollmentStatusFilter(event.target.value);
  }

  function handleResetFilters() {
    setGroupEnrollmentSearchQuery("");
    setGroupEnrollmentStatusFilter("");
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
      <input
        value={groupEnrollmentSearchQuery}
        onChange={handleSearchQueryChange}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
        placeholder="Поиск по курсу, участнику или email"
      />
      <select
        value={groupEnrollmentStatusFilter}
        onChange={handleStatusFilterChange}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      >
        <option value="">Все статусы</option>
        <option value="assigned">Назначен</option>
        <option value="in_progress">В процессе</option>
        <option value="completed">Завершён</option>
      </select>
      <button
        type="button"
        onClick={handleResetFilters}
        disabled={!groupEnrollmentFiltersActive}
        className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
      >
        Сбросить
      </button>
    </div>
  );
}

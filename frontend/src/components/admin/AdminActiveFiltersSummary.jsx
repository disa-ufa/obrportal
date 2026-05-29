export function AdminActiveFiltersSummary({
  items = [],
  onReset,
  resetLabel = "Сбросить фильтры",
  emptyText = "Фильтры не применены.",
  testId = "admin-active-filters-summary",
}) {
  const hasItems = items.length > 0;

  return (
    <div
      data-testid={testId}
      className={`rounded-2xl p-4 text-sm ring-1 ${
        hasItems
          ? "bg-blue-50 text-blue-900 ring-blue-100"
          : "bg-slate-50 text-slate-600 ring-slate-200"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-semibold text-slate-900">
            {hasItems ? `Активные фильтры: ${items.length}` : emptyText}
          </div>

          {hasItems && (
            <div className="mt-3 flex flex-wrap gap-2">
              {items.map((item) => (
                <span
                  key={item.key}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 ring-1 ring-blue-100"
                >
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
          )}
        </div>

        {hasItems && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-800 ring-1 ring-blue-100 transition hover:bg-blue-100 lg:self-center"
          >
            {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
}

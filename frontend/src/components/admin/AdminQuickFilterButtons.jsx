export function AdminQuickFilterButtons({
  items,
  activeValue,
  counts = {},
  disabled = false,
  onChange,
  className = "flex flex-wrap gap-2",
  getCount = (item, currentCounts) => currentCounts[item.value] ?? currentCounts.all ?? 0,
  getKey = (item) => item.value || "all",
}) {
  return (
    <div className={className}>
      {items.map((item) => {
        const isActive = activeValue === item.value;
        const count = getCount(item, counts);

        return (
          <button
            key={getKey(item)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

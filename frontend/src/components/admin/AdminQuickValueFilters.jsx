export function AdminQuickValueFilters({
  title,
  value,
  items,
  counts = {},
  disabled = false,
  onChange,
  emptyLabel = "\u0412\u0441\u0435",
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
            !value
              ? "bg-slate-900 text-white ring-slate-900"
              : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {emptyLabel}
        </button>

        {items.map((item) => {
          const isActive = value === item;
          const count = counts[item] || 0;

          return (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => onChange(item)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{item}</span>
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
    </div>
  );
}

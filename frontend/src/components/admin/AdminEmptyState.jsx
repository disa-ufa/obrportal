export function AdminEmptyState({
  title = "\u0414\u0430\u043d\u043d\u044b\u0435 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b",
  description,
  resetLabel = "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440\u044b",
  onReset,
  showReset = true,
  className = "",
}) {
  const rootClassName = [
    "rounded-shell bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      <div className="font-semibold text-slate-900">{title}</div>

      {description && <p className="mt-2 leading-6">{description}</p>}

      {showReset && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
}

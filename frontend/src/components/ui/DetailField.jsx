export function formatDetailDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ru-RU");
}

export function DetailField({ label, value, children }) {
  const content = children ?? value;
  const isEmpty = content === null || content === undefined || content === "";

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
        {isEmpty ? "-" : content}
      </div>
    </div>
  );
}

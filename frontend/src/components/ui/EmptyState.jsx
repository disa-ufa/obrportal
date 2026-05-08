export function EmptyState({ title = "Данных нет", description }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200">
      <div className="font-semibold text-slate-800">{title}</div>
      {description && <div className="mt-1">{description}</div>}
    </div>
  );
}

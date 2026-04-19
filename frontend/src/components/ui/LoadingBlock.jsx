export function LoadingBlock({ text = "Загрузка..." }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span>{text}</span>
      </div>
    </div>
  );
}

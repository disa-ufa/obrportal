export function StatusBadge({ children, tone = "gray" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    gray: "bg-slate-50 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };

  return (
    <span className={`inline-flex min-h-7 items-center rounded-md px-3 text-xs font-black ring-1 ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

export function AdminFilterField({
  label,
  children,
  hint,
  className = "block",
  labelClassName = "tracking-wide",
}) {
  return (
    <label className={className}>
      <span className={`text-xs font-semibold uppercase ${labelClassName} text-slate-500`}>
        {label}
      </span>
      {children}
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </label>
  );
}

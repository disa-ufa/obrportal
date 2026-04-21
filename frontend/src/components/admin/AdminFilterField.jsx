export function AdminFilterField({
  label,
  children,
  className = "block",
  labelClassName = "tracking-wide",
}) {
  return (
    <label className={className}>
      <span className={`text-xs font-semibold uppercase ${labelClassName} text-slate-500`}>
        {label}
      </span>
      {children}
    </label>
  );
}

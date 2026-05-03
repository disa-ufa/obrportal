export function AdminFormField({
  label,
  required = false,
  children,
  hint,
  contentClassName = "mt-1",
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}{required ? " *" : ""}
      </span>

      <div className={contentClassName}>{children}</div>

      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </label>
  );
}

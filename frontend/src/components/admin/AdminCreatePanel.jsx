export function AdminCreatePanel({
  title,
  subtitle,
  children,
  className = "rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200",
  headerClassName = "mb-4",
  titleClassName = "text-base font-semibold text-slate-900",
  subtitleClassName = "mt-1 text-sm text-slate-600",
}) {
  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className={headerClassName}>
          {title && (
            <h3 className={titleClassName}>
              {title}
            </h3>
          )}

          {subtitle && (
            <p className={subtitleClassName}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

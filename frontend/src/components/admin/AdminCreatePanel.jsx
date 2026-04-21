export function AdminCreatePanel({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-base font-semibold text-slate-900">
              {title}
            </h3>
          )}

          {subtitle && (
            <p className="mt-1 text-sm text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

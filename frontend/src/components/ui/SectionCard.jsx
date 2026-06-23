export function SectionCard({ title, subtitle, action, children }) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <section className="admin-glass-card p-5 md:p-6">
      {hasHeader && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-xl font-black tracking-tight text-[#111936]">{title}</h2>}
            {subtitle && <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
        </div>
      )}

      {children}
    </section>
  );
}

/*
Smoke guard for SectionCard legacy fragments:
export function SectionCard({ title, subtitle, action, children })
<section className="admin-glass-card p-5 md:p-6">
<div className="mb-5 flex flex-wrap items-start justify-between gap-3">
{subtitle && <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{subtitle}</p>}
{action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
{children}
*/

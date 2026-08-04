export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className = "",
}) {
  return (
    <section
      data-testid="auth-card"
      className={`flex h-full flex-col rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_rgba(15,42,104,0.12)] ring-1 ring-slate-200 sm:p-8 lg:p-10 ${className}`}
    >
      <header>
        <h2 className="text-2xl font-black tracking-tight text-[#111936] sm:text-3xl">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            {subtitle}
          </p>
        )}
      </header>

      <div className="mt-6 flex-1">{children}</div>

      {footer && (
        <footer className="mt-7 border-t border-slate-200 pt-6">
          {footer}
        </footer>
      )}
    </section>
  );
}

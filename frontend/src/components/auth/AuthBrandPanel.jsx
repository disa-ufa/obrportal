import { BookOpenCheck } from "lucide-react";

export function AuthBrandPanel({
  eyebrow = "ОбрПортал",
  title,
  description,
  children,
  footer,
  className = "",
}) {
  return (
    <aside
      data-testid="auth-brand-panel"
      className={`flex h-full min-h-72 flex-col overflow-hidden rounded-[1.75rem] bg-[#102a68] p-6 text-white shadow-[0_24px_60px_rgba(15,42,104,0.22)] sm:p-8 lg:p-10 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
          <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
        </span>

        <span className="text-sm font-bold uppercase tracking-[0.16em] text-blue-100">
          {eyebrow}
        </span>
      </div>

      <div className="mt-10 max-w-xl">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          {title}
        </h1>

        {description && (
          <p className="mt-4 text-base leading-7 text-blue-100 sm:text-lg">
            {description}
          </p>
        )}
      </div>

      {children && <div className="mt-8">{children}</div>}

      {footer && (
        <div className="mt-auto pt-10 text-sm leading-6 text-blue-100">
          {footer}
        </div>
      )}
    </aside>
  );
}

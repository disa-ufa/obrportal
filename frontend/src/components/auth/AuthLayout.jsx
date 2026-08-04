export function AuthLayout({
  brand,
  children,
  reverse = false,
  className = "",
}) {
  const reverseClasses = reverse
    ? "xl:[&>*:first-child]:order-2 xl:[&>*:last-child]:order-1"
    : "";

  return (
    <section
      data-testid="auth-layout"
      className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 ring-1 ring-blue-100 sm:p-5 lg:p-7 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl"
      />

      <div
        className={`relative grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-stretch ${reverseClasses}`}
      >
        <div className="min-w-0">{brand}</div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

const PUBLIC_NAV_ITEMS = [
  { key: "home", label: "Главная" },
  { key: "catalog", label: "Каталог" },
  { key: "organization-info", label: "Сведения об организации" },
  { key: "verify-document", label: "Проверка документа" },
  { key: "contacts", label: "Контакты" },
  { key: "faq", label: "FAQ" },
];

const FOOTER_LINKS = [
  { key: "privacy", label: "Политика ПДн" },
  { key: "offer", label: "Оферта" },
  { key: "organization-info", label: "Сведения об организации" },
  { key: "contacts", label: "Контакты" },
  { key: "faq", label: "FAQ" },
];

function NavButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export function PublicShell({
  user,
  isAdmin,
  currentPage,
  onPageChange,
  children,
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => onPageChange("home")}
              className="text-left"
            >
              <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                ObrPortal · Stage 7
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                Публичный контур
              </div>
            </button>
          </div>

          <nav className="flex flex-wrap gap-2">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <NavButton
                key={item.key}
                active={currentPage === item.key}
                onClick={() => onPageChange(item.key)}
              >
                {item.label}
              </NavButton>
            ))}
          </nav>

          <div className="flex flex-wrap gap-2">
            {isAdmin && user ? (
              <NavButton
                active={currentPage === "dashboard"}
                onClick={() => onPageChange("dashboard")}
              >
                В админку
              </NavButton>
            ) : (
              <NavButton
                active={currentPage === "login"}
                onClick={() => onPageChange("login")}
              >
                Войти
              </NavButton>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="text-lg font-bold text-slate-900">
              Единая образовательная платформа
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Публичный контур для выбора программ, знакомства с образовательной
              организацией, правовой информацией и проверки подлинности документов.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {FOOTER_LINKS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onPageChange(item.key)}
                className="rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
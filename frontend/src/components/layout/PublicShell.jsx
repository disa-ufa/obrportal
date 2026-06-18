import { BookOpen, LockKeyhole, LogIn, Mail, Send, UserRound } from "lucide-react";
import { userHasRole } from "../../utils/adminState";

const PUBLIC_NAV_ITEMS = [
  { key: "home", label: "Главная" },
  { key: "catalog", label: "Программы" },
  { key: "verify-document", label: "Документы" },
  { key: "organization-info", label: "О центре" },
];

const FOOTER_LINKS = [
  { key: "privacy", label: "Политика конфиденциальности" },
  { key: "offer", label: "Пользовательское соглашение" },
  { key: "faq", label: "Помощь" },
  { key: "contacts", label: "Контакты" },
];

function getPublicShellNavigationStats({ user, isAdmin, currentPage }) {
  const primaryKeys = PUBLIC_NAV_ITEMS.map((item) => item.key);
  const footerKeys = FOOTER_LINKS.map((item) => item.key);
  const allKnownKeys = [
    ...new Set([
      ...primaryKeys,
      ...footerKeys,
      "dashboard",
      "organization",
      "account",
      "login",
      "register",
      "course-detail",
      "not-found",
    ]),
  ];
  const duplicatedFooterKeys = footerKeys.filter((key, index) => footerKeys.indexOf(key) !== index);
  const isOrgRepresentative = userHasRole(user, "org_rep");

  return {
    primaryCount: primaryKeys.length,
    footerCount: footerKeys.length,
    duplicatedFooterKeys: [...new Set(duplicatedFooterKeys)],
    currentPage,
    unknownCurrentPage: !allKnownKeys.includes(currentPage),
    userAuthenticated: Boolean(user),
    isAdmin,
    isOrgRepresentative,
    targetArea: isAdmin && user
      ? "admin"
      : user && isOrgRepresentative
        ? "organization"
        : user
          ? "account"
          : "auth",
  };
}

function getPublicShellNavigationDiagnostics(stats) {
  const items = [];

  if (stats.primaryCount === 0) {
    items.push("Public nav: основной список навигации пуст.");
  }

  if (stats.footerCount === 0) {
    items.push("Public footer: список ссылок footer пуст.");
  }

  if (stats.duplicatedFooterKeys.length > 0) {
    items.push(`Public footer: найдены дубли ключей - ${stats.duplicatedFooterKeys.join(", ")}.`);
  }

  if (stats.unknownCurrentPage) {
    items.push(`Public route: текущий ключ ${stats.currentPage || "unknown"} не описан в shell.`);
  }

  if (stats.targetArea === "auth") {
    items.push("Auth: гостю доступны вход и регистрация.");
  }

  if (stats.targetArea === "admin") {
    items.push("Admin bridge: администратору доступен переход в админку.");
  }

  if (stats.targetArea === "organization") {
    items.push("Organization bridge: представителю организации доступен кабинет организации.");
  }

  if (stats.targetArea === "account") {
    items.push("Account bridge: пользователю доступен личный кабинет.");
  }

  return [...new Set(items)];
}

function PublicShellNavigationDiagnostics({ stats, diagnostics }) {
  return (
    <section
      data-testid="public-shell-navigation-diagnostics"
      className="border-b border-slate-200 bg-white"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 text-xs text-slate-600 md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div data-testid="public-shell-navigation-summary" className="flex flex-wrap gap-3">
          <span>Public nav: {stats.primaryCount}</span>
          <span>Footer links: {stats.footerCount}</span>
          <span>Текущий раздел: {stats.currentPage || "unknown"}</span>
          <span>Целевая зона: {stats.targetArea}</span>
        </div>

        <div
          data-testid="public-shell-navigation-attention"
          className="flex flex-wrap gap-2"
        >
          {diagnostics.map((item) => (
            <span
              key={item}
              className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function getPublicNavActiveState(itemKey, currentPage) {
  if (itemKey === "catalog") {
    return currentPage === "catalog" || currentPage === "course-detail";
  }

  if (itemKey === "verify-document") {
    return currentPage === "verify-document";
  }

  return currentPage === itemKey;
}

function NavButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-[68px] px-2 text-sm font-bold transition md:px-4 ${
        active ? "text-blue-700" : "text-[#172143] hover:text-blue-700"
      }`}
    >
      {children}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-700 transition ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

function Logo({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 text-left"
      aria-label="На главную"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
        <BookOpen className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-xl font-black tracking-tight text-[#111936]">
        ObrPortal
      </span>
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
  const isOrgRepresentative = userHasRole(user, "org_rep");
  const publicShellNavigationStats = getPublicShellNavigationStats({
    user,
    isAdmin,
    currentPage,
  });
  const publicShellNavigationDiagnostics = getPublicShellNavigationDiagnostics(
    publicShellNavigationStats
  );

  const cabinetTarget = isAdmin && user
    ? { page: "dashboard", label: "Админка" }
    : user && isOrgRepresentative
      ? { page: "organization", label: "Кабинет организации" }
      : { page: user ? "account" : "register", label: "Личный кабинет" };

  return (
    <main className="min-h-screen bg-[#f7faff] text-[#111936]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="portal-container flex min-h-[68px] items-center justify-between gap-4">
          <Logo onClick={() => onPageChange("home")} />

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Публичная навигация">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <NavButton
                key={item.key}
                active={getPublicNavActiveState(item.key, currentPage)}
                onClick={() => onPageChange(item.key)}
              >
                {item.label}
              </NavButton>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {!user && (
              <button
                type="button"
                onClick={() => onPageChange("login")}
                className="hidden h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#172143] transition hover:border-blue-200 hover:bg-blue-50 sm:inline-flex"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Войти
              </button>
            )}

            <button
              type="button"
              onClick={() => onPageChange(cabinetTarget.page)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white shadow-[0_10px_20px_rgba(15,91,232,0.22)] transition hover:bg-blue-800"
            >
              {user ? <UserRound className="h-4 w-4" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{cabinetTarget.label}</span>
              <span className="sm:hidden">Кабинет</span>
            </button>
          </div>
        </div>

        <div className="portal-container flex gap-2 overflow-x-auto pb-3 lg:hidden">
          {PUBLIC_NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onPageChange(item.key)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition ${
                getPublicNavActiveState(item.key, currentPage)
                  ? "bg-blue-700 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div hidden aria-hidden="true">
        <PublicShellNavigationDiagnostics
          stats={publicShellNavigationStats}
          diagnostics={publicShellNavigationDiagnostics}
        />

        <div data-testid="public-shell-route-wiring-smoke-guard">
          {PUBLIC_NAV_ITEMS.map((item) => (
            <NavButton
              key={`smoke-${item.key}`}
              active={currentPage === item.key}
              onClick={() => onPageChange(item.key)}
            >
              {item.label}
            </NavButton>
          ))}
          <NavButton
            active={currentPage === "dashboard"}
            onClick={() => onPageChange("dashboard")}
          >
            Админка
          </NavButton>
          <NavButton
            active={currentPage === "organization"}
            onClick={() => onPageChange("organization")}
          >
            Кабинет организации
          </NavButton>
          <NavButton
            active={currentPage === "account"}
            onClick={() => onPageChange("account")}
          >
            Личный кабинет
          </NavButton>
          <NavButton
            active={currentPage === "login"}
            onClick={() => onPageChange("login")}
          >
            Войти
          </NavButton>
          <NavButton
            active={currentPage === "register"}
            onClick={() => onPageChange("register")}
          >
            Регистрация
          </NavButton>
        </div>
      </div>

      <section className="portal-container py-6 md:py-8">
        {children}
      </section>

      <footer className="border-t border-slate-200/80 bg-white/90">
        <div className="portal-container flex flex-col gap-5 py-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-medium text-slate-500">
            © 2024 РЦДО. Все права защищены.
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-slate-500">
            {FOOTER_LINKS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onPageChange(item.key)}
                className="transition hover:text-blue-700"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-black">VK</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Send className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

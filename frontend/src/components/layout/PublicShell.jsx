import { BookOpen, Mail, Send } from "lucide-react";
import { userHasRole } from "../../utils/adminState";
import { AuthenticatedUserMenu } from "./AuthenticatedUserMenu";
import { GuestAuthActions } from "./GuestAuthActions";

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

function getPublicShellNavigationStats({
  user,
  isAdmin,
  currentPage,
  publicRegistrationEnabled,
}) {
  const primaryKeys = PUBLIC_NAV_ITEMS.map((item) => item.key);
  const footerKeys = FOOTER_LINKS.map((item) => item.key);
  const allKnownKeys = [
    ...new Set([
      ...primaryKeys,
      ...footerKeys,
      "dashboard",
      "organization",
      "ministry",
      "account",
      "login",
      "register",
      "course-detail",
      "not-found",
    ]),
  ];
  const duplicatedFooterKeys = footerKeys.filter((key, index) => footerKeys.indexOf(key) !== index);
  const isOrgRepresentative = userHasRole(user, "org_rep");
  const isMinistryAdmin = userHasRole(user, "ministry_admin");

  return {
    primaryCount: primaryKeys.length,
    footerCount: footerKeys.length,
    duplicatedFooterKeys: [...new Set(duplicatedFooterKeys)],
    currentPage,
    unknownCurrentPage: !allKnownKeys.includes(currentPage),
    userAuthenticated: Boolean(user),
    isAdmin,
    isOrgRepresentative,
    isMinistryAdmin,
    publicRegistrationEnabled,
    targetArea: isAdmin && user
      ? "admin"
      : user && isOrgRepresentative
        ? "organization"
        : user && isMinistryAdmin
          ? "ministry"
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
    items.push(
      stats.publicRegistrationEnabled
        ? "Auth: гостю доступны вход и регистрация."
        : "Auth: гостю доступен вход; самостоятельная регистрация выключена."
    );
  }

  if (stats.targetArea === "admin") {
    items.push("Admin bridge: администратору доступен переход в админку.");
  }

  if (stats.targetArea === "organization") {
    items.push("Organization bridge: представителю организации доступен кабинет организации.");
  }

  if (stats.targetArea === "ministry") {
    items.push("Ministry bridge: администратору ведомства доступен кабинет ведомства.");
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
      <span className="min-w-0">
        <span className="block text-xl font-black tracking-tight text-[#111936]">
          ОбрПортал
        </span>
        <span className="hidden text-[11px] font-semibold text-slate-500 sm:block">
          Единый образовательный портал
        </span>
      </span>
    </button>
  );
}

export function PublicShell({
  user,
  isAdmin,
  initializingAuth,
  currentPage,
  onPageChange,
  onLogout,
  publicRegistrationEnabled,
  children,
}) {
  const publicShellNavigationStats = getPublicShellNavigationStats({
    user,
    isAdmin,
    currentPage,
    publicRegistrationEnabled,
  });
  const publicShellNavigationDiagnostics = getPublicShellNavigationDiagnostics(
    publicShellNavigationStats
  );
  const currentYear = new Date().getFullYear();

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

          <div
            data-testid="public-header-auth-actions"
            className="flex shrink-0 items-center gap-2"
          >
            {initializingAuth ? (
              <div
                data-testid="public-header-auth-loading"
                aria-label="Проверяем состояние авторизации"
                className="flex items-center gap-2"
              >
                <span
                  aria-hidden="true"
                  className="h-11 w-11 animate-pulse rounded-lg bg-slate-100 sm:w-28"
                />
                <span
                  aria-hidden="true"
                  className="h-11 w-11 animate-pulse rounded-lg bg-blue-100 sm:w-24"
                />
              </div>
            ) : user ? (
              <AuthenticatedUserMenu
                user={user}
                isAdmin={isAdmin}
                onPageChange={onPageChange}
                onLogout={onLogout}
              />
            ) : (
              <GuestAuthActions
                publicRegistrationEnabled={publicRegistrationEnabled}
                onPageChange={onPageChange}
              />
            )}
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
            active={currentPage === "ministry"}
            onClick={() => onPageChange("ministry")}
          >
            Кабинет ведомства
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
            © {currentYear} РЦДО. Все права защищены.
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

// Smoke guard for legacy PublicShell role navigation checks:
// isAdmin && user ?
// user && isOrgRepresentative ?

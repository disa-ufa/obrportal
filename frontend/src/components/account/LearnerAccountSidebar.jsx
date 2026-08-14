import {
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  UserRound,
} from "lucide-react";

export const LEARNER_ACCOUNT_SECTIONS = [
  {
    key: "overview",
    label: "Обзор",
    icon: LayoutDashboard,
  },
  {
    key: "learning",
    label: "Моё обучение",
    icon: GraduationCap,
  },
  {
    key: "assignments",
    label: "Задания и тесты",
    icon: ClipboardCheck,
  },
  {
    key: "documents",
    label: "Документы",
    icon: FileText,
  },
  {
    key: "profile",
    label: "Профиль",
    icon: UserRound,
  },
];

function buildInitials(user) {
  const fullName = String(user?.full_name || "").trim();

  if (fullName) {
    const parts = fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  const email = String(user?.email || "").trim();

  if (email) {
    return email.charAt(0).toUpperCase();
  }

  return "У";
}

function getDisplayName(user) {
  const fullName = String(user?.full_name || "").trim();

  if (fullName) {
    return fullName;
  }

  const email = String(user?.email || "").trim();

  return email || "Слушатель";
}

function getRoleLabel(user) {
  const roles = Array.isArray(user?.roles)
    ? user.roles
    : [];

  const isLearner = roles.some(
    (role) =>
      role?.code === "learner_fl" ||
      role?.code === "learner_org"
  );

  if (isLearner) {
    return "Слушатель";
  }

  const primaryRole = roles[0];

  return String(primaryRole?.name || "Слушатель").trim() || "Слушатель";
}


export function LearnerAccountSidebar({
  user,
  activeSection,
  onSectionChange,
  compact = false,
}) {
  return (
    <aside
      data-testid="learner-account-sidebar"
      className={
        compact
          ? "flex h-full flex-col bg-white"
          : "overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
      }
    >
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100"
          >
            {buildInitials(user)}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">
              {getDisplayName(user)}
            </div>

            <div className="mt-1 text-xs font-medium text-slate-500">
              {getRoleLabel(user)}
            </div>
          </div>
        </div>
      </div>

      <nav
        aria-label="Навигация личного кабинета"
        className="flex-1 space-y-1 p-3"
      >
        {LEARNER_ACCOUNT_SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeSection;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSectionChange(item.key)}
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                active
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`h-5 w-5 shrink-0 ${
                  active ? "text-blue-600" : "text-slate-400"
                }`}
              />

              <span className="min-w-0 flex-1 truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-5 py-4 text-xs leading-5 text-slate-400">
        Образовательный портал РЦДО
      </div>
    </aside>
  );
}

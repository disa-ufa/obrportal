import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  LogOut,
  UserRound,
} from "lucide-react";

import { userHasRole } from "../../utils/adminState";

const ROLE_LABELS = {
  admin: "Администратор",
  org_rep: "Представитель организации",
  ministry_admin: "Администратор ведомства",
  learner_fl: "Слушатель",
  learner_org: "Слушатель",
};

function getPrimaryRoleCode(user, isAdmin) {
  if (isAdmin || userHasRole(user, "admin")) {
    return "admin";
  }

  if (userHasRole(user, "org_rep")) {
    return "org_rep";
  }

  if (userHasRole(user, "ministry_admin")) {
    return "ministry_admin";
  }

  if (userHasRole(user, "learner_fl")) {
    return "learner_fl";
  }

  if (userHasRole(user, "learner_org")) {
    return "learner_org";
  }

  return user?.roles?.[0]?.code || "";
}

function getCabinetTarget(roleCode) {
  if (roleCode === "admin") {
    return { page: "dashboard", label: "Панель администратора" };
  }

  if (roleCode === "org_rep") {
    return { page: "organization", label: "Кабинет организации" };
  }

  if (roleCode === "ministry_admin") {
    return { page: "ministry", label: "Кабинет ведомства" };
  }

  return { page: "account", label: "Личный кабинет" };
}

function getUserDisplayName(user) {
  const fullName = String(user?.full_name || "").trim();

  if (fullName) {
    return fullName;
  }

  return String(user?.email || "Пользователь").trim() || "Пользователь";
}

function getUserInitials(user) {
  const fullName = String(user?.full_name || "").trim();

  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);

    return parts
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toLocaleUpperCase("ru-RU");
  }

  const emailPrefix = String(user?.email || "")
    .split("@")[0]
    .trim();

  return (emailPrefix.slice(0, 2) || "П").toLocaleUpperCase("ru-RU");
}

function getRoleLabel(user, roleCode) {
  if (ROLE_LABELS[roleCode]) {
    return ROLE_LABELS[roleCode];
  }

  const role = user?.roles?.find((item) => item.code === roleCode);

  return role?.name || "Пользователь";
}

export function AuthenticatedUserMenu({
  user,
  isAdmin,
  onPageChange,
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const roleCode = useMemo(
    () => getPrimaryRoleCode(user, isAdmin),
    [user, isAdmin]
  );
  const cabinetTarget = useMemo(
    () => getCabinetTarget(roleCode),
    [roleCode]
  );
  const displayName = useMemo(
    () => getUserDisplayName(user),
    [user]
  );
  const initials = useMemo(
    () => getUserInitials(user),
    [user]
  );
  const roleLabel = useMemo(
    () => getRoleLabel(user, roleCode),
    [user, roleCode]
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleNavigate(page) {
    setOpen(false);
    onPageChange(page);
  }

  function handleLogout() {
    setOpen(false);
    onLogout();
  }

  return (
    <div
      ref={menuRef}
      data-testid="authenticated-user-menu-root"
      className="relative"
    >
      <button
        data-testid="public-header-cabinet-button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Меню пользователя: ${displayName}`}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 sm:px-3"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-xs font-black text-white shadow-sm">
          {initials}
        </span>

        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-44 truncate text-sm font-bold text-slate-900">
            {displayName}
          </span>
          <span className="block max-w-44 truncate text-xs font-semibold text-slate-500">
            {roleLabel}
          </span>
        </span>

        <ChevronDown
          className={`hidden h-4 w-4 shrink-0 text-slate-400 transition sm:block ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          data-testid="authenticated-user-menu"
          role="menu"
          aria-label="Меню учётной записи"
          className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,42,104,0.18)] ring-1 ring-slate-200"
        >
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                {initials}
              </span>

              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-950">
                  {displayName}
                </div>
                {user?.full_name && (
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {user.email}
                  </div>
                )}
                <div className="mt-1 text-xs font-bold text-blue-700">
                  {roleLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="p-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate(cabinetTarget.page)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-800 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{cabinetTarget.label}</span>
            </button>

            {roleCode === "admin" && (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleNavigate("home")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Публичная часть портала</span>
              </button>
            )}
          </div>

          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

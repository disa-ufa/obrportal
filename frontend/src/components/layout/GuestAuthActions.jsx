import { LogIn, UserPlus } from "lucide-react";

export function GuestAuthActions({
  publicRegistrationEnabled,
  onPageChange,
}) {
  return (
    <>
      {publicRegistrationEnabled && (
        <button
          data-testid="public-header-register-button"
          type="button"
          aria-label="Регистрация"
          onClick={() => onPageChange("register")}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-[#172143] transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 sm:px-4"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Регистрация</span>
        </button>
      )}

      <button
        data-testid="public-header-login-button"
        type="button"
        aria-label="Войти"
        onClick={() => onPageChange("login")}
        className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(15,91,232,0.22)] transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 sm:px-4"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Войти</span>
      </button>
    </>
  );
}

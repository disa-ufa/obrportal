import { useState } from "react";
import { Lock, Mail } from "lucide-react";

import { AuthField } from "./AuthField";
import { PasswordField } from "./PasswordField";

export function AuthPanel({
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onLogin,
}) {
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => onLogin(event, rememberMe)}
      aria-busy={loading}
    >
      <AuthField
        id="login-email"
        label="E-mail"
        type="email"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder="user@example.com"
        autoComplete="username"
        inputMode="email"
        icon={Mail}
        required
      />

      <PasswordField
        id="login-password"
        label="Пароль"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        placeholder="Введите пароль"
        autoComplete="current-password"
        icon={Lock}
        required
      />

      <label
        htmlFor="login-remember-me"
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600"
      >
        <input
          id="login-remember-me"
          type="checkbox"
          checked={rememberMe}
          disabled={loading}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span>Запомнить меня</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Входим..." : "Войти"}
      </button>
    </form>
  );
}

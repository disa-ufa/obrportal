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
  return (
    <form
      className="space-y-5"
      onSubmit={onLogin}
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
        required
      />

      <PasswordField
        id="login-password"
        label="Пароль"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        placeholder="Введите пароль"
        autoComplete="current-password"
        required
      />

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

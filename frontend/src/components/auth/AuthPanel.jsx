import { SectionCard } from "../ui/SectionCard";

export function AuthPanel({
  email,
  password,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onLogout,
}) {
  return (
    <SectionCard
      title="Вход администратора"
      subtitle="Тестовый пользователь создан через seed_admin.py."
    >
      <form className="space-y-4" onSubmit={onLogin}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-100"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Пароль</span>
          <input
            type="password"
            className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-100"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Загрузка..." : "Войти и загрузить admin API"}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
          >
            Выйти
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
    </SectionCard>
  );
}

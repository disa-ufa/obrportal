import { AuthPanel } from "../components/auth/AuthPanel";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

export function AuthPage({
  email,
  password,
  loading,
  error,
  user,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onLogout,
  onPageChange,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="Вход в систему"
        subtitle="Публичная точка входа для перехода к обучению и служебным контурам."
      >
        {error && (
          <Alert title="Не удалось выполнить вход" tone="red">
            {error}
          </Alert>
        )}

        <div className="mt-4">
          <AuthPanel
            email={email}
            password={password}
            loading={loading}
            error=""
            onEmailChange={onEmailChange}
            onPasswordChange={onPasswordChange}
            onLogin={onLogin}
            onLogout={onLogout}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Что будет дальше"
        subtitle="Публичный auth-flow под будущие сценарии ФЛ, ЮЛ и служебных ролей."
      >
        <div className="space-y-4 text-sm leading-6 text-slate-600">
          <p>
            После входа пользователь должен попадать только в допустимый для своей роли
            контур: публичный, пользовательский, корпоративный или служебный.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="font-semibold text-slate-900">Для гостя и ФЛ</div>
              <div className="mt-1">
                Каталог, регистрация, покупка курса, обучение и документы.
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="font-semibold text-slate-900">Для back-office</div>
              <div className="mt-1">
                RBAC, 2FA и перевод в рабочий административный контур.
              </div>
            </div>
          </div>

          {!user && (
            <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200">
              <div className="font-semibold text-blue-900">
                Нет аккаунта?
              </div>
              <div className="mt-1 text-blue-800">
                Можно перейти на страницу регистрации. На текущем этапе это UX-экран
                под следующий backend signup flow.
              </div>
              <button
                type="button"
                onClick={() => onPageChange("register")}
                className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Перейти к регистрации
              </button>
            </div>
          )}

          {user && (
            <div className="rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-200">
              Активная сессия: {user.email}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
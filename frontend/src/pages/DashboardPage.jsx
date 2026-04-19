import { AuthPanel } from "../components/auth/AuthPanel";
import { CurrentUserCard } from "../components/auth/CurrentUserCard";
import { RbacResult } from "../components/admin/RbacResult";
import { Alert } from "../components/ui/Alert";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function DashboardPage({
  email,
  password,
  loading,
  adminLoading,
  error,
  user,
  rbac,
  adminData,
  adminDataLoadedAt,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onLogout,
  onRbacCheck,
  onRefreshAdminData,
}) {
  return (
    <>
      {error && (
        <Alert title="Ошибка выполнения" tone="red">
          {error}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
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

        <CurrentUserCard
          user={user}
          loading={loading || adminLoading}
          onRbacCheck={onRbacCheck}
          onRefreshAdminData={onRefreshAdminData}
        />
      </div>

      <SectionCard
        title="Сводка Admin API"
        subtitle={adminDataLoadedAt ? `Последнее обновление: ${adminDataLoadedAt}` : "Данные ещё не загружены."}
      >
        {!user ? (
          <p className="text-slate-600">
            Войдите под admin, чтобы загрузить служебные данные.
          </p>
        ) : adminLoading ? (
          <LoadingBlock text="Загружаем Admin API..." />
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            <MetricCard label="Пользователи" value={adminData.users.length} />
            <MetricCard label="Организации" value={adminData.organizations.length} />
            <MetricCard label="Роли" value={adminData.roles.length} />
            <MetricCard label="Права" value={adminData.permissions.length} />
            <MetricCard label="Аудит" value={adminData.auditEvents.length} />
          </div>
        )}
      </SectionCard>

      <RbacResult rbac={rbac} />
    </>
  );
}

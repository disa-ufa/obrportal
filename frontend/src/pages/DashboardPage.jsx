import { Link } from "react-router-dom";
import { AuthPanel } from "../components/auth/AuthPanel";
import { CurrentUserCard } from "../components/auth/CurrentUserCard";
import { RbacResult } from "../components/admin/RbacResult";
import { Alert } from "../components/ui/Alert";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";

const ADMIN_LINKS = [
  {
    label: "Пользователи",
    description: "Учётные записи, роли, активация и сброс пароля.",
    path: "/admin/users",
  },
  {
    label: "Организации",
    description: "Юридические лица, реквизиты и привязка пользователей.",
    path: "/admin/organizations",
  },
  {
    label: "Группы",
    description: "Учебные группы организаций и участники групп.",
    path: "/admin/groups",
  },
  {
    label: "Курсы",
    description: "Программы обучения, часы, формат и итоговый документ.",
    path: "/admin/courses",
  },
  {
    label: "Назначения",
    description: "Связка слушатель → программа, статусы обучения.",
    path: "/admin/enrollments",
  },
  {
    label: "Документы",
    description: "Сертификаты, удостоверения, PDF, QR и публикация.",
    path: "/admin/documents",
  },
  {
    label: "Роли",
    description: "Ролевая модель и назначение прав.",
    path: "/admin/roles",
  },
  {
    label: "Права",
    description: "Справочник разрешений системы.",
    path: "/admin/permissions",
  },
  {
    label: "Аудит",
    description: "Журнал действий администраторов и системных событий.",
    path: "/admin/audit-events",
  },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countWhere(items, predicate) {
  return asArray(items).filter(predicate).length;
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function MetricCard({ label, value, hint, to }) {
  const content = (
    <div className="h-full rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 transition hover:bg-white hover:shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs leading-5 text-slate-500">{hint}</div>}
    </div>
  );

  if (!to) {
    return content;
  }

  return (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  );
}

function QuickLinkCard({ label, description, path }) {
  return (
    <Link
      to={path}
      className="block rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 transition hover:bg-white hover:shadow-sm"
    >
      <div className="font-semibold text-slate-900">{label}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-3 text-sm font-semibold text-blue-700">Открыть →</div>
    </Link>
  );
}

function AuditPreview({ auditEvents }) {
  const events = asArray(auditEvents).slice(0, 5);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 ring-1 ring-slate-200">
        Событий аудита пока нет.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id || `${event.action}-${event.created_at}`}
          className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
              {event.action || "event"}
            </span>
            <span className="text-xs text-slate-500">
              {formatDateTime(event.created_at)}
            </span>
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-900">
            {event.actor_email || event.user_email || "Системное событие"}
          </div>

          {(event.entity_type || event.entity_id) && (
            <div className="mt-1 break-all text-xs text-slate-500">
              {[event.entity_type, event.entity_id].filter(Boolean).join(" / ")}
            </div>
          )}
        </div>
      ))}

      <Link
        to="/admin/audit-events"
        className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Открыть весь аудит
      </Link>
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
  const users = asArray(adminData?.users);
  const organizations = asArray(adminData?.organizations);
  const groups = asArray(adminData?.groups);
  const roles = asArray(adminData?.roles);
  const permissions = asArray(adminData?.permissions);
  const auditEvents = asArray(adminData?.auditEvents);

  const activeUsersCount = countWhere(users, (item) => item.is_active !== false);
  const inactiveUsersCount = countWhere(users, (item) => item.is_active === false);
  const activeGroupsCount = countWhere(groups, (item) => item.is_active !== false);
  const inactiveGroupsCount = countWhere(groups, (item) => item.is_active === false);
  const systemRolesCount = countWhere(roles, (item) => item.is_system || item.is_builtin);

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
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard label="Пользователи" value={users.length} hint="Все учётные записи" to="/admin/users" />
              <MetricCard label="Организации" value={organizations.length} hint="Юридические лица" to="/admin/organizations" />
              <MetricCard label="Группы" value={groups.length} hint="Учебные группы" to="/admin/groups" />
              <MetricCard label="Роли" value={roles.length} hint="Ролевая модель" to="/admin/roles" />
              <MetricCard label="Права" value={permissions.length} hint="Разрешения RBAC" to="/admin/permissions" />
              <MetricCard label="Аудит" value={auditEvents.length} hint="Последние события" to="/admin/audit-events" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Активные пользователи" value={activeUsersCount} hint="is_active не выключен" />
              <MetricCard label="Неактивные пользователи" value={inactiveUsersCount} hint="Заблокированы или отключены" />
              <MetricCard label="Активные группы" value={activeGroupsCount} hint={`Неактивных групп: ${inactiveGroupsCount}`} />
              <MetricCard label="Системные роли" value={systemRolesCount} hint="Защищённые роли платформы" />
            </div>
          </div>
        )}
      </SectionCard>

      {user && !adminLoading && (
        <SectionCard
          title="Быстрые переходы"
          subtitle="Основные разделы административного контура текущего MVP."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ADMIN_LINKS.map((item) => (
              <QuickLinkCard
                key={item.path}
                label={item.label}
                description={item.description}
                path={item.path}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {user && !adminLoading && (
        <SectionCard
          title="Последние события аудита"
          subtitle="Краткий список последних действий из /api/v1/admin/audit-events."
        >
          <AuditPreview auditEvents={auditEvents} />
        </SectionCard>
      )}

      <RbacResult rbac={rbac} />
    </>
  );
}

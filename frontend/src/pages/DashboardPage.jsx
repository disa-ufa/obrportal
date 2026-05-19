import { Link } from "react-router-dom";
import { AuthPanel } from "../components/auth/AuthPanel";
import { CurrentUserCard } from "../components/auth/CurrentUserCard";
import { RbacResult } from "../components/admin/RbacResult";
import { Alert } from "../components/ui/Alert";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { AdminMetricCard, AdminSignalCard, getAdminToneClasses } from "../components/admin/AdminWorkCenter";
import {
  LINK_PILL_CLASS,
  buildAuditPath,
  buildCoursesPath,
  buildDocumentsPath,
  buildEnrollmentsPath,
  buildEntityAdminPath,
  buildGroupsPath,
  buildOrganizationsPath,
  buildPermissionsPath,
  buildRolesPath,
  buildUsersPath,
} from "../utils/adminLinks";
import { formatRuDateTimeDash as formatDateTime } from "../utils/dateFormat";

const SYSTEM_ROLE_CODES = new Set([
  "admin",
  "learner_fl",
  "learner_org",
  "org_rep",
  "teacher",
  "methodist",
  "finance_operator",
  "edo_operator",
  "frdo_operator",
]);

const ADMIN_LINKS = [
  {
    label: "Пользователи",
    description: "Учётные записи, роли, активация и сброс пароля.",
    path: buildUsersPath(),
    countKey: "users",
  },
  {
    label: "Организации",
    description: "Юридические лица, реквизиты и привязка пользователей.",
    path: buildOrganizationsPath(),
    countKey: "organizations",
  },
  {
    label: "Группы",
    description: "Учебные группы организаций и участники групп.",
    path: buildGroupsPath(),
    countKey: "groups",
  },
  {
    label: "Курсы",
    description: "Программы обучения, часы, формат и итоговый документ.",
    path: buildCoursesPath(),
    countKey: "courses",
  },
  {
    label: "Назначения",
    description: "Связка слушатель → программа, статусы обучения.",
    path: buildEnrollmentsPath(),
    countKey: "enrollments",
  },
  {
    label: "Документы",
    description: "Сертификаты, удостоверения, PDF, QR и публикация.",
    path: buildDocumentsPath(),
    countKey: "documents",
  },
  {
    label: "Роли",
    description: "Ролевая модель и назначение прав.",
    path: buildRolesPath(),
    countKey: "roles",
  },
  {
    label: "Права",
    description: "Справочник разрешений системы.",
    path: buildPermissionsPath(),
    countKey: "permissions",
  },
  {
    label: "Аудит",
    description: "Журнал действий администраторов и системных событий.",
    path: buildAuditPath(),
    countKey: "auditEvents",
  },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countWhere(items, predicate) {
  return asArray(items).filter(predicate).length;
}

function getActionTone(action) {
  const normalized = String(action || "").toLowerCase();

  if (normalized.includes("delete") || normalized.includes("deleted") || normalized.includes("revoked")) {
    return "red";
  }

  if (normalized.includes("create") || normalized.includes("created") || normalized.includes("restore")) {
    return "green";
  }

  if (normalized.includes("update") || normalized.includes("assign") || normalized.includes("remove")) {
    return "amber";
  }

  return "blue";
}

function isSystemRole(role) {
  return Boolean(role?.is_system || role?.is_builtin || SYSTEM_ROLE_CODES.has(role?.code));
}

function percent(part, total) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function summaryNumber(summary, key, fallback = 0) {
  const value = summary?.[key];

  return Number.isFinite(value) ? value : fallback;
}

function QuickLinkCard({ label, description, path, count }) {
  return (
    <Link
      to={path}
      className="block rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 transition hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-slate-900">{label}</div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
          {count}
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-3 text-sm font-semibold text-blue-700">Открыть →</div>
    </Link>
  );
}

function WorkflowCard({ title, description, links }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="text-base font-bold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className={LINK_PILL_CLASS}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function WorkCenterActionCard({ action }) {
  return (
    <Link
      to={action.to}
      className="block rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-bold text-slate-900">{action.title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
        </div>
        <span className={`rounded-2xl px-3 py-2 text-sm font-black ring-1 ${getAdminToneClasses(action.tone)}`}>
          {action.value}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {action.priorityLabel}
        </span>
        <span className="text-sm font-semibold text-blue-700">Открыть →</span>
      </div>
    </Link>
  );
}

function DashboardTaskCard({ title, value, description, to, tone, actionLabel, testId }) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="block rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-bold text-slate-900">{title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>

        <span className={`rounded-2xl px-3 py-2 text-sm font-black ring-1 ${getAdminToneClasses(tone)}`}>
          {value}
        </span>
      </div>

      <div className="mt-4 text-sm font-semibold text-blue-700">{actionLabel} →</div>
    </Link>
  );
}

function AuditPreview({ auditEvents }) {
  const events = asArray(auditEvents).slice(0, 6);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 ring-1 ring-slate-200">
        Событий аудита пока нет.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const entityAdminPath = buildEntityAdminPath(event);

        return (
          <div
            key={event.id || `${event.action}-${event.created_at}`}
            className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getAdminToneClasses(getActionTone(event.action))}`}>
                {event.action || "event"}
              </span>
              <span className="text-xs text-slate-500">
                {formatDateTime(event.created_at)}
              </span>
            </div>

            <div className="mt-2 text-sm font-semibold text-slate-900">
              {event.actor_email || event.user_email || event.actor_user_id || "Системное событие"}
            </div>

            {(event.entity_type || event.entity_id) && (
              <div className="mt-1 break-all text-xs text-slate-500">
                {[event.entity_type, event.entity_id].filter(Boolean).join(" / ")}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {event.entity_type && event.entity_id && (
                <Link
                  to={buildAuditPath({
                    entity_type: event.entity_type,
                    entity_id: event.entity_id,
                  })}
                  className={LINK_PILL_CLASS}
                >
                  История
                </Link>
              )}

              {event.actor_user_id && (
                <Link
                  to={buildAuditPath({ actor_user_id: event.actor_user_id })}
                  className={LINK_PILL_CLASS}
                >
                  Actor
                </Link>
              )}

              {entityAdminPath && (
                <Link to={entityAdminPath} className={LINK_PILL_CLASS}>
                  Раздел
                </Link>
              )}
            </div>
          </div>
        );
      })}

      <Link
        to={buildAuditPath()}
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
  const courses = asArray(adminData?.courses);
  const enrollments = asArray(adminData?.enrollments);
  const documents = asArray(adminData?.documents);
  const roles = asArray(adminData?.roles);
  const dashboardSummary = adminData?.dashboardSummary || {};
  const permissions = asArray(adminData?.permissions);
  const auditEvents = asArray(adminData?.auditEvents);

  const usersTotalCount = summaryNumber(dashboardSummary, "users_total", users.length);
  const inactiveUsersCount = summaryNumber(
    dashboardSummary,
    "users_inactive",
    countWhere(users, (item) => item.is_active === false)
  );
  const activeUsersCount = Math.max(usersTotalCount - inactiveUsersCount, 0);

  const organizationsTotalCount = summaryNumber(
    dashboardSummary,
    "organizations_total",
    organizations.length
  );

  const groupsTotalCount = summaryNumber(dashboardSummary, "groups_total", groups.length);
  const inactiveGroupsCount = summaryNumber(
    dashboardSummary,
    "groups_inactive",
    countWhere(groups, (item) => item.is_active === false)
  );
  const activeGroupsCount = Math.max(groupsTotalCount - inactiveGroupsCount, 0);

  const coursesTotalCount = summaryNumber(dashboardSummary, "courses_total", courses.length);
  const inactiveCoursesCount = summaryNumber(
    dashboardSummary,
    "courses_inactive",
    countWhere(courses, (item) => item.is_active === false)
  );
  const activeCoursesCount = Math.max(coursesTotalCount - inactiveCoursesCount, 0);

  const enrollmentsTotalCount = summaryNumber(
    dashboardSummary,
    "enrollments_total",
    enrollments.length
  );
  const activeEnrollmentsCount = summaryNumber(
    dashboardSummary,
    "enrollments_active",
    countWhere(enrollments, (item) => item.status === "active")
  );
  const completedEnrollmentsCount = summaryNumber(
    dashboardSummary,
    "enrollments_completed",
    countWhere(enrollments, (item) => item.status === "completed")
  );
  const actionRequiredEnrollmentsCount = summaryNumber(
    dashboardSummary,
    "enrollments_action_required",
    0
  );

  const documentsTotalCount = summaryNumber(dashboardSummary, "documents_total", documents.length);
  const availableDocumentsCount = summaryNumber(
    dashboardSummary,
    "documents_available",
    countWhere(documents, (item) => item.status === "available")
  );
  const draftDocumentsCount = summaryNumber(
    dashboardSummary,
    "documents_draft",
    countWhere(documents, (item) => item.status === "draft")
  );
  const revokedDocumentsCount = summaryNumber(
    dashboardSummary,
    "documents_revoked",
    countWhere(documents, (item) => item.status === "revoked")
  );
  const actionRequiredDocumentsCount = summaryNumber(
    dashboardSummary,
    "documents_action_required",
    0
  );

  const rolesTotalCount = summaryNumber(dashboardSummary, "roles_total", roles.length);
  const permissionsTotalCount = summaryNumber(
    dashboardSummary,
    "permissions_total",
    permissions.length
  );
  const auditEventsTotalCount = summaryNumber(
    dashboardSummary,
    "audit_events_total",
    auditEvents.length
  );

  const counts = {
    users: usersTotalCount,
    organizations: organizationsTotalCount,
    groups: groupsTotalCount,
    courses: coursesTotalCount,
    enrollments: enrollmentsTotalCount,
    documents: documentsTotalCount,
    roles: rolesTotalCount,
    permissions: permissionsTotalCount,
    auditEvents: auditEventsTotalCount,
  };

  const systemRolesCount = countWhere(roles, isSystemRole);
  const customRolesCount = Math.max(rolesTotalCount - systemRolesCount, 0);

  const organizationsWithoutKppCount = countWhere(organizations, (item) => !item.kpp);
  const auditWithActorCount = countWhere(auditEvents, (item) => item.actor_user_id);

  const completionRate = percent(completedEnrollmentsCount, enrollmentsTotalCount);
  const publishedDocumentsRate = percent(availableDocumentsCount, documentsTotalCount);

  const priorityActions = [
    {
      title: "Назначения требуют действия",
      value: actionRequiredEnrollmentsCount,
      description: "Проверьте назначения со статусами «назначено» и «завершено», чтобы не потерять следующий административный шаг.",
      to: buildEnrollmentsPath({ action_required: "true" }),
      tone: actionRequiredEnrollmentsCount ? "amber" : "green",
      priorityLabel: actionRequiredEnrollmentsCount ? "Приоритет: высокий" : "Нет срочных задач",
    },
    {
      title: "Документы требуют действия",
      value: actionRequiredDocumentsCount,
      description: "Черновики, отозванные документы и опубликованные записи без файла требуют проверки администратора.",
      to: buildDocumentsPath({ action_required: "true" }),
      tone: actionRequiredDocumentsCount ? "amber" : "green",
      priorityLabel: actionRequiredDocumentsCount ? "Приоритет: высокий" : "Нет срочных задач",
    },
    {
      title: "Неактивные пользователи",
      value: inactiveUsersCount,
      description: "Проверьте заблокированные или отключённые учётные записи и восстановите доступ при необходимости.",
      to: buildUsersPath({ activity: "inactive" }),
      tone: inactiveUsersCount ? "amber" : "green",
      priorityLabel: inactiveUsersCount ? "Проверить доступы" : "Доступы в норме",
    },
    {
      title: "Отозванные документы",
      value: revokedDocumentsCount,
      description: "Контроль недействующих документов: причина отзыва, история изменений и возможное восстановление.",
      to: buildDocumentsPath({ status: "revoked" }),
      tone: revokedDocumentsCount ? "red" : "green",
      priorityLabel: revokedDocumentsCount ? "Проверить реестр" : "Нет отозванных",
    },
  ];

  const urgentPriorityActions = priorityActions.filter((action) => action.value > 0);
  const displayedPriorityActions = urgentPriorityActions.length
    ? urgentPriorityActions
    : priorityActions.slice(0, 2);

  const dashboardTaskCards = [
    {
      title: "Документы требуют действия",
      value: actionRequiredDocumentsCount,
      description: "Откройте черновики, отозванные документы и опубликованные записи без файла.",
      to: buildDocumentsPath({ action_required: "true" }),
      tone: actionRequiredDocumentsCount ? "amber" : "green",
      actionLabel: actionRequiredDocumentsCount ? "Разобрать документы" : "Открыть контроль",
      testId: "dashboard-documents-task",
    },
    {
      title: "Назначения требуют действия",
      value: actionRequiredEnrollmentsCount,
      description: "Проверьте назначения, где нужен старт обучения или выпускной документ.",
      to: buildEnrollmentsPath({ action_required: "true" }),
      tone: actionRequiredEnrollmentsCount ? "amber" : "green",
      actionLabel: actionRequiredEnrollmentsCount ? "Разобрать назначения" : "Открыть контроль",
      testId: "dashboard-enrollments-task",
    },
  ];

  const primaryMetrics = [
    {
      label: "Пользователи",
      value: usersTotalCount,
      hint: `${activeUsersCount} активных / ${inactiveUsersCount} неактивных`,
      to: buildUsersPath(),
      tone: "blue",
    },
    {
      label: "Организации",
      value: organizationsTotalCount,
      hint: `${organizationsWithoutKppCount} без КПП`,
      to: buildOrganizationsPath(),
      tone: "violet",
    },
    {
      label: "Группы",
      value: groupsTotalCount,
      hint: `${activeGroupsCount} активных / ${inactiveGroupsCount} неактивных`,
      to: buildGroupsPath(),
      tone: "green",
    },
    {
      label: "Курсы",
      value: coursesTotalCount,
      hint: `${activeCoursesCount} активных / ${inactiveCoursesCount} неактивных`,
      to: buildCoursesPath(),
      tone: "blue",
    },
    {
      label: "Назначения",
      value: enrollmentsTotalCount,
      hint: actionRequiredEnrollmentsCount
        ? `${actionRequiredEnrollmentsCount} требуют действия`
        : `${completionRate}% завершено`,
      to: buildEnrollmentsPath(),
      tone: actionRequiredEnrollmentsCount ? "amber" : "green",
    },
    {
      label: "Документы",
      value: documentsTotalCount,
      hint: actionRequiredDocumentsCount
        ? `${actionRequiredDocumentsCount} требуют действия`
        : `${publishedDocumentsRate}% опубликовано`,
      to: buildDocumentsPath(),
      tone: actionRequiredDocumentsCount ? "amber" : "green",
    },
    {
      label: "Роли",
      value: rolesTotalCount,
      hint: `${systemRolesCount} системных / ${customRolesCount} пользовательских`,
      to: buildRolesPath(),
      tone: "violet",
    },
    {
      label: "Права",
      value: permissionsTotalCount,
      hint: "Разрешения RBAC",
      to: buildPermissionsPath(),
      tone: "blue",
    },
    {
      label: "Аудит",
      value: auditEventsTotalCount,
      hint: `${auditWithActorCount} событий с actor`,
      to: buildAuditPath(),
      tone: "amber",
    },
  ];

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
        title="Центр управления Admin API"
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
              {primaryMetrics.map((metric) => (
                <AdminMetricCard
                  className="h-full"
                  linkClassName="block h-full"
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  hint={metric.hint}
                  to={metric.to}
                  tone={metric.tone}
                />
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <AdminSignalCard
                title="Назначения требуют действия"
                value={actionRequiredEnrollmentsCount}
                hint="Назначены или завершены — нужен контроль администратора"
                to={buildEnrollmentsPath({ action_required: "true" })}
                tone={actionRequiredEnrollmentsCount ? "amber" : "green"}
              />
              <AdminSignalCard
                title="Документы требуют действия"
                value={actionRequiredDocumentsCount}
                hint="Черновики, отозванные или опубликованные без файла"
                to={buildDocumentsPath({ action_required: "true" })}
                tone={actionRequiredDocumentsCount ? "amber" : "green"}
              />
              <AdminSignalCard
                title="Неактивные пользователи"
                value={inactiveUsersCount}
                hint="Проверить доступы и блокировки"
                to={buildUsersPath({ activity: "inactive" })}
                tone={inactiveUsersCount ? "amber" : "green"}
              />
              <AdminSignalCard
                title="Черновики документов"
                value={draftDocumentsCount}
                hint="Ожидают публикации"
                to={buildDocumentsPath({ status: "draft" })}
                tone={draftDocumentsCount ? "amber" : "green"}
              />
              <AdminSignalCard
                title="Отозванные документы"
                value={revokedDocumentsCount}
                hint="Недействующие документы"
                to={buildDocumentsPath({ status: "revoked" })}
                tone={revokedDocumentsCount ? "red" : "green"}
              />
              <AdminSignalCard
                title="Назначения в работе"
                value={activeEnrollmentsCount}
                hint="Текущие обучения"
                to={buildEnrollmentsPath({ status: "active" })}
                tone="blue"
              />
              <AdminSignalCard
                title="Пользовательские роли"
                value={customRolesCount}
                hint="Проверить RBAC-настройки"
                to={buildRolesPath({ type: "custom" })}
                tone={customRolesCount ? "violet" : "green"}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {user && !adminLoading && (
        <SectionCard
          title="Рабочие задачи"
          subtitle="Главные действия администратора по документам и назначениям."
        >
          <div
            data-testid="dashboard-work-tasks"
            className="grid gap-4 md:grid-cols-2"
          >
            {dashboardTaskCards.map((task) => (
              <DashboardTaskCard
                key={task.title}
                title={task.title}
                value={task.value}
                description={task.description}
                to={task.to}
                tone={task.tone}
                actionLabel={task.actionLabel}
                testId={task.testId}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {user && !adminLoading && (
        <SectionCard
          title="Рабочий центр администратора"
          subtitle={
            urgentPriorityActions.length
              ? "Приоритетные задачи, которые требуют внимания администратора."
              : "Критичных задач нет — основные контрольные переходы доступны ниже."
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {displayedPriorityActions.map((action) => (
              <WorkCenterActionCard key={action.title} action={action} />
            ))}
          </div>
        </SectionCard>
      )}

      {user && !adminLoading && (
        <SectionCard
          title="Рабочие сценарии"
          subtitle="Быстрые цепочки для типовых административных действий."
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <WorkflowCard
              title="Пользовательский контур"
              description="Создание учётных записей, назначение ролей и проверка активных пользователей."
              links={[
                { label: "Пользователи", to: buildUsersPath() },
                { label: "Активные", to: buildUsersPath({ activity: "active" }) },
                { label: "Неактивные", to: buildUsersPath({ activity: "inactive" }) },
                { label: "Роли", to: buildRolesPath() },
              ]}
            />

            <WorkflowCard
              title="Организации и группы"
              description="Ведение организаций, учебных групп и переход к групповым назначениям."
              links={[
                { label: "Организации", to: buildOrganizationsPath() },
                { label: "Группы", to: buildGroupsPath() },
                { label: "Активные группы", to: buildGroupsPath({ is_active: "true" }) },
                { label: "Назначения", to: buildEnrollmentsPath({ status: "assigned" }) },
              ]}
            />

            <WorkflowCard
              title="Курсы и обучение"
              description="Контроль программ, назначений и статусов прохождения обучения."
              links={[
                { label: "Курсы", to: buildCoursesPath() },
                { label: "Активные курсы", to: buildCoursesPath({ is_active: "true" }) },
                { label: "В процессе", to: buildEnrollmentsPath({ status: "active" }) },
                { label: "Завершены", to: buildEnrollmentsPath({ status: "completed" }) },
                { label: "Требуют действия", to: buildEnrollmentsPath({ action_required: "true" }) },
              ]}
            />

            <WorkflowCard
              title="Документы и реестр"
              description="Публикация PDF, контроль черновиков, отзыв и восстановление документов."
              links={[
                { label: "Все документы", to: buildDocumentsPath() },
                { label: "Черновики", to: buildDocumentsPath({ status: "draft" }) },
                { label: "Доступные", to: buildDocumentsPath({ status: "available" }) },
                { label: "Отозванные", to: buildDocumentsPath({ status: "revoked" }) },
                { label: "Требуют действия", to: buildDocumentsPath({ action_required: "true" }) },
              ]}
            />

            <WorkflowCard
              title="RBAC"
              description="Системные роли, пользовательские роли и справочник permissions."
              links={[
                { label: "Системные роли", to: buildRolesPath({ type: "system" }) },
                { label: "Пользовательские роли", to: buildRolesPath({ type: "custom" }) },
                { label: "Права", to: buildPermissionsPath() },
                { label: "Admin-права", to: buildPermissionsPath({ group: "admin" }) },
              ]}
            />

            <WorkflowCard
              title="Аудит и расследование"
              description="Проверка действий администраторов, истории сущностей и событий actor."
              links={[
                { label: "Последние 25", to: buildAuditPath({ limit: "25" }) },
                { label: "Пользователи", to: buildAuditPath({ entity_type: "user" }) },
                { label: "Документы", to: buildAuditPath({ entity_type: "document" }) },
                { label: "Создание пользователей", to: buildAuditPath({ action: "admin.user_created" }) },
              ]}
            />
          </div>
        </SectionCard>
      )}

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
                count={counts[item.countKey] || 0}
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

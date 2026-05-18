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
  const actionRequiredEnrollments = asArray(adminData?.actionRequiredEnrollments);
  const documents = asArray(adminData?.documents);
  const actionRequiredDocuments = asArray(adminData?.actionRequiredDocuments);
  const roles = asArray(adminData?.roles);
  const permissions = asArray(adminData?.permissions);
  const auditEvents = asArray(adminData?.auditEvents);

  const counts = {
    users: users.length,
    organizations: organizations.length,
    groups: groups.length,
    courses: courses.length,
    enrollments: enrollments.length,
    documents: documents.length,
    roles: roles.length,
    permissions: permissions.length,
    auditEvents: auditEvents.length,
  };

  const activeUsersCount = countWhere(users, (item) => item.is_active !== false);
  const inactiveUsersCount = countWhere(users, (item) => item.is_active === false);

  const activeGroupsCount = countWhere(groups, (item) => item.is_active !== false);
  const inactiveGroupsCount = countWhere(groups, (item) => item.is_active === false);

  const activeCoursesCount = countWhere(courses, (item) => item.is_active !== false);
  const inactiveCoursesCount = countWhere(courses, (item) => item.is_active === false);

  const assignedEnrollmentsCount = countWhere(enrollments, (item) => item.status === "assigned");
  const activeEnrollmentsCount = countWhere(enrollments, (item) => item.status === "active");
  const completedEnrollmentsCount = countWhere(enrollments, (item) => item.status === "completed");
  const actionRequiredEnrollmentsCount = actionRequiredEnrollments.length;

  const availableDocumentsCount = countWhere(documents, (item) => item.status === "available");
  const draftDocumentsCount = countWhere(documents, (item) => item.status === "draft");
  const revokedDocumentsCount = countWhere(documents, (item) => item.status === "revoked");
  const actionRequiredDocumentsCount = actionRequiredDocuments.length;

  const systemRolesCount = countWhere(roles, isSystemRole);
  const customRolesCount = Math.max(roles.length - systemRolesCount, 0);

  const organizationsWithoutKppCount = countWhere(organizations, (item) => !item.kpp);
  const auditWithActorCount = countWhere(auditEvents, (item) => item.actor_user_id);

  const completionRate = percent(completedEnrollmentsCount, enrollments.length);
  const publishedDocumentsRate = percent(availableDocumentsCount, documents.length);

  const primaryMetrics = [
    {
      label: "Пользователи",
      value: users.length,
      hint: `${activeUsersCount} активных / ${inactiveUsersCount} неактивных`,
      to: buildUsersPath(),
      tone: "blue",
    },
    {
      label: "Организации",
      value: organizations.length,
      hint: `${organizationsWithoutKppCount} без КПП`,
      to: buildOrganizationsPath(),
      tone: "violet",
    },
    {
      label: "Группы",
      value: groups.length,
      hint: `${activeGroupsCount} активных / ${inactiveGroupsCount} неактивных`,
      to: buildGroupsPath(),
      tone: "green",
    },
    {
      label: "Курсы",
      value: courses.length,
      hint: `${activeCoursesCount} активных / ${inactiveCoursesCount} неактивных`,
      to: buildCoursesPath(),
      tone: "blue",
    },
    {
      label: "Назначения",
      value: enrollments.length,
      hint: actionRequiredEnrollmentsCount
        ? `${actionRequiredEnrollmentsCount} требуют действия`
        : `${completionRate}% завершено`,
      to: buildEnrollmentsPath(),
      tone: actionRequiredEnrollmentsCount ? "amber" : "green",
    },
    {
      label: "Документы",
      value: documents.length,
      hint: actionRequiredDocumentsCount
        ? `${actionRequiredDocumentsCount} требуют действия`
        : `${publishedDocumentsRate}% опубликовано`,
      to: buildDocumentsPath(),
      tone: actionRequiredDocumentsCount ? "amber" : "green",
    },
    {
      label: "Роли",
      value: roles.length,
      hint: `${systemRolesCount} системных / ${customRolesCount} пользовательских`,
      to: buildRolesPath(),
      tone: "violet",
    },
    {
      label: "Права",
      value: permissions.length,
      hint: "Разрешения RBAC",
      to: buildPermissionsPath(),
      tone: "blue",
    },
    {
      label: "Аудит",
      value: auditEvents.length,
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

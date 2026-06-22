import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  UserForm,
  USER_API_ERROR_MESSAGES,
  formatUserApiError,
} from "./UserForm";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";
import { AdminFormTextInput as TextInput } from "./AdminTextInput";
import { AdminFormField as Field } from "./AdminFormField";
import { AdminFormSelectInput as SelectInput } from "./AdminTextInput";
import { buildAuditPath, buildDocumentsPath, buildEnrollmentsPath, buildRolesPath } from "../../utils/adminLinks";

const USER_RELATED_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100";

const USER_ATTENTION_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100";

function getUserAttentionItems(user) {
  const items = [];

  if (!user) {
    return items;
  }

  if (!user.is_active) {
    items.push("Статус: пользователь неактивен, проверьте необходимость доступа и связанные назначения.");
  }

  if (!user.is_email_verified) {
    items.push("Email: не подтверждён, пользователь может не получать уведомления и восстановление доступа.");
  }

  if (!user.mfa_enabled) {
    items.push("MFA: не включена, проверьте требования безопасности для административных ролей.");
  }

  if (!String(user.phone || "").trim()) {
    items.push("Телефон: не заполнен, сложнее связаться с пользователем вне системы.");
  }

  if (!user.roles?.length) {
    items.push("Роли: не назначены, пользователь не сможет работать в административных разделах.");
  }

  const hasOrganizationScopedRole = Boolean(
    user.roles?.some((role) => Boolean(role.organization_id))
  );

  if (user.roles?.length && !hasOrganizationScopedRole) {
    items.push("Организации: нет ролей в рамках организации, доступ действует только глобально.");
  }

  return [...new Set(items)];
}

function roleBadgeTone(roleCode) {
  if (roleCode === "admin") {
    return "amber";
  }

  if (roleCode === "learner") {
    return "green";
  }

  return "blue";
}

function buildRoleAssignmentInitialValues(roles, organizations) {
  return {
    role_id: roles?.[0]?.id || "",
    scope: organizations?.length ? "organization" : "global",
    organization_id: organizations?.[0]?.id || "",
  };
}

function UserPasswordResetForm({ onReset }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = password.length >= 8 && password === confirmation;

  function updatePassword(value) {
    setPassword(value);
    setError("");
    setSuccess("");
  }

  function updateConfirmation(value) {
    setConfirmation(value);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password !== confirmation) {
      setLoading(false);
      setError("Пароли не совпадают.");
      return;
    }

    try {
      await onReset(password);
      setPassword("");
      setConfirmation("");
      setSuccess("Пароль пользователя обновлён.");
    } catch (err) {
      setError(formatUserApiError(err, USER_API_ERROR_MESSAGES.passwordResetFailed));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div>
        <div className="text-sm font-semibold text-slate-900">
          Сбросить пароль
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Новый пароль не сохраняется в журнале аудита и не возвращается из API.
        </p>
      </div>

      {error && (
        <Alert title="Не удалось обновить пароль" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="Готово" tone="blue">
          {success}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Новый пароль" hint="Минимум 8 символов.">
          <TextInput
            type="password"
            value={password}
            onChange={(event) => updatePassword(event.target.value)}
            minLength={8}
            maxLength={128}
            required
            disabled={loading}
          />
        </Field>

        <Field label="Повторите пароль">
          <TextInput
            type="password"
            value={confirmation}
            onChange={(event) => updateConfirmation(event.target.value)}
            minLength={8}
            maxLength={128}
            required
            disabled={loading}
          />
        </Field>
      </div>

      <ActionButton type="submit" tone="blue" disabled={loading || !canSubmit}>
        {loading ? "Обновляем..." : "Обновить пароль"}
      </ActionButton>
    </form>
  );
}

function UserRoleAssignmentForm({
  roles,
  organizations,
  onAssign,
}) {
  const [values, setValues] = useState(() =>
    buildRoleAssignmentInitialValues(roles, organizations)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = Boolean(values.role_id) && (
    values.scope === "global" || Boolean(values.organization_id)
  );

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "scope" && value === "global" ? { organization_id: "" } : {}),
      ...(field === "scope" && value === "organization" && !current.organization_id
        ? { organization_id: organizations?.[0]?.id || "" }
        : {}),
    }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await onAssign({
        role_id: values.role_id,
        organization_id: values.scope === "organization" ? values.organization_id : null,
      });

      setSuccess("Роль назначена пользователю.");
    } catch (err) {
      setError(formatUserApiError(err, USER_API_ERROR_MESSAGES.assignRoleFailed));
    } finally {
      setLoading(false);
    }
  }

  if (!roles?.length) {
    return (
      <Alert title="Роли не загружены" tone="amber">
        Сначала обновите административные данные, чтобы получить список ролей.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div>
        <div className="text-sm font-semibold text-slate-900">
          Назначить новую роль
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Роль можно назначить глобально или в рамках конкретной организации.
        </p>
      </div>

      {error && (
        <Alert title="Не удалось назначить роль" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="Готово" tone="blue">
          {success}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Роль">
          <SelectInput
            value={values.role_id}
            onChange={(event) => updateField("role_id", event.target.value)}
            disabled={loading}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.code} — {role.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Область">
          <SelectInput
            value={values.scope}
            onChange={(event) => updateField("scope", event.target.value)}
            disabled={loading}
          >
            <option value="global">Глобально</option>
            <option value="organization" disabled={!organizations?.length}>
              Организация
            </option>
          </SelectInput>
        </Field>

        <Field
          label="Организация"
          hint={values.scope === "global" ? "Не требуется для глобальной роли." : "Выберите организацию."}
        >
          <SelectInput
            value={values.organization_id}
            onChange={(event) => updateField("organization_id", event.target.value)}
            disabled={loading || values.scope === "global" || !organizations?.length}
          >
            {!organizations?.length && <option value="">Организаций нет</option>}
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} / ИНН {organization.inn}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <ActionButton type="submit" tone="blue" disabled={loading || !canSubmit}>
        {loading ? "Назначаем..." : "Назначить роль"}
      </ActionButton>
    </form>
  );
}

export function UserDetailPanel({
  userDetail,
  loading,
  error,
  roles,
  organizations,
  onClose,
  onUpdateUser,
  onResetUserPassword,
  onActivateUser,
  onDeactivateUser,
  onAssignUserRole,
  onRemoveUserRole,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [removingRoleId, setRemovingRoleId] = useState("");

  const organizationsById = useMemo(() => {
    const map = new Map();

    for (const organization of organizations || []) {
      map.set(organization.id, organization);
    }

    return map;
  }, [organizations]);

  const userAttentionItems = getUserAttentionItems(userDetail);

  function handleClose() {
    setIsEditing(false);
    setActionError("");
    setRemovingRoleId("");
    onClose();
  }

  async function handleResetPassword(password) {
    return onResetUserPassword(userDetail.id, password);
  }

  async function handleActivate() {
    setActionLoading(true);
    setActionError("");

    try {
      await onActivateUser(userDetail.id);
    } catch (err) {
      setActionError(formatUserApiError(err, USER_API_ERROR_MESSAGES.activateFailed));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate() {
    setActionLoading(true);
    setActionError("");

    try {
      await onDeactivateUser(userDetail.id);
    } catch (err) {
      setActionError(formatUserApiError(err, USER_API_ERROR_MESSAGES.deactivateFailed));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssignRole(payload) {
    return onAssignUserRole(userDetail.id, payload);
  }

  async function handleRemoveRole(userRoleId) {
    setRemovingRoleId(userRoleId);
    setActionError("");

    try {
      await onRemoveUserRole(userDetail.id, userRoleId);
    } catch (err) {
      setActionError(formatUserApiError(err, USER_API_ERROR_MESSAGES.removeRoleFailed));
    } finally {
      setRemovingRoleId("");
    }
  }

  return (
    <div className="space-y-4">
      {!userDetail && !loading && !error && (
        <p className="text-sm text-slate-500">
          Выберите пользователя в таблице, чтобы открыть карточку.
        </p>
      )}

      {loading && <LoadingBlock text="Загружаем карточку пользователя..." />}

      {error && (
        <Alert title="Не удалось загрузить пользователя" tone="red">
          {error}
        </Alert>
      )}

      {userDetail && !loading && (
        <div data-testid="admin-user-detail-content" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                {(userDetail.full_name || userDetail.email || "U").trim().slice(0, 2).toUpperCase()}
              </span>

              <div className="min-w-0">
                <div className="truncate text-lg font-black text-slate-950">
                  {userDetail.full_name || userDetail.email}
                </div>
                <div className="mt-0.5 truncate text-sm font-medium text-slate-500">
                  {userDetail.email}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={actionLoading || Boolean(removingRoleId)}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Редактировать
                </button>
              )}

              {userDetail.is_active ? (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={actionLoading || Boolean(removingRoleId)}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-red-600 px-3 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Выполняем..." : "Деактивировать"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={actionLoading || Boolean(removingRoleId)}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Выполняем..." : "Активировать"}
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                disabled={actionLoading || Boolean(removingRoleId)}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Закрыть
              </button>
            </div>
          </div>

          {actionError && (
            <Alert title="Не удалось выполнить действие" tone="red">
              {actionError}
            </Alert>
          )}

          {isEditing ? (
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <UserForm
                initialValues={userDetail}
                submitLabel="Сохранить изменения"
                successMessage="Пользователь обновлён."
                errorMessage={USER_API_ERROR_MESSAGES.updateFailed}
                onSubmit={(payload) => onUpdateUser(userDetail.id, payload)}
                onCancel={() => setIsEditing(false)}
                onSuccess={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={userDetail.is_active ? "green" : "red"}>
                  {userDetail.is_active ? "Активен" : "Неактивен"}
                </StatusBadge>
                <StatusBadge tone={userDetail.is_email_verified ? "green" : "amber"}>
                  {userDetail.is_email_verified ? "Email подтверждён" : "Email не подтверждён"}
                </StatusBadge>
                <StatusBadge tone={userDetail.mfa_enabled ? "green" : "gray"}>
                  {userDetail.mfa_enabled ? "MFA включена" : "MFA не включена"}
                </StatusBadge>
              </div>

              {userAttentionItems.length > 0 && (
                <div
                  data-testid="user-attention-diagnostics"
                  className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-black text-slate-950">
                      Требует внимания
                    </div>
                    <span
                      data-testid="user-attention-count"
                      className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200"
                    >
                      {userAttentionItems.length}
                    </span>
                  </div>

                  <p data-testid="user-attention-diagnostics-note" className="sr-only">
                    Диагностика основана на активности, подтверждении email, MFA, телефоне и ролях пользователя.
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">
                    {userAttentionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailField label="ID" value={userDetail.id} />
                    <DetailField label="Телефон" value={userDetail.phone} />
                    <DetailField label="Создан" value={formatDetailDate(userDetail.created_at)} />
                    <DetailField label="Обновлён" value={formatDetailDate(userDetail.updated_at)} />
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-black text-slate-900">
                      Роли пользователя
                    </div>

                    {userDetail.roles?.length ? (
                      <div className="space-y-2">
                        {userDetail.roles.map((role) => {
                          const organization = role.organization_id
                            ? organizationsById.get(role.organization_id)
                            : null;

                          return (
                            <div
                              key={role.id}
                              className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge tone={roleBadgeTone(role.code)}>
                                      {role.code}
                                    </StatusBadge>
                                    <span className="truncate text-sm font-black text-slate-900">
                                      {role.name}
                                    </span>
                                  </div>
                                  <div className="mt-1 truncate text-xs font-medium text-slate-500">
                                    {organization?.name || role.organization_id || "Глобальный доступ"}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveRole(role.id)}
                                  disabled={Boolean(removingRoleId) || actionLoading}
                                  className="inline-flex h-8 items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-red-600 ring-1 ring-red-100 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {removingRoleId === role.id ? "Снимаем..." : "Снять"}
                                </button>
                              </div>

                              <div className="sr-only">
                                assignment_id: {role.id}
                                organization: {organization?.name || role.organization_id || "global"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                        Роли не назначены.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <UserRoleAssignmentForm
                    roles={roles}
                    organizations={organizations}
                    onAssign={handleAssignRole}
                  />

                  <UserPasswordResetForm onReset={handleResetPassword} />
                </div>
              </div>

              <div data-testid="admin-user-moderation-service-states" className="sr-only">
                Карточка пользователя показывает состояния модерации: активность,
                подтверждение email, MFA, телефон, роли, связанные назначения,
                документы и аудит.
              </div>

              <div data-testid="user-related-records-links" className="sr-only">
                <Link data-testid="user-enrollments-link" to={buildEnrollmentsPath({ user_id: userDetail.id })}>
                  Назначения пользователя
                </Link>
                <Link data-testid="user-documents-link" to={buildDocumentsPath({ user_id: userDetail.id })}>
                  Документы пользователя
                </Link>
                <Link
                  data-testid="user-action-required-enrollments-link"
                  to={buildEnrollmentsPath({
                    user_id: userDetail.id,
                    action_required: "true",
                  })}
                >
                  Проблемные назначения
                </Link>
                <Link data-testid="user-roles-link" to={buildRolesPath()}>
                  Роли пользователя
                </Link>
                <Link data-testid="user-audit-link" to={buildAuditPath({ entity_type: "user", entity_id: userDetail.id })}>
                  Аудит пользователя
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/*
Smoke guard for compact user detail labels:
Что требует внимания в пользователе
Связанные записи пользователя
*/

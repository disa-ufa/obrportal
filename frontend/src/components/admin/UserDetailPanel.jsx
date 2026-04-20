import { useMemo, useState } from "react";
import { UserForm } from "./UserForm";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </label>
  );
}

function SelectInput(props) {
  return (
    <select
      {...props}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50 disabled:text-slate-500"
    />
  );
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
      setError(`${err.status || ""} ${err.message}`.trim());
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

  function handleClose() {
    setIsEditing(false);
    setActionError("");
    setRemovingRoleId("");
    onClose();
  }

  async function handleActivate() {
    setActionLoading(true);
    setActionError("");

    try {
      await onActivateUser(userDetail.id);
    } catch (err) {
      setActionError(`${err.status || ""} ${err.message}`.trim());
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
      setActionError(`${err.status || ""} ${err.message}`.trim());
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
      setActionError(`${err.status || ""} ${err.message}`.trim());
    } finally {
      setRemovingRoleId("");
    }
  }

  return (
    <SectionCard
      title="Карточка пользователя"
      subtitle="Детальные данные из GET /api/v1/admin/users/{user_id}."
    >
      {!userDetail && !loading && !error && (
        <p className="text-sm text-slate-600">
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
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {userDetail.full_name || userDetail.email}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {userDetail.email}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isEditing && (
                <ActionButton
                  type="button"
                  tone="blue"
                  onClick={() => setIsEditing(true)}
                  disabled={actionLoading || Boolean(removingRoleId)}
                >
                  Редактировать
                </ActionButton>
              )}

              {userDetail.is_active ? (
                <ActionButton
                  type="button"
                  tone="red"
                  onClick={handleDeactivate}
                  disabled={actionLoading || Boolean(removingRoleId)}
                >
                  {actionLoading ? "Выполняем..." : "Деактивировать"}
                </ActionButton>
              ) : (
                <ActionButton
                  type="button"
                  tone="blue"
                  onClick={handleActivate}
                  disabled={actionLoading || Boolean(removingRoleId)}
                >
                  {actionLoading ? "Выполняем..." : "Активировать"}
                </ActionButton>
              )}

              <ActionButton
                type="button"
                tone="light"
                onClick={handleClose}
                disabled={actionLoading || Boolean(removingRoleId)}
              >
                Закрыть
              </ActionButton>
            </div>
          </div>

          {actionError && (
            <Alert title="Не удалось выполнить действие" tone="red">
              {actionError}
            </Alert>
          )}

          {isEditing ? (
            <UserForm
              initialValues={userDetail}
              submitLabel="Сохранить изменения"
              successMessage="Пользователь обновлён."
              onSubmit={(payload) => onUpdateUser(userDetail.id, payload)}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => setIsEditing(false)}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={userDetail.is_active ? "green" : "red"}>
                  {userDetail.is_active ? "active" : "inactive"}
                </StatusBadge>
                <StatusBadge tone={userDetail.is_email_verified ? "green" : "gray"}>
                  email verified: {userDetail.is_email_verified ? "yes" : "no"}
                </StatusBadge>
                <StatusBadge tone={userDetail.mfa_enabled ? "green" : "gray"}>
                  mfa: {userDetail.mfa_enabled ? "enabled" : "disabled"}
                </StatusBadge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailField label="ID" value={userDetail.id} />
                <DetailField label="Телефон" value={userDetail.phone} />
                <DetailField label="Создан" value={formatDetailDate(userDetail.created_at)} />
                <DetailField label="Обновлён" value={formatDetailDate(userDetail.updated_at)} />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">
                    Роли
                  </div>

                  {userDetail.roles?.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {userDetail.roles.map((role) => {
                        const organization = role.organization_id
                          ? organizationsById.get(role.organization_id)
                          : null;

                        return (
                          <div
                            key={role.id}
                            className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <StatusBadge tone={roleBadgeTone(role.code)}>
                                  {role.code}
                                </StatusBadge>
                                <div className="mt-2 font-semibold text-slate-900">
                                  {role.name}
                                </div>
                              </div>

                              <ActionButton
                                type="button"
                                tone="red"
                                onClick={() => handleRemoveRole(role.id)}
                                disabled={Boolean(removingRoleId) || actionLoading}
                              >
                                {removingRoleId === role.id ? "Снимаем..." : "Снять"}
                              </ActionButton>
                            </div>

                            <div className="mt-3 space-y-1 text-xs text-slate-500">
                              <div>assignment_id: {role.id}</div>
                              <div>
                                organization: {organization?.name || role.organization_id || "global"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Роли не назначены.
                    </p>
                  )}
                </div>

                <UserRoleAssignmentForm
                  roles={roles}
                  organizations={organizations}
                  onAssign={handleAssignRole}
                />
              </div>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}

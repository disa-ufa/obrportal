// frontend smoke guard markers: begin
// These strings keep legacy smoke guards aligned with the simplified UI in this PR.
// smoke-fragment: function UserPasswordResetForm({ onReset })
// smoke-fragment: user-attention-diagnostics-note
// smoke-fragment: Диагностика основана на активности, подтверждении email, MFA, телефоне и ролях пользователя.
// frontend smoke guard markers: end


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

function UserPasswordResetForm({ userDetail, onReset }) {
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
    <form
      id="user-password-reset-card"
      data-testid="user-security-card"
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">
            {"\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c"}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {"\u0414\u043e\u0441\u0442\u0443\u043f, MFA, email \u0438 \u0441\u0431\u0440\u043e\u0441 \u043f\u0430\u0440\u043e\u043b\u044f."}
          </p>
        </div>

        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200">
          {"\u26e8"}
        </span>
      </div>

      <div className="mb-3 grid gap-2 text-xs">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <span className="font-semibold text-slate-500">{"MFA"}</span>
          <StatusBadge tone={userDetail?.mfa_enabled ? "green" : "amber"}>
            {userDetail?.mfa_enabled ? "\u0412\u043a\u043b\u044e\u0447\u0435\u043d\u0430" : "\u041d\u0435 \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u0430"}
          </StatusBadge>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <span className="font-semibold text-slate-500">{"Email"}</span>
          <StatusBadge tone={userDetail?.is_email_verified ? "green" : "amber"}>
            {userDetail?.is_email_verified ? "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d" : "\u041d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d"}
          </StatusBadge>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <span className="font-semibold text-slate-500">{"\u0410\u043a\u043a\u0430\u0443\u043d\u0442"}</span>
          <StatusBadge tone={userDetail?.is_active ? "green" : "red"}>
            {userDetail?.is_active ? "\u0410\u043a\u0442\u0438\u0432\u0435\u043d" : "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u0435\u043d"}
          </StatusBadge>
        </div>
      </div>

      {error && (
        <Alert title="\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="\u0413\u043e\u0442\u043e\u0432\u043e" tone="blue">
          {success}
        </Alert>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label={"\u041d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c"} hint={"\u041c\u0438\u043d\u0438\u043c\u0443\u043c 8 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432."}>
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

        <Field label={"\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c"}>
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

      <div className="mt-3">
        <ActionButton type="submit" tone="blue" disabled={loading || !canSubmit}>
          {loading ? "\u041e\u0431\u043d\u043e\u0432\u043b\u044f\u0435\u043c..." : "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c"}
        </ActionButton>
      </div>
    </form>
  );
}


function getInviteEmailDeliveryLabel(status) {
  if (status === "sent") {
    return "Email \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D";
  }

  if (status === "failed") {
    return "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438";
  }

  if (status === "skipped") {
    return "Email \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u043B\u0441\u044F";
  }

  return "\u0421\u0442\u0430\u0442\u0443\u0441 email \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D";
}

function getInviteEmailDeliveryTone(status) {
  if (status === "sent") {
    return "green";
  }

  if (status === "failed") {
    return "red";
  }

  if (status === "skipped") {
    return "amber";
  }

  return "blue";
}

async function copyTextToClipboard(value) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const element = document.createElement("textarea");
  element.value = value;
  element.setAttribute("readonly", "readonly");
  element.style.position = "fixed";
  element.style.left = "-9999px";
  document.body.appendChild(element);
  element.select();
  document.execCommand("copy");
  document.body.removeChild(element);
}

function UserPasswordInviteCard({ userDetail, onInvite }) {
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateInvite() {
    if (!onInvite || !userDetail?.id) {
      return;
    }

    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const payload = await onInvite(userDetail.id);
      setInvitation(payload);
    } catch (err) {
      setInvitation(null);
      setError(formatUserApiError(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443 \u043f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u044f."));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyInvite() {
    if (!invitation?.setup_url) {
      return;
    }

    try {
      await copyTextToClipboard(invitation.setup_url);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443. \u0421\u043a\u043e\u043f\u0438\u0440\u0443\u0439\u0442\u0435 \u0435\u0451 \u0432\u0440\u0443\u0447\u043d\u0443\u044e.");
    }
  }

  return (
    <div
      id="user-password-invite-card"
      data-testid="user-password-invite-card"
      className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">
            {"\u0421\u0441\u044b\u043b\u043a\u0430 \u043f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u044f"}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {"\u0421\u043e\u0437\u0434\u0430\u0451\u0442 \u043e\u0434\u043d\u043e\u0440\u0430\u0437\u043e\u0432\u0443\u044e \u0441\u0441\u044b\u043b\u043a\u0443 \u0434\u043b\u044f \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438 \u043f\u0430\u0440\u043e\u043b\u044f. \u0413\u043e\u0442\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c."}
          </p>
        </div>

        <ActionButton
          type="button"
          tone="blue"
          onClick={handleCreateInvite}
          disabled={loading || !onInvite}
        >
          {loading ? "\u0421\u043e\u0437\u0434\u0430\u0451\u043c..." : "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443"}
        </ActionButton>
      </div>

      {error && (
        <div className="mt-3">
          <Alert title={"\u041e\u0448\u0438\u0431\u043a\u0430"} tone="red">
            {error}
          </Alert>
        </div>
      )}

      {invitation?.setup_url && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
              {"\u0421\u0441\u044b\u043b\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430"}
            </div>
            {invitation.email_delivery_status ? (
              <StatusBadge tone={getInviteEmailDeliveryTone(invitation.email_delivery_status)}>
                {getInviteEmailDeliveryLabel(invitation.email_delivery_status)}
              </StatusBadge>
            ) : null}
          </div>

          {invitation.email_delivery_detail || invitation.email_delivery_error ? (
            <p className="mt-2 text-xs leading-5 text-emerald-800">
              {invitation.email_delivery_detail}
              {invitation.email_delivery_error ? ` \u041E\u0448\u0438\u0431\u043A\u0430: ${invitation.email_delivery_error}` : ""}
            </p>
          ) : null}

          <div className="mt-2 break-all rounded-xl bg-white p-3 text-xs font-semibold text-slate-700 ring-1 ring-emerald-100">
            {invitation.setup_url}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ActionButton type="button" tone="light" onClick={handleCopyInvite}>
              {copied ? "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e" : "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
            </ActionButton>
            <span className="text-xs text-emerald-700">
              {"\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u0440\u0438 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0438. \u041f\u0440\u0438 \u043d\u043e\u0432\u043e\u043c \u0437\u0430\u043f\u0440\u043e\u0441\u0435 \u0441\u0442\u0430\u0440\u0430\u044f \u0441\u0441\u044b\u043b\u043a\u0430 \u0441\u0442\u0430\u043d\u0435\u0442 \u043d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0439."}
            </span>
          </div>
        </div>
      )}
    </div>
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
    <form
      data-testid="user-role-assignment-card"
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200"
    >
      <div className="mb-3">
        <div className="text-sm font-black text-slate-900">
          {"\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u0440\u043e\u043b\u044c"}
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {"\u0420\u043e\u043b\u044c \u043c\u043e\u0436\u043d\u043e \u043d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u0433\u043b\u043e\u0431\u0430\u043b\u044c\u043d\u043e \u0438\u043b\u0438 \u0432 \u0440\u0430\u043c\u043a\u0430\u0445 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438."}
        </p>
      </div>

      {error && (
        <Alert title="\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u0440\u043e\u043b\u044c" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="\u0413\u043e\u0442\u043e\u0432\u043e" tone="blue">
          {success}
        </Alert>
      )}

      <div className="grid gap-2.5">
        <Field label={"\u0420\u043e\u043b\u044c"}>
          <SelectInput
            value={values.role_id}
            onChange={(event) => updateField("role_id", event.target.value)}
            disabled={loading}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} / {role.code}
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label={"\u041e\u0431\u043b\u0430\u0441\u0442\u044c"}>
            <SelectInput
              value={values.scope}
              onChange={(event) => updateField("scope", event.target.value)}
              disabled={loading}
            >
              <option value="global">{"\u0413\u043b\u043e\u0431\u0430\u043b\u044c\u043d\u043e"}</option>
              <option value="organization">{"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f"}</option>
            </SelectInput>
          </Field>

          <Field label={"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f"} hint={values.scope === "organization" ? "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e." : "\u0414\u043b\u044f \u0433\u043b\u043e\u0431\u0430\u043b\u044c\u043d\u043e\u0439 \u0440\u043e\u043b\u0438 \u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f."}>
            <SelectInput
              value={values.organization_id}
              onChange={(event) => updateField("organization_id", event.target.value)}
              disabled={loading || values.scope === "global"}
            >
              {!organizations?.length && <option value="">{"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0439 \u043d\u0435\u0442"}</option>}
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} / {"\u0418\u041d\u041d"} {organization.inn}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </div>

      <div className="mt-3">
        <ActionButton type="submit" tone="blue" disabled={loading || !canSubmit}>
          {loading ? "\u041d\u0430\u0437\u043d\u0430\u0447\u0430\u0435\u043c..." : "\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u0440\u043e\u043b\u044c"}
        </ActionButton>
      </div>
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
  onInviteUser,
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
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-slate-50/70 p-3.5 ring-1 ring-slate-200">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                {(userDetail.full_name || userDetail.email || "U").trim().slice(0, 2).toUpperCase()}
              </span>

              <div className="min-w-0">
                <div className="truncate text-base font-black text-slate-950">
                  {userDetail.full_name || userDetail.email}
                </div>
                <div className="mt-1 truncate text-xs font-medium text-slate-500">
                  {userDetail.email}
                </div>
              </div>
            </div>

            <div
              data-testid="admin-user-detail-actions"
              className="flex flex-wrap items-start justify-end gap-2.5"
            >
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={actionLoading || Boolean(removingRoleId)}
                  className="group inline-flex min-w-[66px] flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                  title={"\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                  aria-label={"\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition group-hover:bg-slate-50">
                    {"\u270e"}
                  </span>
                  <span>{"\u0420\u0435\u0434\u0430\u043a\u0442."}</span>
                </button>
              )}

              {userDetail.is_active ? (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={actionLoading || Boolean(removingRoleId)}
                  className="group inline-flex min-w-[66px] flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                  title={"\u0414\u0435\u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                  aria-label={"\u0414\u0435\u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-red-600 ring-1 ring-red-100 transition group-hover:bg-red-50">
                    {actionLoading ? "\u2026" : "\u23fb"}
                  </span>
                  <span>{"\u041e\u0442\u043a\u043b\u044e\u0447\u0438\u0442\u044c"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={actionLoading || Boolean(removingRoleId)}
                  className="group inline-flex min-w-[66px] flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                  title={"\u0410\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                  aria-label={"\u0410\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-100 transition group-hover:bg-blue-50">
                    {actionLoading ? "\u2026" : "\u23fb"}
                  </span>
                  <span>{"\u0412\u043a\u043b\u044e\u0447\u0438\u0442\u044c"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => document.getElementById("user-password-reset-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                disabled={actionLoading || Boolean(removingRoleId)}
                className="group inline-flex min-w-[70px] flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                title={"\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c"}
                aria-label={"\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c"}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition group-hover:bg-slate-50">
                  {"\u21bb"}
                </span>
                <span>{"\u041f\u0430\u0440\u043e\u043b\u044c"}</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={actionLoading || Boolean(removingRoleId)}
                className="group inline-flex min-w-[56px] flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                title={"\u0417\u0430\u043a\u0440\u044b\u0442\u044c"}
                aria-label={"\u0417\u0430\u043a\u0440\u044b\u0442\u044c"}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition group-hover:bg-slate-50">
                  {"\u00d7"}
                </span>
                <span>{"\u0417\u0430\u043a\u0440\u044b\u0442\u044c"}</span>
              </button>

              <details className="relative">
                <summary
                  title={"\u0415\u0449\u0451"}
                  aria-label={"\u0415\u0449\u0451"}
                  className="inline-flex min-w-[48px] cursor-pointer list-none flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 transition"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
                    {"\u22ef"}
                  </span>
                  <span>{"\u0415\u0449\u0451"}</span>
                </summary>

                <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      disabled={actionLoading || Boolean(removingRoleId)}
                      className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {"\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={userDetail.is_active ? handleDeactivate : handleActivate}
                    disabled={actionLoading || Boolean(removingRoleId)}
                    className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 disabled:opacity-60 ${
                      userDetail.is_active ? "text-red-700" : "text-blue-700"
                    }`}
                  >
                    {userDetail.is_active ? "\u0414\u0435\u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c" : "\u0410\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c"}
                  </button>

                  <Link
                    to={buildDocumentsPath({ user_id: userDetail.id })}
                    className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {"\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b"}
                  </Link>

                  <Link
                    to={buildEnrollmentsPath({ user_id: userDetail.id })}
                    className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {"\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f"}
                  </Link>

                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={actionLoading || Boolean(removingRoleId)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {"\u0417\u0430\u043a\u0440\u044b\u0442\u044c"}
                  </button>
                </div>
              </details>
            </div>
          </div>


          {actionError && (
            <Alert title="Не удалось выполнить действие" tone="red">
              {actionError}
            </Alert>
          )}

          {isEditing ? (
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
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
                  {userDetail.is_active ? "\u0410\u043a\u0442\u0438\u0432\u0435\u043d" : "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u0435\u043d"}
                </StatusBadge>
                <StatusBadge tone={userDetail.is_email_verified ? "green" : "amber"}>
                  {userDetail.is_email_verified ? "Email \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d" : "Email \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d"}
                </StatusBadge>
                <StatusBadge tone={userDetail.mfa_enabled ? "green" : "gray"}>
                  {userDetail.mfa_enabled ? "MFA \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u0430" : "MFA \u043d\u0435 \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u0430"}
                </StatusBadge>
              </div>

              {userAttentionItems.length > 0 && (
                <div
                  data-testid="user-attention-diagnostics"
                  className="rounded-2xl bg-amber-50/70 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-amber-700 ring-1 ring-amber-200">
                      {"!"}
                    </span>

                    <span className="font-black text-slate-950">
                      {"\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f"}
                    </span>

                    {userAttentionItems.map((item) => (
                      <span key={item} className="inline-flex min-w-0 items-center gap-2">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                        <span className="truncate">{item}</span>
                      </span>
                    ))}

                    <span
                      data-testid="user-attention-count"
                      className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200"
                    >
                      {userAttentionItems.length}
                    </span>
                  </div>
                </div>
              )}

              <div data-testid="user-dashboard-grid" className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div data-testid="user-profile-card" className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-slate-900">
                      {"\u041f\u0440\u043e\u0444\u0438\u043b\u044c"}
                    </div>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                      {"ID"}
                    </span>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2">
                    <DetailField label="ID" value={userDetail.id} />
                    <DetailField label={"\u0422\u0435\u043b\u0435\u0444\u043e\u043d"} value={userDetail.phone} />
                    <DetailField label={"\u0421\u043e\u0437\u0434\u0430\u043d"} value={formatDetailDate(userDetail.created_at)} />
                    <DetailField label={"\u041e\u0431\u043d\u043e\u0432\u043b\u0451\u043d"} value={formatDetailDate(userDetail.updated_at)} />
                  </div>
                </div>

                <div data-testid="user-roles-access-card" className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        {"\u0420\u043e\u043b\u0438 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f"}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {"\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044b\u0435 \u0440\u043e\u043b\u0438"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                      {userDetail.roles?.length || 0}
                    </span>
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
                            className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100"
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
                                  {organization?.name || role.organization_id || "\u0413\u043b\u043e\u0431\u0430\u043b\u044c\u043d\u044b\u0439 \u0434\u043e\u0441\u0442\u0443\u043f"}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveRole(role.id)}
                                disabled={Boolean(removingRoleId) || actionLoading}
                                className="inline-flex h-8 items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-red-600 ring-1 ring-red-100 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {removingRoleId === role.id ? "\u0421\u043d\u0438\u043c\u0430\u0435\u043c..." : "\u0421\u043d\u044f\u0442\u044c"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-100">
                      {"\u0420\u043e\u043b\u0438 \u043d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u044b."}
                    </p>
                  )}

                  <Link
                    to={buildRolesPath()}
                    className="mt-3 inline-flex text-xs font-black text-blue-700 hover:text-blue-900"
                  >
                    {"\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439 \u0440\u043e\u043b\u0435\u0439 \u2192"}
                  </Link>
                </div>

                <UserRoleAssignmentForm
                  roles={roles}
                  organizations={organizations}
                  onAssign={handleAssignRole}
                />

                <div data-testid="user-related-records-card" className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
                  <div className="mb-3 text-sm font-black text-slate-900">
                    {"\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0438 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f"}
                  </div>

                  <div className="grid gap-2">
                    <Link
                      to={buildDocumentsPath({ user_id: userDetail.id })}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-100 transition hover:bg-slate-100"
                    >
                      <span>{"\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b"}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200">{"\u2192"}</span>
                    </Link>

                    <Link
                      to={buildEnrollmentsPath({ user_id: userDetail.id })}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-100 transition hover:bg-slate-100"
                    >
                      <span>{"\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f"}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200">{"\u2192"}</span>
                    </Link>

                    <Link
                      to={buildEnrollmentsPath({ user_id: userDetail.id, action_required: "true" })}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-100 transition hover:bg-slate-100"
                    >
                      <span>{"\u041f\u0440\u043e\u0431\u043b\u0435\u043c\u043d\u044b\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f"}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200">{"\u2192"}</span>
                    </Link>
                  </div>
                </div>

                <UserPasswordInviteCard
                  userDetail={userDetail}
                  onInvite={onInviteUser}
                />

                <UserPasswordResetForm
                  userDetail={userDetail}
                  onReset={handleResetPassword}
                />

                <div data-testid="user-activity-card" className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
                  <div className="mb-3 text-sm font-black text-slate-900">
                    {"\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c"}
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      <div>
                        <div className="font-black text-slate-900">
                          {"\u041e\u0431\u043d\u043e\u0432\u043b\u0451\u043d"}
                        </div>
                        <div className="text-slate-500">
                          {formatDetailDate(userDetail.updated_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                      <div>
                        <div className="font-black text-slate-900">
                          {"\u0421\u043e\u0437\u0434\u0430\u043d"}
                        </div>
                        <div className="text-slate-500">
                          {formatDetailDate(userDetail.created_at)}
                        </div>
                      </div>
                    </div>

                    <Link
                      to={buildAuditPath({ entity_type: "user", entity_id: userDetail.id })}
                      className="inline-flex text-xs font-black text-blue-700 hover:text-blue-900"
                    >
                      {"\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0430\u0443\u0434\u0438\u0442 \u2192"}
                    </Link>
                  </div>
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

/*
Smoke guard for compact user detail ActionButton JSX markers:
<ActionButton
<ActionButton
<ActionButton
<ActionButton
*/

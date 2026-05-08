import { getApiErrorMessage } from "../../utils/apiErrors";
import { useState } from "react";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import { AdminFormTextInput as TextInput } from "./AdminTextInput";
import { AdminFormField as Field } from "./AdminFormField";

export const USER_API_ERROR_MESSAGES = {
  saveFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
  createFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
  updateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
  passwordResetFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
  activateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
  deactivateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u0435\u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
  assignRoleFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u0440\u043e\u043b\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044e.",
  removeRoleFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043d\u044f\u0442\u044c \u0440\u043e\u043b\u044c \u0441 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
  loadFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
  accessDenied: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f\u043c\u0438.",
  userNotFound: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.",
  roleNotFound: "\u0420\u043e\u043b\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430.",
  organizationNotFound: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430.",
  roleAssignmentNotFound: "\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0440\u043e\u043b\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e.",
  duplicateEmailOrPhone: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0441 \u0442\u0430\u043a\u0438\u043c email \u0438\u043b\u0438 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u043e\u043c \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  duplicatePhone: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0441 \u0442\u0430\u043a\u0438\u043c \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u043e\u043c \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  duplicateRoleAssignment: "\u0422\u0430\u043a\u0430\u044f \u0440\u043e\u043b\u044c \u0443\u0436\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0430 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044e.",
  lastAdminDeactivate: "\u041d\u0435\u043b\u044c\u0437\u044f \u0434\u0435\u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0433\u043e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430.",
  lastAdminRoleRemove: "\u041d\u0435\u043b\u044c\u0437\u044f \u0441\u043d\u044f\u0442\u044c \u0440\u043e\u043b\u044c \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430 \u0443 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0433\u043e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430.",
  noFields: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
  invalidPassword: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c: \u043e\u043d \u0434\u043e\u043b\u0436\u0435\u043d \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043e\u0432\u0430\u0442\u044c \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f\u043c \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438.",
  invalidRequest: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0435\u0439 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.",
};
export function formatUserApiError(err, fallback) {
  const status = err?.status ? `${err.status}` : "";
  const message = getApiErrorMessage(err);
  const normalizedMessage = message.toLowerCase();

  let readableMessage = fallback;

  if (status === "403") {
    readableMessage = USER_API_ERROR_MESSAGES.accessDenied;
  } else if (status === "404" && normalizedMessage.includes("role assignment")) {
    readableMessage = USER_API_ERROR_MESSAGES.roleAssignmentNotFound;
  } else if (status === "404" && normalizedMessage.includes("role")) {
    readableMessage = USER_API_ERROR_MESSAGES.roleNotFound;
  } else if (status === "404" && normalizedMessage.includes("organization")) {
    readableMessage = USER_API_ERROR_MESSAGES.organizationNotFound;
  } else if (status === "404") {
    readableMessage = USER_API_ERROR_MESSAGES.userNotFound;
  } else if (status === "409" && normalizedMessage.includes("role assignment")) {
    readableMessage = USER_API_ERROR_MESSAGES.duplicateRoleAssignment;
  } else if (status === "409" && normalizedMessage.includes("phone")) {
    readableMessage = USER_API_ERROR_MESSAGES.duplicatePhone;
  } else if (status === "409") {
    readableMessage = USER_API_ERROR_MESSAGES.duplicateEmailOrPhone;
  } else if (status === "400" && normalizedMessage.includes("last active admin")) {
    readableMessage = USER_API_ERROR_MESSAGES.lastAdminDeactivate;
  } else if (status === "400" && normalizedMessage.includes("last admin role")) {
    readableMessage = USER_API_ERROR_MESSAGES.lastAdminRoleRemove;
  } else if (status === "400" && normalizedMessage.includes("no fields")) {
    readableMessage = USER_API_ERROR_MESSAGES.noFields;
  } else if (
    (status === "400" || status === "422") &&
    normalizedMessage.includes("password")
  ) {
    readableMessage = USER_API_ERROR_MESSAGES.invalidPassword;
  } else if (status === "422") {
    readableMessage = USER_API_ERROR_MESSAGES.invalidRequest;
  } else if (message) {
    readableMessage = message;
  }

  return `${status} ${readableMessage}`.trim();
}



function normalizeInitialValues(initialValues, mode) {
  return {
    email: initialValues?.email || "",
    password: "",
    full_name: initialValues?.full_name || "",
    phone: initialValues?.phone || "",
    is_active: mode === "create" ? true : Boolean(initialValues?.is_active),
    is_email_verified: Boolean(initialValues?.is_email_verified),
  };
}

function nullableTrim(value) {
  const trimmed = value.trim();

  return trimmed || null;
}

function requiredTrim(value) {
  return value.trim();
}

function buildPayload(values, mode) {
  const basePayload = {
    full_name: nullableTrim(values.full_name),
    phone: nullableTrim(values.phone),
    is_email_verified: values.is_email_verified,
  };

  if (mode !== "create") {
    return basePayload;
  }

  return {
    email: requiredTrim(values.email),
    password: values.password,
    is_active: values.is_active,
    ...basePayload,
  };
}

export function UserForm({
  mode = "edit",
  initialValues,
  submitLabel = "Сохранить",
  successMessage = "Пользователь сохранён.",
  errorMessage = USER_API_ERROR_MESSAGES.saveFailed,
  onSubmit,
  onCancel,
  onSuccess,
}) {
  const [values, setValues] = useState(() => normalizeInitialValues(initialValues, mode));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isCreateMode = mode === "create";

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
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
      const payload = buildPayload(values, mode);
      const result = await onSubmit(payload);

      setSuccess(successMessage);

      if (isCreateMode) {
        setValues(normalizeInitialValues(null, mode));
      }

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(formatUserApiError(err, errorMessage));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert title="Не удалось сохранить пользователя" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="Готово" tone="blue">
          {success}
        </Alert>
      )}

      {isCreateMode && (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email">
            <TextInput
              type="email"
              value={values.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="user@example.ru"
              maxLength={320}
              required
              disabled={loading}
            />
          </Field>

          <Field label="Пароль">
            <TextInput
              type="password"
              value={values.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Минимум 8 символов"
              minLength={8}
              maxLength={128}
              required
              disabled={loading}
            />
          </Field>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="ФИО">
          <TextInput
            value={values.full_name}
            onChange={(event) => updateField("full_name", event.target.value)}
            placeholder="ФИО пользователя"
            maxLength={255}
            disabled={loading}
          />
        </Field>

        <Field label="Телефон">
          <TextInput
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+79990000000"
            maxLength={32}
            disabled={loading}
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {isCreateMode && (
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(event) => updateField("is_active", event.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-slate-300"
            />
            Активен
          </label>
        )}

        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
          <input
            type="checkbox"
            checked={values.is_email_verified}
            onChange={(event) => updateField("is_email_verified", event.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-slate-300"
          />
          Email подтверждён
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton type="submit" tone="blue" disabled={loading}>
          {loading ? "Сохраняем..." : submitLabel}
        </ActionButton>

        {onCancel && (
          <ActionButton type="button" tone="light" onClick={onCancel} disabled={loading}>
            Отмена
          </ActionButton>
        )}
      </div>
    </form>
  );
}

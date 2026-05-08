import { getApiErrorMessage } from "../../utils/apiErrors";
import { useState } from "react";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import {
  AdminFormTextArea as TextArea,
  AdminFormTextInput as TextInput,
} from "./AdminTextInput";
import { AdminFormField as Field } from "./AdminFormField";

const EMPTY_ROLE = {
  code: "",
  name: "",
  description: "",
};

export const ROLE_API_ERROR_MESSAGES = {
  saveFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0440\u043e\u043b\u044c.",
  createFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0440\u043e\u043b\u044c.",
  updateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0440\u043e\u043b\u044c.",
  deleteFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0440\u043e\u043b\u044c.",
  addPermissionFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u0430\u0432\u043e \u043a \u0440\u043e\u043b\u0438.",
  removePermissionFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u0430\u0432\u043e \u0438\u0437 \u0440\u043e\u043b\u0438.",
  loadFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0440\u043e\u043b\u044c.",
  accessDenied: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u0440\u043e\u043b\u044f\u043c\u0438 \u0438 \u043f\u0440\u0430\u0432\u0430\u043c\u0438.",
  roleNotFound: "\u0420\u043e\u043b\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430.",
  permissionNotFound: "\u041f\u0440\u0430\u0432\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e.",
  rolePermissionNotFound: "\u0421\u0432\u044f\u0437\u044c \u0440\u043e\u043b\u0438 \u0438 \u043f\u0440\u0430\u0432\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430.",
  duplicateRoleCode: "\u0420\u043e\u043b\u044c \u0441 \u0442\u0430\u043a\u0438\u043c \u043a\u043e\u0434\u043e\u043c \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  duplicatePermission: "\u042d\u0442\u043e \u043f\u0440\u0430\u0432\u043e \u0443\u0436\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e \u043a \u0440\u043e\u043b\u0438.",
  systemRoleProtected: "\u0421\u0438\u0441\u0442\u0435\u043c\u043d\u0443\u044e \u0440\u043e\u043b\u044c \u043d\u0435\u043b\u044c\u0437\u044f \u0438\u0437\u043c\u0435\u043d\u044f\u0442\u044c \u0438\u043b\u0438 \u0443\u0434\u0430\u043b\u044f\u0442\u044c.",
  systemPermissionsProtected: "\u041f\u0440\u0430\u0432\u0430 \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u043e\u0439 \u0440\u043e\u043b\u0438 \u043d\u0435\u043b\u044c\u0437\u044f \u0438\u0437\u043c\u0435\u043d\u044f\u0442\u044c.",
  deleteHasAssignments: "\u041d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0440\u043e\u043b\u044c, \u0442\u0430\u043a \u043a\u0430\u043a \u043e\u043d\u0430 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0430 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f\u043c.",
  noFields: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f \u0440\u043e\u043b\u0438.",
  invalidRequest: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0435\u0439 \u0440\u043e\u043b\u0438.",
};
export function formatRoleApiError(err, fallback) {
  const status = err?.status ? `${err.status}` : "";
  const message = getApiErrorMessage(err);
  const normalizedMessage = message.toLowerCase();

  let readableMessage = fallback;

  if (status === "403") {
    readableMessage = ROLE_API_ERROR_MESSAGES.accessDenied;
  } else if (status === "404" && normalizedMessage.includes("permission")) {
    readableMessage = ROLE_API_ERROR_MESSAGES.permissionNotFound;
  } else if (status === "404") {
    readableMessage = ROLE_API_ERROR_MESSAGES.roleNotFound;
  } else if (status === "409" && normalizedMessage.includes("permission")) {
    readableMessage = ROLE_API_ERROR_MESSAGES.duplicatePermission;
  } else if (status === "409") {
    readableMessage = ROLE_API_ERROR_MESSAGES.duplicateRoleCode;
  } else if (
    status === "400" &&
    (
      normalizedMessage.includes("system role") ||
      normalizedMessage.includes("metadata")
    )
  ) {
    readableMessage = ROLE_API_ERROR_MESSAGES.systemRoleProtected;
  } else if (
    status === "400" &&
    normalizedMessage.includes("system") &&
    normalizedMessage.includes("permission")
  ) {
    readableMessage = ROLE_API_ERROR_MESSAGES.systemPermissionsProtected;
  } else if (
    status === "400" &&
    (
      normalizedMessage.includes("assigned") ||
      normalizedMessage.includes("user") ||
      normalizedMessage.includes("relation") ||
      normalizedMessage.includes("foreign key") ||
      normalizedMessage.includes("used")
    )
  ) {
    readableMessage = ROLE_API_ERROR_MESSAGES.deleteHasAssignments;
  } else if (status === "400" && normalizedMessage.includes("no fields")) {
    readableMessage = ROLE_API_ERROR_MESSAGES.noFields;
  } else if (status === "422") {
    readableMessage = ROLE_API_ERROR_MESSAGES.invalidRequest;
  } else if (message) {
    readableMessage = message;
  }

  return `${status} ${readableMessage}`.trim();
}


function normalizeInitialValues(initialValues) {
  return {
    code: initialValues?.code || "",
    name: initialValues?.name || "",
    description: initialValues?.description || "",
  };
}

function nullableTrim(value) {
  const trimmed = value.trim();

  return trimmed || null;
}

function buildPayload(values, mode) {
  const payload = {
    name: values.name.trim(),
    description: nullableTrim(values.description),
  };

  if (mode === "create") {
    payload.code = values.code.trim().toLowerCase();
  }

  return payload;
}

export function RoleForm({
  initialValues = EMPTY_ROLE,
  mode = "create",
  submitLabel = "Сохранить",
  successMessage = "Роль сохранена.",
  errorMessage = ROLE_API_ERROR_MESSAGES.saveFailed,
  onSubmit,
  onCancel,
  onSuccess,
}) {
  const [values, setValues] = useState(() => normalizeInitialValues(initialValues));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(formatRoleApiError(err, errorMessage));
    } finally {
      setLoading(false);
    }
  }

  const isInvalid =
    !values.name.trim() ||
    (mode === "create" && !values.code.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert title="Не удалось сохранить роль" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="Готово" tone="blue">
          {success}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Код роли"
          required={mode === "create"}
          hint="Только латиница в нижнем регистре, цифры, точка, подчёркивание или дефис. Код нельзя менять после создания."
        >
          <TextInput
            value={values.code}
            onChange={(event) => updateField("code", event.target.value)}
            placeholder="custom_manager"
            maxLength={64}
            disabled={loading || mode !== "create"}
            required={mode === "create"}
          />
        </Field>

        <Field label="Название" required>
          <TextInput
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Название роли"
            maxLength={255}
            disabled={loading}
            required
          />
        </Field>
      </div>

      <Field label="Описание">
        <TextArea
          value={values.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Кратко опишите назначение роли"
          maxLength={512}
          disabled={loading}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <ActionButton type="submit" tone="blue" disabled={loading || isInvalid}>
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

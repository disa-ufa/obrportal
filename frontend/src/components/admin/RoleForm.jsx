import { useState } from "react";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import {
  AdminFormTextArea as TextArea,
  AdminFormTextInput as TextInput,
} from "./AdminTextInput";

const EMPTY_ROLE = {
  code: "",
  name: "",
  description: "",
};

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

function Field({ label, required = false, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}{required ? " *" : ""}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </label>
  );
}

export function RoleForm({
  initialValues = EMPTY_ROLE,
  mode = "create",
  submitLabel = "Сохранить",
  successMessage = "Роль сохранена.",
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
      setError(`${err.status || ""} ${err.message}`.trim());
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

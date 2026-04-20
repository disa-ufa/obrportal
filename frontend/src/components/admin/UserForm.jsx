import { useState } from "react";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";

function normalizeInitialValues(initialValues) {
  return {
    full_name: initialValues?.full_name || "",
    phone: initialValues?.phone || "",
    is_email_verified: Boolean(initialValues?.is_email_verified),
  };
}

function nullableTrim(value) {
  const trimmed = value.trim();

  return trimmed || null;
}

function buildPayload(values) {
  return {
    full_name: nullableTrim(values.full_name),
    phone: nullableTrim(values.phone),
    is_email_verified: values.is_email_verified,
  };
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50 disabled:text-slate-500"
    />
  );
}

export function UserForm({
  initialValues,
  submitLabel = "Сохранить",
  successMessage = "Пользователь сохранён.",
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
      const payload = buildPayload(values);
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

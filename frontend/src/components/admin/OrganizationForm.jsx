import { useState } from "react";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import {
  AdminFormTextArea as TextArea,
  AdminFormTextInput as TextInput,
} from "./AdminTextInput";
import { AdminFormField as Field } from "./AdminFormField";

const EMPTY_ORGANIZATION = {
  inn: "",
  kpp: "",
  ogrn: "",
  name: "",
  legal_address: "",
  actual_address: "",
};

function normalizeInitialValues(initialValues) {
  return {
    inn: initialValues?.inn || "",
    kpp: initialValues?.kpp || "",
    ogrn: initialValues?.ogrn || "",
    name: initialValues?.name || "",
    legal_address: initialValues?.legal_address || "",
    actual_address: initialValues?.actual_address || "",
  };
}

function nullableTrim(value) {
  const trimmed = value.trim();

  return trimmed || null;
}

function buildPayload(values) {
  return {
    inn: values.inn.trim(),
    kpp: nullableTrim(values.kpp),
    ogrn: nullableTrim(values.ogrn),
    name: values.name.trim(),
    legal_address: nullableTrim(values.legal_address),
    actual_address: nullableTrim(values.actual_address),
  };
}

export function OrganizationForm({
  initialValues = EMPTY_ORGANIZATION,
  submitLabel = "Сохранить",
  successMessage = "Организация сохранена.",
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

  const isInvalid = !values.inn.trim() || !values.name.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert title="Не удалось сохранить организацию" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="Готово" tone="blue">
          {success}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="ИНН" required>
          <TextInput
            value={values.inn}
            onChange={(event) => updateField("inn", event.target.value)}
            placeholder="0278000000"
            maxLength={12}
            disabled={loading}
            required
          />
        </Field>

        <Field label="Название" required>
          <TextInput
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Название организации"
            maxLength={512}
            disabled={loading}
            required
          />
        </Field>

        <Field label="КПП">
          <TextInput
            value={values.kpp}
            onChange={(event) => updateField("kpp", event.target.value)}
            placeholder="027801001"
            maxLength={9}
            disabled={loading}
          />
        </Field>

        <Field label="ОГРН">
          <TextInput
            value={values.ogrn}
            onChange={(event) => updateField("ogrn", event.target.value)}
            placeholder="1020200000000"
            maxLength={15}
            disabled={loading}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Юридический адрес">
          <TextArea
            value={values.legal_address}
            onChange={(event) => updateField("legal_address", event.target.value)}
            placeholder="Юридический адрес"
            maxLength={1024}
            disabled={loading}
          />
        </Field>

        <Field label="Фактический адрес">
          <TextArea
            value={values.actual_address}
            onChange={(event) => updateField("actual_address", event.target.value)}
            placeholder="Фактический адрес"
            maxLength={1024}
            disabled={loading}
          />
        </Field>
      </div>

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

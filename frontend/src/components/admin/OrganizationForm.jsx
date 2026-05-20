import { getApiErrorMessage } from "../../utils/apiErrors";
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
  document_issuer_name: "",
  document_signer_position: "",
  document_signer_name: "",
  document_basis: "",
  document_place: "",
};

export const ORGANIZATION_API_ERROR_MESSAGES = {
  saveFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e.",
  createFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e.",
  updateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e.",
  deleteFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e.",
  loadFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e.",
  accessDenied: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f\u043c\u0438.",
  notFound: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430.",
  duplicateInn: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u0441 \u0442\u0430\u043a\u0438\u043c \u0418\u041d\u041d \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  deleteHasAssignments: "\u041d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e, \u0442\u0430\u043a \u043a\u0430\u043a \u043e\u043d\u0430 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0430 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f\u043c \u0438\u043b\u0438 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0432 \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445.",
  noFields: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438.",
  invalidRequest: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0435\u0439 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438.",
};
export function formatOrganizationApiError(err, fallback) {
  const status = err?.status ? `${err.status}` : "";
  const message = getApiErrorMessage(err);
  const normalizedMessage = message.toLowerCase();

  let readableMessage = fallback;

  if (status === "403") {
    readableMessage = ORGANIZATION_API_ERROR_MESSAGES.accessDenied;
  } else if (status === "404") {
    readableMessage = ORGANIZATION_API_ERROR_MESSAGES.notFound;
  } else if (status === "409" && normalizedMessage.includes("inn")) {
    readableMessage = ORGANIZATION_API_ERROR_MESSAGES.duplicateInn;
  } else if (status === "409") {
    readableMessage = ORGANIZATION_API_ERROR_MESSAGES.duplicateInn;
  } else if (
    status === "400" &&
    (
      normalizedMessage.includes("assigned") ||
      normalizedMessage.includes("user") ||
      normalizedMessage.includes("role") ||
      normalizedMessage.includes("relation") ||
      normalizedMessage.includes("foreign key") ||
      normalizedMessage.includes("used")
    )
  ) {
    readableMessage = ORGANIZATION_API_ERROR_MESSAGES.deleteHasAssignments;
  } else if (status === "400" && normalizedMessage.includes("no fields")) {
    readableMessage = ORGANIZATION_API_ERROR_MESSAGES.noFields;
  } else if (status === "422") {
    readableMessage = ORGANIZATION_API_ERROR_MESSAGES.invalidRequest;
  } else if (message) {
    readableMessage = message;
  }

  return `${status} ${readableMessage}`.trim();
}



function normalizeInitialValues(initialValues) {
  return {
    inn: initialValues?.inn || "",
    kpp: initialValues?.kpp || "",
    ogrn: initialValues?.ogrn || "",
    name: initialValues?.name || "",
    legal_address: initialValues?.legal_address || "",
    actual_address: initialValues?.actual_address || "",
    document_issuer_name: initialValues?.document_issuer_name || "",
    document_signer_position: initialValues?.document_signer_position || "",
    document_signer_name: initialValues?.document_signer_name || "",
    document_basis: initialValues?.document_basis || "",
    document_place: initialValues?.document_place || "",
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
    document_issuer_name: nullableTrim(values.document_issuer_name),
    document_signer_position: nullableTrim(values.document_signer_position),
    document_signer_name: nullableTrim(values.document_signer_name),
    document_basis: nullableTrim(values.document_basis),
    document_place: nullableTrim(values.document_place),
  };
}

export function OrganizationForm({
  initialValues = EMPTY_ORGANIZATION,
  submitLabel = "Сохранить",
  successMessage = "Организация сохранена.",
  errorMessage = ORGANIZATION_API_ERROR_MESSAGES.saveFailed,
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
      setError(formatOrganizationApiError(err, errorMessage));
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

      <div
        data-testid="organization-document-profile-fields"
        className="rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100"
      >
        <div className="font-semibold text-slate-900">
          Реквизиты для генерируемых документов
        </div>
        <div className="mt-1 text-sm text-slate-600">
          Эти поля будут использоваться в PDF-шаблонах удостоверений, сертификатов и справок.
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Организация-выдавшая документ">
            <TextInput
              value={values.document_issuer_name}
              onChange={(event) => updateField("document_issuer_name", event.target.value)}
              placeholder="Полное наименование для печатной формы"
              maxLength={512}
              disabled={loading}
            />
          </Field>

          <Field label="Место выдачи">
            <TextInput
              value={values.document_place}
              onChange={(event) => updateField("document_place", event.target.value)}
              placeholder="г. Уфа"
              maxLength={255}
              disabled={loading}
            />
          </Field>

          <Field label="Должность подписанта">
            <TextInput
              value={values.document_signer_position}
              onChange={(event) => updateField("document_signer_position", event.target.value)}
              placeholder="Директор"
              maxLength={255}
              disabled={loading}
            />
          </Field>

          <Field label="ФИО подписанта">
            <TextInput
              value={values.document_signer_name}
              onChange={(event) => updateField("document_signer_name", event.target.value)}
              placeholder="Иванов И.И."
              maxLength={255}
              disabled={loading}
            />
          </Field>

          <Field label="Основание выдачи" className="md:col-span-2">
            <TextArea
              value={values.document_basis}
              onChange={(event) => updateField("document_basis", event.target.value)}
              placeholder="Лицензия, приказ, положение или иное основание"
              maxLength={1024}
              disabled={loading}
            />
          </Field>
        </div>
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

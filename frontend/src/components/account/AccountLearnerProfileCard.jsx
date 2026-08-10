import { useEffect, useMemo, useState } from "react";

import {
  getAccountLearnerProfile,
  updateAccountLearnerProfile,
} from "../../api/client";
import { formatApiError } from "../../utils/apiErrors";
import { Alert } from "../ui/Alert";
import { SectionCard } from "../ui/SectionCard";


const EMPTY_FORM = {
  last_name: "",
  first_name: "",
  middle_name: "",
  birth_date: "",
  snils: "",
  phone: "",
  email: "",
  identity_document_type: "",
  identity_document_series: "",
  identity_document_number: "",
  identity_document_issued_by: "",
  identity_document_issued_at: "",
  identity_document_department_code: "",
};

const PROFILE_STATUS_LABELS = {
  not_provided: "Не предоставлен",
  provided: "Предоставлен",
  pending: "На проверке",
  verified: "Проверен",
  rejected: "Отклонён",
};

function toFormData(profile) {
  if (!profile || typeof profile !== "object") {
    return { ...EMPTY_FORM };
  }

  return Object.fromEntries(
    Object.keys(EMPTY_FORM).map((field) => [
      field,
      profile[field] ?? "",
    ])
  );
}

function normalizePayloadValue(field, value) {
  if (
    field === "birth_date" ||
    field === "identity_document_issued_at"
  ) {
    return value || null;
  }

  return value;
}

function buildPayload(formData, profile) {
  const baseline = toFormData(profile);

  return Object.fromEntries(
    Object.keys(EMPTY_FORM)
      .filter(
        (field) =>
          String(formData[field] ?? "") !==
          String(baseline[field] ?? "")
      )
      .map((field) => [
        field,
        normalizePayloadValue(field, formData[field]),
      ])
  );
}

function formatProfileSaveError(error) {
  const detail = String(
    error?.payload?.detail ||
      error?.detail ||
      error?.message ||
      ""
  );

  if (
    error?.status === 409 ||
    detail.includes("Learner profile with this SNILS already exists")
  ) {
    return "409 Этот СНИЛС уже указан в профиле другого пользователя.";
  }

  if (detail.includes("Invalid SNILS format or checksum")) {
    return "422 Проверьте формат и контрольное число СНИЛС.";
  }

  if (detail.includes("Invalid learner profile email format")) {
    return "422 Проверьте корректность e-mail для связи.";
  }

  if (detail.includes("Invalid learner profile phone format")) {
    return "422 Проверьте корректность номера телефона.";
  }

  return formatApiError(
    error,
    "Не удалось сохранить персональные данные."
  );
}

function formatStatus(value) {
  return PROFILE_STATUS_LABELS[value] || value || "Не указан";
}

function statusTone(value) {
  if (value === "verified") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (value === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (value === "provided" || value === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function ProfileStatusBadge({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusTone(value)}`}
      >
        {formatStatus(value)}
      </div>
    </div>
  );
}

function FormField({
  label,
  field,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  inputMode,
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-800">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

export function AccountLearnerProfileCard({ accountUser }) {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await getAccountLearnerProfile();

        if (!cancelled) {
          const normalized =
            response && typeof response === "object"
              ? response
              : null;

          setProfile(normalized);
          setFormData(toFormData(normalized));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            formatApiError(
              error,
              "Не удалось загрузить персональные данные для документов."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasChanges = useMemo(() => {
    const baseline = toFormData(profile);

    return Object.keys(EMPTY_FORM).some(
      (field) => String(formData[field] ?? "") !== String(baseline[field] ?? "")
    );
  }, [formData, profile]);

  function updateField(field, value) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
    setSaveError("");
    setSaveNotice("");
  }

  function resetForm() {
    setFormData(toFormData(profile));
    setSaveError("");
    setSaveNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setSaveError("");
      setSaveNotice("");

      const updated = await updateAccountLearnerProfile(
        buildPayload(formData, profile)
      );

      setProfile(updated);
      setFormData(toFormData(updated));
      setSaveNotice(
        "Персональные данные сохранены в профиле слушателя."
      );
    } catch (error) {
      setSaveError(formatProfileSaveError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Персональные данные для документов"
      subtitle="Эти сведения хранятся отдельно от учётной записи и предназначены для подготовки документов об обучении"
    >
      <div
        id="account-learner-profile"
        data-testid="account-learner-profile"
        className="space-y-5"
      >
        <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-200">
          <div className="font-semibold">
            Учётная запись и данные для документов — разные наборы сведений.
          </div>
          <div className="mt-1">
            E-mail для входа:{" "}
            <span className="font-semibold">
              {accountUser?.email || "не указан"}
            </span>
            . Изменение формы ниже не меняет адрес для входа в ОбрПортал.
          </div>
        </div>

        {loadError && (
          <Alert title="Не удалось загрузить профиль" tone="red">
            {loadError}
          </Alert>
        )}

        {saveError && (
          <Alert title="Не удалось сохранить профиль" tone="red">
            {saveError}
          </Alert>
        )}

        {saveNotice && (
          <Alert title="Профиль сохранён" tone="green">
            {saveNotice}
          </Alert>
        )}

        {loading ? (
          <div
            data-testid="account-learner-profile-loading"
            className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 ring-1 ring-slate-200"
          >
            Загружаем персональные данные...
          </div>
        ) : loadError ? (
          <div
            data-testid="account-learner-profile-unavailable"
            className="rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-900 ring-1 ring-amber-200"
          >
            Редактирование временно недоступно, потому что текущие данные
            профиля не были загружены. Обновите страницу и повторите попытку,
            чтобы не перезаписать ранее сохранённые сведения.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Получатель документа
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  ФИО, дата рождения и СНИЛС указываются так, как они должны
                  использоваться в документах и реестрах.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormField
                  label="Фамилия"
                  field="last_name"
                  value={formData.last_name}
                  onChange={updateField}
                  autoComplete="family-name"
                />
                <FormField
                  label="Имя"
                  field="first_name"
                  value={formData.first_name}
                  onChange={updateField}
                  autoComplete="given-name"
                />
                <FormField
                  label="Отчество"
                  field="middle_name"
                  value={formData.middle_name}
                  onChange={updateField}
                  autoComplete="additional-name"
                />
                <FormField
                  label="Дата рождения"
                  field="birth_date"
                  value={formData.birth_date}
                  onChange={updateField}
                  type="date"
                  autoComplete="bday"
                />
                <FormField
                  label="СНИЛС"
                  field="snils"
                  value={formData.snils}
                  onChange={updateField}
                  placeholder="123-456-789 00"
                  inputMode="numeric"
                />
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Контакты для документов
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Эти контакты относятся к профилю слушателя и не заменяют
                  данные авторизации.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Телефон"
                  field="phone"
                  value={formData.phone}
                  onChange={updateField}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+7 999 000-00-00"
                />
                <FormField
                  label="E-mail для связи"
                  field="email"
                  value={formData.email}
                  onChange={updateField}
                  type="email"
                  autoComplete="email"
                  placeholder="user@example.ru"
                />
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Документ, удостоверяющий личность
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Заполняйте реквизиты только по действующему документу.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormField
                  label="Вид документа"
                  field="identity_document_type"
                  value={formData.identity_document_type}
                  onChange={updateField}
                  placeholder="Паспорт РФ"
                />
                <FormField
                  label="Серия"
                  field="identity_document_series"
                  value={formData.identity_document_series}
                  onChange={updateField}
                />
                <FormField
                  label="Номер"
                  field="identity_document_number"
                  value={formData.identity_document_number}
                  onChange={updateField}
                />
                <FormField
                  label="Дата выдачи"
                  field="identity_document_issued_at"
                  value={formData.identity_document_issued_at}
                  onChange={updateField}
                  type="date"
                />
                <FormField
                  label="Код подразделения"
                  field="identity_document_department_code"
                  value={formData.identity_document_department_code}
                  onChange={updateField}
                  placeholder="000-000"
                />
                <div className="md:col-span-2 xl:col-span-3">
                  <FormField
                    label="Кем выдан"
                    field="identity_document_issued_by"
                    value={formData.identity_document_issued_by}
                    onChange={updateField}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
              <ProfileStatusBadge
                label="Проверка документа личности"
                value={profile?.identity_document_status}
              />
              <ProfileStatusBadge
                label="Проверка документа об образовании"
                value={profile?.education_document_status}
              />
            </section>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Сохраняем..." : "Сохранить данные"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving || !hasChanges}
                className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Отменить изменения
              </button>

              <span className="text-xs leading-5 text-slate-500">
                Системные статусы проверки и источник профиля изменяются
                только сервером и администраторами.
              </span>
            </div>
          </form>
        )}
      </div>
    </SectionCard>
  );
}

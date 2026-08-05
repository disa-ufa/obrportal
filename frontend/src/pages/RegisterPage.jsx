import { formatApiError } from "../utils/apiErrors";
import { useEffect, useState } from "react";
import { getPublicCourseDetail } from "../api/client";
import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthSecurityNotice } from "../components/auth/AuthSecurityNotice";
import { AuthSteps } from "../components/auth/AuthSteps";
import { Alert } from "../components/ui/Alert";

const PENDING_ENROLLMENT_STORAGE_KEY =
  "obrportal_pending_enrollment_slug";

const DEFAULT_ACCEPTED_MESSAGE =
  "Если указанный адрес может быть использован для регистрации, на него будет отправлено письмо с дальнейшими инструкциями.";

const REGISTRATION_STEPS = [
  {
    title: "Заполните данные",
    description: "Укажите ФИО, e-mail и контактный телефон.",
  },
  {
    title: "Подтвердите e-mail",
    description: "Перейдите по одноразовой ссылке из письма.",
  },
  {
    title: "Задайте пароль и войдите",
    description: "Завершите создание учётной записи и откройте кабинет.",
  },
];

function getPendingEnrollmentSlug() {
  try {
    return localStorage.getItem(PENDING_ENROLLMENT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function formatCourseDocument(course) {
  return course?.document_type || "Итоговый документ";
}

export function RegisterPage({
  onPageChange,
  onRegister,
  loading,
  error,
}) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [personalDataConsent, setPersonalDataConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [localError, setLocalError] = useState("");
  const [acceptedMessage, setAcceptedMessage] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const [pendingCourse, setPendingCourse] = useState(null);
  const [pendingCourseLoading, setPendingCourseLoading] =
    useState(false);
  const [pendingCourseError, setPendingCourseError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const pendingSlug = getPendingEnrollmentSlug();

    if (!pendingSlug) {
      return () => {
        cancelled = true;
      };
    }

    async function loadPendingCourse() {
      try {
        setPendingCourseLoading(true);
        setPendingCourseError("");

        const course = await getPublicCourseDetail(pendingSlug);

        if (!cancelled) {
          setPendingCourse(course);
        }
      } catch (err) {
        if (!cancelled) {
          setPendingCourse(null);
          setPendingCourseError(
            formatApiError(
              err,
              "Не удалось загрузить выбранную программу."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setPendingCourseLoading(false);
        }
      }
    }

    loadPendingCourse();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError("");
    setAcceptedMessage("");

    if (!personalDataConsent) {
      setLocalError(
        "Подтвердите согласие на обработку персональных данных."
      );
      return;
    }

    if (!termsAccepted) {
      setLocalError(
        "Подтвердите принятие условий использования сервиса."
      );
      return;
    }

    try {
      const response = await onRegister({
        last_name: lastName.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        personal_data_consent: true,
        terms_accepted: true,
      });

      setSubmittedEmail(email.trim());
      setAcceptedMessage(
        response?.message || DEFAULT_ACCEPTED_MESSAGE
      );
    } catch {
      // Ошибка уже поднята и отрисуется через внешний error.
    }
  }

  const cardTitle = acceptedMessage
    ? "Проверьте электронную почту"
    : "Регистрация в ОбрПортале";

  const cardSubtitle = acceptedMessage
    ? "Для завершения регистрации перейдите по ссылке из письма."
    : "Укажите данные. После отправки заявки мы пришлём ссылку для подтверждения e-mail и установки пароля.";

  const loginFooter = acceptedMessage ? null : (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-bold text-slate-900">
          Уже есть учётная запись?
        </div>
        <div className="mt-1 text-sm text-slate-600">
          Вернитесь на страницу входа.
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPageChange("login")}
        className="shrink-0 rounded-full bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
      >
        Войти
      </button>
    </div>
  );

  return (
    <AuthLayout
      brand={
        <AuthBrandPanel
          title="Начните обучение в ОбрПортале"
          description="Создайте учётную запись, подтвердите адрес электронной почты и получите доступ к назначенным программам."
          footer="Пароль не вводится в этой форме: его нужно будет задать по защищённой ссылке из письма."
        >
          <AuthSteps
            steps={REGISTRATION_STEPS}
            activeStep={acceptedMessage ? 1 : 0}
          />
        </AuthBrandPanel>
      }
    >
      <AuthCard
        title={cardTitle}
        subtitle={cardSubtitle}
        footer={loginFooter}
      >
        {acceptedMessage ? (
          <div className="space-y-5">
            <Alert title="Заявка принята" tone="green">
              {acceptedMessage}
            </Alert>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              Проверьте почту
              {submittedEmail ? (
                <>
                  {" "}
                  <span className="font-bold text-slate-900">
                    {submittedEmail}
                  </span>
                </>
              ) : null}
              , включая папку «Спам». Затем подтвердите адрес,
              задайте пароль и войдите в портал.
            </div>

            {pendingCourse && (
              <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800 ring-1 ring-blue-200">
                Выбор программы «{pendingCourse.title}» сохранён.
                Запись будет завершена после подтверждения e-mail,
                установки пароля и входа в портал.
              </div>
            )}

            <AuthSecurityNotice>
              Ссылка из письма одноразовая и действует ограниченное
              время. Не пересылайте её другим людям.
            </AuthSecurityNotice>

            <button
              type="button"
              onClick={() => onPageChange("login")}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:w-auto"
            >
              Перейти ко входу
            </button>
          </div>
        ) : (
          <>
            {localError && (
              <Alert title="Не удалось отправить заявку" tone="red">
                {localError}
              </Alert>
            )}

            {error && (
              <Alert title="Не удалось отправить заявку" tone="red">
                {error}
              </Alert>
            )}

            {pendingCourseLoading && (
              <div className="mb-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                Проверяем выбранную программу...
              </div>
            )}

            {pendingCourse && (
              <div className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-200">
                <div className="font-bold text-blue-950">
                  После подтверждения e-mail и входа вы будете
                  записаны на программу
                </div>
                <div className="mt-2 text-base font-black text-blue-950">
                  {pendingCourse.title}
                </div>
                <div className="mt-2 text-blue-800">
                  {pendingCourse.hours
                    ? `${pendingCourse.hours} часов`
                    : "Объём уточняется"}{" "}
                  · {formatCourseDocument(pendingCourse)}
                </div>
              </div>
            )}

            {pendingCourseError && (
              <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
                {pendingCourseError}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              aria-busy={loading}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <AuthField
                  id="register-last-name"
                  label="Фамилия"
                  type="text"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  placeholder="Иванов"
                  autoComplete="family-name"
                  required
                />

                <AuthField
                  id="register-first-name"
                  label="Имя"
                  type="text"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  placeholder="Иван"
                  autoComplete="given-name"
                  required
                />
              </div>

              <AuthField
                id="register-middle-name"
                label="Отчество"
                type="text"
                value={middleName}
                onChange={(event) =>
                  setMiddleName(event.target.value)
                }
                placeholder="Иванович"
                autoComplete="additional-name"
                hint="При наличии"
              />

              <AuthField
                id="register-email"
                label="E-mail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="user@example.com"
                autoComplete="email"
                inputMode="email"
                hint="На этот адрес придёт ссылка для подтверждения и установки пароля."
                required
              />

              <AuthField
                id="register-phone"
                label="Телефон"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+7 (900) 000-00-00"
                autoComplete="tel"
                inputMode="tel"
                hint="Необязательно"
              />

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={personalDataConsent}
                  onChange={(event) =>
                    setPersonalDataConsent(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus-visible:ring-4 focus-visible:ring-blue-100"
                  required
                />
                <span>
                  Я даю согласие на обработку персональных данных
                  для создания учётной записи и предоставления
                  доступа к образовательному порталу.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) =>
                    setTermsAccepted(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus-visible:ring-4 focus-visible:ring-blue-100"
                  required
                />
                <span>
                  Я принимаю условия использования образовательного
                  портала.
                </span>
              </label>

              <AuthSecurityNotice>
                Мы не просим придумать пароль на этой странице.
                Установка пароля выполняется только по ссылке из
                подтверждающего письма.
              </AuthSecurityNotice>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Отправляем заявку..."
                  : "Создать учётную запись"}
              </button>
            </form>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

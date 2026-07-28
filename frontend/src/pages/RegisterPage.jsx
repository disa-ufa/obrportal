import { formatApiError } from "../utils/apiErrors";
import { useEffect, useState } from "react";
import { getPublicCourseDetail } from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

const PENDING_ENROLLMENT_STORAGE_KEY = "obrportal_pending_enrollment_slug";
const DEFAULT_ACCEPTED_MESSAGE =
  "Если указанный адрес может быть использован для регистрации, на него будет отправлено письмо с дальнейшими инструкциями.";

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

export function RegisterPage({ onPageChange, onRegister, loading, error }) {
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
  const [pendingCourseLoading, setPendingCourseLoading] = useState(false);
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
            formatApiError(err, "Не удалось загрузить выбранную программу.")
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
      setLocalError("Подтвердите согласие на обработку персональных данных.");
      return;
    }

    if (!termsAccepted) {
      setLocalError("Подтвердите принятие условий использования сервиса.");
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
      setAcceptedMessage(response?.message || DEFAULT_ACCEPTED_MESSAGE);
    } catch {
      // Ошибка уже поднята и отрисуется через внешний error.
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="Регистрация"
        subtitle="Укажите данные. Ссылка для подтверждения адреса и установки пароля придёт на e-mail."
      >
        {acceptedMessage ? (
          <div className="space-y-4">
            <Alert title="Заявка принята" tone="green">
              {acceptedMessage}
            </Alert>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              Проверьте почту
              {submittedEmail ? (
                <>
                  {" "}
                  <span className="font-semibold text-slate-900">
                    {submittedEmail}
                  </span>
                </>
              ) : null}
              , включая папку «Спам». После установки пароля войдите в портал
              обычным способом.
            </div>

            {pendingCourse && (
              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-200">
                Выбор программы «{pendingCourse.title}» сохранён. Запись будет
                завершена после подтверждения e-mail, установки пароля и входа
                в портал.
              </div>
            )}

            <button
              type="button"
              onClick={() => onPageChange("login")}
              className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
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
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                Проверяем выбранную программу...
              </div>
            )}

            {pendingCourse && (
              <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-200">
                <div className="font-semibold text-blue-900">
                  После подтверждения e-mail и входа вы будете записаны на
                  программу:
                </div>
                <div className="mt-2 text-base font-bold text-blue-950">
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
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
                {pendingCourseError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Фамилия
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Иванов"
                    autoComplete="family-name"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Иван"
                    autoComplete="given-name"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Отчество
                  <span className="ml-1 font-normal text-slate-400">
                    (при наличии)
                  </span>
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(event) => setMiddleName(event.target.value)}
                  placeholder="Иванович"
                  autoComplete="additional-name"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@example.com"
                  autoComplete="email"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Телефон
                  <span className="ml-1 font-normal text-slate-400">
                    (необязательно)
                  </span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+7 (900) 000-00-00"
                  autoComplete="tel"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  checked={personalDataConsent}
                  onChange={(event) =>
                    setPersonalDataConsent(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  required
                />
                <span>
                  Я даю согласие на обработку персональных данных для создания
                  учётной записи и предоставления доступа к образовательному
                  порталу.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  required
                />
                <span>
                  Я принимаю условия использования образовательного портала.
                </span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loading ? "Отправляем заявку..." : "Зарегистрироваться"}
                </button>

                <button
                  type="button"
                  onClick={() => onPageChange("login")}
                  className="w-full rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 sm:w-auto"
                >
                  У меня уже есть аккаунт
                </button>
              </div>
            </form>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Что будет дальше"
        subtitle="Учётная запись станет доступна после подтверждения e-mail и установки пароля."
      >
        <div className="space-y-4 text-sm leading-6 text-slate-600">
          <div className="rounded-2xl bg-blue-50 p-4 text-blue-800 ring-1 ring-blue-200">
            Мы отправим на указанный e-mail одноразовую ссылку. По ней нужно
            подтвердить адрес и задать пароль.
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            После установки пароля вернитесь на страницу входа и авторизуйтесь
            по e-mail и новому паролю.
          </div>

          {pendingCourse ? (
            <div className="rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-200">
              Выбранная программа сохранена. Портал завершит запись после
              первого входа.
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              После входа можно выбрать программу в каталоге и записаться на
              обучение.
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            Ссылка ограничена по времени. Если она перестала действовать,
            обратитесь в поддержку портала.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

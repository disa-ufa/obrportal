import { formatApiError } from "../utils/apiErrors";
import { useEffect, useState } from "react";
import { getPublicCourseDetail } from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

const PENDING_ENROLLMENT_STORAGE_KEY = "obrportal_pending_enrollment_slug";

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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [localError, setLocalError] = useState("");

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

    if (!consent) {
      setLocalError("Подтвердите ознакомление с политикой ПДн.");
      return;
    }

    try {
      await onRegister({
        email,
        password,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      });
    } catch {
      // Ошибка уже поднята и отрисуется через внешний error
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="Регистрация"
        subtitle="Рабочая регистрация пользователя с последующим автологином."
      >
        {localError && (
          <Alert title="Не удалось зарегистрироваться" tone="red">
            {localError}
          </Alert>
        )}

        {error && (
          <Alert title="Не удалось зарегистрироваться" tone="red">
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
              После регистрации вы будете записаны на программу:
            </div>
            <div className="mt-2 text-base font-bold text-blue-950">
              {pendingCourse.title}
            </div>
            <div className="mt-2 text-blue-800">
              {pendingCourse.hours ? `${pendingCourse.hours} часов` : "Объём уточняется"} ·{" "}
              {formatCourseDocument(pendingCourse)}
            </div>
          </div>
        )}

        {pendingCourseError && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
            {pendingCourseError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ФИО
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Иванов Иван Иванович"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
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
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Телефон
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7 (900) 000-00-00"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 8 символов"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
              required
              minLength={8}
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              Я подтверждаю ознакомление с публичной политикой ПДн и соглашаюсь
              на обработку данных в рамках регистрации на платформе.
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Регистрируем..." : "Зарегистрироваться"}
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
      </SectionCard>

      <SectionCard
        title="Что будет дальше"
        subtitle="После регистрации пользователь попадает в личный кабинет."
      >
        <div className="space-y-4 text-sm leading-6 text-slate-600">
          <div className="rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-200">
            После успешной регистрации пользователь автоматически входит в систему
            и попадает в личный кабинет.
          </div>

          {pendingCourse ? (
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-800 ring-1 ring-blue-200">
              Выбранная программа будет автоматически добавлена в раздел
              «Назначенные программы».
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              После входа можно выбрать программу в каталоге и записаться на обучение.
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            После регистрации в личном кабинете будут доступны выбранные программы,
            статусы обучения и итоговые документы.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

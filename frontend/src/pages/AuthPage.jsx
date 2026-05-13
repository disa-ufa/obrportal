import { formatApiError } from "../utils/apiErrors";
import { useEffect, useState } from "react";
import { getPublicCourseDetail } from "../api/client";
import { AuthPanel } from "../components/auth/AuthPanel";
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

export function AuthPage({
  email,
  password,
  loading,
  error,
  user,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onLogout,
  onPageChange,
}) {
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

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="Вход в систему"
        subtitle="Вход для слушателей, организаций и администраторов."
      >
        {error && (
          <Alert title="Не удалось выполнить вход" tone="red">
            {error}
          </Alert>
        )}

        {pendingCourseLoading && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            Проверяем выбранную программу...
          </div>
        )}

        {pendingCourse && !user && (
          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-200">
            <div className="font-semibold text-blue-900">
              После входа вы будете записаны на программу:
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

        {pendingCourseError && !user && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
            {pendingCourseError}
          </div>
        )}

        <div className="mt-4">
          <AuthPanel
            email={email}
            password={password}
            loading={loading}
            error=""
            onEmailChange={onEmailChange}
            onPasswordChange={onPasswordChange}
            onLogin={onLogin}
            onLogout={onLogout}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Что будет дальше"
        subtitle="После входа система откроет подходящий раздел."
      >
        <div className="space-y-4 text-sm leading-6 text-slate-600">
          <p>
            После входа вы увидите только доступные вам разделы: личный кабинет
            слушателя или панель администрирования.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="font-semibold text-slate-900">Для слушателя</div>
              <div className="mt-1">
                Каталог, запись на программу, личный кабинет, обучение и документы.
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="font-semibold text-slate-900">Для администраторов</div>
              <div className="mt-1">
                Управление пользователями, программами, назначениями и документами.
              </div>
            </div>
          </div>

          {pendingCourse && !user && (
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-800 ring-1 ring-blue-200">
              Выбранная программа будет автоматически добавлена в раздел
              «Назначенные программы» после успешного входа.
            </div>
          )}

          {!user && (
            <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200">
              <div className="font-semibold text-blue-900">
                Нет аккаунта?
              </div>
              <div className="mt-1 text-blue-800">
                Можно перейти на страницу регистрации. Если программа уже выбрана,
                она сохранится и будет назначена после регистрации.
              </div>
              <button
                type="button"
                onClick={() => onPageChange("register")}
                className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Перейти к регистрации
              </button>
            </div>
          )}

          {user && (
            <div className="rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-200">
              Активная сессия: {user.email}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
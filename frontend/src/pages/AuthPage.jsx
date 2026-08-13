import { formatApiError } from "../utils/apiErrors";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicCourseDetail } from "../api/client";
import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthPanel } from "../components/auth/AuthPanel";
import { AuthSecurityNotice } from "../components/auth/AuthSecurityNotice";
import { AuthSteps } from "../components/auth/AuthSteps";
import { Alert } from "../components/ui/Alert";

const PENDING_ENROLLMENT_STORAGE_KEY =
  "obrportal_pending_enrollment_slug";

const LOGIN_STEPS = [
  {
    title: "Войдите в портал",
    description: "Используйте e-mail и пароль своей учётной записи.",
  },
  {
    title: "Продолжите обучение",
    description: "Откройте назначенные программы и учебные материалы.",
  },
  {
    title: "Получите документы",
    description: "Следите за результатами и доступными документами.",
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

export function AuthPage({
  email,
  password,
  loading,
  error,
  publicRegistrationEnabled,
  publicRegistrationLoading,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onPageChange,
}) {
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

  const registrationFooter =
    !publicRegistrationLoading && publicRegistrationEnabled ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-bold text-slate-900">
            Ещё нет учётной записи?
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Зарегистрируйтесь и подтвердите адрес электронной почты.
          </div>
        </div>

        <button
          type="button"
          onClick={() => onPageChange("register")}
          className="shrink-0 rounded-full bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          Создать аккаунт
        </button>
      </div>
    ) : null;

  return (
    <AuthLayout
      brand={
        <AuthBrandPanel
          title="Образовательный портал РЦДО"
          description="Войдите в ОбрПортал, чтобы продолжить обучение, увидеть назначенные программы и получить итоговые документы."
        >
          <AuthSteps steps={LOGIN_STEPS} activeStep={0} />
        </AuthBrandPanel>
      }
    >
      <AuthCard
        title="Вход в ОбрПортал"
        subtitle="Введите e-mail и пароль, указанные при создании учётной записи."
        footer={registrationFooter}
      >
        {error && (
          <Alert title="Не удалось выполнить вход" tone="red">
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
              После входа вы будете записаны на программу
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

        <AuthPanel
          email={email}
          password={password}
          loading={loading}
          onEmailChange={onEmailChange}
          onPasswordChange={onPasswordChange}
          onLogin={onLogin}
        />

        <div className="mt-4 text-center sm:text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-bold text-blue-700 transition hover:text-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            Забыли пароль?
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

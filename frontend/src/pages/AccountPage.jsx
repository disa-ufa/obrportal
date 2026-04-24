import { useEffect, useState } from "react";
import {
  getAccountCourses,
  getAccountDocuments,
  getAccountSummary,
} from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

function getStatusLabel(status) {
  switch (status) {
    case "active":
      return "Активна";
    case "assigned":
      return "Назначена";
    case "completed":
      return "Завершена";
    default:
      return status || "—";
  }
}

function getStatusTone(status) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700 ring-green-200";
    case "assigned":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "completed":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function getDocumentStatusLabel(status) {
  switch (status) {
    case "available":
      return "Доступен";
    case "draft":
      return "Черновик";
    case "revoked":
      return "Отозван";
    default:
      return status || "—";
  }
}

export function AccountPage({ user, onPageChange, onLogout, onOpenCourse }) {
  const [summary, setSummary] = useState(null);
  const [coursesResponse, setCoursesResponse] = useState(null);
  const [documentsResponse, setDocumentsResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccountData() {
      try {
        setLoading(true);
        setError("");

        const [summaryResponse, coursesData, documentsData] = await Promise.all([
          getAccountSummary(),
          getAccountCourses(),
          getAccountDocuments(),
        ]);

        if (!cancelled) {
          setSummary(summaryResponse);
          setCoursesResponse(coursesData);
          setDocumentsResponse(documentsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(`${err.status || ""} ${err.message}`.trim());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAccountData();

    return () => {
      cancelled = true;
    };
  }, []);

  const profile = summary?.profile || user;
  const courses = coursesResponse?.items || [];
  const documents = documentsResponse?.items || [];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Личный кабинет
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Кабинет пользователя
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Профиль, счетчики, программы и документы уже подтягиваются из backend
          через account endpoints.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Перейти в каталог
          </button>
          <button
            type="button"
            onClick={() => onPageChange("home")}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            На главную
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Выйти
          </button>
        </div>
      </section>

      {error && (
        <Alert title="Не удалось загрузить кабинет" tone="red">
          {error}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Профиль" subtitle="Базовая информация пользователя">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загрузка профиля...
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  E-mail
                </div>
                <div className="mt-2 font-semibold text-slate-900">
                  {profile?.email || "—"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  ФИО
                </div>
                <div className="mt-2 font-semibold text-slate-900">
                  {profile?.full_name || "—"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Статус
                </div>
                <div className="mt-2 font-semibold text-slate-900">
                  Авторизованный пользователь
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Мои программы" subtitle="Сводка по назначенным программам">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загрузка данных...
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Всего назначений
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {summary?.enrollments_count ?? 0}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Активных программ
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {summary?.active_courses_count ?? 0}
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Документы" subtitle="Сводка по доступным документам">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загрузка данных...
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Документов доступно
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {summary?.documents_count ?? 0}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                {documents.length > 0
                  ? "Документы уже доступны для пользователя."
                  : "Следующим шагом сюда можно подключить скачивание файлов и проверку подлинности по реальным данным."}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Назначенные программы"
        subtitle="Реальный список программ из /api/v1/account/courses"
      >
        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            Загрузка программ...
          </div>
        ) : courses.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              У пользователя пока нет назначенных программ.
            </div>
            <button
              type="button"
              onClick={() => onPageChange("catalog")}
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Перейти в каталог
            </button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {courses.map((course) => (
              <article
                key={course.enrollment_id}
                className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getStatusTone(
                      course.status
                    )}`}
                  >
                    {getStatusLabel(course.status)}
                  </span>

                  {course.format && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                      {course.format}
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-2xl font-bold text-slate-900">
                  {course.course_title}
                </h2>

                {course.course_description && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {course.course_description}
                  </p>
                )}

                <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Часы
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {course.hours ?? "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Итоговый документ
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {course.document_type || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Организация
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {course.organization_name || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Группа
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {course.learning_group_name || "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course.course_slug)}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Открыть карточку курса
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Мои документы"
        subtitle="Реальный список документов из /api/v1/account/documents"
      >
        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            Загрузка документов...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            У пользователя пока нет доступных документов.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {documents.map((documentItem) => (
              <article
                key={documentItem.id}
                className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 ring-1 ring-green-200">
                    {getDocumentStatusLabel(documentItem.status)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                    {documentItem.document_type}
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-bold text-slate-900">
                  {documentItem.title}
                </h2>

                <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Номер документа
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {documentItem.document_number}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Курс
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {documentItem.course_title || "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {documentItem.course_slug && (
                    <button
                      type="button"
                      onClick={() => onOpenCourse(documentItem.course_slug)}
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Открыть курс
                    </button>
                  )}

                  <button
                    type="button"
                    disabled
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400 ring-1 ring-slate-200"
                  >
                    Скачать документ
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
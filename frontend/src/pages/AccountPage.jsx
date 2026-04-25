import { useEffect, useState } from "react";
import {
  completeAccountCourse,
  downloadAccountDocument,
  getAccountCourses,
  getAccountDocuments,
  getAccountSummary,
  startAccountCourse,
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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ru-RU");
}
function canDownloadDocument(documentItem) {
  return Boolean(documentItem.download_available ?? documentItem.file_available);
}

function buildDocumentVerificationPath(code) {
  if (!code) {
    return "/verify-document";
  }

  return `/verify-document?number=${encodeURIComponent(code)}`;
}
export function AccountPage({ user, onPageChange, onLogout, onOpenCourse }) {
  const [summary, setSummary] = useState(null);
  const [coursesResponse, setCoursesResponse] = useState(null);
  const [documentsResponse, setDocumentsResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadLoadingId, setDownloadLoadingId] = useState("");
  const [courseActionError, setCourseActionError] = useState("");
  const [courseActionLoadingKey, setCourseActionLoadingKey] = useState("");
  const [accountNotice, setAccountNotice] = useState(null);

  useEffect(() => {
    try {
      const rawNotice = sessionStorage.getItem("obrportal_account_notice");

      if (rawNotice) {
        setAccountNotice(JSON.parse(rawNotice));
        sessionStorage.removeItem("obrportal_account_notice");
      }
    } catch {
      setAccountNotice(null);
    }
  }, []);

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

  async function refreshAccountSnapshot() {
    const [summaryResponse, coursesData, documentsData] = await Promise.all([
      getAccountSummary(),
      getAccountCourses(),
      getAccountDocuments(),
    ]);

    setSummary(summaryResponse);
    setCoursesResponse(coursesData);
    setDocumentsResponse(documentsData);
  }

  async function handleStartCourse(enrollmentId) {
    try {
      setCourseActionError("");
      setCourseActionLoadingKey(`${enrollmentId}:start`);

      await startAccountCourse(enrollmentId);
      await refreshAccountSnapshot();

      setAccountNotice({
        tone: "green",
        title: "Обучение начато",
        message: "Статус программы обновлён. Теперь курс находится в работе.",
      });
    } catch (err) {
      setCourseActionError(`${err.status || ""} ${err.message || "Не удалось начать обучение."}`.trim());
    } finally {
      setCourseActionLoadingKey("");
    }
  }

  async function handleCompleteCourse(enrollmentId) {
    try {
      setCourseActionError("");
      setCourseActionLoadingKey(`${enrollmentId}:complete`);

      await completeAccountCourse(enrollmentId);
      await refreshAccountSnapshot();

      setAccountNotice({
        tone: "green",
        title: "Обучение завершено",
        message: "Статус программы обновлён. Курс отмечен как завершённый, черновик итогового документа добавлен в раздел документов.",
      });
    } catch (err) {
      setCourseActionError(`${err.status || ""} ${err.message || "Не удалось завершить обучение."}`.trim());
    } finally {
      setCourseActionLoadingKey("");
    }
  }
  async function handleDownload(documentId) {
    try {
      setDownloadError("");
      setDownloadLoadingId(documentId);
      await downloadAccountDocument(documentId);
    } catch (err) {
      setDownloadError(`${err.status || ""} ${err.message || "Не удалось подготовить документ."}`.trim());
    } finally {
      setDownloadLoadingId("");
    }
  }

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

      {downloadError && (
        <Alert title="Не удалось скачать документ" tone="red">
          {downloadError}
        </Alert>
      )}

      {courseActionError && (
        <Alert title="Не удалось обновить статус обучения" tone="red">
          {courseActionError}
        </Alert>
      )}

      {accountNotice && (
        <Alert title={accountNotice.title || "Уведомление"} tone={accountNotice.tone || "green"}>
          {accountNotice.message}
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
                  {profile?.email || "-"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  ФИО
                </div>
                <div className="mt-2 font-semibold text-slate-900">
                  {profile?.full_name || "-"}
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
                  : "Следующим шагом сюда можно подключить хранение бинарных файлов и реальную выдачу через внутреннее хранилище."}
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

                {(course.started_at || course.completed_at) && (
                  <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Начато
                      </div>
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatDateTime(course.started_at)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Завершено
                      </div>
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatDateTime(course.completed_at)}
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course.course_slug)}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Открыть карточку курса
                  </button>

                  {course.status === "assigned" && (
                    <button
                      type="button"
                      onClick={() => handleStartCourse(course.enrollment_id)}
                      disabled={courseActionLoadingKey === `${course.enrollment_id}:start`}
                      className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {courseActionLoadingKey === `${course.enrollment_id}:start`
                        ? "Запускаем..."
                        : "Начать обучение"}
                    </button>
                  )}

                  {course.status === "active" && (
                    <button
                      type="button"
                      onClick={() => handleCompleteCourse(course.enrollment_id)}
                      disabled={courseActionLoadingKey === `${course.enrollment_id}:complete`}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {courseActionLoadingKey === `${course.enrollment_id}:complete`
                        ? "Завершаем..."
                        : "Завершить обучение"}
                    </button>
                  )}

                  {course.status === "completed" && (
                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                      Обучение завершено
                    </span>
                  )}
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
                      Код проверки
                    </div>
                    <div className="mt-2 break-all font-semibold text-slate-900">
                      {documentItem.verification_code || "—"}
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

                  <a
                    href={buildDocumentVerificationPath(documentItem.verification_code || documentItem.document_number)}
                    className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100"
                  >
                    Проверить публично
                  </a>

                  {documentItem.file_available && !canDownloadDocument(documentItem) && (
                    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
                      Документ загружен, но пока не опубликован для скачивания.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(documentItem.id)}
                    disabled={!canDownloadDocument(documentItem) || downloadLoadingId === documentItem.id}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadLoadingId === documentItem.id
                      ? "Готовим..."
                      : canDownloadDocument(documentItem)
                        ? "Скачать документ"
                        : documentItem.file_available
                          ? "Не опубликован"
                          : "Файл недоступен"}
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
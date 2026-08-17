import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getAccountCourseDetail,
  startAccountCourse,
} from "../api/client";
import { LearnerAssignmentBlock } from "../components/learner/LearnerAssignmentBlock";
import { LearnerContentBlock } from "../components/learner/LearnerContentBlock";
import { LearnerQuizBlock } from "../components/learner/LearnerQuizBlock";
import { formatApiError } from "../utils/apiErrors";


function getStatusLabel(status) {
  switch (status) {
    case "assigned":
      return "Ожидает начала";
    case "active":
      return "В процессе";
    case "completed":
      return "Завершена";
    case "cancelled":
      return "Отменена";
    default:
      return status || "Статус не указан";
  }
}


function getStatusClass(status) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700 ring-green-200";
    case "completed":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "cancelled":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
  }
}


function clampPercent(value) {
  return Math.min(
    100,
    Math.max(0, Number(value || 0))
  );
}


export function LearnerCoursePage() {
  const {
    enrollmentId,
    lessonId,
  } = useParams();

  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const readOnly = detail?.status !== "active";

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      try {
        setLoading(true);
        setError("");

        const response = await getAccountCourseDetail(
          enrollmentId
        );

        if (!cancelled) {
          setDetail(response);
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setError(
            formatApiError(
              err,
              "Не удалось загрузить программу обучения."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!enrollmentId) {
      setDetail(null);
      setError("Не указан идентификатор записи на курс.");
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [enrollmentId, reloadKey]);

  const allLessons = useMemo(
    () =>
      (detail?.modules || []).flatMap(
        (module) =>
          (module.lessons || []).map(
            (lesson) => ({
              ...lesson,
              moduleTitle: module.title,
            })
          )
      ),
    [detail]
  );

  const selectedLesson = useMemo(() => {
    if (!allLessons.length) {
      return null;
    }

    if (lessonId) {
      return (
        allLessons.find(
          (lesson) => lesson.id === lessonId
        ) || null
      );
    }

    return (
      allLessons.find(
        (lesson) => !lesson.is_completed
      ) ||
      allLessons[0] ||
      null
    );
  }, [allLessons, lessonId]);

  const requestedLessonMissing = Boolean(
    lessonId &&
    detail &&
    !selectedLesson
  );

  const effectiveProgress = clampPercent(
    detail?.required_progress_percent
  );

  function handleBack() {
    try {
      sessionStorage.setItem(
        "obrportal_account_section",
        "learning"
      );
    } catch {
      // Navigation must work even without sessionStorage.
    }

    navigate("/account");
  }

  function handleOpenLesson(nextLessonId) {
    if (!enrollmentId || !nextLessonId) {
      return;
    }

    navigate(
      `/account/courses/${enrollmentId}/lessons/${nextLessonId}`
    );
  }

  async function handleStartCourse() {
    if (!enrollmentId) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      await startAccountCourse(enrollmentId);

      const response = await getAccountCourseDetail(
        enrollmentId
      );

      setDetail(response);
    } catch (err) {
      setError(
        formatApiError(
          err,
          "Не удалось начать обучение."
        )
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <section
        data-testid="learner-course-loading"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="animate-pulse rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-5 h-8 max-w-2xl rounded bg-slate-200" />
          <div className="mt-8 h-72 rounded-2xl bg-slate-100" />
        </div>
      </section>
    );
  }

  if (!detail) {
    return (
      <section
        data-testid="learner-course-error"
        className="mx-auto max-w-4xl px-4 py-10 sm:px-6"
      >
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться в кабинет
        </button>

        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-black text-slate-950">
            Программа недоступна
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {error || "Не удалось получить данные программы."}
          </p>

          <button
            type="button"
            onClick={() =>
              setReloadKey((value) => value + 1)
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Повторить
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="learner-course-workspace"
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
    >
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Мои программы
      </button>

      <header className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusClass(
                detail.status
              )}`}
            >
              {getStatusLabel(detail.status)}
            </span>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {detail.course_title}
            </h1>

            {detail.course_description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {detail.course_description}
              </p>
            ) : null}
          </div>

          {detail.status === "assigned" ? (
            <button
              type="button"
              onClick={handleStartCourse}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <PlayCircle className="h-4 w-4" />
              {actionLoading
                ? "Начинаем..."
                : "Начать обучение"}
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">
              Прогресс программы
            </span>

            <span className="text-slate-900">
              {effectiveProgress}%
            </span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{
                width: `${effectiveProgress}%`,
              }}
            />
          </div>

          <div className="mt-2 text-xs text-slate-500">
            Завершено уроков:{" "}
            <span className="font-bold text-slate-800">
              {detail.lessons_completed || 0} из{" "}
              {detail.lessons_total || 0}
            </span>
          </div>
        </div>
      </header>

      {detail.status === "completed" ? (
        <div className="mt-4 flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-100">
          <CheckCircle2 className="h-5 w-5 shrink-0" />

          <div>
            <div className="font-bold">
              Программа завершена
            </div>
            <div className="mt-1">
              Материалы доступны для просмотра. Изменение прогресса отключено.
            </div>
          </div>
        </div>
      ) : null}

      {detail.status === "cancelled" ? (
        <div className="mt-4 flex gap-3 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
          <LockKeyhole className="h-5 w-5 shrink-0" />

          <div>
            <div className="font-bold">
              Обучение отменено
            </div>
            <div className="mt-1">
              История и материалы сохранены, учебные действия заблокированы.
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="self-start rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 px-2 pb-3">
            <BookOpen className="h-5 w-5 text-blue-600" />

            <h2 className="font-black text-slate-950">
              Содержание
            </h2>
          </div>

          <div className="space-y-4">
            {(detail.modules || []).map((module) => (
              <div key={module.id}>
                <div className="px-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {module.title}
                </div>

                <div className="mt-2 space-y-1">
                  {(module.lessons || []).map((lesson) => {
                    const active =
                      selectedLesson?.id === lesson.id;

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() =>
                          handleOpenLesson(lesson.id)
                        }
                        className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left ${
                          active
                            ? "bg-blue-50 text-blue-950 ring-1 ring-blue-100"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {lesson.is_completed ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        )}

                        <span className="min-w-0">
                          <span className="block text-sm font-bold">
                            {lesson.title}
                          </span>

                          {lesson.is_required ? (
                            <span className="mt-1 block text-[11px] font-semibold text-slate-400">
                              Обязательный урок
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {!allLessons.length ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              В программе пока нет активных уроков.
            </div>
          ) : null}
        </aside>

        <main>
          {requestedLessonMissing ? (
            <div
              data-testid="learner-course-lesson-not-found"
              className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
            >
              <h2 className="text-xl font-black text-slate-950">
                Урок не найден
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Этот урок отсутствует в доступной программе или больше не активен.
              </p>

              {allLessons[0] ? (
                <button
                  type="button"
                  onClick={() =>
                    handleOpenLesson(allLessons[0].id)
                  }
                  className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Открыть первый урок
                </button>
              ) : null}
            </div>
          ) : selectedLesson ? (
            <article
              data-testid="learner-course-active-lesson"
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-blue-600">
                {selectedLesson.moduleTitle}
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                {selectedLesson.title}
              </h2>

              {selectedLesson.description ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {selectedLesson.description}
                </p>
              ) : null}

              {selectedLesson.content_text ? (
                <div className="mt-7 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700 ring-1 ring-slate-200">
                  {selectedLesson.content_text}
                </div>
              ) : null}

              {selectedLesson.content_url ? (
                <a
                  href={selectedLesson.content_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Открыть материал
                </a>
              ) : null}

              {!selectedLesson.content_text &&
              !selectedLesson.content_url ? (
                <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500 ring-1 ring-slate-200">
                  Основной материал урока будет отображён здесь.
                </div>
              ) : null}

              {(selectedLesson.blocks || []).length ? (
                <div className="mt-7 border-t border-slate-100 pt-6">
                  <div className="text-sm font-black text-slate-950">
                    Интерактивные материалы
                  </div>

                  <div className="mt-3 space-y-2">
                    {selectedLesson.blocks.map((block) =>
                      block.block_type === "quiz" ? (
                        <LearnerQuizBlock
                          key={block.id}
                          block={block}
                          enrollmentId={enrollmentId}
                          lessonId={selectedLesson.id}
                          disabled={readOnly}
                        />
                      ) : block.block_type === "assignment" ? (
                        <LearnerAssignmentBlock
                          key={block.id}
                          block={block}
                          enrollmentId={enrollmentId}
                          lessonId={selectedLesson.id}
                          disabled={readOnly}
                        />
                      ) : [
                        "rich_text",
                        "text",
                        "video",
                        "audio",
                        "file_link",
                        "file",
                        "link",
                        "callout",
                      ].includes(block.block_type) ? (
                        <LearnerContentBlock
                          key={block.id}
                          block={block}
                        />
                      ) : (
                      <div
                        key={block.id}
                        className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                      >
                        <div className="text-sm font-bold text-slate-800">
                          {block.title || "Материал урока"}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-slate-400">
                          {block.block_type}
                        </div>
                      </div>
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </article>
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
              <BookOpen className="mx-auto h-8 w-8 text-slate-300" />

              <h2 className="mt-4 text-lg font-black text-slate-950">
                Уроков пока нет
              </h2>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

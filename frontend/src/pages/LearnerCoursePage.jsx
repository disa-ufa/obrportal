import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  completeAccountCourse,
  completeAccountCourseLesson,
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


function getLessonCompletionErrorMessage(err) {
  const detail = err?.payload?.detail;
  const code =
    detail &&
    typeof detail === "object" &&
    !Array.isArray(detail)
      ? detail.code
      : "";

  if (code === "required_quiz_not_passed") {
    return "\u0427\u0442\u043e\u0431\u044b \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0443\u0440\u043e\u043a, \u0441\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u0440\u043e\u0439\u0434\u0438\u0442\u0435 \u0432\u0441\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0442\u0435\u0441\u0442\u044b.";
  }

  if (code === "required_assignment_not_completed") {
    return "\u0427\u0442\u043e\u0431\u044b \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0443\u0440\u043e\u043a, \u0441\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0432\u0441\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f.";
  }

  return formatApiError(
    err,
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0443\u0440\u043e\u043a \u043a\u0430\u043a \u0438\u0437\u0443\u0447\u0435\u043d\u043d\u044b\u0439."
  );
}


function flattenCourseLessons(courseDetail) {
  return (courseDetail?.modules || []).flatMap(
    (module) =>
      (module.lessons || []).map(
        (lesson) => ({
          ...lesson,
          moduleTitle: module.title,
        })
      )
  );
}


function getNextIncompleteLesson(
  lessons,
  currentLessonId
) {
  if (!Array.isArray(lessons) || !lessons.length) {
    return null;
  }

  const currentIndex = lessons.findIndex(
    (lesson) => lesson.id === currentLessonId
  );

  const laterLessons =
    currentIndex >= 0
      ? lessons.slice(currentIndex + 1)
      : lessons;

  return (
    laterLessons.find(
      (lesson) => !lesson.is_completed
    ) ||
    lessons.find(
      (lesson) =>
        lesson.id !== currentLessonId &&
        !lesson.is_completed
    ) ||
    null
  );
}


function getNextLesson(
  lessons,
  currentLessonId
) {
  if (!Array.isArray(lessons) || !lessons.length) {
    return null;
  }

  const currentIndex = lessons.findIndex(
    (lesson) => lesson.id === currentLessonId
  );

  if (currentIndex < 0) {
    return null;
  }

  return lessons[currentIndex + 1] || null;
}

function getPreviousLesson(
  lessons,
  currentLessonId
) {
  if (!Array.isArray(lessons) || !lessons.length) {
    return null;
  }

  const currentIndex = lessons.findIndex(
    (lesson) => lesson.id === currentLessonId
  );

  if (currentIndex <= 0) {
    return null;
  }

  return lessons[currentIndex - 1] || null;
}


function getCourseCompletionErrorMessage(err) {
  const detail = err?.payload?.detail;

  if (
    detail
    === "Complete required lessons before completing course"
  ) {
    return "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u0432\u0441\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0443\u0440\u043e\u043a\u0438.";
  }

  if (
    detail
    === "Completed course cannot be changed"
  ) {
    return "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430.";
  }

  if (
    detail
    === "Cancelled enrollment cannot be changed"
  ) {
    return "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043f\u043e \u044d\u0442\u043e\u0439 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0435 \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u043e.";
  }

  return formatApiError(
    err,
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443."
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
  const [lessonCompletionLoading, setLessonCompletionLoading] = useState(false);
  const [lessonCompletionError, setLessonCompletionError] = useState("");
  const [lessonCompletionSuccess, setLessonCompletionSuccess] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [courseContentsOpen, setCourseContentsOpen] = useState(false);

  const [
    courseCompletionLoading,
    setCourseCompletionLoading,
  ] = useState(false);

  const [
    courseCompletionError,
    setCourseCompletionError,
  ] = useState("");

  const [
    courseCompletionSuccess,
    setCourseCompletionSuccess,
  ] = useState("");

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
    () => flattenCourseLessons(detail),
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

  const nextIncompleteLesson = useMemo(
    () =>
      getNextIncompleteLesson(
        allLessons,
        selectedLesson?.id
      ),
    [allLessons, selectedLesson]
  );

  const nextLesson = useMemo(
    () =>
      getNextLesson(
        allLessons,
        selectedLesson?.id
      ),
    [allLessons, selectedLesson]
  );

  const previousLesson = useMemo(
    () =>
      getPreviousLesson(
        allLessons,
        selectedLesson?.id
      ),
    [allLessons, selectedLesson]
  );

  const selectedLessonIndex = selectedLesson
    ? allLessons.findIndex(
        (lesson) => lesson.id === selectedLesson.id
      )
    : -1;

  const selectedLessonNumber =
    selectedLessonIndex >= 0
      ? selectedLessonIndex + 1
      : 0;

  const requestedLessonMissing = Boolean(
    lessonId &&
    detail &&
    !selectedLesson
  );

  const effectiveProgress = clampPercent(
    detail?.required_progress_percent
  );

  const requiredLessonsTotal = Math.max(
    0,
    Number(
      detail?.required_lessons_total || 0
    )
  );

  const requiredLessonsCompleted = Math.max(
    0,
    Number(
      detail?.required_lessons_completed || 0
    )
  );

  const remainingRequiredLessons = Math.max(
    0,
    requiredLessonsTotal
      - requiredLessonsCompleted
  );

  const courseCompletionEligible = Boolean(
    detail?.status === "active"
    && requiredLessonsCompleted
      >= requiredLessonsTotal
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

  function handleOpenDocuments() {
    try {
      sessionStorage.setItem(
        "obrportal_account_section",
        "documents"
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

    setLessonCompletionError("");
    setLessonCompletionSuccess("");
    setCourseContentsOpen(false);

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

  async function handleCompleteLesson() {
    if (
      !enrollmentId ||
      !selectedLesson ||
      readOnly ||
      selectedLesson.is_completed ||
      lessonCompletionLoading
    ) {
      return;
    }

    const completedLessonId = selectedLesson.id;
    const completedLessonTitle = selectedLesson.title;

    try {
      setLessonCompletionLoading(true);
      setLessonCompletionError("");
      setLessonCompletionSuccess("");

      const response =
        await completeAccountCourseLesson(
          enrollmentId,
          completedLessonId
        );

      const updatedLessons =
        flattenCourseLessons(response);

      const nextIncompleteLesson =
        getNextIncompleteLesson(
          updatedLessons,
          completedLessonId
        );

      setDetail(response);

      if (nextIncompleteLesson) {
        setLessonCompletionSuccess(
          `\u0423\u0440\u043e\u043a \u00ab${completedLessonTitle}\u00bb \u0438\u0437\u0443\u0447\u0435\u043d. \u041e\u0442\u043a\u0440\u044b\u0442 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0443\u0440\u043e\u043a: ${nextIncompleteLesson.title}.`
        );

        navigate(
          `/account/courses/${enrollmentId}/lessons/${nextIncompleteLesson.id}`
        );
      } else {
        setLessonCompletionSuccess(
          "\u0423\u0440\u043e\u043a \u0438\u0437\u0443\u0447\u0435\u043d. \u0412\u0441\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0443\u0440\u043e\u043a\u0438 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u044b."
        );
      }
    } catch (err) {
      setLessonCompletionError(
        getLessonCompletionErrorMessage(err)
      );
      setLessonCompletionSuccess("");
    } finally {
      setLessonCompletionLoading(false);
    }
  }


  async function handleCompleteCourse() {
    if (
      !enrollmentId
      || detail?.status !== "active"
      || courseCompletionLoading
    ) {
      return;
    }

    if (!courseCompletionEligible) {
      setCourseCompletionError(
        `\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0443\u0440\u043e\u043a\u0438: ${requiredLessonsCompleted} \u0438\u0437 ${requiredLessonsTotal}.`
      );

      setCourseCompletionSuccess("");
      return;
    }

    try {
      setCourseCompletionLoading(true);
      setCourseCompletionError("");
      setCourseCompletionSuccess("");

      const completedCourse =
        await completeAccountCourse(
          enrollmentId
        );

      let refreshedDetail = null;

      try {
        refreshedDetail =
          await getAccountCourseDetail(
            enrollmentId
          );
      } catch {
        refreshedDetail = null;
      }

      if (refreshedDetail) {
        setDetail(refreshedDetail);
      } else {
        setDetail((current) => (
          current
            ? {
                ...current,
                ...completedCourse,
                status:
                  completedCourse?.status
                  || "completed",
                completed_at:
                  completedCourse?.completed_at
                  || current.completed_at
                  || null,
              }
            : completedCourse
        ));
      }

      setCourseCompletionSuccess(
        "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430."
      );
    } catch (err) {
      setCourseCompletionError(
        getCourseCompletionErrorMessage(
          err
        )
      );

      setCourseCompletionSuccess("");
    } finally {
      setCourseCompletionLoading(false);
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

      <header className="mt-4 border-b border-slate-100 pb-6">
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

        <div
            data-testid="learner-course-progress-summary"
            className="mt-6 border-t border-slate-100 pt-5"
        >
          <div
            data-testid="learner-course-progress-card"
            className="space-y-4"
          >
            <div
              data-testid="learner-course-progress-header"
              className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Ваш прогресс
                </div>

                <div className="mt-1 text-xl font-black text-slate-950">
                  {effectiveProgress}%
                </div>
              </div>

              <div
                className={
                  detail?.status === "completed"
                    ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200"
                    : "rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200"
                }
              >
                {detail?.status === "completed"
                  ? "Курс завершён"
                  : "В процессе"}
              </div>
            </div>

          <div
            data-testid="learner-course-progress-bar"
            className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              data-testid="learner-course-progress-fill"
              className={
                effectiveProgress >= 100
                  ? "h-full rounded-full bg-green-600 transition-all duration-500 ease-out"
                  : "h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
              }
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

          <div
            data-testid="learner-course-required-summary"
            className="mt-4 border-t border-slate-100 pt-4"
          >
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Обязательные уроки
            </div>

            <div className="mt-1 text-sm font-black text-slate-900">
              {requiredLessonsCompleted} из {requiredLessonsTotal}
            </div>

            {remainingRequiredLessons > 0 ? (
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Осталось пройти: {remainingRequiredLessons}
              </div>
            ) : (
              <div className="mt-1 text-xs font-semibold text-green-600">
                Все обязательные уроки завершены
              </div>
            )}
          </div>

          {nextIncompleteLesson ? (
            <div
                data-testid="learner-course-next-step"
                className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Следующий шаг
              </div>

              <div className="mt-2 text-sm font-black text-slate-900">
                {nextIncompleteLesson.title}
              </div>

              <button
                type="button"
                onClick={() =>
                  handleOpenLesson(nextIncompleteLesson.id)
                }
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Продолжить обучение
              </button>
            </div>
          ) : null}
        </div>
        </div>
      </header>

      {detail.status === "active" ? (
        <div
          data-testid="learner-course-course-completion"
          className={courseCompletionEligible ? "mt-4 rounded-2xl bg-green-50 p-5 ring-1 ring-green-200" : "mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200"}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-950">
                {"\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b"}
              </div>

              {courseCompletionEligible ? (
                <div
                  data-testid="learner-course-course-completion-eligible"
                  className="mt-1 text-sm text-green-700"
                >
                  {"\u0412\u0441\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0443\u0440\u043e\u043a\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u044b. \u041c\u043e\u0436\u043d\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443."}
                </div>
              ) : (
                <div
                  data-testid="learner-course-course-completion-blocked"
                  className="mt-1 text-sm text-slate-600"
                >
                  {"\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0443\u0440\u043e\u043a\u0438: "}
                  <span className="font-bold text-slate-900">
                    {requiredLessonsCompleted}
                    {" \u0438\u0437 "}
                    {requiredLessonsTotal}
                  </span>
                  {remainingRequiredLessons > 0
                    ? ` \u00b7 \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c ${remainingRequiredLessons}`
                    : ""}
                </div>
              )}
            </div>

            <button
              data-testid="learner-course-complete-course-button"
              type="button"
              onClick={handleCompleteCourse}
              disabled={
                courseCompletionLoading
                || !courseCompletionEligible
              }
              className={courseCompletionEligible ? "inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50" : "inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 transition disabled:cursor-not-allowed"}
            >
              <CheckCircle2 className="h-4 w-4" />

              {courseCompletionLoading
                ? "\u0417\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u043c..."
                : "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443"}
            </button>
          </div>
        </div>
      ) : null}

      {courseCompletionError ? (
        <div
          data-testid="learner-course-course-completion-error"
          className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100"
        >
          {courseCompletionError}
        </div>
      ) : null}

      {courseCompletionSuccess ? (
        <div
          data-testid="learner-course-course-completion-success"
          className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700 ring-1 ring-green-100"
        >
          {courseCompletionSuccess}
        </div>
      ) : null}

      {detail.status === "completed" ? (
        <div
          data-testid="learner-course-course-completed"
          className="mt-4 flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-100"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />

          <div>
            <div className="font-bold">
              Программа завершена
            </div>
            <div className="mt-1">
              Материалы доступны для просмотра. Изменение прогресса отключено.
            </div>
            <button
              data-testid="learner-course-open-documents-button"
              type="button"
              onClick={handleOpenDocuments}
              className="mt-3 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              {"\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c"}
            </button>

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
        <aside data-testid="learner-course-sidebar" className="self-start rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-24">
          <button
            type="button"
            data-testid="learner-course-sidebar-toggle"
            aria-expanded={courseContentsOpen}
            aria-controls="learner-course-sidebar-body"
            onClick={() =>
              setCourseContentsOpen((current) => !current)
            }
            className="flex w-full items-center justify-between gap-3 px-2 pb-3 text-left lg:hidden"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="font-black text-slate-950">
                Содержание курса
              </span>
            </span>

            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                courseContentsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div className="hidden items-center gap-2 px-2 pb-3 lg:flex">
            <BookOpen className="h-5 w-5 text-blue-600" />

            <h2 className="font-black text-slate-950">
              Содержание
            </h2>
          </div>

          <div
            id="learner-course-sidebar-body"
            data-testid="learner-course-sidebar-body"
            className={`${courseContentsOpen ? "block" : "hidden"} max-h-[70vh] space-y-4 overflow-y-auto pr-1 lg:block lg:max-h-[calc(100vh-10rem)]`}
          >
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
                        data-testid={active ? "learner-course-active-lesson" : lesson.is_completed ? "learner-course-completed-lesson" : "learner-course-sidebar-lesson"}
                        onClick={() =>
                          handleOpenLesson(lesson.id)
                        }
                        className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left ${
                          active
                            ? "bg-blue-50 text-blue-950 ring-1 ring-blue-200"
                            : lesson.is_completed
                              ? "bg-green-50 text-green-900 ring-1 ring-green-100"
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

                          {active ? (
                            <span
                              data-testid="learner-course-current-badge"
                              className="mt-1 inline-block text-[11px] font-bold text-blue-600"
                            >
                              Текущий урок
                            </span>
                          ) : null}

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
              data-testid="learner-course-content-active-lesson"
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
            >
              <div
                data-testid="learner-course-lesson-toolbar"
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    {selectedLesson.moduleTitle}
                  </div>


                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="learner-course-previous-lesson-button"
                    onClick={() =>
                      previousLesson
                        ? handleOpenLesson(previousLesson.id)
                        : null
                    }
                    disabled={!previousLesson}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Предыдущий</span>
                  </button>

                  <button
                    type="button"
                    data-testid="learner-course-toolbar-next-lesson-button"
                    onClick={() =>
                      nextLesson
                        ? handleOpenLesson(nextLesson.id)
                        : null
                    }
                    disabled={!nextLesson}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="hidden sm:inline">Следующий</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {selectedLesson.title}
                </h2>

                {selectedLesson.is_completed ? (
                  <span
                    data-testid="learner-course-lesson-status-badge"
                    className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200"
                  >
                    Урок завершён
                  </span>
                ) : (
                  <span
                    data-testid="learner-course-lesson-status-badge"
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200"
                  >
                    Текущий урок
                  </span>
                )}
              </div>

              <div
                data-testid="learner-course-lesson-meta"
                className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500"
              >
                <span>
                  Урок {selectedLessonNumber} из {allLessons.length}
                </span>

                {selectedLesson.is_required ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
                    Обязательный урок
                  </span>
                ) : null}
              </div>

              {selectedLesson.description ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {selectedLesson.description}
                </p>
              ) : null}

              {selectedLesson.content_text ? (
                <div
                  data-testid="learner-course-lesson-content"
                  className="mt-7 border-t border-slate-100 pt-6"
                >
                  <div className="mb-3 text-sm font-black text-slate-950">
                    Материал урока
                  </div>

                  <div className="max-w-3xl whitespace-pre-wrap text-base leading-7 text-slate-700">
                    {selectedLesson.content_text}
                  </div>
                </div>
              ) : null}

              {selectedLesson.content_url ? (
                <div
                  data-testid="learner-course-lesson-material-link"
                  className="mt-5 border-t border-slate-100 pt-5"
                >
                  <div className="mb-3 text-sm font-black text-slate-950">
                    Дополнительный материал
                  </div>

                  <a
                    href={selectedLesson.content_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Открыть материал
                  </a>
                </div>
              ) : null}

              {!selectedLesson.content_text &&
              !selectedLesson.content_url &&
              !(selectedLesson.blocks || []).length ? (
                <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500 ring-1 ring-slate-200">
                  Основной материал урока будет отображён здесь.
                </div>
              ) : null}

              {(selectedLesson.blocks || []).length ? (
                <div className="mt-7 border-t border-slate-100 pt-6">
                  <div className="text-sm font-black text-slate-950">
                    Материалы и задания
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
                        "presentation",
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

              <div
                data-testid="learner-course-lesson-completion"
                className="mt-7 border-t border-slate-100 pt-6"
              >
                {selectedLesson.is_completed ? (
                  <div
                    data-testid="learner-course-lesson-completed"
                    className="rounded-2xl bg-green-50 p-5 ring-1 ring-green-200"
                  >
                    <div
                      data-testid="learner-course-completed-title"
                      className="flex items-center gap-2 text-sm font-black text-green-900"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Урок завершён
                    </div>

                    <p className="mt-2 text-sm leading-6 text-green-800">
                      Отлично! Материал урока изучен, прогресс обучения обновлён.
                    </p>

                    {nextIncompleteLesson ? (
                      <div
                        data-testid="learner-course-next-lesson-preview"
                        className="mt-4 rounded-xl bg-white/70 p-3 ring-1 ring-green-200"
                      >
                        <div className="text-xs font-bold uppercase tracking-wide text-green-700">
                          Следующий урок
                        </div>

                        <div className="mt-1 text-sm font-black text-slate-900">
                          {nextIncompleteLesson.title}
                        </div>

                        <button
                          type="button"
                          data-testid="learner-course-next-lesson-button"
                          onClick={() =>
                            handleOpenLesson(nextIncompleteLesson.id)
                          }
                          className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          Перейти к следующему уроку
                        </button>
                      </div>
                    ) : (
                      <div
                        data-testid="learner-course-completed-course-card"
                        className="mt-4 rounded-xl bg-white/70 p-4 ring-1 ring-green-200"
                      >
                        <div className="text-sm font-black text-green-900">
                          {detail.status === "completed"
                            ? "🎉 Курс завершён"
                            : "Все уроки пройдены"}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-green-800">
                          {detail.status === "completed"
                            ? "Программа завершена. Все доступные материалы остаются доступными для просмотра."
                            : "Все доступные материалы программы изучены. Чтобы зафиксировать завершение обучения, завершите программу в блоке «Завершение программы»."}
                        </p>

                        <button
                          type="button"
                          onClick={() => navigate("/account")}
                          className="mt-4 inline-flex rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700"
                        >
                          Вернуться к курсам
                        </button>
                      </div>
                    )}
                  </div>
                ) : !readOnly ? (
                  <div
                    data-testid="learner-course-active-completion-card"
                    className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-200"
                  >
                    <div className="flex items-center gap-2 text-sm font-black text-blue-950">
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      Завершение урока
                    </div>

                    <div className="mt-2 text-sm leading-6 text-blue-900">
                      Вы изучили материал урока? Отметьте урок завершённым,
                      чтобы обновить прогресс обучения.
                    </div>

                    <button
                      type="button"
                      data-testid="learner-course-complete-lesson-button"
                      onClick={handleCompleteLesson}
                      disabled={lessonCompletionLoading}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-5 w-5" />

                      {lessonCompletionLoading
                        ? "Сохраняем прогресс..."
                        : "Завершить урок"}
                    </button>
                  </div>
                ) : (
                  <div
                    data-testid="learner-course-lesson-completion-read-only"
                    className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200"
                  >
                    \u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430 \u0434\u043b\u044f \u044d\u0442\u043e\u0439 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e.
                  </div>
                )}

                {lessonCompletionError ? (
                  <div
                    data-testid="learner-course-lesson-completion-error"
                    className="mt-3 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-200"
                  >
                    {lessonCompletionError}
                  </div>
                ) : null}

                {lessonCompletionSuccess ? (
                  <div
                    data-testid="learner-course-lesson-completion-success"
                    className="mt-3 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-800 ring-1 ring-green-200"
                  >
                    {lessonCompletionSuccess}
                  </div>
                ) : null}
              </div>

              <nav
                data-testid="learner-course-lesson-bottom-navigation"
                aria-label="Навигация по урокам"
                className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  onClick={() =>
                    previousLesson
                      ? handleOpenLesson(previousLesson.id)
                      : null
                  }
                  disabled={!previousLesson}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Предыдущий урок
                </button>

                <div className="text-center text-xs font-semibold text-slate-400">
                  {selectedLessonNumber} / {allLessons.length}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    nextLesson
                      ? handleOpenLesson(nextLesson.id)
                      : null
                  }
                  disabled={!nextLesson}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Следующий урок
                  <ArrowRight className="h-4 w-4" />
                </button>
              </nav>

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

import { formatApiError } from "../utils/apiErrors";
import { useEffect, useState } from "react";
import { useMemo } from "react";
import { enrollAccountCourse, getAccountCourses, getPublicCourseDetail, getPublicCourses } from "../api/client";
import { formatRuDateTimeDash as formatDateTime } from "../utils/dateFormat";

function formatCourseDocument(course) {
  return course?.document_type || course?.document || "Итоговый документ";
}

function formatCoursePrice(course) {
  return course?.price || "Стоимость уточняется";
}

function getEnrollmentStatusLabel(status) {
  switch (status) {
    case "assigned":
      return "Назначен";
    case "active":
      return "В процессе";
    case "completed":
      return "Завершён";
    case "cancelled":
      return "Отменён";
    default:
      return "Не записан";
  }
}

function getEnrollmentStatusTone(status) {
  switch (status) {
    case "assigned":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "active":
      return "bg-green-50 text-green-700 ring-green-200";
    case "completed":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-white text-slate-600 ring-slate-200";
  }
}

function getCourseLessonTypeLabel(contentType) {
  switch (contentType) {
    case "text":
      return "Текст";
    case "video":
      return "Видео";
    case "file":
      return "Файл";
    case "link":
      return "Ссылка";
    case "assignment":
      return "Задание";
    default:
      return contentType || "Материал";
  }
}

function CourseOutlineSection({ modules = [] }) {
  const courseModules = Array.isArray(modules) ? modules : [];

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Структура обучения
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Программа курса
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Модули и уроки, которые входят в опубликованную программу.
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200">
          Модулей: {courseModules.length}
        </div>
      </div>

      {courseModules.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
          Программа курса пока не опубликована.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {courseModules.map((module) => {
            const lessons = Array.isArray(module.lessons) ? module.lessons : [];

            return (
              <article
                key={module.id}
                className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Модуль {module.position}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {module.title}
                    </h3>
                    {module.description && (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {module.description}
                      </p>
                    )}
                  </div>

                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    Уроков: {lessons.length}
                  </div>
                </div>

                {lessons.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                    Уроки пока не добавлены.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Урок {lesson.position}
                            </div>
                            <h4 className="mt-1 text-base font-bold text-slate-900">
                              {lesson.title}
                            </h4>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                              {getCourseLessonTypeLabel(lesson.content_type)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                              {lesson.is_required ? "Обязательный" : "Дополнительный"}
                            </span>
                          </div>
                        </div>

                        {lesson.description && (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {lesson.description}
                          </p>
                        )}

                        {lesson.content_url && (
                          <a
                            href={lesson.content_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800"
                          >
                            Открыть материал
                          </a>
                        )}

                        {lesson.content_text && (
                          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                            {lesson.content_text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function getCourseStructureStats(course) {
  const modules = Array.isArray(course?.modules) ? course.modules : [];
  const lessons = modules.flatMap((module) => (Array.isArray(module.lessons) ? module.lessons : []));

  return {
    modulesCount: modules.length,
    lessonsCount: lessons.length,
    requiredLessonsCount: lessons.filter((lesson) => lesson.is_required).length,
  };
}

function getCourseDetailDiagnostics({
  course,
  existingEnrollment,
  user,
  enrollLoading,
  enrollError,
  enrollSuccess,
  relatedCourses,
}) {
  const items = [];
  const structure = getCourseStructureStats(course);

  if (!course) {
    items.push("Карточка: курс не выбран или не найден.");
    return items;
  }

  if (!course.slug) {
    items.push("Карточка: у курса отсутствует slug для публичного маршрута.");
  }

  if (course.is_active === false) {
    items.push("Доступность: курс неактивен и не должен быть доступен для новой самозаписи.");
  }

  if (!course.format) {
    items.push("Описание: не указан формат обучения.");
  }

  if (!course.hours) {
    items.push("Описание: не указан объём программы в часах.");
  }

  if (!formatCourseDocument(course)) {
    items.push("Документ: не указан тип итогового документа.");
  }

  if (structure.modulesCount === 0) {
    items.push("Структура: у курса пока нет опубликованных модулей.");
  }

  if (structure.lessonsCount === 0) {
    items.push("Структура: у курса пока нет опубликованных уроков.");
  }

  if (structure.lessonsCount > 0 && structure.requiredLessonsCount === 0) {
    items.push("Структура: нет обязательных уроков, завершение курса может быть неконтролируемым.");
  }

  if (!user) {
    items.push("Самозапись: пользователь не авторизован, основное действие ведёт к регистрации.");
  }

  if (user && !existingEnrollment) {
    items.push("Самозапись: пользователь авторизован и может записаться на программу.");
  }

  if (existingEnrollment?.status === "assigned") {
    items.push("Назначение: пользователь записан, курс ожидает старта обучения.");
  }

  if (existingEnrollment?.status === "active") {
    items.push("Назначение: обучение уже идёт, основное действие ведёт в личный кабинет.");
  }

  if (existingEnrollment?.status === "completed") {
    items.push("Назначение: обучение завершено, проверьте итоговые документы в личном кабинете.");
  }

  if (existingEnrollment?.status === "cancelled") {
    items.push("Назначение: запись отменена, повторная запись требует контроля администратора.");
  }

  if (enrollLoading) {
    items.push("Самозапись: запрос на запись выполняется.");
  }

  if (enrollError) {
    items.push("Самозапись: возникла ошибка записи, пользователю нужно повторить действие или обратиться в организацию.");
  }

  if (enrollSuccess) {
    items.push("Самозапись: запись выполнена успешно, курс добавлен в личный кабинет.");
  }

  if (!relatedCourses.length) {
    items.push("Навигация: похожие программы не найдены.");
  }

  return [...new Set(items)];
}

function CourseSelfEnrollmentDiagnostics({
  course,
  existingEnrollment,
  user,
  enrollLoading,
  enrollError,
  enrollSuccess,
  relatedCourses,
  diagnostics,
  onPageChange,
}) {
  const structure = getCourseStructureStats(course);
  const enrollmentLabel = existingEnrollment
    ? getEnrollmentStatusLabel(existingEnrollment.status)
    : user
      ? "Можно записаться"
      : "Требуется регистрация";

  return (
    <section
      data-testid="course-self-enrollment-diagnostics"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Диагностика карточки курса
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Карточка курса и самозапись
          </h2>
        </div>

        <span
          data-testid="course-self-enrollment-status"
          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${getEnrollmentStatusTone(existingEnrollment?.status)}`}
        >
          {enrollmentLabel}
        </span>
      </div>

      <div
        data-testid="course-self-enrollment-summary"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Slug
          </div>
          <div className="mt-2 break-all font-semibold text-slate-900">
            {course?.slug || "—"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Модули / уроки
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {structure.modulesCount} / {structure.lessonsCount}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Обязательные уроки
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {structure.requiredLessonsCount}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Итоговый документ
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {formatCourseDocument(course)}
          </div>
        </div>
      </div>

      <div
        data-testid="course-self-enrollment-attention"
        className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${
          enrollError || course?.is_active === false || structure.lessonsCount === 0
            ? "bg-amber-50 text-amber-900 ring-amber-200"
            : "bg-green-50 text-green-800 ring-green-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-slate-900">
            Что требует внимания в карточке курса
          </div>
          <span
            data-testid="course-self-enrollment-attention-count"
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            Пунктов диагностики: {diagnostics.length}
          </span>
        </div>

        {diagnostics.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {diagnostics.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">
            Критичных замечаний по карточке курса и самозаписи не найдено.
          </p>
        )}
      </div>

      <div
        data-testid="course-self-enrollment-links"
        className="mt-5 flex flex-wrap gap-3"
      >
        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Вернуться в каталог
        </button>

        <button
          type="button"
          onClick={() => onPageChange("account")}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          Личный кабинет
        </button>

        <button
          type="button"
          onClick={() => onPageChange("verify-document")}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          Проверить документ
        </button>
      </div>
    </section>
  );
}

function getPrimaryActionLabel(enrollment, user) {
  if (!user) {
    return "Зарегистрироваться и записаться";
  }

  if (!enrollment) {
    return "Записаться";
  }

  if (enrollment.status === "completed") {
    return "Посмотреть документы в кабинете";
  }

  return "Открыть личный кабинет";
}

export function CourseDetailPage({ courseSlug, onPageChange, onOpenCourse, user }) {
  const [course, setCourse] = useState(null);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [loading, setLoading] = useState(Boolean(courseSlug));
  const [error, setError] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [existingEnrollment, setExistingEnrollment] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCourse() {
      if (!courseSlug) {
        setCourse(null);
        setRelatedCourses([]);
        setExistingEnrollment(null);
        setLoading(false);
        setError("Курс не выбран.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [courseResponse, coursesResponse, accountCoursesResponse] = await Promise.all([
          getPublicCourseDetail(courseSlug),
          getPublicCourses({ limit: 6 }),
          user ? getAccountCourses() : Promise.resolve(null),
        ]);

        if (!isMounted) {
          return;
        }

        setCourse(courseResponse);
        setRelatedCourses(
          Array.isArray(coursesResponse)
            ? coursesResponse.filter((item) => item.slug !== courseResponse.slug).slice(0, 2)
            : []
        );

        const accountCourses = Array.isArray(accountCoursesResponse?.items)
          ? accountCoursesResponse.items
          : [];

        setExistingEnrollment(
          accountCourses.find(
            (item) =>
              item.course_id === courseResponse.id ||
              item.course_slug === courseResponse.slug
          ) || null
        );
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setCourse(null);
        setRelatedCourses([]);
        setExistingEnrollment(null);
        setError(formatApiError(err, "Программа не найдена."));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCourse();

    return () => {
      isMounted = false;
    };
  }, [courseSlug, user?.id]);

  const courseDiagnostics = useMemo(
    () =>
      getCourseDetailDiagnostics({
        course,
        existingEnrollment,
        user,
        enrollLoading,
        enrollError,
        enrollSuccess,
        relatedCourses,
      }),
    [course, existingEnrollment, user, enrollLoading, enrollError, enrollSuccess, relatedCourses]
  );

  async function handleEnroll() {
    if (!course) {
      return;
    }

    if (!user) {
      try {
        localStorage.setItem("obrportal_pending_enrollment_slug", course.slug);
      } catch {
        // localStorage может быть недоступен в приватном режиме или тестовой среде
      }

      onPageChange("register");
      return;
    }

    if (existingEnrollment) {
      onPageChange("account");
      return;
    }

    try {
      setEnrollLoading(true);
      setEnrollError("");
      setEnrollSuccess("");

      const createdEnrollment = await enrollAccountCourse(course.id);

      setExistingEnrollment(createdEnrollment);
      setEnrollSuccess("Вы записаны на программу. Курс добавлен в личный кабинет.");
      onPageChange("account");
    } catch (err) {
      if (err.status === 409) {
        setExistingEnrollment({
          course_id: course.id,
          course_slug: course.slug,
          status: "assigned",
        });
        setEnrollError("");
        setEnrollSuccess("Вы уже записаны на эту программу. Курс доступен в личном кабинете.");
        return;
      }

      setEnrollError(formatApiError(err, "Не удалось записаться на программу."));
    } finally {
      setEnrollLoading(false);
    }
  }
  if (loading) {
    return (
      <div className="rounded-[2rem] bg-white p-8 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
        Загружаем карточку программы...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-red-600">
          Программа не найдена
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          По этому адресу нет опубликованной карточки курса
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          {error || "Вернитесь в каталог и выберите активную программу."}
        </p>

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="mt-6 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          В каталог
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="flex flex-wrap gap-2">
          {course.format && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {course.format}
            </span>
          )}

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
            {formatCourseDocument(course)}
          </span>
        </div>

        <h1 className="mt-5 max-w-4xl text-4xl font-bold text-slate-900">
          {course.title}
        </h1>

        <div className="mt-2 text-sm text-slate-500">
          /courses/{course.slug}
        </div>

        {course.description && (
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            {course.description}
          </p>
        )}

        {existingEnrollment && (
          <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-sm text-blue-800 ring-1 ring-blue-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">
                Вы уже записаны на эту программу.
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getEnrollmentStatusTone(
                  existingEnrollment.status
                )}`}
              >
                {getEnrollmentStatusLabel(existingEnrollment.status)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-blue-100">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Организация
                </div>
                <div className="mt-2 font-semibold text-slate-900">
                  {existingEnrollment.organization_name || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-blue-100">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Группа
                </div>
                <div className="mt-2 font-semibold text-slate-900">
                  {existingEnrollment.learning_group_name || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-blue-100">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Начато
                </div>
                <div className="mt-2 font-semibold text-slate-900">
                  {formatDateTime(existingEnrollment.started_at)}
                </div>
              </div>

              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-blue-100">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Завершено
                </div>
                <div className="mt-2 font-semibold text-slate-900">
                  {formatDateTime(existingEnrollment.completed_at)}
                </div>
              </div>
            </div>
          </div>
        )}

        {enrollError && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            {enrollError}
          </div>
        )}

        {enrollSuccess && (
          <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm text-green-700 ring-1 ring-green-200">
            {enrollSuccess}
          </div>
        )}
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Формат</div>
            <div className="mt-2 font-semibold text-slate-900">{course.format || "—"}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Объём</div>
            <div className="mt-2 font-semibold text-slate-900">
              {course.hours ? `${course.hours} часов` : "—"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Стоимость</div>
            <div className="mt-2 font-semibold text-slate-900">{formatCoursePrice(course)}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Документ</div>
            <div className="mt-2 font-semibold text-slate-900">{formatCourseDocument(course)}</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleEnroll}
            disabled={enrollLoading}
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enrollLoading ? "Записываем..." : getPrimaryActionLabel(existingEnrollment, user)}
          </button>

          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Назад в каталог
          </button>
        </div>
      </section>

      <CourseSelfEnrollmentDiagnostics
        course={course}
        existingEnrollment={existingEnrollment}
        user={user}
        enrollLoading={enrollLoading}
        enrollError={enrollError}
        enrollSuccess={enrollSuccess}
        relatedCourses={relatedCourses}
        diagnostics={courseDiagnostics}
        onPageChange={onPageChange}
      />

      <CourseOutlineSection modules={course.modules} />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Что входит в программу</h2>
          <div className="mt-5 grid gap-3">
            {[
              "Доступ к материалам программы в личном кабинете",
              "Контроль прохождения и фиксация статуса обучения",
              "Итоговая проверка результата обучения",
              `Формирование итогового документа: ${formatCourseDocument(course)}`,
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Итоговая аттестация</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            После завершения программы слушатель получает итоговый документ,
            доступный в личном кабинете и проверяемый через публичный реестр.
          </p>

          <button
            type="button"
            onClick={() => onPageChange("verify-document")}
            className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Проверить документ
          </button>
        </div>
      </section>

      {relatedCourses.length > 0 && (
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Похожие программы</h2>
          <p className="mt-2 text-sm text-slate-600">
            Быстрый переход к другим доступным программам из каталога.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {relatedCourses.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
              >
                <div className="text-sm font-semibold text-blue-700">
                  {item.format || "Программа"}
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {item.title}
                </h3>
                <div className="mt-2 text-sm text-slate-600">
                  {item.hours ? `${item.hours} ч.` : "Объём уточняется"} · {formatCourseDocument(item)}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenCourse(item.slug)}
                  className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Открыть
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


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


function CourseOutlineEmptyState() {
  return (
    <div
      data-testid="course-outline-empty-state"
      className="mt-6 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"
    >
      <div
        data-testid="course-outline-empty-title"
        className="text-base font-bold text-slate-900"
      >
        Программа курса пока готовится к публикации
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Карточка уже доступна, но модули и уроки ещё не опубликованы. Можно
        вернуться в каталог или проверить страницу позже.
      </p>
    </div>
  );
}

function CourseOutlineModuleEmptyState() {
  return (
    <div
      data-testid="course-outline-module-empty-state"
      className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200"
    >
      <div
        data-testid="course-outline-module-empty-title"
        className="font-semibold text-slate-900"
      >
        Уроки в этом модуле пока готовятся
      </div>
      <p className="mt-1">
        Модуль опубликован как часть структуры программы, но материалы уроков
        будут добавлены отдельно.
      </p>
    </div>
  );
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
        <CourseOutlineEmptyState />
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
                  <CourseOutlineModuleEmptyState />
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



const LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS = {
  stage: "Stage 78.1 ? Learner Course Progress Foundation",
  title: "\u0421\u0442\u0430\u0440\u0442\u043e\u0432\u0430\u044f \u043f\u0430\u043d\u0435\u043b\u044c \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430",
  subtitle:
    "\u041f\u0430\u043d\u0435\u043b\u044c \u0441\u043e\u0431\u0438\u0440\u0430\u0435\u0442 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u043a\u0443\u0440\u0441\u0430, \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043f\u0438\u0441\u0438 \u0438 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f. \u042d\u0442\u043e \u043e\u0441\u043d\u043e\u0432\u0430 \u0431\u0443\u0434\u0443\u0449\u0435\u0433\u043e \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f \u0443\u0440\u043e\u043a\u043e\u0432 \u0438 \u0444\u0438\u043a\u0441\u0430\u0446\u0438\u0438 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430.",
  progress: "\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
  modules: "\u041c\u043e\u0434\u0443\u043b\u0438",
  lessons: "\u0423\u0440\u043e\u043a\u0438",
  requiredLessons: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0443\u0440\u043e\u043a\u0438",
  enrollmentStatus: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043f\u0438\u0441\u0438",
  nextStep: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433",
  roadmap: "\u0427\u0442\u043e \u0431\u0443\u0434\u0435\u0442 \u0434\u0430\u043b\u044c\u0448\u0435",
  loginRequired: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0432\u0445\u043e\u0434",
  canEnroll: "\u041c\u043e\u0436\u043d\u043e \u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f",
  assigned: "\u041e\u0436\u0438\u0434\u0430\u0435\u0442 \u043d\u0430\u0447\u0430\u043b\u0430",
  active: "\u0412 \u043f\u0440\u043e\u0446\u0435\u0441\u0441\u0435",
  completed: "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d",
  cancelled: "\u0417\u0430\u043f\u0438\u0441\u044c \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430",
  openAccount: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442",
  openCatalog: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433",
  registerAndEnroll: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f \u0438 \u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f",
  enroll: "\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f",
  stepContent: "\u0418\u0437\u0443\u0447\u0430\u0439\u0442\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  stepCompletion: "\u041e\u0442\u043c\u0435\u0447\u0430\u0439\u0442\u0435 \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u0435",
  stepDocument: "\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u0435 \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
};

function getLearnerCourseProgressLessons(course) {
  const modules = Array.isArray(course?.modules) ? course.modules : [];

  return modules.flatMap((module) =>
    Array.isArray(module.lessons)
      ? module.lessons.map((lesson) => ({
          ...lesson,
          module_id: module.id,
          module_title: module.title,
          module_position: module.position,
        }))
      : []
  );
}

function getLearnerCourseProgressStatus(existingEnrollment, user) {
  if (!user) {
    return {
      key: "login_required",
      label: LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.loginRequired,
      tone: "bg-amber-50 text-amber-800 ring-amber-200",
      percent: 0,
    };
  }

  if (!existingEnrollment) {
    return {
      key: "can_enroll",
      label: LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.canEnroll,
      tone: "bg-green-50 text-green-700 ring-green-200",
      percent: 0,
    };
  }

  if (existingEnrollment.status === "completed") {
    return {
      key: "completed",
      label: LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.completed,
      tone: "bg-slate-100 text-slate-700 ring-slate-200",
      percent: 100,
    };
  }

  if (existingEnrollment.status === "active") {
    return {
      key: "active",
      label: LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.active,
      tone: "bg-green-50 text-green-700 ring-green-200",
      percent: 25,
    };
  }

  if (existingEnrollment.status === "cancelled") {
    return {
      key: "cancelled",
      label: LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.cancelled,
      tone: "bg-red-50 text-red-700 ring-red-200",
      percent: 0,
    };
  }

  return {
    key: "assigned",
    label: LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.assigned,
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
    percent: 10,
  };
}

function getLearnerCourseProgressFoundationFacts(course, existingEnrollment, user) {
  const modules = Array.isArray(course?.modules) ? course.modules : [];
  const lessons = getLearnerCourseProgressLessons(course);
  const requiredLessons = lessons.filter((lesson) => lesson.is_required);
  const status = getLearnerCourseProgressStatus(existingEnrollment, user);

  const nextStep =
    status.key === "login_required"
      ? "\u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0438\u043b\u0438 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044c, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043a\u0443\u0440\u0441 \u0438 \u043d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435."
      : status.key === "can_enroll"
        ? "\u0417\u0430\u043f\u0438\u0448\u0438\u0442\u0435\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441, \u0447\u0442\u043e\u0431\u044b \u043e\u043d \u043f\u043e\u044f\u0432\u0438\u043b\u0441\u044f \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435."
        : status.key === "completed"
          ? "\u041a\u0443\u0440\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435."
          : status.key === "cancelled"
            ? "\u0417\u0430\u043f\u0438\u0441\u044c \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430. \u041e\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044c \u0432 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e \u0438\u043b\u0438 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0443 \u043a\u0443\u0440\u0441\u0430."
            : "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0438 \u043e\u0442\u0441\u043b\u0435\u0436\u0438\u0432\u0430\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441.";

  const primaryAction =
    status.key === "login_required"
      ? LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.registerAndEnroll
      : status.key === "can_enroll"
        ? LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.enroll
        : LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.openAccount;

  return {
    modulesCount: modules.length,
    lessonsCount: lessons.length,
    requiredLessonsCount: requiredLessons.length,
    status,
    percent: status.percent,
    nextStep,
    primaryAction,
  };
}

function CourseLearnerProgressFoundationPanel({
  course,
  existingEnrollment,
  user,
  onPrimaryAction,
  onPageChange,
}) {
  const facts = getLearnerCourseProgressFoundationFacts(course, existingEnrollment, user);

  return (
    <section
      data-testid="learner-course-progress-foundation-panel"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.stage}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.subtitle}
          </p>
        </div>

        <span
          data-testid="learner-course-progress-status"
          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${facts.status.tone}`}
        >
          {facts.status.label}
        </span>
      </div>

      <div
        data-testid="learner-course-progress-summary"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.progress}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.percent}%
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${facts.percent}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.modules}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.modulesCount}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.lessons}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.lessonsCount}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.requiredLessons}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.requiredLessonsCount}
          </div>
        </div>
      </div>

      <div
        data-testid="learner-course-progress-next-step"
        className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-200"
      >
        <div className="font-semibold text-slate-900">
          {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.nextStep}
        </div>
        <p className="mt-2">{facts.nextStep}</p>
      </div>

      <div
        data-testid="learner-course-progress-roadmap"
        className="mt-5 grid gap-3 md:grid-cols-3"
      >
        {[
          ["1", LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.stepContent, "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u043a\u0443\u0440\u0441\u0430 \u0438 \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442\u0435 \u0443\u0440\u043e\u043a\u0438 \u043f\u043e \u043f\u043e\u0440\u044f\u0434\u043a\u0443."],
          ["2", LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.stepCompletion, "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0435 \u044d\u0442\u0430\u043f\u044b \u0434\u043e\u0431\u0430\u0432\u044f\u0442 \u0444\u0438\u043a\u0441\u0430\u0446\u0438\u044e \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u0443\u0440\u043e\u043a\u043e\u0432 \u0438 \u0437\u0430\u0434\u0430\u043d\u0438\u0439."],
          ["3", LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.stepDocument, `\u041f\u043e\u0441\u043b\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043a\u0443\u0440\u0441\u0430 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442: ${formatCourseDocument(course)}.`],
        ].map(([number, title, description]) => (
          <div
            key={number}
            className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900 ring-1 ring-slate-200">
              {number}
            </div>
            <div className="mt-3 font-semibold text-slate-900">{title}</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">{description}</div>
          </div>
        ))}
      </div>

      <div
        data-testid="learner-course-progress-actions"
        className="mt-5 flex flex-wrap gap-3"
      >
        <button
          type="button"
          onClick={onPrimaryAction}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {facts.primaryAction}
        </button>

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.openCatalog}
        </button>

        <button
          type="button"
          onClick={() => onPageChange("account")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS.openAccount}
        </button>
      </div>
    </section>
  );
}


const LEARNER_LESSON_ACCESS_UX_LABELS = {
  stage: "Stage 78.2 \u00b7 Learner Lesson Access UX",
  title: "\u041a\u0430\u0440\u0442\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u0443\u0440\u043e\u043a\u0430\u043c",
  subtitle:
    "\u0411\u043b\u043e\u043a \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u043a\u0430\u043a\u0438\u0435 \u0443\u0440\u043e\u043a\u0438 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044c \u0441\u043c\u043e\u0436\u0435\u0442 \u043e\u0442\u043a\u0440\u044b\u0442\u044c, \u0447\u0442\u043e \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e \u0434\u043b\u044f \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f \u0438 \u043a\u0430\u043a\u043e\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043b\u0443\u0447\u0448\u0435 \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0435\u0440\u0432\u044b\u043c.",
  availableLessons: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0443\u0440\u043e\u043a\u0438",
  requiredLessons: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435",
  hiddenLessons: "\u0421\u043a\u0440\u044b\u0442\u044b\u0435",
  firstStep: "\u041f\u0435\u0440\u0432\u044b\u0439 \u0448\u0430\u0433",
  lessonMap: "\u041a\u0430\u0440\u0442\u0430 \u0443\u0440\u043e\u043a\u043e\u0432",
  module: "\u041c\u043e\u0434\u0443\u043b\u044c",
  lesson: "\u0423\u0440\u043e\u043a",
  required: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439",
  optional: "\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439",
  available: "\u0414\u043e\u0441\u0442\u0443\u043f\u0435\u043d",
  unavailable: "\u041d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d",
  hidden: "\u0421\u043a\u0440\u044b\u0442",
  loginRequired: "\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0443\u0440\u043e\u043a\u0438",
  enrollRequired: "\u0417\u0430\u043f\u0438\u0448\u0438\u0442\u0435\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441, \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0443\u0440\u043e\u043a\u0438",
  continueLearning: "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u0435 \u0441 \u043f\u0435\u0440\u0432\u043e\u0433\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0433\u043e \u0443\u0440\u043e\u043a\u0430",
  noLessons: "\u0412 \u043a\u0443\u0440\u0441\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0443\u0440\u043e\u043a\u043e\u0432.",
  openAccount: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442",
  enroll: "\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f",
  openCatalog: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433",
};

function getLearnerLessonAccessTypeLabel(contentType) {
  const normalized = `${contentType || "text"}`.toLowerCase();

  const labels = {
    text: "\u0422\u0435\u043a\u0441\u0442",
    video: "\u0412\u0438\u0434\u0435\u043e",
    file: "\u0424\u0430\u0439\u043b",
    link: "\u0421\u0441\u044b\u043b\u043a\u0430",
    assignment: "\u0417\u0430\u0434\u0430\u043d\u0438\u0435",
  };

  return labels[normalized] || labels.text;
}

function getLearnerLessonAccessMode(existingEnrollment, user) {
  if (!user) {
    return {
      key: "login_required",
      label: LEARNER_LESSON_ACCESS_UX_LABELS.loginRequired,
      canOpenLessons: false,
    };
  }

  if (!existingEnrollment) {
    return {
      key: "enroll_required",
      label: LEARNER_LESSON_ACCESS_UX_LABELS.enrollRequired,
      canOpenLessons: false,
    };
  }

  if (existingEnrollment.status === "cancelled") {
    return {
      key: "enroll_required",
      label: LEARNER_LESSON_ACCESS_UX_LABELS.enrollRequired,
      canOpenLessons: false,
    };
  }

  return {
    key: "can_open",
    label: LEARNER_LESSON_ACCESS_UX_LABELS.continueLearning,
    canOpenLessons: true,
  };
}

function getLearnerLessonAccessFacts(course, existingEnrollment, user) {
  const modules = Array.isArray(course?.modules) ? course.modules : [];
  const mode = getLearnerLessonAccessMode(existingEnrollment, user);

  const lessons = modules.flatMap((module) =>
    Array.isArray(module.lessons)
      ? module.lessons.map((lesson) => {
          const active = lesson.is_active !== false;
          const available = active && mode.canOpenLessons;

          return {
            ...lesson,
            module_id: module.id,
            module_title: module.title,
            module_position: module.position,
            active,
            available,
            accessLabel: !active
              ? LEARNER_LESSON_ACCESS_UX_LABELS.hidden
              : available
                ? LEARNER_LESSON_ACCESS_UX_LABELS.available
                : LEARNER_LESSON_ACCESS_UX_LABELS.unavailable,
            requiredLabel: lesson.is_required
              ? LEARNER_LESSON_ACCESS_UX_LABELS.required
              : LEARNER_LESSON_ACCESS_UX_LABELS.optional,
            contentTypeLabel: getLearnerLessonAccessTypeLabel(lesson.content_type),
          };
        })
      : []
  );

  const availableLessons = lessons.filter((lesson) => lesson.available);
  const requiredLessons = lessons.filter((lesson) => lesson.is_required);
  const hiddenLessons = lessons.filter((lesson) => !lesson.active);
  const firstAvailableLesson = availableLessons[0] || null;

  return {
    mode,
    modules,
    lessons,
    availableLessons,
    requiredLessons,
    hiddenLessons,
    firstAvailableLesson,
    firstStep: firstAvailableLesson
      ? `${firstAvailableLesson.module_title || LEARNER_LESSON_ACCESS_UX_LABELS.module}: ${firstAvailableLesson.title}`
      : mode.label,
  };
}

function CourseLearnerLessonAccessPanel({
  course,
  existingEnrollment,
  user,
  onPrimaryAction,
  onPageChange,
}) {
  const facts = getLearnerLessonAccessFacts(course, existingEnrollment, user);

  return (
    <section
      data-testid="learner-lesson-access-panel"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {LEARNER_LESSON_ACCESS_UX_LABELS.stage}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {LEARNER_LESSON_ACCESS_UX_LABELS.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {LEARNER_LESSON_ACCESS_UX_LABELS.subtitle}
          </p>
        </div>

        <span
          data-testid="learner-lesson-access-mode"
          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
            facts.mode.canOpenLessons
              ? "bg-green-50 text-green-700 ring-green-200"
              : "bg-amber-50 text-amber-800 ring-amber-200"
          }`}
        >
          {facts.mode.label}
        </span>
      </div>

      <div
        data-testid="learner-lesson-access-summary"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_ACCESS_UX_LABELS.availableLessons}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.availableLessons.length}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_ACCESS_UX_LABELS.requiredLessons}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.requiredLessons.length}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_ACCESS_UX_LABELS.hiddenLessons}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.hiddenLessons.length}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_ACCESS_UX_LABELS.firstStep}
          </div>
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">
            {facts.firstStep}
          </div>
        </div>
      </div>

      <div
        data-testid="learner-lesson-access-map"
        className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
      >
        <div className="text-sm font-bold text-slate-900">
          {LEARNER_LESSON_ACCESS_UX_LABELS.lessonMap}
        </div>

        {facts.modules.length ? (
          <div className="mt-4 space-y-4">
            {facts.modules.map((module) => {
              const moduleLessons = facts.lessons.filter((lesson) => lesson.module_id === module.id);

              return (
                <div
                  key={module.id}
                  data-testid="learner-lesson-access-module"
                  className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                >
                  <div className="text-sm font-bold text-slate-900">
                    {module.position ? `${module.position}. ` : ""}
                    {module.title}
                  </div>

                  {moduleLessons.length ? (
                    <div className="mt-3 space-y-2">
                      {moduleLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          data-testid="learner-lesson-access-lesson"
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {lesson.position ? `${lesson.position}. ` : ""}
                              {lesson.title}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
                                {lesson.contentTypeLabel}
                              </span>
                              <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
                                {lesson.requiredLabel}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                              lesson.available
                                ? "bg-green-50 text-green-700 ring-green-200"
                                : lesson.active
                                  ? "bg-amber-50 text-amber-800 ring-amber-200"
                                  : "bg-slate-100 text-slate-600 ring-slate-200"
                            }`}
                          >
                            {lesson.accessLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      {LEARNER_LESSON_ACCESS_UX_LABELS.noLessons}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            {LEARNER_LESSON_ACCESS_UX_LABELS.noLessons}
          </p>
        )}
      </div>

      <div
        data-testid="learner-lesson-access-actions"
        className="mt-5 flex flex-wrap gap-3"
      >
        <button
          type="button"
          onClick={onPrimaryAction}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {facts.mode.key === "can_open"
            ? LEARNER_LESSON_ACCESS_UX_LABELS.openAccount
            : LEARNER_LESSON_ACCESS_UX_LABELS.enroll}
        </button>

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_LESSON_ACCESS_UX_LABELS.openCatalog}
        </button>
      </div>
    </section>
  );
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



function CourseDetailServiceState({ variant, error, onPageChange }) {
  const isLoading = variant === "loading";
  const testId = isLoading ? "course-detail-loading-state" : "course-detail-not-found-state";
  const title = isLoading
    ? "Загружаем карточку программы"
    : "По этому адресу нет опубликованной карточки курса";
  const eyebrow = isLoading ? "Загрузка" : "Программа не найдена";
  const description = isLoading
    ? "Получаем описание программы, структуру обучения и статус записи в личном кабинете."
    : error || "Вернитесь в каталог и выберите активную опубликованную программу.";

  return (
    <section
      data-testid={testId}
      className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10"
    >
      <div className={isLoading ? "text-sm font-semibold uppercase tracking-wide text-blue-600" : "text-sm font-semibold uppercase tracking-wide text-red-600"}>
        {eyebrow}
      </div>
      <h1
        data-testid="course-detail-state-title"
        className="mt-2 text-3xl font-bold text-slate-900"
      >
        {title}
      </h1>
      <p
        data-testid="course-detail-state-description"
        className="mt-4 max-w-2xl text-sm leading-6 text-slate-600"
      >
        {description}
      </p>

      {isLoading ? (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {["Описание", "Структура", "Статус записи"].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-200"
              aria-label={`Загружается: ${item}`}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            data-testid="course-detail-state-catalog-action"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            В каталог
          </button>

          <button
            type="button"
            data-testid="course-detail-state-verify-action"
            onClick={() => onPageChange("verify-document")}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Проверить документ
          </button>
        </div>
      )}
    </section>
  );
}

function CourseDetailLearnerJourneyHint({
  course,
  existingEnrollment,
  user,
  enrollLoading,
  onPrimaryAction,
  onPageChange,
}) {
  const structure = getCourseStructureStats(course);
  const enrollmentLabel = existingEnrollment
    ? getEnrollmentStatusLabel(existingEnrollment.status)
    : user
      ? "Можно записаться"
      : "Требуется регистрация";

  const statusTone = existingEnrollment
    ? getEnrollmentStatusTone(existingEnrollment.status)
    : user
      ? "bg-green-50 text-green-700 ring-green-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";

  const nextStepText = !user
    ? "Зарегистрируйтесь, чтобы сохранить выбранную программу и продолжить запись."
    : existingEnrollment?.status === "completed"
      ? "Обучение завершено. Итоговые документы доступны в личном кабинете и проверяются по публичному коду."
      : existingEnrollment
        ? "Курс уже есть в личном кабинете. Продолжите обучение или проверьте статус программы."
        : "После записи курс откроется в личном кабинете, где будет доступен прогресс и итоговый документ.";

  return (
    <section
      data-testid="course-detail-learner-journey"
      className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-200">
            Маршрут по программе
          </div>
          <h2 className="mt-2 text-2xl font-bold">
            Карточка курса → запись → личный кабинет
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            На этой странице можно проверить содержание программы, записаться на курс
            или перейти к уже назначенному обучению.
          </p>
        </div>

        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${statusTone}`}>
          {enrollmentLabel}
        </div>
      </div>

      <div
        data-testid="course-detail-learner-journey-steps"
        className="mt-5 grid gap-3 md:grid-cols-3"
      >
        {[
          [
            "1",
            "Проверьте содержание",
            `Модулей: ${structure.modulesCount}, уроков: ${structure.lessonsCount}, обязательных: ${structure.requiredLessonsCount}.`,
          ],
          [
            "2",
            "Запишитесь или войдите",
            "Для записи нужен личный кабинет. Анонимному пользователю сначала откроется регистрация.",
          ],
          [
            "3",
            "Получите результат",
            `После прохождения формируется итоговый документ: ${formatCourseDocument(course)}.`,
          ],
        ].map(([number, title, description]) => (
          <div
            key={number}
            className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900">
              {number}
            </div>
            <div className="mt-3 font-semibold">{title}</div>
            <div className="mt-2 text-sm leading-6 text-slate-200">{description}</div>
          </div>
        ))}
      </div>

      <div
        data-testid="course-detail-learner-journey-next-step"
        className="mt-5 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-slate-200 ring-1 ring-white/15"
      >
        {nextStepText}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="course-detail-learner-journey-primary-action"
          onClick={onPrimaryAction}
          disabled={enrollLoading}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enrollLoading ? "Записываем..." : getPrimaryActionLabel(existingEnrollment, user)}
        </button>

        <button
          type="button"
          data-testid="course-detail-learner-journey-account-action"
          onClick={() => onPageChange("account")}
          className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
        >
          Личный кабинет
        </button>

        <button
          type="button"
          data-testid="course-detail-learner-journey-verify-action"
          onClick={() => onPageChange("verify-document")}
          className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
        >
          Проверить документ
        </button>
      </div>
    </section>
  );
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
    return <CourseDetailServiceState variant="loading" onPageChange={onPageChange} />;
  }

  if (!course) {
    return (
      <CourseDetailServiceState
        variant="not-found"
        error={error}
        onPageChange={onPageChange}
      />
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

      <CourseDetailLearnerJourneyHint
        course={course}
        existingEnrollment={existingEnrollment}
        user={user}
        enrollLoading={enrollLoading}
        onPrimaryAction={handleEnroll}
        onPageChange={onPageChange}
      />

      <CourseLearnerProgressFoundationPanel
        course={course}
        existingEnrollment={existingEnrollment}
        user={user}
        onPrimaryAction={handleEnroll}
        onPageChange={onPageChange}
      />

      <CourseLearnerLessonAccessPanel
        course={course}
        existingEnrollment={existingEnrollment}
        user={user}
        onPrimaryAction={handleEnroll}
        onPageChange={onPageChange}
      />

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


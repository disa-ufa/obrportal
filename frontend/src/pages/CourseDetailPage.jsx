import { formatApiError } from "../utils/apiErrors";
import { useEffect, useRef, useState } from "react";
import { useMemo } from "react";
import { completeAccountCourse, completeAccountCourseLesson, downloadAccountDocument, enrollAccountCourse, getAccountCourseDetail, getAccountCourses, getAccountDocuments, getPublicCourseDetail, getPublicCourses } from "../api/client";
import { DocumentVerificationQrBlock } from "../components/documents/DocumentVerificationQrBlock";
import { formatRuDateTimeDash as formatDateTime } from "../utils/dateFormat";

function formatCourseDocument(course) {
  return course?.document_type || course?.document || "Итоговый документ";
}

function formatCoursePrice(course) {
  return course?.price || "Стоимость уточняется";
}

function normalizeProgressPercent(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function getEnrollmentId(enrollment) {
  return enrollment?.enrollment_id || enrollment?.id || "";
}

function getLessonCompleted(lesson) {
  return Boolean(lesson?.is_completed || lesson?.completed_at || lesson?.status === "completed");
}

function mergeCourseWithAccountCourseDetail(course, accountCourseDetail) {
  if (!course || !accountCourseDetail) {
    return course;
  }

  return {
    ...course,
    modules: Array.isArray(accountCourseDetail.modules) ? accountCourseDetail.modules : course.modules,
    learner_progress: {
      lessons_total: accountCourseDetail.lessons_total || 0,
      lessons_completed: accountCourseDetail.lessons_completed || 0,
      required_lessons_total: accountCourseDetail.required_lessons_total || 0,
      required_lessons_completed: accountCourseDetail.required_lessons_completed || 0,
      progress_percent: normalizeProgressPercent(accountCourseDetail.progress_percent),
      required_progress_percent: normalizeProgressPercent(accountCourseDetail.required_progress_percent),
    },
  };
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

  const realProgressPercent = normalizeProgressPercent(
    existingEnrollment.progress_percent ?? existingEnrollment.required_progress_percent
  );

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
      percent: realProgressPercent,
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
    percent: realProgressPercent,
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


const LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS = {
  stage: "Stage 78.3 \u00b7 Learner Lesson Content Preview UX",
  title: "\u041f\u0440\u0435\u0432\u044c\u044e \u0441\u043e\u0434\u0435\u0440\u0436\u0438\u043c\u043e\u0433\u043e \u0443\u0440\u043e\u043a\u043e\u0432",
  subtitle:
    "\u0411\u043b\u043e\u043a \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044e, \u043a\u0430\u043a\u043e\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0435\u0433\u043e \u0436\u0434\u0451\u0442 \u0432 \u0443\u0440\u043e\u043a\u0430\u0445: \u0442\u0435\u043a\u0441\u0442, \u0441\u0441\u044b\u043b\u043a\u0430, \u0432\u0438\u0434\u0435\u043e, \u0444\u0430\u0439\u043b \u0438\u043b\u0438 \u0437\u0430\u0434\u0430\u043d\u0438\u0435.",
  availablePreview: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0435 \u043f\u0440\u0435\u0432\u044c\u044e",
  previewLocked: "\u041f\u0440\u0435\u0432\u044c\u044e \u0437\u0430\u043a\u0440\u044b\u0442\u043e",
  previewEmpty: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u043f\u0440\u0435\u0432\u044c\u044e",
  firstAvailable: "\u041f\u0435\u0440\u0432\u044b\u0439 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0439 \u0443\u0440\u043e\u043a",
  previewType: "\u0422\u0438\u043f \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u0430",
  learnerAction: "\u0427\u0442\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c",
  contentPreview: "\u041f\u0440\u0435\u0432\u044c\u044e \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u0430",
  required: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439",
  optional: "\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439",
  textMaterial: "\u0422\u0435\u043a\u0441\u0442\u043e\u0432\u044b\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  urlMaterial: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043f\u043e URL",
  assignmentMaterial: "\u0417\u0430\u0434\u0430\u043d\u0438\u0435",
  openMaterial: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  openAccount: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442",
  enroll: "\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f",
  openCatalog: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433",
  loginRequired: "\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0432\u0438\u0434\u0435\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0443\u0440\u043e\u043a\u043e\u0432.",
  enrollRequired: "\u0417\u0430\u043f\u0438\u0448\u0438\u0442\u0435\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441, \u0447\u0442\u043e\u0431\u044b \u0432\u0438\u0434\u0435\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0443\u0440\u043e\u043a\u043e\u0432.",
  studyText: "\u0418\u0437\u0443\u0447\u0438\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0438 \u043f\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043a \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u043c\u0443 \u0443\u0440\u043e\u043a\u0443.",
  openUrl: "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043f\u043e \u0441\u0441\u044b\u043b\u043a\u0435 \u0438 \u0432\u0435\u0440\u043d\u0438\u0442\u0435\u0441\u044c \u043a \u043a\u0443\u0440\u0441\u0443.",
  completeAssignment: "\u0418\u0437\u0443\u0447\u0438\u0442\u0435 \u0443\u0441\u043b\u043e\u0432\u0438\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u044c\u0442\u0435 \u043e\u0442\u0432\u0435\u0442.",
  noContent: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0443\u0440\u043e\u043a\u0430 \u0435\u0449\u0451 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d.",
  noLessons: "\u0412 \u043a\u0443\u0440\u0441\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0443\u0440\u043e\u043a\u043e\u0432.",
};

function getLearnerLessonContentPreviewSummary(value, maxLength = 260) {
  const text = `${value || ""}`.trim();

  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function getLearnerLessonContentPreviewUrlHost(url) {
  const value = `${url || ""}`.trim();

  if (!value) {
    return "";
  }

  try {
    const normalized = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
    return new URL(normalized).host;
  } catch {
    return value;
  }
}

function getLearnerLessonContentPreviewType(contentType) {
  const normalized = `${contentType || "text"}`.toLowerCase();

  if (["video", "file", "link"].includes(normalized)) {
    return LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.urlMaterial;
  }

  if (normalized === "assignment") {
    return LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.assignmentMaterial;
  }

  return LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.textMaterial;
}

function getLearnerLessonContentPreviewAction(contentType) {
  const normalized = `${contentType || "text"}`.toLowerCase();

  if (["video", "file", "link"].includes(normalized)) {
    return LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.openUrl;
  }

  if (normalized === "assignment") {
    return LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.completeAssignment;
  }

  return LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.studyText;
}

function getLearnerLessonContentPreviewFacts(course, existingEnrollment, user, selectedLessonId = "") {
  const accessFacts = getLearnerLessonAccessFacts(course, existingEnrollment, user);
  const lesson = getLearnerLessonBlockViewerSelectedLesson(accessFacts, selectedLessonId);

  if (!lesson) {
    return {
      mode: accessFacts.mode,
      lesson: null,
      locked: !accessFacts.mode.canOpenLessons,
      ready: false,
      previewType: "",
      previewText: LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.noLessons,
      url: "",
      urlHost: "",
      action: accessFacts.mode.label,
    };
  }

  const contentType = `${lesson.content_type || "text"}`.toLowerCase();
  const locked = !accessFacts.mode.canOpenLessons || !lesson.active;
  const url = `${lesson.content_url || ""}`.trim();
  const text = `${lesson.content_text || ""}`.trim();
  const description = `${lesson.description || ""}`.trim();

  const previewText =
    contentType === "assignment"
      ? getLearnerLessonContentPreviewSummary(description || text)
      : ["video", "file", "link"].includes(contentType)
        ? getLearnerLessonContentPreviewUrlHost(url) || getLearnerLessonContentPreviewSummary(description)
        : getLearnerLessonContentPreviewSummary(text || description);

  return {
    mode: accessFacts.mode,
    lesson,
    locked,
    ready: Boolean(previewText),
    previewType: getLearnerLessonContentPreviewType(contentType),
    previewText: previewText || LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.noContent,
    url,
    urlHost: getLearnerLessonContentPreviewUrlHost(url),
    action: locked ? accessFacts.mode.label : getLearnerLessonContentPreviewAction(contentType),
  };
}

function CourseLearnerLessonContentPreviewPanel({
  course,
  existingEnrollment,
  user,
  onPrimaryAction,
  onPageChange,
  selectedLessonId = "",
}) {
  const facts = getLearnerLessonContentPreviewFacts(course, existingEnrollment, user, selectedLessonId);
  const lesson = facts.lesson;

  return (
    <section
      data-testid="learner-lesson-content-preview-panel"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.stage}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.subtitle}
          </p>
        </div>

        <span
          data-testid="learner-lesson-content-preview-status"
          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
            !lesson
              ? "bg-slate-100 text-slate-600 ring-slate-200"
              : facts.locked
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : facts.ready
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-red-50 text-red-700 ring-red-200"
          }`}
        >
          {!lesson
            ? LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.previewEmpty
            : facts.locked
              ? LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.previewLocked
              : facts.ready
                ? LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.availablePreview
                : LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.previewEmpty}
        </span>
      </div>

      <div
        data-testid="learner-lesson-content-preview-summary"
        className="mt-5 grid gap-3 md:grid-cols-3"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.firstAvailable}
          </div>
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">
            {lesson?.title || LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.noLessons}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.previewType}
          </div>
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">
            {facts.previewType || "-"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.learnerAction}
          </div>
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">
            {facts.action}
          </div>
        </div>
      </div>

      <div
        data-testid="learner-lesson-content-preview-body"
        className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${
          facts.locked
            ? "bg-amber-50 text-amber-900 ring-amber-200"
            : "bg-slate-50 text-slate-700 ring-slate-200"
        }`}
      >
        <div className="font-semibold text-slate-900">
          {LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.contentPreview}
        </div>

        <p className="mt-2">
          {facts.locked
            ? user
              ? LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.enrollRequired
              : LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.loginRequired
            : facts.previewText}
        </p>

        {!facts.locked && facts.url ? (
          <a
            data-testid="learner-lesson-content-preview-open-link"
            href={facts.url.startsWith("http://") || facts.url.startsWith("https://") ? facts.url : `https://${facts.url}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            {LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.openMaterial}
          </a>
        ) : null}
      </div>

      <div
        data-testid="learner-lesson-content-preview-actions"
        className="mt-5 flex flex-wrap gap-3"
      >
        <button
          type="button"
          onClick={onPrimaryAction}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {facts.locked
            ? LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.enroll
            : LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.openAccount}
        </button>

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS.openCatalog}
        </button>
      </div>
    </section>
  );
}



const STAGE82_LEARNER_LESSON_BLOCK_VIEWER = "stage82_7_learner_lesson_block_viewer";
const STAGE82_LEARNER_LESSON_BLOCK_NAVIGATION = "stage82_10_learner_lesson_blocks_navigation";
const STAGE82_LEARNER_BLOCK_TYPE_RENDERING = "stage82_11_learner_block_type_rendering";
const STAGE82_LEARNER_LESSON_PROGRESS_STATES = "stage82_12_learner_lesson_progress_states";
const STAGE82_LEARNER_NEXT_LESSON_AFTER_COMPLETION = "stage82_13_learner_next_lesson_after_completion";
const STAGE82_LEARNER_COURSE_COMPLETION_READINESS = "stage82_14_learner_course_completion_readiness";
const STAGE82_LEARNER_DOCUMENT_AVAILABILITY_HANDOFF = "stage82_15_learner_document_availability_handoff";
const STAGE82_LEARNER_COMPLETION_DOCUMENT_FOCUS = "stage82_16_learner_completion_document_focus";
const STAGE82_LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE = "stage82_17_learner_document_publication_lifecycle";

const LEARNER_LESSON_BLOCK_VIEWER_LABELS = {
  stage: "Stage 82.7 · Lesson Block Viewer",
  title: "Материалы текущего урока",
  subtitle:
    "Блок показывает слушателю содержимое урока в новом блочном формате. Если урок ещё хранится в старом формате, используется безопасный legacy adapter.",
  currentLesson: "Текущий урок",
  blocks: "Блоков",
  requiredBlocks: "Обязательных",
  locked: "Материалы закрыты",
  available: "Материалы доступны",
  empty: "Материалы пока не заполнены",
  legacyAdapter: "legacy adapter",
  richText: "Текст",
  video: "Видео",
  fileLink: "Файл/ссылка",
  quiz: "Тест",
  assignment: "Задание",
  callout: "Врезка",
  openMaterial: "Открыть материал",
  loginRequired: "Войдите, чтобы открыть материалы урока.",
  enrollRequired: "Запишитесь на курс, чтобы открыть материалы урока.",
  noLessons: "В курсе пока нет уроков.",
  noBlocks: "В выбранном уроке пока нет материалов.",
  answerHidden: "Ответ будет проверяться в следующих этапах.",
  navigationStage: "Stage 82.10 · Lesson Blocks Navigation",
  chooseLesson: "Выберите урок",
  selectedLesson: "Выбранный урок",
  selected: "Выбран",
  completed: "Изучен",
  notCompleted: "Не изучен",
  typeRenderingStage: "Stage 82.11 · Block Type Rendering",
  contentLabel: "Содержимое блока",
  question: "Вопрос",
  answerOptions: "Варианты ответа",
  openVideo: "Открыть видео",
  openFile: "Открыть файл",
  openLink: "Открыть ссылку",
  assignmentInstruction: "Инструкция к заданию",
  calloutNote: "Важное примечание",
  richTextBody: "Текстовый материал",
  noOptions: "Варианты ответа пока не заполнены.",
};

const LEARNER_LESSON_PROGRESS_STATE_LABELS = {
  stage: "Stage 82.12 · Lesson Progress States",
  status: "Статус урока",
  notStarted: "Не начат",
  inProgress: "В процессе",
  completed: "Изучен",
  unavailable: "Недоступен",
  selected: "Выбранный урок",
  completedAt: "Дата изучения",
  completionReady: "Можно отметить изучение",
  completionLocked: "Завершение недоступно",
};

const LEARNER_NEXT_LESSON_AFTER_COMPLETION_LABELS = {
  stage: "Stage 82.13 · Next Lesson After Completion",
  nextLessonSelected: "Урок изучен. Открыт следующий урок:",
  allLessonsCompleted: "Урок изучен. Все доступные уроки уже пройдены.",
  stayOnCompletedLesson: "Урок изучен. Следующий доступный урок не найден.",
};

const LEARNER_LESSON_BLOCK_VIEWER_TYPE_LABELS = {
  rich_text: LEARNER_LESSON_BLOCK_VIEWER_LABELS.richText,
  text: LEARNER_LESSON_BLOCK_VIEWER_LABELS.richText,
  video: LEARNER_LESSON_BLOCK_VIEWER_LABELS.video,
  file_link: LEARNER_LESSON_BLOCK_VIEWER_LABELS.fileLink,
  file: LEARNER_LESSON_BLOCK_VIEWER_LABELS.fileLink,
  link: LEARNER_LESSON_BLOCK_VIEWER_LABELS.fileLink,
  quiz: LEARNER_LESSON_BLOCK_VIEWER_LABELS.quiz,
  assignment: LEARNER_LESSON_BLOCK_VIEWER_LABELS.assignment,
  callout: LEARNER_LESSON_BLOCK_VIEWER_LABELS.callout,
};

function normalizeLearnerLessonBlockType(blockType) {
  const normalized = `${blockType || "rich_text"}`.toLowerCase();

  if (normalized === "text") {
    return "rich_text";
  }

  if (normalized === "file" || normalized === "link") {
    return "file_link";
  }

  return LEARNER_LESSON_BLOCK_VIEWER_TYPE_LABELS[normalized] ? normalized : "rich_text";
}

function getLearnerLessonBlockViewerContent(block) {
  return block?.content_json || block?.content || {};
}

function getLearnerLessonBlockViewerTitle(block, index) {
  return block?.title || `${LEARNER_LESSON_BLOCK_VIEWER_LABELS.blocks} ${index + 1}`;
}

function getLearnerLessonBlockViewerText(block) {
  const content = getLearnerLessonBlockViewerContent(block);
  return `${content.text || content.body || content.description || block?.content_text || block?.description || ""}`.trim();
}

function getLearnerLessonBlockViewerUrl(block) {
  const content = getLearnerLessonBlockViewerContent(block);
  return `${content.url || content.file_url || content.video_url || block?.content_url || ""}`.trim();
}

function getLearnerLessonBlockViewerUrlHref(url) {
  const value = `${url || ""}`.trim();

  if (!value) {
    return "";
  }

  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

function getLearnerLessonBlockViewerOptions(block) {
  const content = getLearnerLessonBlockViewerContent(block);
  return Array.isArray(content.options)
    ? content.options.map((item) => `${item || ""}`.trim()).filter(Boolean)
    : [];
}

function getLearnerLessonBlockViewerQuestion(block) {
  const content = getLearnerLessonBlockViewerContent(block);
  return `${content.question || content.prompt || getLearnerLessonBlockViewerText(block) || ""}`.trim();
}

function getLearnerLessonBlockViewerFileName(block) {
  const content = getLearnerLessonBlockViewerContent(block);
  return `${content.file_name || content.filename || content.name || block?.file_name || ""}`.trim();
}

function getLearnerLessonBlockViewerActionLabel(blockType) {
  if (blockType === "video") {
    return LEARNER_LESSON_BLOCK_VIEWER_LABELS.openVideo;
  }

  if (blockType === "file_link") {
    return LEARNER_LESSON_BLOCK_VIEWER_LABELS.openFile;
  }

  return LEARNER_LESSON_BLOCK_VIEWER_LABELS.openLink;
}

function LearnerLessonBlockViewerBody({ block, blockType, text, url, href, options }) {
  const content = getLearnerLessonBlockViewerContent(block);
  const question = getLearnerLessonBlockViewerQuestion(block);
  const fileName = getLearnerLessonBlockViewerFileName(block);

  if (blockType === "video") {
    return (
      <div
        data-testid="learner-lesson-block-viewer-video"
        data-stage={STAGE82_LEARNER_BLOCK_TYPE_RENDERING}
        className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-200"
      >
        <div className="font-semibold text-blue-950">
          {LEARNER_LESSON_BLOCK_VIEWER_LABELS.video}
        </div>
        <div className="mt-2">
          {text || content.caption || content.description || url || LEARNER_LESSON_BLOCK_VIEWER_LABELS.noBlocks}
        </div>
        {href ? (
          <a
            data-testid="learner-lesson-block-viewer-video-link"
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
          >
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.openVideo}
          </a>
        ) : null}
      </div>
    );
  }

  if (blockType === "file_link") {
    return (
      <div
        data-testid="learner-lesson-block-viewer-file-link"
        data-stage={STAGE82_LEARNER_BLOCK_TYPE_RENDERING}
        className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200"
      >
        <div className="font-semibold text-slate-900">
          {fileName || LEARNER_LESSON_BLOCK_VIEWER_LABELS.fileLink}
        </div>
        <div className="mt-2">
          {text || content.description || url || LEARNER_LESSON_BLOCK_VIEWER_LABELS.noBlocks}
        </div>
        {href ? (
          <a
            data-testid="learner-lesson-block-viewer-file-link-open"
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            {getLearnerLessonBlockViewerActionLabel(blockType)}
          </a>
        ) : null}
      </div>
    );
  }

  if (blockType === "quiz") {
    return (
      <div
        data-testid="learner-lesson-block-viewer-quiz"
        data-stage={STAGE82_LEARNER_BLOCK_TYPE_RENDERING}
        className="mt-4 rounded-2xl bg-violet-50 p-4 text-sm leading-6 text-violet-900 ring-1 ring-violet-200"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          {LEARNER_LESSON_BLOCK_VIEWER_LABELS.question}
        </div>
        <div className="mt-2 font-semibold text-violet-950">
          {question || LEARNER_LESSON_BLOCK_VIEWER_LABELS.noBlocks}
        </div>
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-violet-700">
          {LEARNER_LESSON_BLOCK_VIEWER_LABELS.answerOptions}
        </div>
        {options.length ? (
          <ul className="mt-2 list-disc pl-5">
            {options.map((option) => <li key={option}>{option}</li>)}
          </ul>
        ) : (
          <div className="mt-2 text-violet-800">
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.noOptions}
          </div>
        )}
        <div className="mt-3 text-xs font-semibold text-violet-700">
          {LEARNER_LESSON_BLOCK_VIEWER_LABELS.answerHidden}
        </div>
      </div>
    );
  }

  if (blockType === "assignment") {
    return (
      <div
        data-testid="learner-lesson-block-viewer-assignment"
        data-stage={STAGE82_LEARNER_BLOCK_TYPE_RENDERING}
        className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200"
      >
        <div className="font-semibold text-amber-950">
          {LEARNER_LESSON_BLOCK_VIEWER_LABELS.assignmentInstruction}
        </div>
        <div className="mt-2">
          {text || content.instruction || content.task || content.description || LEARNER_LESSON_BLOCK_VIEWER_LABELS.noBlocks}
        </div>
        {href ? (
          <a
            data-testid="learner-lesson-block-viewer-assignment-link"
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
          >
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.openMaterial}
          </a>
        ) : null}
      </div>
    );
  }

  if (blockType === "callout") {
    return (
      <div
        data-testid="learner-lesson-block-viewer-callout"
        data-stage={STAGE82_LEARNER_BLOCK_TYPE_RENDERING}
        className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-200"
      >
        <div className="font-semibold text-emerald-950">
          {LEARNER_LESSON_BLOCK_VIEWER_LABELS.calloutNote}
        </div>
        <div className="mt-2">
          {text || content.note || content.message || LEARNER_LESSON_BLOCK_VIEWER_LABELS.noBlocks}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="learner-lesson-block-viewer-rich-text"
      data-stage={STAGE82_LEARNER_BLOCK_TYPE_RENDERING}
      className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200"
    >
      <div className="font-semibold text-slate-900">
        {LEARNER_LESSON_BLOCK_VIEWER_LABELS.richTextBody}
      </div>
      <div className="mt-2 whitespace-pre-line">
        {text || url || LEARNER_LESSON_BLOCK_VIEWER_LABELS.noBlocks}
      </div>
    </div>
  );
}

function getLearnerLessonBlockViewerBlocks(lesson) {
  const source = [lesson?.blocks, lesson?.lesson_blocks, lesson?.content_blocks].find(Array.isArray);

  if (source) {
    return source
      .filter((block) => block?.is_active !== false)
      .slice()
      .sort((left, right) => (Number(left.position) || 0) - (Number(right.position) || 0))
      .map((block, index) => ({
        ...block,
        position: Number(block.position) || index + 1,
        block_type: normalizeLearnerLessonBlockType(block.block_type || block.content_type),
        legacy: false,
      }));
  }

  if (!lesson) {
    return [];
  }

  const text = `${lesson.content_text || lesson.description || lesson.content || ""}`.trim();
  const url = `${lesson.content_url || ""}`.trim();

  if (!text && !url) {
    return [];
  }

  const blockType = normalizeLearnerLessonBlockType(lesson.content_type || (url ? "link" : "rich_text"));

  return [
    {
      id: `legacy-content-adapter-${lesson.id || "lesson"}`,
      position: 1,
      block_type: blockType,
      title: lesson.title || LEARNER_LESSON_BLOCK_VIEWER_LABELS.currentLesson,
      content_json: {
        ...(text ? { text, description: text } : {}),
        ...(url ? { url } : {}),
      },
      is_required: Boolean(lesson.is_required),
      is_active: lesson.is_active !== false,
      legacy: true,
    },
  ];
}

function getLearnerLessonBlockViewerLessonId(lesson) {
  return `${lesson?.id || lesson?.lesson_id || ""}`;
}

function getLearnerLessonBlockViewerSelectedLesson(accessFacts, selectedLessonId = "") {
  const lessons = Array.isArray(accessFacts?.lessons) ? accessFacts.lessons : [];
  const selectedId = `${selectedLessonId || ""}`.trim();

  if (selectedId) {
    const selectedLesson = lessons.find((lesson) => getLearnerLessonBlockViewerLessonId(lesson) === selectedId);
    if (selectedLesson) {
      return selectedLesson;
    }
  }

  return (
    accessFacts?.availableLessons?.find((item) => !getLessonCompleted(item)) ||
    accessFacts?.firstAvailableLesson ||
    lessons.find((item) => item.active && !getLessonCompleted(item)) ||
    lessons.find((item) => item.active) ||
    lessons[0] ||
    null
  );
}

function getLearnerLessonProgressState(lesson, selectedLessonId = "") {
  if (!lesson) {
    return {
      key: "unavailable",
      label: LEARNER_LESSON_PROGRESS_STATE_LABELS.unavailable,
      tone: "bg-slate-100 text-slate-600 ring-slate-200",
    };
  }

  if (lesson.active === false || lesson.available === false) {
    return {
      key: "unavailable",
      label: LEARNER_LESSON_PROGRESS_STATE_LABELS.unavailable,
      tone: "bg-slate-100 text-slate-600 ring-slate-200",
    };
  }

  if (getLessonCompleted(lesson)) {
    return {
      key: "completed",
      label: LEARNER_LESSON_PROGRESS_STATE_LABELS.completed,
      tone: "bg-green-50 text-green-700 ring-green-200",
    };
  }

  const lessonId = getLearnerLessonBlockViewerLessonId(lesson);
  const selected = Boolean(lessonId && lessonId === `${selectedLessonId || ""}`);

  if (selected) {
    return {
      key: "in_progress",
      label: LEARNER_LESSON_PROGRESS_STATE_LABELS.inProgress,
      tone: "bg-blue-50 text-blue-700 ring-blue-200",
    };
  }

  return {
    key: "not_started",
    label: LEARNER_LESSON_PROGRESS_STATE_LABELS.notStarted,
    tone: "bg-white text-slate-600 ring-slate-200",
  };
}

function getLearnerLessonProgressButtonClass(progressState, selected) {
  if (selected) {
    return "bg-blue-600 text-white ring-blue-600";
  }

  if (progressState.key === "completed") {
    return "bg-green-50 text-green-800 ring-green-200 hover:bg-green-100";
  }

  if (progressState.key === "in_progress") {
    return "bg-blue-50 text-blue-800 ring-blue-200 hover:bg-blue-100";
  }

  if (progressState.key === "unavailable") {
    return "bg-slate-100 text-slate-500 ring-slate-200";
  }

  return "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100";
}

function getLearnerLessonBlockViewerFacts(course, existingEnrollment, user, selectedLessonId = "") {
  const accessFacts = getLearnerLessonAccessFacts(course, existingEnrollment, user);
  const previewFacts = getLearnerLessonContentPreviewFacts(course, existingEnrollment, user, selectedLessonId);
  const lesson = previewFacts.lesson;
  const locked = previewFacts.locked;
  const blocks = locked ? [] : getLearnerLessonBlockViewerBlocks(lesson);
  const requiredBlocks = blocks.filter((block) => block.is_required).length;
  const progressState = getLearnerLessonProgressState(
    lesson,
    getLearnerLessonBlockViewerLessonId(lesson)
  );

  return {
    mode: previewFacts.mode,
    lesson,
    progressState,
    lessons: accessFacts.lessons,
    selectedLessonId: getLearnerLessonBlockViewerLessonId(lesson),
    locked,
    blocks,
    requiredBlocks,
    hasLegacyBlock: blocks.some((block) => block.legacy),
    ready: Boolean(lesson && blocks.length > 0 && !locked),
    statusLabel: !lesson
      ? LEARNER_LESSON_BLOCK_VIEWER_LABELS.empty
      : locked
        ? LEARNER_LESSON_BLOCK_VIEWER_LABELS.locked
        : blocks.length
          ? LEARNER_LESSON_BLOCK_VIEWER_LABELS.available
          : LEARNER_LESSON_BLOCK_VIEWER_LABELS.empty,
  };
}

function LearnerLessonBlockNavigation({ lessons, selectedLessonId, onSelectLesson }) {
  const courseLessons = Array.isArray(lessons) ? lessons : [];

  if (!courseLessons.length) {
    return null;
  }

  return (
    <div
      data-testid="learner-lesson-block-navigation"
      data-stage={STAGE82_LEARNER_LESSON_BLOCK_NAVIGATION}
      className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.navigationStage}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900">
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.chooseLesson}
          </div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {courseLessons.length}
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {courseLessons.map((lesson) => {
          const lessonId = getLearnerLessonBlockViewerLessonId(lesson);
          const selected = lessonId && lessonId === selectedLessonId;
          const disabled = !lessonId || lesson.active === false;
          const progressState = getLearnerLessonProgressState(lesson, selectedLessonId);

          return (
            <button
              key={lessonId || lesson.title}
              type="button"
              data-testid="learner-lesson-block-navigation-item"
              data-selected={selected ? "true" : "false"}
              data-progress-state={progressState.key}
              disabled={disabled}
              onClick={() => onSelectLesson?.(lessonId)}
              className={`rounded-2xl p-3 text-left text-sm ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${getLearnerLessonProgressButtonClass(progressState, selected)}`}
            >
              <div className="font-semibold">
                {lesson.position ? `${lesson.position}. ` : ""}
                {lesson.title}
              </div>
              <div
                data-testid="learner-lesson-progress-state"
                data-stage={STAGE82_LEARNER_LESSON_PROGRESS_STATES}
                className={`mt-1 text-xs font-semibold ${selected ? "text-blue-100" : "text-slate-500"}`}
              >
                {selected ? `${LEARNER_LESSON_PROGRESS_STATE_LABELS.selected} · ${progressState.label}` : progressState.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LearnerLessonBlockViewerBlock({ block, index }) {
  const blockType = normalizeLearnerLessonBlockType(block.block_type);
  const typeLabel = LEARNER_LESSON_BLOCK_VIEWER_TYPE_LABELS[blockType] || LEARNER_LESSON_BLOCK_VIEWER_LABELS.richText;
  const text = getLearnerLessonBlockViewerText(block);
  const url = getLearnerLessonBlockViewerUrl(block);
  const href = getLearnerLessonBlockViewerUrlHref(url);
  const options = getLearnerLessonBlockViewerOptions(block);

  return (
    <article
      data-testid="learner-lesson-block-viewer-block"
      className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            #{block.position || index + 1} · {typeLabel}
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {getLearnerLessonBlockViewerTitle(block, index)}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {block.legacy ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              {LEARNER_LESSON_BLOCK_VIEWER_LABELS.legacyAdapter}
            </span>
          ) : null}
          {block.is_required ? (
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              Обязательный
            </span>
          ) : null}
        </div>
      </div>

      <LearnerLessonBlockViewerBody
        block={block}
        blockType={blockType}
        text={text}
        url={url}
        href={href}
        options={options}
      />
    </article>
  );
}

function CourseLearnerLessonBlockViewerPanel({
  course,
  existingEnrollment,
  user,
  onPrimaryAction,
  onPageChange,
  selectedLessonId = "",
  onSelectLesson,
}) {
  const facts = getLearnerLessonBlockViewerFacts(course, existingEnrollment, user, selectedLessonId);

  return (
    <section
      data-testid="learner-lesson-block-viewer-panel"
      data-stage={STAGE82_LEARNER_LESSON_BLOCK_VIEWER}
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.stage}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.subtitle}
          </p>
        </div>

        <span
          data-testid="learner-lesson-block-viewer-status"
          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
            facts.ready
              ? "bg-green-50 text-green-700 ring-green-200"
              : facts.locked
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-slate-100 text-slate-600 ring-slate-200"
          }`}
        >
          {facts.statusLabel}
        </span>
      </div>

      <div
        data-testid="learner-lesson-block-viewer-summary"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.currentLesson}
          </div>
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">
            {facts.lesson?.title || LEARNER_LESSON_BLOCK_VIEWER_LABELS.noLessons}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_PROGRESS_STATE_LABELS.status}
          </div>
          <div
            data-testid="learner-lesson-block-viewer-progress-state"
            data-stage={STAGE82_LEARNER_LESSON_PROGRESS_STATES}
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${facts.progressState.tone}`}
          >
            {facts.progressState.label}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.blocks}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.blocks.length}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_LESSON_BLOCK_VIEWER_LABELS.requiredBlocks}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.requiredBlocks}
          </div>
        </div>
      </div>

      <LearnerLessonBlockNavigation
        lessons={facts.lessons}
        selectedLessonId={facts.selectedLessonId}
        onSelectLesson={onSelectLesson}
      />

      {facts.locked ? (
        <div
          data-testid="learner-lesson-block-viewer-locked"
          className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200"
        >
          {user
            ? LEARNER_LESSON_BLOCK_VIEWER_LABELS.enrollRequired
            : LEARNER_LESSON_BLOCK_VIEWER_LABELS.loginRequired}
        </div>
      ) : facts.blocks.length ? (
        <div
          data-testid="learner-lesson-block-viewer-list"
          className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          {facts.hasLegacyBlock ? (
            <div className="rounded-2xl bg-blue-50 p-3 text-xs leading-5 text-blue-900 ring-1 ring-blue-200">
              Урок показан через legacy adapter. После перевода урока на реальные блоки пользователь увидит блочную структуру без старого адаптера.
            </div>
          ) : null}

          {facts.blocks.map((block, index) => (
            <LearnerLessonBlockViewerBlock key={block.id || index} block={block} index={index} />
          ))}
        </div>
      ) : (
        <div
          data-testid="learner-lesson-block-viewer-empty"
          className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200"
        >
          {LEARNER_LESSON_BLOCK_VIEWER_LABELS.noBlocks}
        </div>
      )}

      <div
        data-testid="learner-lesson-block-viewer-actions"
        className="mt-5 flex flex-wrap gap-3"
      >
        <button
          type="button"
          onClick={onPrimaryAction}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {facts.locked ? LEARNER_LESSON_BLOCK_VIEWER_LABELS.loginRequired : LEARNER_LESSON_BLOCK_VIEWER_LABELS.available}
        </button>

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          Вернуться в каталог
        </button>
      </div>
    </section>
  );
}


const LEARNER_COMPLETION_ACTION_UX_LABELS = {
  stage: "Stage 78.4 \u00b7 Learner Completion Action UX",
  title: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043f\u043e \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044e \u0443\u0440\u043e\u043a\u0430",
  subtitle:
    "\u0411\u043b\u043e\u043a \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044e \u043f\u043e\u043d\u044f\u0442\u044c, \u0447\u0442\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0441 \u0442\u0435\u043a\u0443\u0449\u0438\u043c \u0443\u0440\u043e\u043a\u043e\u043c: \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b, \u0438\u0437\u0443\u0447\u0438\u0442\u044c \u0435\u0433\u043e \u0438 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c\u0441\u044f \u043a \u0444\u0438\u043a\u0441\u0430\u0446\u0438\u0438 \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f.",
  currentLesson: "\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0443\u0440\u043e\u043a",
  actionStatus: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
  nextAction: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
  completionMode: "\u0420\u0435\u0436\u0438\u043c \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f",
  available: "\u041c\u043e\u0436\u043d\u043e \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442\u044c",
  locked: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0437\u0430\u043a\u0440\u044b\u0442\u044b",
  empty: "\u041d\u0435\u0442 \u0443\u0440\u043e\u043a\u0430 \u0434\u043b\u044f \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f",
  openMaterial: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  studyMaterial: "\u0418\u0437\u0443\u0447\u0438\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  prepareCompletion: "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u043e\u0442\u043c\u0435\u0442\u043a\u0443 \u043e \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u0438",
  completionWillBeSavedLater: "\u0424\u0438\u043a\u0441\u0430\u0446\u0438\u044f \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0430: \u043a\u043d\u043e\u043f\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442 \u0444\u0430\u043a\u0442 \u0438\u0437\u0443\u0447\u0435\u043d\u0438\u044f \u0443\u0440\u043e\u043a\u0430.",
  markLessonCompleted: "\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0443\u0440\u043e\u043a \u043a\u0430\u043a \u0438\u0437\u0443\u0447\u0435\u043d\u043d\u044b\u0439",
  savingCompletion: "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441...",
  lessonAlreadyCompleted: "\u0423\u0440\u043e\u043a \u0443\u0436\u0435 \u0438\u0437\u0443\u0447\u0435\u043d",
  completionSaved: "\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043f\u043e \u0443\u0440\u043e\u043a\u0443 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d.",
  loginRequired: "\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u043d\u0430\u0447\u0430\u0442\u044c \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u0435.",
  enrollRequired: "\u0417\u0430\u043f\u0438\u0448\u0438\u0442\u0435\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441, \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043f\u043e \u0443\u0440\u043e\u043a\u0430\u043c.",
  noLessons: "\u0412 \u043a\u0443\u0440\u0441\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0443\u0440\u043e\u043a\u043e\u0432.",
  openAccount: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442",
  enroll: "\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f",
  openCatalog: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433",
};

function getLearnerNextLessonAfterCompletion(course, existingEnrollment, user, completedLesson) {
  const completedLessonId = getLearnerLessonBlockViewerLessonId(completedLesson);
  const accessFacts = getLearnerLessonAccessFacts(course, existingEnrollment, user);
  const lessons = Array.isArray(accessFacts.lessons) ? accessFacts.lessons : [];

  if (!completedLessonId || !lessons.length) {
    return null;
  }

  const completedIndex = lessons.findIndex(
    (lesson) => getLearnerLessonBlockViewerLessonId(lesson) === completedLessonId
  );

  const afterCompletedLesson = completedIndex >= 0 ? lessons.slice(completedIndex + 1) : [];

  return (
    afterCompletedLesson.find((lesson) => lesson.active && lesson.available && !getLessonCompleted(lesson)) ||
    lessons.find((lesson) => lesson.active && lesson.available && !getLessonCompleted(lesson)) ||
    null
  );
}

function getLearnerNextLessonAfterCompletionMessage(nextLesson) {
  if (nextLesson) {
    return `${LEARNER_NEXT_LESSON_AFTER_COMPLETION_LABELS.nextLessonSelected} ${nextLesson.title}`;
  }

  return LEARNER_NEXT_LESSON_AFTER_COMPLETION_LABELS.allLessonsCompleted;
}

function getLearnerCompletionActionFacts(course, existingEnrollment, user, selectedLessonId = "") {
  const previewFacts = getLearnerLessonContentPreviewFacts(course, existingEnrollment, user, selectedLessonId);
  const lesson = previewFacts.lesson;
  const locked = previewFacts.locked;
  const hasUrl = Boolean(previewFacts.url);
  const hasLesson = Boolean(lesson);
  const completed = getLessonCompleted(lesson);
  const progressState = getLearnerLessonProgressState(lesson, selectedLessonId);
  const canCompleteLesson = hasLesson && !locked && !completed;

  const actionStatus = !hasLesson
    ? LEARNER_COMPLETION_ACTION_UX_LABELS.empty
    : locked
      ? LEARNER_COMPLETION_ACTION_UX_LABELS.locked
      : completed
        ? LEARNER_COMPLETION_ACTION_UX_LABELS.lessonAlreadyCompleted
        : LEARNER_COMPLETION_ACTION_UX_LABELS.available;

  const nextAction = !hasLesson
    ? LEARNER_COMPLETION_ACTION_UX_LABELS.noLessons
    : locked
      ? user
        ? LEARNER_COMPLETION_ACTION_UX_LABELS.enrollRequired
        : LEARNER_COMPLETION_ACTION_UX_LABELS.loginRequired
      : completed
        ? LEARNER_COMPLETION_ACTION_UX_LABELS.lessonAlreadyCompleted
        : hasUrl
          ? LEARNER_COMPLETION_ACTION_UX_LABELS.openMaterial
          : LEARNER_COMPLETION_ACTION_UX_LABELS.studyMaterial;

  const checklist = [
    { key: "open", label: hasUrl ? LEARNER_COMPLETION_ACTION_UX_LABELS.openMaterial : LEARNER_COMPLETION_ACTION_UX_LABELS.studyMaterial, ready: hasLesson && !locked, completed },
    { key: "study", label: LEARNER_COMPLETION_ACTION_UX_LABELS.studyMaterial, ready: hasLesson && !locked, completed },
    { key: "prepare", label: LEARNER_COMPLETION_ACTION_UX_LABELS.prepareCompletion, ready: hasLesson && !locked, completed: canCompleteLesson || completed },
  ];

  return { lesson, locked, hasUrl, completed, progressState, canCompleteLesson, actionStatus, nextAction, checklist, previewFacts };
}

function CourseLearnerCompletionActionPanel({
  course,
  existingEnrollment,
  user,
  onPrimaryAction,
  onPageChange,
  onCompleteLesson,
  lessonCompletionLoading = false,
  lessonCompletionError = "",
  lessonCompletionSuccess = "",
  selectedLessonId = "",
}) {
  const facts = getLearnerCompletionActionFacts(course, existingEnrollment, user, selectedLessonId);
  const lesson = facts.lesson;

  return (
    <section data-testid="learner-completion-action-panel" className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">{LEARNER_COMPLETION_ACTION_UX_LABELS.stage}</div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{LEARNER_COMPLETION_ACTION_UX_LABELS.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{LEARNER_COMPLETION_ACTION_UX_LABELS.subtitle}</p>
        </div>
        <span data-testid="learner-completion-action-status" className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200">{facts.actionStatus}</span>
      </div>

      <div data-testid="learner-completion-action-summary" className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{LEARNER_COMPLETION_ACTION_UX_LABELS.currentLesson}</div><div className="mt-2 text-sm font-semibold leading-5 text-slate-900">{lesson?.title || LEARNER_COMPLETION_ACTION_UX_LABELS.noLessons}</div></div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{LEARNER_COMPLETION_ACTION_UX_LABELS.nextAction}</div><div className="mt-2 text-sm font-semibold leading-5 text-slate-900">{facts.nextAction}</div></div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{LEARNER_LESSON_PROGRESS_STATE_LABELS.status}</div><div data-testid="learner-completion-action-progress-state" data-stage={STAGE82_LEARNER_LESSON_PROGRESS_STATES} className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${facts.progressState.tone}`}>{facts.progressState.label}</div></div>
      </div>

      <div data-testid="learner-completion-action-checklist" className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="text-sm font-bold text-slate-900">{LEARNER_COMPLETION_ACTION_UX_LABELS.nextAction}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {facts.checklist.map((item, index) => (
            <div key={item.key} data-testid="learner-completion-action-step" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-sm font-bold text-slate-900 ring-1 ring-slate-200">{index + 1}</div>
              <div className="mt-3 text-sm font-semibold text-slate-900">{item.label}</div>
              <div className="mt-2 text-xs font-semibold text-slate-500">{item.completed ? LEARNER_COMPLETION_ACTION_UX_LABELS.lessonAlreadyCompleted : item.ready ? LEARNER_COMPLETION_ACTION_UX_LABELS.available : LEARNER_COMPLETION_ACTION_UX_LABELS.locked}</div>
            </div>
          ))}
        </div>
      </div>

      <div data-testid="learner-completion-action-note" className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-200">{facts.completed ? LEARNER_COMPLETION_ACTION_UX_LABELS.lessonAlreadyCompleted : facts.canCompleteLesson ? LEARNER_LESSON_PROGRESS_STATE_LABELS.completionReady : LEARNER_LESSON_PROGRESS_STATE_LABELS.completionLocked}</div>

      {lessonCompletionSuccess ? <div data-testid="learner-completion-action-success" data-stage={STAGE82_LEARNER_NEXT_LESSON_AFTER_COMPLETION} className="mt-5 rounded-2xl bg-green-50 p-4 text-sm leading-6 text-green-800 ring-1 ring-green-200">{lessonCompletionSuccess}</div> : null}
      {lessonCompletionError ? <div data-testid="learner-completion-action-error" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-700 ring-1 ring-red-200">{lessonCompletionError}</div> : null}

      <div data-testid="learner-completion-action-actions" className="mt-5 flex flex-wrap gap-3">
        {facts.hasUrl && !facts.locked ? <a data-testid="learner-completion-action-open-link" href={facts.previewFacts.url.startsWith("http://") || facts.previewFacts.url.startsWith("https://") ? facts.previewFacts.url : `https://${facts.previewFacts.url}`} target="_blank" rel="noreferrer" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">{LEARNER_COMPLETION_ACTION_UX_LABELS.openMaterial}</a> : <button type="button" onClick={onPrimaryAction} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">{facts.locked ? LEARNER_COMPLETION_ACTION_UX_LABELS.enroll : LEARNER_COMPLETION_ACTION_UX_LABELS.openAccount}</button>}
        {facts.canCompleteLesson ? <button type="button" data-testid="learner-completion-action-complete-button" onClick={() => onCompleteLesson?.(facts.lesson)} disabled={lessonCompletionLoading} className="rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">{lessonCompletionLoading ? LEARNER_COMPLETION_ACTION_UX_LABELS.savingCompletion : LEARNER_COMPLETION_ACTION_UX_LABELS.markLessonCompleted}</button> : null}
        {facts.completed ? <span data-testid="learner-completion-action-completed-badge" className="inline-flex items-center rounded-full bg-green-50 px-5 py-3 text-sm font-semibold text-green-700 ring-1 ring-green-200">{LEARNER_COMPLETION_ACTION_UX_LABELS.lessonAlreadyCompleted}</span> : null}
        <button type="button" onClick={() => onPageChange("account")} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100">{LEARNER_COMPLETION_ACTION_UX_LABELS.openAccount}</button>
        <button type="button" onClick={() => onPageChange("catalog")} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100">{LEARNER_COMPLETION_ACTION_UX_LABELS.openCatalog}</button>
      </div>
    </section>
  );
}


const LEARNER_COURSE_COMPLETION_API_LABELS = {
  stage: "Stage 78.7 \u00b7 Learner Course Completion API Integration",
  title: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u0435 \u043a\u0443\u0440\u0441\u0430",
  subtitle:
    "\u0411\u043b\u043e\u043a \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442 \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u0443\u0440\u043e\u043a\u043e\u0432 \u0438 \u0437\u0430\u043f\u0443\u0441\u043a\u0430\u0435\u0442 \u0440\u0435\u0430\u043b\u044c\u043d\u043e\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u0435 \u043a\u0443\u0440\u0441\u0430 \u0447\u0435\u0440\u0435\u0437 API.",
  ready: "\u041a\u0443\u0440\u0441 \u0433\u043e\u0442\u043e\u0432 \u043a \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044e",
  locked: "\u0415\u0449\u0451 \u043d\u0443\u0436\u043d\u043e \u043f\u0440\u043e\u0439\u0442\u0438 \u0443\u0440\u043e\u043a\u0438",
  completed: "\u041a\u0443\u0440\u0441 \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d",
  noEnrollment: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043d\u0443\u0436\u043d\u0430 \u0437\u0430\u043f\u0438\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441",
  requiredProgress: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0443\u0440\u043e\u043a\u0438",
  allProgress: "\u041e\u0431\u0449\u0438\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441",
  nextStep: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433",
  completeCourse: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043a\u0443\u0440\u0441",
  completingCourse: "\u0417\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u043c \u043a\u0443\u0440\u0441...",
  completionSaved: "\u041a\u0443\u0440\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435.",
  openAccount: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442",
  openDocuments: "\u041a \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c",
};


const LEARNER_COURSE_COMPLETION_READINESS_LABELS = {
  stage: "Stage 82.14 · Course Completion Readiness",
  title: "Готовность завершения курса",
  readyTitle: "Курс готов к завершению",
  lockedTitle: "Остались обязательные уроки",
  completedTitle: "Курс завершён",
  noEnrollmentTitle: "Сначала нужна запись на курс",
  readyNote: "Все обязательные уроки пройдены. Можно завершить курс и перейти к итоговому документу.",
  lockedNote: "Чтобы завершить курс, сначала пройдите оставшиеся обязательные уроки.",
  completedNote: "Курс уже завершён. Проверьте итоговый документ в личном кабинете.",
  noEnrollmentNote: "Запишитесь на курс, чтобы начать обучение и фиксировать прогресс.",
  remainingRequiredLessons: "Осталось пройти обязательные уроки",
  noRemainingRequiredLessons: "Оставшихся обязательных уроков нет.",
  mainAction: "Главное действие",
};

function getLearnerCourseCompletionReadinessMeta({
  completed,
  hasEnrollment,
  canCompleteCourse,
}) {
  if (completed) {
    return {
      key: "completed",
      title: LEARNER_COURSE_COMPLETION_READINESS_LABELS.completedTitle,
      note: LEARNER_COURSE_COMPLETION_READINESS_LABELS.completedNote,
      tone: "bg-slate-100 text-slate-700 ring-slate-200",
      panelTone: "bg-slate-50 text-slate-800 ring-slate-200",
    };
  }

  if (!hasEnrollment) {
    return {
      key: "no_enrollment",
      title: LEARNER_COURSE_COMPLETION_READINESS_LABELS.noEnrollmentTitle,
      note: LEARNER_COURSE_COMPLETION_READINESS_LABELS.noEnrollmentNote,
      tone: "bg-amber-50 text-amber-800 ring-amber-200",
      panelTone: "bg-amber-50 text-amber-900 ring-amber-200",
    };
  }

  if (canCompleteCourse) {
    return {
      key: "ready",
      title: LEARNER_COURSE_COMPLETION_READINESS_LABELS.readyTitle,
      note: LEARNER_COURSE_COMPLETION_READINESS_LABELS.readyNote,
      tone: "bg-green-50 text-green-700 ring-green-200",
      panelTone: "bg-green-50 text-green-900 ring-green-200",
    };
  }

  return {
    key: "locked",
    title: LEARNER_COURSE_COMPLETION_READINESS_LABELS.lockedTitle,
    note: LEARNER_COURSE_COMPLETION_READINESS_LABELS.lockedNote,
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
    panelTone: "bg-amber-50 text-amber-900 ring-amber-200",
  };
}

function getLearnerCourseCompletionFacts(course, existingEnrollment, user) {
  const enrollmentId = getEnrollmentId(existingEnrollment);
  const status = existingEnrollment?.status || "";
  const completed = status === "completed";

  const lessons = getLearnerCourseProgressLessons(course);
  const requiredLessons = lessons.filter((lesson) => lesson.is_required);
  const remainingRequiredLessons = requiredLessons.filter((lesson) => !getLessonCompleted(lesson));

  const requiredTotalRaw =
    existingEnrollment?.required_lessons_total ??
    course?.learner_progress?.required_lessons_total ??
    requiredLessons.length;

  const requiredCompletedRaw =
    existingEnrollment?.required_lessons_completed ??
    course?.learner_progress?.required_lessons_completed ??
    requiredLessons.filter(getLessonCompleted).length;

  const lessonsTotalRaw =
    existingEnrollment?.lessons_total ??
    course?.learner_progress?.lessons_total ??
    lessons.length;

  const lessonsCompletedRaw =
    existingEnrollment?.lessons_completed ??
    course?.learner_progress?.lessons_completed ??
    lessons.filter(getLessonCompleted).length;

  const requiredTotal = Number.isFinite(Number(requiredTotalRaw)) ? Number(requiredTotalRaw) : 0;
  const requiredCompleted = Number.isFinite(Number(requiredCompletedRaw)) ? Number(requiredCompletedRaw) : 0;
  const lessonsTotal = Number.isFinite(Number(lessonsTotalRaw)) ? Number(lessonsTotalRaw) : 0;
  const lessonsCompleted = Number.isFinite(Number(lessonsCompletedRaw)) ? Number(lessonsCompletedRaw) : 0;

  const requiredProgressPercent = normalizeProgressPercent(
    existingEnrollment?.required_progress_percent ??
      course?.learner_progress?.required_progress_percent ??
      (requiredTotal > 0 ? (requiredCompleted / requiredTotal) * 100 : lessons.length ? 100 : 0)
  );

  const progressPercent = normalizeProgressPercent(
    existingEnrollment?.progress_percent ??
      course?.learner_progress?.progress_percent ??
      (lessonsTotal > 0 ? (lessonsCompleted / lessonsTotal) * 100 : 0)
  );

  const requiredDone = requiredTotal > 0
    ? requiredCompleted >= requiredTotal
    : lessons.length > 0;

  const hasEnrollment = Boolean(user && enrollmentId);
  const activeEnrollment = ["assigned", "active"].includes(status);
  const canCompleteCourse = Boolean(hasEnrollment && activeEnrollment && requiredDone && !completed);
  const readiness = getLearnerCourseCompletionReadinessMeta({
    completed,
    hasEnrollment,
    canCompleteCourse,
  });

  const statusLabel = completed
    ? LEARNER_COURSE_COMPLETION_API_LABELS.completed
    : !hasEnrollment
      ? LEARNER_COURSE_COMPLETION_API_LABELS.noEnrollment
      : canCompleteCourse
        ? LEARNER_COURSE_COMPLETION_API_LABELS.ready
        : LEARNER_COURSE_COMPLETION_API_LABELS.locked;

  const nextStep = completed
    ? LEARNER_COURSE_COMPLETION_API_LABELS.openDocuments
    : !hasEnrollment
      ? LEARNER_COURSE_COMPLETION_API_LABELS.noEnrollment
      : canCompleteCourse
        ? LEARNER_COURSE_COMPLETION_API_LABELS.completeCourse
        : LEARNER_COURSE_COMPLETION_API_LABELS.locked;

  return {
    enrollmentId,
    completed,
    hasEnrollment,
    canCompleteCourse,
    requiredTotal,
    requiredCompleted,
    lessonsTotal,
    lessonsCompleted,
    remainingRequiredLessons,
    readiness,
    requiredProgressPercent,
    progressPercent,
    statusLabel,
    nextStep,
  };
}

function CourseLearnerCourseCompletionPanel({
  course,
  existingEnrollment,
  user,
  onCompleteCourse,
  courseCompletionLoading = false,
  courseCompletionError = "",
  courseCompletionSuccess = "",
  onPageChange,
}) {
  const facts = getLearnerCourseCompletionFacts(course, existingEnrollment, user);

  return (
    <section
      data-testid="learner-course-completion-panel"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {LEARNER_COURSE_COMPLETION_API_LABELS.stage}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {LEARNER_COURSE_COMPLETION_API_LABELS.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {LEARNER_COURSE_COMPLETION_API_LABELS.subtitle}
          </p>
        </div>

        <span
          data-testid="learner-course-completion-status"
          data-stage={STAGE82_LEARNER_COURSE_COMPLETION_READINESS}
          data-readiness-state={facts.readiness.key}
          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${facts.readiness.tone}`}
        >
          {facts.readiness.title}
        </span>
      </div>

      <div
        data-testid="learner-course-completion-summary"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_COURSE_COMPLETION_API_LABELS.requiredProgress}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.requiredCompleted} / {facts.requiredTotal}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {facts.requiredProgressPercent}%
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_COURSE_COMPLETION_API_LABELS.allProgress}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.lessonsCompleted} / {facts.lessonsTotal}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {facts.progressPercent}%
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_COURSE_COMPLETION_API_LABELS.nextStep}
          </div>
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">
            {facts.nextStep}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_COURSE_COMPLETION_READINESS_LABELS.mainAction}
          </div>
          <div
            data-testid="learner-course-completion-readiness-card"
            data-stage={STAGE82_LEARNER_COURSE_COMPLETION_READINESS}
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${facts.readiness.tone}`}
          >
            {facts.readiness.title}
          </div>
        </div>
      </div>

      <div
        data-testid="learner-course-completion-readiness-panel"
        data-stage={STAGE82_LEARNER_COURSE_COMPLETION_READINESS}
        data-readiness-state={facts.readiness.key}
        className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${facts.readiness.panelTone}`}
      >
        <div className="font-semibold text-slate-900">
          {LEARNER_COURSE_COMPLETION_READINESS_LABELS.title}
        </div>
        <p className="mt-2">{facts.readiness.note}</p>

        {facts.remainingRequiredLessons.length ? (
          <div
            data-testid="learner-course-completion-remaining-required-lessons"
            className="mt-4 rounded-2xl bg-white/70 p-4 ring-1 ring-white"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              {LEARNER_COURSE_COMPLETION_READINESS_LABELS.remainingRequiredLessons}
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {facts.remainingRequiredLessons.slice(0, 8).map((lesson) => (
                <li key={getLearnerLessonBlockViewerLessonId(lesson) || lesson.title}>
                  {lesson.module_title ? `${lesson.module_title}: ` : ""}
                  {lesson.title}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            data-testid="learner-course-completion-no-remaining-required-lessons"
            className="mt-4 rounded-2xl bg-white/70 p-4 text-sm font-semibold text-slate-700 ring-1 ring-white"
          >
            {LEARNER_COURSE_COMPLETION_READINESS_LABELS.noRemainingRequiredLessons}
          </div>
        )}
      </div>

      {courseCompletionSuccess ? (
        <div
          data-testid="learner-course-completion-success"
          className="mt-5 rounded-2xl bg-green-50 p-4 text-sm leading-6 text-green-800 ring-1 ring-green-200"
        >
          {courseCompletionSuccess}
        </div>
      ) : null}

      {courseCompletionError ? (
        <div
          data-testid="learner-course-completion-error"
          className="mt-5 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-700 ring-1 ring-red-200"
        >
          {courseCompletionError}
        </div>
      ) : null}

      <div
        data-testid="learner-course-completion-actions"
        className="mt-5 flex flex-wrap gap-3"
      >
        {facts.canCompleteCourse ? (
          <button
            type="button"
            data-testid="learner-course-completion-complete-button"
            data-stage={STAGE82_LEARNER_COURSE_COMPLETION_READINESS}
            onClick={onCompleteCourse}
            disabled={courseCompletionLoading}
            className="rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {courseCompletionLoading
              ? LEARNER_COURSE_COMPLETION_API_LABELS.completingCourse
              : LEARNER_COURSE_COMPLETION_API_LABELS.completeCourse}
          </button>
        ) : null}

        {facts.completed ? (
          <span
            data-testid="learner-course-completion-completed-badge"
            className="inline-flex items-center rounded-full bg-green-50 px-5 py-3 text-sm font-semibold text-green-700 ring-1 ring-green-200"
          >
            {LEARNER_COURSE_COMPLETION_API_LABELS.completed}
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => onPageChange("account")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_COURSE_COMPLETION_API_LABELS.openAccount}
        </button>

        <button
          type="button"
          onClick={() => onPageChange("documents")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_COURSE_COMPLETION_API_LABELS.openDocuments}
        </button>
      </div>
    </section>
  );
}


const LEARNER_DOCUMENT_HANDOFF_UX_LABELS = {
  stage: "Stage 78.8 \u00b7 Learner Document Handoff UX",
  title: "\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
  subtitle:
    "\u0411\u043b\u043e\u043a \u043e\u0431\u044a\u044f\u0441\u043d\u044f\u0435\u0442 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044e, \u0447\u0442\u043e \u0434\u0435\u043b\u0430\u0442\u044c \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043a\u0443\u0440\u0441\u0430: \u0433\u0434\u0435 \u0438\u0441\u043a\u0430\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442, \u043a\u0430\u043a \u0435\u0433\u043e \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0438 \u043a\u0443\u0434\u0430 \u043f\u0435\u0440\u0435\u0439\u0442\u0438 \u0434\u0430\u043b\u044c\u0448\u0435.",
  ready: "\u041a\u0443\u0440\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d",
  waiting: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f",
  noEnrollment: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043d\u0443\u0436\u043d\u0430 \u0437\u0430\u043f\u0438\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441",
  loginRequired: "\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0443\u0432\u0438\u0434\u0435\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  documentType: "\u0422\u0438\u043f \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  documentStatus: "\u0421\u0442\u0430\u0442\u0443\u0441",
  nextStep: "\u0427\u0442\u043e \u0434\u0430\u043b\u044c\u0448\u0435",
  completedAt: "\u0414\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f",
  openDocuments: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c",
  openAccount: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442",
  verifyDocument: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
  continueCourse: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u043a\u0443\u0440\u0441\u0443",
  readyNextStep:
    "\u041f\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432 \u0440\u0430\u0437\u0434\u0435\u043b \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432. \u0415\u0441\u043b\u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0443\u0436\u0435 \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d, \u0435\u0433\u043e \u043c\u043e\u0436\u043d\u043e \u0441\u043a\u0430\u0447\u0430\u0442\u044c \u0438\u043b\u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043f\u043e \u043a\u043e\u0434\u0443.",
  waitingNextStep:
    "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435. \u041f\u043e\u0441\u043b\u0435 \u044d\u0442\u043e\u0433\u043e \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435.",
};




const LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS = {
  stage: "Stage 82.17 · Document Publication Lifecycle",
  title: "Жизненный цикл итогового документа",
  subtitle: "Показываем, на каком этапе находится документ после завершения курса: формирование, публикация, скачивание и публичная проверка.",
  courseCompletion: "Курс завершён",
  courseCompletionText: "Все обязательные условия завершения курса выполнены.",
  generation: "Документ сформирован",
  generationText: "После завершения курса система создаёт итоговый документ и PDF.",
  publication: "Ожидает публикации",
  publicationText: "Документ виден как подготовленный, но скачивание и публичная проверка откроются после публикации.",
  publicationAvailable: "Документ опубликован",
  publicationAvailableText: "Документ опубликован и готов для использования.",
  publicationRevoked: "Документ отозван",
  publicationRevokedText: "Документ нельзя использовать как действующий.",
  downloadAndVerify: "Скачивание и проверка",
  downloadAndVerifyText: "После публикации можно скачать документ и проверить его публично по номеру или QR-коду.",
  pendingGeneration: "Документ ещё формируется",
  pendingGenerationText: "Курс завершён, но документ пока не найден в личном кабинете.",
  notCompleted: "Сначала завершите курс",
  notCompletedText: "Жизненный цикл документа начнётся после завершения курса.",
  noEnrollment: "Сначала нужна запись на курс",
  noEnrollmentText: "Запишитесь на курс, чтобы система могла связать обучение и итоговый документ.",
  loading: "Обновляем сведения",
  loadingText: "Проверяем, появился ли итоговый документ после завершения курса.",
  error: "Сведения о документе не обновились",
  done: "Готово",
  current: "Текущий этап",
  blocked: "Ожидает",
  issue: "Требует внимания",
};

function getLearnerDocumentPublicationLifecycleState({
  documentItem,
  completed,
  hasEnrollment,
  hasUser,
  documentsLoading,
  documentsError,
}) {
  if (documentsLoading) {
    return "loading";
  }

  if (documentsError) {
    return "error";
  }

  if (!hasUser || !hasEnrollment) {
    return "no_enrollment";
  }

  if (!completed) {
    return "not_completed";
  }

  if (!documentItem) {
    return "pending_generation";
  }

  if (documentItem.status === "available") {
    return "available";
  }

  if (documentItem.status === "revoked") {
    return "revoked";
  }

  return "draft";
}

function getLearnerDocumentPublicationLifecycleStepTone(stepState = "") {
  if (stepState === "done") {
    return "bg-green-50 text-green-800 ring-green-200";
  }

  if (stepState === "current") {
    return "bg-blue-50 text-blue-900 ring-blue-200";
  }

  if (stepState === "issue") {
    return "bg-red-50 text-red-800 ring-red-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function getLearnerDocumentPublicationLifecycleBadgeLabel(stepState = "") {
  if (stepState === "done") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.done;
  }

  if (stepState === "current") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.current;
  }

  if (stepState === "issue") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.issue;
  }

  return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.blocked;
}

function getLearnerDocumentPublicationLifecycleSummary(state = "") {
  if (state === "available") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publicationAvailableText;
  }

  if (state === "draft") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publicationText;
  }

  if (state === "revoked") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publicationRevokedText;
  }

  if (state === "pending_generation") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.pendingGenerationText;
  }

  if (state === "loading") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.loadingText;
  }

  if (state === "error") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.error;
  }

  if (state === "no_enrollment") {
    return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.noEnrollmentText;
  }

  return LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.notCompletedText;
}

function getLearnerDocumentPublicationLifecycleSteps({
  documentItem,
  completed,
  hasEnrollment,
  hasUser,
  documentsLoading,
  documentsError,
}) {
  const state = getLearnerDocumentPublicationLifecycleState({
    documentItem,
    completed,
    hasEnrollment,
    hasUser,
    documentsLoading,
    documentsError,
  });

  const hasDocument = Boolean(documentItem);
  const isAvailable = documentItem?.status === "available";
  const isRevoked = documentItem?.status === "revoked";
  const canDownload = Boolean(documentItem?.download_available);

  return [
    {
      key: "course_completion",
      label: LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.courseCompletion,
      description:
        !hasUser || !hasEnrollment
          ? LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.noEnrollmentText
          : LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.courseCompletionText,
      state:
        !hasUser || !hasEnrollment
          ? "blocked"
          : completed
            ? "done"
            : "current",
    },
    {
      key: "generation",
      label: LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.generation,
      description:
        documentsLoading
          ? LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.loadingText
          : hasDocument
            ? LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.generationText
            : LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.pendingGenerationText,
      state:
        documentsError
          ? "issue"
          : hasDocument
            ? "done"
            : completed
              ? "current"
              : "blocked",
    },
    {
      key: "publication",
      label: isAvailable
        ? LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publicationAvailable
        : isRevoked
          ? LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publicationRevoked
          : LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publication,
      description:
        isAvailable
          ? LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publicationAvailableText
          : isRevoked
            ? LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publicationRevokedText
            : LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.publicationText,
      state:
        documentsError || isRevoked
          ? "issue"
          : isAvailable
            ? "done"
            : hasDocument
              ? "current"
              : "blocked",
    },
    {
      key: "download_verify",
      label: LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.downloadAndVerify,
      description: LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.downloadAndVerifyText,
      state:
        isRevoked || documentsError
          ? "issue"
          : isAvailable && canDownload
            ? "done"
            : "blocked",
    },
  ].map((step) => ({
    ...step,
    badge: getLearnerDocumentPublicationLifecycleBadgeLabel(step.state),
    tone: getLearnerDocumentPublicationLifecycleStepTone(step.state),
    lifecycleState: state,
  }));
}

const LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS = {
  stage: "Stage 82.16 · Completion Document Focus",
  title: "Курс завершён — проверьте итоговый документ",
  courseCompleted: "Курс завершён. Мы открыли блок итогового документа ниже.",
  available: "Документ найден и доступен для скачивания. Можно скачать файл или открыть публичную проверку.",
  draft: "Документ сформирован, но пока находится в черновике. Дождитесь публикации или уточните статус у организации.",
  revoked: "Документ найден, но он отозван. Проверьте статус у организации.",
  pending: "Курс завершён, но документ пока не найден. Обычно он появляется после формирования или публикации.",
  loading: "Курс завершён. Обновляем сведения об итоговом документе.",
  error: "Курс завершён, но сведения о документе пока не обновились.",
  close: "Понятно",
};

function getLearnerCompletionDocumentFocusKey(documentItem, documentsError = "") {
  if (documentsError) {
    return "error";
  }

  if (!documentItem) {
    return "pending";
  }

  if (documentItem.status === "available" && documentItem.download_available) {
    return "available";
  }

  if (documentItem.status === "revoked") {
    return "revoked";
  }

  return "draft";
}

function getLearnerCompletionDocumentFocusMessage(documentItem, documentsError = "") {
  if (documentsError) {
    return documentsError || LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS.error;
  }

  const key = getLearnerCompletionDocumentFocusKey(documentItem);

  return LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS[key] || LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS.pending;
}

function getLearnerCompletionDocumentFocusTone(focusKey = "") {
  if (focusKey === "available") {
    return "bg-green-50 text-green-900 ring-green-200";
  }

  if (focusKey === "error" || focusKey === "revoked") {
    return "bg-red-50 text-red-800 ring-red-200";
  }

  if (focusKey === "draft" || focusKey === "pending") {
    return "bg-amber-50 text-amber-900 ring-amber-200";
  }

  return "bg-blue-50 text-blue-900 ring-blue-200";
}

const LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS = {
  stage: "Stage 82.15 · Document Availability Handoff",
  availability: "Готовность документа",
  available: "Документ доступен",
  draft: "Документ сформирован, ожидает публикации",
  revoked: "Документ отозван",
  pending: "Документ ещё формируется",
  waitingCompletion: "Доступен после завершения курса",
  noEnrollment: "Сначала нужна запись на курс",
  loading: "Ищем документ",
  error: "Не удалось загрузить сведения о документе",
  documentNumber: "Номер документа",
  verificationCode: "Код проверки",
  issuedAt: "Дата выдачи",
  downloadStatus: "Скачивание",
  downloadAvailable: "Можно скачать",
  downloadUnavailable: "Скачивание пока недоступно",
  downloadDocument: "Скачать документ",
  downloadingDocument: "Скачиваем...",
  verifyPublic: "Проверить публично",
  openDocuments: "Перейти к документам",
  foundNote: "Документ найден в личном кабинете. Проверьте статус, номер и доступность скачивания.",
  draftNote: "Документ уже сформирован как черновик. Если скачивание недоступно, дождитесь публикации или обратитесь в организацию.",
  pendingNote: "Курс завершён, но документ ещё не найден в личном кабинете. Обычно он появляется после формирования или публикации.",
  waitingNote: "Завершите курс, чтобы итоговый документ появился в личном кабинете.",
};

function getLearnerDocumentAvailabilityHandoffDocument(course, existingEnrollment, accountDocuments = []) {
  const documents = Array.isArray(accountDocuments) ? accountDocuments : [];
  const enrollmentId = getEnrollmentId(existingEnrollment);
  const courseId = `${course?.id || course?.course_id || existingEnrollment?.course_id || ""}`;
  const courseSlug = `${course?.slug || course?.course_slug || existingEnrollment?.course_slug || ""}`;

  return (
    documents.find((documentItem) => `${documentItem.enrollment_id || ""}` === enrollmentId) ||
    documents.find((documentItem) => courseId && `${documentItem.course_id || ""}` === courseId) ||
    documents.find((documentItem) => courseSlug && `${documentItem.course_slug || ""}` === courseSlug) ||
    null
  );
}

function getLearnerDocumentAvailabilityHandoffMeta({
  documentItem,
  completed,
  hasEnrollment,
  hasUser,
  documentsLoading,
  documentsError,
}) {
  if (documentsLoading) {
    return {
      key: "loading",
      label: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.loading,
      note: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.pendingNote,
      tone: "bg-blue-50 text-blue-700 ring-blue-200",
      panelTone: "bg-blue-50 text-blue-900 ring-blue-200",
    };
  }

  if (documentsError) {
    return {
      key: "error",
      label: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.error,
      note: documentsError,
      tone: "bg-red-50 text-red-700 ring-red-200",
      panelTone: "bg-red-50 text-red-800 ring-red-200",
    };
  }

  if (!hasUser || !hasEnrollment) {
    return {
      key: "no_enrollment",
      label: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.noEnrollment,
      note: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.waitingNote,
      tone: "bg-amber-50 text-amber-800 ring-amber-200",
      panelTone: "bg-amber-50 text-amber-900 ring-amber-200",
    };
  }

  if (!completed) {
    return {
      key: "waiting_completion",
      label: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.waitingCompletion,
      note: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.waitingNote,
      tone: "bg-blue-50 text-blue-700 ring-blue-200",
      panelTone: "bg-blue-50 text-blue-900 ring-blue-200",
    };
  }

  if (!documentItem) {
    return {
      key: "pending",
      label: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.pending,
      note: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.pendingNote,
      tone: "bg-amber-50 text-amber-800 ring-amber-200",
      panelTone: "bg-amber-50 text-amber-900 ring-amber-200",
    };
  }

  if (documentItem.status === "available" && documentItem.download_available) {
    return {
      key: "available",
      label: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.available,
      note: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.foundNote,
      tone: "bg-green-50 text-green-700 ring-green-200",
      panelTone: "bg-green-50 text-green-900 ring-green-200",
    };
  }

  if (documentItem.status === "revoked") {
    return {
      key: "revoked",
      label: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.revoked,
      note: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.foundNote,
      tone: "bg-red-50 text-red-700 ring-red-200",
      panelTone: "bg-red-50 text-red-800 ring-red-200",
    };
  }

  return {
    key: "draft",
    label: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.draft,
    note: LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.draftNote,
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
    panelTone: "bg-amber-50 text-amber-900 ring-amber-200",
  };
}

function getLearnerDocumentVerificationValue(documentItem) {
  return documentItem?.verification_code || documentItem?.document_number || "";
}

function getLearnerDocumentVerificationPath(documentItem) {
  const value = getLearnerDocumentVerificationValue(documentItem);

  return value ? `/verify-document?number=${encodeURIComponent(value)}` : "/verify-document";
}

function getLearnerDocumentHandoffFacts(
  course,
  existingEnrollment,
  user,
  accountDocuments = [],
  documentsLoading = false,
  documentsError = ""
) {
  const hasUser = Boolean(user);
  const hasEnrollment = Boolean(existingEnrollment);
  const completed = existingEnrollment?.status === "completed";
  const documentTitle = formatCourseDocument(course);
  const completedAt = existingEnrollment?.completed_at || "";
  const documentItem = getLearnerDocumentAvailabilityHandoffDocument(course, existingEnrollment, accountDocuments);
  const availability = getLearnerDocumentAvailabilityHandoffMeta({
    documentItem,
    completed,
    hasEnrollment,
    hasUser,
    documentsLoading,
    documentsError,
  });

  const statusLabel = !hasUser
    ? LEARNER_DOCUMENT_HANDOFF_UX_LABELS.loginRequired
    : !hasEnrollment
      ? LEARNER_DOCUMENT_HANDOFF_UX_LABELS.noEnrollment
      : completed
        ? LEARNER_DOCUMENT_HANDOFF_UX_LABELS.ready
        : LEARNER_DOCUMENT_HANDOFF_UX_LABELS.waiting;

  const nextStep = completed
    ? LEARNER_DOCUMENT_HANDOFF_UX_LABELS.readyNextStep
    : LEARNER_DOCUMENT_HANDOFF_UX_LABELS.waitingNextStep;

  return {
    completed,
    hasUser,
    hasEnrollment,
    documentTitle,
    completedAt,
    documentItem,
    availability,
    statusLabel,
    nextStep,
  };
}

function CourseLearnerDocumentHandoffPanel({
  course,
  existingEnrollment,
  user,
  onPageChange,
  accountDocuments = [],
  documentsLoading = false,
  documentsError = "",
  documentDownloadLoadingId = "",
  onDownloadDocument,
  completionDocumentFocus = null,
  onClearCompletionDocumentFocus,
  documentHandoffRef,
}) {
  const facts = getLearnerDocumentHandoffFacts(
    course,
    existingEnrollment,
    user,
    accountDocuments,
    documentsLoading,
    documentsError
  );
  const verificationValue = getLearnerDocumentVerificationValue(facts.documentItem);
  const verificationPath = getLearnerDocumentVerificationPath(facts.documentItem);
  const publicationLifecycleState = getLearnerDocumentPublicationLifecycleState({
    documentItem: facts.documentItem,
    completed: facts.completed,
    hasEnrollment: facts.hasEnrollment,
    hasUser: facts.hasUser,
    documentsLoading,
    documentsError,
  });
  const publicationLifecycleSteps = getLearnerDocumentPublicationLifecycleSteps({
    documentItem: facts.documentItem,
    completed: facts.completed,
    hasEnrollment: facts.hasEnrollment,
    hasUser: facts.hasUser,
    documentsLoading,
    documentsError,
  });

  return (
    <section
      ref={documentHandoffRef}
      tabIndex={-1}
      data-testid="learner-document-handoff-panel"
      data-stage={completionDocumentFocus ? STAGE82_LEARNER_COMPLETION_DOCUMENT_FOCUS : STAGE82_LEARNER_DOCUMENT_AVAILABILITY_HANDOFF}
      data-completion-document-focus={completionDocumentFocus ? "true" : "false"}
      className={`rounded-[2rem] bg-white p-6 shadow-sm outline-none transition md:p-8 ${
        completionDocumentFocus ? "ring-2 ring-green-300" : "ring-1 ring-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.stage}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.subtitle}
          </p>
        </div>

        <span
          data-testid="learner-document-handoff-status"
          data-stage={STAGE82_LEARNER_DOCUMENT_AVAILABILITY_HANDOFF}
          data-document-availability-state={facts.availability.key}
          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${facts.availability.tone}`}
        >
          {facts.availability.label}
        </span>
      </div>

      {completionDocumentFocus ? (
        <div
          data-testid="learner-completion-document-focus-banner"
          data-stage={STAGE82_LEARNER_COMPLETION_DOCUMENT_FOCUS}
          data-completion-document-focus-state={completionDocumentFocus.key}
          className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${getLearnerCompletionDocumentFocusTone(
            completionDocumentFocus.key
          )}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide">
                {LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS.stage}
              </div>
              <div className="mt-1 font-semibold text-slate-900">
                {LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS.title}
              </div>
              <p className="mt-2">{completionDocumentFocus.message}</p>
            </div>

            <button
              type="button"
              data-testid="learner-completion-document-focus-dismiss"
              onClick={onClearCompletionDocumentFocus}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              {LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS.close}
            </button>
          </div>
        </div>
      ) : null}

      <div
        data-testid="learner-document-handoff-summary"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.documentType}
          </div>
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">
            {facts.documentTitle}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.documentStatus}
          </div>
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">
            {facts.statusLabel}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.completedAt}
          </div>
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">
            {formatDateTime(facts.completedAt)}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.downloadStatus}
          </div>
          <div
            data-testid="learner-document-handoff-download-state"
            className="mt-2 text-sm font-semibold leading-5 text-slate-900"
          >
            {facts.documentItem?.download_available
              ? LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.downloadAvailable
              : LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.downloadUnavailable}
          </div>
        </div>
      </div>

      <div
        data-testid="learner-document-handoff-availability-panel"
        data-stage={STAGE82_LEARNER_DOCUMENT_AVAILABILITY_HANDOFF}
        data-document-availability-state={facts.availability.key}
        className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${facts.availability.panelTone}`}
      >
        <div className="font-semibold text-slate-900">
          {LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.availability}
        </div>
        <p className="mt-2">{facts.availability.note}</p>

        {facts.documentItem ? (
          <div
            data-testid="learner-document-handoff-document-card"
            className="mt-4 grid gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-white md:grid-cols-3"
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.documentNumber}
              </div>
              <div className="mt-1 break-all font-semibold text-slate-900">
                {facts.documentItem.document_number || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.verificationCode}
              </div>
              <div className="mt-1 break-all font-semibold text-slate-900">
                {facts.documentItem.verification_code || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.issuedAt}
              </div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatDateTime(facts.documentItem.issued_at || facts.documentItem.created_at)}
              </div>
            </div>
          </div>
        ) : null}

        {verificationValue ? (
          <DocumentVerificationQrBlock
            code={facts.documentItem?.verification_code}
            documentNumber={facts.documentItem?.document_number}
            containerId={`learner-document-handoff-qr-${facts.documentItem?.id || verificationValue}`}
            title={LEARNER_DOCUMENT_HANDOFF_UX_LABELS.verifyDocument}
            description={LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.foundNote}
            size={112}
            showPublicLink
            showCopyLink
            className="mt-4"
          />
        ) : null}
      </div>

      <div
        data-testid="learner-document-publication-lifecycle-panel"
        data-stage={STAGE82_LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE}
        data-publication-lifecycle-state={publicationLifecycleState}
        className="mt-5 rounded-2xl bg-white p-4 text-sm leading-6 ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              {LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.stage}
            </div>
            <div className="mt-1 font-semibold text-slate-900">
              {LEARNER_DOCUMENT_PUBLICATION_LIFECYCLE_LABELS.title}
            </div>
            <p className="mt-2 text-slate-600">
              {getLearnerDocumentPublicationLifecycleSummary(publicationLifecycleState)}
            </p>
          </div>
        </div>

        <ol
          data-testid="learner-document-publication-lifecycle-steps"
          className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          {publicationLifecycleSteps.map((step, index) => (
            <li
              key={step.key}
              data-testid={`learner-document-publication-lifecycle-step-${step.key}`}
              data-publication-step-state={step.state}
              className={`rounded-2xl p-4 ring-1 ${step.tone}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {index + 1}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {step.badge}
                </span>
              </div>
              <div className="mt-3 font-semibold text-slate-900">{step.label}</div>
              <p className="mt-2 text-sm leading-6">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>

      <div
        data-testid="learner-document-handoff-next-step"
        className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${facts.availability.tone}`}
      >
        <div className="font-semibold text-slate-900">
          {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.nextStep}
        </div>
        <p className="mt-2">{facts.nextStep}</p>
      </div>

      <div
        data-testid="learner-document-handoff-actions"
        className="mt-5 flex flex-wrap gap-3"
      >
        {facts.documentItem?.download_available ? (
          <button
            type="button"
            data-testid="learner-document-handoff-download-action"
            data-stage={STAGE82_LEARNER_DOCUMENT_AVAILABILITY_HANDOFF}
            onClick={() => onDownloadDocument?.(facts.documentItem)}
            disabled={documentDownloadLoadingId === facts.documentItem.id}
            className="rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {documentDownloadLoadingId === facts.documentItem.id
              ? LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.downloadingDocument
              : LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.downloadDocument}
          </button>
        ) : null}

        {verificationValue ? (
          <a
            data-testid="learner-document-handoff-public-verify-action"
            data-stage={STAGE82_LEARNER_DOCUMENT_AVAILABILITY_HANDOFF}
            href={verificationPath}
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {LEARNER_DOCUMENT_AVAILABILITY_HANDOFF_LABELS.verifyPublic}
          </a>
        ) : null}

        <button
          type="button"
          data-testid="learner-document-handoff-documents-action"
          onClick={() => onPageChange("documents")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50"
        >
          {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.openDocuments}
        </button>

        <button
          type="button"
          data-testid="learner-document-handoff-account-action"
          onClick={() => onPageChange("account")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.openAccount}
        </button>

        <button
          type="button"
          data-testid="learner-document-handoff-verify-action"
          onClick={() => onPageChange("verify-document")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_DOCUMENT_HANDOFF_UX_LABELS.verifyDocument}
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
  const [accountCourseDetail, setAccountCourseDetail] = useState(null);
  const [lessonCompletionLoading, setLessonCompletionLoading] = useState(false);
  const [lessonCompletionError, setLessonCompletionError] = useState("");
  const [lessonCompletionSuccess, setLessonCompletionSuccess] = useState("");
  const [courseCompletionLoading, setCourseCompletionLoading] = useState(false);
  const [courseCompletionError, setCourseCompletionError] = useState("");
  const [courseCompletionSuccess, setCourseCompletionSuccess] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [accountDocuments, setAccountDocuments] = useState([]);
  const [accountDocumentsLoading, setAccountDocumentsLoading] = useState(false);
  const [accountDocumentsError, setAccountDocumentsError] = useState("");
  const [accountDocumentDownloadError, setAccountDocumentDownloadError] = useState("");
  const [accountDocumentDownloadLoadingId, setAccountDocumentDownloadLoadingId] = useState("");
  const [completionDocumentFocus, setCompletionDocumentFocus] = useState(null);
  const documentHandoffPanelRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCourse() {
      if (!courseSlug) {
        setCourse(null);
        setRelatedCourses([]);
        setExistingEnrollment(null);
        setAccountCourseDetail(null);
        setAccountDocuments([]);
        setAccountDocumentsLoading(false);
        setAccountDocumentsError("");
        setAccountDocumentDownloadError("");
        setAccountDocumentDownloadLoadingId("");
        setCompletionDocumentFocus(null);
        setLoading(false);
        setError("Курс не выбран.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        setAccountDocumentsLoading(Boolean(user));
        setAccountDocumentsError("");
        setAccountDocumentDownloadError("");
        setCompletionDocumentFocus(null);

        const [courseResponse, coursesResponse, accountCoursesResponse] = await Promise.all([
          getPublicCourseDetail(courseSlug),
          getPublicCourses({ limit: 6 }),
          user ? getAccountCourses() : Promise.resolve(null),
        ]);

        const accountCourses = Array.isArray(accountCoursesResponse?.items)
          ? accountCoursesResponse.items
          : [];

        const matchedEnrollment =
          accountCourses.find(
            (item) =>
              item.course_id === courseResponse.id ||
              item.course_slug === courseResponse.slug
          ) || null;

        let accountCourseDetailResponse = null;
        const matchedEnrollmentId = getEnrollmentId(matchedEnrollment);

        let accountDocumentItems = [];
        let accountDocumentLoadError = "";

        if (matchedEnrollmentId) {
          try {
            accountCourseDetailResponse = await getAccountCourseDetail(matchedEnrollmentId);
          } catch {
            accountCourseDetailResponse = null;
          }

          try {
            const accountDocumentsResponse = await getAccountDocuments({
              enrollment_id: matchedEnrollmentId,
              course_id: courseResponse.id,
            });
            accountDocumentItems = Array.isArray(accountDocumentsResponse?.items)
              ? accountDocumentsResponse.items
              : [];
          } catch (err) {
            accountDocumentLoadError = formatApiError(err, "Не удалось загрузить итоговые документы по курсу.");
          }
        }

        if (!isMounted) {
          return;
        }

        setCourse(courseResponse);
        setAccountCourseDetail(accountCourseDetailResponse);
        setAccountDocuments(accountDocumentItems);
        setAccountDocumentsError(accountDocumentLoadError);
        setAccountDocumentsLoading(false);
        setRelatedCourses(
          Array.isArray(coursesResponse)
            ? coursesResponse.filter((item) => item.slug !== courseResponse.slug).slice(0, 2)
            : []
        );
        setExistingEnrollment(accountCourseDetailResponse || matchedEnrollment);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setCourse(null);
        setRelatedCourses([]);
        setExistingEnrollment(null);
        setAccountCourseDetail(null);
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

  const learnerCourse = useMemo(
    () => mergeCourseWithAccountCourseDetail(course, accountCourseDetail),
    [course, accountCourseDetail]
  );

  const learnerLessonAccessFacts = useMemo(
    () => getLearnerLessonAccessFacts(learnerCourse, existingEnrollment, user),
    [learnerCourse, existingEnrollment, user]
  );

  useEffect(() => {
    const selectedLesson = getLearnerLessonBlockViewerSelectedLesson(learnerLessonAccessFacts, selectedLessonId);
    const nextLessonId = getLearnerLessonBlockViewerLessonId(selectedLesson);

    if (nextLessonId !== selectedLessonId) {
      setSelectedLessonId(nextLessonId);
    }
  }, [learnerLessonAccessFacts, selectedLessonId]);

  useEffect(() => {
    if (!completionDocumentFocus) {
      return;
    }

    const timer = window.setTimeout(() => {
      documentHandoffPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      documentHandoffPanelRef.current?.focus?.({ preventScroll: true });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [completionDocumentFocus]);

  const courseDiagnostics = useMemo(
    () =>
      getCourseDetailDiagnostics({
        course: learnerCourse,
        existingEnrollment,
        user,
        enrollLoading,
        enrollError,
        enrollSuccess,
        relatedCourses,
      }),
    [learnerCourse, existingEnrollment, user, enrollLoading, enrollError, enrollSuccess, relatedCourses]
  );

  async function handleCompleteLesson(lesson) {
    const enrollmentId = getEnrollmentId(existingEnrollment);

    if (!enrollmentId || !lesson?.id) {
      setLessonCompletionError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u0438\u043b\u0438 \u0443\u0440\u043e\u043a \u0434\u043b\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430.");
      setLessonCompletionSuccess("");
      return;
    }

    try {
      setLessonCompletionLoading(true);
      setLessonCompletionError("");
      setLessonCompletionSuccess("");

      const updatedCourseDetail = await completeAccountCourseLesson(enrollmentId, lesson.id);
      const nextLesson = getLearnerNextLessonAfterCompletion(
        updatedCourseDetail,
        updatedCourseDetail,
        user,
        lesson
      );
      const nextLessonId = getLearnerLessonBlockViewerLessonId(nextLesson);

      setAccountCourseDetail(updatedCourseDetail);
      setExistingEnrollment(updatedCourseDetail);

      if (nextLessonId) {
        setSelectedLessonId(nextLessonId);
      } else {
        setSelectedLessonId(getLearnerLessonBlockViewerLessonId(lesson));
      }

      setLessonCompletionSuccess(getLearnerNextLessonAfterCompletionMessage(nextLesson));
    } catch (err) {
      setLessonCompletionError(formatApiError(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043f\u043e \u0443\u0440\u043e\u043a\u0443."));
    } finally {
      setLessonCompletionLoading(false);
    }
  }

  async function handleDownloadAccountDocument(documentItem) {
    if (!documentItem?.id) {
      setAccountDocumentDownloadError("Не удалось определить документ для скачивания.");
      return;
    }

    try {
      setAccountDocumentDownloadLoadingId(documentItem.id);
      setAccountDocumentDownloadError("");
      await downloadAccountDocument(documentItem.id);
    } catch (err) {
      setAccountDocumentDownloadError(formatApiError(err, "Не удалось скачать итоговый документ."));
    } finally {
      setAccountDocumentDownloadLoadingId("");
    }
  }

  async function handleCompleteCourse() {
    const enrollmentId = getEnrollmentId(existingEnrollment);

    if (!enrollmentId) {
      setCourseCompletionError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441.");
      setCourseCompletionSuccess("");
      return;
    }

    try {
      setCourseCompletionLoading(true);
      setCourseCompletionError("");
      setCourseCompletionSuccess("");

      const completedCourse = await completeAccountCourse(enrollmentId);
      let updatedCourseDetail = completedCourse;

      if (!updatedCourseDetail?.modules) {
        try {
          updatedCourseDetail = await getAccountCourseDetail(enrollmentId);
        } catch {
          updatedCourseDetail = completedCourse;
        }
      }

      if (updatedCourseDetail) {
        setAccountCourseDetail(updatedCourseDetail);
        setExistingEnrollment(updatedCourseDetail);
      } else {
        setExistingEnrollment({
          ...existingEnrollment,
          status: "completed",
          completed_at: new Date().toISOString(),
        });
      }

      try {
        setAccountDocumentsLoading(true);
        setCompletionDocumentFocus({
          key: "loading",
          message: LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS.loading,
        });

        const accountDocumentsResponse = await getAccountDocuments({
          enrollment_id: enrollmentId,
          course_id: updatedCourseDetail?.course_id || existingEnrollment?.course_id || course?.id,
        });
        const nextAccountDocuments = Array.isArray(accountDocumentsResponse?.items)
          ? accountDocumentsResponse.items
          : [];
        const completedEnrollmentForDocument = updatedCourseDetail || {
          ...existingEnrollment,
          status: "completed",
          completed_at: new Date().toISOString(),
        };
        const completedDocumentItem = getLearnerDocumentAvailabilityHandoffDocument(
          course,
          completedEnrollmentForDocument,
          nextAccountDocuments
        );

        setAccountDocuments(nextAccountDocuments);
        setAccountDocumentsError("");
        setCompletionDocumentFocus({
          key: getLearnerCompletionDocumentFocusKey(completedDocumentItem),
          message: getLearnerCompletionDocumentFocusMessage(completedDocumentItem),
          documentId: completedDocumentItem?.id || "",
        });
      } catch (documentErr) {
        const documentMessage = formatApiError(documentErr, "Курс завершён, но сведения о документе пока не обновились.");
        setAccountDocumentsError(documentMessage);
        setCompletionDocumentFocus({
          key: "error",
          message: getLearnerCompletionDocumentFocusMessage(null, documentMessage),
        });
      } finally {
        setAccountDocumentsLoading(false);
      }

      setCourseCompletionSuccess(LEARNER_COMPLETION_DOCUMENT_FOCUS_LABELS.courseCompleted);
      setLessonCompletionError("");
      setLessonCompletionSuccess("");
    } catch (err) {
      setCourseCompletionError(formatApiError(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043a\u0443\u0440\u0441."));
    } finally {
      setCourseCompletionLoading(false);
    }
  }

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
      let createdCourseDetail = null;
      const createdEnrollmentId = getEnrollmentId(createdEnrollment);

      if (createdEnrollmentId) {
        try {
          createdCourseDetail = await getAccountCourseDetail(createdEnrollmentId);
        } catch {
          createdCourseDetail = null;
        }
      }

      setAccountCourseDetail(createdCourseDetail);
      setExistingEnrollment(createdCourseDetail || createdEnrollment);
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
        course={learnerCourse}
        existingEnrollment={existingEnrollment}
        user={user}
        enrollLoading={enrollLoading}
        onPrimaryAction={handleEnroll}
        onPageChange={onPageChange}
      />

      <CourseLearnerProgressFoundationPanel
        course={learnerCourse}
        existingEnrollment={existingEnrollment}
        user={user}
        onPrimaryAction={handleEnroll}
        onPageChange={onPageChange}
      />

      <CourseLearnerLessonAccessPanel
        course={learnerCourse}
        existingEnrollment={existingEnrollment}
        user={user}
        onPrimaryAction={handleEnroll}
        onPageChange={onPageChange}
      />

      <CourseLearnerLessonContentPreviewPanel
        course={learnerCourse}
        existingEnrollment={existingEnrollment}
        user={user}
        onPrimaryAction={handleEnroll}
        onPageChange={onPageChange}
        selectedLessonId={selectedLessonId}
      />

      <CourseLearnerLessonBlockViewerPanel
        course={learnerCourse}
        existingEnrollment={existingEnrollment}
        user={user}
        onPrimaryAction={handleEnroll}
        onPageChange={onPageChange}
        selectedLessonId={selectedLessonId}
        onSelectLesson={setSelectedLessonId}
      />

      <CourseLearnerCompletionActionPanel
        course={learnerCourse}
        existingEnrollment={existingEnrollment}
        user={user}
        onPrimaryAction={handleEnroll}
        onPageChange={onPageChange}
        onCompleteLesson={handleCompleteLesson}
        selectedLessonId={selectedLessonId}
        lessonCompletionLoading={lessonCompletionLoading}
        lessonCompletionError={lessonCompletionError}
        lessonCompletionSuccess={lessonCompletionSuccess}
      />

      <CourseLearnerCourseCompletionPanel
        course={learnerCourse}
        existingEnrollment={existingEnrollment}
        user={user}
        onCompleteCourse={handleCompleteCourse}
        courseCompletionLoading={courseCompletionLoading}
        courseCompletionError={courseCompletionError}
        courseCompletionSuccess={courseCompletionSuccess}
        onPageChange={onPageChange}
      />

      <CourseLearnerDocumentHandoffPanel
        course={learnerCourse}
        existingEnrollment={existingEnrollment}
        user={user}
        onPageChange={onPageChange}
        accountDocuments={accountDocuments}
        documentsLoading={accountDocumentsLoading}
        documentsError={accountDocumentsError || accountDocumentDownloadError}
        documentDownloadLoadingId={accountDocumentDownloadLoadingId}
        onDownloadDocument={handleDownloadAccountDocument}
        completionDocumentFocus={completionDocumentFocus}
        onClearCompletionDocumentFocus={() => setCompletionDocumentFocus(null)}
        documentHandoffRef={documentHandoffPanelRef}
      />

      <CourseSelfEnrollmentDiagnostics
        course={learnerCourse}
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


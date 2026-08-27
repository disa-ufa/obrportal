import { formatApiError } from "../utils/apiErrors";
import {
  ACCOUNT_COURSE_LOAD_STATES,
  COURSE_DETAIL_STATES,
  PUBLIC_COURSE_LOAD_STATES,
  resolveCourseDetailState,
} from "../utils/courseDetailState";
// Legacy CI smoke compatibility marker: import { useEffect, useState } from "react";
import { useEffect, useRef, useState } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { completeAccountCourse, completeAccountCourseLesson, completeAccountCourseLessonAssignment, submitAccountCourseLessonAssignmentAnswer, downloadAccountDocument, enrollAccountCourse, getAccountCourseDetail, getAccountCourses, getAccountDocuments, startAccountCourse, getPublicCourseDetail, getPublicCourses, getAccountCourseLessonAssignmentSubmission, getAccountCourseLessonQuizAttempts, submitAccountCourseLessonQuizAttempt } from "../api/client";
import { DocumentVerificationQrBlock } from "../components/documents/DocumentVerificationQrBlock";
import { formatRuDateTimeDash as formatDateTime } from "../utils/dateFormat";
import { buildInitialQuizAnswers } from "../components/admin/lesson-studio/quiz/quizGrading.js";
import { getQuizQuestionTypeMeta, normalizeQuizContent } from "../components/admin/lesson-studio/quiz/quizSchema.js";

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



function getLearnerQuizCompletionGate(quizAttemptStateByLesson, lessonId) {
  const state = quizAttemptStateByLesson?.[`${lessonId || ""}`];

  if (!state || !state.blocks || typeof state.blocks !== "object") {
    return {
      hasQuiz: false,
      attempted: false,
      passed: true,
    };
  }

  const blocks = Object.values(state.blocks).filter((item) => item?.hasQuiz);

  if (!blocks.length) {
    return {
      hasQuiz: false,
      attempted: false,
      passed: true,
    };
  }

  return {
    hasQuiz: true,
    attempted: blocks.some((item) => item.attempted),
    passed: blocks.every((item) => item.passed),
  };
}


function getLearnerAssignmentCompletionGate(assignmentSubmissionStateByLesson, lesson) {
  const lessonId = getLearnerLessonBlockViewerLessonId(lesson);
  const blocks = getLearnerLessonBlockViewerBlocks(lesson)
    .filter((block) => normalizeLearnerLessonBlockType(block?.block_type) === "assignment" && block?.is_required);

  if (!blocks.length) {
    return {
      hasAssignment: false,
      completed: true,
      completedCount: 0,
      requiredCount: 0,
    };
  }

  const lessonState = assignmentSubmissionStateByLesson?.[`${lessonId || ""}`];
  const statesByBlock = lessonState?.blocks && typeof lessonState.blocks === "object"
    ? lessonState.blocks
    : {};

  const completedCount = blocks.reduce((count, block) => {
    const blockKey = `${block?.id || block?.block_id || block?.position || ""}`;

    return count + (statesByBlock[blockKey]?.completed ? 1 : 0);
  }, 0);

  return {
    hasAssignment: true,
    completed: completedCount >= blocks.length,
    completedCount,
    requiredCount: blocks.length,
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
    <section className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
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
      className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
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
      className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
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
      className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
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


function getLearnerQuizQuestionResult(result, question, questionIndex) {
  const questionResults = Array.isArray(result?.question_results)
    ? result.question_results
    : [];

  if (!questionResults.length) {
    return null;
  }

  const questionId = `${question?.id || ""}`.trim();

  if (questionId) {
    return (
      questionResults.find((item) => `${item?.question_id || ""}`.trim() === questionId) ||
      questionResults[questionIndex] ||
      null
    );
  }

  return questionResults[questionIndex] || null;
}

function LearnerQuizAttemptBlock({
  block,
  lesson,
  enrollmentId = "",
  onCompleteLesson,
  lessonCompletionLoading = false,
  onQuizAttemptStateChange,
}) {
  const quizSource = JSON.stringify(getLearnerLessonBlockViewerContent(block) || {});
  const quiz = useMemo(
    () => normalizeQuizContent(JSON.parse(quizSource || "{}")),
    [quizSource]
  );
  const quizLabels = {
    interactiveTest: "\u0418\u043d\u0442\u0435\u0440\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u0442\u0435\u0441\u0442",
    questionCount: "\u0432\u043e\u043f\u0440\u043e\u0441(\u043e\u0432)",
    question: "\u0412\u043e\u043f\u0440\u043e\u0441",
    noQuestionText: "\u0412\u043e\u043f\u0440\u043e\u0441 \u0431\u0435\u0437 \u0442\u0435\u043a\u0441\u0442\u0430",
    point: "\u0431\u0430\u043b\u043b.",
    optionFallback: "\u0412\u0430\u0440\u0438\u0430\u043d\u0442 \u043e\u0442\u0432\u0435\u0442\u0430",
    trueLabel: "\u0412\u0435\u0440\u043d\u043e",
    falseLabel: "\u041d\u0435\u0432\u0435\u0440\u043d\u043e",
    enterAnswer: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043e\u0442\u0432\u0435\u0442",
    enterNumber: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043b\u043e",
    correctDefault: "\u0412\u0435\u0440\u043d\u043e.",
    incorrectDefault: "\u041e\u0442\u0432\u0435\u0442 \u043d\u0435\u0432\u0435\u0440\u043d\u044b\u0439. \u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0443\u0440\u043e\u043a\u0430.",
    resetAnswers: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b",
    checkAnswers: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b",
    passed: "\u0422\u0435\u0441\u0442 \u043f\u0440\u043e\u0439\u0434\u0435\u043d",
    failed: "\u0422\u0435\u0441\u0442 \u043f\u043e\u043a\u0430 \u043d\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d",
    scorePrefix: "\u041d\u0430\u0431\u0440\u0430\u043d\u043e",
    of: "\u0438\u0437",
    pointsLabel: "\u0431\u0430\u043b\u043b(\u043e\u0432)",
    passScore: "\u041f\u0440\u043e\u0445\u043e\u0434\u043d\u043e\u0439 \u043f\u043e\u0440\u043e\u0433",
    correctAnswers: "\u0412\u0435\u0440\u043d\u044b\u0445 \u043e\u0442\u0432\u0435\u0442\u043e\u0432",
    savingProgress: "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441...",
    markLessonCompleted: "\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0443\u0440\u043e\u043a \u043a\u0430\u043a \u0438\u0437\u0443\u0447\u0435\u043d\u043d\u044b\u0439",
    lessonAlreadyCompleted: "\u0423\u0440\u043e\u043a \u0443\u0436\u0435 \u043e\u0442\u043c\u0435\u0447\u0435\u043d \u043a\u0430\u043a \u0438\u0437\u0443\u0447\u0435\u043d\u043d\u044b\u0439.",
    attemptNumber: "\u041f\u043e\u043f\u044b\u0442\u043a\u0430",
    remainingAttempts: "\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043f\u044b\u0442\u043e\u043a",
    attemptsUnlimited: "\u0411\u0435\u0437 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u044f",
    noAttemptsLeft: "\u041f\u043e\u043f\u044b\u0442\u043a\u0438 \u0437\u0430\u043a\u043e\u043d\u0447\u0438\u043b\u0438\u0441\u044c",
    quizAlreadyPassed: "\u0422\u0435\u0441\u0442 \u0443\u0436\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d",
    backendResult: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0435",
    attemptHistoryTitle: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u043e\u043f\u044b\u0442\u043e\u043a",
    attemptHistoryEmpty: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u043e\u043f\u044b\u0442\u043e\u043a \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u0430.",
    loadingHistory: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u043f\u043e\u043f\u044b\u0442\u043e\u043a...",
    historyLoadError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u043f\u043e\u043f\u044b\u0442\u043e\u043a.",
    historyPassed: "\u041f\u0440\u043e\u0439\u0434\u0435\u043d",
    historyFailed: "\u041d\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d",
  };
  const [answers, setAnswers] = useState(() => buildInitialQuizAnswers(quiz));
  const [result, setResult] = useState(null);
  const [attemptSubmitting, setAttemptSubmitting] = useState(false);
  const [attemptError, setAttemptError] = useState("");
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [attemptHistoryLoading, setAttemptHistoryLoading] = useState(false);
  const [attemptHistoryError, setAttemptHistoryError] = useState("");

  useEffect(() => {
    setAnswers(buildInitialQuizAnswers(quiz));
    setResult(null);
    setAttemptError("");
    setAttemptHistory([]);
    setAttemptHistoryError("");
  }, [quiz]);

  function updateAnswer(questionId, value) {
    if (quizAnswersLocked) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
    setResult(null);
    setAttemptError("");
  }

  function toggleMultipleAnswer(questionId, optionId) {
    if (quizAnswersLocked) {
      return;
    }

    setAnswers((current) => {
      const currentValue = Array.isArray(current[questionId]) ? current[questionId] : [];
      const exists = currentValue.includes(optionId);
      return {
        ...current,
        [questionId]: exists
          ? currentValue.filter((item) => item !== optionId)
          : [...currentValue, optionId],
      };
    });
    setResult(null);
    setAttemptError("");
  }

  async function handleSubmitQuiz() {
    const lessonId = getLearnerLessonBlockViewerLessonId(lesson);
    const blockId = `${block?.id || ""}`.trim();

    if (result?.passed) {
      setAttemptError(quizLabels.quizAlreadyPassed);
      return;
    }

    if (attemptsLocked) {
      setAttemptError(quizLabels.noAttemptsLeft);
      return;
    }

    if (!enrollmentId || !lessonId || !blockId || block?.legacy) {
      setAttemptError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0442\u0435\u0441\u0442: \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0442 \u0434\u0430\u043d\u043d\u044b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438, \u0443\u0440\u043e\u043a\u0430 \u0438\u043b\u0438 \u0431\u043b\u043e\u043a\u0430.");
      return;
    }

    setAttemptSubmitting(true);
    setAttemptError("");

    try {
      const attempt = await submitAccountCourseLessonQuizAttempt(
        enrollmentId,
        lessonId,
        blockId,
        answers
      );

      setResult(attempt);
      setAttemptHistory((current) => {
        const items = Array.isArray(current) ? current : [];
        const filteredItems = items.filter((item) => `${item?.id || ""}` !== `${attempt?.id || ""}`);

        return [...filteredItems, attempt].sort(
          (left, right) => (Number(left?.attempt_number) || 0) - (Number(right?.attempt_number) || 0)
        );
      });
      setAttemptHistoryError("");
    } catch (error) {
      setResult(null);
      setAttemptError(formatApiError(error, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b \u0442\u0435\u0441\u0442\u0430."));
    } finally {
      setAttemptSubmitting(false);
    }
  }

  function handleResetQuiz() {
    setAnswers(buildInitialQuizAnswers(quiz));
    setResult(null);
    setAttemptError("");
  }

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const lessonCompleted = getLessonCompleted(lesson);
  const lessonId = getLearnerLessonBlockViewerLessonId(lesson);
  const blockKey = `${block?.id || block?.position || "quiz"}`;
  const attemptNumber = Number.isFinite(Number(result?.attempt_number)) ? Number(result.attempt_number) : null;
  const maxAttempts = Number.isFinite(Number(result?.max_attempts)) ? Number(result.max_attempts) : null;
  const remainingAttempts = Number.isFinite(Number(result?.remaining_attempts)) ? Number(result.remaining_attempts) : null;
  const attemptsLocked = Boolean(result && !result.passed && remainingAttempts !== null && remainingAttempts <= 0);
  const quizSubmitLocked = Boolean(result && (result.passed || attemptsLocked));
  const quizAnswersLocked = quizSubmitLocked;

  useEffect(() => {
    const normalizedEnrollmentId = `${enrollmentId || ""}`.trim();
    const normalizedLessonId = `${lessonId || ""}`.trim();
    const normalizedBlockId = `${block?.id || ""}`.trim();

    if (!normalizedEnrollmentId || !normalizedLessonId || !normalizedBlockId || block?.legacy) {
      setAttemptHistory([]);
      setAttemptHistoryError("");
      return;
    }

    let cancelled = false;

    async function loadAttemptHistory() {
      setAttemptHistoryLoading(true);
      setAttemptHistoryError("");

      try {
        const history = await getAccountCourseLessonQuizAttempts(
          normalizedEnrollmentId,
          normalizedLessonId,
          normalizedBlockId
        );

        if (cancelled) {
          return;
        }

        const nextHistory = Array.isArray(history) ? history : [];
        const latestAttempt = nextHistory[nextHistory.length - 1] || null;

        setAttemptHistory(nextHistory);
        setResult(latestAttempt);

        if (latestAttempt?.answers_json && typeof latestAttempt.answers_json === "object") {
          setAnswers((current) => ({
            ...current,
            ...latestAttempt.answers_json,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setAttemptHistoryError(formatApiError(error, quizLabels.historyLoadError));
        }
      } finally {
        if (!cancelled) {
          setAttemptHistoryLoading(false);
        }
      }
    }

    loadAttemptHistory();

    return () => {
      cancelled = true;
    };
  }, [enrollmentId, lessonId, block?.id, block?.legacy]);

  useEffect(() => {
    if (!lessonId) {
      return;
    }

    onQuizAttemptStateChange?.({
      lessonId,
      blockKey,
      hasQuiz: true,
      attempted: Boolean(result),
      passed: Boolean(result?.passed),
      percent: result?.percent ?? 0,
    });
  }, [lessonId, blockKey, result]);


  return (
    <div
      data-testid="learner-lesson-block-viewer-quiz"
      data-stage={STAGE82_LEARNER_BLOCK_TYPE_RENDERING}
      className="mt-4 rounded-2xl bg-violet-50 p-4 text-sm leading-6 text-violet-900 ring-1 ring-violet-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            {quizLabels.interactiveTest}
          </div>
          <h4 className="mt-1 text-base font-bold text-violet-950">
            {quiz.title || getLearnerLessonBlockViewerTitle(block, 0)}
          </h4>
          {quiz.description ? (
            <p className="mt-2 text-sm leading-6 text-violet-800">
              {quiz.description}
            </p>
          ) : null}
        </div>

        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
          {questions.length} {quizLabels.questionCount}
        </div>
      </div>

      {questions.length ? (
        <div className="mt-4 space-y-4">
          {questions.map((question, questionIndex) => {
            const type = `${question.type || ""}`.toLowerCase();
            const answer = answers[question.id];
            const typeMeta = getQuizQuestionTypeMeta(type);
            const questionResult = getLearnerQuizQuestionResult(result, question, questionIndex);

            return (
              <div
                key={question.id || questionIndex}
                data-testid="learner-quiz-question"
                className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {quizLabels.question} {questionIndex + 1} ? {typeMeta.shortLabel || typeMeta.label}
                    </div>
                    <div className="mt-1 text-base font-bold text-slate-950">
                      {question.title || question.question || quizLabels.noQuestionText}
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {Number(question.points) || 0} {quizLabels.point}
                  </span>
                </div>

                {question.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {question.description}
                  </p>
                ) : null}

                {(type === "single_choice" || type === "multiple_choice") ? (
                  <div className="mt-4 space-y-2">
                    {(Array.isArray(question.options) ? question.options : []).map((option) => {
                      const optionId = option.id;
                      const checked = type === "multiple_choice"
                        ? Array.isArray(answer) && answer.includes(optionId)
                        : `${answer || ""}` === `${optionId}`;

                      return (
                        <label
                          key={optionId}
                          className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition ${
                            checked
                              ? "border-violet-300 bg-violet-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type={type === "multiple_choice" ? "checkbox" : "radio"}
                            name={`quiz-question-${question.id}`}
                            checked={checked}
                            onChange={() => {
                              if (type === "multiple_choice") {
                                toggleMultipleAnswer(question.id, optionId);
                              } else {
                                updateAnswer(question.id, optionId);
                              }
                            }}
                            disabled={quizAnswersLocked}
                            className="mt-1"
                          />
                          <span className="text-sm leading-6 text-slate-800">
                            {option.text || quizLabels.optionFallback}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {type === "true_false" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[true, false].map((value) => (
                      <button
                        key={`${value}`}
                        type="button"
                        onClick={() => updateAnswer(question.id, value)}
                        disabled={quizAnswersLocked}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          answer === value
                            ? "bg-violet-600 text-white ring-violet-600"
                            : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {value ? quizLabels.trueLabel : quizLabels.falseLabel}
                      </button>
                    ))}
                  </div>
                ) : null}

                {type === "short_text" ? (
                  <textarea
                    value={answer || ""}
                    onChange={(event) => updateAnswer(question.id, event.target.value)}
                    disabled={quizAnswersLocked}
                    rows={3}
                    className="mt-4 min-h-[88px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder={quizLabels.enterAnswer}
                  />
                ) : null}

                {type === "number" ? (
                  <input
                    type="number"
                    value={answer || ""}
                    onChange={(event) => updateAnswer(question.id, event.target.value)}
                    disabled={quizAnswersLocked}
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder={quizLabels.enterNumber}
                  />
                ) : null}

                {questionResult ? (
                  <div
                    data-testid="learner-quiz-question-result"
                    className={`mt-4 rounded-2xl p-3 text-sm font-semibold ring-1 ${
                      questionResult.correct
                        ? "bg-green-50 text-green-800 ring-green-200"
                        : "bg-red-50 text-red-700 ring-red-200"
                    }`}
                  >
                    {questionResult.correct
                      ? question.feedback_correct || quizLabels.correctDefault
                      : question.feedback_incorrect || quizLabels.incorrectDefault}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-white p-4 text-violet-800 ring-1 ring-violet-200">
          {LEARNER_LESSON_BLOCK_VIEWER_LABELS.noOptions}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleResetQuiz}
          disabled={quizSubmitLocked}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {quizLabels.resetAnswers}
        </button>

        <button
          type="button"
          onClick={handleSubmitQuiz}
          disabled={attemptSubmitting || quizSubmitLocked}
          className="rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {attemptSubmitting ? "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c \u043e\u0442\u0432\u0435\u0442\u044b..." : result?.passed ? quizLabels.quizAlreadyPassed : attemptsLocked ? quizLabels.noAttemptsLeft : quizLabels.checkAnswers}
        </button>
      </div>

      {attemptHistoryLoading ? (
        <div className="mt-4 rounded-2xl bg-white/70 p-4 text-sm font-semibold text-violet-800 ring-1 ring-violet-200">
          {quizLabels.loadingHistory}
        </div>
      ) : null}

      {attemptHistoryError ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          {attemptHistoryError}
        </div>
      ) : null}

      {attemptHistory.length ? (
        <div
          data-testid="learner-quiz-attempt-history"
          className="mt-4 rounded-2xl bg-white/70 p-4 ring-1 ring-violet-200"
        >
          <div className="text-sm font-bold text-violet-950">
            {quizLabels.attemptHistoryTitle}
          </div>

          <div className="mt-3 grid gap-2">
            {attemptHistory.map((attempt, attemptIndex) => (
              <div
                key={attempt.id || attempt.attempt_number || attemptIndex}
                className={`rounded-2xl px-3 py-2 text-xs font-semibold ring-1 ${
                  attempt.passed
                    ? "bg-green-50 text-green-800 ring-green-200"
                    : "bg-amber-50 text-amber-900 ring-amber-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {quizLabels.attemptNumber} {"\u2116"}{attempt.attempt_number || attemptIndex + 1}
                    {" \u00B7 "}
                    {attempt.passed ? quizLabels.historyPassed : quizLabels.historyFailed}
                  </span>
                  <span>
                    {attempt.percent ?? 0}% {"\u00B7"} {attempt.earned_points ?? 0} {quizLabels.of} {attempt.total_points ?? 0}
                  </span>
                </div>
                {attempt.submitted_at ? (
                  <div className="mt-1 text-[11px] font-semibold opacity-75">
                    {formatDateTime(attempt.submitted_at)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {attemptError ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          {attemptError}
        </div>
      ) : null}

      {result ? (
        <div
          data-testid="learner-quiz-result"
          className={`mt-4 rounded-2xl p-4 ring-1 ${
            result.passed
              ? "bg-green-50 text-green-800 ring-green-200"
              : "bg-amber-50 text-amber-900 ring-amber-200"
          }`}
        >
          <div className="text-sm font-bold">
            {result.passed ? quizLabels.passed : quizLabels.failed}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {attemptNumber !== null ? (
              <div className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold ring-1 ring-white">
                {quizLabels.attemptNumber} {"\u2116"}{attemptNumber}
              </div>
            ) : null}
            <div className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold ring-1 ring-white">
              {quizLabels.remainingAttempts}: {maxAttempts === null ? quizLabels.attemptsUnlimited : remainingAttempts ?? 0}
            </div>
            <div className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold ring-1 ring-white">
              {quizLabels.backendResult}
            </div>
          </div>

          <div className="mt-2 text-sm leading-6">
            {quizLabels.scorePrefix} {result.earned_points} {quizLabels.of} {result.total_points} {quizLabels.pointsLabel}, {result.percent}%.
            {quizLabels.passScore}: {result.pass_score_percent ?? 0}%.
            {quizLabels.correctAnswers}: {result.correct_count} {quizLabels.of} {result.question_count}.
          </div>

          {result.passed && !lessonCompleted ? (
            <button
              type="button"
              onClick={() => onCompleteLesson?.(lesson)}
              disabled={lessonCompletionLoading}
              className="mt-4 rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {lessonCompletionLoading ? quizLabels.savingProgress : quizLabels.markLessonCompleted}
            </button>
          ) : null}

          {lessonCompleted ? (
            <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-green-700 ring-1 ring-green-200">
              {quizLabels.lessonAlreadyCompleted}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


const LEARNER_ASSIGNMENT_COMPLETION_LABELS = {
  title: "\u041f\u0440\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u0435",
  instruction: "\u0418\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u044f",
  expectedResult: "\u0427\u0442\u043e \u0434\u043e\u043b\u0436\u043d\u043e \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c\u0441\u044f",
  submissionFormat: "\u0424\u043e\u0440\u043c\u0430\u0442 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f",
  criteria: "\u041a\u0440\u0438\u0442\u0435\u0440\u0438\u0438",
  estimatedTime: "\u041f\u0440\u0438\u043c\u0435\u0440\u043d\u043e\u0435 \u0432\u0440\u0435\u043c\u044f",
  status: "\u0421\u0442\u0430\u0442\u0443\u0441",
  notStarted: "\u041d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0441\u0442\u0430\u0442\u0443\u0441...",
  completed: "\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e",
  submitted: "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e",
  approved: "\u0417\u0430\u0447\u0442\u0435\u043d\u043e",
  returned: "\u0412\u0435\u0440\u043d\u0443\u0442\u043e \u043d\u0430 \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0443",
  answerLabel: "\u0412\u0430\u0448 \u043e\u0442\u0432\u0435\u0442",
  answerPlaceholder: "\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043a\u0440\u0430\u0442\u043a\u0438\u0439 \u043e\u0442\u0432\u0435\u0442 \u043f\u043e \u0437\u0430\u0434\u0430\u043d\u0438\u044e.",
  submitAnswer: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442",
  submittingAnswer: "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c...",
  answerRequired: "\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043e\u0442\u0432\u0435\u0442 \u043f\u0435\u0440\u0435\u0434 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u043e\u0439.",
  answerSaved: "\u041e\u0442\u0432\u0435\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d.",
  answerSubmitted: "\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d. \u041e\u043d \u0431\u0443\u0434\u0435\u0442 \u0443\u0447\u0442\u0451\u043d \u0432 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0435 \u0443\u0440\u043e\u043a\u0430.",
  manualReviewSubmitted: "\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430 \u0440\u0443\u0447\u043d\u0443\u044e \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443.",
  saveAnswerError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442.",
  markCompleted: "\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u043d\u0438\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u043c",
  saving: "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c...",
  alreadyCompleted: "\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u0443\u0436\u0435 \u043e\u0442\u043c\u0435\u0447\u0435\u043d\u043e \u043a\u0430\u043a \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e.",
  saved: "\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e. \u0422\u0435\u043f\u0435\u0440\u044c \u043c\u043e\u0436\u043d\u043e \u043e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0443\u0440\u043e\u043a \u043a\u0430\u043a \u0438\u0437\u0443\u0447\u0435\u043d\u043d\u044b\u0439.",
  manualReviewInfo: "\u042d\u0442\u043e \u0437\u0430\u0434\u0430\u043d\u0438\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0440\u0443\u0447\u043d\u043e\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438. \u041f\u043e\u0441\u043b\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438 \u043e\u0442\u0432\u0435\u0442\u0430 \u0437\u0430\u0434\u0430\u043d\u0438\u0435 \u0431\u0443\u0434\u0435\u0442 \u0436\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438.",
  loadError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0434\u0430\u043d\u0438\u044f.",
  saveError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u043d\u0438\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u043c.",
  reviewResultTitle: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
  reviewAwaiting: "\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u0438 \u043e\u0436\u0438\u0434\u0430\u0435\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438.",
  reviewApproved: "\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u0437\u0430\u0447\u0442\u0435\u043d\u043e. \u0415\u0441\u043b\u0438 \u0443\u0440\u043e\u043a \u0435\u0449\u0451 \u043d\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d, \u0442\u0435\u043f\u0435\u0440\u044c \u0435\u0433\u043e \u043c\u043e\u0436\u043d\u043e \u043e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u043a\u0430\u043a \u0438\u0437\u0443\u0447\u0435\u043d\u043d\u044b\u0439.",
  reviewRejected: "\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u043d\u0443\u0436\u043d\u043e \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c. \u041f\u0440\u043e\u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u043e\u0442\u0432\u0435\u0442 \u0435\u0449\u0451 \u0440\u0430\u0437.",
  reviewSubmitted: "\u041e\u0442\u0432\u0435\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d.",
  reviewScore: "\u0411\u0430\u043b\u043b",
  reviewComment: "\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u044e\u0449\u0435\u0433\u043e",
  reviewedAt: "\u0414\u0430\u0442\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
};

function normalizeLearnerAssignmentReviewMode(value) {
  const mode = `${value || ""}`.trim();

  return ["self_check", "submit_only", "manual_review"].includes(mode) ? mode : "self_check";
}

function getLearnerAssignmentContent(block) {
  return getLearnerLessonBlockViewerContent(block);
}

function getLearnerAssignmentDescription(block, fallbackText = "") {
  const content = getLearnerAssignmentContent(block);

  return `${content.description || content.assignment_text || content.content_text || content.text || content.instruction || content.task || fallbackText || ""}`.trim();
}

function getLearnerAssignmentStatusLabel(status) {
  switch (`${status || ""}`.trim()) {
    case "completed":
      return LEARNER_ASSIGNMENT_COMPLETION_LABELS.completed;
    case "submitted":
      return LEARNER_ASSIGNMENT_COMPLETION_LABELS.submitted;
    case "approved":
      return LEARNER_ASSIGNMENT_COMPLETION_LABELS.approved;
    case "returned":
    case "rejected":
      return LEARNER_ASSIGNMENT_COMPLETION_LABELS.returned;
    default:
      return LEARNER_ASSIGNMENT_COMPLETION_LABELS.notStarted;
  }
}

function getLearnerAssignmentStatusTone(status, completed = false) {
  const normalized = `${status || ""}`.trim();

  if (normalized === "approved" || completed) {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (normalized === "rejected" || normalized === "returned") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (normalized === "submitted") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (normalized === "completed") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  return "bg-white text-red-700 ring-red-200";
}

function getLearnerAssignmentReviewPanelTone(status) {
  const normalized = `${status || ""}`.trim();

  if (normalized === "approved") {
    return "bg-green-50 text-green-900 ring-green-200";
  }

  if (normalized === "rejected" || normalized === "returned") {
    return "bg-red-50 text-red-900 ring-red-200";
  }

  if (normalized === "submitted") {
    return "bg-amber-50 text-amber-900 ring-amber-200";
  }

  return "bg-slate-50 text-slate-800 ring-slate-200";
}

function getLearnerAssignmentScoreText(submission) {
  const score = submission?.score;
  const maxScore = submission?.max_score;
  const hasScore = score !== null && score !== undefined && score !== "";
  const hasMaxScore = maxScore !== null && maxScore !== undefined && maxScore !== "";

  if (hasScore && hasMaxScore) {
    return `${score} / ${maxScore}`;
  }

  if (hasScore) {
    return `${score}`;
  }

  if (hasMaxScore) {
    return `0 / ${maxScore}`;
  }

  return "";
}

function getLearnerAssignmentReviewMessage(status, reviewMode) {
  const normalized = `${status || ""}`.trim();
  const mode = normalizeLearnerAssignmentReviewMode(reviewMode);

  if (normalized === "approved") {
    return LEARNER_ASSIGNMENT_COMPLETION_LABELS.reviewApproved;
  }

  if (normalized === "rejected" || normalized === "returned") {
    return LEARNER_ASSIGNMENT_COMPLETION_LABELS.reviewRejected;
  }

  if (normalized === "submitted" && mode === "manual_review") {
    return LEARNER_ASSIGNMENT_COMPLETION_LABELS.reviewAwaiting;
  }

  if (normalized === "submitted") {
    return LEARNER_ASSIGNMENT_COMPLETION_LABELS.reviewSubmitted;
  }

  return "";
}

function doesLearnerAssignmentSubmissionComplete(reviewMode, submission) {
  const status = `${submission?.status || "not_started"}`.trim();
  const mode = normalizeLearnerAssignmentReviewMode(reviewMode);

  if (mode === "manual_review") {
    return status === "approved";
  }

  if (mode === "submit_only") {
    return ["submitted", "approved", "completed"].includes(status);
  }

  return ["completed", "submitted", "approved"].includes(status);
}

function LearnerAssignmentCompletionBlock({
  block,
  lesson,
  enrollmentId = "",
  text = "",
  href = "",
  onAssignmentSubmissionStateChange,
}) {
  const content = getLearnerAssignmentContent(block);
  const lessonId = getLearnerLessonBlockViewerLessonId(lesson);
  const blockKey = `${block?.id || block?.block_id || block?.position || ""}`;
  const reviewMode = normalizeLearnerAssignmentReviewMode(content.review_mode);
  const description = getLearnerAssignmentDescription(block, text);
  const expectedResult = `${content.expected_result || content.expectedResult || content.result || ""}`.trim();
  const submissionFormat = `${content.submission_format || content.submissionFormat || content.format || ""}`.trim();
  const criteria = `${content.criteria || content.checklist || content.evaluation_criteria || ""}`.trim();
  const estimatedMinutes = Number(content.estimated_minutes || content.estimatedMinutes || 0);
  const estimatedTimeText = Number.isFinite(estimatedMinutes) && estimatedMinutes > 0
    ? `${Math.round(estimatedMinutes)} \u043c\u0438\u043d.`
    : "";
  const manualReview = reviewMode === "manual_review";

  const [submission, setSubmission] = useState(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionSaving, setSubmissionSaving] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [answerSubmitting, setAnswerSubmitting] = useState(false);

  const completed = doesLearnerAssignmentSubmissionComplete(reviewMode, submission);
  const assignmentStatus = `${submission?.status || "not_started"}`.trim();
  const statusLabel = submissionLoading
    ? LEARNER_ASSIGNMENT_COMPLETION_LABELS.loading
    : getLearnerAssignmentStatusLabel(submission?.status);
  const statusTone = submissionLoading
    ? "bg-white text-slate-600 ring-slate-200"
    : getLearnerAssignmentStatusTone(assignmentStatus, completed);
  const scoreText = getLearnerAssignmentScoreText(submission);
  const reviewComment = `${submission?.review_comment || ""}`.trim();
  const reviewedAtText = submission?.reviewed_at ? formatDateTime(submission.reviewed_at) : "";
  const reviewMessage = getLearnerAssignmentReviewMessage(assignmentStatus, reviewMode);
  const showReviewFeedback = Boolean(submission) && Boolean(
    reviewMessage ||
    reviewComment ||
    scoreText ||
    reviewedAtText ||
    ["submitted", "approved", "rejected", "returned"].includes(assignmentStatus)
  );

  const detailItems = [
    expectedResult ? [LEARNER_ASSIGNMENT_COMPLETION_LABELS.expectedResult, expectedResult] : null,
    submissionFormat ? [LEARNER_ASSIGNMENT_COMPLETION_LABELS.submissionFormat, submissionFormat] : null,
    criteria ? [LEARNER_ASSIGNMENT_COMPLETION_LABELS.criteria, criteria] : null,
    estimatedTimeText ? [LEARNER_ASSIGNMENT_COMPLETION_LABELS.estimatedTime, estimatedTimeText] : null,
  ].filter(Boolean);

  function publishAssignmentState(nextSubmission, nextLoading = false) {
    if (!lessonId || !blockKey) {
      return;
    }

    onAssignmentSubmissionStateChange?.({
      lessonId,
      blockKey,
      hasAssignment: true,
      loading: nextLoading,
      status: nextSubmission?.status || "not_started",
      completed: doesLearnerAssignmentSubmissionComplete(reviewMode, nextSubmission),
    });
  }

  useEffect(() => {
    let ignore = false;

    publishAssignmentState(submission, true);

    if (!enrollmentId || !lessonId || !blockKey) {
      publishAssignmentState(null, false);
      return () => {
        ignore = true;
      };
    }

    async function loadSubmission() {
      try {
        setSubmissionLoading(true);
        setSubmissionError("");
        const nextSubmission = await getAccountCourseLessonAssignmentSubmission(enrollmentId, lessonId, blockKey);

        if (ignore) {
          return;
        }

        setSubmission(nextSubmission);
        setAnswerText(nextSubmission?.answer_text || "");
        publishAssignmentState(nextSubmission, false);
      } catch (err) {
        if (ignore) {
          return;
        }

        setSubmissionError(formatApiError(err, LEARNER_ASSIGNMENT_COMPLETION_LABELS.loadError));
        publishAssignmentState(null, false);
      } finally {
        if (!ignore) {
          setSubmissionLoading(false);
        }
      }
    }

    loadSubmission();

    return () => {
      ignore = true;
    };
  }, [enrollmentId, lessonId, blockKey, reviewMode]);

  async function handleSubmitAssignmentAnswer() {
    if (!enrollmentId || !lessonId || !blockKey || answerSubmitting) {
      return;
    }

    const normalizedAnswer = `${answerText || ""}`.trim();

    if (!normalizedAnswer) {
      setSubmissionError(LEARNER_ASSIGNMENT_COMPLETION_LABELS.answerRequired);
      setSubmissionSuccess("");
      return;
    }

    try {
      setAnswerSubmitting(true);
      setSubmissionError("");
      setSubmissionSuccess("");

      const nextSubmission = await submitAccountCourseLessonAssignmentAnswer(
        enrollmentId,
        lessonId,
        blockKey,
        normalizedAnswer
      );

      setSubmission(nextSubmission);
      setAnswerText(nextSubmission?.answer_text || normalizedAnswer);
      publishAssignmentState(nextSubmission, false);

      setSubmissionSuccess(
        reviewMode === "manual_review"
          ? LEARNER_ASSIGNMENT_COMPLETION_LABELS.manualReviewSubmitted
          : reviewMode === "submit_only"
            ? LEARNER_ASSIGNMENT_COMPLETION_LABELS.answerSubmitted
            : LEARNER_ASSIGNMENT_COMPLETION_LABELS.answerSaved
      );
    } catch (err) {
      setSubmissionError(formatApiError(err, LEARNER_ASSIGNMENT_COMPLETION_LABELS.saveAnswerError));
    } finally {
      setAnswerSubmitting(false);
    }
  }

  async function handleCompleteAssignment() {
    if (!enrollmentId || !lessonId || !blockKey || completed || manualReview) {
      return;
    }

    try {
      setSubmissionSaving(true);
      setSubmissionError("");
      setSubmissionSuccess("");
      const nextSubmission = await completeAccountCourseLessonAssignment(enrollmentId, lessonId, blockKey);

      setSubmission(nextSubmission);
      publishAssignmentState(nextSubmission, false);
      setSubmissionSuccess(LEARNER_ASSIGNMENT_COMPLETION_LABELS.saved);
    } catch (err) {
      setSubmissionError(formatApiError(err, LEARNER_ASSIGNMENT_COMPLETION_LABELS.saveError));
    } finally {
      setSubmissionSaving(false);
    }
  }

  return (
    <div
      data-testid="learner-lesson-block-viewer-assignment"
      data-stage={STAGE82_LEARNER_BLOCK_TYPE_RENDERING}
      className="mt-4 rounded-2xl bg-red-50/80 p-4 text-sm leading-6 text-red-900 ring-1 ring-red-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-black uppercase tracking-[0.12em] text-red-700">
            {LEARNER_ASSIGNMENT_COMPLETION_LABELS.title}
          </div>
          <div className="mt-1 text-xs font-semibold text-red-700">
            {LEARNER_ASSIGNMENT_COMPLETION_LABELS.status}: {statusLabel}
          </div>
        </div>

        <span
          data-testid="learner-assignment-completion-status"
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-slate-800 ring-1 ring-red-100">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
          {LEARNER_ASSIGNMENT_COMPLETION_LABELS.instruction}
        </div>
        <div className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-7">
          {description || LEARNER_LESSON_BLOCK_VIEWER_LABELS.noBlocks}
        </div>
      </div>

      {detailItems.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {detailItems.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/70 p-4 text-slate-800 ring-1 ring-red-100">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
                {label}
              </div>
              <div className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6">
                {value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {href ? (
        <a
          data-testid="learner-lesson-block-viewer-assignment-link"
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50"
        >
          {LEARNER_LESSON_BLOCK_VIEWER_LABELS.openMaterial}
        </a>
      ) : null}

      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-slate-800 ring-1 ring-red-100">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
          {LEARNER_ASSIGNMENT_COMPLETION_LABELS.answerLabel}
        </label>
        <textarea
          data-testid="learner-assignment-answer-textarea"
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
          rows={5}
          maxLength={10000}
          disabled={answerSubmitting || submissionLoading}
          className="mt-3 min-h-[120px] w-full resize-y rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          placeholder={LEARNER_ASSIGNMENT_COMPLETION_LABELS.answerPlaceholder}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-500">
            {answerText.trim().length} / 10000
          </div>
          <button
            type="button"
            data-testid="learner-assignment-submit-answer-button"
            onClick={handleSubmitAssignmentAnswer}
            disabled={answerSubmitting || submissionLoading || !answerText.trim()}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {answerSubmitting
              ? LEARNER_ASSIGNMENT_COMPLETION_LABELS.submittingAnswer
              : LEARNER_ASSIGNMENT_COMPLETION_LABELS.submitAnswer}
          </button>
        </div>
      </div>

      {manualReview && !completed ? (
        <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
          {LEARNER_ASSIGNMENT_COMPLETION_LABELS.manualReviewInfo}
        </div>
      ) : null}

      {showReviewFeedback ? (
        <div
          data-testid="learner-assignment-review-result"
          className={`mt-4 rounded-2xl p-4 text-sm font-semibold ring-1 ${getLearnerAssignmentReviewPanelTone(assignmentStatus)}`}
        >
          <div className="text-xs font-black uppercase tracking-[0.12em]">
            {LEARNER_ASSIGNMENT_COMPLETION_LABELS.reviewResultTitle}
          </div>

          {reviewMessage ? (
            <p className="mt-2 leading-6">
              {reviewMessage}
            </p>
          ) : null}

          {(scoreText || reviewedAtText) ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {scoreText ? (
                <div className="rounded-xl bg-white/70 p-3 ring-1 ring-white/70">
                  <div className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">
                    {LEARNER_ASSIGNMENT_COMPLETION_LABELS.reviewScore}
                  </div>
                  <div className="mt-1 text-base font-black">{scoreText}</div>
                </div>
              ) : null}

              {reviewedAtText ? (
                <div className="rounded-xl bg-white/70 p-3 ring-1 ring-white/70">
                  <div className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">
                    {LEARNER_ASSIGNMENT_COMPLETION_LABELS.reviewedAt}
                  </div>
                  <div className="mt-1 text-base font-black">{reviewedAtText}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {reviewComment ? (
            <div
              data-testid="learner-assignment-review-comment"
              className="mt-3 rounded-xl bg-white/70 p-3 ring-1 ring-white/70"
            >
              <div className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">
                {LEARNER_ASSIGNMENT_COMPLETION_LABELS.reviewComment}
              </div>
              <div className="mt-2 whitespace-pre-wrap break-words leading-6">
                {reviewComment}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {submissionError ? (
        <div className="mt-4 rounded-2xl bg-red-100 p-4 text-sm font-semibold text-red-800 ring-1 ring-red-200">
          {submissionError}
        </div>
      ) : null}

      {submissionSuccess ? (
        <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-800 ring-1 ring-green-200">
          {submissionSuccess}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="learner-assignment-complete-button"
          onClick={handleCompleteAssignment}
          disabled={submissionLoading || submissionSaving || completed || manualReview}
          className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submissionSaving
            ? LEARNER_ASSIGNMENT_COMPLETION_LABELS.saving
            : completed
              ? LEARNER_ASSIGNMENT_COMPLETION_LABELS.alreadyCompleted
              : LEARNER_ASSIGNMENT_COMPLETION_LABELS.markCompleted}
        </button>
      </div>
    </div>
  );
}


function LearnerLessonBlockViewerBody({ block, blockType, text, url, href, options, lesson, enrollmentId, onCompleteLesson, lessonCompletionLoading, onQuizAttemptStateChange, onAssignmentSubmissionStateChange }) {
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
      <LearnerQuizAttemptBlock
        block={block}
        lesson={lesson}
        enrollmentId={enrollmentId}
        onCompleteLesson={onCompleteLesson}
        lessonCompletionLoading={lessonCompletionLoading}
        onQuizAttemptStateChange={onQuizAttemptStateChange}
      />
    );
  }

  if (blockType === "assignment") {
    return (
      <LearnerAssignmentCompletionBlock
        block={block}
        lesson={lesson}
        enrollmentId={enrollmentId}
        text={text}
        href={href}
        onAssignmentSubmissionStateChange={onAssignmentSubmissionStateChange}
      />
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

function LearnerLessonBlockViewerBlock({ block, index, lesson, enrollmentId, onCompleteLesson, lessonCompletionLoading, onQuizAttemptStateChange, onAssignmentSubmissionStateChange }) {
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
        lesson={lesson}
        enrollmentId={enrollmentId}
        onCompleteLesson={onCompleteLesson}
        lessonCompletionLoading={lessonCompletionLoading}
        onQuizAttemptStateChange={onQuizAttemptStateChange}
        onAssignmentSubmissionStateChange={onAssignmentSubmissionStateChange}
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
  onCompleteLesson,
  lessonCompletionLoading = false,
  onQuizAttemptStateChange,
  onAssignmentSubmissionStateChange,
}) {
  const facts = getLearnerLessonBlockViewerFacts(course, existingEnrollment, user, selectedLessonId);
  const enrollmentId = getEnrollmentId(existingEnrollment);

  return (
    <section
      data-testid="learner-lesson-block-viewer-panel"
      data-stage={STAGE82_LEARNER_LESSON_BLOCK_VIEWER}
      className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
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
            <LearnerLessonBlockViewerBlock
              key={block.id || index}
              block={block}
              index={index}
              lesson={facts.lesson}
              enrollmentId={enrollmentId}
              onCompleteLesson={onCompleteLesson}
              lessonCompletionLoading={lessonCompletionLoading}
              onQuizAttemptStateChange={onQuizAttemptStateChange}
              onAssignmentSubmissionStateChange={onAssignmentSubmissionStateChange}
            />
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
  quizCompletionGate = null,
}) {
  const facts = getLearnerCompletionActionFacts(course, existingEnrollment, user, selectedLessonId);
  const lesson = facts.lesson;
  const quizCompletionBlocked = Boolean(
    quizCompletionGate?.hasQuiz && !quizCompletionGate?.passed && !facts.completed
  );
  const quizCompletionBlockedMessage = quizCompletionGate?.attempted
    ? "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043d\u0443\u0436\u043d\u043e \u043f\u0440\u043e\u0439\u0442\u0438 \u0442\u0435\u0441\u0442 \u043d\u0430 \u043f\u0440\u043e\u0445\u043e\u0434\u043d\u043e\u0439 \u0431\u0430\u043b\u043b."
    : "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u0432\u0435\u0442\u044c\u0442\u0435 \u043d\u0430 \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u0442\u0435\u0441\u0442\u0430.";
  const canCompleteLesson = facts.canCompleteLesson && !quizCompletionBlocked;

  return (
    <section data-testid="learner-completion-action-panel" className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">{LEARNER_COMPLETION_ACTION_UX_LABELS.stage}</div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{LEARNER_COMPLETION_ACTION_UX_LABELS.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{LEARNER_COMPLETION_ACTION_UX_LABELS.subtitle}</p>
        </div>
        <span data-testid="learner-completion-action-status" className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200">{quizCompletionBlocked ? "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0442\u0435\u0441\u0442" : facts.actionStatus}</span>
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

      <div data-testid="learner-completion-action-note" className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-200">{facts.completed ? LEARNER_COMPLETION_ACTION_UX_LABELS.lessonAlreadyCompleted : quizCompletionBlocked ? quizCompletionBlockedMessage : canCompleteLesson ? LEARNER_LESSON_PROGRESS_STATE_LABELS.completionReady : LEARNER_LESSON_PROGRESS_STATE_LABELS.completionLocked}</div>

      {lessonCompletionSuccess ? <div data-testid="learner-completion-action-success" data-stage={STAGE82_LEARNER_NEXT_LESSON_AFTER_COMPLETION} className="mt-5 rounded-2xl bg-green-50 p-4 text-sm leading-6 text-green-800 ring-1 ring-green-200">{lessonCompletionSuccess}</div> : null}
      {lessonCompletionError ? <div data-testid="learner-completion-action-error" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-700 ring-1 ring-red-200">{lessonCompletionError}</div> : null}

      <div data-testid="learner-completion-action-actions" className="mt-5 flex flex-wrap gap-3">
        {facts.hasUrl && !facts.locked ? <a data-testid="learner-completion-action-open-link" href={facts.previewFacts.url.startsWith("http://") || facts.previewFacts.url.startsWith("https://") ? facts.previewFacts.url : `https://${facts.previewFacts.url}`} target="_blank" rel="noreferrer" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">{LEARNER_COMPLETION_ACTION_UX_LABELS.openMaterial}</a> : <button type="button" onClick={onPrimaryAction} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">{facts.locked ? LEARNER_COMPLETION_ACTION_UX_LABELS.enroll : LEARNER_COMPLETION_ACTION_UX_LABELS.openAccount}</button>}
        {canCompleteLesson ? <button type="button" data-testid="learner-completion-action-complete-button" onClick={() => onCompleteLesson?.(facts.lesson)} disabled={lessonCompletionLoading} className="rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">{lessonCompletionLoading ? LEARNER_COMPLETION_ACTION_UX_LABELS.savingCompletion : LEARNER_COMPLETION_ACTION_UX_LABELS.markLessonCompleted}</button> : null}
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
      className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
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
      className={`rounded-shell bg-white p-6 shadow-sm outline-none transition md:p-8 ${
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
      className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200"
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



function CourseDetailGuestProgram({
  modules = [],
  guestPreview = false,
  authenticated = false,
  assigned = false,
  active = false,
  completed = false,
  cancelled = false,
}) {
  const normalizedModules = Array.isArray(modules)
    ? modules
    : [];

  const formatProgramCount = (count, labels) => {
    const value = Math.abs(Number(count) || 0);
    const mod100 = value % 100;
    const mod10 = value % 10;
    let label = labels[2];

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        label = labels[0];
      } else if (mod10 >= 2 && mod10 <= 4) {
        label = labels[1];
      }
    }

    return `${value} ${label}`;
  };

  const firstModuleWithLessonsIndex =
    normalizedModules.findIndex(
      (module) =>
        Array.isArray(module?.lessons) &&
        module.lessons.length > 0
    );

  const programLessonEntries =
    normalizedModules.flatMap(
      (module, moduleIndex) =>
        (Array.isArray(module?.lessons)
          ? module.lessons
          : []
        ).map((lesson, lessonIndex) => ({
          lesson,
          position: `${moduleIndex}:${lessonIndex}`,
        }))
    );

  const firstIncompleteLessonPosition =
    programLessonEntries.find(
      (item) => !getLessonCompleted(item.lesson)
    )?.position || "";

  return (
    <section
      data-testid="course-detail-guest-program"
      data-course-program-view={
        guestPreview ? "guest-preview" : "account-state"
      }
      className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            {"\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"}
          </div>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {"\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u043a\u0443\u0440\u0441\u0430"}
          </h2>

          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {cancelled
              ? "\u0417\u0430\u043f\u0438\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441 \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430. \u0417\u0434\u0435\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f \u0443\u0440\u043e\u043a\u043e\u0432."
              : completed
              ? "\u041a\u0443\u0440\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d. \u0412 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d \u0444\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f \u043a\u0430\u0436\u0434\u043e\u0433\u043e \u0443\u0440\u043e\u043a\u0430."
              : active
              ? "\u0417\u0434\u0435\u0441\u044c \u043f\u043e\u043a\u0430\u0437\u0430\u043d \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043f\u043e \u0443\u0440\u043e\u043a\u0430\u043c. \u0414\u043b\u044f \u0438\u0437\u0443\u0447\u0435\u043d\u0438\u044f \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432, \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f \u0437\u0430\u0434\u0430\u043d\u0438\u0439 \u0438 \u0442\u0435\u0441\u0442\u043e\u0432 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e."
              : assigned
                ? "\u041a\u0443\u0440\u0441 \u0443\u0436\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d. \u0417\u0434\u0435\u0441\u044c \u043c\u043e\u0436\u043d\u043e \u043f\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b, \u0430 \u0443\u0440\u043e\u043a\u0438 \u0438 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u043e\u0442\u043a\u0440\u043e\u044e\u0442\u0441\u044f \u0432 \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435."
                : authenticated
                  ? "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u043a\u0443\u0440\u0441\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0434\u043b\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430. \u0421\u043e\u0434\u0435\u0440\u0436\u0438\u043c\u043e\u0435 \u0443\u0440\u043e\u043a\u043e\u0432, \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u0442\u0435\u0441\u0442\u044b \u043e\u0442\u043a\u0440\u043e\u044e\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438."
                  : "\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043c\u043e\u0436\u043d\u043e \u043f\u0440\u043e\u0441\u043c\u0430\u0442\u0440\u0438\u0432\u0430\u0442\u044c \u0431\u0435\u0437 \u0432\u0445\u043e\u0434\u0430. \u0421\u043e\u0434\u0435\u0440\u0436\u0438\u043c\u043e\u0435 \u0443\u0440\u043e\u043a\u043e\u0432 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u043d\u0430 \u043a\u0443\u0440\u0441."}
          </p>
        </div>

        <span
          className={
            guestPreview
              ? "rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100"
              : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
          }
        >
          {formatProgramCount(normalizedModules.length, [
            "\u043c\u043e\u0434\u0443\u043b\u044c",
            "\u043c\u043e\u0434\u0443\u043b\u044f",
            "\u043c\u043e\u0434\u0443\u043b\u0435\u0439",
          ])}
        </span>
      </div>

      {normalizedModules.length > 0 ? (
        <div className="mt-6 space-y-4">
          {normalizedModules.map(
            (module, moduleIndex) => {
              const lessons = Array.isArray(
                module?.lessons
              )
                ? module.lessons
                : [];

              return (
                <article
                  key={
                    module?.id ||
                    `guest-module-${moduleIndex}`
                  }
                  className={
                    guestPreview
                      ? "overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200"
                      : "overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200"
                  }
                >
                  <div
                    className={
                      guestPreview
                        ? "flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-blue-50/50 px-4 py-5 sm:px-5"
                        : "flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        {`\u041c\u043e\u0434\u0443\u043b\u044c ${moduleIndex + 1}`}
                      </div>

                      <h3 className="mt-1 text-xl font-semibold leading-7 text-slate-900 sm:text-2xl sm:leading-8">
                        {module?.title ||
                          `\u041c\u043e\u0434\u0443\u043b\u044c ${moduleIndex + 1}`}
                      </h3>
                    </div>

                    <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                      {formatProgramCount(lessons.length, [
                        "\u0443\u0440\u043e\u043a",
                        "\u0443\u0440\u043e\u043a\u0430",
                        "\u0443\u0440\u043e\u043a\u043e\u0432",
                      ])}
                    </span>
                  </div>

                  {lessons.length > 0 ? (
                    <div className="border-t border-slate-200 bg-white">
                      {lessons.map(
                        (lesson, lessonIndex) => {
                          const lessonPosition =
                            `${moduleIndex}:${lessonIndex}`;

                          const isCancelledCourseCompletedLesson =
                            cancelled &&
                            getLessonCompleted(lesson);

                          const isCancelledCourseIncompleteLesson =
                            cancelled &&
                            !isCancelledCourseCompletedLesson;

                          const isCompletedCourseLesson =
                            completed &&
                            getLessonCompleted(lesson);

                          const isCompletedCourseIncompleteLesson =
                            completed &&
                            !isCompletedCourseLesson;

                          const isActiveCompletedLesson =
                            active &&
                            getLessonCompleted(lesson);

                          const isActiveNextLesson =
                            active &&
                            !isActiveCompletedLesson &&
                            Boolean(firstIncompleteLessonPosition) &&
                            lessonPosition === firstIncompleteLessonPosition;

                          const isAssignedFirstLesson =
                            assigned &&
                            firstModuleWithLessonsIndex >= 0 &&
                            moduleIndex === firstModuleWithLessonsIndex &&
                            lessonIndex === 0;

                          return (
                          <div
                            key={
                              lesson?.id ||
                              `guest-lesson-${moduleIndex}-${lessonIndex}`
                            }
                            data-testid="course-detail-guest-locked-lesson"
                            className={
                              isCancelledCourseCompletedLesson
                                ? "flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 px-4 py-3.5 last:border-b-0 sm:px-5"
                                : isCancelledCourseIncompleteLesson
                                  ? "flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3.5 last:border-b-0 sm:px-5"
                                  : isCompletedCourseLesson
                                ? "flex items-center justify-between gap-4 border-b border-green-100 bg-green-50/60 px-4 py-3.5 last:border-b-0 sm:px-5"
                                : isCompletedCourseIncompleteLesson
                                  ? "flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 last:border-b-0 sm:px-5"
                                  : isActiveCompletedLesson
                                ? "flex items-center justify-between gap-4 border-b border-green-100 bg-green-50/60 px-4 py-3.5 last:border-b-0 sm:px-5"
                                : isActiveNextLesson
                                  ? "flex items-center justify-between gap-4 border-b border-blue-100 bg-blue-50/70 px-4 py-3.5 last:border-b-0 sm:px-5"
                                  : isAssignedFirstLesson
                                    ? "flex items-center justify-between gap-4 border-b border-blue-100 bg-blue-50/70 px-4 py-3.5 last:border-b-0 sm:px-5"
                                    : guestPreview
                                      ? "flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-4 py-5 last:border-b-0 sm:items-center sm:px-5"
                                      : "flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3.5 last:border-b-0 sm:px-5"
                            }
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                aria-hidden="true"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-600 ring-1 ring-slate-200"
                              >
                                {lessonIndex + 1}
                              </div>

                              <div className="min-w-0">
                                <div
                                  className={
                                    guestPreview
                                      ? "text-lg font-semibold leading-7 text-slate-900 sm:text-xl sm:leading-8"
                                      : "truncate text-lg font-semibold text-slate-900 sm:text-xl"
                                  }
                                >
                                  {lesson?.title ||
                                    `\u0423\u0440\u043e\u043a ${lessonIndex + 1}`}
                                </div>
                              </div>
                            </div>

                            <span
                              className={
                                isCancelledCourseCompletedLesson
                                  ? "hidden shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 sm:inline-flex"
                                  : isCancelledCourseIncompleteLesson
                                    ? "hidden shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 sm:inline-flex"
                                    : isCompletedCourseLesson
                                  ? "hidden shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200 sm:inline-flex"
                                  : isCompletedCourseIncompleteLesson
                                    ? "hidden shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 sm:inline-flex"
                                    : isActiveCompletedLesson
                                  ? "hidden shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200 sm:inline-flex"
                                  : isActiveNextLesson
                                    ? "hidden shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 sm:inline-flex"
                                    : isAssignedFirstLesson
                                      ? "hidden shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 sm:inline-flex"
                                      : guestPreview
                                        ? "hidden shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 sm:inline-flex"
                                        : "hidden shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 sm:inline-flex"
                              }
                            >
                              {isCancelledCourseCompletedLesson
                                ? "\u041f\u0440\u043e\u0439\u0434\u0435\u043d"
                                : isCancelledCourseIncompleteLesson
                                  ? "\u041d\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d"
                                  : isCompletedCourseLesson
                                ? "\u041f\u0440\u043e\u0439\u0434\u0435\u043d"
                                : isCompletedCourseIncompleteLesson
                                  ? "\u041d\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d"
                                  : isActiveCompletedLesson
                                ? "\u041f\u0440\u043e\u0439\u0434\u0435\u043d"
                                : isActiveNextLesson
                                  ? "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433"
                                  : isAssignedFirstLesson
                                    ? "\u041f\u0435\u0440\u0432\u044b\u0439 \u0448\u0430\u0433"
                                    : active || assigned
                                      ? "\u0412 \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435"
                                      : "\u0414\u043e\u0441\u0442\u0443\u043f \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438"}
                            </span>
                          </div>
                          );
                        }
                      )}
                    </div>
                  ) : null}
                </article>
              );
            }
          )}
        </div>
      ) : (
        <div
          data-testid="course-detail-guest-program-empty"
          className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 ring-1 ring-slate-200"
        >
          {"\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043f\u043e\u043a\u0430 \u043d\u0435 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u0430."}
        </div>
      )}
    </section>
  );
}


function CourseDetailGuestState({
  course,
  enrollLoading,
  onRegisterAndEnroll,
  onLogin,
  onCatalog,
}) {
  const structure = getCourseStructureStats(course);

  const formatGuestStructureCount = (count, labels) => {
    const value = Math.abs(Number(count) || 0);
    const mod100 = value % 100;
    const mod10 = value % 10;
    let label = labels[2];

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        label = labels[0];
      } else if (mod10 >= 2 && mod10 <= 4) {
        label = labels[1];
      }
    }

    return `${value} ${label}`;
  };

  return (
    <div
      data-testid="course-detail-guest-state"
      data-course-detail-state="guest"
      className="mx-auto max-w-7xl space-y-5"
    >
      <button
        type="button"
        data-testid="course-detail-guest-catalog-action"
        onClick={onCatalog}
        className="inline-flex min-h-11 items-center rounded-full px-1 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
      >
        {"\u2190 \u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432"}
      </button>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <main className="min-w-0 space-y-6">
          <section
            data-testid="course-detail-guest-hero"
            className="overflow-hidden rounded-shell bg-white shadow-sm ring-1 ring-slate-200"
          >
            <div className="bg-gradient-to-br from-blue-50 via-white to-slate-50 px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                  {"\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430"}
                </span>

                {course.direction ? (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {course.direction}
                  </span>
                ) : null}

                {course.hours ? (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {`${course.hours} \u0447\u0430\u0441\u043e\u0432`}
                  </span>
                ) : null}

                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {formatCourseDocument(course)}
                </span>
              </div>

              <h1 className="mt-7 max-w-4xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                {course.title}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {course.description ||
                  "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0443\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-700">
                <div className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-700 ring-1 ring-blue-100"
                  >
                    {"\u2261"}
                  </span>
                  <span>
                    {formatGuestStructureCount(structure.modulesCount, [
                      "\u043c\u043e\u0434\u0443\u043b\u044c",
                      "\u043c\u043e\u0434\u0443\u043b\u044f",
                      "\u043c\u043e\u0434\u0443\u043b\u0435\u0439",
                    ])}
                  </span>
                </div>

                <div className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-700 ring-1 ring-blue-100"
                  >
                    {"\u25b6"}
                  </span>
                  <span>
                    {formatGuestStructureCount(structure.lessonsCount, [
                      "\u0443\u0440\u043e\u043a",
                      "\u0443\u0440\u043e\u043a\u0430",
                      "\u0443\u0440\u043e\u043a\u043e\u0432",
                    ])}
                  </span>
                </div>

                <div className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-700 ring-1 ring-blue-100"
                  >
                    {"\u2713"}
                  </span>
                  <span>
                    {"\u041e\u043d\u043b\u0430\u0439\u043d-\u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
                  </span>
                </div>
              </div>

              <div className="mt-6 inline-flex max-w-full items-start gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 ring-1 ring-blue-100">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-700 ring-1 ring-blue-200"
                >
                  {"i"}
                </span>

                <span>
                  {"\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043c\u043e\u0436\u043d\u043e \u043f\u0440\u043e\u0441\u043c\u0430\u0442\u0440\u0438\u0432\u0430\u0442\u044c \u0431\u0435\u0437 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438."}
                </span>
              </div>
            </div>


          </section>

          <section
            data-testid="course-detail-guest-mobile-enrollment"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:hidden"
          >
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              {"\u0414\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0434\u043b\u044f \u0437\u0430\u043f\u0438\u0441\u0438"}
            </span>

            <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
              {"\u041d\u0430\u0447\u043d\u0438\u0442\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {"\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044c \u0438\u043b\u0438 \u0432\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f \u043d\u0430 \u043a\u0443\u0440\u0441 \u0438 \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043e\u0434\u0435\u0440\u0436\u0430\u043d\u0438\u0435 \u0443\u0440\u043e\u043a\u043e\u0432."}
            </p>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                data-testid="course-detail-guest-mobile-register-action"
                onClick={onRegisterAndEnroll}
                disabled={enrollLoading}
                className="min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enrollLoading
                  ? "\u0417\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u043c..."
                  : "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f \u0438 \u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f"}
              </button>

              <button
                type="button"
                data-testid="course-detail-guest-mobile-login-action"
                onClick={onLogin}
                className="min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
              >
                {"\u0412\u043e\u0439\u0442\u0438"}
              </button>
            </div>
          </section>

          <CourseDetailGuestProgram
            modules={course.modules}
            guestPreview
          />

          <section
            data-testid="course-detail-guest-info"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
          >
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {"\u041e\u0431 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438"}
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {"\u041a\u0430\u043a \u0443\u0441\u0442\u0440\u043e\u0435\u043d \u043a\u0443\u0440\u0441"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {"\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043c\u043e\u0436\u043d\u043e \u043f\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0431\u0435\u0437 \u0432\u0445\u043e\u0434\u0430. \u0421\u043e\u0434\u0435\u0440\u0436\u0430\u043d\u0438\u0435 \u0443\u0440\u043e\u043a\u043e\u0432 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u043d\u0430 \u043a\u0443\u0440\u0441."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-700 ring-1 ring-blue-100"
                >
                  {"\u25ce"}
                </div>

                <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {"\u0424\u043e\u0440\u043c\u0430\u0442"}
                </div>

                <div className="mt-1.5 text-base font-semibold text-slate-950">
                  {course.format || "\u0423\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f"}
                </div>
              </article>

              <article className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-700 ring-1 ring-blue-100"
                >
                  {"\u231a"}
                </div>

                <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {"\u041e\u0431\u044a\u0451\u043c"}
                </div>

                <div className="mt-1.5 text-base font-semibold text-slate-950">
                  {formatGuestStructureCount(course.hours, [
                    "\u0447\u0430\u0441",
                    "\u0447\u0430\u0441\u0430",
                    "\u0447\u0430\u0441\u043e\u0432",
                  ])}
                </div>
              </article>

              <article className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-700 ring-1 ring-blue-100"
                >
                  {"\u2713"}
                </div>

                <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
                </div>

                <div className="mt-1.5 text-base font-semibold text-slate-950">
                  {formatCourseDocument(course)}
                </div>
              </article>
            </div>
          </section>

          <section
            data-testid="course-detail-guest-bottom-cta"
            className="overflow-hidden rounded-shell bg-slate-950 shadow-sm"
          >
            <div className="px-5 py-7 sm:px-7 sm:py-8">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                    {"\u0413\u043e\u0442\u043e\u0432\u044b \u043d\u0430\u0447\u0430\u0442\u044c?"}
                  </div>

                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {"\u0417\u0430\u043f\u0438\u0448\u0438\u0442\u0435\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    {"\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0443\u0447\u0451\u0442\u043d\u0443\u044e \u0437\u0430\u043f\u0438\u0441\u044c \u0438\u043b\u0438 \u0432\u043e\u0439\u0434\u0438\u0442\u0435. \u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u043a\u0443\u0440\u0441 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u0432 \u0440\u0430\u0437\u0434\u0435\u043b \u00ab\u041c\u043e\u0451 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435\u00bb."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                  <button
                    type="button"
                    data-testid="course-detail-guest-bottom-register-action"
                    onClick={onRegisterAndEnroll}
                    disabled={enrollLoading}
                    className="min-h-12 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enrollLoading
                      ? "\u0417\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u043c..."
                      : "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f"}
                  </button>

                  <button
                    type="button"
                    data-testid="course-detail-guest-bottom-login-action"
                    onClick={onLogin}
                    className="min-h-12 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15"
                  >
                    {"\u0412\u043e\u0439\u0442\u0438"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside
            data-testid="course-detail-guest-sidebar"
            className="hidden lg:block lg:sticky lg:top-24 lg:self-start"
          >
            <div className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-7">
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                {"\u0414\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0434\u043b\u044f \u0437\u0430\u043f\u0438\u0441\u0438"}
              </span>

              <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                {"\u041d\u0430\u0447\u043d\u0438\u0442\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {"\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0443\u0447\u0451\u0442\u043d\u0443\u044e \u0437\u0430\u043f\u0438\u0441\u044c \u0438\u043b\u0438 \u0432\u043e\u0439\u0434\u0438\u0442\u0435. \u041f\u043e\u0441\u043b\u0435 \u044d\u0442\u043e\u0433\u043e \u043a\u0443\u0440\u0441 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u0432 \u0440\u0430\u0437\u0434\u0435\u043b \u00ab\u041c\u043e\u0451 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435\u00bb."}
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3.5">
                  <span className="text-sm text-slate-500">
                    {"\u041e\u0431\u044a\u0451\u043c"}
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    {formatGuestStructureCount(course.hours, [
                      "\u0447\u0430\u0441",
                      "\u0447\u0430\u0441\u0430",
                      "\u0447\u0430\u0441\u043e\u0432",
                    ])}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3.5">
                  <span className="text-sm text-slate-500">
                    {"\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430"}
                  </span>

                  <span className="text-right text-sm font-semibold text-slate-900">
                    {`${formatGuestStructureCount(
                      structure.modulesCount,
                      [
                        "\u043c\u043e\u0434\u0443\u043b\u044c",
                        "\u043c\u043e\u0434\u0443\u043b\u044f",
                        "\u043c\u043e\u0434\u0443\u043b\u0435\u0439",
                      ],
                    )} \u00b7 ${formatGuestStructureCount(
                      structure.lessonsCount,
                      [
                        "\u0443\u0440\u043e\u043a",
                        "\u0443\u0440\u043e\u043a\u0430",
                        "\u0443\u0440\u043e\u043a\u043e\u0432",
                      ],
                    )}`}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <span className="text-sm text-slate-500">
                    {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
                  </span>

                  <span className="text-right text-sm font-semibold text-slate-900">
                    {formatCourseDocument(course)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                data-testid="course-detail-guest-register-action"
                onClick={onRegisterAndEnroll}
                disabled={enrollLoading}
                className="mt-6 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enrollLoading
                  ? "\u0417\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u043c..."
                  : "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f \u0438 \u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f"}
              </button>

              <button
                type="button"
                data-testid="course-detail-guest-login-action"
                onClick={onLogin}
                className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
              >
                {"\u0412\u043e\u0439\u0442\u0438"}
              </button>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {"\u041a\u0430\u043a \u043d\u0430\u0447\u0430\u0442\u044c"}
                </div>

                <ol className="mt-4 space-y-4">
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                      1
                    </span>
                    <div className="pt-0.5 text-sm leading-5 text-slate-700">
                      {"\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044c \u0438\u043b\u0438 \u0432\u043e\u0439\u0434\u0438\u0442\u0435"}
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                      2
                    </span>
                    <div className="pt-0.5 text-sm leading-5 text-slate-700">
                      {"\u041a\u0443\u0440\u0441 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0432 \u0440\u0430\u0437\u0434\u0435\u043b\u0435 \u00ab\u041c\u043e\u0451 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435\u00bb"}
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                      3
                    </span>
                    <div className="pt-0.5 text-sm leading-5 text-slate-700">
                      {"\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043a\u0443\u0440\u0441 \u0438 \u043f\u0440\u0438\u0441\u0442\u0443\u043f\u0430\u0439\u0442\u0435 \u043a \u0443\u0440\u043e\u043a\u0430\u043c"}
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </aside>
      </div>
    </div>
  );
}


function CourseDetailAuthenticatedUnenrolledState({
  course,
  enrollLoading,
  enrollError,
  enrollSuccess,
  onEnroll,
  onAccount,
  onCatalog,
}) {
  const structure = getCourseStructureStats(course);

  const formatAuthenticatedStructureCount = (count, labels) => {
    const value = Math.abs(Number(count) || 0);
    const mod100 = value % 100;
    const mod10 = value % 10;
    let label = labels[2];

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        label = labels[0];
      } else if (mod10 >= 2 && mod10 <= 4) {
        label = labels[1];
      }
    }

    return `${value} ${label}`;
  };

  const formatStructureCount = (count, labels) => {
    const value = Math.abs(Number(count) || 0);
    const mod100 = value % 100;
    const mod10 = value % 10;
    let label = labels[2];

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        label = labels[0];
      } else if (mod10 >= 2 && mod10 <= 4) {
        label = labels[1];
      }
    }

    return `${value} ${label}`;
  };

  const modulesLabel = formatStructureCount(
    structure.modulesCount,
    [
      "\u043c\u043e\u0434\u0443\u043b\u044c",
      "\u043c\u043e\u0434\u0443\u043b\u044f",
      "\u043c\u043e\u0434\u0443\u043b\u0435\u0439",
    ]
  );

  const lessonsLabel = formatStructureCount(
    structure.lessonsCount,
    [
      "\u0443\u0440\u043e\u043a",
      "\u0443\u0440\u043e\u043a\u0430",
      "\u0443\u0440\u043e\u043a\u043e\u0432",
    ]
  );

  return (
    <div
      data-testid="course-detail-authenticated-unenrolled-state"
      data-course-detail-state="authenticated_unenrolled"
      className="mx-auto max-w-7xl space-y-5"
    >
      <button
        type="button"
        data-testid="course-detail-authenticated-unenrolled-catalog-action"
        onClick={onCatalog}
        className="inline-flex min-h-11 items-center rounded-full px-1 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
      >
        {"\u2190 \u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432"}
      </button>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <main className="min-w-0 space-y-6">
          <section
            data-testid="course-detail-authenticated-unenrolled-hero"
            className="overflow-hidden rounded-shell bg-white shadow-sm ring-1 ring-slate-200"
          >
            <div className="bg-gradient-to-br from-blue-50 via-white to-slate-50 px-5 py-7 sm:px-8 sm:py-9">
              {course.direction ? (
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {course.direction}
                  </span>
                </div>
              ) : null}

              <h1 className="mt-7 max-w-4xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                {course.title}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {course.description ||
                  "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0443\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f."}
              </p>

              <div
                data-testid="course-detail-authenticated-unenrolled-facts"
                className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0424\u043e\u0440\u043c\u0430\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-900">
                    {course.format || "\u2014"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-900">
                    {`${modulesLabel} \u00b7 ${lessonsLabel}`}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041e\u0431\u044a\u0451\u043c"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-900">
                    {course.hours
                      ? `${course.hours} \u0447\u0430\u0441\u043e\u0432`
                      : "\u2014"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-900">
                    {formatCourseDocument(course)}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex max-w-3xl items-start gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 ring-1 ring-blue-100">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-700 ring-1 ring-blue-200"
                >
                  {"i"}
                </span>

                <span>
                  {"\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u043a\u0443\u0440\u0441\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0434\u043b\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430. \u041f\u043e\u043b\u043d\u043e\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u043d\u0430 \u043a\u0443\u0440\u0441."}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {"\u041f\u043e\u0441\u043b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u043a\u0443\u0440\u0441 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0432 \u0432\u0430\u0448\u0435\u043c \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435."}
              </p>
            </div>
          </section>

          <section
            data-testid="course-detail-authenticated-unenrolled-mobile-status"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:hidden"
          >


            {enrollError ? (
              <div
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200"
              >
                {enrollError}
              </div>
            ) : null}

            {enrollSuccess ? (
              <div
                aria-live="polite"
                className="mt-4 rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-800 ring-1 ring-green-200"
              >
                {enrollSuccess}
              </div>
            ) : null}

            <button
              type="button"
              data-testid="course-detail-authenticated-unenrolled-mobile-enroll-action"
              onClick={onEnroll}
              disabled={enrollLoading}
              className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enrollLoading
                ? "\u0417\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u043c..."
                : "\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f \u043d\u0430 \u043a\u0443\u0440\u0441"}
            </button>

            <button
              type="button"
              data-testid="course-detail-authenticated-unenrolled-mobile-account-action"
              onClick={onAccount}
              className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              {"\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
            </button>
          </section>

          <div
            data-testid="course-detail-authenticated-unenrolled-program"
          >
            <CourseDetailGuestProgram
              modules={course.modules}
              authenticated
            />
          </div>

                    <section
            data-testid="course-detail-authenticated-unenrolled-info"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
          >
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {"\u041e\u0431 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438"}
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {"\u041a\u0430\u043a \u0443\u0441\u0442\u0440\u043e\u0435\u043d \u043a\u0443\u0440\u0441"}
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {"\u0412\u044b \u0443\u0436\u0435 \u0432\u043e\u0448\u043b\u0438 \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0443 \u0438 \u043c\u043e\u0436\u0435\u0442\u0435 \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b. \u0421\u043e\u0434\u0435\u0440\u0436\u0430\u043d\u0438\u0435 \u0443\u0440\u043e\u043a\u043e\u0432, \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u0442\u0435\u0441\u0442\u044b \u043e\u0442\u043a\u0440\u043e\u044e\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u043d\u0430 \u043a\u0443\u0440\u0441."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-700 ring-1 ring-blue-100"
                >
                  {"\u25ce"}
                </div>

                <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {"\u0424\u043e\u0440\u043c\u0430\u0442"}
                </div>

                <div className="mt-1.5 text-base font-semibold text-slate-950">
                  {course.format || "\u0423\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f"}
                </div>
              </article>

              <article className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-700 ring-1 ring-blue-100"
                >
                  {"\u231a"}
                </div>

                <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {"\u041e\u0431\u044a\u0451\u043c"}
                </div>

                <div className="mt-1.5 text-base font-semibold text-slate-950">
                  {formatAuthenticatedStructureCount(course.hours, [
                    "\u0447\u0430\u0441",
                    "\u0447\u0430\u0441\u0430",
                    "\u0447\u0430\u0441\u043e\u0432",
                  ])}
                </div>
              </article>

              <article className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-700 ring-1 ring-blue-100"
                >
                  {"\u2713"}
                </div>

                <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
                </div>

                <div className="mt-1.5 text-base font-semibold text-slate-950">
                  {formatCourseDocument(course)}
                </div>
              </article>
            </div>
          </section>

<section
            data-testid="course-detail-authenticated-unenrolled-bottom-cta"
            className="overflow-hidden rounded-shell bg-gradient-to-r from-slate-950 via-blue-950 to-blue-900 p-6 text-white shadow-sm sm:p-8"
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                  {"\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433"}
                </div>

                <h2 className="mt-2 text-2xl font-bold">
                  {"\u0413\u043e\u0442\u043e\u0432\u044b \u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f \u043d\u0430 \u043a\u0443\u0440\u0441?"}
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  {"\u041f\u043e\u0441\u043b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u043a\u0443\u0440\u0441 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435, \u0430 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0431\u0443\u0434\u0435\u0442 \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442\u044c \u0432 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u043c \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435."}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:flex-col">
                <button
                  type="button"
                  data-testid="course-detail-authenticated-unenrolled-bottom-enroll-action"
                  onClick={onEnroll}
                  disabled={enrollLoading}
                  className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enrollLoading
                    ? "\u0417\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u043c..."
                    : "\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f \u043d\u0430 \u043a\u0443\u0440\u0441"}
                </button>

                <button
                  type="button"
                  data-testid="course-detail-authenticated-unenrolled-bottom-account-action"
                  onClick={onAccount}
                  className="min-h-12 rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/15"
                >
                  {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
                </button>
              </div>
            </div>
          </section>
        </main>

        <aside
          data-testid="course-detail-authenticated-unenrolled-sidebar"
          className="hidden lg:block lg:sticky lg:top-24 lg:self-start"
        >
          <div className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200">


            {enrollError ? (
              <div
                data-testid="course-detail-authenticated-unenrolled-error"
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200"
              >
                {enrollError}
              </div>
            ) : null}

            {enrollSuccess ? (
              <div
                data-testid="course-detail-authenticated-unenrolled-success"
                aria-live="polite"
                className="mt-4 rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-800 ring-1 ring-green-200"
              >
                {enrollSuccess}
              </div>
            ) : null}

            <button
              type="button"
              data-testid="course-detail-authenticated-unenrolled-enroll-action"
              onClick={onEnroll}
              disabled={enrollLoading}
              className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enrollLoading
                ? "\u0417\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u043c..."
                : "\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f \u043d\u0430 \u043a\u0443\u0440\u0441"}
            </button>

            <button
              type="button"
              data-testid="course-detail-authenticated-unenrolled-account-action"
              onClick={onAccount}
              className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              {"\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
            </button>

            <div
              data-testid="course-detail-authenticated-unenrolled-steps"
              className="mt-6 border-t border-slate-100 pt-6"
            >
              <h3 className="text-base font-bold text-slate-900">
                {"\u041a\u0430\u043a \u043d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
              </h3>

              <ol className="mt-4 space-y-4">
                {[
                  [
                    "1",
                    "\u0417\u0430\u043f\u0438\u0448\u0438\u0442\u0435\u0441\u044c \u043d\u0430 \u043a\u0443\u0440\u0441",
                    "\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043a\u043d\u043e\u043f\u043a\u0443 \u0437\u0430\u043f\u0438\u0441\u0438 \u043d\u0430 \u044d\u0442\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435.",
                  ],
                  [
                    "2",
                    "\u041a\u0443\u0440\u0441 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435",
                    "\u0417\u0430\u043f\u0438\u0441\u044c \u0438 \u0441\u0442\u0430\u0442\u0443\u0441 \u0431\u0443\u0434\u0443\u0442 \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u044b \u0432 \u0440\u0430\u0437\u0434\u0435\u043b\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f.",
                  ],
                  [
                    "3",
                    "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e",
                    "\u0423\u0440\u043e\u043a\u0438, \u0437\u0430\u0434\u0430\u043d\u0438\u044f, \u0442\u0435\u0441\u0442\u044b \u0438 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0431\u0443\u0434\u0443\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435.",
                  ],
                ].map(([number, title, description]) => (
                  <li
                    key={number}
                    className="flex gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {number}
                    </span>

                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {title}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}


function CourseDetailAssignedState({
  course,
  enrollment,
  onStart,
  startLoading,
  startError,
  onAccount,
  onCatalog,
}) {
  const progressPercent = normalizeProgressPercent(
    enrollment?.progress_percent ??
      course?.learner_progress?.progress_percent ??
      0
  );

  const structure = getCourseStructureStats(course);

  const formatAssignedStructureCount = (count, labels) => {
    const value = Math.abs(Number(count) || 0);
    const mod100 = value % 100;
    const mod10 = value % 10;
    let label = labels[2];

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        label = labels[0];
      } else if (mod10 >= 2 && mod10 <= 4) {
        label = labels[1];
      }
    }

    return `${value} ${label}`;
  };

  const programSummary = `${formatAssignedStructureCount(
    structure.modulesCount,
    [
      "\u043c\u043e\u0434\u0443\u043b\u044c",
      "\u043c\u043e\u0434\u0443\u043b\u044f",
      "\u043c\u043e\u0434\u0443\u043b\u0435\u0439",
    ],
  )} \u00b7 ${formatAssignedStructureCount(
    structure.lessonsCount,
    [
      "\u0443\u0440\u043e\u043a",
      "\u0443\u0440\u043e\u043a\u0430",
      "\u0443\u0440\u043e\u043a\u043e\u0432",
    ],
  )}`;

  return (
    <div
      data-testid="course-detail-assigned-state"
      data-course-detail-state="assigned"
      className="mx-auto max-w-7xl space-y-5"
    >
      <button
        type="button"
        data-testid="course-detail-assigned-catalog-action"
        onClick={onCatalog}
        className="inline-flex min-h-11 items-center rounded-full px-1 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
      >
        {"\u2190 \u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432"}
      </button>

      {startError ? (
        <div
          data-testid="course-detail-assigned-start-error"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {startError}
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <main className="min-w-0 space-y-6">
          <section
            data-testid="course-detail-assigned-hero"
            className="overflow-hidden rounded-shell bg-white shadow-sm ring-1 ring-slate-200"
          >
            <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  {"\u2713 \u041a\u0443\u0440\u0441 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d"}
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                  {"\u0413\u043e\u0442\u043e\u0432 \u043a \u043d\u0430\u0447\u0430\u043b\u0443"}
                </span>

                {course.direction ? (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {course.direction}
                  </span>
                ) : null}
              </div>

              <div className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                {"\u0412\u0430\u0448\u0430 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"}
              </div>

              <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                {course.title}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {course.description ||
                  "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0443\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f."}
              </p>

              <div
                data-testid="course-detail-assigned-facts"
                className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0424\u043e\u0440\u043c\u0430\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {course.format || "\u0434\u0438\u0441\u0442\u0430\u043d\u0446\u0438\u043e\u043d\u043d\u043e"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {programSummary}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041e\u0431\u044a\u0451\u043c"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {course.hours
                      ? formatAssignedStructureCount(course.hours, [
                          "\u0447\u0430\u0441",
                          "\u0447\u0430\u0441\u0430",
                          "\u0447\u0430\u0441\u043e\u0432",
                        ])
                      : "\u2014"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {formatCourseDocument(course)}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-emerald-50/80 px-4 py-3.5 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-200">
                {"\u041a\u0443\u0440\u0441 \u0443\u0436\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d. \u041d\u0430 \u044d\u0442\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435 \u043c\u043e\u0436\u043d\u043e \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443, \u0430 \u0443\u0440\u043e\u043a\u0438, \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u0442\u0435\u0441\u0442\u044b \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u0432 \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435."}
              </div>

              {enrollment?.organization_name ? (
                <p className="mt-4 text-sm text-slate-600">
                  {"\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u043b\u0430: "}
                  <span className="font-semibold text-slate-800">
                    {enrollment.organization_name}
                  </span>
                  {enrollment.learning_group_name
                    ? ` \u00b7 ${enrollment.learning_group_name}`
                    : ""}
                </p>
              ) : null}
            </div>
          </section>

          <section
            data-testid="course-detail-assigned-mobile-status"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:hidden"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              {"\u0412\u0430\u0448 \u0441\u0442\u0430\u0442\u0443\u0441 \u043f\u043e \u043a\u0443\u0440\u0441\u0443"}
            </div>

            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
              <div className="font-semibold text-emerald-900">
                {"\u2713 \u041a\u0443\u0440\u0441 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d"}
              </div>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                {"\u041c\u043e\u0436\u043d\u043e \u043f\u0435\u0440\u0435\u0445\u043e\u0434\u0438\u0442\u044c \u0432 \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e."}
              </p>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-700">
                  {"\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441"}
                </span>

                <span className="text-sm font-bold text-slate-950">
                  {`${progressPercent}%`}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              data-testid="course-detail-assigned-mobile-start-action"
              onClick={onStart}
              disabled={startLoading}
              className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {startLoading ? "\u041d\u0430\u0447\u0438\u043d\u0430\u0435\u043c..." : "\u041d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
            </button>

            <button
              type="button"
              data-testid="course-detail-assigned-mobile-account-action"
              onClick={onAccount}
              className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              {"\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
            </button>
          </section>

          <div data-testid="course-detail-assigned-program">
            <CourseDetailGuestProgram
              modules={course.modules}
              authenticated
              assigned
            />
          </div>

          <section
            data-testid="course-detail-assigned-info"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
          >
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {"\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433"}
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {"\u041a\u0430\u043a \u043d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {"\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u043a\u0443\u0440\u0441\u0430 \u043e\u0441\u0442\u0430\u0451\u0442\u0441\u044f \u043e\u0431\u0437\u043e\u0440\u043e\u043c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b. \u0421\u0430\u043c\u043e \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442 \u0432 \u0432\u0430\u0448\u0435\u043c \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                [
                  "1",
                  "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e",
                  "\u0422\u0430\u043c \u043d\u0430\u0445\u043e\u0434\u044f\u0442\u0441\u044f \u0443\u0440\u043e\u043a\u0438, \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u0442\u0435\u0441\u0442\u044b \u043a\u0443\u0440\u0441\u0430.",
                ],
                [
                  "2",
                  "\u041d\u0430\u0447\u043d\u0438\u0442\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435",
                  "\u0417\u0430\u043f\u0443\u0441\u043a \u0438 \u0440\u0430\u0431\u043e\u0442\u0430 \u0441 \u043a\u0443\u0440\u0441\u043e\u043c \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u044e\u0442\u0441\u044f \u0432 \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435.",
                ],
                [
                  "3",
                  "\u0421\u043b\u0435\u0434\u0438\u0442\u0435 \u0437\u0430 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u043e\u043c",
                  "\u0421\u0442\u0430\u0442\u0443\u0441 \u0438 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u044e\u0442\u0441\u044f \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435.",
                ],
              ].map(([number, title, description]) => (
                <article
                  key={number}
                  className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {number}
                  </div>

                  <h3 className="mt-4 font-bold text-slate-950">
                    {title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            data-testid="course-detail-assigned-bottom-cta"
            className="overflow-hidden rounded-shell bg-slate-950 shadow-sm"
          >
            <div className="px-5 py-7 sm:px-7 sm:py-8">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    {"\u041a\u0443\u0440\u0441 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d"}
                  </div>

                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {"\u041c\u043e\u0436\u043d\u043e \u043f\u0435\u0440\u0435\u0445\u043e\u0434\u0438\u0442\u044c \u043a \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044e"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    {"\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e. \u0418\u043c\u0435\u043d\u043d\u043e \u0442\u0430\u043c \u043f\u0440\u043e\u0445\u043e\u0434\u044f\u0442 \u0443\u0440\u043e\u043a\u0438, \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u0442\u0435\u0441\u0442\u044b."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                  <button
                    type="button"
                    data-testid="course-detail-assigned-bottom-start-action"
                    onClick={onStart}
                    disabled={startLoading}
                    className="min-h-12 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    {startLoading ? "\u041d\u0430\u0447\u0438\u043d\u0430\u0435\u043c..." : "\u041d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
                  </button>

                  <button
                    type="button"
                    data-testid="course-detail-assigned-bottom-account-action"
                    onClick={onAccount}
                    className="min-h-12 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15"
                  >
                    {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside
          data-testid="course-detail-assigned-sidebar"
          className="hidden rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:sticky lg:top-24 lg:block"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            {"\u0412\u0430\u0448 \u0441\u0442\u0430\u0442\u0443\u0441 \u043f\u043e \u043a\u0443\u0440\u0441\u0443"}
          </div>

          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <div className="font-bold text-emerald-900">
              {"\u2713 \u041a\u0443\u0440\u0441 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d"}
            </div>

            <p className="mt-1.5 text-sm leading-6 text-emerald-800">
              {"\u0417\u0430\u043f\u0438\u0441\u044c \u0443\u0436\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0430. \u041c\u043e\u0436\u043d\u043e \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0442\u044c \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e."}
            </p>
          </div>

          <div
            data-testid="course-detail-assigned-progress"
            className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-700">
                {"\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"}
              </span>

              <span className="text-sm font-bold text-slate-950">
                {`${progressPercent}%`}
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width]"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>

          {enrollment?.organization_name ? (
            <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {"\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435"}
              </div>

              <div className="mt-2 text-sm font-semibold text-slate-900">
                {enrollment.organization_name}
              </div>

              {enrollment.learning_group_name ? (
                <div className="mt-1 text-sm text-slate-600">
                  {enrollment.learning_group_name}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            data-testid="course-detail-assigned-start-action"
            onClick={onStart}
            disabled={startLoading}
            className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {startLoading ? "\u041d\u0430\u0447\u0438\u043d\u0430\u0435\u043c..." : "\u041d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
          </button>

          <button
            type="button"
            data-testid="course-detail-assigned-account-action"
            onClick={onAccount}
            className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
          >
            {"\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
          </button>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-950">
              {"\u0427\u0442\u043e \u0434\u0430\u043b\u044c\u0448\u0435"}
            </h3>

            <div className="mt-4 space-y-4">
              {[
                [
                  "1",
                  "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043a\u0443\u0440\u0441",
                  "\u041f\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432 \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e.",
                ],
                [
                  "2",
                  "\u041d\u0430\u0447\u043d\u0438\u0442\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435",
                  "\u0417\u0430\u043f\u0443\u0441\u043a \u043a\u0443\u0440\u0441\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f \u0442\u0430\u043c.",
                ],
                [
                  "3",
                  "\u041f\u0440\u043e\u0445\u043e\u0434\u0438\u0442\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443",
                  "\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0431\u0443\u0434\u0435\u0442 \u043e\u0431\u043d\u043e\u0432\u043b\u044f\u0442\u044c\u0441\u044f \u043f\u043e \u043c\u0435\u0440\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f.",
                ],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="flex gap-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {number}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {title}
                    </div>

                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}


function getCourseDetailOverviewLessons(course) {
  const modules = Array.isArray(course?.modules)
    ? course.modules
    : [];

  return modules.flatMap((module) =>
    (Array.isArray(module?.lessons)
      ? module.lessons
      : []
    ).map((lesson) => ({
      ...lesson,
      module_title: module?.title || "",
    }))
  );
}


function CourseDetailActiveState({
  course,
  enrollment,
  onContinue,
  onAccount,
  onCatalog,
}) {
  const lessons = getCourseDetailOverviewLessons(
    course
  );

  const nextLesson =
    lessons.find(
      (lesson) => !getLessonCompleted(lesson)
    ) || null;

  const progressPercent = normalizeProgressPercent(
    enrollment?.progress_percent ??
      course?.learner_progress?.progress_percent ??
      0
  );

  const lessonsTotal = Math.max(
    0,
    Number(
      enrollment?.lessons_total ??
        course?.learner_progress?.lessons_total ??
        lessons.length
    ) || 0
  );

  const lessonsCompleted = Math.max(
    0,
    Number(
      enrollment?.lessons_completed ??
        course?.learner_progress?.lessons_completed ??
        lessons.filter(getLessonCompleted).length
    ) || 0
  );

  const structure = getCourseStructureStats(course);

  const formatActiveStructureCount = (count, labels) => {
    const value = Math.abs(Number(count) || 0);
    const mod100 = value % 100;
    const mod10 = value % 10;
    let label = labels[2];

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        label = labels[0];
      } else if (mod10 >= 2 && mod10 <= 4) {
        label = labels[1];
      }
    }

    return `${value} ${label}`;
  };

  const programSummary = `${formatActiveStructureCount(
    structure.modulesCount,
    [
      "\u043c\u043e\u0434\u0443\u043b\u044c",
      "\u043c\u043e\u0434\u0443\u043b\u044f",
      "\u043c\u043e\u0434\u0443\u043b\u0435\u0439",
    ],
  )} \u00b7 ${formatActiveStructureCount(
    structure.lessonsCount,
    [
      "\u0443\u0440\u043e\u043a",
      "\u0443\u0440\u043e\u043a\u0430",
      "\u0443\u0440\u043e\u043a\u043e\u0432",
    ],
  )}`;

  return (
    <div
      data-testid="course-detail-active-state"
      data-course-detail-state="active"
      className="mx-auto max-w-7xl space-y-5"
    >
      <button
        type="button"
        data-testid="course-detail-active-catalog-action"
        onClick={onCatalog}
        className="inline-flex min-h-11 items-center rounded-full px-1 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
      >
        {"\u2190 \u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432"}
      </button>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <main className="min-w-0 space-y-6">
          <section
            data-testid="course-detail-active-hero"
            className="overflow-hidden rounded-shell bg-white shadow-sm ring-1 ring-slate-200"
          >
            <div className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
                  {"\u25b6 \u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0438\u0434\u0451\u0442"}
                </span>

                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {`${progressPercent}% \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u043e`}
                </span>

                {course.direction ? (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {course.direction}
                  </span>
                ) : null}
              </div>

              <div className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {"\u0412\u0430\u0448\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
              </div>

              <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                {course.title}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {course.description ||
                  "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0443\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f."}
              </p>

              <div
                data-testid="course-detail-active-facts"
                className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0424\u043e\u0440\u043c\u0430\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {course.format || "\u0434\u0438\u0441\u0442\u0430\u043d\u0446\u0438\u043e\u043d\u043d\u043e"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {programSummary}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-blue-700">
                    {`${progressPercent}%`}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {formatCourseDocument(course)}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-blue-50/80 px-4 py-3.5 ring-1 ring-blue-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-blue-950">
                    {"\u041f\u0440\u043e\u0439\u0434\u0435\u043d\u043e \u0443\u0440\u043e\u043a\u043e\u0432"}
                  </div>

                  <div className="text-sm font-bold text-blue-700">
                    {`${lessonsCompleted} \u0438\u0437 ${lessonsTotal}`}
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-[width]"
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            data-testid="course-detail-active-mobile-status"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:hidden"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              {"\u0412\u0430\u0448 \u0441\u0442\u0430\u0442\u0443\u0441 \u043f\u043e \u043a\u0443\u0440\u0441\u0443"}
            </div>

            <div className="mt-4 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200">
              <div className="font-bold text-blue-950">
                {"\u25b6 \u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0438\u0434\u0451\u0442"}
              </div>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                {`${lessonsCompleted} \u0438\u0437 ${lessonsTotal} \u0443\u0440\u043e\u043a\u043e\u0432 \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u043e.`}
              </p>
            </div>

            <div
              data-testid="course-detail-active-progress-mobile"
              className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-700">
                  {"\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441"}
                </span>

                <span className="text-sm font-bold text-blue-700">
                  {`${progressPercent}%`}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              data-testid="course-detail-active-mobile-continue-action"
              onClick={onContinue}
              className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {"\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
            </button>

            <button
              type="button"
              data-testid="course-detail-active-mobile-account-action"
              onClick={onAccount}
              className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              {"\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
            </button>
          </section>

          <section
            data-testid="course-detail-active-next-step"
            className="rounded-shell bg-blue-50 p-5 ring-1 ring-blue-200 sm:p-6"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              {"\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433"}
            </div>

            {nextLesson ? (
              <>
                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  {nextLesson.title ||
                    "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0443\u0440\u043e\u043a"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {nextLesson.module_title
                    ? `\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u043d\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u044b\u0439 \u0443\u0440\u043e\u043a \u00b7 ${nextLesson.module_title}`
                    : "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u043d\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u044b\u0439 \u0443\u0440\u043e\u043a \u043f\u043e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0435."}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  {"\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {"\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u0443 \u0441 \u043a\u0443\u0440\u0441\u043e\u043c."}
                </p>
              </>
            )}

            <button
              type="button"
              data-testid="course-detail-active-next-step-action"
              onClick={onContinue}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {"\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0432 \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435"}
            </button>
          </section>

          <div data-testid="course-detail-active-program">
            <CourseDetailGuestProgram
              modules={course.modules}
              authenticated
              active
            />
          </div>

          <section
            data-testid="course-detail-active-info"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
          >
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {"\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0438\u0434\u0451\u0442"}
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {"\u041a\u0430\u043a \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0442\u044c \u043a\u0443\u0440\u0441"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {"\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u043a\u0443\u0440\u0441\u0430 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u0438 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441. \u0420\u0430\u0431\u043e\u0442\u0430 \u0441 \u0443\u0440\u043e\u043a\u0430\u043c\u0438, \u0437\u0430\u0434\u0430\u043d\u0438\u044f\u043c\u0438 \u0438 \u0442\u0435\u0441\u0442\u0430\u043c\u0438 \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442 \u0432 \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                [
                  "1",
                  "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0439\u0442\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435",
                  "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e \u0438 \u0432\u0435\u0440\u043d\u0438\u0442\u0435\u0441\u044c \u043a \u043a\u0443\u0440\u0441\u0443.",
                ],
                [
                  "2",
                  "\u041f\u0440\u043e\u0445\u043e\u0434\u0438\u0442\u0435 \u0443\u0440\u043e\u043a\u0438",
                  "\u0412\u044b\u043f\u043e\u043b\u043d\u044f\u0439\u0442\u0435 \u0443\u0440\u043e\u043a\u0438, \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u0442\u0435\u0441\u0442\u044b \u0432 \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435.",
                ],
                [
                  "3",
                  "\u0421\u043b\u0435\u0434\u0438\u0442\u0435 \u0437\u0430 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u043e\u043c",
                  "\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0438 \u0441\u0442\u0430\u0442\u0443\u0441 \u043a\u0443\u0440\u0441\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u044f\u044e\u0442\u0441\u044f \u043f\u043e \u043c\u0435\u0440\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f.",
                ],
              ].map(([number, title, description]) => (
                <article
                  key={number}
                  className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {number}
                  </div>

                  <h3 className="mt-4 font-bold text-slate-950">
                    {title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            data-testid="course-detail-active-bottom-cta"
            className="overflow-hidden rounded-shell bg-slate-950 shadow-sm"
          >
            <div className="px-5 py-7 sm:px-7 sm:py-8">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                    {"\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0438\u0434\u0451\u0442"}
                  </div>

                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {"\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u0435 \u0441 \u0442\u043e\u0433\u043e \u043c\u0435\u0441\u0442\u0430, \u0433\u0434\u0435 \u043e\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u043b\u0438\u0441\u044c"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    {nextLesson?.title
                      ? `\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433: ${nextLesson.title}`
                      : "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0443\u0447\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043a\u0443\u0440\u0441."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                  <button
                    type="button"
                    data-testid="course-detail-active-bottom-continue-action"
                    onClick={onContinue}
                    className="min-h-12 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    {"\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
                  </button>

                  <button
                    type="button"
                    data-testid="course-detail-active-bottom-account-action"
                    onClick={onAccount}
                    className="min-h-12 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15"
                  >
                    {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside
          data-testid="course-detail-active-sidebar"
          className="hidden rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:sticky lg:top-24 lg:block"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            {"\u0412\u0430\u0448 \u0441\u0442\u0430\u0442\u0443\u0441 \u043f\u043e \u043a\u0443\u0440\u0441\u0443"}
          </div>

          <div className="mt-5 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200">
            <div className="font-bold text-blue-950">
              {"\u25b6 \u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0438\u0434\u0451\u0442"}
            </div>

            <p className="mt-1.5 text-sm leading-6 text-blue-800">
              {"\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f \u0432 \u0432\u0430\u0448\u0435\u043c \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435."}
            </p>
          </div>

          <div
            data-testid="course-detail-active-progress"
            className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-700">
                {"\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"}
              </span>

              <span className="text-sm font-bold text-blue-700">
                {`${progressPercent}%`}
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-[width]"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>

            <div className="mt-3 text-xs font-medium text-slate-500">
              {`${lessonsCompleted} \u0438\u0437 ${lessonsTotal} \u0443\u0440\u043e\u043a\u043e\u0432`}
            </div>
          </div>

          {nextLesson ? (
            <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {"\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0443\u0440\u043e\u043a"}
              </div>

              <div className="mt-2 text-sm font-semibold leading-6 text-slate-950">
                {nextLesson.title}
              </div>
            </div>
          ) : null}

          {enrollment?.started_at ? (
            <div className="mt-4 text-xs leading-5 text-slate-500">
              {`\u041d\u0430\u0447\u0430\u0442\u043e: ${formatDateTime(enrollment.started_at)}`}
            </div>
          ) : null}

          <button
            type="button"
            data-testid="course-detail-active-continue-action"
            onClick={onContinue}
            className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {"\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435"}
          </button>

          <button
            type="button"
            data-testid="course-detail-active-account-action"
            onClick={onAccount}
            className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
          >
            {"\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
          </button>

          <p className="mt-5 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">
            {"\u0423\u0440\u043e\u043a\u0438, \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u0442\u0435\u0441\u0442\u044b \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u0432 \u0443\u0447\u0435\u0431\u043d\u043e\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435."}
          </p>
        </aside>
      </div>
    </div>
  );
}



function CourseDetailCompletedState({
  course,
  enrollment,
  accountDocuments = [],
  documentsLoading = false,
  documentsLoadError = "",
  downloadError = "",
  documentDownloadLoadingId = "",
  onDownloadDocument,
  onDocuments,
  onAccount,
  onCatalog,
}) {
  const lessons = getCourseDetailOverviewLessons(
    course
  );

  const lessonsTotal = Math.max(
    0,
    Number(
      enrollment?.lessons_total ??
        course?.learner_progress?.lessons_total ??
        lessons.length
    ) || 0
  );

  const lessonsCompleted = Math.max(
    0,
    Number(
      enrollment?.lessons_completed ??
        course?.learner_progress?.lessons_completed ??
        lessons.filter(getLessonCompleted).length
    ) || 0
  );

  const requiredLessonsTotal = Math.max(
    0,
    Number(
      enrollment?.required_lessons_total ??
        course?.learner_progress?.required_lessons_total ??
        0
    ) || 0
  );

  const requiredLessonsCompleted = Math.max(
    0,
    Number(
      enrollment?.required_lessons_completed ??
        course?.learner_progress?.required_lessons_completed ??
        0
    ) || 0
  );

  const structure = getCourseStructureStats(course);

  const formatCompletedStructureCount = (
    count,
    labels,
  ) => {
    const value = Math.abs(Number(count) || 0);
    const mod100 = value % 100;
    const mod10 = value % 10;
    let label = labels[2];

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        label = labels[0];
      } else if (mod10 >= 2 && mod10 <= 4) {
        label = labels[1];
      }
    }

    return `${value} ${label}`;
  };

  const programSummary = `${formatCompletedStructureCount(
    structure.modulesCount,
    [
      "\u043c\u043e\u0434\u0443\u043b\u044c",
      "\u043c\u043e\u0434\u0443\u043b\u044f",
      "\u043c\u043e\u0434\u0443\u043b\u0435\u0439",
    ],
  )} \u00b7 ${formatCompletedStructureCount(
    structure.lessonsCount,
    [
      "\u0443\u0440\u043e\u043a",
      "\u0443\u0440\u043e\u043a\u0430",
      "\u0443\u0440\u043e\u043a\u043e\u0432",
    ],
  )}`;

  const documentItem =
    getLearnerDocumentAvailabilityHandoffDocument(
      course,
      enrollment,
      accountDocuments
    );

  const documentAvailable =
    documentItem?.status === "available" &&
    Boolean(documentItem?.download_available);

  const documentRevoked =
    documentItem?.status === "revoked";

  const documentStatusLabel = documentsLoading
    ? "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"
    : documentsLoadError
      ? "\u0421\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u043d\u0435 \u043e\u0431\u043d\u043e\u0432\u0438\u043b\u0438\u0441\u044c"
      : !documentItem
        ? "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0444\u043e\u0440\u043c\u0438\u0440\u0443\u0435\u0442\u0441\u044f"
        : documentAvailable
          ? "\u0413\u043e\u0442\u043e\u0432 \u043a \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u044e"
          : documentRevoked
            ? "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d"
            : documentItem.status === "available"
              ? "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d"
              : "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u0434\u0433\u043e\u0442\u0430\u0432\u043b\u0438\u0432\u0430\u0435\u0442\u0441\u044f";

  const documentStatusTone = documentsLoadError
    ? "bg-red-50 text-red-800 ring-red-200"
    : documentRevoked
      ? "bg-red-50 text-red-800 ring-red-200"
      : documentAvailable
        ? "bg-green-50 text-green-800 ring-green-200"
        : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <div
      data-testid="course-detail-completed-state"
      data-course-detail-state="completed"
      className="mx-auto max-w-7xl space-y-5"
    >
      <button
        type="button"
        data-testid="course-detail-completed-catalog-action"
        onClick={onCatalog}
        className="inline-flex min-h-11 items-center rounded-full px-1 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
      >
        {"\u2190 \u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432"}
      </button>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <main className="min-w-0 space-y-6">
          <section
            data-testid="course-detail-completed-hero"
            className="overflow-hidden rounded-shell bg-white shadow-sm ring-1 ring-slate-200"
          >
            <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">
                  {"\u2713 \u041a\u0443\u0440\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d"}
                </span>

                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                  {"100% \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u043e"}
                </span>

                {course.direction ? (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {course.direction}
                  </span>
                ) : null}
              </div>

              <div className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
                {"\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"}
              </div>

              <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                {course.title}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {course.description ||
                  "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0443\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f."}
              </p>

              <div
                data-testid="course-detail-completed-facts"
                className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0424\u043e\u0440\u043c\u0430\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {course.format || "\u2014"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {programSummary}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-green-700">
                    {enrollment?.completed_at
                      ? formatDateTime(enrollment.completed_at)
                      : "\u2014"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {formatCourseDocument(course)}
                  </div>
                </div>
              </div>

              <div
                data-testid="course-detail-completed-banner"
                className="mt-5 rounded-2xl bg-green-50 px-4 py-3.5 ring-1 ring-green-200"
              >
                <div className="font-semibold text-green-900">
                  {"\u2713 \u0412\u0441\u0435 \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f \u043a\u0443\u0440\u0441\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u044b"}
                </div>

                <p className="mt-1 text-sm leading-6 text-green-800">
                  {"\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d \u0432 \u0432\u0430\u0448\u0435\u043c \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435."}
                </p>
              </div>
            </div>
          </section>

          <section
            data-testid="course-detail-completed-mobile-status"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:hidden"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
              {"\u0412\u0430\u0448 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442"}
            </div>

            <div className="mt-4 rounded-2xl bg-green-50 p-4 ring-1 ring-green-200">
              <div className="font-bold text-green-950">
                {"\u2713 \u041a\u0443\u0440\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d"}
              </div>

              <p className="mt-1 text-sm leading-6 text-green-800">
                {`${lessonsCompleted} \u0438\u0437 ${lessonsTotal} \u0443\u0440\u043e\u043a\u043e\u0432 \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u043e.`}
              </p>
            </div>

            <div
              data-testid="course-detail-completed-document-status-mobile"
              className={`mt-4 rounded-2xl p-4 text-sm font-semibold ring-1 ${documentStatusTone}`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
              </div>

              <div className="mt-2">
                {documentStatusLabel}
              </div>
            </div>

            {documentsLoadError ? (
              <div
                data-testid="course-detail-completed-document-load-error-mobile"
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200"
              >
                {documentsLoadError}
              </div>
            ) : null}

            {downloadError ? (
              <div
                data-testid="course-detail-completed-document-download-error-mobile"
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200"
              >
                {downloadError}
              </div>
            ) : null}

            {documentAvailable ? (
              <button
                type="button"
                data-testid="course-detail-completed-download-action-mobile"
                onClick={() =>
                  onDownloadDocument?.(documentItem)
                }
                disabled={
                  documentDownloadLoadingId ===
                  documentItem.id
                }
                className="mt-5 min-h-12 w-full rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {documentDownloadLoadingId ===
                documentItem.id
                  ? "\u0421\u043a\u0430\u0447\u0438\u0432\u0430\u0435\u043c..."
                  : "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
              </button>
            ) : (
              <button
                type="button"
                data-testid="course-detail-completed-documents-action-mobile"
                onClick={onDocuments}
                className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {"\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c"}
              </button>
            )}

            <button
              type="button"
              data-testid="course-detail-completed-account-action-mobile"
              onClick={onAccount}
              className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              {"\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
            </button>
          </section>

          <section
            data-testid="course-detail-completed-summary"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
              {"\u0418\u0442\u043e\u0433\u0438 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"}
            </div>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              {"\u041a\u0443\u0440\u0441 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d"}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {"\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043b\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u0439 \u043a \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044e \u043a\u0443\u0440\u0441\u0430."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl bg-green-50 p-5 ring-1 ring-green-200">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                  {"\u2713"}
                </div>

                <h3 className="mt-4 font-bold text-green-950">
                  {"100% \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-green-800">
                  {"\u0421\u0442\u0430\u0442\u0443\u0441 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d."}
                </p>
              </article>

              <article className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {lessonsCompleted}
                </div>

                <h3 className="mt-4 font-bold text-slate-950">
                  {"\u041f\u0440\u043e\u0439\u0434\u0435\u043d\u043e \u0443\u0440\u043e\u043a\u043e\u0432"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {`${lessonsCompleted} \u0438\u0437 ${lessonsTotal} \u0443\u0440\u043e\u043a\u043e\u0432 \u043a\u0443\u0440\u0441\u0430.`}
                </p>
              </article>

              <article className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {"\u2713"}
                </div>

                <h3 className="mt-4 font-bold text-slate-950">
                  {"\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0447\u0430\u0441\u0442\u044c"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {requiredLessonsTotal > 0
                    ? `${requiredLessonsCompleted} \u0438\u0437 ${requiredLessonsTotal} \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u0443\u0440\u043e\u043a\u043e\u0432.`
                    : "\u0422\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f \u043a \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044e \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u044b."}
                </p>
              </article>
            </div>
          </section>

          <div data-testid="course-detail-completed-program">
            <CourseDetailGuestProgram
              modules={course.modules}
              authenticated
              completed
            />
          </div>

          <section
            data-testid="course-detail-completed-info"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
          >
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {"\u041f\u043e\u0441\u043b\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f"}
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {"\u0427\u0442\u043e \u0434\u0430\u043b\u044c\u0448\u0435"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {"\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d. \u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0438 \u0438\u0441\u0442\u043e\u0440\u0438\u044f \u043a\u0443\u0440\u0441\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0438\u0437 \u043b\u0438\u0447\u043d\u043e\u0433\u043e \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0430."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                [
                  "1",
                  "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
                  "\u0421\u0442\u0430\u0442\u0443\u0441 \u0438\u0442\u043e\u0433\u043e\u0432\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u043e\u0442\u043e\u0431\u0440\u0430\u0436\u0430\u0435\u0442\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435.",
                ],
                [
                  "2",
                  "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430",
                  "\u041d\u0430 \u044d\u0442\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435 \u043c\u043e\u0436\u043d\u043e \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u043e\u0433\u043e \u043a\u0443\u0440\u0441\u0430.",
                ],
                [
                  "3",
                  "\u0412\u0435\u0440\u043d\u0438\u0442\u0435\u0441\u044c \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442",
                  "\u0412 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435 \u0445\u0440\u0430\u043d\u044f\u0442\u0441\u044f \u0432\u0430\u0448\u0438 \u043a\u0443\u0440\u0441\u044b \u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b.",
                ],
              ].map(([number, title, description]) => (
                <article
                  key={number}
                  className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {number}
                  </div>

                  <h3 className="mt-4 font-bold text-slate-950">
                    {title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            data-testid="course-detail-completed-bottom-cta"
            className="overflow-hidden rounded-shell bg-slate-950 shadow-sm"
          >
            <div className="px-5 py-7 sm:px-7 sm:py-8">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-green-300">
                    {"\u041a\u0443\u0440\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d"}
                  </div>

                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {documentAvailable
                      ? "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0431 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438 \u0433\u043e\u0442\u043e\u0432"
                      : "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    {documentStatusLabel}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                  <button
                    type="button"
                    data-testid="course-detail-completed-bottom-documents-action"
                    onClick={onDocuments}
                    className="min-h-12 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
                  >
                    {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b"}
                  </button>

                  <button
                    type="button"
                    data-testid="course-detail-completed-bottom-account-action"
                    onClick={onAccount}
                    className="min-h-12 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15"
                  >
                    {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside
          data-testid="course-detail-completed-sidebar"
          className="hidden rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:sticky lg:top-24 lg:block"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
            {"\u0412\u0430\u0448 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442"}
          </div>

          <div className="mt-5 rounded-2xl bg-green-50 p-4 ring-1 ring-green-200">
            <div className="font-bold text-green-950">
              {"\u2713 \u041a\u0443\u0440\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d"}
            </div>

            <p className="mt-1.5 text-sm leading-6 text-green-800">
              {enrollment?.completed_at
                ? `\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d: ${formatDateTime(enrollment.completed_at)}`
                : "\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d."}
            </p>
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-950">
            {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
          </h2>

          <div className="mt-2 text-sm font-semibold text-slate-900">
            {documentItem?.title ||
              formatCourseDocument(course)}
          </div>

          <div
            data-testid="course-detail-completed-document-status"
            className={`mt-4 rounded-2xl p-4 text-sm font-semibold ring-1 ${documentStatusTone}`}
          >
            {documentStatusLabel}
          </div>

          {documentItem ? (
            <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {"\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430"}
                </div>

                <div className="mt-1 break-all text-sm font-semibold text-slate-900">
                  {documentItem.document_number || "\u2014"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {"\u0414\u0430\u0442\u0430 \u0432\u044b\u0434\u0430\u0447\u0438"}
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {documentItem.issued_at
                    ? formatDateTime(documentItem.issued_at)
                    : "\u2014"}
                </div>
              </div>
            </div>
          ) : null}

          {documentsLoadError ? (
            <div
              data-testid="course-detail-completed-document-load-error"
              role="alert"
              className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200"
            >
              {documentsLoadError}
            </div>
          ) : null}

          {downloadError ? (
            <div
              data-testid="course-detail-completed-document-download-error"
              role="alert"
              className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200"
            >
              {downloadError}
            </div>
          ) : null}

          {documentAvailable ? (
            <button
              type="button"
              data-testid="course-detail-completed-download-action"
              onClick={() =>
                onDownloadDocument?.(documentItem)
              }
              disabled={
                documentDownloadLoadingId ===
                documentItem.id
              }
              className="mt-6 min-h-12 w-full rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {documentDownloadLoadingId ===
              documentItem.id
                ? "\u0421\u043a\u0430\u0447\u0438\u0432\u0430\u0435\u043c..."
                : "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
            </button>
          ) : (
            <button
              type="button"
              data-testid="course-detail-completed-documents-action"
              onClick={onDocuments}
              className="mt-6 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {"\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c"}
            </button>
          )}

          {documentAvailable ? (
            <button
              type="button"
              data-testid="course-detail-completed-documents-action"
              onClick={onDocuments}
              className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              {"\u0412\u0441\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b"}
            </button>
          ) : null}

          <button
            type="button"
            data-testid="course-detail-completed-account-action"
            onClick={onAccount}
            className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
          >
            {"\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
          </button>
        </aside>
      </div>
    </div>
  );
}



function CourseDetailCancelledState({
  course,
  enrollment,
  onAccount,
  onCatalog,
}) {
  const lessons =
    getCourseDetailOverviewLessons(course);

  const lessonsTotal = Math.max(
    0,
    Number(
      enrollment?.lessons_total ??
        course?.learner_progress?.lessons_total ??
        lessons.length
    ) || 0
  );

  const lessonsCompleted = Math.max(
    0,
    Number(
      enrollment?.lessons_completed ??
        course?.learner_progress?.lessons_completed ??
        lessons.filter(getLessonCompleted).length
    ) || 0
  );

  const structure =
    getCourseStructureStats(course);

  const organizationName =
    enrollment?.organization_name || "";

  const learningGroupName =
    enrollment?.learning_group_name || "";

  const formatCancelledStructureCount = (
    count,
    labels,
  ) => {
    const value =
      Math.abs(Number(count) || 0);

    const mod100 = value % 100;
    const mod10 = value % 10;

    let label = labels[2];

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        label = labels[0];
      } else if (
        mod10 >= 2 &&
        mod10 <= 4
      ) {
        label = labels[1];
      }
    }

    return `${value} ${label}`;
  };

  const programSummary =
    `${formatCancelledStructureCount(
      structure.modulesCount,
      [
        "\u043c\u043e\u0434\u0443\u043b\u044c",
        "\u043c\u043e\u0434\u0443\u043b\u044f",
        "\u043c\u043e\u0434\u0443\u043b\u0435\u0439",
      ],
    )} \u00b7 ${formatCancelledStructureCount(
      structure.lessonsCount,
      [
        "\u0443\u0440\u043e\u043a",
        "\u0443\u0440\u043e\u043a\u0430",
        "\u0443\u0440\u043e\u043a\u043e\u0432",
      ],
    )}`;

  return (
    <div
      data-testid="course-detail-cancelled-state"
      data-course-detail-state="cancelled"
      className="mx-auto max-w-7xl space-y-5"
    >
      <button
        type="button"
        data-testid="course-detail-cancelled-catalog-back-action"
        onClick={onCatalog}
        className="inline-flex min-h-11 items-center rounded-full px-1 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
      >
        {"\u2190 \u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432"}
      </button>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <main className="min-w-0 space-y-6">
          <section
            data-testid="course-detail-cancelled-hero"
            className="overflow-hidden rounded-shell bg-white shadow-sm ring-1 ring-slate-200"
          >
            <div className="bg-gradient-to-br from-red-50 via-white to-slate-50 px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                  {"\u0417\u0430\u043f\u0438\u0441\u044c \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430"}
                </span>

                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {"\u0414\u043e\u0441\u0442\u0443\u043f \u0437\u0430\u043a\u0440\u044b\u0442"}
                </span>

                {course.direction ? (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {course.direction}
                  </span>
                ) : null}
              </div>

              <div className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                {"\u0421\u0442\u0430\u0442\u0443\u0441 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"}
              </div>

              <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                {course.title}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {course.description ||
                  "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0443\u0442\u043e\u0447\u043d\u044f\u0435\u0442\u0441\u044f."}
              </p>

              <div
                data-testid="course-detail-cancelled-facts"
                className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0424\u043e\u0440\u043c\u0430\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {course.format || "\u2014"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {programSummary}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041f\u0440\u043e\u0439\u0434\u0435\u043d\u043e"}
                  </div>

                  <div
                    data-testid="course-detail-cancelled-lesson-history"
                    className="mt-2 text-sm font-bold text-slate-950"
                  >
                    {`${lessonsCompleted} \u0438\u0437 ${lessonsTotal}`}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-950">
                    {formatCourseDocument(course)}
                  </div>
                </div>
              </div>

              <div
                data-testid="course-detail-cancelled-banner"
                className="mt-5 rounded-2xl bg-red-50 px-4 py-3.5 ring-1 ring-red-200"
              >
                <div className="font-semibold text-red-950">
                  {"\u0423\u0447\u0435\u0431\u043d\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b"}
                </div>

                <p className="mt-1 text-sm leading-6 text-red-800">
                  {"\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430. \u041d\u0430\u0447\u0430\u0442\u044c \u0438\u043b\u0438 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043f\u043e \u044d\u0442\u043e\u0439 \u0437\u0430\u043f\u0438\u0441\u0438 \u043d\u0435\u043b\u044c\u0437\u044f."}
                </p>
              </div>
            </div>
          </section>

          <section
            data-testid="course-detail-cancelled-mobile-status"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:hidden"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
              {"\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043f\u0438\u0441\u0438"}
            </div>

            <div className="mt-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
              <div className="font-bold text-red-950">
                {"\u0417\u0430\u043f\u0438\u0441\u044c \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430"}
              </div>

              <p className="mt-1 text-sm leading-6 text-red-800">
                {lessonsTotal > 0
                  ? `\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u044f: ${lessonsCompleted} \u0438\u0437 ${lessonsTotal} \u0443\u0440\u043e\u043a\u043e\u0432.`
                  : "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0437\u0430\u043f\u0438\u0441\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430."}
              </p>
            </div>

            {(organizationName ||
              learningGroupName) ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {organizationName ? (
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f"}
                    </div>

                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {organizationName}
                    </div>
                  </div>
                ) : null}

                {learningGroupName ? (
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {"\u0423\u0447\u0435\u0431\u043d\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430"}
                    </div>

                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {learningGroupName}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onAccount}
              className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
            </button>
          </section>

          <div
            data-testid="course-detail-cancelled-program"
          >
            <CourseDetailGuestProgram
              modules={course.modules}
              authenticated
              cancelled
            />
          </div>

          <section
            data-testid="course-detail-cancelled-info"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
          >
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {"\u041f\u043e\u0441\u043b\u0435 \u043e\u0442\u043c\u0435\u043d\u044b"}
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {"\u0427\u0442\u043e \u0434\u0435\u043b\u0430\u0442\u044c \u0434\u0430\u043b\u044c\u0448\u0435"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {"\u041e\u0442\u043c\u0435\u043d\u0430 \u0437\u0430\u043f\u0438\u0441\u0438 \u043d\u0435 \u0443\u0434\u0430\u043b\u044f\u0435\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u0443\u044e \u0438\u0441\u0442\u043e\u0440\u0438\u044e. \u0414\u043b\u044f \u0440\u0435\u0448\u0435\u043d\u0438\u044f \u0432\u043e\u043f\u0440\u043e\u0441\u0430 \u043e \u0434\u043e\u0441\u0442\u0443\u043f\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442 \u0438\u043b\u0438 \u043e\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044c \u043a \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0443."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                [
                  "1",
                  "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0441\u0442\u0430\u0442\u0443\u0441",
                  "\u0412 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043f\u0438\u0441\u0438.",
                ],
                [
                  "2",
                  "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430",
                  "\u041d\u0430 \u044d\u0442\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435 \u043e\u0442\u043e\u0431\u0440\u0430\u0436\u0430\u0435\u0442\u0441\u044f \u0444\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043f\u043e \u0443\u0440\u043e\u043a\u0430\u043c.",
                ],
                [
                  "3",
                  "\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u0435 \u0434\u043e\u0441\u0442\u0443\u043f",
                  "\u0415\u0441\u043b\u0438 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043d\u0443\u0436\u043d\u043e \u0432\u043e\u0437\u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c, \u043e\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044c \u043a \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0443.",
                ],
              ].map(
                ([number, title, description]) => (
                  <article
                    key={number}
                    className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {number}
                    </div>

                    <h3 className="mt-4 font-bold text-slate-950">
                      {title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {description}
                    </p>
                  </article>
                )
              )}
            </div>
          </section>

          <section
            data-testid="course-detail-cancelled-bottom-cta"
            className="overflow-hidden rounded-shell bg-slate-950 shadow-sm"
          >
            <div className="px-5 py-7 sm:px-7 sm:py-8">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-red-300">
                    {"\u0417\u0430\u043f\u0438\u0441\u044c \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430"}
                  </div>

                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {"\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    {"\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043f\u0438\u0441\u0438 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043c\u043e\u0436\u043d\u043e \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                  <button
                    type="button"
                    onClick={onAccount}
                    className="min-h-12 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
                  </button>

                  <button
                    type="button"
                    onClick={onCatalog}
                    className="min-h-12 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15"
                  >
                    {"\u0412 \u043a\u0430\u0442\u0430\u043b\u043e\u0433"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside
          data-testid="course-detail-cancelled-sidebar"
          className="hidden rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:sticky lg:top-24 lg:block"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
            {"\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043f\u0438\u0441\u0438"}
          </div>

          <div className="mt-5 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
            <div className="font-bold text-red-950">
              {"\u0417\u0430\u043f\u0438\u0441\u044c \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430"}
            </div>

            <p className="mt-1.5 text-sm leading-6 text-red-800">
              {"\u0423\u0447\u0435\u0431\u043d\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043f\u043e \u044d\u0442\u043e\u0439 \u0437\u0430\u043f\u0438\u0441\u0438 \u0437\u0430\u043a\u0440\u044b\u0442\u044b."}
            </p>
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-950">
            {"\u0421\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441"}
          </h2>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {"\u041f\u0440\u043e\u0439\u0434\u0435\u043d\u043e \u0443\u0440\u043e\u043a\u043e\u0432"}
            </div>

            <div className="mt-2 text-lg font-bold text-slate-950">
              {`${lessonsCompleted} \u0438\u0437 ${lessonsTotal}`}
            </div>
          </div>

          {(organizationName ||
            learningGroupName) ? (
            <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
              {organizationName ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f"}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {organizationName}
                  </div>
                </div>
              ) : null}

              {learningGroupName ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {"\u0423\u0447\u0435\u0431\u043d\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430"}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {learningGroupName}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            data-testid="course-detail-cancelled-account-action"
            onClick={onAccount}
            className="mt-6 min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {"\u041b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"}
          </button>

          <button
            type="button"
            data-testid="course-detail-cancelled-catalog-action"
            onClick={onCatalog}
            className="mt-3 min-h-12 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
          >
            {"\u0412 \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432"}
          </button>

          <div
            data-testid="course-detail-cancelled-admin-note"
            className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200"
          >
            {"\u0415\u0441\u043b\u0438 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043d\u0443\u0436\u043d\u043e \u0432\u043e\u0437\u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c, \u043e\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044c \u043a \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0443."}
          </div>
        </aside>
      </div>
    </div>
  );
}



const COURSE_DETAIL_LEGACY_LEARNER_WORKSPACE_RENDERING = false;

function CourseLearnerWorkspaceHandoff({
  existingEnrollment,
  onOpenAccount,
}) {
  if (!existingEnrollment) {
    return null;
  }

  const status = existingEnrollment.status;

  const title =
    status === "assigned"
      ? "\u041a\u0443\u0440\u0441 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d"
      : status === "active"
        ? "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0435\u0442\u0441\u044f"
        : status === "completed"
          ? "\u041a\u0443\u0440\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d"
          : status === "cancelled"
            ? "\u0417\u0430\u043f\u0438\u0441\u044c \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430"
            : "\u041a\u0443\u0440\u0441 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435";

  const description =
    status === "completed"
      ? "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f \u0438 \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435."
      : status === "cancelled"
        ? "\u0418\u043d\u0442\u0435\u0440\u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0435 \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e. \u0421\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u043e \u0437\u0430\u043f\u0438\u0441\u0438 \u043e\u0441\u0442\u0430\u044e\u0442\u0441\u044f \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435."
        : "\u0423\u0440\u043e\u043a\u0438, \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u0442\u0435\u0441\u0442\u044b \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u0432 \u0440\u0430\u0431\u043e\u0447\u0435\u043c \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0435 \u043a\u0443\u0440\u0441\u0430 \u0438\u0437 \u0440\u0430\u0437\u0434\u0435\u043b\u0430 \u00ab\u041c\u043e\u0451 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435\u00bb.";

  const actionLabel =
    status === "cancelled"
      ? "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442"
      : "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u00ab\u041c\u043e\u0451 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435\u00bb";

  return (
    <section
      data-testid="course-detail-learner-workspace-handoff"
      data-enrollment-status={status || "unknown"}
      className="rounded-shell bg-blue-50 p-6 ring-1 ring-blue-200 md:p-8"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
        {"\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0432 \u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435"}
      </div>

      <h2 className="mt-2 text-2xl font-bold text-slate-900">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
        {description}
      </p>

      <div className="mt-5">
        <button
          type="button"
          data-testid="course-detail-open-learning-workspace"
          onClick={onOpenAccount}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}


function CourseDetailServiceState({
  variant,
  error,
  onPageChange,
  onRetry,
}) {
  const isLoading = variant === "loading";
  const isError = variant === "error";
  const isNotFound = !isLoading && !isError;

  if (isLoading) {
    return (
      <div
        data-testid="course-detail-loading-state"
        data-course-detail-state="loading"
        aria-live="polite"
        aria-busy="true"
        className="mx-auto max-w-7xl space-y-6"
      >
        <div className="flex min-h-11 items-center">
          <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
        </div>

        <div
          data-testid="course-detail-loading-skeleton"
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
        >
          <main
            data-testid="course-detail-loading-main-skeleton"
            className="min-w-0 space-y-6"
          >
            <section className="overflow-hidden rounded-shell bg-white shadow-sm ring-1 ring-slate-200">
              <div className="px-5 py-8 sm:px-8 sm:py-10">
                <div className="flex gap-2">
                  <div className="h-7 w-28 animate-pulse rounded-full bg-blue-100" />
                  <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
                </div>

                <div className="mt-7 h-4 w-36 animate-pulse rounded-full bg-slate-200" />

                <div className="mt-4 h-10 w-11/12 animate-pulse rounded-2xl bg-slate-200 sm:w-4/5" />

                <div className="mt-3 h-10 w-3/5 animate-pulse rounded-2xl bg-slate-200" />

                <div className="mt-7 space-y-3">
                  <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                  <div className="h-4 w-11/12 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>

              <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="bg-white p-5"
                  >
                    <div className="h-3 w-20 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-3 h-5 w-28 animate-pulse rounded-full bg-slate-200" />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />

              <div className="mt-5 space-y-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-200"
                  />
                ))}
              </div>
            </section>
          </main>

          <aside
            data-testid="course-detail-loading-sidebar-skeleton"
            className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:sticky lg:top-24"
          >
            <div className="h-7 w-32 animate-pulse rounded-full bg-blue-100" />

            <div className="mt-5 h-7 w-4/5 animate-pulse rounded-xl bg-slate-200" />

            <div className="mt-4 space-y-3">
              <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
            </div>

            <div className="mt-7 h-12 w-full animate-pulse rounded-xl bg-blue-100" />

            <div className="mt-3 h-12 w-full animate-pulse rounded-xl bg-slate-100" />
          </aside>
        </div>

        <div
          data-testid="course-detail-state-title"
          className="sr-only"
        >
          {"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0434\u0430\u043d\u043d\u044b\u0445 \u043a\u0443\u0440\u0441\u0430..."}
        </div>

        <div
          data-testid="course-detail-state-description"
          className="sr-only"
        >
          {"\u041f\u043e\u043b\u0443\u0447\u0430\u0435\u043c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443 \u043a\u0443\u0440\u0441\u0430 \u0438 \u0441\u0442\u0430\u0442\u0443\u0441 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f."}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="course-detail-error-state"
        data-course-detail-state="error"
        className="mx-auto max-w-7xl space-y-6"
      >
        <section
          data-testid="course-detail-error-panel"
          role="alert"
          className="rounded-shell bg-white px-5 py-10 text-center shadow-sm ring-1 ring-slate-200 sm:px-8 sm:py-12"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl font-bold text-red-600 ring-1 ring-red-200">
            {"!"}
          </div>

          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
            {"\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438"}
          </div>

          <h1
            data-testid="course-detail-state-title"
            className="mx-auto mt-3 max-w-3xl text-2xl font-bold text-slate-950 sm:text-3xl"
          >
            {"\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435 \u043a\u0443\u0440\u0441\u0430"}
          </h1>

          <p
            data-testid="course-detail-state-description"
            className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600"
          >
            {"\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c \u0437\u0430\u043f\u0440\u043e\u0441. \u0415\u0441\u043b\u0438 \u043e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f, \u0432\u0435\u0440\u043d\u0438\u0442\u0435\u0441\u044c \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433."}
          </p>

          {error ? (
            <div
              data-testid="course-detail-error-message"
              className="mx-auto mt-5 max-w-2xl rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 ring-1 ring-red-200"
            >
              {error}
            </div>
          ) : null}

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            {onRetry ? (
              <button
                type="button"
                data-testid="course-detail-state-retry-action"
                onClick={onRetry}
                className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {"\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c"}
              </button>
            ) : null}

            <button
              type="button"
              data-testid="course-detail-state-catalog-action"
              onClick={() => onPageChange("catalog")}
              className="min-h-12 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
            >
              {"\u0412 \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432"}
            </button>
          </div>
        </section>

        <section
          data-testid="course-detail-error-disabled-content"
          aria-hidden="true"
          className="pointer-events-none grid gap-6 opacity-45 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
        >
          <div className="space-y-4 rounded-shell bg-white p-6 ring-1 ring-slate-200">
            <div className="h-7 w-2/3 rounded-xl bg-slate-200" />
            <div className="h-4 w-full rounded-full bg-slate-100" />
            <div className="h-4 w-5/6 rounded-full bg-slate-100" />

            <div className="mt-6 space-y-3">
              <div className="h-14 rounded-2xl bg-slate-100" />
              <div className="h-14 rounded-2xl bg-slate-100" />
            </div>
          </div>

          <div className="rounded-shell bg-white p-6 ring-1 ring-slate-200">
            <div className="h-6 w-1/2 rounded-xl bg-slate-200" />
            <div className="mt-5 h-12 rounded-xl bg-slate-100" />
            <div className="mt-3 h-12 rounded-xl bg-slate-100" />
          </div>
        </section>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div
        data-testid="course-detail-not-found-state"
        data-course-detail-state="not_found"
        className="mx-auto max-w-7xl space-y-6"
      >
        <section
          data-testid="course-detail-not-found-panel"
          className="rounded-shell bg-white px-5 py-12 text-center shadow-sm ring-1 ring-slate-200 sm:px-8 sm:py-16"
        >
          <div
            data-testid="course-detail-not-found-code"
            className="text-7xl font-black tracking-tight text-blue-100 sm:text-8xl"
          >
            {"404"}
          </div>

          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            {"\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u043a\u0443\u0440\u0441\u0430"}
          </div>

          <h1
            data-testid="course-detail-state-title"
            className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl"
          >
            {"\u041a\u0443\u0440\u0441 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d"}
          </h1>

          <p
            data-testid="course-detail-state-description"
            className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base"
          >
            {error ||
              "\u0412\u043e\u0437\u043c\u043e\u0436\u043d\u043e, \u043a\u0443\u0440\u0441 \u0431\u044b\u043b \u0441\u043d\u044f\u0442 \u0441 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438 \u0438\u043b\u0438 \u0430\u0434\u0440\u0435\u0441 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b \u0443\u043a\u0430\u0437\u0430\u043d \u043d\u0435\u0432\u0435\u0440\u043d\u043e."}
          </p>

          <button
            type="button"
            data-testid="course-detail-state-catalog-action"
            onClick={() => onPageChange("catalog")}
            className="mt-7 min-h-12 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {"\u0412 \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432"}
          </button>
        </section>

        <section
          data-testid="course-detail-not-found-catalog-hint"
          className="rounded-shell bg-blue-50 px-5 py-5 ring-1 ring-blue-100 sm:px-6"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-bold text-slate-900">
                {"\u0414\u0440\u0443\u0433\u0438\u0435 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u043a\u0443\u0440\u0441\u044b"}
              </div>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {"\u0410\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043c\u043e\u0436\u043d\u043e \u0432\u044b\u0431\u0440\u0430\u0442\u044c \u0432 \u043e\u0431\u0449\u0435\u043c \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435."}
              </p>
            </div>

            <button
              type="button"
              data-testid="course-detail-not-found-catalog-hint-action"
              onClick={() => onPageChange("catalog")}
              className="min-h-11 shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
            >
              {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0442\u0430\u043b\u043e\u0433"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return null;
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
      className="rounded-shell bg-slate-900 p-6 text-white shadow-sm"
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

function setAccountLearningEntryIntent(notice = null) {
  try {
    sessionStorage.setItem(
      "obrportal_account_section",
      "learning"
    );

    if (notice) {
      sessionStorage.setItem(
        "obrportal_account_notice",
        JSON.stringify(notice)
      );
    }
  } catch {
    // sessionStorage may be unavailable in private mode or tests.
  }
}


export function CourseDetailPage({ courseSlug, onPageChange, onOpenCourse, user }) {
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [publicState, setPublicState] = useState(
    PUBLIC_COURSE_LOAD_STATES.LOADING
  );
  const [accountState, setAccountState] = useState(
    user
      ? ACCOUNT_COURSE_LOAD_STATES.LOADING
      : ACCOUNT_COURSE_LOAD_STATES.NOT_REQUIRED
  );
  const [publicError, setPublicError] = useState("");
  const [accountError, setAccountError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState("");
  const [existingEnrollment, setExistingEnrollment] = useState(null);
  const [accountCourseDetail, setAccountCourseDetail] = useState(null);
  const [lessonCompletionLoading, setLessonCompletionLoading] = useState(false);
  const [lessonCompletionError, setLessonCompletionError] = useState("");
  const [lessonCompletionSuccess, setLessonCompletionSuccess] = useState("");
  const [quizAttemptStateByLesson, setQuizAttemptStateByLesson] = useState({});
  const [assignmentSubmissionStateByLesson, setAssignmentSubmissionStateByLesson] = useState({});
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

  const courseDetailState = resolveCourseDetailState({
    publicState,
    accountState,
    user,
    enrollment: existingEnrollment,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCourse() {
      setCourse(null);
      setRelatedCourses([]);
      setExistingEnrollment(null);
      setAccountCourseDetail(null);
      setAccountDocuments([]);
      setAccountDocumentsError("");
      setAccountDocumentDownloadError("");
      setAccountDocumentDownloadLoadingId("");
      setCompletionDocumentFocus(null);
      setPublicError("");
      setAccountError("");
      setStartError("");

      if (!courseSlug) {
        setAccountDocumentsLoading(false);
        setPublicState(PUBLIC_COURSE_LOAD_STATES.ERROR);
        setAccountState(
          ACCOUNT_COURSE_LOAD_STATES.NOT_REQUIRED
        );
        setPublicError(
          "\u041a\u0443\u0440\u0441 \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d."
        );
        return;
      }

      setPublicState(
        PUBLIC_COURSE_LOAD_STATES.LOADING
      );
      setAccountState(
        user
          ? ACCOUNT_COURSE_LOAD_STATES.LOADING
          : ACCOUNT_COURSE_LOAD_STATES.NOT_REQUIRED
      );
      setAccountDocumentsLoading(Boolean(user));

      let courseResponse = null;

      try {
        courseResponse = await getPublicCourseDetail(
          courseSlug
        );
      } catch (err) {
        if (!isMounted) {
          return;
        }

        const isNotFound = err?.status === 404;

        setPublicState(
          isNotFound
            ? PUBLIC_COURSE_LOAD_STATES.NOT_FOUND
            : PUBLIC_COURSE_LOAD_STATES.ERROR
        );

        setPublicError(
          formatApiError(
            err,
            isNotFound
              ? "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430."
              : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b."
          )
        );

        setAccountState(
          ACCOUNT_COURSE_LOAD_STATES.NOT_REQUIRED
        );
        setAccountDocumentsLoading(false);
        return;
      }

      if (!isMounted) {
        return;
      }

      setCourse(courseResponse);
      setPublicState(
        PUBLIC_COURSE_LOAD_STATES.READY
      );

      getPublicCourses({ limit: 6 })
        .then((coursesResponse) => {
          if (!isMounted) {
            return;
          }

          setRelatedCourses(
            Array.isArray(coursesResponse)
              ? coursesResponse
                  .filter(
                    (item) =>
                      item.slug !== courseResponse.slug
                  )
                  .slice(0, 2)
              : []
          );
        })
        .catch(() => {
          if (isMounted) {
            setRelatedCourses([]);
          }
        });

      if (!user) {
        setAccountState(
          ACCOUNT_COURSE_LOAD_STATES.NOT_REQUIRED
        );
        setAccountDocumentsLoading(false);
        return;
      }

      let accountCoursesResponse = null;

      try {
        accountCoursesResponse =
          await getAccountCourses();
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setAccountState(
          ACCOUNT_COURSE_LOAD_STATES.ERROR
        );

        setAccountError(
          formatApiError(
            err,
            "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441 \u0432\u0430\u0448\u0435\u0439 \u0437\u0430\u043f\u0438\u0441\u0438 \u043d\u0430 \u043a\u0443\u0440\u0441."
          )
        );

        setAccountDocumentsLoading(false);
        return;
      }

      if (!isMounted) {
        return;
      }

      const accountCourses = Array.isArray(
        accountCoursesResponse?.items
      )
        ? accountCoursesResponse.items
        : [];

      const matchedEnrollment =
        accountCourses.find(
          (item) =>
            item.course_id === courseResponse.id ||
            item.course_slug === courseResponse.slug
        ) || null;

      const matchedEnrollmentId =
        getEnrollmentId(matchedEnrollment);

      if (!matchedEnrollmentId) {
        setExistingEnrollment(null);
        setAccountCourseDetail(null);
        setAccountDocuments([]);
        setAccountDocumentsLoading(false);
        setAccountState(
          ACCOUNT_COURSE_LOAD_STATES.READY
        );
        return;
      }

      let accountCourseDetailResponse = null;

      try {
        accountCourseDetailResponse =
          await getAccountCourseDetail(
            matchedEnrollmentId
          );
      } catch {
        accountCourseDetailResponse = null;
      }

      let accountDocumentItems = [];
      let accountDocumentLoadError = "";

      try {
        const accountDocumentsResponse =
          await getAccountDocuments({
            enrollment_id: matchedEnrollmentId,
            course_id: courseResponse.id,
          });

        accountDocumentItems = Array.isArray(
          accountDocumentsResponse?.items
        )
          ? accountDocumentsResponse.items
          : [];
      } catch (err) {
        accountDocumentLoadError = formatApiError(
          err,
          "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u043f\u043e \u043a\u0443\u0440\u0441\u0443."
        );
      }

      if (!isMounted) {
        return;
      }

      setAccountCourseDetail(
        accountCourseDetailResponse
      );

      setExistingEnrollment(
        accountCourseDetailResponse ||
          matchedEnrollment
      );

      setAccountDocuments(
        accountDocumentItems
      );

      setAccountDocumentsError(
        accountDocumentLoadError
      );

      setAccountDocumentsLoading(false);

      setAccountState(
        ACCOUNT_COURSE_LOAD_STATES.READY
      );
    }

    loadCourse();

    return () => {
      isMounted = false;
    };
  }, [courseSlug, user?.id, reloadKey]);

  const learnerCourse = useMemo(
    () => mergeCourseWithAccountCourseDetail(course, accountCourseDetail),
    [course, accountCourseDetail]
  );

  const learnerLessonAccessFacts = useMemo(
    () => getLearnerLessonAccessFacts(learnerCourse, existingEnrollment, user),
    [learnerCourse, existingEnrollment, user]
  );

  const selectedLessonQuizCompletionGate = useMemo(
    () => getLearnerQuizCompletionGate(quizAttemptStateByLesson, selectedLessonId),
    [quizAttemptStateByLesson, selectedLessonId]
  );

  const selectedLessonAssignmentCompletionGate = useMemo(() => {
    const selectedLesson = getLearnerLessonBlockViewerSelectedLesson(
      learnerLessonAccessFacts,
      selectedLessonId
    );

    return getLearnerAssignmentCompletionGate(assignmentSubmissionStateByLesson, selectedLesson);
  }, [assignmentSubmissionStateByLesson, learnerLessonAccessFacts, selectedLessonId]);

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

  function handleQuizAttemptStateChange(payload) {
    if (!payload?.lessonId || !payload?.blockKey) {
      return;
    }

    setQuizAttemptStateByLesson((current) => {
      const previousLessonState = current[payload.lessonId] || { blocks: {} };
      const previousBlockState = previousLessonState.blocks[payload.blockKey] || null;
      const nextBlockState = {
        hasQuiz: true,
        attempted: Boolean(payload.attempted),
        passed: Boolean(payload.passed),
        percent: Number(payload.percent) || 0,
      };

      if (
        previousBlockState &&
        previousBlockState.hasQuiz === nextBlockState.hasQuiz &&
        previousBlockState.attempted === nextBlockState.attempted &&
        previousBlockState.passed === nextBlockState.passed &&
        previousBlockState.percent === nextBlockState.percent
      ) {
        return current;
      }

      return {
        ...current,
        [payload.lessonId]: {
          ...previousLessonState,
          blocks: {
            ...previousLessonState.blocks,
            [payload.blockKey]: nextBlockState,
          },
        },
      };
    });
  }

  function handleAssignmentSubmissionStateChange(payload) {
    if (!payload?.lessonId || !payload?.blockKey) {
      return;
    }

    setAssignmentSubmissionStateByLesson((current) => {
      const previousLessonState = current[payload.lessonId] || { blocks: {} };
      const previousBlockState = previousLessonState.blocks[payload.blockKey] || null;
      const nextBlockState = {
        hasAssignment: true,
        loading: Boolean(payload.loading),
        completed: Boolean(payload.completed),
        status: `${payload.status || "not_started"}`,
      };

      if (
        previousBlockState &&
        previousBlockState.hasAssignment === nextBlockState.hasAssignment &&
        previousBlockState.loading === nextBlockState.loading &&
        previousBlockState.completed === nextBlockState.completed &&
        previousBlockState.status === nextBlockState.status
      ) {
        return current;
      }

      return {
        ...current,
        [payload.lessonId]: {
          ...previousLessonState,
          blocks: {
            ...previousLessonState.blocks,
            [payload.blockKey]: nextBlockState,
          },
        },
      };
    });
  }


  async function handleCompleteLesson(lesson) {
    const enrollmentId = getEnrollmentId(existingEnrollment);

    if (!enrollmentId || !lesson?.id) {
      setLessonCompletionError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u0438\u043b\u0438 \u0443\u0440\u043e\u043a \u0434\u043b\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430.");
      setLessonCompletionSuccess("");
      return;
    }

    const lessonId = getLearnerLessonBlockViewerLessonId(lesson);
    const quizCompletionGate = getLearnerQuizCompletionGate(quizAttemptStateByLesson, lessonId);

    if (quizCompletionGate.hasQuiz && !quizCompletionGate.passed) {
      setLessonCompletionError(
        quizCompletionGate.attempted
          ? "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043d\u0443\u0436\u043d\u043e \u043f\u0440\u043e\u0439\u0442\u0438 \u0442\u0435\u0441\u0442 \u043d\u0430 \u043f\u0440\u043e\u0445\u043e\u0434\u043d\u043e\u0439 \u0431\u0430\u043b\u043b."
          : "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u0432\u0435\u0442\u044c\u0442\u0435 \u043d\u0430 \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u0442\u0435\u0441\u0442\u0430."
      );
      setLessonCompletionSuccess("");
      return;
    }

    try {
      setLessonCompletionLoading(true);
      setLessonCompletionError("");
      setLessonCompletionSuccess("");

      const assignmentCompletionGate = getLearnerAssignmentCompletionGate(
        assignmentSubmissionStateByLesson,
        lesson
      );

      if (assignmentCompletionGate.hasAssignment && !assignmentCompletionGate.completed) {
        setLessonCompletionError(
          `\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u043c\u0435\u0442\u044c\u0442\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u043a\u0430\u043a \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u0435: ${assignmentCompletionGate.completedCount} \u0438\u0437 ${assignmentCompletionGate.requiredCount}.`
        );
        setLessonCompletionSuccess("");
        setLessonCompletionLoading(false);
        return;
      }

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
      setAccountLearningEntryIntent();
      onPageChange("account");
      return;
    }

    try {
      setEnrollLoading(true);
      setEnrollError("");
      setEnrollSuccess("");
      setStartError("");

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
      setAccountState(ACCOUNT_COURSE_LOAD_STATES.READY);
      setAccountError("");

      if (createdEnrollmentId) {
        try {
          await startEnrollmentAndOpenFirstLesson(
            createdEnrollmentId
          );
          return;
        } catch (startErr) {
          setStartError(
            formatApiError(
              startErr,
              "\u0412\u044b \u0437\u0430\u043f\u0438\u0441\u0430\u043d\u044b \u043d\u0430 \u043a\u0443\u0440\u0441, \u043d\u043e \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u043d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435."
            )
          );
        }
      }
      setEnrollSuccess("Вы записаны на программу. Курс добавлен в личный кабинет.");


    } catch (err) {
      if (err.status === 409) {
        setExistingEnrollment({
          course_id: course.id,
          course_slug: course.slug,
          status: "assigned",
        });
        setAccountState(ACCOUNT_COURSE_LOAD_STATES.READY);
        setAccountError("");
        setEnrollError("");
        setEnrollSuccess("Вы уже записаны на эту программу. Курс доступен в личном кабинете.");


        setReloadKey((value) => value + 1);
        return;
      }

      setEnrollError(formatApiError(err, "Не удалось записаться на программу."));
    } finally {
      setEnrollLoading(false);
    }
  }
  async function startEnrollmentAndOpenFirstLesson(enrollmentId) {
    await startAccountCourse(enrollmentId);

    const updatedCourseDetail = await getAccountCourseDetail(
      enrollmentId
    );

    setAccountCourseDetail(updatedCourseDetail);
    setExistingEnrollment(updatedCourseDetail);
    setAccountState(ACCOUNT_COURSE_LOAD_STATES.READY);
    setAccountError("");

    const lessons = (
      updatedCourseDetail?.modules || []
    ).flatMap(
      (module) => module?.lessons || []
    );

    const firstLesson =
      lessons.find((lesson) => !lesson.is_completed)
      || lessons[0]
      || null;

    if (firstLesson?.id) {
      navigate(
        `/account/courses/${enrollmentId}/lessons/${firstLesson.id}`
      );
      return;
    }

    navigate(`/account/courses/${enrollmentId}`);
  }

  async function handleStartAssignedCourse() {
    const enrollmentId = getEnrollmentId(existingEnrollment);

    if (!enrollmentId || startLoading) {
      return;
    }

    try {
      setStartLoading(true);
      setStartError("");

      await startEnrollmentAndOpenFirstLesson(enrollmentId);
    } catch (err) {
      setStartError(
        formatApiError(
          err,
          "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043d\u0430\u0447\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435."
        )
      );
    } finally {
      setStartLoading(false);
    }
  }

  function handleOpenLearningWorkspace() {
    const enrollmentId = getEnrollmentId(
      existingEnrollment
    );

    if (!enrollmentId) {
      setAccountLearningEntryIntent();
      onPageChange("account");
      return;
    }

    navigate(
      `/account/courses/${enrollmentId}`
    );
  }

  function handleGuestLogin() {
    if (!course) {
      return;
    }

    try {
      localStorage.setItem(
        "obrportal_pending_enrollment_slug",
        course.slug
      );
    } catch {
      // localStorage can be unavailable in private mode or tests.
    }

    onPageChange("login");
  }

  if (
    courseDetailState === COURSE_DETAIL_STATES.LOADING
  ) {
    return <CourseDetailServiceState variant="loading" onPageChange={onPageChange} />;
  }

  if (
    courseDetailState ===
    COURSE_DETAIL_STATES.NOT_FOUND
  ) {
    return (
      <CourseDetailServiceState
        variant="not-found"
        error={publicError}
        onPageChange={onPageChange}
      />
    );
  }

  if (
    courseDetailState === COURSE_DETAIL_STATES.ERROR
  ) {
    return (
      <CourseDetailServiceState
        variant="error"
        error={publicError || accountError}
        onPageChange={onPageChange}
        onRetry={() =>
          setReloadKey((value) => value + 1)
        }
      />
    );
  }

  if (!course) {
    return (
      <CourseDetailServiceState
        variant="error"
        error={
          "\u0414\u0430\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b."
        }
        onPageChange={onPageChange}
        onRetry={() =>
          setReloadKey((value) => value + 1)
        }
      />
    );
  }

  if (
    courseDetailState === COURSE_DETAIL_STATES.GUEST
  ) {
    return (
      <CourseDetailGuestState
        course={course}
        enrollLoading={enrollLoading}
        onRegisterAndEnroll={handleEnroll}
        onLogin={handleGuestLogin}
        onCatalog={() => onPageChange("catalog")}
      />
    );
  }

  if (
    courseDetailState ===
      COURSE_DETAIL_STATES.AUTHENTICATED_UNENROLLED
  ) {
    return (
      <CourseDetailAuthenticatedUnenrolledState
        course={course}
        enrollLoading={enrollLoading}
        enrollError={enrollError}
        enrollSuccess={enrollSuccess}
        onEnroll={handleEnroll}
        onAccount={() => onPageChange("account")}
        onCatalog={() => onPageChange("catalog")}
      />
    );
  }

  if (
    courseDetailState === COURSE_DETAIL_STATES.ASSIGNED
  ) {
    return (
      <CourseDetailAssignedState
        course={course}
        enrollment={existingEnrollment}
        onStart={handleStartAssignedCourse}
        startLoading={startLoading}
        startError={startError}
        onAccount={() => {
          setAccountLearningEntryIntent();
          onPageChange("account");
        }}
        onCatalog={() => onPageChange("catalog")}
      />
    );
  }

  if (
    courseDetailState === COURSE_DETAIL_STATES.ACTIVE
  ) {
    return (
      <CourseDetailActiveState
        course={course}
        enrollment={existingEnrollment}
        onContinue={handleOpenLearningWorkspace}
        onAccount={() => {
          setAccountLearningEntryIntent();
          onPageChange("account");
        }}
        onCatalog={() => onPageChange("catalog")}
      />
    );
  }

  if (
    courseDetailState === COURSE_DETAIL_STATES.COMPLETED
  ) {
    return (
      <CourseDetailCompletedState
        course={mergeCourseWithAccountCourseDetail(course, accountCourseDetail)}
        enrollment={existingEnrollment}
        accountDocuments={accountDocuments}
        documentsLoading={accountDocumentsLoading}
        documentsLoadError={accountDocumentsError}
        downloadError={accountDocumentDownloadError}
        documentDownloadLoadingId={
          accountDocumentDownloadLoadingId
        }
        onDownloadDocument={
          handleDownloadAccountDocument
        }
        onDocuments={() => onPageChange("documents")}
        onAccount={() => {
          setAccountLearningEntryIntent();
          onPageChange("account");
        }}
        onCatalog={() => onPageChange("catalog")}
      />
    );
  }

  if (
    courseDetailState === COURSE_DETAIL_STATES.CANCELLED
  ) {
    return (
      <CourseDetailCancelledState
        course={mergeCourseWithAccountCourseDetail(course, accountCourseDetail)}
        enrollment={existingEnrollment}
        onAccount={() => {
          setAccountLearningEntryIntent();
          onPageChange("account");
        }}
        onCatalog={() => onPageChange("catalog")}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8 md:p-10">
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

        <h1 className="mt-5 max-w-4xl text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
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

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleEnroll}
            disabled={enrollLoading}
            className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {enrollLoading ? "Записываем..." : getPrimaryActionLabel(existingEnrollment, user)}
          </button>

          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="w-full rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 sm:w-auto"
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

      <CourseLearnerWorkspaceHandoff
        existingEnrollment={existingEnrollment}
        onOpenAccount={() => {
          setAccountLearningEntryIntent();
          onPageChange("account");
        }}
      />

      {COURSE_DETAIL_LEGACY_LEARNER_WORKSPACE_RENDERING ? (
        <>
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
            onCompleteLesson={handleCompleteLesson}
            lessonCompletionLoading={lessonCompletionLoading}
            onQuizAttemptStateChange={handleQuizAttemptStateChange}
            onAssignmentSubmissionStateChange={handleAssignmentSubmissionStateChange}
          />

          <CourseLearnerCompletionActionPanel
            course={learnerCourse}
            existingEnrollment={existingEnrollment}
            user={user}
            onPrimaryAction={handleEnroll}
            onPageChange={onPageChange}
            onCompleteLesson={handleCompleteLesson}
            selectedLessonId={selectedLessonId}
            quizCompletionGate={selectedLessonQuizCompletionGate}
            assignmentCompletionGate={selectedLessonAssignmentCompletionGate}
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
        </>
      ) : null}

      <CourseOutlineSection modules={course.modules} />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
        <div className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Что входит в программу</h2>
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

        <div className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Итоговая аттестация</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            После завершения программы слушатель получает итоговый документ,
            доступный в личном кабинете и проверяемый через публичный реестр.
          </p>

          <button
            type="button"
            onClick={() => onPageChange("verify-document")}
            className="mt-6 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
          >
            Проверить документ
          </button>
        </div>
      </section>

      {relatedCourses.length > 0 && (
        <section className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200">
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

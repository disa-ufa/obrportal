import { formatApiError } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import {
  completeAccountCourse,
  completeAccountCourseLesson,
  downloadAccountDocument,
  getAccountActivities,
  getAccountCourseDetail,
  getAccountCourses,
  getAccountDocuments,
  getAccountSummary,
  startAccountCourse,
} from "../api/client";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";
import { LearnerAccountProfile } from "../components/account/LearnerAccountProfile";
import { LearnerAccountLayout } from "../components/account/LearnerAccountLayout";
import {
  getLearnerDashboardCurrentCourse,
  LearnerAccountDashboard,
} from "../components/account/LearnerAccountDashboard";
import { LearnerAccountLearning } from "../components/account/LearnerAccountLearning";
import { LearnerAccountAssignments } from "../components/account/LearnerAccountAssignments";
import { LearnerAccountDocuments } from "../components/account/LearnerAccountDocuments";
import { formatRuDateTimeNative as formatDateTime } from "../utils/dateFormat";
import { Alert } from "../components/ui/Alert";
import { DocumentVerificationQrBlock } from "../components/documents/DocumentVerificationQrBlock";
import { SectionCard } from "../components/ui/SectionCard";

function getStatusLabel(status) {
  switch (status) {
    case "active":
      return "Активна";
    case "assigned":
      return "Назначена";
    case "completed":
      return "Завершена";
    case "cancelled":
      return "Отменена";
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
    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

const ACCOUNT_COURSE_FILTERS = [
  { value: "", label: "Все" },
  { value: "assigned", label: "Назначены" },
  { value: "active", label: "В процессе" },
  { value: "completed", label: "Завершены" },
  { value: "cancelled", label: "Отменены" },
];

const ACCOUNT_DOCUMENT_FILTERS = [
  { value: "", label: "Все" },
  { value: "available", label: "Доступные" },
  { value: "draft", label: "Ожидают публикации" },
  { value: "revoked", label: "Отозванные" },
];

const ACCOUNT_SECTION_TARGETS = {
  overview: "account-overview",
  learning: "account-learning",
  assignments: "account-assignments",
  documents: "account-documents",
  profile: "account-profile",
};

function getInitialAccountSection() {
  try {
    const requestedSection =
      sessionStorage.getItem("obrportal_account_section") || "";

    if (
      requestedSection &&
      ACCOUNT_SECTION_TARGETS[requestedSection]
    ) {
      return requestedSection;
    }
  } catch {
    // sessionStorage may be unavailable in private mode or tests.
  }

  return "overview";
}


function calculateStatusCounts(items, getStatus) {
  const counts = {
    all: Array.isArray(items) ? items.length : 0,
  };

  if (!Array.isArray(items)) {
    return counts;
  }

  items.forEach((item) => {
    const status = getStatus(item);

    if (!status) {
      return;
    }

    counts[status] = (counts[status] || 0) + 1;
  });

  return counts;
}

function countWhere(items, predicate) {
  return Array.isArray(items) ? items.filter(predicate).length : 0;
}

function getDocumentStatusLabel(status) {
  switch (status) {
    case "available":
      return "Доступен";
    case "draft":
      return "Ожидает публикации";
    case "revoked":
      return "Отозван";
    default:
      return status || "—";
  }
}


function getDocumentStatusTone(status) {
  switch (status) {
    case "available":
      return "bg-green-50 text-green-700 ring-green-200";
    case "draft":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "revoked":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function hasDocumentVerificationTarget(documentItem) {
  return Boolean(documentItem.verification_code || documentItem.document_number);
}

function canShowPublicDocumentVerification(documentItem) {
  return documentItem.status === "available" && hasDocumentVerificationTarget(documentItem);
}

function getAccountDocumentNotice(documentItem) {
  if (documentItem.status === "available" && canDownloadDocument(documentItem)) {
    return {
      title: "Документ опубликован",
      text: "Документ доступен для скачивания. Публичная проверка подтверждает его по номеру или коду проверки.",
      toneClass: "bg-green-50 text-green-800 ring-green-200",
    };
  }

  if (documentItem.status === "available" && documentItem.file_available) {
    return {
      title: "Документ опубликован, но скачивание временно недоступно",
      text: "Файл найден, но сейчас недоступен для скачивания. Обратитесь к администратору.",
      toneClass: "bg-amber-50 text-amber-800 ring-amber-200",
    };
  }

  if (documentItem.status === "draft" && documentItem.file_available) {
    return {
      title: "Документ сформирован и ожидает публикации",
      text: "Итоговый документ подготовлен и ожидает публикации администратором. После публикации он станет доступен для скачивания и публичной проверки.",
      toneClass: "bg-amber-50 text-amber-800 ring-amber-200",
    };
  }

  if (documentItem.status === "draft") {
    return {
      title: "Документ готовится",
      text: "Документ подготавливается. После формирования и публикации он станет доступен для скачивания и публичной проверки.",
      toneClass: "bg-slate-100 text-slate-700 ring-slate-200",
    };
  }

  if (documentItem.status === "revoked") {
    return {
      title: "Документ отозван",
      text: "Документ больше нельзя использовать как действующий. Скачивание и публичная проверка для слушателя ограничены.",
      toneClass: "bg-red-50 text-red-800 ring-red-200",
    };
  }

  return {
    title: "Статус документа требует уточнения",
    text: "Текущий статус не позволяет однозначно определить доступность скачивания и публичной проверки.",
    toneClass: "bg-slate-100 text-slate-700 ring-slate-200",
  };
}

function isGeneratedPdfDocument(documentItem) {
  const documentNumber = String(documentItem.document_number || "");

  return Boolean(
    documentItem.enrollment_id &&
      documentItem.file_available &&
      documentNumber.startsWith("AUTO-")
  );
}

function getAccountDocumentDownloadLabel(documentItem) {
  if (canDownloadDocument(documentItem)) {
    return isGeneratedPdfDocument(documentItem) ? "Скачать PDF" : "Скачать документ";
  }

  if (documentItem.status === "draft" && documentItem.file_available) {
    return "Ожидает публикации";
  }

  if (documentItem.status === "draft") {
    return "Документ готовится";
  }

  if (documentItem.status === "revoked") {
    return "Документ отозван";
  }

  if (documentItem.file_available) {
    return "Недоступно";
  }

  return "Файл отсутствует";
}

function canDownloadDocument(documentItem) {
  return Boolean(
    documentItem.download_available ??
      (documentItem.status === "available" && documentItem.file_available)
  );
}

function getCourseCompletionDocument(course, documents) {
  if (!course?.enrollment_id || !Array.isArray(documents)) {
    return null;
  }

  return (
    documents.find((documentItem) => documentItem.enrollment_id === course.enrollment_id) ||
    null
  );
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

function AccountCourseProgressSummary({ detail }) {
  const progressPercent = Number(detail?.progress_percent || 0);
  const requiredProgressPercent = Number(detail?.required_progress_percent || 0);

  return (
    <div className="mt-5 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Прогресс по курсу
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {progressPercent}%
          </div>
        </div>

        <div className="text-sm leading-6 text-slate-600">
          <div>
            Всего уроков:{" "}
            <span className="font-semibold text-slate-900">
              {detail.lessons_completed} из {detail.lessons_total}
            </span>
          </div>
          <div>
            Обязательных:{" "}
            <span className="font-semibold text-slate-900">
              {detail.required_lessons_completed} из {detail.required_lessons_total}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
        <div
          className="h-full rounded-full bg-green-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-700">
            Обязательные уроки
          </span>
          <span className="font-bold text-slate-900">
            {requiredProgressPercent}%
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${requiredProgressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function AccountCourseOutline({ detail, onCompleteLesson, lessonProgressLoadingId }) {
  const modules = Array.isArray(detail?.modules) ? detail.modules : [];
  const enrollmentId = detail?.enrollment_id || "";
  const canCompleteLessons = detail?.status !== "completed";

  return (
    <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Структура обучения
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            Программа курса
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Модули и уроки, доступные слушателю в рамках этого назначения.
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-200">
          Модулей: {modules.length}
        </div>
      </div>

      <AccountCourseProgressSummary detail={detail} />

      {modules.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
          Программа курса пока не опубликована.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {modules.map((module) => {
            const lessons = Array.isArray(module.lessons) ? module.lessons : [];

            return (
              <article
                key={module.id}
                className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Модуль {module.position}
                    </div>
                    <div className="mt-1 font-bold text-slate-900">
                      {module.title}
                    </div>
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
                  <div className="mt-3 rounded-2xl bg-white p-3 text-sm text-slate-500 ring-1 ring-slate-200">
                    Уроки пока не добавлены.
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
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
                            <div className="mt-1 font-bold text-slate-900">
                              {lesson.title}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                              {getCourseLessonTypeLabel(lesson.content_type)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                              {lesson.is_required ? "Обязательный" : "Дополнительный"}
                            </span>
                            {lesson.is_completed && (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                                Пройден
                              </span>
                            )}
                          </div>
                        </div>

                        {lesson.description && (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {lesson.description}
                          </p>
                        )}

                        {lesson.content_text && (
                          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                            {lesson.content_text}
                          </div>
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

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {lesson.is_completed ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                              {lesson.completed_at
                                ? `Пройден: ${formatDateTime(lesson.completed_at)}`
                                : "Пройден"}
                            </span>
                          ) : canCompleteLessons ? (
                            <button
                              type="button"
                              onClick={() => onCompleteLesson(enrollmentId, lesson.id)}
                              disabled={lessonProgressLoadingId === `${enrollmentId}:${lesson.id}`}
                              className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {lessonProgressLoadingId === `${enrollmentId}:${lesson.id}`
                                ? "Отмечаем..."
                                : "Отметить пройденным"}
                            </button>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                              Курс завершён
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getSelectedCourseDetailForCourse(course, selectedCourseDetail) {
  if (!course?.enrollment_id || selectedCourseDetail?.enrollment_id !== course.enrollment_id) {
    return null;
  }

  return selectedCourseDetail;
}

function getCourseCompletionBlockReason(course, selectedCourseDetail) {
  const detail = getSelectedCourseDetailForCourse(course, selectedCourseDetail);

  if (!detail) {
    return "";
  }

  const requiredLessonsTotal = Number(detail.required_lessons_total || 0);
  const requiredLessonsCompleted = Number(detail.required_lessons_completed || 0);

  if (requiredLessonsTotal <= 0 || requiredLessonsCompleted >= requiredLessonsTotal) {
    return "";
  }

  return `Пройдите обязательные уроки: ${requiredLessonsCompleted} из ${requiredLessonsTotal}`;
}

function canCompleteCourseFromDetail(course, selectedCourseDetail) {
  return !getCourseCompletionBlockReason(course, selectedCourseDetail);
}

function isRequiredLessonsBackendError(err) {
  const message = String(err?.message || err?.detail || "");

  return message.includes("Complete required lessons before completing course");
}

function getAccountAttentionItems(profile, courses, documents) {
  const items = [];
  const completedCoursesCount = countWhere(courses, (course) => course.status === "completed");
  const activeCoursesCount = countWhere(courses, (course) => course.status === "active");
  const draftDocumentsCount = countWhere(documents, (documentItem) => documentItem.status === "draft");
  const revokedDocumentsCount = countWhere(documents, (documentItem) => documentItem.status === "revoked");
  const missingFileDocumentsCount = countWhere(documents, (documentItem) => !documentItem.file_available);
  const unavailablePublishedDocumentsCount = countWhere(
    documents,
    (documentItem) => documentItem.status === "available" && !canDownloadDocument(documentItem)
  );
  const unavailableVerificationDocumentsCount = countWhere(
    documents,
    (documentItem) => documentItem.status === "available" && !hasDocumentVerificationTarget(documentItem)
  );

  if (!String(profile?.email || "").trim()) {
    items.push("Профиль: не указан e-mail, пользователь не сможет стабильно получать уведомления и восстанавливать доступ.");
  }

  if (!String(profile?.full_name || "").trim()) {
    items.push("Профиль: не заполнено ФИО, сложнее сопоставить пользователя с документами и назначениями.");
  }

  if (!courses.length) {
    items.push("Обучение: нет назначенных программ, личный кабинет пока не содержит учебного маршрута.");
  }

  if (activeCoursesCount > 0 && completedCoursesCount === 0) {
    items.push("Обучение: есть активные программы, контролируйте прохождение обязательных уроков.");
  }

  if (completedCoursesCount > 0 && !documents.length) {
    items.push("Документы: есть завершённые программы, но итоговые документы ещё не отображаются.");
  }

  if (draftDocumentsCount > 0) {
    items.push("Документы: есть черновики, пользователь ждёт публикации итогового документа.");
  }

  if (revokedDocumentsCount > 0) {
    items.push("Документы: есть отозванные документы, их нельзя использовать как действующие.");
  }

  if (missingFileDocumentsCount > 0) {
    items.push("Документы: есть записи без файла, скачивание для пользователя будет недоступно.");
  }

  if (unavailablePublishedDocumentsCount > 0) {
    items.push("Скачивание: опубликованные документы есть, но скачивание закрыто или файл недоступен.");
  }

  if (unavailableVerificationDocumentsCount > 0) {
    items.push("Публичная проверка: опубликованные документы без номера или кода проверки не смогут проверяться публично.");
  }

  return [...new Set(items)];
}

function AccountAccessDiagnostics({
  profile,
  courses,
  documents,
  courseStatusCounts,
  documentStatusCounts,
  accountAttentionItems,
  onPageChange,
}) {
  return (
    <SectionCard
      title="Контроль доступа и документов"
      subtitle="Диагностика личного кабинета, обучения, документов, скачивания и публичной проверки"
    >
      <div data-testid="account-access-diagnostics" className="space-y-5">
        <div
          data-testid="account-access-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Профиль
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {profile?.email || "E-mail не указан"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Назначения
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {courseStatusCounts.all || courses.length}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              В процессе / завершены
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {(courseStatusCounts.active || 0)} / {(courseStatusCounts.completed || 0)}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Документы
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {(documentStatusCounts.available || 0)} доступно · {(documentStatusCounts.draft || 0)} черновиков · {(documentStatusCounts.revoked || 0)} отозвано
            </div>
          </div>
        </div>

        <div
          data-testid="account-access-attention"
          className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${
            accountAttentionItems.length
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-green-50 text-green-800 ring-green-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">
              Что требует внимания в личном кабинете
            </div>
            <span
              data-testid="account-access-attention-count"
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              Пунктов внимания: {accountAttentionItems.length}
            </span>
          </div>

          {accountAttentionItems.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {accountAttentionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">
              Критичных замечаний по доступу, обучению и документам не найдено.
            </p>
          )}
        </div>

        <div
          data-testid="account-access-links"
          className="flex flex-wrap gap-3"
        >
          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Открыть каталог курсов
          </button>

          <a
            href="#account-courses"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Перейти к программам
          </a>

          <a
            href="#account-documents"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Перейти к моим документам
          </a>
        </div>
      </div>
    </SectionCard>
  );
}

function countLearningWhere(items, predicate) {
  return Array.isArray(items) ? items.filter(predicate).length : 0;
}

function getLearningProgressStats({ courses, documents, selectedCourseDetail }) {
  const detail = selectedCourseDetail || {};
  const requiredLessonsTotal = Number(detail.required_lessons_total || 0);
  const requiredLessonsCompleted = Number(detail.required_lessons_completed || 0);
  const lessonsTotal = Number(detail.lessons_total || 0);
  const lessonsCompleted = Number(detail.lessons_completed || 0);

  return {
    totalCourses: courses.length,
    assignedCourses: countLearningWhere(courses, (course) => course.status === "assigned"),
    activeCourses: countLearningWhere(courses, (course) => course.status === "active"),
    completedCourses: countLearningWhere(courses, (course) => course.status === "completed"),
    draftDocuments: countLearningWhere(documents, (documentItem) => documentItem.status === "draft"),
    availableDocuments: countLearningWhere(documents, (documentItem) => documentItem.status === "available"),
    completedWithoutDocument: countLearningWhere(
      courses,
      (course) => course.status === "completed" && !getCourseCompletionDocument(course, documents)
    ),
    openedEnrollmentId: detail.enrollment_id || "",
    lessonsTotal,
    lessonsCompleted,
    requiredLessonsTotal,
    requiredLessonsCompleted,
    progressPercent: Number(detail.progress_percent || 0),
    requiredProgressPercent: Number(detail.required_progress_percent || 0),
  };
}

function getLearningProgressDiagnostics({
  courses,
  documents,
  selectedCourseDetail,
  courseActionError,
  courseDetailError,
  courseActionLoadingKey,
  lessonProgressLoadingId,
}) {
  const stats = getLearningProgressStats({ courses, documents, selectedCourseDetail });
  const items = [];

  if (!courses.length) {
    items.push("Обучение: у пользователя пока нет назначенных программ.");
  }

  if (stats.assignedCourses > 0) {
    items.push("Старт обучения: есть назначенные программы, которые пользователь ещё не начал.");
  }

  if (stats.activeCourses > 0) {
    items.push("Прогресс: есть активные программы, нужно контролировать прохождение уроков.");
  }

  if (stats.activeCourses > 0 && !selectedCourseDetail) {
    items.push("Уроки: откройте программу активного курса, чтобы увидеть модули, уроки и обязательные материалы.");
  }

  if (selectedCourseDetail && stats.lessonsTotal === 0) {
    items.push("Структура: в открытой программе нет уроков, прогресс обучения не может быть рассчитан.");
  }

  if (selectedCourseDetail && stats.requiredLessonsTotal === 0) {
    items.push("Обязательные уроки: в открытой программе нет обязательных уроков.");
  }

  if (
    selectedCourseDetail &&
    stats.requiredLessonsTotal > 0 &&
    stats.requiredLessonsCompleted < stats.requiredLessonsTotal
  ) {
    items.push(
      `Завершение: обязательные уроки пройдены не полностью (${stats.requiredLessonsCompleted} из ${stats.requiredLessonsTotal}).`
    );
  }

  if (
    selectedCourseDetail &&
    stats.requiredLessonsTotal > 0 &&
    stats.requiredLessonsCompleted >= stats.requiredLessonsTotal
  ) {
    items.push("Завершение: обязательные уроки пройдены, курс можно завершать.");
  }

  if (stats.completedCourses > 0 && stats.draftDocuments > 0) {
    items.push("Итоговый документ: есть черновики документов после завершения обучения, ожидается публикация.");
  }

  if (stats.completedWithoutDocument > 0) {
    items.push("Итоговый документ: есть завершённые программы без связанного документа в личном кабинете.");
  }

  if (stats.completedCourses > 0 && stats.availableDocuments > 0) {
    items.push("Документы: по завершённому обучению есть опубликованные итоговые документы.");
  }

  if (courseActionError) {
    items.push("Действие по курсу: последняя операция старта/завершения завершилась ошибкой.");
  }

  if (courseDetailError?.message) {
    items.push("Программа курса: не удалось загрузить структуру модулей и уроков.");
  }

  if (courseActionLoadingKey) {
    items.push("Действие по курсу: выполняется операция старта или завершения обучения.");
  }

  if (lessonProgressLoadingId) {
    items.push("Уроки: выполняется отметка урока как пройденного.");
  }

  return [...new Set(items)];
}

function LearningProgressDiagnostics({
  learningProgressStats,
  diagnostics,
  onPageChange,
}) {
  return (
    <SectionCard
      title="Контроль прохождения обучения"
      subtitle="Диагностика прогресса, обязательных уроков, завершения курса и итоговых документов"
    >
      <div data-testid="account-learning-progress-diagnostics" className="space-y-5">
        <div
          data-testid="account-learning-progress-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Назначены / активны
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {learningProgressStats.assignedCourses} / {learningProgressStats.activeCourses}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Завершены
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {learningProgressStats.completedCourses}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Уроки открытой программы
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {learningProgressStats.openedEnrollmentId
                ? `${learningProgressStats.lessonsCompleted} из ${learningProgressStats.lessonsTotal}`
                : "Программа не открыта"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Обязательные уроки
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {learningProgressStats.openedEnrollmentId
                ? `${learningProgressStats.requiredLessonsCompleted} из ${learningProgressStats.requiredLessonsTotal}`
                : "—"}
            </div>
          </div>
        </div>

        {learningProgressStats.openedEnrollmentId && (
          <div
            data-testid="account-learning-progress-opened-course"
            className="grid gap-3 md:grid-cols-2"
          >
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Общий прогресс
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {learningProgressStats.progressPercent}%
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Прогресс обязательных уроков
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {learningProgressStats.requiredProgressPercent}%
              </div>
            </div>
          </div>
        )}

        <div
          data-testid="account-learning-progress-attention"
          className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${
            diagnostics.length
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-green-50 text-green-800 ring-green-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">
              Что требует внимания в прохождении обучения
            </div>
            <span
              data-testid="account-learning-progress-attention-count"
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
              Критичных замечаний по прохождению обучения и урокам не найдено.
            </p>
          )}
        </div>

        <div
          data-testid="account-learning-progress-links"
          className="flex flex-wrap gap-3"
        >
          <a
            href="#account-courses"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Перейти к программам
          </a>

          <a
            href="#account-documents"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Перейти к документам
          </a>

          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Открыть каталог
          </button>

          <button
            type="button"
            onClick={() => onPageChange("verify-document")}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Проверить документ
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function getCompletionDocumentStats({ courses, documents }) {
  const completedCourses = Array.isArray(courses)
    ? courses.filter((course) => course.status === "completed")
    : [];

  const completionDocuments = Array.isArray(documents)
    ? documents.filter((documentItem) => documentItem.enrollment_id)
    : [];

  return {
    completedCourses: completedCourses.length,
    completionDocuments: completionDocuments.length,
    draftDocuments: countLearningWhere(completionDocuments, (documentItem) => documentItem.status === "draft"),
    availableDocuments: countLearningWhere(completionDocuments, (documentItem) => documentItem.status === "available"),
    revokedDocuments: countLearningWhere(completionDocuments, (documentItem) => documentItem.status === "revoked"),
    downloadableDocuments: countLearningWhere(completionDocuments, canDownloadDocument),
    generatedPdfDocuments: countLearningWhere(completionDocuments, isGeneratedPdfDocument),
    verificationReadyDocuments: countLearningWhere(completionDocuments, canShowPublicDocumentVerification),
    missingVerificationTarget: countLearningWhere(
      completionDocuments,
      (documentItem) => documentItem.status === "available" && !hasDocumentVerificationTarget(documentItem)
    ),
    missingFiles: countLearningWhere(completionDocuments, (documentItem) => !documentItem.file_available),
    completedWithoutDocument: countLearningWhere(
      completedCourses,
      (course) => !getCourseCompletionDocument(course, documents)
    ),
  };
}

function getCompletionDocumentDiagnostics({ courses, documents, downloadError, downloadLoadingId }) {
  const stats = getCompletionDocumentStats({ courses, documents });
  const items = [];

  if (!stats.completedCourses) {
    items.push("Завершение: пока нет завершённых программ, итоговые документы ещё не ожидаются.");
  }

  if (stats.completedCourses > 0 && !stats.completionDocuments) {
    items.push("Документы: есть завершённые программы, но итоговые документы ещё не отображаются.");
  }

  if (stats.completedWithoutDocument > 0) {
    items.push("Связь с обучением: есть завершённые программы без документа в личном кабинете.");
  }

  if (stats.draftDocuments > 0) {
    items.push("Публикация: есть черновики итоговых документов, ожидается действие администратора.");
  }

  if (stats.availableDocuments > 0) {
    items.push("Скачивание: есть опубликованные итоговые документы.");
  }

  if (stats.availableDocuments > 0 && stats.downloadableDocuments < stats.availableDocuments) {
    items.push("Скачивание: часть опубликованных документов недоступна для скачивания.");
  }

  if (stats.generatedPdfDocuments > 0) {
    items.push("PDF: есть автоматически сформированные итоговые PDF-документы.");
  }

  if (stats.missingFiles > 0) {
    items.push("Файлы: есть документы без файла, скачивание и QR-проверка могут быть ограничены.");
  }

  if (stats.verificationReadyDocuments > 0) {
    items.push("Публичная проверка: есть документы с номером или кодом проверки.");
  }

  if (stats.missingVerificationTarget > 0) {
    items.push("Публичная проверка: опубликованные документы без номера или кода не смогут проверяться публично.");
  }

  if (stats.revokedDocuments > 0) {
    items.push("Отзыв: есть отозванные итоговые документы, они недействительны для пользователя.");
  }

  if (downloadError) {
    items.push("Скачивание: последняя попытка скачать документ завершилась ошибкой.");
  }

  if (downloadLoadingId) {
    items.push("Скачивание: сейчас выполняется подготовка документа к скачиванию.");
  }

  return [...new Set(items)];
}

function CompletionDocumentsDiagnostics({
  completionDocumentStats,
  diagnostics,
  onPageChange,
}) {
  return (
    <SectionCard
      title="Контроль итоговых документов"
      subtitle="Диагностика черновиков, публикации, скачивания, QR/публичной проверки, отзыва и восстановления документов"
    >
      <div data-testid="account-completion-documents-diagnostics" className="space-y-5">
        <div
          data-testid="account-completion-documents-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Завершённые программы
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {completionDocumentStats.completedCourses}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Черновики / опубликованы
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {completionDocumentStats.draftDocuments} / {completionDocumentStats.availableDocuments}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Доступны для скачивания
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {completionDocumentStats.downloadableDocuments}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              QR/проверка
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {completionDocumentStats.verificationReadyDocuments}
            </div>
          </div>
        </div>

        <div
          data-testid="account-completion-documents-quality"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Авто PDF
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {completionDocumentStats.generatedPdfDocuments}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Отозваны
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {completionDocumentStats.revokedDocuments}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Без файла
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {completionDocumentStats.missingFiles}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Завершены без документа
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {completionDocumentStats.completedWithoutDocument}
            </div>
          </div>
        </div>

        <div
          data-testid="account-completion-documents-attention"
          className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${
            diagnostics.length
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-green-50 text-green-800 ring-green-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">
              Что требует внимания в итоговых документах
            </div>
            <span
              data-testid="account-completion-documents-attention-count"
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
              Критичных замечаний по итоговым документам не найдено.
            </p>
          )}
        </div>

        <div
          data-testid="account-completion-documents-links"
          className="flex flex-wrap gap-3"
        >
          <a
            href="#account-documents"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Перейти к моим документам
          </a>

          <a
            href="#account-courses"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Перейти к завершённым программам
          </a>

          <button
            type="button"
            onClick={() => onPageChange("verify-document")}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Публичная проверка
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function AccountEmptyState({ title, description, actionLabel, onAction, href, tone = "blue" }) {
  const toneClasses =
    tone === "amber"
      ? "bg-amber-50 text-amber-900 ring-amber-200"
      : "bg-blue-50 text-blue-900 ring-blue-200";

  const buttonClasses =
    tone === "amber"
      ? "bg-amber-600 text-white hover:bg-amber-700"
      : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <div className={`rounded-3xl p-5 text-sm leading-6 ring-1 ${toneClasses}`}>
      <div className="text-base font-semibold text-slate-950">{title}</div>
      <p className="mt-2 max-w-3xl">{description}</p>

      {(actionLabel && (onAction || href)) && (
        <div className="mt-4">
          {href ? (
            <a
              href={href}
              className={`inline-flex rounded-full px-5 py-2.5 text-sm font-semibold transition ${buttonClasses}`}
            >
              {actionLabel}
            </a>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${buttonClasses}`}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AccountCourseDocumentCard({ course, documents, onDownload, downloadLoadingId }) {
  const documentItem = getCourseCompletionDocument(course, documents);

  if (course?.status !== "completed" && !documentItem) {
    return null;
  }

  if (!documentItem) {
    return (
      <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
        <div className="font-semibold">Итоговый документ готовится</div>
        <div className="mt-1">
          После завершения обучения документ будет сформирован и появится в разделе «Мои документы».
        </div>

        <a
          href="#account-documents"
          className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
        >
          Перейти к моим документам
        </a>
      </div>
    );
  }

  const documentNotice = getAccountDocumentNotice(documentItem);
  const downloadAvailable = canDownloadDocument(documentItem);

  return (
    <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Итоговый документ
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getDocumentStatusTone(
            documentItem.status
          )}`}
        >
          {getDocumentStatusLabel(documentItem.status)}
        </span>
      </div>

      <div className={`mt-3 rounded-2xl p-4 text-sm leading-6 ring-1 ${documentNotice.toneClass}`}>
        <div className="font-semibold">{documentNotice.title}</div>
        <div className="mt-1">{documentNotice.text}</div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Номер документа
          </div>
          <div className="mt-1 break-all font-semibold text-slate-900">
            {documentItem.document_number || "—"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Код проверки
          </div>
          <div className="mt-1 break-all font-semibold text-slate-900">
            {documentItem.verification_code || "—"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onDownload(documentItem.id)}
          disabled={!downloadAvailable || downloadLoadingId === documentItem.id}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloadLoadingId === documentItem.id
            ? "Готовим..."
            : getAccountDocumentDownloadLabel(documentItem)}
        </button>

        <a
          href="#account-documents"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          Перейти к моим документам
        </a>
      </div>
    </div>
  );
}

export function AccountPage({ user, onPageChange, onLogout, onOpenCourse }) {
  const [summary, setSummary] = useState(null);
  const [coursesResponse, setCoursesResponse] = useState(null);
  const [documentsResponse, setDocumentsResponse] = useState(null);
  const [activitiesResponse, setActivitiesResponse] = useState(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadLoadingId, setDownloadLoadingId] = useState("");
  const [courseActionError, setCourseActionError] = useState("");
  const [courseActionLoadingKey, setCourseActionLoadingKey] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState("");
  const [learningStatusFilter, setLearningStatusFilter] = useState("");
  const [activityStatusFilter, setActivityStatusFilter] = useState("");
  const [documentStatusFilter, setDocumentStatusFilter] = useState("");
  const [accountNotice, setAccountNotice] = useState(null);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);
  const [courseDetailLoadingId, setCourseDetailLoadingId] = useState("");
  const [courseDetailError, setCourseDetailError] = useState(null);
  const [lessonProgressLoadingId, setLessonProgressLoadingId] = useState("");
  const [overviewCourseDetail, setOverviewCourseDetail] = useState(null);
  const [activeAccountSection, setActiveAccountSection] = useState(
    getInitialAccountSection
  );

  useEffect(() => {
    try {
      sessionStorage.removeItem("obrportal_account_section");

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
          setError(formatApiError(err, "Не удалось загрузить данные личного кабинета."));
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

  useEffect(() => {
    let cancelled = false;

    async function loadAccountActivities() {
      try {
        setActivitiesLoading(true);
        setActivitiesError("");

        const data = await getAccountActivities();

        if (!cancelled) {
          setActivitiesResponse(data);
        }
      } catch (err) {
        if (!cancelled) {
          setActivitiesError(
            formatApiError(
              err,
              "Не удалось загрузить задания и тесты."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setActivitiesLoading(false);
        }
      }
    }

    loadAccountActivities();

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

  async function refreshAccountActivities() {
    try {
      setActivitiesLoading(true);
      setActivitiesError("");

      const data = await getAccountActivities();

      setActivitiesResponse(data);
    } catch (err) {
      setActivitiesError(
        formatApiError(
          err,
          "Не удалось обновить задания и тесты."
        )
      );
    } finally {
      setActivitiesLoading(false);
    }
  }

  async function handleStartCourse(enrollmentId) {
    try {
      setCourseActionError("");
      setCourseActionLoadingKey(`${enrollmentId}:start`);

      await startAccountCourse(enrollmentId);
      await refreshAccountSnapshot();
      await refreshAccountActivities();

      setAccountNotice({
        tone: "green",
        title: "Обучение начато",
        message: "Статус программы обновлён. Теперь курс находится в работе.",
      });
    } catch (err) {
      setCourseActionError(formatApiError(err, "Не удалось начать обучение."));
    } finally {
      setCourseActionLoadingKey("");
    }
  }

  async function refreshOpenedCourseDetailAfterCompletion(enrollmentId) {
    if (selectedCourseDetail?.enrollment_id !== enrollmentId) {
      return;
    }

    const detail = await getAccountCourseDetail(enrollmentId);
    setSelectedCourseDetail(detail);
  }

  async function handleCompleteCourse(enrollmentId) {
    try {
      setCourseActionError("");
      setCourseActionLoadingKey(`${enrollmentId}:complete`);

      await completeAccountCourse(enrollmentId);
      await refreshAccountSnapshot();
      await refreshAccountActivities();
      await refreshOpenedCourseDetailAfterCompletion(enrollmentId);

      setAccountNotice({
        tone: "green",
        title: "Обучение завершено",
        message: "Курс отмечен как завершённый. Итоговый документ подготовлен и ожидает публикации администратором. После публикации он станет доступен для скачивания и публичной проверки.",
      });
    } catch (err) {
      if (isRequiredLessonsBackendError(err)) {
        setCourseActionError(
          "Сначала пройдите все обязательные уроки. Откройте программу курса и отметьте обязательные уроки как пройденные."
        );
      } else {
        setCourseActionError(formatApiError(err, "Не удалось завершить обучение."));
      }
    } finally {
      setCourseActionLoadingKey("");
    }
  }
  async function handleToggleCourseOutline(course) {
    const enrollmentId = course.enrollment_id;

    if (selectedCourseDetail?.enrollment_id === enrollmentId) {
      setSelectedCourseDetail(null);
      setCourseDetailError(null);
      return;
    }

    try {
      setCourseDetailError(null);
      setCourseDetailLoadingId(enrollmentId);

      const detail = await getAccountCourseDetail(enrollmentId);

      setSelectedCourseDetail(detail);
    } catch (err) {
      setCourseDetailError({
        enrollmentId,
        message: formatApiError(err, "Не удалось загрузить программу курса."),
      });
    } finally {
      setCourseDetailLoadingId("");
    }
  }

  async function handleLoadLearningCourseDetail(course) {
    const enrollmentId = course?.enrollment_id;

    if (!enrollmentId) {
      return;
    }

    try {
      setCourseDetailError(null);
      setCourseDetailLoadingId(enrollmentId);

      const detail = await getAccountCourseDetail(enrollmentId);

      setSelectedCourseDetail(detail);
    } catch (err) {
      setCourseDetailError({
        enrollmentId,
        message: formatApiError(
          err,
          "Не удалось загрузить прогресс по программе."
        ),
      });
    } finally {
      setCourseDetailLoadingId("");
    }
  }

  async function handleCompleteLesson(enrollmentId, lessonId) {
    try {
      setCourseDetailError(null);
      setLessonProgressLoadingId(`${enrollmentId}:${lessonId}`);

      const detail = await completeAccountCourseLesson(enrollmentId, lessonId);

      setSelectedCourseDetail(detail);
      await refreshAccountSnapshot();
      await refreshAccountActivities();

      setAccountNotice({
        tone: "green",
        title: "Урок отмечен как пройденный",
        message: "Прогресс по программе обновлён.",
      });
    } catch (err) {
      setCourseDetailError({
        enrollmentId,
        message: formatApiError(err, "Не удалось отметить урок как пройденный."),
      });
    } finally {
      setLessonProgressLoadingId("");
    }
  }

  async function handleDownload(documentId) {
    try {
      setDownloadError("");
      setDownloadLoadingId(documentId);
      await downloadAccountDocument(documentId);
    } catch (err) {
      setDownloadError(formatApiError(err, "Не удалось подготовить документ."));
    } finally {
      setDownloadLoadingId("");
    }
  }

  function handleAccountSectionChange(section) {
    setActiveAccountSection(section);

    const targetId = ACCOUNT_SECTION_TARGETS[section];

    if (!targetId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const profile = summary?.profile || user;
  const courses = coursesResponse?.items || [];
  const documents = documentsResponse?.items || [];
  const activities = activitiesResponse?.items || [];

  useEffect(() => {
    let cancelled = false;

    const currentCourse = getLearnerDashboardCurrentCourse(
      coursesResponse?.items || []
    );

    if (!currentCourse?.enrollment_id) {
      setOverviewCourseDetail(null);

      return () => {
        cancelled = true;
      };
    }

    async function loadOverviewCourseDetail() {
      try {
        const detail = await getAccountCourseDetail(
          currentCourse.enrollment_id
        );

        if (!cancelled) {
          setOverviewCourseDetail(detail);
        }
      } catch {
        if (!cancelled) {
          setOverviewCourseDetail(null);
        }
      }
    }

    setOverviewCourseDetail(null);
    loadOverviewCourseDetail();

    return () => {
      cancelled = true;
    };
  }, [coursesResponse]);

  const courseStatusCounts = useMemo(
    () => calculateStatusCounts(courses, (course) => course.status),
    [courses]
  );

  const documentStatusCounts = useMemo(
    () => calculateStatusCounts(documents, (documentItem) => documentItem.status),
    [documents]
  );

  const visibleCourses = useMemo(
    () =>
      courseStatusFilter
        ? courses.filter((course) => course.status === courseStatusFilter)
        : courses,
    [courses, courseStatusFilter]
  );

  const visibleDocuments = useMemo(
    () =>
      documentStatusFilter
        ? documents.filter((documentItem) => documentItem.status === documentStatusFilter)
        : documents,
    [documents, documentStatusFilter]
  );

  const accountAttentionItems = useMemo(
    () => getAccountAttentionItems(profile, courses, documents),
    [profile, courses, documents]
  );

  const learningProgressStats = useMemo(
    () => getLearningProgressStats({ courses, documents, selectedCourseDetail }),
    [courses, documents, selectedCourseDetail]
  );

  const learningProgressDiagnostics = useMemo(
    () =>
      getLearningProgressDiagnostics({
        courses,
        documents,
        selectedCourseDetail,
        courseActionError,
        courseDetailError,
        courseActionLoadingKey,
        lessonProgressLoadingId,
      }),
    [
      courses,
      documents,
      selectedCourseDetail,
      courseActionError,
      courseDetailError,
      courseActionLoadingKey,
      lessonProgressLoadingId,
    ]
  );

  const completionDocumentStats = useMemo(
    () => getCompletionDocumentStats({ courses, documents }),
    [courses, documents]
  );

  const completionDocumentDiagnostics = useMemo(
    () =>
      getCompletionDocumentDiagnostics({
        courses,
        documents,
        downloadError,
        downloadLoadingId,
      }),
    [courses, documents, downloadError, downloadLoadingId]
  );

  return (
    <LearnerAccountLayout
      user={profile}
      activeSection={activeAccountSection}
      onSectionChange={handleAccountSectionChange}
    >
      {accountNotice && (
        <div
          data-testid="learner-account-global-notice"
          className="mb-5"
        >
          <Alert
            title={accountNotice.title || "Уведомление"}
            tone={accountNotice.tone || "green"}
          >
            {accountNotice.message}
          </Alert>
        </div>
      )}

      <div
        id="account-overview"
        className={
          activeAccountSection === "overview"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountDashboard
          user={profile}
          summary={summary}
          courses={courses}
          documents={documents}
          currentCourseDetail={overviewCourseDetail}
          loading={loading}
          errorMessage={error}
          onSectionChange={handleAccountSectionChange}
          onOpenCourse={onOpenCourse}
        />
      </div>

      <div
        id="account-learning"
        className={
          activeAccountSection === "learning"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountLearning
          courses={courses}
          selectedStatus={learningStatusFilter}
          selectedCourseDetail={selectedCourseDetail}
          detailLoadingEnrollmentId={courseDetailLoadingId}
          actionLoadingEnrollmentId={
            courseActionLoadingKey.endsWith(":start")
              ? courseActionLoadingKey.slice(0, -6)
              : ""
          }
          loading={loading}
          errorMessage={
            error ||
            courseActionError ||
            courseDetailError?.message ||
            ""
          }
          onStatusChange={setLearningStatusFilter}
          onLoadCourseDetail={handleLoadLearningCourseDetail}
          onStartCourse={(course) =>
            handleStartCourse(course.enrollment_id)
          }
          onOpenCourse={onOpenCourse}
          onOpenCatalog={() => onPageChange("catalog")}
        />
      </div>


      <div
        id="account-assignments"
        className={
          activeAccountSection === "assignments"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountAssignments
          activities={activities}
          selectedFilter={activityStatusFilter}
          loading={activitiesLoading}
          errorMessage={activitiesError}
          onFilterChange={setActivityStatusFilter}
          onOpenCourse={onOpenCourse}
          onOpenLearning={() =>
            handleAccountSectionChange("learning")
          }
        />
      </div>

      <div
        id="account-documents"
        className={
          activeAccountSection === "documents"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountDocuments
          documents={documents}
          selectedFilter={documentStatusFilter}
          loading={loading}
          errorMessage={error}
          actionErrorMessage={downloadError}
          downloadLoadingId={downloadLoadingId}
          onFilterChange={setDocumentStatusFilter}
          onDownload={handleDownload}
          onOpenCourse={onOpenCourse}
          onOpenLearning={() =>
            handleAccountSectionChange("learning")
          }
        />
      </div>

      <div
        id="account-profile"
        className={
          activeAccountSection === "profile"
            ? "scroll-mt-24"
            : "hidden"
        }
      >
        <LearnerAccountProfile
          accountUser={profile}
        />
      </div>
      <div
        data-testid="learner-account-legacy-sections"
        className={
          activeAccountSection === "overview" ||
          activeAccountSection === "learning" ||
          activeAccountSection === "assignments" ||
          activeAccountSection === "documents" ||
          activeAccountSection === "profile"
            ? "hidden"
            : "space-y-6"
        }
      >
      <section className="rounded-shell bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Личный кабинет
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Кабинет пользователя
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Здесь собраны профиль, назначенные программы, статус обучения и итоговые
          документы пользователя.
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


      {!loading && (
        <AccountAccessDiagnostics
          profile={profile}
          courses={courses}
          documents={documents}
          courseStatusCounts={courseStatusCounts}
          documentStatusCounts={documentStatusCounts}
          accountAttentionItems={accountAttentionItems}
          onPageChange={onPageChange}
        />
      )}

      {!loading && (
        <LearningProgressDiagnostics
          learningProgressStats={learningProgressStats}
          diagnostics={learningProgressDiagnostics}
          onPageChange={onPageChange}
        />
      )}

      {!loading && (
        <CompletionDocumentsDiagnostics
          completionDocumentStats={completionDocumentStats}
          diagnostics={completionDocumentDiagnostics}
          onPageChange={onPageChange}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          title="Учётная запись"
          subtitle="Данные для входа и идентификации пользователя в ОбрПортале"
        >
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
                  : "После завершения программы здесь появятся итоговые документы и их статусы."}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div id="account-courses" className="scroll-mt-24">
        <SectionCard
          title="Назначенные программы"
          subtitle="Программы, назначенные вам администратором или выбранные из каталога"
        >
        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            Загрузка программ...
          </div>
        ) : courses.length === 0 ? (
          <AccountEmptyState
            title="Пока нет назначенных программ"
            description="Когда администратор назначит обучение или вы выберете доступную программу из каталога, она появится в этом разделе. Здесь будут видны статус, прогресс, уроки и итоговый документ после завершения."
            actionLabel="Перейти в каталог"
            onAction={() => onPageChange("catalog")}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="xl:col-span-2">
              <AdminQuickFilterButtons
                items={ACCOUNT_COURSE_FILTERS}
                activeValue={courseStatusFilter}
                counts={courseStatusCounts}
                onChange={setCourseStatusFilter}
              />
            </div>

            {visibleCourses.length === 0 && (
              <div className="xl:col-span-2">
                <AccountEmptyState
                  title="Нет программ с выбранным статусом"
                  description="Сбросьте фильтр или выберите другой статус, чтобы увидеть остальные назначенные программы."
                  actionLabel="Показать все программы"
                  onAction={() => setCourseStatusFilter("")}
                  tone="amber"
                />
              </div>
            )}

            {visibleCourses.map((course) => (
              <article
                key={course.enrollment_id}
                className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
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

                <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                  {course.course_title}
                </h2>

                {course.course_description && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {course.course_description}
                  </p>
                )}

                <div className="mt-5 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Часы
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {course.hours ?? "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Итоговый документ
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {course.document_type || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Организация
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {course.organization_name || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Группа
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {course.learning_group_name || "—"}
                    </div>
                  </div>
                </div>

                {(course.started_at || course.completed_at) && (
                  <div className="mt-5 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Начато
                      </div>
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatDateTime(course.started_at)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Завершено
                      </div>
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatDateTime(course.completed_at)}
                      </div>
                    </div>
                  </div>
                )}
                <AccountCourseDocumentCard
                  course={course}
                  documents={documents}
                  onDownload={handleDownload}
                  downloadLoadingId={downloadLoadingId}
                />

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course.course_slug)}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Открыть карточку курса
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleCourseOutline(course)}
                    disabled={courseDetailLoadingId === course.enrollment_id}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {courseDetailLoadingId === course.enrollment_id
                      ? "Загружаем..."
                      : selectedCourseDetail?.enrollment_id === course.enrollment_id
                        ? "Скрыть программу"
                        : "Открыть программу"}
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
                      disabled={
                        courseActionLoadingKey === `${course.enrollment_id}:complete` ||
                        !canCompleteCourseFromDetail(course, selectedCourseDetail)
                      }
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {courseActionLoadingKey === `${course.enrollment_id}:complete`
                        ? "Завершаем..."
                        : "Завершить обучение"}
                    </button>
                  )}

                  {course.status === "active" &&
                    getCourseCompletionBlockReason(course, selectedCourseDetail) && (
                      <div className="w-full rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                        {getCourseCompletionBlockReason(course, selectedCourseDetail)}
                      </div>
                    )}

                  {course.status === "completed" && (
                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                      Обучение завершено
                    </span>
                  )}
                </div>

                {courseDetailError?.enrollmentId === course.enrollment_id && (
                  <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200">
                    {courseDetailError.message}
                  </div>
                )}

                {selectedCourseDetail?.enrollment_id === course.enrollment_id && (
                  <AccountCourseOutline
                    detail={selectedCourseDetail}
                    onCompleteLesson={handleCompleteLesson}
                    lessonProgressLoadingId={lessonProgressLoadingId}
                  />
                )}
              </article>
            ))}
          </div>
        )}
        </SectionCard>
      </div>

      <div id="account-documents-legacy" className="scroll-mt-24">
        <SectionCard
        title="Мои документы"
        subtitle="Статусы, проверка и скачивание итоговых документов"
      >
        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            Загрузка документов...
          </div>
        ) : documents.length === 0 ? (
          <AccountEmptyState
            title="Пока нет доступных документов"
            description="Итоговые документы появятся здесь после завершения программы и публикации администратором. Когда документ будет доступен, вы сможете скачать его и открыть публичную проверку по номеру или QR-коду."
            actionLabel="Перейти к программам"
            href="#account-courses"
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="xl:col-span-2">
              <AdminQuickFilterButtons
                items={ACCOUNT_DOCUMENT_FILTERS}
                activeValue={documentStatusFilter}
                counts={documentStatusCounts}
                onChange={setDocumentStatusFilter}
              />
            </div>

            {visibleDocuments.length === 0 && (
              <div className="xl:col-span-2">
                <AccountEmptyState
                  title="Нет документов с выбранным статусом"
                  description="Сбросьте фильтр или выберите другой статус, чтобы увидеть остальные документы в личном кабинете."
                  actionLabel="Показать все документы"
                  onAction={() => setDocumentStatusFilter("")}
                  tone="amber"
                />
              </div>
            )}

            {visibleDocuments.map((documentItem) => {
              const downloadAvailable = canDownloadDocument(documentItem);
              const documentNotice = getAccountDocumentNotice(documentItem);
              const showPublicVerification = canShowPublicDocumentVerification(documentItem);
              const isGeneratedPdf = isGeneratedPdfDocument(documentItem);

              return (
                <article
                key={documentItem.id}
                className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getDocumentStatusTone(
                      documentItem.status
                    )}`}
                  >
                    {getDocumentStatusLabel(documentItem.status)}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                    {documentItem.document_type}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                    {isGeneratedPdf ? "PDF сформирован" : documentItem.file_available ? "Файл сформирован" : "Файл не сформирован"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${
                      downloadAvailable
                        ? "bg-green-50 text-green-700 ring-green-200"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}
                  >
                    {downloadAvailable ? "Скачивание доступно" : "Скачивание закрыто"}
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                  {documentItem.title}
                </h2>

                <div className={`mt-4 rounded-2xl p-4 text-sm ring-1 ${documentNotice.toneClass}`}>
                  <div className="font-semibold">{documentNotice.title}</div>
                  <p className="mt-1 leading-6">{documentNotice.text}</p>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Номер документа
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {documentItem.document_number}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Код проверки
                    </div>
                    <div className="mt-2 break-all font-semibold text-slate-900">
                      {documentItem.verification_code || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Курс
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {documentItem.course_title || "—"}
                    </div>
                  </div>
                </div>

                {documentItem.status === "revoked" && (
                  <div className="mt-5 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                    <div className="rounded-2xl bg-red-50 p-4 text-red-800 ring-1 ring-red-200">
                      <div className="text-xs font-semibold uppercase tracking-wide text-red-600">
                        {"\u0414\u0430\u0442\u0430 \u043e\u0442\u0437\u044b\u0432\u0430"}
                      </div>
                      <div className="mt-2 font-semibold">
                        {formatDateTime(documentItem.revoked_at)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-red-50 p-4 text-red-800 ring-1 ring-red-200">
                      <div className="text-xs font-semibold uppercase tracking-wide text-red-600">
                        {"\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u043e\u0442\u0437\u044b\u0432\u0430"}
                      </div>
                      <div className="mt-2 font-semibold">
                        {documentItem.revocation_reason || "-"}
                      </div>
                    </div>
                  </div>
                )}

                {showPublicVerification && (
                  <DocumentVerificationQrBlock
                    code={documentItem.verification_code}
                    documentNumber={documentItem.document_number}
                    containerId={`account-document-qr-${documentItem.id}`}
                    title="QR-код проверки"
                    description="По этому QR-коду можно открыть публичную проверку опубликованного документа."
                    showPublicLink
                    showCopyLink
                    publicLinkLabel="Проверить публично"
                    className="mt-5"
                  />
                )}

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
                    onClick={() => handleDownload(documentItem.id)}
                    disabled={!downloadAvailable || downloadLoadingId === documentItem.id}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white ring-1 ring-slate-900 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadLoadingId === documentItem.id
                      ? "Готовим..."
                      : getAccountDocumentDownloadLabel(documentItem)}
                  </button>
                </div>
                </article>
              );
            })}
          </div>
        )}
        </SectionCard>
      </div>
      </div>
    </LearnerAccountLayout>
  );
}

import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileText,
  GraduationCap,
  PlayCircle,
  UserRound,
} from "lucide-react";


function countWhere(items, predicate) {
  return Array.isArray(items) ? items.filter(predicate).length : 0;
}


function getDisplayName(user) {
  return String(user?.full_name || user?.email || "слушатель").trim();
}


function getCourseDateValue(course) {
  const value =
    course?.started_at ||
    course?.completed_at ||
    "";

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : 0;
}


export function getLearnerDashboardCurrentCourse(courses) {
  if (!Array.isArray(courses) || courses.length === 0) {
    return null;
  }

  const active = courses
    .filter((course) => course.status === "active")
    .sort((left, right) => getCourseDateValue(right) - getCourseDateValue(left));

  if (active.length > 0) {
    return active[0];
  }

  const assigned = courses.filter((course) => course.status === "assigned");

  if (assigned.length > 0) {
    return assigned[0];
  }

  const completed = courses
    .filter((course) => course.status === "completed")
    .sort((left, right) => getCourseDateValue(right) - getCourseDateValue(left));

  return completed[0] || courses[0];
}


function getMatchingCourseDetail(currentCourse, currentCourseDetail) {
  if (
    !currentCourse?.enrollment_id ||
    currentCourseDetail?.enrollment_id !== currentCourse.enrollment_id
  ) {
    return null;
  }

  return currentCourseDetail;
}


function getNextLesson(detail) {
  if (!detail?.modules?.length) {
    return null;
  }

  const lessons = detail.modules.flatMap((module) =>
    (module.lessons || []).map((lesson) => ({
      ...lesson,
      moduleTitle: module.title,
      modulePosition: module.position,
    }))
  );

  return (
    lessons.find(
      (lesson) => !lesson.is_completed
    ) || null
  );
}


function getLearningActivities(detail) {
  if (!detail?.modules?.length) {
    return [];
  }

  return detail.modules.flatMap((module) =>
    (module.lessons || []).flatMap((lesson) =>
      (lesson.blocks || [])
        .filter(
          (block) =>
            block.is_active !== false &&
            (block.block_type === "quiz" || block.block_type === "assignment")
        )
        .map((block) => ({
          id: block.id,
          type: block.block_type,
          title:
            String(block.title || "").trim() ||
            (block.block_type === "quiz"
              ? "Тестирование"
              : "Практическое задание"),
          lessonTitle: lesson.title,
          moduleTitle: module.title,
          required: Boolean(block.is_required),
        }))
    )
  );
}


function getDocumentStatusLabel(status) {
  switch (status) {
    case "available":
      return "Доступен";

    case "draft":
      return "Готовится";

    case "revoked":
      return "Отозван";

    default:
      return status || "Статус не указан";
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
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}


function DashboardStatCard({
  icon: Icon,
  label,
  value,
  secondary,
  tone = "blue",
}) {
  const iconClass =
    tone === "green"
      ? "bg-green-50 text-green-600 ring-green-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600 ring-amber-100"
        : tone === "violet"
          ? "bg-violet-50 text-violet-600 ring-violet-100"
          : "bg-blue-50 text-blue-600 ring-blue-100";

  return (
    <div
      data-testid="learner-dashboard-stat"
      className="flex min-h-[92px] items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconClass}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-500">
          {label}
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-slate-950">
            {value}
          </span>

          {secondary && (
            <span className="text-xs font-medium text-slate-400">
              {secondary}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


function SectionHeading({ title, actionLabel, onAction }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-tight text-slate-950">
        {title}
      </h2>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 transition hover:text-blue-800"
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}


function ProfileStateItem({ ready, children }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      {ready ? (
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-green-500"
          aria-hidden="true"
        />
      ) : (
        <CircleAlert
          className="h-4 w-4 shrink-0 text-amber-500"
          aria-hidden="true"
        />
      )}

      <span>{children}</span>
    </div>
  );
}


export function LearnerAccountDashboard({
  user,
  summary,
  courses = [],
  documents = [],
  currentCourseDetail = null,
  loading = false,
  errorMessage = "",
  onSectionChange,
  onOpenLearningCourse,
  onResumeLearningCourse,
}) {
  const currentCourse = getLearnerDashboardCurrentCourse(courses);
  const detail = getMatchingCourseDetail(
    currentCourse,
    currentCourseDetail
  );

  const activeCoursesCount = countWhere(
    courses,
    (course) => course.status === "active"
  );

  const assignedCoursesCount = countWhere(
    courses,
    (course) => course.status === "assigned"
  );

  const availableDocumentsCount = countWhere(
    documents,
    (documentItem) => documentItem.status === "available"
  );

  const nextLesson =
    currentCourse?.status === "active"
      ? getNextLesson(detail)
      : null;

  const activities =
    ["active", "completed"].includes(
      currentCourse?.status
    )
      ? getLearningActivities(detail).slice(0, 3)
      : [];

  const visibleDocuments = Array.isArray(documents)
    ? documents.slice(0, 2)
    : [];

  const totalCourses =
    summary?.enrollments_count ??
    courses.length;

  const progressPercent = Number(
    detail?.required_progress_percent || 0
  );

  function openSection(section) {
    onSectionChange?.(section);
  }

  return (
    <div
      data-testid="learner-account-dashboard"
      aria-busy={loading}
      className="space-y-5"
    >
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          Загружаем данные личного кабинета.
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200"
        >
          <div className="font-bold">
            Не удалось загрузить личный кабинет
          </div>
          <div className="mt-1">
            {errorMessage}
          </div>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-7">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
            Слушатель
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Здравствуйте, {getDisplayName(user)}!
          </h1>

          {currentCourse ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {currentCourse.status === "active"
                ? "Вы продолжаете обучение по программе"
                : currentCourse.status === "assigned"
                  ? "Можно начать обучение по программе"
                  : "Последняя программа"}{" "}
              <span className="font-bold text-slate-800">
                «{currentCourse.course_title}»
              </span>
              {nextLesson && (
                <>
                  . Следующий шаг —{" "}
                  <span className="font-bold text-slate-800">
                    {nextLesson.title}
                  </span>
                  .
                </>
              )}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Здесь появится ваш учебный маршрут, когда у вас появится программа обучения.
            </p>
          )}
        </div>

        <div
          aria-hidden="true"
          className="absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-blue-50"
        />

        <div
          aria-hidden="true"
          className="absolute bottom-5 right-8 hidden h-20 w-28 items-center justify-center rounded-3xl bg-white/70 text-blue-600 ring-1 ring-blue-100 md:flex"
        >
          <GraduationCap className="h-12 w-12" />
        </div>
      </section>

      <section
        aria-label="Сводка личного кабинета"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <DashboardStatCard
          icon={BookOpen}
          label="Всего программ"
          value={loading ? "—" : totalCourses}
          secondary="в кабинете"
        />

        <DashboardStatCard
          icon={PlayCircle}
          label="В процессе"
          value={loading ? "—" : activeCoursesCount}
          secondary={`из ${totalCourses}`}
          tone="green"
        />

        <DashboardStatCard
          icon={CircleAlert}
          label="Не начаты"
          value={loading ? "—" : assignedCoursesCount}
          secondary="программ"
          tone="amber"
        />

        <DashboardStatCard
          icon={FileText}
          label="Документы"
          value={loading ? "—" : availableDocumentsCount}
          secondary={`${documents.length} всего`}
          tone="violet"
        />
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <SectionHeading
              title="Текущая программа"
              actionLabel="Все программы"
              onAction={() => openSection("learning")}
            />

            {!currentCourse ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                Пока нет программ обучения.
              </div>
            ) : (
              <div className="rounded-2xl bg-white ring-1 ring-slate-200">
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-slate-950">
                        {currentCourse.course_title}
                      </h3>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {currentCourse.organization_name && (
                          <span>
                            {currentCourse.organization_name}
                          </span>
                        )}

                        {currentCourse.hours && (
                          <span>
                            {currentCourse.hours} ч.
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={
                        currentCourse.status === "active"
                          ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100"
                          : currentCourse.status === "assigned"
                            ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100"
                            : currentCourse.status === "completed"
                              ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100"
                              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
                      }
                    >
                      {currentCourse.status === "active"
                        ? "В процессе"
                        : currentCourse.status === "assigned"
                          ? "Не начато"
                          : currentCourse.status === "completed"
                            ? "Завершена"
                            : currentCourse.status === "cancelled"
                              ? "Отменена"
                              : currentCourse.status}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                      <span>Общий прогресс</span>
                      <span className="text-slate-800">
                        {detail ? `${progressPercent}%` : "После открытия программы"}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{
                          width: detail
                            ? `${Math.min(100, Math.max(0, progressPercent))}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>

                  {detail
                  && ["active", "completed"].includes(
                    currentCourse.status
                  ) && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <div className="text-xs font-semibold text-slate-400">
                          Пройдено уроков
                        </div>

                        <div className="mt-1 font-black text-slate-900">
                          {detail.lessons_completed} из {detail.lessons_total}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <div className="text-xs font-semibold text-slate-400">
                          {currentCourse.status === "completed"
                            ? "Результат"
                            : "Следующий шаг"}
                        </div>

                        <div className="mt-1 line-clamp-2 font-bold text-slate-900">
                          {currentCourse.status === "completed"
                            ? "Программа пройдена"
                            : nextLesson?.title || "Все уроки пройдены"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 border-t border-slate-100 p-4">
                  {currentCourse.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() =>
                        onResumeLearningCourse?.(
                          currentCourse,
                          nextLesson?.id || ""
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      <PlayCircle className="h-4 w-4" aria-hidden="true" />
                      {currentCourse.status === "assigned"
                        ? "Начать обучение"
                        : currentCourse.status === "active"
                          ? "Продолжить обучение"
                          : "Посмотреть программу"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <SectionHeading
              title="Все мои программы"
              actionLabel="Все программы"
              onAction={() => openSection("learning")}
            />

            {courses.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                Программ обучения пока нет.
              </div>
            ) : (
              <div className="space-y-2">
                {courses.slice(0, 3).map((course) => (
                  <button
                    key={course.enrollment_id}
                    type="button"
                    onClick={() =>
                      onOpenLearningCourse?.(
                        course
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen className="h-5 w-5" aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {course.course_title}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {course.hours ? `${course.hours} ч.` : "Программа обучения"}
                      </div>
                    </div>

                    <span className="hidden text-xs font-bold text-slate-500 sm:block">
                      {course.status === "active"
                        ? "В процессе"
                        : course.status === "completed"
                          ? "Завершена"
                          : course.status === "assigned"
                            ? "Не начато"
                            : course.status === "cancelled"
                              ? "Отменена"
                              : course.status}
                    </span>

                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-slate-300"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <SectionHeading
              title="Задания и тесты"
              actionLabel="Перейти"
              onAction={() => openSection("assignments")}
            />

            {currentCourse?.status === "cancelled" ? (
              <div className="rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                Обучение по этой программе отменено.
              </div>
            ) : currentCourse?.status === "assigned" ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
                Начните обучение, чтобы перейти к заданиям и тестам программы.
              </div>
            ) : !detail ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500 ring-1 ring-slate-200">
                Откройте текущую программу, чтобы увидеть опубликованные задания и тесты.
              </div>
            ) : activities.length === 0 ? (
              <div className="rounded-2xl bg-green-50 p-4 text-sm leading-6 text-green-700 ring-1 ring-green-100">
                В текущей программе нет опубликованных заданий и тестов.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activities.map((activity) => {
                  const Icon =
                    activity.type === "quiz"
                      ? ClipboardCheck
                      : GraduationCap;

                  return (
                    <button
                      key={activity.id}
                      type="button"
                      onClick={() => openSection("assignments")}
                      className="flex w-full items-start gap-3 py-3 text-left first:pt-0 last:pb-0"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900">
                          {activity.title}
                        </div>

                        <div className="mt-1 line-clamp-1 text-xs text-slate-400">
                          {activity.moduleTitle} · {activity.lessonTitle}
                        </div>
                      </div>

                      {activity.required && (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                          Обязательно
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <SectionHeading
              title="Мои документы"
              actionLabel="Все документы"
              onAction={() => openSection("documents")}
            />

            {visibleDocuments.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500 ring-1 ring-slate-200">
                Итоговые документы появятся после завершения обучения и публикации.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleDocuments.map((documentItem) => (
                  <button
                    key={documentItem.id}
                    type="button"
                    onClick={() => openSection("documents")}
                    className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-200 transition hover:bg-white"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 ring-1 ring-slate-200">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-bold text-slate-900">
                        {documentItem.title}
                      </div>

                      <div className="mt-1 truncate text-xs text-slate-400">
                        № {documentItem.document_number}
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-bold ring-1 ${getDocumentStatusTone(
                        documentItem.status
                      )}`}
                    >
                      {getDocumentStatusLabel(documentItem.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <SectionHeading
              title="Профиль"
              actionLabel="Открыть профиль"
              onAction={() => openSection("profile")}
            />

            <div className="space-y-3">
              <ProfileStateItem ready={Boolean(user?.full_name)}>
                ФИО указано
              </ProfileStateItem>

              <ProfileStateItem ready={Boolean(user?.email)}>
                E-mail указан
              </ProfileStateItem>

              <ProfileStateItem ready={Boolean(user?.is_email_verified)}>
                E-mail подтверждён
              </ProfileStateItem>
            </div>

            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-800 ring-1 ring-blue-100">
              Перед завершением обучения проверьте персональные данные — они используются при формировании итоговых документов.
            </div>
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-3xl bg-blue-50 p-5 ring-1 ring-blue-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-100">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>

          <div>
            <div className="text-sm font-black text-slate-900">
              Ваши данные и документы
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Проверяйте профиль перед завершением обучения, чтобы итоговые документы были сформированы корректно.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openSection("profile")}
          className="shrink-0 text-sm font-bold text-blue-600 transition hover:text-blue-800"
        >
          Проверить профиль →
        </button>
      </section>
    </div>
  );
}

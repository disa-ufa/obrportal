import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  GraduationCap,
  PlayCircle,
} from "lucide-react";


const LEARNING_FILTERS = [
  {
    value: "",
    label: "Все",
  },
  {
    value: "active",
    label: "В процессе",
  },
  {
    value: "assigned",
    label: "Ожидают начала",
  },
  {
    value: "completed",
    label: "Завершены",
  },
];


function countWhere(items, predicate) {
  return Array.isArray(items)
    ? items.filter(predicate).length
    : 0;
}


function getStatusLabel(status) {
  switch (status) {
    case "assigned":
      return "Ожидает начала";

    case "active":
      return "В процессе";

    case "completed":
      return "Завершена";

    default:
      return status || "Статус не указан";
  }
}


function getStatusTone(status) {
  switch (status) {
    case "assigned":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "active":
      return "bg-green-50 text-green-700 ring-green-200";

    case "completed":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}


function getCourseActionLabel(status) {
  switch (status) {
    case "assigned":
      return "Начать обучение";

    case "active":
      return "Продолжить обучение";

    case "completed":
      return "Посмотреть программу";

    default:
      return "Открыть программу";
  }
}


function LearningStat({
  icon: Icon,
  label,
  value,
  tone = "blue",
}) {
  const toneClass =
    tone === "green"
      ? "bg-green-50 text-green-600 ring-green-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600 ring-amber-100"
        : tone === "violet"
          ? "bg-violet-50 text-violet-600 ring-violet-100"
          : "bg-blue-50 text-blue-600 ring-blue-100";

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClass}`}
      >
        <Icon
          className="h-5 w-5"
          aria-hidden="true"
        />
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500">
          {label}
        </div>

        <div className="mt-1 text-xl font-black text-slate-950">
          {value}
        </div>
      </div>
    </div>
  );
}


function LearningFilterButton({
  active,
  label,
  count,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span>{label}</span>

      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active
            ? "bg-white/20 text-white"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}


function CourseMetaItem({
  label,
  value,
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-400">
        {label}
      </div>

      <div className="mt-1 line-clamp-2 text-sm font-bold text-slate-800">
        {value || "—"}
      </div>
    </div>
  );
}


function CourseProgress({
  detail,
  detailLoading,
}) {
  if (detailLoading) {
    return (
      <div
        data-testid="learner-learning-progress-loading"
        className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
      >
        <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-3 h-2 animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(detail.progress_percent || 0)
    )
  );

  return (
    <div
      data-testid="learner-learning-course-progress"
      className="mt-5"
    >
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="text-slate-500">
          Прогресс
        </span>

        <span className="text-slate-900">
          {progress}%
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <div className="mt-2 text-xs text-slate-400">
        Пройдено уроков:{" "}
        <span className="font-bold text-slate-600">
          {detail.lessons_completed || 0} из {detail.lessons_total || 0}
        </span>
      </div>
    </div>
  );
}


function LearningCourseCard({
  course,
  detail,
  detailLoading,
  actionLoading,
  onOpenCourse,
  onLoadDetail,
  onStartCourse,
}) {
  const actionLabel = getCourseActionLabel(
    course.status
  );

  function handlePrimaryAction() {
    if (course.status === "assigned") {
      onStartCourse?.(course);
      return;
    }

    onLoadDetail?.(course);
  }

  return (
    <article
      data-testid="learner-learning-course-card"
      className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
    >
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusTone(
                course.status
              )}`}
            >
              {getStatusLabel(course.status)}
            </span>

            {course.format && (
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                {course.format}
              </span>
            )}
          </div>

          {course.hours && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Clock3
                className="h-4 w-4"
                aria-hidden="true"
              />
              {course.hours} ч.
            </div>
          )}
        </div>

        <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950">
          {course.course_title}
        </h2>

        {course.course_description && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
            {course.course_description}
          </p>
        )}

        <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2">
          <CourseMetaItem
            label="Организация"
            value={course.organization_name}
          />

          <CourseMetaItem
            label="Учебная группа"
            value={course.learning_group_name}
          />

          <CourseMetaItem
            label="Итоговый документ"
            value={course.document_type}
          />

          <CourseMetaItem
            label="Статус"
            value={getStatusLabel(course.status)}
          />
        </div>

        <CourseProgress
          detail={detail}
          detailLoading={detailLoading}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 p-4 md:px-6">
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {course.status === "completed" ? (
            <CheckCircle2
              className="h-4 w-4"
              aria-hidden="true"
            />
          ) : (
            <PlayCircle
              className="h-4 w-4"
              aria-hidden="true"
            />
          )}

          {actionLoading
            ? "Подождите..."
            : actionLabel}
        </button>

        <button
          type="button"
          onClick={() => onLoadDetail?.(course)}
          disabled={detailLoading}
          className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {detail
            ? "Обновить прогресс"
            : "Показать прогресс"}

          <ChevronRight
            className="h-4 w-4"
            aria-hidden="true"
          />
        </button>

        {course.course_slug && onOpenCourse && (
          <button
            type="button"
            onClick={() => onOpenCourse(course.course_slug)}
            className="ml-auto text-sm font-bold text-slate-500 transition hover:text-slate-900"
          >
            О программе
          </button>
        )}
      </div>
    </article>
  );
}


export function LearnerAccountLearning({
  courses = [],
  selectedStatus = "",
  selectedCourseDetail = null,
  detailLoadingEnrollmentId = "",
  actionLoadingEnrollmentId = "",
  loading = false,
  errorMessage = "",
  onStatusChange,
  onLoadCourseDetail,
  onStartCourse,
  onOpenCourse,
  onOpenCatalog,
}) {
  const totalCount = courses.length;

  const activeCount = countWhere(
    courses,
    (course) => course.status === "active"
  );

  const assignedCount = countWhere(
    courses,
    (course) => course.status === "assigned"
  );

  const completedCount = countWhere(
    courses,
    (course) => course.status === "completed"
  );

  const filteredCourses = selectedStatus
    ? courses.filter(
        (course) => course.status === selectedStatus
      )
    : courses;

  const filterCounts = {
    "": totalCount,
    active: activeCount,
    assigned: assignedCount,
    completed: completedCount,
  };

  return (
    <div
      data-testid="learner-account-learning"
      className="space-y-5"
    >
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <GraduationCap
              className="h-6 w-6"
              aria-hidden="true"
            />
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Учебный кабинет
            </div>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              Моё обучение
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Здесь собраны назначенные программы, их статус и текущий прогресс обучения.
            </p>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200"
        >
          {errorMessage}
        </div>
      )}

      <section
        aria-label="Сводка по обучению"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <LearningStat
          icon={BookOpen}
          label="Всего программ"
          value={loading ? "—" : totalCount}
        />

        <LearningStat
          icon={PlayCircle}
          label="В процессе"
          value={loading ? "—" : activeCount}
          tone="green"
        />

        <LearningStat
          icon={CircleAlert}
          label="Ожидают начала"
          value={loading ? "—" : assignedCount}
          tone="amber"
        />

        <LearningStat
          icon={CheckCircle2}
          label="Завершено"
          value={loading ? "—" : completedCount}
          tone="violet"
        />
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-5">
        <div className="flex flex-wrap gap-2">
          {LEARNING_FILTERS.map((filter) => (
            <LearningFilterButton
              key={filter.value || "all"}
              active={selectedStatus === filter.value}
              label={filter.label}
              count={filterCounts[filter.value] || 0}
              onClick={() => onStatusChange?.(filter.value)}
            />
          ))}
        </div>
      </section>

      {loading ? (
        <section
          data-testid="learner-learning-loading"
          className="grid gap-4 xl:grid-cols-2"
        >
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
            />
          ))}
        </section>
      ) : courses.length === 0 ? (
        <section
          data-testid="learner-learning-empty"
          className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BookOpen
              className="h-7 w-7"
              aria-hidden="true"
            />
          </div>

          <h2 className="mt-4 text-xl font-black text-slate-950">
            Пока нет назначенных программ
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            После назначения программы она появится здесь. Также можно посмотреть доступные программы в каталоге.
          </p>

          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Перейти в каталог
            </button>
          )}
        </section>
      ) : filteredCourses.length === 0 ? (
        <section
          data-testid="learner-learning-filter-empty"
          className="rounded-3xl bg-amber-50 p-6 text-sm leading-6 text-amber-800 ring-1 ring-amber-200"
        >
          С выбранным статусом программ нет.
        </section>
      ) : (
        <section
          data-testid="learner-learning-course-list"
          className="grid gap-4 xl:grid-cols-2"
        >
          {filteredCourses.map((course) => (
            <LearningCourseCard
              key={course.enrollment_id}
              course={course}
              detail={
                selectedCourseDetail?.enrollment_id ===
                course.enrollment_id
                  ? selectedCourseDetail
                  : null
              }
              detailLoading={
                detailLoadingEnrollmentId ===
                course.enrollment_id
              }
              actionLoading={
                actionLoadingEnrollmentId ===
                course.enrollment_id
              }
              onLoadDetail={onLoadCourseDetail}
              onStartCourse={onStartCourse}
              onOpenCourse={onOpenCourse}
            />
          ))}
        </section>
      )}
    </div>
  );
}
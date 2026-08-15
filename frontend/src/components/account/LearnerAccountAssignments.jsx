import {
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  ListChecks,
  ShieldAlert,
} from "lucide-react";


const ACTIVITY_FILTERS = [
  {
    value: "",
    label: "Все",
  },
  {
    value: "action",
    label: "Требуют внимания",
  },
  {
    value: "review",
    label: "На проверке",
  },
  {
    value: "completed",
    label: "Выполнены",
  },
];


function countWhere(items, predicate) {
  return Array.isArray(items)
    ? items.filter(predicate).length
    : 0;
}


function matchesFilter(activity, filter) {
  if (!filter) {
    return true;
  }

  if (filter === "action") {
    return Boolean(activity.requires_action);
  }

  return activity.status === filter;
}


function getActivityTypeLabel(type) {
  if (type === "quiz") {
    return "Тест";
  }

  if (type === "assignment") {
    return "Задание";
  }

  return type || "Активность";
}


function getActivityStatusLabel(status) {
  switch (status) {
    case "not_started":
      return "Не начато";
    case "in_progress":
      return "В процессе";
    case "review":
      return "На проверке";
    case "completed":
      return "Выполнено";
    case "blocked":
      return "Попытки исчерпаны";
    default:
      return status || "—";
  }
}


function getActivityStatusTone(status) {
  switch (status) {
    case "completed":
      return "bg-green-50 text-green-700 ring-green-200";
    case "review":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "in_progress":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "blocked":
      return "bg-red-50 text-red-700 ring-red-200";
    case "not_started":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}


function getReviewModeLabel(mode) {
  switch (mode) {
    case "manual_review":
      return "Проверка преподавателем";
    case "submit_only":
      return "Отправка ответа";
    case "self_check":
      return "Самопроверка";
    default:
      return mode || "—";
  }
}


function getSubmissionStatusLabel(status) {
  switch (status) {
    case "not_started":
      return "Не отправлено";
    case "submitted":
      return "Отправлено";
    case "approved":
      return "Принято";
    case "completed":
      return "Выполнено";
    case "rejected":
      return "Требует доработки";
    default:
      return status || "—";
  }
}


function ActivityStat({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-blue-600 ring-1 ring-slate-200">
          <Icon size={21} />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-950">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}


function FilterButton({
  item,
  active,
  count,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {item.label}

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


function QuizDetails({ activity }) {
  const attemptsUsed = Number(
    activity.attempts_used || 0
  );

  const maxAttempts = activity.max_attempts;

  const attemptsText =
    maxAttempts === null ||
    maxAttempts === undefined
      ? `${attemptsUsed}`
      : `${attemptsUsed} из ${maxAttempts}`;

  const remainingText =
    activity.remaining_attempts === null ||
    activity.remaining_attempts === undefined
      ? "Без ограничения"
      : `${activity.remaining_attempts}`;

  const resultText =
    activity.best_percent === null ||
    activity.best_percent === undefined
      ? "—"
      : `${activity.best_percent}%`;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">
          Попытки
        </div>
        <div className="mt-1 font-semibold text-slate-900">
          {attemptsText}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">
          Лучший результат
        </div>
        <div className="mt-1 font-semibold text-slate-900">
          {resultText}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">
          Осталось попыток
        </div>
        <div className="mt-1 font-semibold text-slate-900">
          {remainingText}
        </div>
      </div>
    </div>
  );
}


function AssignmentDetails({ activity }) {
  const scoreText =
    activity.score === null ||
    activity.score === undefined
      ? "—"
      : activity.max_score === null ||
          activity.max_score === undefined
        ? `${activity.score}`
        : `${activity.score} из ${activity.max_score}`;

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">
            Формат проверки
          </div>
          <div className="mt-1 font-semibold text-slate-900">
            {getReviewModeLabel(activity.review_mode)}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">
            Ответ
          </div>
          <div className="mt-1 font-semibold text-slate-900">
            {getSubmissionStatusLabel(
              activity.submission_status
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">
            Оценка
          </div>
          <div className="mt-1 font-semibold text-slate-900">
            {scoreText}
          </div>
        </div>
      </div>

      {activity.review_comment && (
        <div className="mt-3 rounded-2xl bg-violet-50 p-4 text-sm leading-6 text-violet-900 ring-1 ring-violet-200">
          <div className="font-semibold">
            Комментарий по проверке
          </div>
          <div className="mt-1">
            {activity.review_comment}
          </div>
        </div>
      )}
    </>
  );
}


function ActivityCard({
  activity,
  onOpenCourse,
}) {
  const isQuiz = activity.activity_type === "quiz";

  const title =
    activity.block_title ||
    (isQuiz ? "Тест" : "Практическое задание");

  return (
    <article
      data-testid="learner-assignment-card"
      className="rounded-3xl bg-white p-5 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              {getActivityTypeLabel(
                activity.activity_type
              )}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getActivityStatusTone(
                activity.status
              )}`}
            >
              {getActivityStatusLabel(
                activity.status
              )}
            </span>

            {activity.is_required && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Обязательное
              </span>
            )}
          </div>

          <h3 className="mt-4 text-xl font-bold text-slate-950">
            {title}
          </h3>

          <p className="mt-2 text-sm font-medium text-slate-700">
            {activity.course_title}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {activity.module_title} · {activity.lesson_title}
          </p>
        </div>

        {activity.requires_action && (
          <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            <ShieldAlert size={16} />
            Требует внимания
          </div>
        )}
      </div>

      {isQuiz ? (
        <QuizDetails activity={activity} />
      ) : (
        <AssignmentDetails activity={activity} />
      )}

      {activity.status === "review" && (
        <div className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm text-violet-800 ring-1 ring-violet-200">
          Ответ отправлен и ожидает проверки.
        </div>
      )}

      {activity.status === "blocked" && (
        <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          Доступные попытки исчерпаны. Откройте программу, чтобы проверить дальнейшие действия.
        </div>
      )}

      {activity.status === "completed" && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-green-50 p-3 text-sm font-medium text-green-800 ring-1 ring-green-200">
          <CheckCircle2 size={17} />
          Активность выполнена.
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() =>
            onOpenCourse?.(activity.course_slug)
          }
          disabled={!activity.course_slug}
          className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Открыть программу
        </button>

        <span className="text-xs text-slate-500">
          Задание находится в уроке «{activity.lesson_title}»
        </span>
      </div>
    </article>
  );
}


export function LearnerAccountAssignments({
  activities = [],
  selectedFilter = "",
  loading = false,
  errorMessage = "",
  onFilterChange,
  onOpenCourse,
  onOpenLearning,
}) {
  const safeActivities = Array.isArray(activities)
    ? activities
    : [];

  const counts = {
    all: safeActivities.length,
    action: countWhere(
      safeActivities,
      (activity) => activity.requires_action
    ),
    review: countWhere(
      safeActivities,
      (activity) => activity.status === "review"
    ),
    completed: countWhere(
      safeActivities,
      (activity) => activity.status === "completed"
    ),
  };

  const visibleActivities = safeActivities.filter(
    (activity) =>
      matchesFilter(activity, selectedFilter)
  );

  return (
    <section
      data-testid="learner-account-assignments"
      aria-busy={loading}
      className="space-y-5"
    >
      <div className="rounded-shell bg-white p-7 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <ClipboardCheck size={24} />
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Учебный кабинет
            </div>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Задания и тесты
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Здесь собраны тесты и практические задания из назначенных программ, их состояние и результаты.
            </p>
          </div>
        </div>
      </div>

      <div
        data-testid="learner-assignments-stats"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <ActivityStat
          icon={ListChecks}
          label="Всего"
          value={counts.all}
        />

        <ActivityStat
          icon={ShieldAlert}
          label="Требуют внимания"
          value={counts.action}
        />

        <ActivityStat
          icon={ClipboardCheck}
          label="На проверке"
          value={counts.review}
        />

        <ActivityStat
          icon={FileCheck2}
          label="Выполнено"
          value={counts.completed}
        />
      </div>

      <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
        <div
          data-testid="learner-assignment-filters"
          className="flex flex-wrap gap-2"
        >
          {ACTIVITY_FILTERS.map((item) => (
            <FilterButton
              key={item.value || "all"}
              item={item}
              active={selectedFilter === item.value}
              count={
                item.value
                  ? counts[item.value]
                  : counts.all
              }
              onClick={() =>
                onFilterChange?.(item.value)
              }
            />
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          data-testid="learner-assignments-error"
          role="alert"
          className="rounded-3xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200"
        >
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div
          data-testid="learner-assignments-loading"
          role="status"
          aria-live="polite"
          aria-label="Загружаем задания и тесты"
          className="space-y-4"
        >
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200"
            />
          ))}
        </div>
      ) : safeActivities.length === 0 ? (
        <div
          data-testid="learner-assignments-empty"
          className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ClipboardCheck size={27} />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-950">
            Пока нет заданий и тестов
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Когда в ваших программах появятся тесты или практические задания, они будут собраны здесь.
          </p>

          {onOpenLearning && (
            <button
              type="button"
              onClick={onOpenLearning}
              className="mt-5 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Открыть моё обучение
            </button>
          )}
        </div>
      ) : visibleActivities.length === 0 ? (
        <div
          data-testid="learner-assignments-filter-empty"
          className="rounded-3xl bg-white px-6 py-12 text-center text-sm text-slate-600 ring-1 ring-slate-200"
        >
          В этой категории сейчас ничего нет.
        </div>
      ) : (
        <div
          data-testid="learner-assignments-list"
          className="space-y-4"
        >
          {visibleActivities.map((activity) => (
            <ActivityCard
              key={`${activity.enrollment_id}:${activity.block_id}`}
              activity={activity}
              onOpenCourse={onOpenCourse}
            />
          ))}
        </div>
      )}
    </section>
  );
}

import { formatApiError } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { getAccountCourses, getPublicCourses } from "../api/client";

function formatCourseDocument(course) {
  return course.document_type || course.document || "Итоговый документ";
}

function formatCoursePrice(course) {
  return course.price || "Стоимость уточняется";
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

function buildEnrollmentMap(accountCourses) {
  return accountCourses.reduce((acc, enrollment) => {
    if (enrollment.course_id) {
      acc.byCourseId[enrollment.course_id] = enrollment;
    }

    if (enrollment.course_slug) {
      acc.byCourseSlug[enrollment.course_slug] = enrollment;
    }

    return acc;
  }, { byCourseId: {}, byCourseSlug: {} });
}

function getCourseEnrollment(course, enrollmentMap) {
  return enrollmentMap.byCourseId[course.id] || enrollmentMap.byCourseSlug[course.slug] || null;
}

function getCourseActionLabel(enrollment) {
  if (!enrollment) {
    return "Подробнее / записаться";
  }

  if (enrollment.status === "completed") {
    return "Программа завершена";
  }

  return "Открыть в кабинете";
}

function getFormatOptions(courses) {
  const formats = courses
    .map((course) => course.format)
    .filter(Boolean);

  return Array.from(new Set(formats)).sort();
}

function countWhere(items, predicate) {
  return items.filter(predicate).length;
}

function getCatalogDiagnostics({
  courses,
  filteredCourses,
  accountCourses,
  query,
  formatFilter,
  loading,
  error,
  user,
  formatOptions,
}) {
  const items = [];
  const normalizedQuery = query.trim();
  const activeEnrollmentsCount = countWhere(accountCourses, (course) => course.status === "active");
  const completedEnrollmentsCount = countWhere(accountCourses, (course) => course.status === "completed");
  const assignedEnrollmentsCount = countWhere(accountCourses, (course) => course.status === "assigned");

  if (loading) {
    items.push("Каталог: список публичных программ загружается.");
  }

  if (error) {
    items.push("Каталог: не удалось загрузить публичные программы, проверьте API и доступность backend.");
  }

  if (!loading && !error && courses.length === 0) {
    items.push("Каталог: нет опубликованных программ для публичной витрины.");
  }

  if (normalizedQuery) {
    items.push("Поиск: применён текстовый фильтр по названию, slug, описанию, формату или документу.");
  }

  if (formatFilter !== "all") {
    items.push("Формат: применён фильтр по формату обучения.");
  }

  if (!loading && !error && courses.length > 0 && filteredCourses.length === 0) {
    items.push("Выдача: по текущим условиям программы не найдены, стоит сбросить фильтры.");
  }

  if (!formatOptions.length && courses.length > 0) {
    items.push("Форматы: у программ не заполнены форматы, фильтрация по формату ограничена.");
  }

  if (!user) {
    items.push("Самозапись: пользователь не авторизован, карточка курса ведёт к регистрации перед записью.");
  }

  if (user && accountCourses.length === 0) {
    items.push("Самозапись: у пользователя пока нет записей на программы из каталога.");
  }

  if (assignedEnrollmentsCount > 0) {
    items.push("Назначения: есть назначенные программы, которые ожидают старта обучения.");
  }

  if (activeEnrollmentsCount > 0) {
    items.push("Назначения: есть активные программы, переход из каталога ведёт в личный кабинет.");
  }

  if (completedEnrollmentsCount > 0) {
    items.push("Завершение: есть завершённые программы, проверьте итоговые документы в личном кабинете.");
  }

  return [...new Set(items)];
}

function CatalogDiagnostics({
  courses,
  filteredCourses,
  accountCourses,
  query,
  formatFilter,
  loading,
  error,
  user,
  formatOptions,
  diagnostics,
}) {
  return (
    <section
      data-testid="catalog-public-diagnostics"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Диагностика каталога
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Публичный каталог и самозапись
          </h2>
        </div>

        <span
          data-testid="catalog-public-status"
          className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
        >
          {loading ? "Загрузка" : error ? "Ошибка" : `${filteredCourses.length} из ${courses.length}`}
        </span>
      </div>

      <div
        data-testid="catalog-public-summary"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Всего программ
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {courses.length}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            В выдаче
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {filteredCourses.length}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Форматы
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {formatOptions.length || "—"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Мои записи
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {user ? accountCourses.length : "Требуется вход"}
          </div>
        </div>
      </div>

      <div
        data-testid="catalog-public-filters"
        className="mt-5 grid gap-3 md:grid-cols-2"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Поисковый запрос
          </div>
          <div className="mt-2 break-all font-semibold text-slate-900">
            {query.trim() || "Без поиска"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Фильтр формата
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {formatFilter === "all" ? "Все форматы" : formatFilter}
          </div>
        </div>
      </div>

      <div
        data-testid="catalog-public-attention"
        className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${
          error || (!loading && !error && filteredCourses.length === 0)
            ? "bg-amber-50 text-amber-900 ring-amber-200"
            : "bg-green-50 text-green-800 ring-green-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-slate-900">
            Что требует внимания в каталоге
          </div>
          <span
            data-testid="catalog-public-attention-count"
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            Пунктов диагностики: {diagnostics.length}
          </span>
        </div>

        <ul className="mt-2 list-disc space-y-1 pl-5">
          {diagnostics.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div
        data-testid="catalog-public-links"
        className="mt-5 flex flex-wrap gap-3"
      >
        <button
          type="button"
          onClick={() => onPageChange("account")}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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


function CatalogLearnerJourneyHint({ user, accountCourses, onPageChange }) {
  const enrollments = Array.isArray(accountCourses) ? accountCourses : [];
  const assignedCount = countWhere(enrollments, (course) => course.status === "assigned");
  const activeCount = countWhere(enrollments, (course) => course.status === "active");
  const completedCount = countWhere(enrollments, (course) => course.status === "completed");

  const primaryActionLabel = user
    ? enrollments.length > 0
      ? "Открыть мои программы"
      : "Открыть личный кабинет"
    : "Войти или зарегистрироваться";

  const primaryActionPage = user ? "account" : "register";

  const statusText = user
    ? enrollments.length > 0
      ? `В кабинете: назначено ${assignedCount}, в процессе ${activeCount}, завершено ${completedCount}.`
      : "После записи программа появится в личном кабинете."
    : "После регистрации выбранная программа будет сохранена и доступна для записи.";

  return (
    <section
      data-testid="catalog-learner-journey"
      className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-200">
            Маршрут обучения
          </div>
          <h2 className="mt-2 text-2xl font-bold">
            Каталог → карточка курса → личный кабинет
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Выберите программу в каталоге, откройте подробную карточку, запишитесь или
            перейдите к уже назначенному обучению в личном кабинете.
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20">
          {statusText}
        </div>
      </div>

      <div
        data-testid="catalog-learner-journey-steps"
        className="mt-5 grid gap-3 md:grid-cols-3"
      >
        {[
          ["1", "Выберите программу", "Используйте поиск и фильтр формата, чтобы найти подходящий курс."],
          ["2", "Откройте карточку", "Посмотрите описание, объём, документ и структуру обучения."],
          ["3", "Продолжите в кабинете", "После записи курс и итоговые документы будут доступны в личном кабинете."],
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

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="catalog-learner-journey-primary-action"
          onClick={() => onPageChange(primaryActionPage)}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          {primaryActionLabel}
        </button>

        <button
          type="button"
          data-testid="catalog-learner-journey-verify-action"
          onClick={() => onPageChange("verify-document")}
          className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
        >
          Проверить документ
        </button>
      </div>
    </section>
  );
}


function CatalogEmptyState({ courses, query, formatFilter, resetFilters, onPageChange }) {
  const hasPublishedCourses = courses.length > 0;
  const hasActiveFilters = query.trim() || formatFilter !== "all";

  const title = hasPublishedCourses
    ? "По текущим фильтрам ничего не найдено"
    : "Пока нет опубликованных программ";

  const description = hasPublishedCourses
    ? "Измените поисковый запрос или сбросьте фильтры, чтобы вернуться к полному списку программ."
    : "Каталог уже готов к отображению программ. Когда администратор опубликует курсы, они появятся здесь автоматически.";

  const hint = hasPublishedCourses && hasActiveFilters
    ? "Сейчас применены условия поиска или фильтра формата."
    : "Можно перейти в личный кабинет или проверить ранее выданный документ.";

  return (
    <section
      data-testid="catalog-empty-state"
      className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200"
    >
      <div className="max-w-3xl">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Пустая выдача
        </div>
        <h2
          data-testid="catalog-empty-state-title"
          className="mt-2 text-2xl font-bold text-slate-900"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <p
          data-testid="catalog-empty-state-hint"
          className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200"
        >
          {hint}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {hasPublishedCourses && (
          <button
            type="button"
            data-testid="catalog-empty-state-reset-action"
            onClick={resetFilters}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Сбросить фильтры
          </button>
        )}

        <button
          type="button"
          data-testid="catalog-empty-state-account-action"
          onClick={() => onPageChange("account")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          Личный кабинет
        </button>

        <button
          type="button"
          data-testid="catalog-empty-state-verify-action"
          onClick={() => onPageChange("verify-document")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          Проверить документ
        </button>
      </div>
    </section>
  );
}

export function CatalogPage({ onPageChange, onOpenCourse, user }) {
  const [courses, setCourses] = useState([]);
  const [accountCourses, setAccountCourses] = useState([]);
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatOptions = useMemo(() => getFormatOptions(courses), [courses]);
  const enrollmentMap = useMemo(() => buildEnrollmentMap(accountCourses), [accountCourses]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          course.title,
          course.slug,
          course.description,
          course.format,
          course.document_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesFormat =
        formatFilter === "all" || course.format === formatFilter;

      return matchesQuery && matchesFormat;
    });
  }, [courses, formatFilter, query]);

  const catalogDiagnostics = useMemo(
    () =>
      getCatalogDiagnostics({
        courses,
        filteredCourses,
        accountCourses,
        query,
        formatFilter,
        loading,
        error,
        user,
        formatOptions,
      }),
    [courses, filteredCourses, accountCourses, query, formatFilter, loading, error, user, formatOptions]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        setLoading(true);
        setError("");

        const [coursesResponse, accountCoursesResponse] = await Promise.all([
          getPublicCourses({ limit: 300 }),
          user ? getAccountCourses() : Promise.resolve(null),
        ]);

        if (!isMounted) {
          return;
        }

        setCourses(Array.isArray(coursesResponse) ? coursesResponse : []);
        setAccountCourses(
          Array.isArray(accountCoursesResponse?.items) ? accountCoursesResponse.items : []
        );
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(formatApiError(err, "Не удалось загрузить каталог программ."));
        setCourses([]);
        setAccountCourses([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  function resetFilters() {
    setQuery("");
    setFormatFilter("all");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Каталог программ
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Образовательные программы
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Здесь собраны доступные образовательные программы. Выберите подходящий
          курс, откройте карточку и запишитесь на обучение.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-3 lg:grid-cols-[1fr_240px_auto]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск: название, slug, описание, документ"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <select
            value={formatFilter}
            onChange={(event) => setFormatFilter(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Все форматы</option>
            {formatOptions.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Сбросить
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
          <span>Найдено программ: {filteredCourses.length}</span>
          {user && <span>Мои записи в каталоге: {accountCourses.length}</span>}
        </div>
      </section>

      <CatalogLearnerJourneyHint
        user={user}
        accountCourses={accountCourses}
        onPageChange={onPageChange}
      />

      <CatalogDiagnostics
        courses={courses}
        filteredCourses={filteredCourses}
        accountCourses={accountCourses}
        query={query}
        formatFilter={formatFilter}
        loading={loading}
        error={error}
        user={user}
        formatOptions={formatOptions}
        diagnostics={catalogDiagnostics}
        onPageChange={onPageChange}
      />

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
          Загружаем каталог...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : filteredCourses.length === 0 ? (
        <CatalogEmptyState
          courses={courses}
          query={query}
          formatFilter={formatFilter}
          resetFilters={resetFilters}
          onPageChange={onPageChange}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => {
            const enrollment = getCourseEnrollment(course, enrollmentMap);

            return (
            <article
              key={course.id}
              className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap gap-2">
                {course.format && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {course.format}
                  </span>
                )}
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                  {formatCourseDocument(course)}
                </span>
                {user && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getEnrollmentStatusTone(
                      enrollment?.status
                    )}`}
                  >
                    {getEnrollmentStatusLabel(enrollment?.status)}
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                {course.title}
              </h2>

              <div className="mt-1 text-sm text-slate-500">
                /courses/{course.slug}
              </div>

              {course.description && (
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">
                  {course.description}
                </p>
              )}

              <div className="mt-5 grid gap-2 text-sm text-slate-600">
                <div>Объём: {course.hours ? `${course.hours} ч.` : "—"}</div>
                <div>Цена: {formatCoursePrice(course)}</div>
                <div>Документ: {formatCourseDocument(course)}</div>
              </div>

              <button
                type="button"
                onClick={() => (enrollment ? onPageChange("account") : onOpenCourse(course.slug))}
                className="mt-6 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {getCourseActionLabel(enrollment)}
              </button>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
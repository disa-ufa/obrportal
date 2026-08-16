import { formatApiError } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  Search,
  X,
} from "lucide-react";
import { getAccountCourses, getPublicCourses } from "../api/client";

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
      return "";
  }
}

function getEnrollmentStatusTone(status) {
  switch (status) {
    case "assigned":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "completed":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
}

function buildEnrollmentMap(accountCourses) {
  return accountCourses.reduce(
    (acc, enrollment) => {
      if (enrollment.course_id) {
        acc.byCourseId[enrollment.course_id] = enrollment;
      }

      if (enrollment.course_slug) {
        acc.byCourseSlug[enrollment.course_slug] = enrollment;
      }

      return acc;
    },
    { byCourseId: {}, byCourseSlug: {} },
  );
}

function getCourseEnrollment(course, enrollmentMap) {
  return (
    enrollmentMap.byCourseId[course.id] ||
    enrollmentMap.byCourseSlug[course.slug] ||
    null
  );
}

function getCourseActionLabel(enrollment) {
  if (!enrollment) {
    return "Подробнее";
  }

  if (enrollment.status === "completed") {
    return "Открыть в кабинете";
  }

  return "Продолжить обучение";
}

function formatCourseDocument(course) {
  return course.document_type || "";
}

function formatCourseFormat(value) {
  const normalized = `${value || ""}`.trim().toLowerCase();

  switch (normalized) {
    case "online":
      return "Онлайн";
    case "offline":
      return "Очно";
    case "hybrid":
    case "mixed":
      return "Смешанный";
    default:
      return `${value || ""}`.trim();
  }
}

function getFormatOptions(courses) {
  return Array.from(
    new Set(
      courses
        .map((course) => `${course.format || ""}`.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) =>
    formatCourseFormat(left).localeCompare(
      formatCourseFormat(right),
      "ru",
    ),
  );
}

function getDocumentOptions(courses) {
  return Array.from(
    new Set(
      courses
        .map((course) => `${course.document_type || ""}`.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ru"));
}

function getDirectionOptions(courses) {
  return Array.from(
    new Set(
      courses
        .map((course) => `${course.direction || ""}`.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ru"));
}

function getCatalogGridClass(courseCount) {
  if (courseCount <= 1) {
    return "grid gap-6 lg:grid-cols-2";
  }

  if (courseCount === 2) {
    return "grid gap-6 md:grid-cols-2";
  }

  return "grid gap-6 md:grid-cols-2 xl:grid-cols-3";
}
function getInitialCatalogQuery() {
  if (typeof sessionStorage === "undefined") {
    return "";
  }

  return (
    sessionStorage.getItem("obrportal_catalog_query") || ""
  );
}

function getInitialCatalogDirection() {
  if (typeof sessionStorage === "undefined") {
    return "all";
  }

  const value = `${
    sessionStorage.getItem("obrportal_catalog_direction") || ""
  }`.trim();

  return value || "all";
}

function CourseCard({
  course,
  user,
  enrollment,
  onOpenCourse,
  onPageChange,
}) {
  const documentLabel = formatCourseDocument(course);
  const formatLabel = formatCourseFormat(course.format);
  const enrollmentLabel = getEnrollmentStatusLabel(
    enrollment?.status,
  );

  function handlePrimaryAction() {
    if (enrollment) {
      onPageChange("account");
      return;
    }

    onOpenCourse(course.slug || course.id);
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_40px_rgba(17,25,54,0.05)] transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_55px_rgba(15,91,232,0.10)]">
      <div className="relative flex min-h-[160px] items-end overflow-hidden bg-gradient-to-br from-[#102856] via-[#1e58a8] to-[#5b8fe6] p-5 text-white">
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-16 left-12 h-40 w-40 rounded-full bg-sky-300/15"
        />

        <div className="relative flex w-full items-end justify-between gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 text-blue-700 shadow-lg">
            <BookOpen className="h-7 w-7" aria-hidden="true" />
          </span>

          {formatLabel ? (
            <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">
              {formatLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h2 className="text-xl font-black leading-7 text-[#111936]">
          {course.title}
        </h2>

        {course.description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
            {course.description}
          </p>
        ) : null}

        {course.hours || documentLabel ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {course.hours ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {course.hours} ч.
              </span>
            ) : null}

            {documentLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {documentLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {user && enrollmentLabel ? (
          <div className="mt-4">
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ring-1 ${getEnrollmentStatusTone(
                enrollment.status,
              )}`}
            >
              {enrollmentLabel}
            </span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handlePrimaryAction}
          className="mt-6 inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-[#111936] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          {getCourseActionLabel(enrollment)}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
  );
}

function CatalogEmptyState({
  hasFilters,
  resetFilters,
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
        <Search className="h-7 w-7" aria-hidden="true" />
      </div>

      <h2 className="mt-4 text-xl font-black text-[#111936]">
        {hasFilters
          ? "По вашему запросу ничего не найдено"
          : "Опубликованных программ пока нет"}
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {hasFilters
          ? "Измените запрос или сбросьте фильтры, чтобы увидеть другие программы."
          : "Новые программы появятся здесь после публикации."}
      </p>

      {hasFilters ? (
        <button
          type="button"
          onClick={resetFilters}
          className="portal-btn-secondary mt-5"
        >
          Сбросить фильтры
        </button>
      ) : null}
    </section>
  );
}

export function CatalogPage({
  onPageChange,
  onOpenCourse,
  user,
}) {
  const [courses, setCourses] = useState([]);
  const [accountCourses, setAccountCourses] = useState([]);
  const [query, setQuery] = useState(
    () => getInitialCatalogQuery(),
  );
  const [directionFilter, setDirectionFilter] = useState(
    () => getInitialCatalogDirection(),
  );
  const [formatFilter, setFormatFilter] = useState("all");
  const [documentFilter, setDocumentFilter] =
    useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const enrollmentMap = useMemo(
    () => buildEnrollmentMap(accountCourses),
    [accountCourses],
  );

  const directionOptions = useMemo(
    () => getDirectionOptions(courses),
    [courses],
  );

  const formatOptions = useMemo(
    () => getFormatOptions(courses),
    [courses],
  );

  const documentOptions = useMemo(
    () => getDocumentOptions(courses),
    [courses],
  );

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return courses.filter((course) => {
      const searchableText = [
        course.title,
        course.slug,
        course.description,
        course.direction,
        course.format,
        course.document_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        !normalizedQuery ||
        searchableText.includes(normalizedQuery);

      const matchesDirection =
        directionFilter === "all" ||
        `${course.direction || ""}`.trim() ===
          directionFilter;

      const matchesFormat =
        formatFilter === "all" ||
        course.format === formatFilter;

      const matchesDocument =
        documentFilter === "all" ||
        course.document_type === documentFilter;

      return (
        matchesQuery &&
        matchesDirection &&
        matchesFormat &&
        matchesDocument
      );
    });
  }, [
    courses,
    query,
    directionFilter,
    formatFilter,
    documentFilter,
  ]);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") {
      return;
    }

    sessionStorage.removeItem("obrportal_catalog_query");
    sessionStorage.removeItem("obrportal_catalog_direction");
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        setLoading(true);
        setError("");

        const coursesResponse =
          await getPublicCourses({ limit: 300 });

        if (!isMounted) {
          return;
        }

        setCourses(
          Array.isArray(coursesResponse)
            ? coursesResponse
            : [],
        );

        if (!user) {
          setAccountCourses([]);
          return;
        }

        try {
          const accountResponse =
            await getAccountCourses();

          if (!isMounted) {
            return;
          }

          setAccountCourses(
            Array.isArray(accountResponse?.items)
              ? accountResponse.items
              : [],
          );
        } catch {
          if (isMounted) {
            setAccountCourses([]);
          }
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          formatApiError(
            err,
            "Не удалось загрузить каталог программ.",
          ),
        );
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
    setDirectionFilter("all");
    setFormatFilter("all");
    setDocumentFilter("all");
  }

  const hasFilters =
    Boolean(query.trim()) ||
    directionFilter !== "all" ||
    formatFilter !== "all" ||
    documentFilter !== "all";

  return (
    <div className="public-catalog-page space-y-7 md:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100/80 bg-gradient-to-br from-white via-[#f8fbff] to-[#edf5ff] px-5 py-8 shadow-[0_24px_70px_rgba(15,91,232,0.07)] sm:px-7 sm:py-9 md:px-10 lg:px-12 lg:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => onPageChange("home")}
              className="transition hover:text-blue-700"
            >
              Главная
            </button>
            <span aria-hidden="true">›</span>
            <span>Программы</span>
          </div>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.03em] text-[#111936] sm:text-5xl md:text-6xl">
                Каталог программ
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                Найдите опубликованную программу, изучите условия обучения и откройте подробную информацию.
              </p>
            </div>

            <div className="w-fit rounded-2xl border border-blue-100 bg-white/90 px-5 py-3 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                В каталоге
              </div>
              <div className="mt-1 text-lg font-black text-blue-700">
                {loading
                  ? "Загрузка..."
                  : `${courses.length} ${
                      courses.length === 1
                        ? "программа"
                        : "программ"
                    }`}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="catalog-search-title"
        className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_16px_45px_rgba(17,25,54,0.05)] sm:p-6 lg:p-7"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="catalog-search-title"
            className="text-xl font-black text-[#111936]"
          >
            Поиск по каталогу
          </h2>
          <p className="text-sm leading-6 text-slate-500">
            Поиск и фильтры используют только данные опубликованных программ.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_240px_190px_220px_auto]">
          <label className="flex h-12 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
            <Search
              className="h-5 w-5 shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <span className="sr-only">
              Поиск программ
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Название или ключевое слово..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>

          <label>
            <span className="sr-only">
              {"\u041d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"}
            </span>
            <select
              value={directionFilter}
              onChange={(event) =>
                setDirectionFilter(event.target.value)
              }
              className="portal-input h-12"
              data-testid="catalog-direction-filter"
            >
              <option value="all">
                {"\u0412\u0441\u0435 \u043d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f"}
              </option>

              {directionFilter !== "all" &&
              !directionOptions.includes(directionFilter) ? (
                <option value={directionFilter}>
                  {directionFilter}
                </option>
              ) : null}

              {directionOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">
              Формат обучения
            </span>
            <select
              value={formatFilter}
              onChange={(event) =>
                setFormatFilter(event.target.value)
              }
              className="portal-input h-12"
            >
              <option value="all">
                Все форматы
              </option>

              {formatOptions.map((value) => (
                <option key={value} value={value}>
                  {formatCourseFormat(value)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">
              Итоговый документ
            </span>
            <select
              value={documentFilter}
              onChange={(event) =>
                setDocumentFilter(
                  event.target.value,
                )
              }
              className="portal-input h-12"
            >
              <option value="all">
                Все документы
              </option>

              {documentOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-600 transition enabled:hover:border-blue-200 enabled:hover:bg-blue-50 enabled:hover:text-blue-700 disabled:cursor-default disabled:opacity-40"
          >
            <X
              className="h-4 w-4"
              aria-hidden="true"
            />
            Сбросить
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-500">
            {loading
              ? "Загружаем программы..."
              : `Найдено: ${filteredCourses.length}`}
          </div>

          {hasFilters ? (
            <div className="text-xs font-bold text-blue-700">
              Применены фильтры каталога
            </div>
          ) : null}
        </div>

        <div hidden data-testid="catalog-public-diagnostics">
          <div data-testid="catalog-public-summary">
            Всего программ: {courses.length}. В выдаче:{" "}
            {filteredCourses.length}. Поиск:{" "}
            {query || "без поиска"}.
          </div>
        </div>
      </section>

      {error ? (
        <section
          role="alert"
          className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6"
        >
          <h2 className="text-lg font-black text-[#111936]">
            Не удалось загрузить каталог
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {error}
          </p>
        </section>
      ) : loading ? (
        <section
          aria-label="Загрузка каталога"
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
              aria-hidden="true"
            >
              <div className="h-40 animate-pulse bg-slate-100" />
              <div className="space-y-3 p-6">
                <div className="h-6 w-4/5 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </div>
          ))}
        </section>
      ) : filteredCourses.length === 0 ? (
        <CatalogEmptyState
          hasFilters={hasFilters}
          resetFilters={resetFilters}
        />
      ) : (
        <section
          aria-label="Опубликованные программы"
          className={getCatalogGridClass(filteredCourses.length)}
        >
          {filteredCourses.map((course) => {
            const enrollment =
              getCourseEnrollment(
                course,
                enrollmentMap,
              );

            return (
              <CourseCard
                key={course.id || course.slug}
                course={course}
                user={user}
                enrollment={enrollment}
                onOpenCourse={onOpenCourse}
                onPageChange={onPageChange}
              />
            );
          })}
        </section>
      )}
    </div>
  );
}
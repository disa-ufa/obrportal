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

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
          Загружаем каталог...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-[2rem] bg-white p-8 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
          <div className="font-semibold text-slate-900">Программы не найдены</div>
          <p className="mt-2 leading-6">
            По выбранным условиям ничего не найдено. Попробуйте изменить фильтры
            или вернуться к полному списку программ.
          </p>
        </div>
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
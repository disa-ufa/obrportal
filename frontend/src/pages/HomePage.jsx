import { useEffect, useState } from "react";
import { getPublicCourses } from "../api/client";

function formatCourseDocument(course) {
  return course.document_type || course.document || "Итоговый документ";
}

function formatCoursePrice(course) {
  return course.price || "Стоимость уточняется";
}

export function HomePage({ onPageChange, onOpenCourse }) {
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedCourses() {
      try {
        setLoadingCourses(true);
        setCoursesError("");

        const response = await getPublicCourses({ limit: 3 });

        if (!isMounted) {
          return;
        }

        setFeaturedCourses(Array.isArray(response) ? response : []);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setCoursesError(`${err.status || ""} ${err.message || "Не удалось загрузить программы."}`.trim());
        setFeaturedCourses([]);
      } finally {
        if (isMounted) {
          setLoadingCourses(false);
        }
      }
    }

    loadFeaturedCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-10">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-12">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Публичный сайт и каталог
        </div>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
          Образовательная платформа для обучения, документов и проверки результатов
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
          Каталог программ, личный кабинет слушателя, электронные документы и публичная
          проверка выданных документов в едином контуре ObrPortal.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Перейти в каталог
          </button>

          <button
            type="button"
            onClick={() => onPageChange("verify-document")}
            className="rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Проверить документ
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Популярные программы</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Карточки загружаются из backend через публичный API курсов.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Все программы
          </button>
        </div>

        {loadingCourses ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            Загружаем программы...
          </div>
        ) : coursesError ? (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            {coursesError}
          </div>
        ) : featuredCourses.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            Пока нет опубликованных активных программ. Создайте и активируйте курс в админке.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {featuredCourses.map((course) => (
              <article
                key={course.id}
                className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap gap-2">
                  {course.format && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                      {course.format}
                    </span>
                  )}
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                    {formatCourseDocument(course)}
                  </span>
                </div>

                <div className="mt-4 text-xl font-bold text-slate-900">
                  {course.title}
                </div>

                {course.description && (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {course.description}
                  </p>
                )}

                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  <div>Объём: {course.hours ? `${course.hours} часов` : "—"}</div>
                  <div>Итог: {formatCourseDocument(course)}</div>
                  <div>Цена: {formatCoursePrice(course)}</div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenCourse(course.slug)}
                  className="mt-5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Подробнее
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
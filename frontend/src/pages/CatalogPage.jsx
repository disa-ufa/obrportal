import { useMemo, useState } from "react";
import { PUBLIC_COURSES } from "../data/publicCourses";

export function CatalogPage({ onPageChange, onOpenCourse }) {
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return PUBLIC_COURSES.filter((course) => {
      const matchesQuery =
        !normalized ||
        [
          course.title,
          course.direction,
          course.format,
          course.document,
          course.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      const matchesFormat =
        formatFilter === "all" || course.format === formatFilter;

      return matchesQuery && matchesFormat;
    });
  }, [query, formatFilter]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Каталог программ
            </div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Найдите подходящий курс
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Публичный каталог должен позволять фильтровать программы по формату,
              длительности, стоимости и типу итогового документа.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            Найдено программ:{" "}
            <span className="font-semibold text-slate-900">
              {filteredCourses.length}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию, направлению или документу"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <select
            value={formatFilter}
            onChange={(event) => setFormatFilter(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Все форматы</option>
            <option value="Онлайн">Онлайн</option>
            <option value="Смешанный">Смешанный</option>
          </select>
        </div>
      </section>

      {filteredCourses.length === 0 ? (
        <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-xl font-bold text-slate-900">
            По вашему запросу ничего не найдено
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Измените фильтры или вернитесь на главную страницу.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFormatFilter("all");
              }}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Сбросить фильтры
            </button>
            <button
              type="button"
              onClick={() => onPageChange("home")}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              На главную
            </button>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredCourses.map((course) => (
            <article
              key={course.id}
              className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  {course.direction}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {course.format}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                {course.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {course.description}
              </p>

              <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <div>Объём: {course.hours} ч.</div>
                <div>Цена: {course.price}</div>
                <div>Документ: {course.document}</div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onOpenCourse(course.id)}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Открыть карточку
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange("login")}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Купить / записаться
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
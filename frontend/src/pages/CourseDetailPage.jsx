import { PUBLIC_COURSES } from "../data/publicCourses";

export function CourseDetailPage({ courseSlug, onPageChange, onOpenCourse }) {
  const course =
    PUBLIC_COURSES.find((item) => item.slug === courseSlug) || PUBLIC_COURSES[0];

  if (!course) {
    return (
      <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="text-xl font-bold text-slate-900">
          Карточка курса пока недоступна
        </div>
        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="mt-5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          В каталог
        </button>
      </section>
    );
  }

  const relatedCourses = PUBLIC_COURSES.filter((item) => item.id !== course.id).slice(0, 2);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
            {course.direction}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {course.format}
          </span>
        </div>

        <h1 className="mt-4 text-4xl font-bold text-slate-900">
          {course.title}
        </h1>

        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
          {course.description}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Формат</div>
            <div className="mt-2 font-semibold text-slate-900">{course.format}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Объём</div>
            <div className="mt-2 font-semibold text-slate-900">{course.hours} часов</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Стоимость</div>
            <div className="mt-2 font-semibold text-slate-900">{course.price}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-500">Итог</div>
            <div className="mt-2 font-semibold text-slate-900">{course.document}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onPageChange("login")}
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Купить / записаться
          </button>
          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Назад в каталог
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Программа курса</h2>
          <div className="mt-4 space-y-3">
            {course.program.map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="text-sm leading-6 text-slate-700">{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">Для кого программа</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {course.audience.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">Итоговая аттестация</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {course.finalAssessment}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Похожие программы</h2>
            <p className="mt-1 text-sm text-slate-600">
              Быстрый переход к другим карточкам из публичного каталога.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {relatedCourses.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                {item.direction}
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">{item.title}</div>
              <div className="mt-3 text-sm text-slate-600">
                {item.hours} часов · {item.price}
              </div>
              <button
                type="button"
                onClick={() => onOpenCourse(item.slug)}
                className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                Открыть карточку
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
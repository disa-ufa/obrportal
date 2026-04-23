import { PUBLIC_COURSES } from "../data/publicCourses";

function FeatureCard({ title, text }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="text-lg font-bold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

export function HomePage({ onPageChange, onOpenCourse }) {
  const featuredCourses = PUBLIC_COURSES.slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 px-6 py-10 text-white shadow-sm md:px-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-100">
              Публичный сайт и каталог
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
              Современная образовательная платформа для физических и корпоративных клиентов
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50">
              Выбор программ, обучение, документы, договорный контур и прозрачная
              цифровая инфраструктура в одном продукте.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onPageChange("catalog")}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Перейти в каталог
              </button>
              <button
                type="button"
                onClick={() => onPageChange("organization-info")}
                className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
              >
                Сведения об организации
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
              <div className="text-sm font-semibold text-blue-100">Для ФЛ</div>
              <div className="mt-2 text-xl font-bold">Выбрать → оплатить → пройти → получить документ</div>
            </div>
            <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
              <div className="text-sm font-semibold text-blue-100">Для ЮЛ</div>
              <div className="mt-2 text-xl font-bold">Выбрать → согласовать → подписать → загрузить группу</div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Популярные программы</h2>
            <p className="mt-1 text-sm text-slate-600">
              Публичная витрина курсов с быстрым переходом в каталог и карточку курса.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Смотреть все
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {featuredCourses.map((course) => (
            <div
              key={course.id}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                {course.format}
              </div>
              <div className="mt-3 text-xl font-bold text-slate-900">{course.title}</div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <div>Объём: {course.hours} часов</div>
                <div>Итог: {course.document}</div>
                <div>Цена: {course.price}</div>
              </div>
              <button
                type="button"
                onClick={() => onOpenCourse(course.id)}
                className="mt-5 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Открыть карточку курса
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <FeatureCard
          title="Как это работает"
          text="Физическое лицо выбирает курс, оплачивает обучение и проходит программу. Корпоративный заказчик работает через отдельный B2B-контур."
        />
        <FeatureCard
          title="Итоговый документ"
          text="Пользователь получает документ по итогам обучения, а публичный контур включает страницу проверки подлинности."
        />
        <FeatureCard
          title="Доверие и открытость"
          text="Контакты, правовые страницы и сведения об образовательной организации встроены в публичный слой продукта."
        />
      </section>
    </div>
  );
}
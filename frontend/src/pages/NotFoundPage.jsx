export function NotFoundPage({ onPageChange }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Ошибка навигации
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Страница не найдена
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Такой страницы в публичном контуре сейчас нет. Вернитесь на главную,
          откройте каталог программ или перейдите в обязательные публичные разделы.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onPageChange("home")}
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            На главную
          </button>
          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            В каталог
          </button>
          <button
            type="button"
            onClick={() => onPageChange("contacts")}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Контакты
          </button>
        </div>
      </section>
    </div>
  );
}
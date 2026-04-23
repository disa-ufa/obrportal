const PRIVACY_SECTIONS = [
  {
    title: "Цели обработки персональных данных",
    items: [
      "Регистрация и авторизация пользователей",
      "Оказание образовательных услуг",
      "Формирование итоговых документов и реестров",
      "Поддержка пользователей и сопровождение заказов",
    ],
  },
  {
    title: "Какие данные обрабатываются",
    items: [
      "Контактные данные пользователя",
      "Данные, необходимые для обучения и выдачи документов",
      "Технические данные работы платформы",
      "История действий, связанных с использованием сервиса",
    ],
  },
  {
    title: "Правовые основания",
    items: [
      "Исполнение договора и пользовательских сценариев платформы",
      "Согласие субъекта персональных данных",
      "Исполнение требований законодательства РФ",
      "Защита прав и законных интересов оператора и пользователя",
    ],
  },
  {
    title: "Права субъекта ПДн",
    items: [
      "Получение информации об обработке данных",
      "Актуализация и исправление сведений",
      "Отзыв согласия в предусмотренных случаях",
      "Обращение по вопросам удаления или ограничения обработки",
    ],
  },
];

function PrivacyCard({ title, items }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrivacyPage({ onPageChange }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Правовая информация
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Политика обработки персональных данных
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Публичный каркас страницы политики ПДн. На этом этапе фиксируем структуру
          обязательного раздела: цели обработки, состав данных, правовые основания,
          сроки хранения и права субъекта.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onPageChange("home")}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            На главную
          </button>
          <button
            type="button"
            onClick={() => onPageChange("contacts")}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Контакты
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {PRIVACY_SECTIONS.map((section) => (
          <PrivacyCard
            key={section.title}
            title={section.title}
            items={section.items}
          />
        ))}
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">
          Что должно появиться на следующем проходе
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Сроки хранения и сценарии удаления / архивирования
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Контакт оператора персональных данных
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Юридически согласованный текст финальной редакции
          </div>
        </div>
      </section>
    </div>
  );
}
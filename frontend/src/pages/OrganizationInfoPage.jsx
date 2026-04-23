const INFO_SECTIONS = [
  {
    title: "Основные сведения",
    items: [
      "Полное и сокращенное наименование образовательной организации",
      "Дата создания, учредитель, место нахождения и режим работы",
      "Контактные телефоны, e-mail, адрес официального сайта",
    ],
  },
  {
    title: "Документы",
    items: [
      "Устав и локальные нормативные акты",
      "Лицензии, приказы и обязательные документы",
      "Публичные ссылки на PDF и версии документов",
    ],
  },
  {
    title: "Образовательные программы",
    items: [
      "Перечень реализуемых программ",
      "Формы обучения, сроки и объем часов",
      "Информация об итоговом документе",
    ],
  },
  {
    title: "Руководство и контакты",
    items: [
      "Сведения о руководителе и ответственных лицах",
      "Контактные данные подразделений",
      "Пути обращения пользователей и организаций",
    ],
  },
];

function InfoCard({ title, items }) {
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

export function OrganizationInfoPage({ onPageChange }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Официальный раздел
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Сведения об образовательной организации
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Публичная структура официального раздела образовательной организации.
          На этом этапе мы фиксируем каркас страницы: обязательные блоки, документы,
          сведения о программах, руководстве и каналах связи.
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
        {INFO_SECTIONS.map((section) => (
          <InfoCard
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

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Публичные PDF-документы
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Актуализированные реквизиты и сведения
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Навигация по официальным подразделам
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Связка с юридическими страницами и контактами
          </div>
        </div>
      </section>
    </div>
  );
}
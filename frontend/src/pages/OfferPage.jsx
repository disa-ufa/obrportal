const OFFER_SECTIONS = [
  {
    title: "Предмет оферты",
    items: [
      "Предоставление доступа к образовательным программам и цифровым сервисам платформы",
      "Оказание услуг в объеме и на условиях, указанных в карточке выбранной программы",
      "Публичное описание услуги, сроков, формата и итогового документа",
    ],
  },
  {
    title: "Порядок акцепта",
    items: [
      "Пользователь выбирает программу и переходит к регистрации / оформлению",
      "Акцепт оферты связывается с действиями пользователя в публичном контуре",
      "Для юридических лиц далее используется отдельный корпоративный сценарий",
    ],
  },
  {
    title: "Оплата и возвраты",
    items: [
      "Стоимость программы указывается в публичной карточке курса",
      "Порядок оплаты и доступа к обучению зависит от выбранного сценария",
      "Возврат и отмена обучения оформляются по правилам, закрепленным в финальной юридической редакции",
    ],
  },
  {
    title: "Доступ к обучению",
    items: [
      "Доступ открывается после выполнения условий оформления и подтверждения оплаты",
      "Пользователь получает доступ только к тем программам, на которые он назначен или которые оплатил",
      "Правила прохождения, аттестации и выдачи документов определяются программой курса",
    ],
  },
  {
    title: "Ответственность сторон",
    items: [
      "Пользователь обязан предоставлять корректные данные и соблюдать правила платформы",
      "Оператор обязан обеспечить доступность сервиса в разумных пределах и вести необходимую документацию",
      "Ограничения ответственности и спорные ситуации раскрываются в финальной редакции оферты",
    ],
  },
  {
    title: "Заключительные положения",
    items: [
      "Применимое право и порядок рассмотрения обращений",
      "Порядок изменения редакции оферты и уведомления пользователей",
      "Связка оферты с политикой ПДн и обязательными публичными документами",
    ],
  },
];

function OfferSection({ title, items }) {
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

export function OfferPage({ onPageChange }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Правовая информация
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Оферта / пользовательское соглашение
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Публичный каркас оферты для платформы: предмет услуги, порядок акцепта,
          оплата, доступ к обучению, ответственность сторон и заключительные положения.
          На этом этапе мы фиксируем структуру документа и готовим основу под финальную
          юридическую редакцию.
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
            onClick={() => onPageChange("privacy")}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Политика ПДн
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {OFFER_SECTIONS.map((section) => (
          <OfferSection
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
            Юридически согласованный текст финальной оферты
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Детализация порядка оплаты, возвратов и акцепта
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Связка с карточками программ и пользовательскими сценариями
          </div>
        </div>
      </section>
    </div>
  );
}
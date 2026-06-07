const CONTACT_CARDS = [
  {
    title: "Телефон",
    value: "+7 (347) 200 10 17",
    hint: "Единая линия по вопросам обучения, документов, регистрации и проверки подлинности.",
  },
  {
    title: "E-mail",
    value: "rcdodist@gmail.com",
    hint: "Общий адрес для обращений пользователей, представителей организаций и технических вопросов.",
  },
  {
    title: "Режим работы",
    value: "Пн-Пт, 09:00-18:00",
    hint: "Обращения обрабатываются в рабочее время по уфимскому времени.",
  },
  {
    title: "Адрес",
    value: "г. Уфа, ул. Авроры, 18/2",
    hint: "ГБОУ РЦДО, Республика Башкортостан.",
  },
];

const CONTACT_SCENARIOS = [
  {
    title: "Выбор программы",
    text: "Откройте каталог, выберите программу и изучите карточку с объемом часов, форматом обучения и типом итогового документа.",
  },
  {
    title: "Личный кабинет",
    text: "После регистрации пользователь видит назначенные программы, статусы обучения и доступные итоговые документы.",
  },
  {
    title: "Проверка документа",
    text: "Для проверки подлинности используйте публичный раздел проверки документа по номеру или безопасному коду.",
  },
  {
    title: "Организационные вопросы",
    text: "Представители организаций могут обращаться по общему телефону и e-mail, указанным на этой странице.",
  },
];

function ContactCard({ title, value, hint }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        {title}
      </div>
      <div className="mt-3 text-xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>}
    </div>
  );
}

function ContactScenario({ title, text }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-2">{text}</div>
    </div>
  );
}

export function ContactsPage({ onPageChange }) {
  return (
    <div className="space-y-6" data-testid="public-contacts-page">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Публичные контакты
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Контакты ГБОУ РЦДО
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Контактная информация для пользователей портала, представителей организаций и
          проверяющих лиц. По этим каналам можно уточнить вопросы обучения, регистрации,
          итоговых документов и проверки подлинности.
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
            onClick={() => onPageChange("organization-info")}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Сведения об организации
          </button>
          <button
            type="button"
            onClick={() => onPageChange("verify-document")}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Проверить документ
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CONTACT_CARDS.map((card) => (
          <ContactCard
            key={card.title}
            title={card.title}
            value={card.value}
            hint={card.hint}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Как получить помощь</h2>
          <div className="mt-5 grid gap-3">
            {CONTACT_SCENARIOS.map((item) => (
              <ContactScenario key={item.title} title={item.title} text={item.text} />
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-blue-50 p-6 text-sm leading-6 text-blue-900 ring-1 ring-blue-200">
          <h2 className="text-2xl font-bold text-blue-950">Официальные сведения</h2>
          <p className="mt-4">
            Полные сведения об образовательной организации размещены в отдельном публичном
            разделе. Там указаны наименование, учредитель, руководитель, ИНН, адрес,
            официальный сайт и портал обучения.
          </p>
          <button
            type="button"
            onClick={() => onPageChange("organization-info")}
            className="mt-5 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Открыть сведения
          </button>
        </div>
      </section>
    </div>
  );
}

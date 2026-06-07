const TERMS_SECTIONS = [
  {
    title: "Назначение портала",
    items: [
      "Портал используется для публикации образовательных программ ГБОУ РЦДО",
      "Пользователь может выбрать программу, зарегистрироваться и открыть личный кабинет",
      "В личном кабинете отображаются назначенные программы, статусы обучения и итоговые документы",
    ],
  },
  {
    title: "Регистрация и учетная запись",
    items: [
      "Пользователь указывает достоверные контактные данные при регистрации",
      "Доступ к личному кабинету предоставляется только авторизованному пользователю",
      "Пользователь отвечает за сохранность своих учетных данных и корректность указанных сведений",
    ],
  },
  {
    title: "Образовательные программы",
    items: [
      "Информация о программе публикуется в карточке курса: название, объем часов, формат и тип итогового документа",
      "Назначение на программу и доступ к материалам отображаются в личном кабинете",
      "Правила прохождения программы и выдачи документа определяются содержанием программы и внутренними правилами организации",
    ],
  },
  {
    title: "Итоговые документы",
    items: [
      "Итоговый документ формируется после выполнения условий завершения обучения",
      "Доступные документы отображаются в личном кабинете пользователя",
      "Подлинность документа можно проверить через публичный раздел проверки по номеру или безопасному коду",
    ],
  },
  {
    title: "Обращения и поддержка",
    items: [
      "По вопросам регистрации, обучения и документов пользователь может обратиться в ГБОУ РЦДО",
      "Контакты для обращений: +7 (347) 200 10 17 и rcdodist@gmail.com",
      "Обращения рассматриваются в рабочее время: Пн-Пт, 09:00-18:00",
    ],
  },
  {
    title: "Ограничения использования",
    items: [
      "Нельзя использовать портал для несанкционированного доступа к чужим данным",
      "Нельзя передавать учетные данные третьим лицам или искажать сведения о себе",
      "Нельзя пытаться изменить, удалить или получить данные вне предоставленных пользователю прав",
    ],
  },
];

function TermsSection({ title, items }) {
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
    <div className="space-y-6" data-testid="public-terms-page">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Правовая информация
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Условия использования портала
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Публичные условия использования образовательного портала ГБОУ РЦДО:
          назначение сервиса, регистрация, доступ к программам, итоговые документы,
          обращения пользователей и ограничения использования.
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
        {TERMS_SECTIONS.map((section) => (
          <TermsSection
            key={section.title}
            title={section.title}
            items={section.items}
          />
        ))}
      </section>

      <section className="rounded-[2rem] bg-blue-50 p-6 text-sm leading-6 text-blue-900 ring-1 ring-blue-200">
        <h2 className="text-2xl font-bold text-blue-950">Связанные разделы</h2>
        <p className="mt-3">
          Для получения официальных сведений об организации откройте раздел
          «Сведения об организации». Для вопросов о персональных данных используйте
          раздел «Политика обработки персональных данных».
        </p>
      </section>
    </div>
  );
}

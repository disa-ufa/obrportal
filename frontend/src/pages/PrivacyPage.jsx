const OPERATOR_FACTS = [
  {
    label: "Оператор",
    value: "ГБОУ РЦДО",
  },
  {
    label: "Полное наименование",
    value: "Государственное бюджетное общеобразовательное учреждение Республиканский центр дистанционного образования детей-инвалидов",
  },
  {
    label: "ИНН",
    value: "0274931354",
  },
  {
    label: "Адрес",
    value: "Республика Башкортостан, г. Уфа, ул. Авроры, 18/2",
  },
  {
    label: "E-mail для обращений",
    value: "rcdodist@gmail.com",
  },
];

const PRIVACY_SECTIONS = [
  {
    title: "Цели обработки персональных данных",
    items: [
      "Регистрация и авторизация пользователей на портале",
      "Организация доступа к образовательным программам и личному кабинету",
      "Сопровождение обучения, фиксация статусов и результатов",
      "Формирование, хранение и проверка итоговых документов",
      "Обработка обращений пользователей и представителей организаций",
    ],
  },
  {
    title: "Категории обрабатываемых данных",
    items: [
      "ФИО, e-mail, телефон и иные данные, которые пользователь указывает при регистрации или обращении",
      "Сведения о назначенных программах, статусах обучения и итоговых документах",
      "Технические данные, необходимые для безопасной работы портала и журнала действий",
      "Данные проверки документа, если пользователь использует публичный сервис проверки",
    ],
  },
  {
    title: "Правовые основания и принципы",
    items: [
      "Обработка выполняется для работы образовательного портала и исполнения связанных образовательных сценариев",
      "Объем данных ограничивается целями обработки и функциональностью портала",
      "Доступ к персональным данным ограничивается ролями и правами пользователей",
      "Публичная проверка документа не должна раскрывать лишние персональные сведения",
    ],
  },
  {
    title: "Права пользователя",
    items: [
      "Получить информацию об обработке своих персональных данных",
      "Уточнить или исправить некорректные сведения через обращение в ГБОУ РЦДО",
      "Направить обращение по вопросам обработки, ограничения обработки или удаления данных",
      "Использовать контактные данные оператора для официального обращения",
    ],
  },
];

function FactCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-slate-900">
        {value}
      </div>
    </div>
  );
}

function PrivacyCard({ title, items }) {
  return (
    <div className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
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
    <div className="space-y-6" data-testid="public-privacy-page">
      <section className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Правовая информация
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Политика обработки персональных данных
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Публичная информация о том, как ГБОУ РЦДО обрабатывает персональные данные
          пользователей образовательного портала: цели обработки, категории данных,
          права пользователя и контакт для обращений.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => onPageChange("home")}
            className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            На главную
          </button>
          <button
            type="button"
            onClick={() => onPageChange("contacts")}
            className="w-full rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 sm:w-auto"
          >
            Контакты
          </button>
          <button
            type="button"
            onClick={() => onPageChange("organization-info")}
            className="w-full rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 sm:w-auto"
          >
            Сведения об организации
          </button>
        </div>
      </section>

      <section className="rounded-shell bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Оператор персональных данных
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {OPERATOR_FACTS.map((fact) => (
            <FactCard key={fact.label} label={fact.label} value={fact.value} />
          ))}
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

      <section className="rounded-shell bg-amber-50 p-5 text-sm leading-6 text-amber-900 ring-1 ring-amber-200 sm:p-6">
        <div className="font-bold text-amber-950">Важное уточнение</div>
        <p className="mt-2">
          Раздел содержит публичное описание обработки персональных данных на портале.
          Утвержденные локальные акты и PDF-документы организации размещаются отдельно
          после проверки официальных файлов.
        </p>
      </section>
    </div>
  );
}

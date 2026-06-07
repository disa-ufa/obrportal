const ORGANIZATION_FACTS = [
  {
    label: "Полное наименование",
    value: "Государственное бюджетное общеобразовательное учреждение Республиканский центр дистанционного образования детей-инвалидов",
  },
  {
    label: "Сокращенное наименование",
    value: "ГБОУ РЦДО",
  },
  {
    label: "Учредитель",
    value: "Министерство просвещения Республики Башкортостан",
  },
  {
    label: "Руководитель",
    value: "Нуриев Фаниль Жамилевич",
  },
  {
    label: "ИНН",
    value: "0274931354",
  },
  {
    label: "Место нахождения",
    value: "Республика Башкортостан, г. Уфа, ул. Авроры, 18/2",
  },
  {
    label: "Официальный сайт",
    value: "https://rcdo02.ru",
  },
  {
    label: "Портал обучения",
    value: "https://portal.rcdo02.ru",
  },
];

const CONTACT_FACTS = [
  {
    label: "Телефон",
    value: "+7 (347) 200 10 17",
  },
  {
    label: "E-mail",
    value: "rcdodist@gmail.com",
  },
  {
    label: "Режим работы",
    value: "Пн-Пт, 09:00-18:00",
  },
];

const OFFICIAL_SECTIONS = [
  {
    title: "Основные сведения",
    text: "Раздел содержит публичные сведения об образовательной организации, ее наименовании, учредителе, руководителе, адресе и каналах связи.",
  },
  {
    title: "Документы",
    text: "Устав, лицензия, локальные нормативные акты и иные обязательные документы должны быть опубликованы отдельными PDF-ссылками после загрузки утвержденных файлов.",
  },
  {
    title: "Образовательные программы",
    text: "Актуальный перечень программ публикуется в каталоге портала. Карточки программ содержат объем часов, формат обучения и тип итогового документа.",
  },
  {
    title: "Обращения пользователей",
    text: "Пользователи и представители организаций могут обращаться по телефону и e-mail, указанным в публичном разделе контактов.",
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

function SectionCard({ title, text }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

export function OrganizationInfoPage({ onPageChange }) {
  return (
    <div className="space-y-6" data-testid="organization-info-public-page">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Официальный раздел
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Сведения об образовательной организации
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Публичная страница с основными сведениями о ГБОУ РЦДО для пользователей,
          представителей организаций и проверяющих лиц. Раздел содержит проверенные публичные сведения и не раскрывает внутренние административные данные.
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
          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Каталог программ
          </button>
        </div>
      </section>

      <section
        className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
        data-testid="organization-info-official-facts"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Основные сведения
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              ГБОУ РЦДО
            </h2>
          </div>
          <div className="rounded-full bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 ring-1 ring-green-200">
            Проверенные сведения
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ORGANIZATION_FACTS.map((fact) => (
            <FactCard key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
      </section>

      <section
        className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
        data-testid="organization-info-public-contacts"
      >
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Контакты
        </div>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Каналы связи
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {CONTACT_FACTS.map((fact) => (
            <FactCard key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {OFFICIAL_SECTIONS.map((section) => (
          <SectionCard key={section.title} title={section.title} text={section.text} />
        ))}
      </section>

      <section
        className="rounded-[2rem] bg-amber-50 p-6 text-sm leading-6 text-amber-900 ring-1 ring-amber-200"
        data-testid="organization-info-documents-next-step"
      >
        <div className="font-bold text-amber-950">Документы организации</div>
        <p className="mt-2">
          Устав, лицензия, локальные акты и другие обязательные документы размещаются отдельными ссылками после проверки утвержденных PDF-файлов. Непроверенные реквизиты и номера документов на этой странице не публикуются.
        </p>
      </section>
    </div>
  );
}

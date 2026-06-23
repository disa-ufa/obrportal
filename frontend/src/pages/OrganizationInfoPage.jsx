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
    text: "Отдельный блок ниже показывает структуру официальных документов, которые подлежат публикации после загрузки и проверки утвержденных файлов.",
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

const DOCUMENT_GROUPS = [
  {
    title: "Учредительные документы",
    status: "Готовится к публикации",
    items: [
      "Устав ГБОУ РЦДО",
      "Сведения о создании, реорганизации и изменениях",
      "Сведения о постановке на учет и регистрационные данные",
    ],
    note: "Публикуются только после проверки утвержденных файлов и соответствия реквизитов официальным документам.",
  },
  {
    title: "Лицензия и образовательная деятельность",
    status: "Требуется подтвержденный файл",
    items: [
      "Лицензия на образовательную деятельность",
      "Приложения к лицензии",
      "Перечень реализуемых образовательных программ",
    ],
    note: "Номера, даты и приложения лицензии не указываются до загрузки утвержденных файлов.",
  },
  {
    title: "Локальные нормативные акты",
    status: "Готовится к публикации",
    items: [
      "Правила приема и обучения",
      "Положение об обработке персональных данных",
      "Порядок оформления и выдачи итоговых документов",
    ],
    note: "Раздел предназначен для утвержденных локальных актов, которые можно безопасно размещать в открытом доступе.",
  },
  {
    title: "Отчеты и обязательная публичная информация",
    status: "Готовится к публикации",
    items: [
      "Отчет о самообследовании",
      "Предписания органов контроля и отчеты об исполнении",
      "Иные обязательные сведения для публичного размещения",
    ],
    note: "Публикация выполняется после проверки актуальности и отсутствия служебных или персональных данных.",
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
    <div className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function DocumentGroupCard({ title, status, items, note }) {
  return (
    <article className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          {status}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-700 ring-1 ring-slate-200"
          >
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm leading-6 text-slate-600">{note}</p>
    </article>
  );
}

export function OrganizationInfoPage({ onPageChange }) {
  return (
    <div className="space-y-6" data-testid="organization-info-public-page">
      <section className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
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
        className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
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
        className="rounded-shell bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
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
        className="rounded-shell bg-blue-50 p-6 shadow-sm ring-1 ring-blue-200 md:p-8"
        data-testid="organization-info-documents-section"
      >
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Документы организации
        </div>
        <h2 className="mt-2 text-2xl font-bold text-blue-950">
          Официальные документы для публикации
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-blue-900">
          Ниже подготовлена структура раздела для утвержденных файлов. На этой
          странице не публикуются непроверенные номера, даты, реквизиты лицензий
          или ссылки на документы, пока соответствующие файлы не будут загружены
          и проверены.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {DOCUMENT_GROUPS.map((group) => (
            <DocumentGroupCard
              key={group.title}
              title={group.title}
              status={group.status}
              items={group.items}
              note={group.note}
            />
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-blue-950 ring-1 ring-blue-200">
          После загрузки и проверки утвержденного PDF-файла карточка документа
          может быть дополнена ссылкой, датой актуальности и кратким пояснением
          для пользователей портала.
        </div>
      </section>
    </div>
  );
}

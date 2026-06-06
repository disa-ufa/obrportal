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

export function ContactsPage({ onPageChange }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Публичные контакты
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Контакты
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Публичная страница контактов для физических лиц, корпоративных клиентов
          и пользователей, которым нужна помощь по программам, документам или проверке
          подлинности.
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
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ContactCard
          title="Телефон"
          value="+7 (347) 200 10 17"
          hint="Единая линия по вопросам обучения, документов и регистрации."
        />
        <ContactCard
          title="E-mail"
          value="rcdodist@gmail.com"
          hint="Общий адрес для обращений пользователей и организаций."
        />
        <ContactCard
          title="Режим работы"
          value="Пн-Пт, 09:00-18:00"
          hint="Ответы на обращения и сопровождение клиентов в рабочее время."
        />
        <ContactCard
          title="Поддержка"
          value="rcdodist@gmail.com"
          hint="Техническая и организационная поддержка по платформе."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Как с нами связаться</h2>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              По вопросам выбора программы — через каталог и общую линию поддержки.
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              По вопросам юридических документов и корпоративного обучения — через контакт для ЮЛ.
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              По вопросам проверки подлинности документа — через публичную страницу проверки документа.
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Следующий проход</h2>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
              Карта и адресные данные
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
              Форма обратной связи
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
              Разделение контактов по контурам: ФЛ / ЮЛ / документы / support
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
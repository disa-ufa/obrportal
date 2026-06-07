const FAQ_ITEMS = [
  {
    question: "Что такое портал ГБОУ РЦДО?",
    answer:
      "Это публичный образовательный портал для выбора программ, регистрации пользователей, сопровождения обучения, выдачи итоговых документов и проверки их подлинности.",
  },
  {
    question: "Как выбрать подходящую программу?",
    answer:
      "Откройте каталог программ, изучите карточку курса, объем часов, формат обучения и тип итогового документа. После выбора можно перейти к регистрации или входу в личный кабинет.",
  },
  {
    question: "Когда открывается доступ к обучению?",
    answer:
      "Доступ отображается в личном кабинете после назначения пользователя на программу. Для разных категорий пользователей порядок назначения может отличаться.",
  },
  {
    question: "Где посмотреть назначенные программы?",
    answer:
      "После входа откройте личный кабинет. В нем отображаются назначенные программы, статусы прохождения и доступные итоговые документы.",
  },
  {
    question: "Какой документ выдается после обучения?",
    answer:
      "Тип итогового документа указывается в карточке программы и зависит от содержания курса, объема часов и правил завершения обучения.",
  },
  {
    question: "Как проверить подлинность документа?",
    answer:
      "Используйте публичную страницу проверки документа. Введите номер или безопасный код, после чего портал покажет доступные сведения о документе без раскрытия лишних персональных данных.",
  },
  {
    question: "Куда обращаться по вопросам портала?",
    answer:
      "Используйте раздел контактов: телефон +7 (347) 200 10 17, e-mail rcdodist@gmail.com, режим работы Пн-Пт, 09:00-18:00.",
  },
  {
    question: "Где размещены сведения об образовательной организации?",
    answer:
      "Официальные сведения о ГБОУ РЦДО доступны в разделе «Сведения об организации»: наименование, учредитель, руководитель, ИНН, адрес и каналы связи.",
  },
];

function FaqItem({ question, answer }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-bold text-slate-900">{question}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{answer}</p>
    </div>
  );
}

export function FaqPage({ onPageChange }) {
  return (
    <div className="space-y-6" data-testid="public-faq-page">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Публичная поддержка
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Частые вопросы
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Ответы на основные вопросы о портале ГБОУ РЦДО: выбор программы,
          регистрация, личный кабинет, итоговые документы, проверка подлинности и
          официальные сведения об организации.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onPageChange("catalog")}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            В каталог
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
            onClick={() => onPageChange("verify-document")}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Проверить документ
          </button>
        </div>
      </section>

      <section className="grid gap-4">
        {FAQ_ITEMS.map((item) => (
          <FaqItem
            key={item.question}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </section>

      <section className="rounded-[2rem] bg-blue-50 p-6 text-sm leading-6 text-blue-900 ring-1 ring-blue-200">
        <h2 className="text-2xl font-bold text-blue-950">Не нашли ответ?</h2>
        <p className="mt-3">
          Напишите на rcdodist@gmail.com или позвоните по телефону +7 (347) 200 10 17.
          Для проверки документа используйте отдельный публичный раздел проверки.
        </p>
      </section>
    </div>
  );
}

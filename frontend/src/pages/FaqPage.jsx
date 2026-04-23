const FAQ_ITEMS = [
  {
    question: "Как выбрать подходящий курс?",
    answer:
      "Используйте каталог программ: фильтруйте по формату, направлению и типу итогового документа, затем откройте карточку курса.",
  },
  {
    question: "Когда открывается доступ к обучению?",
    answer:
      "В целевом сценарии доступ к обучению открывается после подтверждения оплаты или после оформления корпоративного заказа и назначения пользователя на программу.",
  },
  {
    question: "Какой документ я получу после обучения?",
    answer:
      "Это зависит от программы: в карточке курса указывается тип итогового документа и формат итоговой аттестации.",
  },
  {
    question: "Как проверить подлинность документа?",
    answer:
      "Через публичную страницу проверки документа по безопасному идентификатору или номеру документа.",
  },
  {
    question: "Куда обращаться по вопросам корпоративного обучения?",
    answer:
      "Через публичные контакты и будущий корпоративный контур для юридических лиц.",
  },
  {
    question: "Где находятся правовые документы платформы?",
    answer:
      "В футере публичного контура: политика обработки ПДн, оферта, сведения об образовательной организации и другие обязательные страницы.",
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
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Публичная поддержка
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          FAQ
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Частые вопросы по выбору курса, обучению, итоговым документам,
          проверке подлинности и публичным правилам работы платформы.
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

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">
          Что дальше
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Политика обработки ПДн
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Оферта / пользовательское соглашение
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            Доработка SEO и человеко-понятных URL
          </div>
        </div>
      </section>
    </div>
  );
}
import { useMemo, useState } from "react";

const DEMO_DOCUMENTS = [
  {
    id: "DOC-2026-0001",
    holder: "Иванов Иван Иванович",
    program: "Повышение квалификации педагогических работников",
    issueDate: "12.07.2026",
    status: "Документ подтвержден",
    type: "Удостоверение",
  },
  {
    id: "DOC-2026-0107",
    holder: "Петрова Анна Сергеевна",
    program: "Методист: проектирование программ и аттестации",
    issueDate: "20.07.2026",
    status: "Документ подтвержден",
    type: "Сертификат",
  },
];

function ResultCard({ result }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700">
          Проверка завершена
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          {result.type}
        </span>
      </div>

      <h2 className="mt-4 text-2xl font-bold text-slate-900">{result.status}</h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">Номер документа</div>
          <div className="mt-2 font-semibold text-slate-900">{result.id}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">Дата выдачи</div>
          <div className="mt-2 font-semibold text-slate-900">{result.issueDate}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">Владелец</div>
          <div className="mt-2 font-semibold text-slate-900">{result.holder}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">Программа</div>
          <div className="mt-2 font-semibold text-slate-900">{result.program}</div>
        </div>
      </div>
    </div>
  );
}

export function VerifyDocumentPage({ onPageChange }) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [touched, setTouched] = useState(false);

  const normalizedSubmitted = submittedQuery.trim().toUpperCase();

  const result = useMemo(() => {
    if (!normalizedSubmitted) {
      return null;
    }

    return (
      DEMO_DOCUMENTS.find(
        (item) => item.id.toUpperCase() === normalizedSubmitted
      ) || null
    );
  }, [normalizedSubmitted]);

  function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
    setSubmittedQuery(query);
  }

  const showNotFound = touched && normalizedSubmitted && !result;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Публичная проверка
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Проверка подлинности документа
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Введите номер документа или безопасный идентификатор из QR-кода.
          Публичный контур показывает только безопасный набор полей без доступа
          к внутренним служебным реестрам.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: DOC-2026-0001"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <button
            type="submit"
            className="h-12 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Проверить документ
          </button>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          Демо-примеры: DOC-2026-0001, DOC-2026-0107
        </div>
      </section>

      {result && <ResultCard result={result} />}

      {showNotFound && (
        <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="text-xl font-bold text-slate-900">Документ не найден</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Проверьте корректность номера или обратитесь в образовательную организацию.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onPageChange("contacts")}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Перейти в контакты
            </button>
            <button
              type="button"
              onClick={() => onPageChange("home")}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              На главную
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
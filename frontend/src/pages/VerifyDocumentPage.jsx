import { useEffect, useMemo, useState } from "react";
import { verifyPublicDocument } from "../api/client";
import { DocumentVerificationQrBlock } from "../components/documents/DocumentVerificationQrBlock";

function formatIssuedAt(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
  }).format(date);
}

function getRegistryStatusLabel(status) {
  const labels = {
    available: "Доступен",
    draft: "Черновик",
    revoked: "Отозван",
  };

  return labels[status] || status || "-";
}

function getVerificationTone(result) {
  if (result.registry_status === "available") {
    return {
      card: "ring-green-200",
      badge: "bg-green-50 text-green-700 ring-green-200",
      title: "text-green-700",
      panel: "bg-green-50 text-green-800 ring-green-200",
      label: "Документ подтверждён",
      description:
        "Документ найден в реестре ObrPortal, опубликован и доступен для подтверждения подлинности.",
    };
  }

  if (result.registry_status === "revoked") {
    return {
      card: "ring-red-200",
      badge: "bg-red-50 text-red-700 ring-red-200",
      title: "text-red-700",
      panel: "bg-red-50 text-red-800 ring-red-200",
      label: "Документ отозван",
      description:
        "Документ найден в реестре, но его статус изменён на «Отозван». Такой документ нельзя считать действующим.",
    };
  }

  return {
    card: "ring-amber-200",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    title: "text-amber-700",
    panel: "bg-amber-50 text-amber-800 ring-amber-200",
    label: "Требуется уточнение",
    description:
      "Документ найден, но его текущий статус не подтверждает возможность публичного использования.",
  };
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ResultCard({ result, onReset, onPageChange }) {
  const tone = getVerificationTone(result);

  return (
    <div className={`rounded-[2rem] bg-white p-6 shadow-sm ring-1 ${tone.card}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${tone.badge}`}>
          {tone.label}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
          {result.document_type}
        </span>
      </div>

      <h2 className={`mt-4 text-3xl font-bold ${tone.title}`}>
        {result.verification_status}
      </h2>

      <div className={`mt-4 rounded-2xl p-4 text-sm leading-6 ring-1 ${tone.panel}`}>
        {tone.description}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Номер документа
          </div>
          <div className="mt-2 break-all font-semibold text-slate-900">
            {result.document_number}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Код проверки
          </div>
          <div className="mt-2 break-all font-semibold text-slate-900">
            {result.verification_code || "-"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Дата выдачи
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {formatIssuedAt(result.issued_at)}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Статус в реестре
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {getRegistryStatusLabel(result.registry_status)}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Владелец
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {result.holder_name || "-"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Программа
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {result.course_title || result.title || "-"}
          </div>
        </div>

        <DocumentVerificationQrBlock
          code={result.verification_code}
          documentNumber={result.document_number}
          containerId="public-document-verification-qr"
          title="Публичная ссылка проверки"
          description="QR-код ведёт на эту публичную страницу проверки по безопасному коду документа."
          size={132}
          showUrl
          showCopyLink
          className="md:col-span-2"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Проверить другой документ
        </button>

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Перейти в каталог
        </button>

        <button
          type="button"
          onClick={() => onPageChange("home")}
          className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          На главную
        </button>
      </div>
    </div>
  );
}

export function VerifyDocumentPage({ onPageChange, initialCode = "" }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  async function runVerification(rawValue, options = {}) {
    const value = String(rawValue || "").trim();

    if (!value) {
      setError("Введите номер документа или код проверки.");
      setResult(null);
      setNotFound(false);
      return;
    }

    setLoading(true);
    setError("");
    setNotFound(false);
    setResult(null);
    setSubmittedQuery(value);

    if (options.updateUrl !== false && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("number", value);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }

    try {
      const response = await verifyPublicDocument(value);
      setResult(response);
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(err.message || "Не удалось выполнить проверку документа.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const value = (initialCode || params.get("number") || params.get("code") || "").trim();

    if (!value) {
      return;
    }

    setQuery(value);
    runVerification(value, { updateUrl: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function handleSubmit(event) {
    event.preventDefault();
    await runVerification(normalizedQuery);
  }

  function handleReset() {
    setQuery("");
    setResult(null);
    setSubmittedQuery("");
    setError("");
    setNotFound(false);

    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/verify-document");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Публичный реестр
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Проверка документа
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Введите номер документа или код проверки. Если вы перешли по QR-коду,
          проверка выполнится автоматически.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Номер документа или код проверки
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например: AUTO-... или DOCV-..."
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !normalizedQuery}
              className="h-12 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Проверяем..." : "Проверить"}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="rounded-[2rem] bg-red-50 p-5 text-sm text-red-800 ring-1 ring-red-200">
          <div className="font-semibold">Не удалось выполнить проверку</div>
          <p className="mt-2 leading-6">{error}</p>
        </div>
      )}

      {notFound && (
        <div className="rounded-[2rem] bg-amber-50 p-6 text-sm text-amber-800 ring-1 ring-amber-200">
          <div className="text-lg font-bold">Документ не найден</div>
          <p className="mt-2 leading-6">
            В реестре нет опубликованного документа по запросу{" "}
            <span className="font-semibold">{submittedQuery}</span>. Проверьте номер,
            код проверки или статус документа у организации, выдавшей документ.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Проверить другой документ
            </button>
            <button
              type="button"
              onClick={() => onPageChange("contacts")}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
            >
              Контакты организации
            </button>
          </div>
        </div>
      )}

      {result && (
        <ResultCard
          result={result}
          onReset={handleReset}
          onPageChange={onPageChange}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard title="Что подтверждает проверка">
          Проверка показывает, что документ найден в реестре ObrPortal, связан с
          конкретным владельцем и имеет текущий статус.
        </InfoCard>

        <InfoCard title="Что не раскрывается публично">
          Публичная страница не выдаёт файл документа и не открывает личный кабинет.
          Она показывает только основные сведения для проверки подлинности.
        </InfoCard>

        <InfoCard title="Если документ не найден">
          Возможные причины: документ ещё не опубликован, был отозван из публичной
          выдачи, введён неверный номер или используется устаревшая ссылка.
        </InfoCard>
      </div>
    </div>
  );
}
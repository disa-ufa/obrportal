import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { verifyPublicDocument } from "../api/client";
import {
  buildDocumentVerificationUrl,
  copyTextToClipboard,
  downloadQrSvgById,
} from "../utils/documentVerification";

function formatIssuedAt(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU").format(date);
}

function getRegistryStatusLabel(status) {
  const labels = {
    available: "Доступен",
    draft: "Черновик",
    revoked: "Отозван",
  };

  return labels[status] || status || "—";
}

function getVerificationTone(result) {
  if (result.registry_status === "available") {
    return {
      card: "ring-green-200",
      badge: "bg-green-50 text-green-700",
      title: "text-green-700",
      label: "Проверка завершена",
    };
  }

  if (result.registry_status === "revoked") {
    return {
      card: "ring-red-200",
      badge: "bg-red-50 text-red-700",
      title: "text-red-700",
      label: "Документ недействителен",
    };
  }

  return {
    card: "ring-amber-200",
    badge: "bg-amber-50 text-amber-700",
    title: "text-amber-700",
    label: "Требуется проверка",
  };
}

function ResultCard({ result }) {
  const tone = getVerificationTone(result);
  const verificationUrl = buildDocumentVerificationUrl(result.verification_code);
  const qrContainerId = "public-document-verification-qr";
  const [copied, setCopied] = useState("");

  async function handleCopy(kind, text) {
    const ok = await copyTextToClipboard(text);

    if (!ok) {
      return;
    }

    setCopied(kind);

    window.setTimeout(() => {
      setCopied("");
    }, 1800);
  }

  return (
    <div className={`rounded-[2rem] bg-white p-6 shadow-sm ring-1 ${tone.card}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.badge}`}>
          {tone.label}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          {result.document_type}
        </span>
      </div>

      <h2 className={`mt-4 text-2xl font-bold ${tone.title}`}>
        {result.verification_status}
      </h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Номер документа
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {result.document_number}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Код проверки
          </div>
          <div className="mt-2 break-all font-semibold text-slate-900">
            {result.verification_code || "—"}
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
            Владелец
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {result.holder_name || "—"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Программа
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {result.course_title || result.title || "—"}
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

        {verificationUrl && (
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 md:col-span-2">
            <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start">
              <div id={qrContainerId} className="rounded-2xl bg-white p-3 ring-1 ring-blue-100">
                <QRCodeSVG
                  value={verificationUrl}
                  size={132}
                  level="M"
                  includeMargin
                  aria-label="QR-код публичной проверки документа"
                />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-blue-700">
                  Публичная ссылка проверки
                </div>
                <a
                  href={verificationUrl}
                  className="mt-2 block break-all text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  {verificationUrl}
                </a>
                <p className="mt-2 text-xs leading-5 text-blue-700">
                  QR-код ведёт на публичную страницу проверки по безопасному коду документа.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy("link", verificationUrl)}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    {copied === "link" ? "Ссылка скопирована" : "Скопировать ссылку"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy("code", result.verification_code)}
                    disabled={!result.verification_code}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copied === "code" ? "Код скопирован" : "Скопировать код"}
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadQrSvgById(qrContainerId, result.verification_code || result.document_number)}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50"
                  >
                    Скачать QR SVG
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function VerifyDocumentPage({ onPageChange }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  async function runVerification(rawValue, options = {}) {
    const value = rawValue.trim();

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

    if (options.updateUrl && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.pathname = "/verify-document";
      url.search = "";
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
    const value = (params.get("number") || params.get("code") || "").trim();

    if (!value) {
      return;
    }

    setQuery(value);
    runVerification(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    await runVerification(normalizedQuery, { updateUrl: true });
  }

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
          к внутренним служебным данным.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: DOC-XXXXXXXXXXXX или DOCV-XXXXXXXXXXXX"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Проверяем..." : "Проверить документ"}
          </button>
        </form>

        {submittedQuery && !loading && (
          <div className="mt-4 text-xs text-slate-500">
            Последний запрос: {submittedQuery}
          </div>
        )}
      </section>

      {error && (
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-red-200">
          <div className="text-lg font-bold text-red-700">Ошибка проверки</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
        </section>
      )}

      {result && <ResultCard result={result} />}

      {notFound && (
        <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="text-xl font-bold text-slate-900">Документ не найден</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Проверьте корректность номера или кода проверки. Черновики и документы без опубликованного файла
            не подтверждаются в публичном реестре.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onPageChange?.("contacts")}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Перейти в контакты
            </button>
            <button
              type="button"
              onClick={() => onPageChange?.("home")}
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

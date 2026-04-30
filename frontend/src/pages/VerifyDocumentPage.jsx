import { useEffect, useMemo, useState } from "react";
import { verifyPublicDocument } from "../api/client";
import { DocumentVerificationQrBlock } from "../components/documents/DocumentVerificationQrBlock";

const RU = {
  available: "\u0414\u043e\u0441\u0442\u0443\u043f\u0435\u043d",
  draft: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
  revoked: "\u041e\u0442\u043e\u0437\u0432\u0430\u043d",

  documentConfirmed: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d",
  documentRevoked: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d",
  needsClarification: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u0435",

  confirmedDescription:
    "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0430\u0439\u0434\u0435\u043d \u0432 \u0440\u0435\u0435\u0441\u0442\u0440\u0435 ObrPortal, \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d \u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0434\u043b\u044f \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u0433\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u043f\u043e\u0434\u043b\u0438\u043d\u043d\u043e\u0441\u0442\u0438.",
  revokedDescription:
    "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0430\u0439\u0434\u0435\u043d \u0432 \u0440\u0435\u0435\u0441\u0442\u0440\u0435, \u043d\u043e \u0435\u0433\u043e \u0441\u0442\u0430\u0442\u0443\u0441 \u0438\u0437\u043c\u0435\u043d\u0451\u043d \u043d\u0430 \u00ab\u041e\u0442\u043e\u0437\u0432\u0430\u043d\u00bb. \u0422\u0430\u043a\u043e\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0435\u043b\u044c\u0437\u044f \u0441\u0447\u0438\u0442\u0430\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u043c.",
  clarificationDescription:
    "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0430\u0439\u0434\u0435\u043d, \u043d\u043e \u0435\u0433\u043e \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u044c \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u0433\u043e \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u044f.",

  publicRegistry: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0439 \u0440\u0435\u0435\u0441\u0442\u0440",
  verifyDocument: "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  intro:
    "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0438\u043b\u0438 \u043a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438. \u0415\u0441\u043b\u0438 \u0432\u044b \u043f\u0435\u0440\u0435\u0448\u043b\u0438 \u043f\u043e QR-\u043a\u043e\u0434\u0443, \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.",
  queryLabel: "\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0438\u043b\u0438 \u043a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
  queryPlaceholder: "\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: AUTO-... \u0438\u043b\u0438 DOCV-...",
  checking: "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c...",
  check: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c",
  enterDocumentQuery: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0438\u043b\u0438 \u043a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438.",
  verificationFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443",
  verificationFailedMessage: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.",

  documentNotFound: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d",
  notFoundPrefix:
    "\u0412 \u0440\u0435\u0435\u0441\u0442\u0440\u0435 \u043d\u0435\u0442 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043d\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443",
  notFoundSuffix:
    "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043d\u043e\u043c\u0435\u0440, \u043a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0438\u043b\u0438 \u0441\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0443 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438, \u0432\u044b\u0434\u0430\u0432\u0448\u0435\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442.",
  checkAnother: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0434\u0440\u0443\u0433\u043e\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
  contacts: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438",
  goCatalog: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433",
  goHome: "\u041d\u0430 \u0433\u043b\u0430\u0432\u043d\u0443\u044e",

  documentNumber: "\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  verificationCode: "\u041a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
  issuedAt: "\u0414\u0430\u0442\u0430 \u0432\u044b\u0434\u0430\u0447\u0438",
  completedAt: "\u0414\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
  holder: "\u0412\u043b\u0430\u0434\u0435\u043b\u0435\u0446 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  program: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430",
  courseHours: "\u041e\u0431\u044a\u0451\u043c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b",
  courseFormat: "\u0424\u043e\u0440\u043c\u0430\u0442 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
  academicHours: "\u0430\u043a. \u0447.",
  qrTitle: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u0441\u0441\u044b\u043b\u043a\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
  qrDescription:
    "QR-\u043a\u043e\u0434 \u0432\u0435\u0434\u0451\u0442 \u043d\u0430 \u044d\u0442\u0443 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u0443\u044e \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u043f\u043e \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u043c\u0443 \u043a\u043e\u0434\u0443 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.",

  whatConfirmsTitle: "\u0427\u0442\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430",
  whatConfirmsText:
    "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u0447\u0442\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0430\u0439\u0434\u0435\u043d \u0432 \u0440\u0435\u0435\u0441\u0442\u0440\u0435 ObrPortal, \u0441\u0432\u044f\u0437\u0430\u043d \u0441 \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u044b\u043c \u0432\u043b\u0430\u0434\u0435\u043b\u044c\u0446\u0435\u043c \u0438 \u0438\u043c\u0435\u0435\u0442 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441.",
  whatHiddenTitle: "\u0427\u0442\u043e \u043d\u0435 \u0440\u0430\u0441\u043a\u0440\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e",
  whatHiddenText:
    "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u043d\u0435 \u0432\u044b\u0434\u0430\u0451\u0442 \u0444\u0430\u0439\u043b \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0438 \u043d\u0435 \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u0442 \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442. \u041e\u043d\u0430 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u043f\u043e\u0434\u043b\u0438\u043d\u043d\u043e\u0441\u0442\u0438.",
  ifNotFoundTitle: "\u0415\u0441\u043b\u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d",
  ifNotFoundText:
    "\u0412\u043e\u0437\u043c\u043e\u0436\u043d\u044b\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u044b: \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0435\u0449\u0451 \u043d\u0435 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d, \u0431\u044b\u043b \u0441\u043a\u0440\u044b\u0442 \u0438\u0437 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u0439 \u0432\u044b\u0434\u0430\u0447\u0438, \u0432\u0432\u0435\u0434\u0451\u043d \u043d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0438\u043b\u0438 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0430\u044f \u0441\u0441\u044b\u043b\u043a\u0430.",
};

function formatDate(value) {
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
    available: RU.available,
    draft: RU.draft,
    revoked: RU.revoked,
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
      label: RU.documentConfirmed,
      description: RU.confirmedDescription,
    };
  }

  if (result.registry_status === "revoked") {
    return {
      card: "ring-red-200",
      badge: "bg-red-50 text-red-700 ring-red-200",
      title: "text-red-700",
      panel: "bg-red-50 text-red-800 ring-red-200",
      label: RU.documentRevoked,
      description: RU.revokedDescription,
    };
  }

  return {
    card: "ring-amber-200",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    title: "text-amber-700",
    panel: "bg-amber-50 text-amber-800 ring-amber-200",
    label: RU.needsClarification,
    description: RU.clarificationDescription,
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

function FieldCard({ label, value, className = "" }) {
  return (
    <div className={`rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 ${className}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 break-words font-semibold text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

function ResultCard({ result, onReset, onPageChange }) {
  const tone = getVerificationTone(result);
  const hoursValue =
    result.course_hours !== null && result.course_hours !== undefined
      ? `${result.course_hours} ${RU.academicHours}`
      : "-";

  return (
    <div className={`rounded-[2rem] bg-white p-6 shadow-sm ring-1 ${tone.card}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${tone.badge}`}>
          {tone.label}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
          {result.document_type}
        </span>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
          {getRegistryStatusLabel(result.registry_status)}
        </span>
      </div>

      <h2 className={`mt-4 text-3xl font-bold ${tone.title}`}>
        {result.verification_status}
      </h2>

      <div className={`mt-4 rounded-2xl p-4 text-sm leading-6 ring-1 ${tone.panel}`}>
        {tone.description}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <FieldCard label={RU.documentNumber} value={result.document_number} />
        <FieldCard label={RU.verificationCode} value={result.verification_code} />
        <FieldCard label={RU.issuedAt} value={formatDate(result.issued_at)} />
        <FieldCard label={RU.completedAt} value={formatDate(result.completed_at)} />
        <FieldCard label={RU.holder} value={result.holder_name} />
        <FieldCard label={RU.program} value={result.course_title || result.title} />
        <FieldCard label={RU.courseHours} value={hoursValue} />
        <FieldCard label={RU.courseFormat} value={result.course_format || "-"} />

        <DocumentVerificationQrBlock
          code={result.verification_code}
          documentNumber={result.document_number}
          containerId="public-document-verification-qr"
          title={RU.qrTitle}
          description={RU.qrDescription}
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
          {RU.checkAnother}
        </button>

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {RU.goCatalog}
        </button>

        <button
          type="button"
          onClick={() => onPageChange("home")}
          className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          {RU.goHome}
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
      setError(RU.enterDocumentQuery);
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
        setError(err.message || RU.verificationFailedMessage);
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
          {RU.publicRegistry}
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          {RU.verifyDocument}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          {RU.intro}
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {RU.queryLabel}
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={RU.queryPlaceholder}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !normalizedQuery}
              className="h-12 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? RU.checking : RU.check}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="rounded-[2rem] bg-red-50 p-5 text-sm text-red-800 ring-1 ring-red-200">
          <div className="font-semibold">{RU.verificationFailed}</div>
          <p className="mt-2 leading-6">{error}</p>
        </div>
      )}

      {notFound && (
        <div className="rounded-[2rem] bg-amber-50 p-6 text-sm text-amber-800 ring-1 ring-amber-200">
          <div className="text-lg font-bold">{RU.documentNotFound}</div>
          <p className="mt-2 leading-6">
            {RU.notFoundPrefix}{" "}
            <span className="font-semibold">{submittedQuery}</span>. {RU.notFoundSuffix}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {RU.checkAnother}
            </button>
            <button
              type="button"
              onClick={() => onPageChange("contacts")}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
            >
              {RU.contacts}
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
        <InfoCard title={RU.whatConfirmsTitle}>
          {RU.whatConfirmsText}
        </InfoCard>

        <InfoCard title={RU.whatHiddenTitle}>
          {RU.whatHiddenText}
        </InfoCard>

        <InfoCard title={RU.ifNotFoundTitle}>
          {RU.ifNotFoundText}
        </InfoCard>
      </div>
    </div>
  );
}

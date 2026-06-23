import { formatApiError } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { verifyPublicDocument } from "../api/client";
import { DocumentVerificationQrBlock } from "../components/documents/DocumentVerificationQrBlock";
import { formatRuLongDate as formatDate } from "../utils/dateFormat";

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
  revokedAt: "\u0414\u0430\u0442\u0430 \u043e\u0442\u0437\u044b\u0432\u0430",
  revocationReason: "\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u043e\u0442\u0437\u044b\u0432\u0430",
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
  issuerTitle: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f-\u0438\u0437\u0434\u0430\u0442\u0435\u043b\u044c",
  issuerName: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f",
  issuerShortName: "\u041a\u0440\u0430\u0442\u043a\u043e\u0435 \u043d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435",
  issuerAddress: "\u0410\u0434\u0440\u0435\u0441",
  issuerLicense: "\u041b\u0438\u0446\u0435\u043d\u0437\u0438\u044f",
  issuerInn: "\u0418\u041d\u041d",
  issuerKpp: "\u041a\u041f\u041f",
  issuerOgrn: "\u041e\u0413\u0420\u041d",
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

function getPublicVerificationDiagnostics({
  normalizedQuery,
  submittedQuery,
  result,
  loading,
  error,
  notFound,
}) {
  const items = [];

  if (!normalizedQuery && !submittedQuery && !result) {
    items.push("Запрос: номер документа или код проверки ещё не введён.");
  }

  if (normalizedQuery && !submittedQuery && !result && !loading) {
    items.push("Запрос: значение введено, нажмите кнопку проверки.");
  }

  if (loading) {
    items.push("Проверка: выполняется запрос к публичному реестру.");
  }

  if (error) {
    items.push("Ошибка: проверка не завершилась, повторите запрос или обратитесь в организацию.");
  }

  if (notFound) {
    items.push("Реестр: документ по введённому номеру или коду проверки не найден.");
  }

  if (result?.registry_status === "available") {
    items.push("Статус: документ опубликован и подтверждается публичным реестром.");
  }

  if (result?.registry_status === "revoked") {
    items.push("Статус: документ отозван, его нельзя считать действующим.");
  }

  if (result && result.registry_status !== "available" && result.registry_status !== "revoked") {
    items.push("Статус: документ найден, но публичное использование требует уточнения.");
  }

  if (result && !result.document_number) {
    items.push("Номер: в результате проверки нет номера документа.");
  }

  if (result && !result.verification_code) {
    items.push("QR/код: код проверки отсутствует, публичная QR-ссылка будет неполной.");
  }

  if (result?.verification_code) {
    items.push("QR/код: код проверки доступен, можно использовать публичную ссылку и QR-код.");
  }

  return [...new Set(items)];
}

function getPublicVerificationSourceStats({
  normalizedQuery,
  submittedQuery,
  result,
  loading,
  error,
  notFound,
}) {
  const queryValue = submittedQuery || normalizedQuery || "";
  const queryMode = result?.verification_code
    ? "Код проверки"
    : result?.document_number
      ? "Номер документа"
      : queryValue
        ? "Номер или код"
        : "Не задан";

  const registryStatus = result
    ? getRegistryStatusLabel(result.registry_status)
    : notFound
      ? "Не найден"
      : error
        ? "Ошибка"
        : loading
          ? "Проверяется"
          : "Ожидает запроса";

  return {
    queryValue,
    queryMode,
    registryStatus,
    hasResult: Boolean(result),
    hasVerificationCode: Boolean(result?.verification_code),
    hasDocumentNumber: Boolean(result?.document_number),
    qrReady: Boolean(result?.verification_code || result?.document_number),
    isAvailable: result?.registry_status === "available",
    isRevoked: result?.registry_status === "revoked",
    isDraft: result?.registry_status === "draft",
    hasProblem: Boolean(error || notFound || result?.registry_status === "revoked" || result?.registry_status === "draft"),
  };
}


const LEARNER_DOCUMENT_VERIFICATION_UX_LABELS = {
  stage: "Stage 79.4 - Learner Document Verification UX Integration",
  title: "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0438\u0442\u043e\u0433\u043e\u0432\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  subtitle: "\u0421\u0432\u044f\u0437\u043a\u0430 \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044e \u043f\u043e\u043d\u044f\u0442\u044c, \u043a\u0430\u043a\u043e\u0439 \u043d\u043e\u043c\u0435\u0440 \u0438\u043b\u0438 \u043a\u043e\u0434 \u0432\u0432\u043e\u0434\u0438\u0442\u044c, \u0447\u0442\u043e \u043e\u0437\u043d\u0430\u0447\u0430\u0435\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0438 \u043a\u0443\u0434\u0430 \u043f\u0435\u0440\u0435\u0439\u0442\u0438 \u043f\u043e\u0441\u043b\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438.",
  queryReady: "\u0417\u0430\u043f\u0440\u043e\u0441 \u0433\u043e\u0442\u043e\u0432",
  waitingQuery: "\u041e\u0436\u0438\u0434\u0430\u0435\u043c \u043d\u043e\u043c\u0435\u0440 \u0438\u043b\u0438 \u043a\u043e\u0434",
  checking: "\u0418\u0434\u0451\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430",
  confirmed: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d",
  revoked: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d",
  notFound: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d",
  error: "\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
  summaryQuery: "\u041f\u0440\u043e\u0432\u0435\u0440\u043e\u0447\u043d\u043e\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435",
  summaryStatus: "\u0421\u0442\u0430\u0442\u0443\u0441 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
  summaryQr: "QR/\u043a\u043e\u0434",
  summaryResult: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442",
  nextStep: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433",
  nextWaiting: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0438\u043b\u0438 \u043a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438. \u0415\u0441\u043b\u0438 \u0432\u044b \u043f\u0440\u0438\u0448\u043b\u0438 \u0438\u0437 \u0440\u0430\u0437\u0434\u0435\u043b\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432, \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u043c\u043e\u0436\u0435\u0442 \u0431\u044b\u0442\u044c \u0443\u0436\u0435 \u043f\u043e\u0434\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u043e \u0432 \u0441\u0441\u044b\u043b\u043a\u0443.",
  nextChecking: "\u0414\u043e\u0436\u0434\u0438\u0442\u0435\u0441\u044c \u043e\u0442\u0432\u0435\u0442\u0430 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u0433\u043e \u0440\u0435\u0435\u0441\u0442\u0440\u0430. \u041f\u043e\u0441\u043b\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u043f\u043e\u043a\u0430\u0436\u0435\u0442 \u0441\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.",
  nextConfirmed: "\u0421\u0432\u0435\u0440\u044c\u0442\u0435 \u0432\u043b\u0430\u0434\u0435\u043b\u044c\u0446\u0430, \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443, \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0438 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e-\u0438\u0437\u0434\u0430\u0442\u0435\u043b\u044f. \u041f\u0440\u0438 \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e\u0441\u0442\u0438 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 QR-\u0441\u0441\u044b\u043b\u043a\u0443.",
  nextRevoked: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0430\u0439\u0434\u0435\u043d, \u043d\u043e \u0435\u0433\u043e \u0441\u0442\u0430\u0442\u0443\u0441 \u0438\u0437\u043c\u0435\u043d\u0451\u043d \u043d\u0430 \u043e\u0442\u043e\u0437\u0432\u0430\u043d\u043d\u044b\u0439. \u0422\u0430\u043a\u043e\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0435\u043b\u044c\u0437\u044f \u0441\u0447\u0438\u0442\u0430\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u043c.",
  nextNotFound: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u043d\u043e\u043c\u0435\u0440\u0430 \u0438\u043b\u0438 \u043a\u043e\u0434\u0430. \u0415\u0441\u043b\u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d, \u043e\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044c \u0432 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e.",
  nextError: "\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443 \u043f\u043e\u0437\u0436\u0435 \u0438\u043b\u0438 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u0435 \u0441\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0443 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438.",
  openDocuments: "\u041a \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c",
  openContacts: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438",
  openCatalog: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043a\u0443\u0440\u0441\u043e\u0432",
  yes: "\u0414\u0430",
  no: "\u041d\u0435\u0442",
  emptyValue: "-",
};

function getLearnerDocumentVerificationUXState({
  normalizedQuery,
  submittedQuery,
  result,
  loading,
  error,
  notFound,
  sourceStats,
}) {
  const queryValue = submittedQuery || normalizedQuery || "";
  const hasQuery = Boolean(queryValue);

  const statusLabel = result
    ? result.registry_status === "available"
      ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.confirmed
      : result.registry_status === "revoked"
        ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.revoked
        : RU.needsClarification
    : notFound
      ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.notFound
      : error
        ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.error
        : loading
          ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.checking
          : hasQuery
            ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.queryReady
            : LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.waitingQuery;

  const nextStep = result
    ? result.registry_status === "available"
      ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.nextConfirmed
      : result.registry_status === "revoked"
        ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.nextRevoked
        : RU.clarificationDescription
    : notFound
      ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.nextNotFound
      : error
        ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.nextError
        : loading
          ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.nextChecking
          : LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.nextWaiting;

  return {
    queryValue,
    statusLabel,
    nextStep,
    hasResult: Boolean(result),
    qrReady: Boolean(sourceStats?.qrReady),
    isProblem: Boolean(error || notFound || result?.registry_status === "revoked"),
    isConfirmed: result?.registry_status === "available",
  };
}

function LearnerDocumentVerificationUXPanel({
  normalizedQuery,
  submittedQuery,
  result,
  loading,
  error,
  notFound,
  sourceStats,
  onPageChange,
}) {
  const state = getLearnerDocumentVerificationUXState({
    normalizedQuery,
    submittedQuery,
    result,
    loading,
    error,
    notFound,
    sourceStats,
  });

  const statusTone = state.isProblem
    ? "bg-amber-50 text-amber-800 ring-amber-200"
    : state.isConfirmed
      ? "bg-green-50 text-green-700 ring-green-200"
      : "bg-blue-50 text-blue-700 ring-blue-200";

  return (
    <section
      data-testid="learner-document-verification-ux-panel"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.stage}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.subtitle}
          </p>
        </div>

        <span
          data-testid="learner-document-verification-ux-status"
          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${statusTone}`}
        >
          {state.statusLabel}
        </span>
      </div>

      <div
        data-testid="learner-document-verification-ux-summary"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.summaryQuery}
          </div>
          <div className="mt-2 break-all text-sm font-semibold text-slate-900">
            {state.queryValue || LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.emptyValue}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.summaryStatus}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {state.statusLabel}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.summaryQr}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {state.qrReady ? LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.yes : LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.no}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.summaryResult}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {state.hasResult ? getRegistryStatusLabel(result.registry_status) : LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.emptyValue}
          </div>
        </div>
      </div>

      <div
        data-testid="learner-document-verification-ux-next-step"
        className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${statusTone}`}
      >
        <div className="font-semibold text-slate-900">
          {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.nextStep}
        </div>
        <p className="mt-2">{state.nextStep}</p>
      </div>

      <div
        data-testid="learner-document-verification-ux-actions"
        className="mt-5 flex flex-wrap gap-3"
      >
        <button
          type="button"
          data-testid="learner-document-verification-documents-action"
          onClick={() => onPageChange("documents")}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.openDocuments}
        </button>

        <button
          type="button"
          data-testid="learner-document-verification-contacts-action"
          onClick={() => onPageChange("contacts")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.openContacts}
        </button>

        <button
          type="button"
          data-testid="learner-document-verification-catalog-action"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {LEARNER_DOCUMENT_VERIFICATION_UX_LABELS.openCatalog}
        </button>
      </div>
    </section>
  );
}


function PublicVerificationJourneyHint({
  normalizedQuery,
  submittedQuery,
  result,
  loading,
  error,
  notFound,
  onPageChange,
}) {
  const hasQuery = Boolean(normalizedQuery || submittedQuery);

  const currentState = result
    ? result.registry_status === "available"
      ? "Документ подтверждён"
      : result.registry_status === "revoked"
        ? "Документ отозван"
        : "Документ требует уточнения"
    : notFound
      ? "Документ не найден"
      : error
        ? "Ошибка проверки"
        : loading
          ? "Проверяем реестр"
          : hasQuery
            ? "Запрос готов к проверке"
            : "Ожидаем номер или код";

  const nextAction = result
    ? "Сверьте номер, владельца, программу и статус документа."
    : notFound
      ? "Проверьте введённый номер или код и при необходимости обратитесь в организацию."
      : error
        ? "Повторите проверку позже или уточните статус документа у организации."
        : loading
          ? "Дождитесь ответа публичного реестра."
          : hasQuery
            ? "Нажмите кнопку проверки, чтобы получить результат."
            : "Введите номер документа, код проверки или откройте QR-ссылку.";

  const steps = [
    {
      title: "1. Номер или код",
      text: "Введите номер документа, код проверки или перейдите по QR-ссылке из выданного документа.",
    },
    {
      title: "2. Публичный реестр",
      text: "Страница отправляет только проверочное значение и получает публичный статус документа.",
    },
    {
      title: "3. Результат",
      text: "Показываем статус, номер, программу, владельца и организацию без выдачи файла документа.",
    },
  ];

  return (
    <section
      data-testid="public-verification-journey"
      className="rounded-[2rem] bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 shadow-sm ring-1 ring-blue-100 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Сценарий проверки
          </div>
          <h2
            data-testid="public-verification-journey-title"
            className="mt-2 text-2xl font-bold text-slate-900"
          >
            Понятная публичная проверка документа
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Проверка показывает только публичные сведения, необходимые для подтверждения подлинности:
            статус, номер, владельца, программу и организацию-издателя. Файл документа и личный
            кабинет не раскрываются.
          </p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-blue-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Текущее состояние
          </div>
          <div data-testid="public-verification-current-state" className="mt-1 font-semibold text-slate-900">
            {currentState}
          </div>
          <div data-testid="public-verification-next-action" className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
            {nextAction}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.title} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onPageChange?.("catalog")}
          className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
        >
          Перейти в каталог
        </button>
        <button
          type="button"
          onClick={() => onPageChange?.("home")}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          На главную
        </button>
      </div>
    </section>
  );
}

function PublicVerificationQrOperationsPanel({
  sourceStats,
  onPageChange,
}) {
  return (
    <section
      data-testid="public-verification-qr-operations-panel"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Операционный контроль QR
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Проверка по номеру, коду и QR-ссылке
          </h2>
        </div>

        <span
          data-testid="public-verification-qr-status"
          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
            sourceStats.hasProblem
              ? "bg-amber-50 text-amber-800 ring-amber-200"
              : sourceStats.isAvailable
                ? "bg-green-50 text-green-700 ring-green-200"
                : "bg-slate-100 text-slate-700 ring-slate-200"
          }`}
        >
          {sourceStats.registryStatus}
        </span>
      </div>

      <div
        data-testid="public-verification-qr-summary"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Режим проверки
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {sourceStats.queryMode}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Запрос
          </div>
          <div className="mt-2 break-all font-semibold text-slate-900">
            {sourceStats.queryValue || "—"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            QR готов
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {sourceStats.qrReady ? "Да" : "Нет"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Код / номер
          </div>
          <div className="mt-2 font-semibold text-slate-900">
            {sourceStats.hasVerificationCode ? "Код есть" : sourceStats.hasDocumentNumber ? "Номер есть" : "Нет данных"}
          </div>
        </div>
      </div>

      <div
        data-testid="public-verification-qr-attention"
        className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${
          sourceStats.hasProblem
            ? "bg-amber-50 text-amber-900 ring-amber-200"
            : sourceStats.isAvailable
              ? "bg-green-50 text-green-800 ring-green-200"
              : "bg-slate-50 text-slate-700 ring-slate-200"
        }`}
      >
        <div className="font-semibold text-slate-900">
          Контрольные правила публичной проверки
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Опубликованный документ подтверждается публичным реестром.</li>
          <li>Черновик не должен подтверждаться публичной проверкой.</li>
          <li>Отозванный документ показывается как недействующий.</li>
          <li>QR-ссылка считается готовой, если есть номер документа или код проверки.</li>
          <li>Публичная страница не раскрывает файл документа и личный кабинет пользователя.</li>
        </ul>
      </div>

      <div
        data-testid="public-verification-qr-links"
        className="mt-5 flex flex-wrap gap-3"
      >
        <button
          type="button"
          onClick={() => onPageChange("account")}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Личный кабинет
        </button>

        <button
          type="button"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          Каталог курсов
        </button>

        <button
          type="button"
          onClick={() => onPageChange("contacts")}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          Контакты организации
        </button>
      </div>
    </section>
  );
}

function PublicVerificationDiagnostics({
  normalizedQuery,
  submittedQuery,
  result,
  loading,
  error,
  notFound,
  diagnostics,
}) {
  const statusText = result
    ? getRegistryStatusLabel(result.registry_status)
    : notFound
      ? "Не найден"
      : error
        ? "Ошибка проверки"
        : loading
          ? "Проверяется"
          : "Ожидает запроса";

  return (
    <section
      data-testid="public-verification-diagnostics"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Диагностика проверки
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Публичная проверка документа
          </h2>
        </div>

        <span
          data-testid="public-verification-status"
          className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
        >
          {statusText}
        </span>
      </div>

      <div
        data-testid="public-verification-summary"
        className="mt-5 grid gap-3 md:grid-cols-3"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Текущий запрос
          </div>
          <div className="mt-2 break-all font-semibold text-slate-900">
            {normalizedQuery || submittedQuery || "—"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Последняя проверка
          </div>
          <div className="mt-2 break-all font-semibold text-slate-900">
            {submittedQuery || "—"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            QR/код
          </div>
          <div className="mt-2 break-all font-semibold text-slate-900">
            {result?.verification_code || "—"}
          </div>
        </div>
      </div>

      <div
        data-testid="public-verification-attention"
        className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ${
          error || notFound || result?.registry_status === "revoked"
            ? "bg-amber-50 text-amber-900 ring-amber-200"
            : result?.registry_status === "available"
              ? "bg-green-50 text-green-800 ring-green-200"
              : "bg-slate-50 text-slate-700 ring-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-slate-900">
            Что показывает проверка
          </div>
          <span
            data-testid="public-verification-attention-count"
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            Пунктов диагностики: {diagnostics.length}
          </span>
        </div>

        <ul className="mt-2 list-disc space-y-1 pl-5">
          {diagnostics.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
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
    <div
      data-testid="public-verification-result-card"
      className={`rounded-[2rem] bg-white p-6 shadow-sm ring-1 ${tone.card}`}
    >
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

        {result.registry_status === "revoked" && (
          <>
            <FieldCard label={RU.revokedAt} value={formatDate(result.revoked_at)} />
            <FieldCard label={RU.revocationReason} value={result.revocation_reason || "-"} />
          </>
        )}

        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 md:col-span-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {RU.issuerTitle}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <FieldCard label={RU.issuerName} value={result.issuer_name} />
            <FieldCard label={RU.issuerShortName} value={result.issuer_short_name} />
            <FieldCard label={RU.issuerAddress} value={result.issuer_address} />
            <FieldCard label={RU.issuerLicense} value={result.issuer_license} />
            <FieldCard label={RU.issuerInn} value={result.issuer_inn || "-"} />
            <FieldCard label={RU.issuerKpp} value={result.issuer_kpp || "-"} />
            <FieldCard label={RU.issuerOgrn} value={result.issuer_ogrn || "-"} />
          </div>
        </div>

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
          data-testid="public-verification-result-reset-action"
          onClick={onReset}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {RU.checkAnother}
        </button>

        <button
          type="button"
          data-testid="public-verification-result-catalog-action"
          onClick={() => onPageChange("catalog")}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {RU.goCatalog}
        </button>

        <button
          type="button"
          data-testid="public-verification-result-home-action"
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

  const verificationDiagnostics = useMemo(
    () =>
      getPublicVerificationDiagnostics({
        normalizedQuery,
        submittedQuery,
        result,
        loading,
        error,
        notFound,
      }),
    [normalizedQuery, submittedQuery, result, loading, error, notFound]
  );

  const verificationSourceStats = useMemo(
    () =>
      getPublicVerificationSourceStats({
        normalizedQuery,
        submittedQuery,
        result,
        loading,
        error,
        notFound,
      }),
    [normalizedQuery, submittedQuery, result, loading, error, notFound]
  );

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
        setError(formatApiError(err, RU.verificationFailedMessage));
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

      <LearnerDocumentVerificationUXPanel
        normalizedQuery={normalizedQuery}
        submittedQuery={submittedQuery}
        result={result}
        loading={loading}
        error={error}
        notFound={notFound}
        sourceStats={verificationSourceStats}
        onPageChange={onPageChange}
      />

      <PublicVerificationJourneyHint
        normalizedQuery={normalizedQuery}
        submittedQuery={submittedQuery}
        result={result}
        loading={loading}
        error={error}
        notFound={notFound}
        onPageChange={onPageChange}
      />

      <section
        data-testid="public-verification-form-section"
        className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <form
          data-testid="public-verification-form"
          onSubmit={handleSubmit}
          className="grid gap-3 lg:grid-cols-[1fr_auto]"
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {RU.queryLabel}
            </span>
            <input
              data-testid="public-verification-query-input"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={RU.queryPlaceholder}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
            />
          </label>

          <div className="flex items-end">
            <button
              data-testid="public-verification-submit"
              type="submit"
              disabled={loading || !normalizedQuery}
              className="h-12 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? RU.checking : RU.check}
            </button>
          </div>
        </form>
      </section>

      <PublicVerificationDiagnostics
        normalizedQuery={normalizedQuery}
        submittedQuery={submittedQuery}
        result={result}
        loading={loading}
        error={error}
        notFound={notFound}
        diagnostics={verificationDiagnostics}
      />

      <PublicVerificationQrOperationsPanel
        sourceStats={verificationSourceStats}
        onPageChange={onPageChange}
      />

      {error && (
        <div
          data-testid="public-verification-error-state"
          role="alert"
          aria-live="assertive"
          className="rounded-[2rem] bg-red-50 p-5 text-sm text-red-800 ring-1 ring-red-200"
        >
          <div className="font-semibold">{RU.verificationFailed}</div>
          <p className="mt-2 leading-6">{error}</p>
        </div>
      )}

      {notFound && (
        <div
          data-testid="public-verification-not-found-state"
          role="status"
          aria-live="polite"
          className="rounded-[2rem] bg-amber-50 p-6 text-sm text-amber-800 ring-1 ring-amber-200"
        >
          <div className="text-lg font-bold">{RU.documentNotFound}</div>
          <p className="mt-2 leading-6">
            {RU.notFoundPrefix}{" "}
            <span className="font-semibold">{submittedQuery}</span>. {RU.notFoundSuffix}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              data-testid="public-verification-not-found-reset-action"
              onClick={handleReset}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {RU.checkAnother}
            </button>
            <button
              type="button"
              data-testid="public-verification-not-found-contacts-action"
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

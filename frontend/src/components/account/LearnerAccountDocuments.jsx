import {
  Ban,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Files,
} from "lucide-react";

import { DocumentVerificationQrBlock } from "../documents/DocumentVerificationQrBlock";


const DOCUMENT_FILTERS = [
  { value: "", label: "Все" },
  { value: "available", label: "Доступные" },
  { value: "draft", label: "Ожидают публикации" },
  { value: "revoked", label: "Отозванные" },
];


function countWhere(items, predicate) {
  return Array.isArray(items)
    ? items.filter(predicate).length
    : 0;
}


function getDocumentStatusLabel(status) {
  switch (status) {
    case "available":
      return "Доступен";
    case "draft":
      return "Ожидает публикации";
    case "revoked":
      return "Отозван";
    default:
      return status || "—";
  }
}


function getDocumentStatusTone(status) {
  switch (status) {
    case "available":
      return "bg-green-50 text-green-700 ring-green-200";
    case "draft":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "revoked":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}


function canDownloadDocument(documentItem) {
  return Boolean(
    documentItem.download_available ??
      (
        documentItem.status === "available" &&
        documentItem.file_available
      )
  );
}


function canVerifyDocument(documentItem) {
  return Boolean(
    documentItem.status === "available" &&
      (
        documentItem.verification_code ||
        documentItem.document_number
      )
  );
}


function getDownloadLabel(documentItem) {
  if (canDownloadDocument(documentItem)) {
    return "Скачать документ";
  }

  if (documentItem.status === "draft") {
    return documentItem.file_available
      ? "Ожидает публикации"
      : "Документ готовится";
  }

  if (documentItem.status === "revoked") {
    return "Документ отозван";
  }

  return documentItem.file_available
    ? "Скачивание недоступно"
    : "Файл отсутствует";
}


function DocumentStat({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-blue-600 ring-1 ring-slate-200">
          <Icon size={21} />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-950">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}


function FilterButton({
  item,
  count,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {item.label}

      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active
            ? "bg-white/20 text-white"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}


function DocumentCard({
  documentItem,
  onDownload,
  downloadLoadingId,
  onOpenCourse,
}) {
  const downloadAvailable =
    canDownloadDocument(documentItem);

  const verificationAvailable =
    canVerifyDocument(documentItem);

  return (
    <article
      data-testid="learner-document-card"
      className="rounded-3xl bg-white p-5 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getDocumentStatusTone(
            documentItem.status
          )}`}
        >
          {getDocumentStatusLabel(documentItem.status)}
        </span>

        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          {documentItem.document_type || "Документ"}
        </span>

        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {documentItem.file_available
            ? "Файл сформирован"
            : "Файл не сформирован"}
        </span>
      </div>

      <h2 className="mt-4 text-xl font-bold text-slate-950">
        {documentItem.title || "Итоговый документ"}
      </h2>

      {documentItem.course_title && (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {documentItem.course_title}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">
            Номер документа
          </div>
          <div className="mt-1 break-all font-semibold text-slate-900">
            {documentItem.document_number || "—"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:col-span-2">
          <div className="text-xs text-slate-500">
            Код проверки
          </div>
          <div className="mt-1 break-all font-semibold text-slate-900">
            {documentItem.verification_code || "—"}
          </div>
        </div>
      </div>

      {documentItem.status === "draft" && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
          Документ готовится или ожидает публикации.
          После публикации здесь станет доступно скачивание.
        </div>
      )}

      {documentItem.status === "revoked" && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-800 ring-1 ring-red-200">
          <div className="font-semibold">
            Документ отозван
          </div>

          {documentItem.revocation_reason && (
            <div className="mt-1">
              {documentItem.revocation_reason}
            </div>
          )}
        </div>
      )}

      {verificationAvailable && (
        <DocumentVerificationQrBlock
          code={documentItem.verification_code}
          documentNumber={documentItem.document_number}
          containerId={`learner-document-qr-${documentItem.id}`}
          title="QR-код проверки"
          description="QR-код открывает публичную проверку опубликованного документа."
          showPublicLink
          showCopyLink
          publicLinkLabel="Проверить публично"
          className="mt-4"
        />
      )}

      <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        {documentItem.course_slug && (
          <button
            type="button"
            onClick={() =>
              onOpenCourse?.(documentItem.course_slug)
            }
            className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Открыть программу
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            onDownload?.(documentItem.id)
          }
          disabled={
            !downloadAvailable ||
            downloadLoadingId === documentItem.id
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={17} />

          {downloadLoadingId === documentItem.id
            ? "Готовим..."
            : getDownloadLabel(documentItem)}
        </button>
      </div>
    </article>
  );
}


export function LearnerAccountDocuments({
  documents = [],
  selectedFilter = "",
  loading = false,
  errorMessage = "",
  downloadLoadingId = "",
  onFilterChange,
  onDownload,
  onOpenCourse,
  onOpenLearning,
}) {
  const counts = {
    all: documents.length,
    available: countWhere(
      documents,
      (item) => item.status === "available"
    ),
    draft: countWhere(
      documents,
      (item) => item.status === "draft"
    ),
    revoked: countWhere(
      documents,
      (item) => item.status === "revoked"
    ),
  };

  const visibleDocuments = selectedFilter
    ? documents.filter(
        (item) => item.status === selectedFilter
      )
    : documents;

  return (
    <section
      data-testid="learner-account-documents"
      className="space-y-5"
    >
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <Files size={23} />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Учебный кабинет
            </div>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Мои документы
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Итоговые документы по завершённым программам,
              их статус, скачивание и публичная проверка.
            </p>
          </div>
        </div>
      </div>

      <div
        data-testid="learner-documents-stats"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <DocumentStat
          icon={Files}
          label="Всего"
          value={counts.all}
        />
        <DocumentStat
          icon={CheckCircle2}
          label="Доступны"
          value={counts.available}
        />
        <DocumentStat
          icon={Clock3}
          label="Ожидают публикации"
          value={counts.draft}
        />
        <DocumentStat
          icon={Ban}
          label="Отозваны"
          value={counts.revoked}
        />
      </div>

      <div
        data-testid="learner-document-filters"
        className="flex flex-wrap gap-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200"
      >
        {DOCUMENT_FILTERS.map((item) => (
          <FilterButton
            key={item.value || "all"}
            item={item}
            active={selectedFilter === item.value}
            count={
              item.value
                ? counts[item.value]
                : counts.all
            }
            onClick={() =>
              onFilterChange?.(item.value)
            }
          />
        ))}
      </div>

      {loading && (
        <div
          data-testid="learner-documents-loading"
          className="rounded-3xl bg-white p-8 text-center text-sm text-slate-600 ring-1 ring-slate-200"
        >
          Загружаем документы...
        </div>
      )}

      {!loading && errorMessage && (
        <div
          data-testid="learner-documents-error"
          className="rounded-3xl bg-red-50 p-5 text-sm leading-6 text-red-800 ring-1 ring-red-200"
        >
          {errorMessage}
        </div>
      )}

      {!loading &&
        !errorMessage &&
        documents.length === 0 && (
          <div
            data-testid="learner-documents-empty"
            className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileCheck2 size={26} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-950">
              Пока нет доступных документов
            </h2>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Итоговые документы появятся здесь после
              завершения программы и публикации
              администратором.
            </p>

            <button
              type="button"
              onClick={onOpenLearning}
              className="mt-5 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Открыть моё обучение
            </button>
          </div>
        )}

      {!loading &&
        !errorMessage &&
        documents.length > 0 &&
        visibleDocuments.length === 0 && (
          <div
            data-testid="learner-documents-filter-empty"
            className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200"
          >
            <h2 className="text-lg font-bold text-slate-950">
              Нет документов с выбранным статусом
            </h2>

            <button
              type="button"
              onClick={() => onFilterChange?.("")}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Показать все документы
            </button>
          </div>
        )}

      {!loading &&
        !errorMessage &&
        visibleDocuments.length > 0 && (
          <div
            data-testid="learner-documents-list"
            className="grid gap-4"
          >
            {visibleDocuments.map((documentItem) => (
              <DocumentCard
                key={documentItem.id}
                documentItem={documentItem}
                onDownload={onDownload}
                downloadLoadingId={downloadLoadingId}
                onOpenCourse={onOpenCourse}
              />
            ))}
          </div>
        )}
    </section>
  );
}
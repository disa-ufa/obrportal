import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  buildDocumentVerificationPath,
  buildDocumentVerificationUrl,
  copyTextToClipboard,
  downloadQrSvgById,
} from "../../utils/documentVerification";

export function DocumentVerificationQrBlock({
  code,
  documentNumber,
  containerId,
  title = "QR-код проверки",
  description = "По этому QR-коду можно открыть публичную проверку документа.",
  size = 116,
  showUrl = false,
  showCopyLink = false,
  showPublicLink = false,
  publicLinkLabel = "Публичная проверка",
  className = "",
}) {
  const verificationCode = code || documentNumber || "";
  const [copied, setCopied] = useState("");

  const verificationPath = useMemo(
    () => buildDocumentVerificationPath(verificationCode),
    [verificationCode]
  );

  const verificationUrl = useMemo(
    () => buildDocumentVerificationUrl(verificationCode),
    [verificationCode]
  );

  if (!verificationCode) {
    return null;
  }

  const qrValue = verificationUrl || verificationPath;
  const effectiveContainerId =
    containerId || `document-verification-qr-${String(verificationCode).replace(/[^a-zA-Z0-9_-]+/g, "_")}`;

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
    <div className={`rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 ${className}`.trim()}>
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
        <div
          id={effectiveContainerId}
          className="w-fit rounded-2xl bg-white p-3 ring-1 ring-blue-100"
        >
          <QRCodeSVG
            value={qrValue}
            size={size}
            level="M"
            includeMargin
            aria-label="QR-код публичной проверки документа"
          />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            {title}
          </div>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            {description}
          </p>

          {showUrl && (
            <a
              href={qrValue}
              className="mt-2 block break-all text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              {qrValue}
            </a>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {showPublicLink && (
              <a
                href={verificationPath}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {publicLinkLabel}
              </a>
            )}

            {showCopyLink && (
              <button
                type="button"
                onClick={() => handleCopy("link", qrValue)}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {copied === "link" ? "Ссылка скопирована" : "Скопировать ссылку"}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleCopy("code", verificationCode)}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50"
            >
              {copied === "code" ? "Код скопирован" : "Скопировать код"}
            </button>

            <button
              type="button"
              onClick={() => downloadQrSvgById(effectiveContainerId, verificationCode)}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50"
            >
              Скачать QR SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

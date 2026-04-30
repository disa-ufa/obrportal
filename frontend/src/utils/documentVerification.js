export function buildDocumentVerificationPath(code) {
  if (!code) {
    return "/verify-document";
  }

  return `/verify-document?number=${encodeURIComponent(code)}`;
}

export function buildDocumentVerificationUrl(code) {
  if (!code) {
    return "";
  }

  if (typeof window === "undefined") {
    return buildDocumentVerificationPath(code);
  }

  const url = new URL(window.location.href);
  url.pathname = "/verify-document";
  url.search = "";
  url.searchParams.set("number", code);

  return url.toString();
}

export async function copyTextToClipboard(text) {
  if (!text) {
    return false;
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";

  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

function sanitizeQrFilename(value) {
  return (value || "document-verification")
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9\u0430-\u044f\u0410-\u042f\u0451\u0401._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "document-verification";
}

export function downloadQrSvgById(containerId, filenameBase) {
  if (typeof document === "undefined") {
    return false;
  }

  const container = document.getElementById(containerId);
  const svg = container?.querySelector("svg");

  if (!svg) {
    return false;
  }

  const clonedSvg = svg.cloneNode(true);
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const source = new XMLSerializer().serializeToString(clonedSvg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${sanitizeQrFilename(filenameBase)}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  } finally {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 0);
  }
}

const CSV_UTF8_BOM = "\ufeff";
const DEFAULT_CSV_DELIMITER = ";";

function normalizeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function escapeCsvCell(value, delimiter = DEFAULT_CSV_DELIMITER) {
  const normalized = normalizeCsvValue(value);
  const escaped = normalized.replaceAll('"', '""');
  const mustQuote =
    escaped.includes('"') ||
    escaped.includes("\n") ||
    escaped.includes("\r") ||
    escaped.includes(delimiter);

  return mustQuote ? `"${escaped}"` : escaped;
}

export function buildCsvContent(columns, rows, delimiter = DEFAULT_CSV_DELIMITER) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  const headerLine = safeColumns
    .map((column) => escapeCsvCell(column.label || column.key || "", delimiter))
    .join(delimiter);

  const rowLines = safeRows.map((row) =>
    safeColumns
      .map((column) => {
        const value =
          typeof column.value === "function"
            ? column.value(row)
            : row?.[column.key];

        return escapeCsvCell(value, delimiter);
      })
      .join(delimiter)
  );

  return [headerLine, ...rowLines].join("\n");
}

export function buildDatedCsvFilename(prefix, date = new Date()) {
  const safePrefix = String(prefix || "obrportal-export")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}0-9_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const stamp = date
    .toISOString()
    .slice(0, 19)
    .replace("T", "-")
    .replaceAll(":", "");

  return `${safePrefix || "obrportal-export"}-${stamp}.csv`;
}

export function downloadCsvFile(filename, columns, rows) {
  const content = CSV_UTF8_BOM + buildCsvContent(columns, rows);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const objectUrl = window.URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename || buildDatedCsvFilename("obrportal-export");
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 0);
  }
}


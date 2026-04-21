export function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildSearchText(values) {
  return values
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
}

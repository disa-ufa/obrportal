export function getFilteredEmptyText(hasActiveFilters, filteredText, emptyText) {
  return hasActiveFilters ? filteredText : emptyText;
}

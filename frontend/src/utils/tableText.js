export function getFilteredEmptyText(hasActiveFilters, filteredText, emptyText) {
  return hasActiveFilters ? filteredText : emptyText;
}

export function getShownSummary(shownCount, totalCount) {
  return `Показано: ${shownCount} из ${totalCount}`;
}
